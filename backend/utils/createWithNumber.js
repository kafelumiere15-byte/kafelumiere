const Order = require('../models/order');
const { generateOrderNumber } = require('./orderNumber');

// the order number is random; in the very rare case two collide the unique index says so and we pick another
const createWithNumber = async (data) => {
    for (let attempt = 0; attempt < 5; attempt++) {
        try {
            return await Order.create({ ...data, orderNumber: generateOrderNumber() });
        } catch (err) {
            if (err.code !== 11000) throw err;
        }
    }
    throw new Error('Could not create an order number. Please try again');
};

module.exports = createWithNumber;