const { ACTIVE_STATUSES } = require('../models/order');

// The only way forward. Staff move an order ONE step at a time, so the history always tells the truth.
const NEXT_STATUS = {
    'Pending': 'Confirmed',
    'Confirmed': 'Preparing',
    'Preparing': 'Ready for Pickup',
    'Ready for Pickup': 'Completed',
};

// allowed moves: the next step, or Cancelled from any order that is not finished yet
const canMove = (from, to) => (to === 'Cancelled' ? ACTIVE_STATUSES.includes(from) : NEXT_STATUS[from] === to);

module.exports = { NEXT_STATUS, canMove };