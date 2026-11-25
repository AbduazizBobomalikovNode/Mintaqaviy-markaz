const test = require('node:test');
const assert = require('node:assert/strict');
const rateLimit = require('../middlewire/rateLimit');

function run(mw, ip) {
    const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(c) { this.code = c; return this; }, json(b) { this.body = b; return this; } };
    let nexted = false;
    mw({ ip }, res, () => { nexted = true; });
    return { nexted, res };
}

test('rateLimit: limitdan keyin 429 qaytaradi', () => {
    const mw = rateLimit({ windowMs: 60000, max: 3 });
    for (let i = 0; i < 3; i++) assert.equal(run(mw, '1.1.1.1').nexted, true);
    const r = run(mw, '1.1.1.1');
    assert.equal(r.nexted, false);
    assert.equal(r.res.code, 429);
    assert.ok(r.res.headers['Retry-After'] > 0);
});

test('rateLimit: har bir IP alohida sanaladi', () => {
    const mw = rateLimit({ windowMs: 60000, max: 1 });
    assert.equal(run(mw, 'a').nexted, true);
    assert.equal(run(mw, 'b').nexted, true);
    assert.equal(run(mw, 'a').nexted, false);
});
