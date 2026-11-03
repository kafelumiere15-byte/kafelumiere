const mongoose = require('mongoose');
const Product = require('../models/product');
const { MAX_PER_ITEM, isOrderable, toCents } = require('../utils/cart');
const { PAYMENT_METHOD_IDS, paymentLabel } = require('../utils/payment');
const { checkPayment } = require('../utils/paymentRules');
const createWithNumber = require('../utils/createWithNumber');
const { NEXT_STATUS } = require('../utils/orderFlow');

const fail = (res, status, message) => res.status(status).json({ success: false, message });
const PHONE = /^(09|\+639)\d{9}$/;

// POST /api/v1/pos/orders   (staff, admin) - the cashier types in an order for a customer standing at the counter
//   { items: [{ productId, quantity }], customerName, customerPhone, note,
//     paymentMethod,                         // used when paying later (default cash)
//     payment: { paymentMethod, amountTendered, reference } }   // optional: take the money right now
exports.createWalkInOrder = async (req, res) => {
    const { items, payment } = req.body;
    const customerName = req.body.customerName ? String(req.body.customerName).trim() : '';
    const customerPhone = req.body.customerPhone ? String(req.body.customerPhone).trim() : '';
    const note = req.body.note ? String(req.body.note).trim() : '';

    if (!Array.isArray(items) || items.length === 0) {
        return fail(res, 400, 'Please add at least one item to the order');
    }
    if (items.length > 50) {
        return fail(res, 400, 'That is too many different items for one order');
    }
    if (customerName.length > 40) return fail(res, 400, 'The customer name cannot exceed 40 characters');
    if (customerPhone && !PHONE.test(customerPhone)) return fail(res, 400, 'Please enter a valid PH mobile number (e.g. 09171234567)');
    if (note.length > 200) return fail(res, 400, 'Note cannot exceed 200 characters');

    // the same product typed twice becomes one line
    const wanted = new Map();
    for (const entry of items) {
        const productId = entry && entry.productId;
        const qty = Number(entry && entry.quantity);
        if (!productId || !mongoose.isValidObjectId(productId)) {
            return fail(res, 400, 'Please choose valid products');
        }
        if (entry.quantity === '' || entry.quantity === null || !Number.isInteger(qty) || qty < 1) {
            return fail(res, 400, 'Quantity must be a whole number of at least 1');
        }
        wanted.set(String(productId), (wanted.get(String(productId)) || 0) + qty);
    }
    for (const qty of wanted.values()) {
        if (qty > MAX_PER_ITEM) return fail(res, 400, `You can order up to ${MAX_PER_ITEM} of the same item`);
    }

    // prices and availability come from the database, never from the browser
    const products = await Product.find({ _id: { $in: [...wanted.keys()] } }).populate('category', 'name isActive');
    const byId = new Map(products.map(p => [String(p._id), p]));

    const problems = [...wanted.keys()]
        .filter(id => !isOrderable(byId.get(id)))
        .map(id => (byId.get(id) ? byId.get(id).name : 'An item that does not exist'));
    if (problems.length > 0) {
        return fail(res, 409, `Some items are not available: ${problems.join(', ')}`);
    }

    let subtotalCents = 0;
    const orderItems = [...wanted.entries()].map(([id, quantity]) => {
        const p = byId.get(id);
        const lineCents = toCents(p.price) * quantity;
        subtotalCents += lineCents;
        return { product: p._id, name: p.name, price: p.price, quantity, lineTotal: lineCents / 100 };
    });
    const total = subtotalCents / 100;

    const method = (payment && payment.paymentMethod) || req.body.paymentMethod || 'cash';
    if (!PAYMENT_METHOD_IDS.includes(method)) {
        return fail(res, 400, 'Please choose a supported payment method');
    }

    // take the money now? (checked BEFORE anything is saved - a wrong amount creates no order)
    let paid = {};
    if (payment) {
        const check = checkPayment(total, { ...payment, paymentMethod: method });
        if (check.error) return fail(res, 400, check.error);
        paid = {
            paymentStatus: 'paid',
            amountTendered: check.amountTendered,
            change: check.change,
            paymentReference: check.reference,
            paidAt: new Date(),
            paidBy: req.user._id,
        };
    }

    // a walk-in order is accepted the moment the cashier types it in, so it starts at "Confirmed"
    const order = await createWithNumber({
        source: 'walk-in',
        customer: { name: customerName || 'Walk-in customer', phone: customerPhone || undefined },
        items: orderItems,
        subtotal: total,
        total,
        paymentMethod: method,
        note,
        status: 'Confirmed',
        statusHistory: [{ status: 'Confirmed', at: new Date(), by: req.user._id }],
        ...paid,
    });

    return res.status(201).json({
        success: true,
        order: { ...order.toObject(), paymentMethodLabel: paymentLabel(order.paymentMethod), nextStatus: NEXT_STATUS[order.status] || null },
    });
};