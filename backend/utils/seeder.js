// Run with:  npm run seed
// Creates the first Admin and Staff accounts (customers register by themselves).
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', 'config', '.env') });
const mongoose = require('mongoose');
const User = require('../models/user');
const useReliableDns = require('../config/dns');

const accounts = [
    { name: 'Shop Admin', email: 'admin@kafelumiere.com', password: 'admin123', role: 'admin' },
    { name: 'Staff Cashier', email: 'staff@kafelumiere.com', password: 'staff123', role: 'staff' },
];

const seed = async () => {
    try {
        useReliableDns(process.env.DB_URI);
        await mongoose.connect(process.env.DB_URI);
        for (const acc of accounts) {
            const exists = await User.findOne({ email: acc.email });
            if (exists) {
                console.log(`skip    ${acc.role.padEnd(6)} ${acc.email} (already exists)`);
                continue;
            }
            await User.create(acc);
            console.log(`created ${acc.role.padEnd(6)} ${acc.email}  password: ${acc.password}`);
        }
    } catch (err) {
        console.error('Seeding failed:', err.message);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
    }
};
seed();