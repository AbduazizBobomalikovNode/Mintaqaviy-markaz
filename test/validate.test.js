const test = require('node:test');
const assert = require('node:assert/strict');
const user = require('../resurs/validate/user');
const role = require('../resurs/validate/role');
const task = require('../resurs/validate/task');
const topic = require('../resurs/validate/topic');

const validUser = { name: 'Demo Talaba', phone: '+998000000001', email: 'demo@example.uz', password: 'parol123', idrole: 1 };

test('user: to\'liq to\'g\'ri obyekt qabul qilinadi', () => {
    assert.equal(user(validUser, 'add').error, undefined);
});

test('user: add rejimida majburiy maydon yetishmasa xato', () => {
    const { password, ...rest } = validUser;
    assert.ok(user(rest, 'add').error);
});

test('user: update rejimida qisman obyekt mumkin', () => {
    assert.equal(user({ name: 'Yangi nom' }).error, undefined);
});

test('user: ortiqcha maydon (id, mass assignment) rad etiladi', () => {
    assert.ok(user({ ...validUser, id: 5 }, 'add').error);
    assert.ok(user({ isAdmin: true }).error);
});

test('user: NoSQL operator obyektlari rad etiladi', () => {
    assert.ok(user({ phone: { $ne: null } }).error);
    assert.ok(user({ name: { $gt: '' } }).error);
});

test('user: qisqa parol rad etiladi', () => {
    assert.ok(user({ password: '123' }).error);
});

test('role/task/topic: nom majburiy va satr bo\'lishi shart', () => {
    assert.ok(role({}, 'add').error);
    assert.equal(role({ name: 'admin' }, 'add').error, undefined);
    assert.ok(task({ name: 'x' }, 'add').error); // path majburiy
    assert.equal(task({ name: 'x', path: '/x' }, 'add').error, undefined);
    assert.ok(topic({ name: { $ne: 1 } }, 'add').error);
});
