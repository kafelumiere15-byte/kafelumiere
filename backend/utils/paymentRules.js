const { PAYMENT_METHOD_IDS } = require('./payment');
const { toCents } = require('./cart');

const MAX_RECEIVED = 1000000;   // pesos - protects against a typo like an extra zero

const peso = (cents) => `₱${(cents / 100).toFixed(2)}`;

// Checks a payment the cashier typed in and works out the change. All money is added in CENTAVOS.
//   total  - what the customer must pay (pesos)
//   input  - { paymentMethod, amountTendered, reference }
// returns { error } or { method, amountTendered, change, reference }
const checkPayment = (total, input = {}) => {
    const method = input.paymentMethod;
    if (!PAYMENT_METHOD_IDS.includes(method)) {
        return { error: 'Please choose a payment method' };
    }

    const reference = input.reference === undefined || input.reference === null ? '' : String(input.reference).trim();
    if (reference.length > 40) {
        return { error: 'The reference number cannot exceed 40 characters' };
    }

    const totalCents = toCents(total);

    if (method === 'cash') {
        const raw = input.amountTendered;
        if (raw === undefined || raw === null || String(raw).trim() === '' || !Number.isFinite(Number(raw))) {
            return { error: 'Please enter the amount received' };
        }
        const cents = Number(raw) * 100;
        if (Math.abs(cents - Math.round(cents)) > 1e-6) {
            return { error: 'The amount can have at most 2 decimal places' };
        }
        const receivedCents = Math.round(cents);
        if (receivedCents > MAX_RECEIVED * 100) {
            return { error: 'That amount is too large. Please check it' };
        }
        if (receivedCents < totalCents) {
            return { error: `The amount received is ${peso(totalCents - receivedCents)} short of the total` };
        }
        return { method, amountTendered: receivedCents / 100, change: (receivedCents - totalCents) / 100, reference: '' };
    }

    // GCash / Maya: the exact total was paid, so there is no change; the reference number is optional
    return { method, amountTendered: totalCents / 100, change: 0, reference };
};

module.exports = { checkPayment, MAX_RECEIVED };