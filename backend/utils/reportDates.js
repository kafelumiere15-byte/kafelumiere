// Days and months of the SHOP (Philippine time, UTC+8, no daylight saving).
// A "day key" looks like 2026-10-14 and a "month key" like 2026-10.
const TZ = 'Asia/Manila';
const dayFormat = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });

const dayKey = (date) => dayFormat.format(date);
const monthKey = (date) => dayKey(date).slice(0, 7);

const startOfDay = (key) => new Date(`${key}T00:00:00+08:00`);
const endOfDay = (key) => new Date(`${key}T23:59:59.999+08:00`);

// a real calendar day (rejects 2026-02-30 and 31-10-2026)
const isRealDay = (key) =>
    typeof key === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(key) &&
    !Number.isNaN(startOfDay(key).getTime()) && dayKey(startOfDay(key)) === key;

const addDays = (key, n) => {
    const d = new Date(`${key}T12:00:00+08:00`);
    d.setUTCDate(d.getUTCDate() + n);
    return dayKey(d);
};

const addMonths = (month, n) => {
    const [y, m] = month.split('-').map(Number);
    const total = y * 12 + (m - 1) + n;
    return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`;
};

const daysBetween = (fromKey, toKey) => Math.round((startOfDay(toKey) - startOfDay(fromKey)) / 86400000);

module.exports = { dayKey, monthKey, startOfDay, endOfDay, isRealDay, addDays, addMonths, daysBetween };