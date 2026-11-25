const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcrypt');
const { verifyPassword, isHash } = require('../resurs/functions/password');

test('bcrypt xesh bilan to\'g\'ri parol tasdiqlanadi', async () => {
    const h = await bcrypt.hash('sirli-parol', 4);
    assert.equal(await verifyPassword('sirli-parol', h), true);
    assert.equal(await verifyPassword('boshqa', h), false);
});

test('xeshning o\'zi parol sifatida qabul qilinmaydi', async () => {
    const h = await bcrypt.hash('sirli-parol', 4);
    assert.equal(await verifyPassword(h, h), false);
});

test('eski ochiq parol taqqoslanadi', async () => {
    assert.equal(await verifyPassword('abc12345', 'abc12345'), true);
    assert.equal(await verifyPassword('abc12346', 'abc12345'), false);
});

test('satr bo\'lmagan yoki bo\'sh qiymatlar rad etiladi', async () => {
    assert.equal(await verifyPassword({ $ne: null }, 'x'), false);
    assert.equal(await verifyPassword('x', undefined), false);
    assert.equal(await verifyPassword('', ''), false);
    assert.equal(isHash('$2b$10$abc'), true);
    assert.equal(isHash('plain'), false);
});
