// Payment options the shop supports.
// Cash only: the customer pays at the counter when they pick up their order, and the
// cashier records the payment there (Part 8). GCash and Maya were removed - cash only.
const PAYMENT_METHODS = [
    { id: 'cash', label: 'Cash', description: 'Pay in cash at the counter when you pick up your order' },
];

const PAYMENT_METHOD_IDS = PAYMENT_METHODS.map(m => m.id);

const paymentLabel = (id) => {
    const method = PAYMENT_METHODS.find(m => m.id === id);
    return method ? method.label : id;
};

module.exports = { PAYMENT_METHODS, PAYMENT_METHOD_IDS, paymentLabel };