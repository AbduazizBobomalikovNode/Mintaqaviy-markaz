const express = require('express');
const bcrypt = require('bcrypt');
const Auth = express.Router();
const jwt = require('jsonwebtoken');
const action = require("../resurs/functions/action");

const jwt_my_key = process.env.JWT_MY_KEY || "***REMOVED***";
var db = require('../db/mongodb');
var generateId = require('../resurs/functions/getid');
const verificationCodes = new Map(); // { phone: { kod, expiry, attempts } }

setInterval(async () => { db = await db }, 100);

Auth.get('/', async (req, res) => {
    const x_token = req.cookies['x-web-token'];
    if (!x_token) {
        return res.render('public/pages/login');
    }
    res.send(`<!DOCTYPE html><head><script>setTimeout(()=>{window.location.href = '/';},50);</script></head><body></body></html>`);
})
// Tasodifiy kodni vaqtinchalik saqlash uchun (masalan, xotirada)

// SMS yuborish marshruti
Auth.get('/sms/:phone', async (req, res) => {
    const phone = req.params.phone; // Telefon raqami

    // 6 xonali tasodifiy kod yaratish
    const kod = Math.floor(100000 + Math.random() * 900000).toString();
    console.log("Tizimga kirish uchun kodingiz:", kod, phone);

    // Kodni vaqtinchalik xotirada saqlash (5 daqiqaga amal qiladi)
    const expiry = Date.now() + 2 * 60 * 1000; // 5 daqiqa
    verificationCodes.set(phone, { kod, expiry });

    // SMS yuborish (sendSms funksiyasini o‘z xizmatingiz bilan o‘rnating)
    sendSms(phone, kod).then(result => {
        if (result === "ok") {
            console.log("SMS jo'natish jarayoni muvaffaqiyatli yakunlandi!");
            res.status(200).json({ success: true, message: "SMS yuborildi." });
        } else {
            console.log("SMS jo'natib bo'lmadi.");
            res.status(400).json({ success: false, message: "SMS yuborilmadi." });
        }
    }).catch(err => {
        console.error("Xatolik:", err);
        res.status(500).json({ success: false, message: "Ichki server xatosi." });
    });
});


// Kodni tekshirish marshruti
Auth.post('/checked', async (req, res) => {
    const { phone, code } = req.body; // Telefon raqam va kodni olish

    if (!phone || !code) {
        return res.status(400).json({ success: false, message: "Telefon raqam yoki kod yetarli emas." });
    }

    const savedCode = verificationCodes.get(phone);

    if (!savedCode) {
        return res.status(400).json({ success: false, message: "Kod topilmadi yoki muddati tugagan." });
    }

    // Urinishlar sonini oshirish
    if (!savedCode.attempts) {
        savedCode.attempts = 0; // Urinishlar sonini boshlash
    }
    savedCode.attempts += 1;

    // Agar urinishlar soni 5 dan oshsa, kodni o'chirish
    if (savedCode.attempts > 5) {
        verificationCodes.delete(phone);
        return res.status(400).json({ success: false, message: "Ko'p urinish. Kod o'chirildi." });
    }

    // Kodni va muddati tugashini tekshirish
    if (savedCode.kod === code && savedCode.expiry > Date.now()) {
        verificationCodes.delete(phone); // Foydalanilgandan keyin o‘chirib tashlash
        let user = await (await db).user.getUserForObj({ phone: phone });
        if (user.length == 0) {
            let gen_id = await generateId(db, null, "user");
            await (await db).user.addUser({
                id:gen_id,
                phone: phone,
                idrole: 73828625
            });
            user = [await (await db).user.getUser(gen_id)];
        }
        const role = await (await db).role.getRole(user[0].idrole);
        if (!role) {
            return res.render('public/pages/login', { error: "o'chirilgan hisob!." });
        }
        user[0].role = role.name;
        let array = await (await db).RHT.getRHTRole(user[0].idrole);
        for (let index = 0; index < array.length; index++) {
            const element = array[index];
            array[index] = (await (await db).task.getTask(element.idtask)).path;
        }
        user[0].rolePath = array.join();
        user[0].exp = Math.floor(Date.now() / 1000) + 60 * 60;
        const token = jwt.sign({ ...user[0] }, jwt_my_key);
        let nazoratchi = false;
        if (user[0].role && typeof user[0].role =="string" && user[0].role.includes("nazoratchi")) {
            nazoratchi = true;
        }
        console.log("jwt :", token)
        return res.cookie("x-web-token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
        }).status(200).json({ success: true,nazoratchi:nazoratchi, message: "Kod tasdiqlandi." });
    }

    res.status(400).json({ success: false, message: "Kod noto‘g‘ri yoki muddati tugagan." });
});


Auth.post('/', async (req, res) => {
    const auth = req.body;
    console.log("body : ", auth);

    if (auth.hasOwnProperty('login') && auth.hasOwnProperty('password')) {
        let user = await (await db).user.getUserForObj({ phone: auth.login });
        if (!user || user.length < 1) {
            user = await (await db).user.getUserForObj({ email: auth.login });
        }
        // console.log(user)
        if (user.length < 1) {
            return res.render('public/pages/login', { error: "parol yoki login  xato!." });
        }
        const role = await (await db).role.getRole(user[0].idrole);
        if (!role) {
            return res.render('public/pages/login', { error: "o'chirilgan hisob!." });
        }
        // user[0].licence = JSON.parse(`${role.licence}`.replaceAll("'", '"'));;
        // console.log(user)
        user[0].role = role.name;
        let array = await (await db).RHT.getRHTRole(user[0].idrole);
        for (let index = 0; index < array.length; index++) {
            const element = array[index];
            array[index] = (await (await db).task.getTask(element.idtask)).path;
        }
        user[0].rolePath = array.join();
        user[0].exp = Math.floor(Date.now() / 1000) + 60 * 60;
        let pas_flag = auth.password == user[0].password || await bcrypt.compare(auth.password, user[0].password);
        // console.log('pas', pas_flag, user[0].rolePath);
        action({
            user: user[0].name,
            module: "Login",
            description: `tizimga kirdi!`
        });
        if (user[0] && pas_flag) {
            const token = jwt.sign({ ...user[0] }, jwt_my_key);
            if (user[0]) {
                return res
                    .cookie("x-web-token", token, {
                        httpOnly: true,
                        secure: process.env.NODE_ENV === "production",
                    })
                    .status(200)
                    .send(`<!DOCTYPE html>
                    <html lang="en">
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
                        </style>
                    </head>
                    <body>
                        <div class="center"> 
                            <div class="left">
                                <span class="loader"></span>
                            </div>
                        </div>
                    </body>
                    </html>`);
            }
        } else {
            return res.render('public/pages/login', { error: "parol yoki login  xato!." });
        }
    } else {
        return res.render('public/pages/login', { error: "parol yoki login  xato!." });
    }
});


async function sendSms(phone, kod) {
    const url = "http://91.204.239.44/broker-api/send"; // SMS API URL manzili
    const requestBody = {
        messages: [
            {
                "recipient": phone,
                "message-id": "2016256",
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
                "Authorization": "***REMOVED***",
                "Content-Type": "application/json",
                "Cache-Control": "no-cache"
            },
            body: JSON.stringify(requestBody)
        });

        if (response.ok) {
            console.log("SMS muvaffaqiyatli yuborildi!");
            return "ok";
        } else {
            console.error("SMS yuborishda xatolik yuz berdi:", response.status);
            return "no";
        }
    } catch (error) {
        console.error("Xatolik yuz berdi:", error);
        return "no";
    }
}

// Misol: SMS jo'natish


module.exports = Auth;



