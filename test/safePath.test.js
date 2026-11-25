const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const resolveInside = require('../resurs/functions/safePath');

const base = path.join(__dirname, 'fixtures-uploads');

test('oddiy fayl nomi uploads ichida hal qilinadi', () => {
    assert.equal(resolveInside(base, 'rasm.png'), path.join(base, 'rasm.png'));
});

test('probel, vergul va unicode belgili nomlar ruxsat etiladi', () => {
    const name = '1737787837776-Konferenciya materiallar, 2024 jıl.pdf';
    assert.equal(resolveInside(base, name), path.join(base, name));
});

test('../ bilan katalogdan chiqish rad etiladi', () => {
    assert.equal(resolveInside(base, '../package.json'), null);
    assert.equal(resolveInside(base, '../../etc/passwd'), null);
});

test('mutlaq yo\'l va ichki katalog rad etiladi', () => {
    assert.equal(resolveInside(base, '/etc/passwd'), null);
    assert.equal(resolveInside(base, 'sub/file.txt'), null);
});

test('teskari slash (Windows) bilan chiqish rad etiladi', () => {
    assert.equal(resolveInside(base, '..\\secret.txt'), null);
    assert.equal(resolveInside(base, 'a\\b.txt'), null);
});

test('bo\'sh, nuqta, null bayt va satr bo\'lmagan qiymatlar rad etiladi', () => {
    for (const bad of ['', '.', '..', 'a\0b', undefined, null, 42, {}, ['a']]) {
        assert.equal(resolveInside(base, bad), null, String(bad));
    }
});
