// .env faylini yuklaydi va majburiy o'zgaruvchilarni tekshiradi.
require('dotenv').config({ quiet: true });

function required(name) {
    const value = process.env[name];
    if (!value || !String(value).trim()) {
        console.error(`XATO: "${name}" muhit o'zgaruvchisi topilmadi. .env faylini yarating (.env.example ga qarang) va qayta ishga tushiring.`);
        process.exit(1);
    }
    return value;
}

module.exports = { required };
