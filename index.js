const express = require('express');
const cookieParser = require("cookie-parser");
var auth = require("./middlewire/auth");
let path = require("path");
let fs = require("fs");

// var document = require("./middlewire/document");
const port = 1230; // yoki istalgan boshqa port
const app = express();


var auth = require("./middlewire/auth");

const authRouter = require("./routers/auth");

const taskRouter = require("./routers/task");
const roleRouter = require("./routers/role");
const profileRouter = require("./routers/profil");
const userRouter = require("./routers/user");

const studentRouter = require("./routers/student");
const RHTRouter = require("./routers/_____role_has_task");
const DHTRouter = require("./routers/device_has_topic");

// const certificateRouter = require("./routers/certificate");
// const fileRouter = require("./routers/file");
// const authRouter = require("./routers/auth");

var db = require('./db/mongodb');

setInterval(async () => { db = await db }, 100);

app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

app.use('/task', taskRouter)
app.use('/role', roleRouter)
app.use('/user', userRouter)
app.use('/profil', profileRouter)

app.use('/student', studentRouter)

app.use('/auth', authRouter)



app.use('/signout', async (req, res, next) => {
  return res
    .cookie("x-web-token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    })
    .status(200)
    .send(`<script>setTimeout(()=>{window.location.href = '/login';},10);</script>`);
})


// app.use('/login', authRouter);

// Pug templateni sozlash
app.set('view engine', 'pug');
app.set('views', './views'); // Pug fayllarini joylash

// Static fayllarni servis qilish (masalan: css, js)
app.use(express.static('views/public'));


app.get("/download/:filename", (req, res) => {
  const filename = req.params.filename; // URL-dan fayl nomini olamiz
  const filePath = path.join(__dirname, "uploads", filename); // Fayl joylashuvi

  // Fayl mavjudligini tekshirish
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: "Fayl topilmadi" });
  }

  // Faylni stream orqali foydalanuvchiga uzatish
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  const fileStream = fs.createReadStream(filePath);
  fileStream.pipe(res);
});

app.get('/', auth, async (req, res) => {
  console.log("kirish amalga  oshdi!");
  let bolimlar = {
    role: true,
    user: true,
    certifcate: true,
    task: true
  };

  // // console.log(bolimlar,!bolimlar.task && !bolimlar.role && !bolimlar.user);
  const actions = {}//await (await db).action.getActionAll();
  // const static = await (await db).static.getStatic();
  let static = {};
  res.render('public/index', {
    static: static,
    ...bolimlar,
    user: req.user,
    actions: actions
  }); // 'login.pug' faylini ishlatish
});



// Login sahifasi uchun GET tarmoq so'rovini qo'llash
app.get('/login', (req, res) => {
  res.render('public/pages/login'); // 'login.pug' faylini ishlatish
});

// app.get('/:page', (req, res) => {
//   let page = req.params.page;
//   res.sendFile(path.join(__dirname, 'public', `${page}.html`));
// });

// Serverni ishga tushirish
app.listen(port, () => {
  console.log(`Server http://localhost:${port} portda ishlayapti...`);
});
