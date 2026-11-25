const test = require('node:test');
const assert = require('node:assert/strict');
const formatDate = require('../resurs/functions/formatDate');

test('formatDate: YYYY-MM-DD HH:mm:ss formatida qaytaradi', () => {
    assert.equal(formatDate(new Date(2024, 0, 5, 3, 4, 9)), '2024-01-05 03:04:09');
});

test('formatDate: ikki xonali qiymatlarni o\'zgartirmaydi', () => {
    assert.equal(formatDate(new Date(2025, 10, 25, 23, 59, 58)), '2025-11-25 23:59:58');
});

test('formatDate: yil oxiri', () => {
    assert.equal(formatDate(new Date(1999, 11, 31, 0, 0, 0)), '1999-12-31 00:00:00');
});
