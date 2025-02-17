const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

var db = require('../db/mongodb');
var generateId = require('../resurs/functions/getid');
const validate = require("../resurs/validate/device");
var auth = require("../middlewire/auth");


setTimeout(async () => { db = await db }, 100);


const router = express.Router();

// Fayllarni saqlash uchun multer konfiguratsiyasi
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "./uploads"); // Fayllar saqlanadigan katalog
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`); // Fayl nomi vaqt tamg‘asi bilan
    },
});

const upload = multer({
    storage,
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
    const actions = {}//await (await db).action.getActionAll();
    // const static = await (await db).static.getStatic();
    let static = {};

    let user = await (await db).user.getUser(req.user.id);
    let avatarPath = user.avatar ? path.join(__dirname,"../", 'uploads', user.avatar) : null;
    console.log(user);
    // Agar avatar mavjud bo'lsa
    if (avatarPath) {
        // Faylni o'qish va Base64 formatiga o'zgartirish
        const avatarBase64 = fs.readFileSync(avatarPath, { encoding: 'base64' });
        // console.log(`data:image/jpeg;base64,${avatarBase64}`);
        user.avatar = `data:image/jpeg;base64,${avatarBase64}`;;
    } else {
        user.avatar = null;
    }
    if (user.direction) {
        let direction = ["Defektologiya (logopediya)","Amaliy psixologiya","Maktabgacha talim tashkilotining tarbiyachisi","Pedagogik qayta tayorlov"]
        user.direction = direction[Number(user.direction) - 1];
    }

    res.render('public/pages/utils/profil', {
        // static:static,
        // ...bolimlar,
        user: user,
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

            const avatar = req.files.avatar ? req.files.avatar[0] : null; // Avatar fayli
            const passport = req.files.passport ? req.files.passport[0] : null; // Pasport fayli
            const diplom = req.files.diplom ? req.files.diplom[0] : null; // Diplom fayli
            const ilova = req.files.ilova ? req.files.ilova[0] : null; // Ilova fayli

            let user = {};
            if (firstName) {
                user.firstName = firstName;
            }
            if (lastName) {
                user.lastName = lastName;
            }
            if (direction) {
                user.direction = direction;
            }
            if (avatar) {
                if (req.user.avatar) {
                    // Oldingi avatar faylini o'chirish
                    const oldAvatarPath = path.join(__dirname, 'uploads', req.user.avatar);

                    // Fayl mavjudligini tekshirib, uni o'chirish
                    if (fs.existsSync(oldAvatarPath)) {
                        fs.unlinkSync(oldAvatarPath);  // Faylni o'chirish
                    }
                }
                user.avatar = avatar.filename;  // Yangi avatarni qo'shish
            }
            if (passport) {
                if (req.user.passport) {
                    // Oldingi avatar faylini o'chirish
                    const oldAvatarPath = path.join(__dirname, 'uploads', req.user.passport);

                    // Fayl mavjudligini tekshirib, uni o'chirish
                    if (fs.existsSync(oldAvatarPath)) {
                        fs.unlinkSync(oldAvatarPath);  // Faylni o'chirish
                    }
                }
                user.passport = passport.filename;
            }
            if (diplom) {
                if (req.user.diplom) {
                    // Oldingi avatar faylini o'chirish
                    const oldAvatarPath = path.join(__dirname, 'uploads', req.user.diplom);

                    // Fayl mavjudligini tekshirib, uni o'chirish
                    if (fs.existsSync(oldAvatarPath)) {
                        fs.unlinkSync(oldAvatarPath);  // Faylni o'chirish
                    }
                }
                user.diplom = diplom.filename;
            }
            if (ilova) {
                if (req.user.ilova) {
                    // Oldingi avatar faylini o'chirish
                    const oldAvatarPath = path.join(__dirname, 'uploads', req.user.ilova);

                    // Fayl mavjudligini tekshirib, uni o'chirish
                    if (fs.existsSync(oldAvatarPath)) {
                        fs.unlinkSync(oldAvatarPath);  // Faylni o'chirish
                    }
                }
                user.ilova = ilova.filename;
            }
            // Yuklangan fayllar va matnli ma'lumotlarni ko'rsatish
            console.log("Ism :", firstName);
            console.log("Familiya :", lastName);
            console.log("Yo'nalish :", direction);
            console.log("Avatar fayli :", avatar ? avatar.filename : "Yuklanmagan");
            console.log("Pasport fayli :", passport ? passport.filename : "Yuklanmagan");
            console.log("Diplom fayli :", diplom ? diplom.filename : "Yuklanmagan");
            console.log("Ilova fayli :", ilova ? ilova.filename : "Yuklanmagan");

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
