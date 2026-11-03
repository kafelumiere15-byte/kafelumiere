const Order = require('../models/order');
const { PAYMENT_METHODS, paymentLabel } = require('../utils/payment');
const escapeRegex = require('../utils/escapeRegex');
const { dayKey, monthKey, startOfDay, endOfDay, isRealDay, addDays, addMonths, daysBetween } = require('../utils/reportDates');

const fail = (res, status, message) => res.status(status).json({ success: false, message });
const pesos = (cents) => cents / 100;
const toCents = (amount) => Math.round(Number(amount) * 100);

const positive = (value, fallback) => {
    const n = parseInt(value, 10);
    return Number.isInteger(n) && n > 0 ? n : fallback;
};

// Sales = orders that are COMPLETED and PAID, counted on the day they were completed.
// (Every order completed since Part 8 is paid. An old completed order with no payment is reported separately.)
const SALES = { status: 'Completed', paymentStatus: 'paid' };

// Works out the first and last day of a report. Nothing typed -> the last 30 days / last 12 months.
const parseRange = (query, group) => {
    const today = dayKey(new Date());
    let { from, to } = query;
    if ((from && !isRealDay(from)) || (to && !isRealDay(to))) {
        return { error: 'Please use real dates like 2026-10-31' };
    }
    to = to || today;
    from = from || (group === 'day' ? addDays(to, -29) : `${addMonths(to.slice(0, 7), -11)}-01`);
    if (from > to) return { error: 'The start date is after the end date' };
    if (group === 'day' && daysBetween(from, to) > 365) return { error: 'For daily sales please choose a range of one year or less' };
    if (group === 'month' && daysBetween(from, to) > 365 * 5) return { error: 'For monthly sales please choose a range of five years or less' };
    return { from, to };
};

// every day (or month) in the range - so days without sales show up as 0 and the chart has no gaps
const periodsOf = (from, to, group) => {
    const out = [];
    if (group === 'day') {
        for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
    } else {
        for (let m = from.slice(0, 7); m <= to.slice(0, 7); m = addMonths(m, 1)) out.push(m);
    }
    return out;
};

// GET /api/v1/admin/reports/sales?group=day|month&from=2026-10-01&to=2026-10-31   (admin)
exports.salesReport = async (req, res) => {
    const group = req.query.group === 'month' ? 'month' : 'day';
    const range = parseRange(req.query, group);
    if (range.error) return fail(res, 400, range.error);

    const start = startOfDay(range.from);
    const end = endOfDay(range.to);
    const keyOf = group === 'day' ? dayKey : monthKey;

    const [completed, cancelled, completedUnpaid] = await Promise.all([
        Order.find({ ...SALES, completedAt: { $gte: start, $lte: end } }).select('total completedAt source paymentMethod items').lean(),
        Order.find({ status: 'Cancelled', cancelledAt: { $gte: start, $lte: end } }).select('total cancelledAt paymentStatus').lean(),
        Order.countDocuments({ status: 'Completed', paymentStatus: { $ne: 'paid' }, completedAt: { $gte: start, $lte: end } }),
    ]);

    const rows = new Map(periodsOf(range.from, range.to, group).map(p =>
        [p, { period: p, completedCount: 0, salesCents: 0, cancelledCount: 0, cancelledCents: 0 }]));

    let salesCents = 0;
    const byPayment = new Map(PAYMENT_METHODS.map(m => [m.id, { orders: 0, cents: 0 }]));
    const bySource = new Map([['online', { orders: 0, cents: 0 }], ['walk-in', { orders: 0, cents: 0 }]]);
    const products = new Map();

    for (const o of completed) {
        const cents = toCents(o.total);
        salesCents += cents;
        const row = rows.get(keyOf(o.completedAt));
        if (row) { row.completedCount += 1; row.salesCents += cents; }
        const pay = byPayment.get(o.paymentMethod); if (pay) { pay.orders += 1; pay.cents += cents; }
        const src = bySource.get(o.source); if (src) { src.orders += 1; src.cents += cents; }
        for (const item of o.items || []) {
            const entry = products.get(item.name) || { name: item.name, quantity: 0, cents: 0 };
            entry.quantity += item.quantity;
            entry.cents += toCents(item.lineTotal);
            products.set(item.name, entry);
        }
    }

    let cancelledCents = 0, refundedCents = 0;
    for (const o of cancelled) {
        const cents = toCents(o.total);
        cancelledCents += cents;
        if (o.paymentStatus === 'refunded') refundedCents += cents;
        const row = rows.get(keyOf(o.cancelledAt));
        if (row) { row.cancelledCount += 1; row.cancelledCents += cents; }
    }

    return res.status(200).json({
        success: true,
        group,
        range,
        rows: [...rows.values()].map(r => ({
            period: r.period, completedCount: r.completedCount, sales: pesos(r.salesCents),
            cancelledCount: r.cancelledCount, cancelledAmount: pesos(r.cancelledCents),
        })),
        totals: {
            sales: pesos(salesCents),
            completedCount: completed.length,
            averageOrder: completed.length ? pesos(Math.round(salesCents / completed.length)) : 0,
            cancelledCount: cancelled.length,
            cancelledAmount: pesos(cancelledCents),
            refundedAmount: pesos(refundedCents),
            completedUnpaid,   // completed orders with no payment recorded - NOT counted in the sales above
        },
        byPayment: PAYMENT_METHODS.map(m => ({ method: m.id, label: m.label, orders: byPayment.get(m.id).orders, amount: pesos(byPayment.get(m.id).cents) })),
        bySource: [...bySource.entries()].map(([source, v]) => ({ source, orders: v.orders, amount: pesos(v.cents) })),
        topProducts: [...products.values()]
            .sort((a, b) => b.quantity - a.quantity || b.cents - a.cents || a.name.localeCompare(b.name))
            .slice(0, 5)
            .map(p => ({ name: p.name, quantity: p.quantity, amount: pesos(p.cents) })),
    });
};

// GET /api/v1/admin/reports/summary   (admin) - the numbers on the dashboard
exports.summary = async (req, res) => {
    const now = new Date();
    const today = dayKey(now);
    const month = monthKey(now);

    const [paid, completedCount, cancelledCount, completedUnpaid] = await Promise.all([
        Order.find(SALES).select('total completedAt').lean(),
        Order.countDocuments({ status: 'Completed' }),
        Order.countDocuments({ status: 'Cancelled' }),
        Order.countDocuments({ status: 'Completed', paymentStatus: { $ne: 'paid' } }),
    ]);

    const sum = { today: { cents: 0, orders: 0 }, month: { cents: 0, orders: 0 }, total: { cents: 0, orders: 0 } };
    for (const o of paid) {
        const cents = toCents(o.total);
        sum.total.cents += cents; sum.total.orders += 1;
        if (o.completedAt && monthKey(o.completedAt) === month) {
            sum.month.cents += cents; sum.month.orders += 1;
            if (dayKey(o.completedAt) === today) { sum.today.cents += cents; sum.today.orders += 1; }
        }
    }
    const view = (v) => ({ amount: pesos(v.cents), orders: v.orders });

    return res.status(200).json({
        success: true,
        summary: {
            sales: { today: view(sum.today), month: view(sum.month), total: view(sum.total) },
            completedCount,
            cancelledCount,
            completedUnpaid,
            averageOrder: sum.total.orders ? pesos(Math.round(sum.total.cents / sum.total.orders)) : 0,
        },
    });
};

// GET /api/v1/admin/reports/transactions?type=completed|cancelled&from=&to=&q=&page=1&limit=10   (admin)
// The list of completed (or cancelled) orders, newest first, by the day they were completed (cancelled).
exports.transactions = async (req, res) => {
    const type = req.query.type === 'cancelled' ? 'cancelled' : 'completed';
    const field = type === 'cancelled' ? 'cancelledAt' : 'completedAt';
    const page = positive(req.query.page, 1);
    const limit = Math.min(50, positive(req.query.limit, 10));
    const { from, to } = req.query;
    const q = req.query.q ? String(req.query.q).trim() : '';

    const filter = { status: type === 'cancelled' ? 'Cancelled' : 'Completed' };

    if (from || to) {
        if ((from && !isRealDay(from)) || (to && !isRealDay(to))) return fail(res, 400, 'Please use real dates like 2026-10-31');
        if (from && to && from > to) return fail(res, 400, 'The start date is after the end date');
        filter[field] = { ...(from && { $gte: startOfDay(from) }), ...(to && { $lte: endOfDay(to) }) };
    }
    if (q) {
        const re = new RegExp(escapeRegex(q), 'i');
        filter.$or = [{ orderNumber: re }, { 'customer.name': re }, { 'customer.email': re }, { 'customer.phone': re }];
    }

    const [total, amountRows, orders] = await Promise.all([
        Order.countDocuments(filter),
        Order.find(filter).select('total').lean(),
        Order.find(filter).sort({ [field]: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    ]);
    const amountCents = amountRows.reduce((sum, o) => sum + toCents(o.total), 0);

    return res.status(200).json({
        success: true,
        type,
        transactions: orders.map(o => ({
            _id: o._id,
            orderNumber: o.orderNumber,
            source: o.source,
            customer: { name: o.customer && o.customer.name },
            itemsCount: (o.items || []).reduce((sum, i) => sum + i.quantity, 0),
            total: o.total,
            paymentMethod: o.paymentMethod,
            paymentMethodLabel: paymentLabel(o.paymentMethod),
            paymentStatus: o.paymentStatus,
            status: o.status,
            at: o[field],
            cancelReason: o.cancelReason || '',
        })),
        total,
        amount: pesos(amountCents),
        page,
        pages: Math.max(1, Math.ceil(total / limit)),
    });
};