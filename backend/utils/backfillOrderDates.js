// Orders that were completed / cancelled BEFORE Part 10 have no completedAt / cancelledAt.
// This fills them in from the order's own history (safe to run any number of times).
// The server runs it at start-up; you can also run it by hand:  node utils/backfillOrderDates.js
const Order = require('../models/order');

const timeOf = (order, status) => {
    const entry = [...(order.statusHistory || [])].reverse().find(h => h.status === status);
    return (entry && entry.at) || order.createdAt || new Date();
};

const backfillOrderDates = async () => {
    let fixed = 0;
    for (const [status, field] of [['Completed', 'completedAt'], ['Cancelled', 'cancelledAt']]) {
        const missing = await Order.find({ status, [field]: { $exists: false } }).select('statusHistory createdAt');
        for (const order of missing) {
            await Order.updateOne({ _id: order._id, [field]: { $exists: false } }, { $set: { [field]: timeOf(order, status) } });
            fixed += 1;
        }
    }
    return fixed;
};

module.exports = backfillOrderDates;

if (require.main === module) {
    const path = require('path');
    require('dotenv').config({ path: path.join(__dirname, '..', 'config', '.env') });
    const mongoose = require('mongoose');
    const useReliableDns = require('../config/dns');
    (async () => {
        try {
            useReliableDns(process.env.DB_URI);
            await mongoose.connect(process.env.DB_URI);
            console.log(`Filled in the dates of ${await backfillOrderDates()} order(s)`);
        } catch (err) {
            console.error('Failed:', err.message);
            process.exitCode = 1;
        } finally {
            await mongoose.disconnect();
        }
    })();
}