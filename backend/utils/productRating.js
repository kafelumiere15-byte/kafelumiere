// Recalculates the review count and the average star rating of a product (1 decimal place).
const recalcRatings = (product) => {
    const count = product.reviews.length;
    const sum = product.reviews.reduce((total, review) => total + review.rating, 0);
    product.numOfReviews = count;
    product.ratings = count ? Math.round((sum / count) * 10) / 10 : 0;
    return product;
};

module.exports = recalcRatings;
