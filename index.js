require('./resurs/functions/env'); // .env ni yuklaydi
const express = require('express');
const cookieParser = require("cookie-parser");
const path = require("path");
const fs = require("fs");

var auth = require("./middlewire/auth");
const resolveInside = require("./resurs/functions/safePath");

const port = Number(process.env.PORT) || 1230;
const isProd = process.env.NODE_ENV === "production";
const UPLOADS_DIR = path.join(__dirname, "uploads");
const app = express();
app.disable('x-powered-by');

const authRouter = require("./routers/auth");

const taskRouter = require("./routers/task");
const roleRouter = require("./routers/role");
const profileRouter = require("./routers/profil");
const userRouter = require("./routers/user");

const studentRouter = require("./routers/student");

var db = require('./db/mongodb');

// Express 4 async xatolarni o'zi ushlamaydi: rad etilgan va'dalarni next(err) ga yo'naltiramiz.
function safeRouter(router) {
  for (const layer of router.stack) {
    if (!layer.route) continue;
    for (const l of layer.route.stack) {
      const fn = l.handle;
      if (fn.length >= 4) continue;
      l.handle = function (req, res, next) {
        try {
          const r = fn.call(this, req, res, next);
          if (r && typeof r.catch === 'function') r.catch(next);
        } catch (e) { next(e); }
      };
    }
  }
  return router;
}

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'same-origin');
  next();
});
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Pug templateni sozlash
app.set('view engine', 'pug');
app.set('views', './views'); // Pug fayllarini joylash

// Boshqaruv bo'limlari faqat xodimlar uchun (talabalar kira olmaydi)
app.use(['/task', '/role', '/user', '/student'], auth, auth.staffOnly);

app.use('/task', safeRouter(taskRouter))
app.use('/role', safeRouter(roleRouter))
app.use('/user', safeRouter(userRouter))
app.use('/profil', safeRouter(profileRouter))

app.use('/student', safeRouter(studentRouter))

app.use('/auth', safeRouter(authRouter))


app.use('/signout', async (req, res, next) => {
  return res
    .cookie("x-web-token", "", {
      httpOnly: true,
      sameSite: "lax",
      secure: isProd,
    })
    .status(200)
    .send(`<script>setTimeout(()=>{window.location.href = '/login';},10);</script>`);
})

app.get("/download/:filename", auth, (req, res) => {
  // Yo'l qismi bor nomlar (../ va h.k.) rad etiladi, natija uploads ichida bo'lishi shart
  const filePath = resolveInside(UPLOADS_DIR, req.params.filename);
  if (!filePath) {
    return res.status(400).json({ message: "Fayl nomi noto'g'ri" });
  }
  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      return res.status(404).json({ message: "Fayl topilmadi" });
    }
    // res.download Content-Disposition ni xavfsiz kodlaydi
    res.download(filePath, path.basename(filePath), (e) => {
      if (e && !res.headersSent) {
        if (e.status === 404) return res.status(404).json({ message: "Fayl topilmadi" });
        res.status(500).json({ message: "Faylni yuborib bo'lmadi" });
      }
    });
  });
});

// Build/manba fayllari brauzerga berilmaydi (bog'liqliklar, gulp, pug shablonlari)
app.use((req, res, next) => {
  let p;
  // "/x/../package.json" kabi shakllar static ichida normallashadi, shuning uchun avval normallashtiramiz
  try { p = path.posix.normalize(decodeURIComponent(req.path).replace(/\\/g, "/")); } catch (e) { return res.sendStatus(400); }
  if (/^\/(node_modules|gulp-tasks|pages)(\/|$)|^\/(package(-lock)?\.json|gulpfile\.js)$|\.pug$/i.test(p)) {
    return res.sendStatus(404);
  }
  next();
});

// Static fayllarni servis qilish (masalan: css, js)
app.use(express.static('views/public'));

app.get('/', auth, async (req, res) => {
  let bolimlar = {
    role: true,
    user: true,
    certifcate: true,
    task: true
  };

  const actions = {}
  let static = {};
  res.render('public/index', {
    static: static,
    ...bolimlar,
    user: req.user,
    actions: actions
  });
});



// Login sahifasi uchun GET tarmoq so'rovini qo'llash
app.get('/login', (req, res) => {
  res.render('public/pages/login');
});

// Umumiy xato ishlovchi: stek va ichki ma'lumotlar foydalanuvchiga ko'rsatilmaydi
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  console.error("Xatolik:", isProd ? err.message : err);
  const status = err.status && err.status >= 400 && err.status < 600 ? err.status : 500;
  if (err.name === 'MulterError' || (err.message && err.message.startsWith('Faqat JPEG'))) {
    return res.status(400).json({ message: err.message });
  }
  res.status(status).json({ message: status === 500 ? "Serverda xatolik yuz berdi!" : err.message });
});

process.on('unhandledRejection', (reason) => {
  console.error('Ushlanmagan va\'da xatosi:', isProd ? (reason && reason.message) : reason);
});

// Serverni faqat bazaga ulanganidan keyin ishga tushiramiz
(async () => {
  try {
    db = await db;
  } catch (err) {
    console.error("XATO: MongoDB ga ulanib bo'lmadi:", err.message);
    process.exit(1);
  }
  app.listen(port, () => {
    console.log(`Server http://localhost:${port} portda ishlayapti...`);
  });
})();
