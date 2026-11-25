const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

var db = require('../db/mongodb');
var generateId = require('../resurs/functions/getid');
const validate = require("../resurs/validate/device");
var auth = require("../middlewire/auth");
const resolveInside = require("../resurs/functions/safePath");

const UPLOADS_DIR = path.join(__dirname, "..", "uploads");
const DIRECTIONS = ["Defektologiya (logopediya)", "Amaliy psixologiya", "Maktabgacha talim tashkilotining tarbiyachisi", "Pedagogik qayta tayorlov"];




const router = express.Router();

// Fayllarni saqlash uchun multer konfiguratsiyasi
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOADS_DIR); // Fayllar saqlanadigan katalog
    },
    filename: (req, file, cb) => {
        // Fayl nomidagi yo'l va maxsus belgilar olib tashlanadi
        const safe = path.basename(file.originalname).replace(/[^\p{L}\p{N}._ ,()-]/gu, "_").slice(0, 120);
        cb(null, `${Date.now()}-${safe}`); // Fayl nomi vaqt tamg‘asi bilan
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024, files: 4 }, // 10 MB
    fileFilter: (req, file, cb) => {
        // Faqat ruxsat etilgan fayl formatlarini qabul qilish
        const allowedTypes = ["image/jpeg", "image/png", "application/pdf"];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error("Faqat JPEG, PNG yoki PDF formatdagi fayllar qabul qilinadi!"), false);
        }
    },
});


router.get('/', auth, async (req, res) => {
    // console.log("kirish amalga  oshdi!");
    // let bolimlar = {
    //   role: true,
    //   user: true,
    //   certifcate: true,
    //   task: true
    // };

    // // console.log(bolimlar,!bolimlar.task && !bolimlar.role && !bolimlar.user);
    let user = await (await db).user.getUser(req.user.id);
    if (!user) {
        return res.status(404).json({ message: "Foydalanuvchi topilmadi" });
    }
    delete user.password;
    // Avatar fayli uploads papkasidan o'qiladi (yo'l tekshiriladi)
    const avatarPath = user.avatar ? resolveInside(UPLOADS_DIR, user.avatar) : null;
    user.avatar = null;
    if (avatarPath) {
        try {
            const avatarBase64 = await fs.promises.readFile(avatarPath, { encoding: 'base64' });
            user.avatar = `data:image/jpeg;base64,${avatarBase64}`;
        } catch (e) {
            user.avatar = null;
        }
    }
    if (user.direction) {
        user.direction = DIRECTIONS[Number(user.direction) - 1];
    }

    res.render('public/pages/utils/profil', {
        // static:static,
        // ...bolimlar,
        user: user,
        supportPhone: process.env.SUPPORT_PHONE || '',
        // actions:actions
    }); // 'login.pug' faylini ishlatish
});

// POST /profil/save marshruti
router.post(
    "/save", auth,
    upload.fields([
        { name: "avatar", maxCount: 1 }, // Suratingiz fayli
        { name: "passport", maxCount: 1 }, // Pasport fayli
        { name: "diplom", maxCount: 1 }, // Diplom fayli
        { name: "ilova", maxCount: 1 }, // Qo'shimcha ilova
    ]),
    async (req, res) => {
        try {
            const { firstName, lastName, direction } = req.body; // Matnli maydonlar

            const avatar = req.files && req.files.avatar ? req.files.avatar[0] : null; // Avatar fayli
            const passport = req.files && req.files.passport ? req.files.passport[0] : null; // Pasport fayli
            const diplom = req.files && req.files.diplom ? req.files.diplom[0] : null; // Diplom fayli
            const ilova = req.files && req.files.ilova ? req.files.ilova[0] : null; // Ilova fayli

            const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
            let user = {};
            if (str(firstName, 100)) {
                user.firstName = str(firstName, 100);
            }
            if (str(lastName, 100)) {
                user.lastName = str(lastName, 100);
            }
            if (str(direction, 2)) {
                user.direction = str(direction, 2);
            }
            // Eski fayllar DB dagi yozuvdan olinadi (JWT dan emas) va uploads ichidan o'chiriladi
            const current = (await (await db).user.getUser(req.user.id)) || {};
            const replaceFile = (field, uploaded) => {
                if (!uploaded) return;
                if (current[field]) {
                    const old = resolveInside(UPLOADS_DIR, current[field]);
                    if (old && fs.existsSync(old)) {
                        fs.unlinkSync(old);
                    }
                }
                user[field] = uploaded.filename;
            };
            replaceFile('avatar', avatar);
            replaceFile('passport', passport);
            replaceFile('diplom', diplom);
            replaceFile('ilova', ilova);

            let result = await (await db).user.update(req.user.id, user);
            if (result.hasOwnProperty('error')) {
                return res.send({
                    status: 400,
                    error: result,
                    path: '/task'
                });
            }
            // Ma'lumotlarni muvaffaqiyatli qayta ishlash
            res.status(200).json({ message: "Ma'lumotlar muvaffaqiyatli saqlandi!" });
        } catch (error) {
            console.error("Xatolik:", error);
            res.status(500).json({ message: "Serverda xatolik yuz berdi!" });
        }
    }
);

module.exports = router;
