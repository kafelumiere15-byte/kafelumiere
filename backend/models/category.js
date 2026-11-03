const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please enter the category name'],
        trim: true,
        unique: true,
        maxLength: [40, 'Category name cannot exceed 40 characters']
    },
    description: {
        type: String,
        trim: true,
        default: '',
        maxLength: [200, 'Category description cannot exceed 200 characters']
    },
    // deactivated categories (and their products) are hidden from customers
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
})

module.exports = mongoose.model('Category', categorySchema);    