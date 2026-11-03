const mongoose = require('mongoose');
const Order = require('../models/order');
const { ORDER_STATUSES, ACTIVE_STATUSES, PAST_STATUSES } = require('../models/order');
const CartItem = require('../models/cartItem');
const Product = require('../models/product');
const { isOrderable, toCents } = require('../utils/cart');
const { PAYMENT_METHODS, PAYMENT_METHOD_IDS, paymentLabel } = require('../utils/payment');
const createWithNumber = require('../utils/createWithNumber');
const { checkPayment } = require('../utils/paymentRules');
const { NEXT_STATUS, canMove } = require('../utils/orderFlow');
const escapeRegex = require('../utils/escapeRegex');
const { buildReceiptPdf } = require('../utils/receiptPdf');
const { notifyCustomerOfOrder } = require('../utils/orderEmail');

const fail = (res, status, message) => res.status(status).json({ success: false, message });

const serialize = (order) => ({
    ...order.toObject(),
    paymentMethodLabel: paymentLabel(order.paymentMethod),
    nextStatus: NEXT_STATUS[order.status] || null,   // what the "next step" button would do
});

// anything that is not a positive whole number falls back to the default
const positive = (value, fallback) => {
    const n = parseInt(value, 10);
    return Number.isInteger(n) && n > 0 ? n : fallback;
};

// put cart lines back (used when an order could not be completed)
const restoreLines = async (lines) => {
    if (lines.length === 0) return;
    try {
        await CartItem.insertMany(
            lines.map(l => ({ user: l.user, product: l.product, quantity: l.quantity, createdAt: l.createdAt })),
            { ordered: false }
        );
    } catch {
        // best effort: if the customer already re-added something, that is fine
    }
};

// GET /api/v1/payment-methods   (public - the checkout page shows what the shop supports)
exports.getPaymentMethods = async (req, res) => {
    return res.status(200).json({ success: true, paymentMethods: PAYMENT_METHODS });
};

// POST /api/v1/orders   { paymentMethod, note }   (customer) - turns the cart into an order
exports.createOrder = async (req, res) => {
    const { paymentMethod } = req.body;
    const note = req.body.note === undefined || req.body.note === null ? '' : String(req.body.note).trim();

    if (!paymentMethod || !PAYMENT_METHOD_IDS.includes(paymentMethod)) {
        return fail(res, 400, 'Please choose a payment method');
    }
    if (note.length > 200) {
        return fail(res, 400, 'Note cannot exceed 200 characters');
    }

    const userId = req.user._id;
    const lines = await CartItem.find({ user: userId }).sort({ _id: 1 });
    if (lines.length === 0) {
        return fail(res, 400, 'Your cart is empty');
    }

    // prices and availability are checked NOW, on the server - never trusted from the browser
    const products = await Product.find({ _id: { $in: lines.map(l => l.product) } }).populate('category', 'name isActive');
    const byId = new Map(products.map(p => [String(p._id), p]));

    const problems = lines
        .filter(l => !isOrderable(byId.get(String(l.product))))
        .map(l => { const p = byId.get(String(l.product)); return p ? p.name : 'An item that was removed'; });
    if (problems.length > 0) {
        return fail(res, 409, `Some items are no longer available: ${problems.join(', ')}. Please remove them from your cart and try again`);
    }

    let subtotalCents = 0;
    const items = lines.map((l) => {
        const p = byId.get(String(l.product));
        const lineCents = toCents(p.price) * l.quantity;
        subtotalCents += lineCents;
        return { product: p._id, name: p.name, price: p.price, quantity: l.quantity, lineTotal: lineCents / 100 };
    });

    // Take the lines out of the cart one by one, in the same order every time.
    // If two requests (e.g. a double click) race, only one can take every line, so only one order is made.
    const claimed = [];
    for (const line of lines) {
        const removed = await CartItem.deleteOne({ _id: line._id });
        if (removed.deletedCount !== 1) {
            await restoreLines(claimed);
            return fail(res, 409, 'Your cart changed while you were checking out. Please review it and try again');
        }
        claimed.push(line);
    }

    try {
        const order = await createWithNumber({
            source: 'online',
            user: userId,
            customer: { name: req.user.name, email: req.user.email, phone: req.user.phone },
            items,
            subtotal: subtotalCents / 100,
            total: subtotalCents / 100,
            paymentMethod,
            note,
            statusHistory: [{ status: 'Pending', at: new Date(), by: userId }]
        });
        return res.status(201).json({ success: true, order: serialize(order) });
    } catch (err) {
        await restoreLines(claimed);   // nothing was ordered, so the customer keeps their cart
        throw err;
    }
};

// GET /api/v1/orders/:id   customers see only their own orders; staff and admin can see any
exports.getOrder = async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
        return fail(res, 404, 'Order not found');
    }
    const order = await Order.findById(req.params.id);
    const notYours = order && req.user.role === 'customer' && String(order.user) !== String(req.user._id);
    if (!order || notYours) {
        return fail(res, 404, 'Order not found');
    }
    return res.status(200).json({ success: true, order: serialize(order) });
};

// GET /api/v1/orders/mine?status=active|past&page=1&limit=10   (customer) - the customer's own order history
exports.getMyOrders = async (req, res) => {
    const page = positive(req.query.page, 1);
    const limit = Math.min(50, positive(req.query.limit, 10));

    const filter = { user: req.user._id };   // always only THEIR orders
    if (req.query.status === 'active') filter.status = { $in: ACTIVE_STATUSES };
    if (req.query.status === 'past') filter.status = { $in: PAST_STATUSES };

    const total = await Order.countDocuments(filter);
    const orders = await Order.find(filter)
        .sort({ createdAt: -1, _id: -1 })      // newest first
        .skip((page - 1) * limit)
        .limit(limit);

    return res.status(200).json({
        success: true,
        orders: orders.map(serialize),
        total,
        page,
        pages: Math.max(1, Math.ceil(total / limit)),
    });
};

// ------------------------------------------------------------------ STAFF / ADMIN

// GET /api/v1/orders?status=active|past|<one status>&source=online|walk-in&payment=unpaid|paid|refunded
//                   &from=2026-10-01&to=2026-10-31&q=<search>&page=1&limit=10   (staff, admin)
// Waiting orders are listed oldest first (first come, first served); finished ones newest first.
exports.listOrders = async (req, res) => {
    const page = positive(req.query.page, 1);
    const limit = Math.min(50, positive(req.query.limit, 10));
    const { status, source, payment, from, to } = req.query;
    const q = req.query.q ? String(req.query.q).trim() : '';

    const filter = {};
    if (status === 'active') filter.status = { $in: ACTIVE_STATUSES };
    else if (status === 'past') filter.status = { $in: PAST_STATUSES };
    else if (ORDER_STATUSES.includes(status)) filter.status = status;

    if (source === 'online' || source === 'walk-in') filter.source = source;
    if (['unpaid', 'paid', 'refunded'].includes(payment)) filter.paymentStatus = payment;

    // date range: whole days in Philippine time (UTC+8, no daylight saving)
    if (from || to) {
        const DATE = /^\d{4}-\d{2}-\d{2}$/;
        if ((from && !DATE.test(from)) || (to && !DATE.test(to))) {
            return fail(res, 400, 'Please use dates like 2026-10-31');
        }
        const start = from ? new Date(`${from}T00:00:00+08:00`) : null;
        const end = to ? new Date(`${to}T23:59:59.999+08:00`) : null;
        if ((start && Number.isNaN(start.getTime())) || (end && Number.isNaN(end.getTime()))) {
            return fail(res, 400, 'That is not a real date');
        }
        if (start && end && start > end) {
            return fail(res, 400, 'The start date is after the end date');
        }
        filter.createdAt = { ...(start && { $gte: start }), ...(end && { $lte: end }) };
    }

    if (q) {
        const re = new RegExp(escapeRegex(q), 'i');
        filter.$or = [{ orderNumber: re }, { 'customer.name': re }, { 'customer.email': re }, { 'customer.phone': re }];
    }

    const oldestFirst = status === 'active' || ACTIVE_STATUSES.includes(status);
    const total = await Order.countDocuments(filter);
    const orders = await Order.find(filter)
        .sort(oldestFirst ? { createdAt: 1, _id: 1 } : { createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit);

    // numbers for the tabs (all orders, not affected by the search box)
    const perStatus = await Promise.all(ORDER_STATUSES.map(s => Order.countDocuments({ status: s })));
    const counts = Object.fromEntries(ORDER_STATUSES.map((s, i) => [s, perStatus[i]]));
    counts.active = ACTIVE_STATUSES.reduce((sum, s) => sum + counts[s], 0);
    counts.all = perStatus.reduce((sum, n) => sum + n, 0);

    return res.status(200).json({
        success: true,
        orders: orders.map(serialize),
        total,
        page,
        pages: Math.max(1, Math.ceil(total / limit)),
        counts,
    });
};

// PUT /api/v1/orders/:id/status   { status, reason }   (staff, admin)
exports.updateOrderStatus = async (req, res) => {
    const { status } = req.body;
    const reason = req.body.reason === undefined || req.body.reason === null ? '' : String(req.body.reason).trim();

    if (!mongoose.isValidObjectId(req.params.id)) {
        return fail(res, 404, 'Order not found');
    }
    if (!status || !ORDER_STATUSES.includes(status)) {
        return fail(res, 400, 'Please choose a valid status');
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
        return fail(res, 404, 'Order not found');
    }

    if (!canMove(order.status, status)) {
        const message = PAST_STATUSES.includes(order.status)
            ? `This order is already ${order.status} and can no longer be changed`
            : `An order that is ${order.status} cannot be changed to ${status}`;
        return fail(res, 409, message);
    }

    // an order is handed over only after it is paid
    if (status === 'Completed' && order.paymentStatus !== 'paid') {
        return fail(res, 409, 'Record the payment before completing the order');
    }

    if (status === 'Cancelled') {
        if (reason.length < 3) return fail(res, 400, 'Please give a short reason for cancelling the order');
        if (reason.length > 200) return fail(res, 400, 'The reason cannot exceed 200 characters');
    }

    // "change it only if it is STILL in the status we just looked at" - so two staff members
    // pressing buttons at the same moment can never push an order through two steps
    const set = { status };
    if (status === 'Completed') set.completedAt = new Date();
    if (status === 'Cancelled') {
        set.cancelledAt = new Date();
        set.cancelReason = reason;
        if (order.paymentStatus === 'paid') set.paymentStatus = 'refunded';   // the cashier must give the money back
    }
    const result = await Order.updateOne(
        { _id: order._id, status: order.status, paymentStatus: order.paymentStatus },
        { $set: set, $push: { statusHistory: { status, at: new Date(), by: req.user._id } } }
    );
    if (result.matchedCount !== 1) {
        return fail(res, 409, 'This order was just updated by someone else. Please refresh and try again');
    }

    const fresh = await Order.findById(order._id);

    // tell the customer the updated transaction (items, subtotal, grand total + PDF receipt).
    // a failing mail server must not undo the status change, so the error is only logged
    let emailed = false;
    try {
        emailed = await notifyCustomerOfOrder(fresh.toObject());
    } catch (err) {
        console.error(`Could not email the update for ${fresh.orderNumber}:`, err.message);
    }
    return res.status(200).json({ success: true, order: serialize(fresh), emailed });
};

// GET /api/v1/orders/:id/receipt   the PDF receipt (customers: only their own orders; staff and admin: any)
exports.getReceipt = async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
        return fail(res, 404, 'Order not found');
    }
    const order = await Order.findById(req.params.id);
    const notYours = order && req.user.role === 'customer' && String(order.user) !== String(req.user._id);
    if (!order || notYours) {
        return fail(res, 404, 'Order not found');
    }
    const pdf = buildReceiptPdf(order.toObject());
    res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="receipt-${order.orderNumber}.pdf"`,
        'Content-Length': pdf.length,
    });
    return res.status(200).send(pdf);
};

// PUT /api/v1/orders/:id/payment   { paymentMethod, amountTendered, reference }   (staff, admin)
// The cashier records how the customer paid. For cash the change is worked out here.
exports.recordPayment = async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
        return fail(res, 404, 'Order not found');
    }
    const order = await Order.findById(req.params.id);
    if (!order) {
        return fail(res, 404, 'Order not found');
    }
    if (order.status === 'Cancelled') {
        return fail(res, 409, 'A cancelled order cannot be paid');
    }
    if (order.paymentStatus === 'paid') {
        return fail(res, 409, 'This order is already paid');
    }

    // the customer's chosen method is the default, but the cashier can change it ("I will pay cash instead")
    const check = checkPayment(order.total, {
        paymentMethod: req.body.paymentMethod || order.paymentMethod,
        amountTendered: req.body.amountTendered,
        reference: req.body.reference,
    });
    if (check.error) {
        return fail(res, 400, check.error);
    }

    // "mark as paid only if it is STILL unpaid" - two cashiers can never both take the money
    const result = await Order.updateOne(
        { _id: order._id, paymentStatus: 'unpaid', status: { $ne: 'Cancelled' } },
        {
            $set: {
                paymentStatus: 'paid',
                paymentMethod: check.method,
                amountTendered: check.amountTendered,
                change: check.change,
                paymentReference: check.reference,
                paidAt: new Date(),
                paidBy: req.user._id,
            },
        }
    );
    if (result.matchedCount !== 1) {
        return fail(res, 409, 'This order was just updated by someone else. Please refresh and try again');
    }

    const fresh = await Order.findById(order._id);
    return res.status(200).json({ success: true, order: serialize(fresh) });
};