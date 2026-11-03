const crypto = require('crypto');

// no 0/O or 1/I so a number read out loud at the counter is never confused
const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';   // 32 characters

// today's date in the shop's timezone (Philippines), as YYMMDD
const shopDate = () => {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Manila', year: '2-digit', month: '2-digit', day: '2-digit'
    }).formatToParts(new Date());
    const get = (type) => parts.find(p => p.type === type).value;
    return `${get('year')}${get('month')}${get('day')}`;
};

// e.g. KL-261014-7Q3K   (the unique index on the order tells us if two ever collide)
const generateOrderNumber = () => {
    const bytes = crypto.randomBytes(4);
    let code = '';
    for (let i = 0; i < 4; i++) code += ALPHABET[bytes[i] % 32];   // 256 is divisible by 32 -> no bias
    return `KL-${shopDate()}-${code}`;
};

module.exports = { generateOrderNumber };