const express = require('express');
const Auth = express.Router();
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const action = require("../resurs/functions/action");
const { required } = require('../resurs/functions/env');
const { verifyPassword, isHash } = require('../resurs/functions/password');
const rateLimit = require('../middlewire/rateLimit');
const { STUDENT_ROLE_ID } = require('../middlewire/auth');

const jwt_my_key = required('JWT_MY_KEY');
var db = require('../db/mongodb');
var generateId = require('../resurs/functions/getid');
const bcrypt = require('bcrypt');

const isDev = process.env.NODE_ENV !== 'production';
const verificationCodes = new Map(); // { phone: { kod, expiry, attempts } }
const PHONE_RE = /^\+?\d{9,15}$/;

// Kirish urinishlarini cheklash (IP bo'yicha)
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: "Juda ko'p urinish. 15 daqiqadan keyin qayta urinib ko'ring." });
const smsLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5, message: "Juda ko'p SMS so'rovi. Keyinroq urinib ko'ring." });
const codeLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });

const LOADER_PAGE = `<!DOCTYPE html>
                    <html lang="uz">
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title> Abdusoft</title>
                        <script>
                            setTimeout(()=>{window.location.href = '/';},1000);
                        </script>
                        <style>
                        body{
                            background-color:black;
                        }
                        .center{
                            width: fit-content;
                            height: fit-content;
                            position: absolute;
                            top: 50%;
                            left: 50%;
                            transform: translate(-50%,-50%);
                            display: flex;
                        }
                        .left,.right,.left_right{
                            margin-left: 5vw;
                            width: fit-content;
                            height: fit-content;
                        }
                        .right{
                            padding-top: 8vh;
                        }
                        .loader {
                            width: 84px;
                            height: 84px;
                            position: relative;
                            overflow: hidden;
                          }
                          .loader:before , .loader:after {
                            content: "";
                            position: absolute;
                            left: 50%;
                            bottom: 0;
                            width:64px;
                            height: 64px;
                            border-radius: 50%;
                            background:#FFF;
                            transform: translate(-50% , 100%)  scale(0);
                            animation: push 2s infinite ease-in;
                          }
                          .loader:after {
                          animation-delay: 1s;
                          }
                          @keyframes push {
                              0% {
                                transform: translate(-50% , 100%)  scale(1);
                              }
                              15% , 25%{
                                transform: translate(-50% , 50%)  scale(1);
                              }
                            50% , 75% {
                                transform: translate(-50%, -30%) scale(0.5);
                              }
                            80%,  100% {
                                transform: translate(-50%, -50%) scale(0);
                              }
                          }                    
                          @media (prefers-reduced-motion: reduce) {
                            .loader:before, .loader:after { animation: none; transform: translate(-50%, -50%) scale(1); }
                          }
                        </style>
                    </head>
                    <body>
                        <div class="center"> 
                            <div class="left">
                                <span class="loader" role="status" aria-label="Yuklanmoqda"></span>
                            </div>
                        </div>
                    </body>
                    </html>`;

// Token ichiga parol xeshi va boshqa maxfiy maydonlar kirmasligi kerak
function tokenPayload(user) {
    const { password, _id, lastModified, ...safe } = user;
    return safe;
}

async function buildSession(user) {
    const database = await db;
    const role = await database.role.getRole(user.idrole);
    if (!role) {
        return null;
    }
    user.role = role.name;
    // N+1 o'rniga: bitta so'rovda RHT va bitta so'rovda barcha vazifalar
    const rhts = await database.RHT.getRHTRole(user.idrole);
    const ids = rhts.map((el) => el.idtask);
    const tasks = ids.length ? await database.task.getTaskObj({ id: { $in: ids } }) : [];
    const byId = new Map(tasks.map((t) => [t.id, t.path]));
    user.rolePath = ids.map((id) => byId.get(id)).filter((p) => p !== undefined).join();
    user.exp = Math.floor(Date.now() / 1000) + 60 * 60;
    return jwt.sign(tokenPayload(user), jwt_my_key, { algorithm: 'HS256' });
}

function sessionCookie(res, token) {
    return res.cookie("x-web-token", token, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
    });
}

Auth.get('/', async (req, res) => {
    const x_token = req.cookies['x-web-token'];
    if (!x_token) {
        return res.render('public/pages/login');
    }
    res.send(`<!DOCTYPE html><html lang="uz"><head><meta charset="UTF-8"><title>Yo'naltirilmoqda</title><script>setTimeout(()=>{window.location.href = '/';},50);</script></head><body></body></html>`);
})

// SMS yuborish marshruti
Auth.get('/sms/:phone', smsLimiter, async (req, res) => {
    const phone = String(req.params.phone || '');
    if (!PHONE_RE.test(phone)) {
        return res.status(400).json({ success: false, message: "Telefon raqam noto'g'ri." });
    }

    // 6 xonali tasodifiy kod yaratish
    const kod = crypto.randomInt(100000, 1000000).toString();
    if (isDev) console.log("Tizimga kirish uchun kod yaratildi (dev):", kod);

    // Kodni vaqtinchalik xotirada saqlash (2 daqiqa amal qiladi)
    const expiry = Date.now() + 2 * 60 * 1000;
    verificationCodes.set(phone, { kod, expiry });

    sendSms(phone, kod).then(result => {
        if (result === "ok") {
            res.status(200).json({ success: true, message: "SMS yuborildi." });
        } else {
            res.status(400).json({ success: false, message: "SMS yuborilmadi." });
        }
    }).catch(err => {
        console.error("Xatolik:", err.message);
        res.status(500).json({ success: false, message: "Ichki server xatosi." });
    });
});


// Kodni tekshirish marshruti
Auth.post('/checked', codeLimiter, async (req, res) => {
    const phone = typeof req.body.phone === 'string' ? req.body.phone : '';
    const code = typeof req.body.code === 'string' ? req.body.code : '';

    if (!phone || !code) {
        return res.status(400).json({ success: false, message: "Telefon raqam yoki kod yetarli emas." });
    }

    const savedCode = verificationCodes.get(phone);

    if (!savedCode) {
        return res.status(400).json({ success: false, message: "Kod topilmadi yoki muddati tugagan." });
    }

    savedCode.attempts = (savedCode.attempts || 0) + 1;

    // Agar urinishlar soni 5 dan oshsa, kodni o'chirish
    if (savedCode.attempts > 5) {
        verificationCodes.delete(phone);
        return res.status(400).json({ success: false, message: "Ko'p urinish. Kod o'chirildi." });
    }

    const a = Buffer.from(savedCode.kod);
    const b = Buffer.from(code);
    const same = a.length === b.length && crypto.timingSafeEqual(a, b);
    if (same && savedCode.expiry > Date.now()) {
        verificationCodes.delete(phone); // Foydalanilgandan keyin o'chirib tashlash
        const database = await db;
        let user = await database.user.getUserForObj({ phone: phone });
        if (user.length == 0) {
            let gen_id = await generateId(db, null, "user");
            await database.user.addUser({
                id: gen_id,
                phone: phone,
                idrole: STUDENT_ROLE_ID
            });
            user = [await database.user.getUser(gen_id)];
        }
        const token = await buildSession(user[0]);
        if (!token) {
            return res.status(403).json({ success: false, message: "o'chirilgan hisob!." });
        }
        const roleName = typeof user[0].role == "string" ? user[0].role : "";
        return sessionCookie(res, token).status(200).json({
            success: true,
            nazoratchi: roleName.includes("nazoratchi"),
            admin: roleName.includes("admin"),
            message: "Kod tasdiqlandi."
        });
    }

    res.status(400).json({ success: false, message: "Kod noto'g'ri yoki muddati tugagan." });
});


Auth.post('/', loginLimiter, async (req, res) => {
    const fail = (msg = "parol yoki login  xato!.") => res.render('public/pages/login', { error: msg });
    const login = req.body && req.body.login;
    const password = req.body && req.body.password;
    // NoSQL injection: faqat satr qabul qilinadi (masalan { "$ne": null } emas)
    if (typeof login !== 'string' || typeof password !== 'string' || !login || !password) {
        return fail();
    }
    const database = await db;
    const found = await database.user.getUserForObj({ $or: [{ phone: login }, { email: login }] });
    // avvalgi tartib saqlanadi: telefon bo'yicha topilgani ustun
    const user = found.find((u) => u.phone === login) || found[0];
    if (!user) {
        return fail();
    }
    const role = await database.role.getRole(user.idrole);
    if (!role) {
        return fail("o'chirilgan hisob!.");
    }
    if (!(await verifyPassword(password, user.password))) {
        return fail();
    }
    // Eski ochiq parolni xeshga almashtirish
    if (!isHash(user.password)) {
        try {
            await database.user.update(user.id, { password: await bcrypt.hash(password, 10) });
        } catch (e) { /* kirishga to'sqinlik qilmaydi */ }
    }
    const token = await buildSession(user);
    action({
        user: user.name,
        module: "Login",
        description: `tizimga kirdi!`
    }).catch(() => { });
    return sessionCookie(res, token).status(200).send(LOADER_PAGE);
});


async function sendSms(phone, kod) {
    const url = process.env.SMS_URL;
    const authHeader = process.env.SMS_AUTH;
    if (!url || !authHeader) {
        console.error("SMS xizmati sozlanmagan (SMS_URL, SMS_AUTH).");
        return "no";
    }
    const requestBody = {
        messages: [
            {
                "recipient": phone,
                "message-id": crypto.randomInt(1000000, 9999999).toString(),
                "sms": {
                    "originator": "3700",
                    "content": {
                        "text": `[Mintaqaviy markaz] Tizimga kirish uchun kodingiz: ${kod}. Ushbu kod faqat sizga tegishli. Uni hech kimga bermang. Kodning amal qilish muddati: 2 daqiqa.`
                    }
                }
            }
        ]
    };

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Authorization": authHeader,
                "Content-Type": "application/json",
                "Cache-Control": "no-cache"
            },
            body: JSON.stringify(requestBody)
        });
        if (response.ok) {
            return "ok";
        }
        console.error("SMS yuborishda xatolik yuz berdi:", response.status);
        return "no";
    } catch (error) {
        console.error("Xatolik yuz berdi:", error.message);
        return "no";
    }
}

module.exports = Auth;
