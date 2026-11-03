// TEMPORARY DEV TOOL (until staff get their own screen in Part 7):
// change the status of an order so you can watch the customer's tracker move.
//
//   npm run order:status -- KL-261014-7Q3K "Preparing"
//
// Statuses: Pending, Confirmed, Preparing, Ready for Pickup, Completed, Cancelled
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', 'config', '.env') });
const mongoose = require('mongoose');
const Order = require('../models/order');
const { ORDER_STATUSES } = require('../models/order');
const useReliableDns = require('../config/dns');

const run = async () => {
    const [numberArg, ...statusParts] = process.argv.slice(2);
    const statusArg = statusParts.join(' ').trim();

    const status = ORDER_STATUSES.find(s => s.toLowerCase() === statusArg.toLowerCase());
    if (!numberArg || !status) {
        console.error('Usage:  npm run order:status -- <ORDER NUMBER> "<STATUS>"');
        console.error(`Status must be one of: ${ORDER_STATUSES.join(', ')}`);
        process.exitCode = 1;
        return;
    }

    try {
        useReliableDns(process.env.DB_URI);
        await mongoose.connect(process.env.DB_URI);
        const order = await Order.findOne({ orderNumber: numberArg.trim().toUpperCase() });
        if (!order) {
            console.error(`No order with the number ${numberArg}`);
            process.exitCode = 1;
            return;
        }
        order.status = status;
        order.statusHistory.push({ status, at: new Date() });
        if (status === 'Completed') order.completedAt = new Date();
        if (status === 'Cancelled') order.cancelledAt = new Date();
        await order.save();
        console.log(`${order.orderNumber} is now: ${status}`);
    } catch (err) {
        console.error('Failed:', err.message);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
    }
};
run();