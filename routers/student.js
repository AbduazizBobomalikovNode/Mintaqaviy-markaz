const express = require("express");
const router = express.Router();

var db = require('../db/mongodb');
var auth = require("../middlewire/auth");


setTimeout(async () => { db = await db }, 100);

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
    let students  = await (await db).user.getUserAll();
    students = students.filter(student => student.idrole == 73828625);
    console.log("students :",students);
    let direction = ["Defektologiya (logopediya)", "Amaliy psixologiya", "Maktabgacha talim tashkilotining tarbiyachisi", "Pedagogik qayta tayorlov"]
    res.render('public/pages/student', {
        direction: direction,
        students:students,
    });
})

module.exports = router;