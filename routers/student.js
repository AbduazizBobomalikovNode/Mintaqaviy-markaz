const express = require("express");
const router = express.Router();

var db = require('../db/mongodb');
var auth = require("../middlewire/auth");
const { STUDENT_ROLE_ID } = auth;



let bolimlar = {
    update: true,
    deletes: true,
    deletesAll: true,
    add: true,
    view: true,
    role: true,
    user: true,
    certifcate: true,
    task: true
};

router.get("/", auth, async (req, res) => {
    // Filtr bazada bajariladi; parol xeshi sahifaga uzatilmaydi
    let students = (await (await db).user.getUserRole(STUDENT_ROLE_ID)).map(({ password, ...rest }) => rest);
    let direction = ["Defektologiya (logopediya)", "Amaliy psixologiya", "Maktabgacha talim tashkilotining tarbiyachisi", "Pedagogik qayta tayorlov"]
    res.render('public/pages/student', {
        direction: direction,
        students:students,
        user: req.user,
    });
})

module.exports = router;