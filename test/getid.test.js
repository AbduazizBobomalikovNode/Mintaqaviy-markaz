const test = require('node:test');
const assert = require('node:assert/strict');
const generateId = require('../resurs/functions/getid');

// Soxta db: "chek_id" birinchi 2 marta band deb javob beradi
function fakeDb(busyTimes = 0) {
    const calls = [];
    let left = busyTimes;
    return {
        calls,
        db: Promise.resolve({
            chek_id: async (table, id) => {
                calls.push({ table, id });
                if (left > 0) { left--; return true; }
                return false;
            },
        }),
    };
}

test('getid: standart 8 xonali butun son qaytaradi', async () => {
    const { db, calls } = fakeDb();
    const id = await generateId(db, null, 'user');
    assert.ok(Number.isInteger(id));
    assert.equal(String(id).length, 8);
    assert.equal(calls[0].table, 'user');
});

test('getid: band id bo\'lsa qayta urinadi', async () => {
    const { db, calls } = fakeDb(2);
    const id = await generateId(db, null, 'task');
    assert.equal(calls.length, 3);
    assert.equal(calls[2].id, id);
});

test('getid: key rejimida xesh asosidagi satr qaytaradi', async () => {
    const key = await generateId(null, null, 'x', 'key', '12');
    assert.equal(typeof key, 'string');
    assert.ok(key.length >= 9);
});
