const path = require('path');

// Foydalanuvchi bergan fayl nomini `baseDir` ichidagi xavfsiz yo'lga aylantiradi.
// Yaroqsiz bo'lsa (bo'sh nom, null bayt, katalogdan chiqib ketish) null qaytaradi.
function resolveInside(baseDir, filename) {
    if (typeof filename !== 'string' || filename.length === 0 || filename.includes('\0')) {
        return null;
    }
    // Windows va POSIX ajratgichlarining ikkalasini ham olib tashlaymiz.
    const name = path.basename(filename.replace(/\\/g, '/'));
    if (!name || name === '.' || name === '..' || name !== filename) {
        return null; // nomda yo'l qismi bor edi -> rad etiladi
    }
    const base = path.resolve(baseDir);
    const full = path.resolve(base, name);
    if (path.dirname(full) !== base) {
        return null;
    }
    return full;
}

module.exports = resolveInside;
