const jwt = require('jsonwebtoken');
const { required } = require('../resurs/functions/env');
const jwt_my_key = required('JWT_MY_KEY');

const isDev = process.env.NODE_ENV !== 'production';
const STUDENT_ROLE_ID = 73828625; // SMS orqali ro'yxatdan o'tgan talabalar roli

const redirectToLogin = (delay = 10) =>
    `<script>setTimeout(()=>{window.location.href = '/login';},${delay});</script>`;

function clearCookie(res) {
    return res.cookie("x-web-token", "", {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
    });
}

// Tokenni tekshiradi (imzo va muddat jwt.verify tomonidan tekshiriladi).
async function auth(req, res, next) {
    const token = req.cookies && req.cookies['x-web-token'];
    if (!token || typeof token !== 'string') {
        return res.send(redirectToLogin());
    }
    try {
        req.user = jwt.verify(token, jwt_my_key, { algorithms: ['HS256'] });
        return next();
    } catch (err) {
        if (err && err.name === 'TokenExpiredError') {
            return clearCookie(res).status(200).send(redirectToLogin());
        }
        if (isDev) console.log('Token yaroqsiz:', err.message);
        return res.send(redirectToLogin(1));
    }
}

// Faqat xodimlar (talaba roli bo'lmaganlar) uchun. auth dan keyin ishlatiladi.
function staffOnly(req, res, next) {
    if (req.user && Number(req.user.idrole) === STUDENT_ROLE_ID) {
        return res.status(403).send("Ushbu bo'limga kirish uchun ruxsat yo'q!");
    }
    return next();
}

module.exports = auth;
module.exports.staffOnly = staffOnly;
module.exports.STUDENT_ROLE_ID = STUDENT_ROLE_ID;
