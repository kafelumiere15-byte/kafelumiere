// Shared cart rules (also reused by "Place Order" in Part 5)

const firstPhoto = (product) => {
    const photo = (product.images && product.images[0]) || product.image;
    return photo && photo.url ? { url: photo.url } : null;
};

const MAX_PER_ITEM = 20;   // most of the same drink/item in one cart

// money is added up in CENTAVOS (whole numbers) so we never get 0.1 + 0.2 = 0.30000000000000004
const toCents = (amount) => Math.round(Number(amount) * 100);

// a product can be bought only if it is on the menu, in stock, and its category is active
const isOrderable = (product) =>
    Boolean(product && product.isActive && product.isAvailable && product.category && product.category.isActive);

const issueFor = (product) => {
    if (!product.isActive || !product.category || !product.category.isActive) return 'No longer on the menu';
    if (!product.isAvailable) return 'Currently sold out';
    return null;
};

// Turns the stored cart (product ids + quantities) into what the screen needs,
// using the CURRENT price and availability of every product.
//   items          - the products must be loaded, with category { name, isActive }
//   productsById   - Map of productId -> product
const buildCartView = (items, productsById) => {
    let subtotalCents = 0;
    let itemCount = 0;
    let hasUnavailable = false;

    const lines = items.map((item) => {
        const product = productsById.get(String(item.product));
        const orderable = isOrderable(product);
        const lineCents = toCents(product.price) * item.quantity;

        if (orderable) {
            subtotalCents += lineCents;
            itemCount += item.quantity;
        } else {
            hasUnavailable = true;
        }

        return {
            product: {
                _id: product._id,
                name: product.name,
                price: product.price,
                image: firstPhoto(product),
                isAvailable: product.isAvailable,
                category: product.category ? { _id: product.category._id, name: product.category.name } : null,
            },
            quantity: item.quantity,
            unitPrice: product.price,
            lineTotal: lineCents / 100,
            orderable,
            issue: issueFor(product),
        };
    });

    return {
        items: lines,
        itemCount,                       // drinks/items you can actually order (badge number)
        subtotal: subtotalCents / 100,
        total: subtotalCents / 100,      // pick-up shop: no delivery fee or tax, so total = subtotal
        hasUnavailable,                  // true -> the customer must remove those lines before checkout
        maxPerItem: MAX_PER_ITEM,
    };
};

module.exports = { MAX_PER_ITEM, toCents, isOrderable, issueFor, buildCartView };