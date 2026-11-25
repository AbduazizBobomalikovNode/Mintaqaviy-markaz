const bcrypt = require('bcrypt');
const crypto = require('crypto');

const BCRYPT_RE = /^\$2[aby]\$\d{2}\$/;

function isHash(value) {
    return typeof value === 'string' && BCRYPT_RE.test(value);
}

// Parolni tekshiradi. Saqlangan qiymat bcrypt xesh bo'lsa faqat bcrypt.compare ishlatiladi
// (xeshning o'zi bilan kirib bo'lmaydi). Eski, ochiq saqlangan parollar vaqt bo'yicha
// xavfsiz taqqoslanadi.
async function verifyPassword(plain, stored) {
    if (typeof plain !== 'string' || typeof stored !== 'string' || !plain || !stored) {
        return false;
    }
    if (isHash(stored)) {
        return bcrypt.compare(plain, stored);
    }
    const a = Buffer.from(plain);
    const b = Buffer.from(stored);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
}

module.exports = { verifyPassword, isHash };
