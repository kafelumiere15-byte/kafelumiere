const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name: {
        type: String,
        trim: true,
        default: 'Customer'
    },
    rating: {
        type: Number,
        required: [true, 'Please give a rating'],
        min: [1, 'Rating must be at least 1 star'],
        max: [5, 'Rating cannot be more than 5 stars']
    },
    comment: {
        type: String,
        trim: true,
        required: [true, 'Please write a comment'],
        maxLength: [500, 'Comment cannot exceed 500 characters']
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please enter the product name'],
        trim: true,
        maxLength: [80, 'Product name cannot exceed 80 characters']
    },
    description: {
        type: String,
        trim: true,
        default: '',
        maxLength: [500, 'Product description cannot exceed 500 characters']
    },
    price: {
        type: Number,
        required: [true, 'Please enter the product price'],
        min: [0, 'Price cannot be negative'],
        max: [100000, 'Price is too high']
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: [true, 'Please select a category']
    },
    // several photos per product (max 5). "image" below is the old single-photo field, kept so older data still shows.
    images: {
        type: [{
            _id: false,
            filename: String,
            url: String            // e.g. /uploads/products/1699999999-ab12cd.jpg
        }],
        default: []
    },
    image: {
        filename: String,
        url: String
    },
    // average of all review ratings (0 when there are none), kept up to date by the review endpoints
    ratings: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
    },
    numOfReviews: {
        type: Number,
        default: 0,
        min: 0
    },
    // one review per customer (updating replaces the old text and stars). Written only by customers who completed an order for this item.
    reviews: {
        type: [reviewSchema],
        default: []
    },
    // isAvailable = temporarily sold out (still shown to customers, but marked unavailable)
    isAvailable: {
        type: Boolean,
        default: true
    },
    // isActive = on the menu at all (false = deactivated / hidden from customers)
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
})

module.exports = mongoose.model('Product', productSchema);