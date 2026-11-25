// Oddiy xotirada ishlaydigan so'rovlar cheklovchisi (IP bo'yicha).
// Foydalanish: router.post('/', rateLimit({ windowMs: 15*60*1000, max: 10 }), handler)
function rateLimit({ windowMs = 15 * 60 * 1000, max = 10, message = "Juda ko'p urinish. Birozdan keyin qayta urinib ko'ring." } = {}) {
    const hits = new Map(); // ip -> { count, reset }
    const timer = setInterval(() => {
        const now = Date.now();
        for (const [ip, h] of hits) if (h.reset <= now) hits.delete(ip);
    }, windowMs);
    if (timer.unref) timer.unref();

    return function (req, res, next) {
        const now = Date.now();
        const ip = req.ip || (req.socket && req.socket.remoteAddress) || 'unknown';
        let h = hits.get(ip);
        if (!h || h.reset <= now) {
            h = { count: 0, reset: now + windowMs };
            hits.set(ip, h);
        }
        h.count += 1;
        res.setHeader('X-RateLimit-Limit', max);
        res.setHeader('X-RateLimit-Remaining', Math.max(0, max - h.count));
        if (h.count > max) {
            res.setHeader('Retry-After', Math.ceil((h.reset - now) / 1000));
            return res.status(429).json({ success: false, message });
        }
        return next();
    };
}

module.exports = rateLimit;
