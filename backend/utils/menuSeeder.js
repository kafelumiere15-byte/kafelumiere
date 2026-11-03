// Run with:  npm run seed:menu
// OPTIONAL sample menu (3 categories + 10 products, no photos) so the shop isn't empty. Safe to run twice.
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', 'config', '.env') });
const mongoose = require('mongoose');
const Category = require('../models/category');
const Product = require('../models/product');
const useReliableDns = require('../config/dns');

const menu = {
    'Coffee': [
        ['Americano', 'Bold espresso with hot water', 95],
        ['Caffè Latte', 'Espresso with steamed milk', 120],
        ['Spanish Latte', 'Sweet and creamy condensed-milk latte', 135],
        ['Caramel Macchiato', 'Vanilla, milk, espresso and caramel drizzle', 145],
    ],
    'Milk Tea': [
        ['Classic Milk Tea', 'Our signature black milk tea', 85],
        ['Wintermelon Milk Tea', 'Sweet wintermelon with creamy milk', 90],
        ['Taro Milk Tea', 'Smooth taro blend', 95, false],
        ['Brown Sugar Boba', 'Fresh milk with brown sugar pearls', 110],
    ],
    'Pastries': [
        ['Butter Croissant', 'Flaky, buttery and baked fresh', 75],
        ['Chocolate Chip Cookie', 'Soft-baked with dark chocolate chunks', 60],
    ],
};

const run = async () => {
    try {
        useReliableDns(process.env.DB_URI);
        await mongoose.connect(process.env.DB_URI);
        for (const [catName, items] of Object.entries(menu)) {
            let cat = await Category.findOne({ name: catName });
            if (!cat) { cat = await Category.create({ name: catName }); console.log(`category created: ${catName}`); }
            for (const [name, description, price, isAvailable = true] of items) {
                if (await Product.findOne({ name })) { console.log(`  skip    ${name}`); continue; }
                await Product.create({ name, description, price, category: cat._id, isAvailable });
                console.log(`  created ${name}${isAvailable ? '' : ' (sold out)'}`);
            }
        }
    } catch (err) {
        console.error('Menu seeding failed:', err.message);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
    }
};
run();