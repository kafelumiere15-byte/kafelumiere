const path = require('path');
// Load env FIRST (works no matter which folder you run the command from)
require('dotenv').config({ path: path.join(__dirname, 'config', '.env') });

const app = require('./app');
const connectDatabase = require('./config/database');
const backfillOrderDates = require('./utils/backfillOrderDates');

// Connect to MongoDB first; only start listening once the database is ready
const start = async () => {
    await connectDatabase();

    // orders finished before sales reports existed get their completion date (does nothing the next time)
    try {
        const fixed = await backfillOrderDates();
        if (fixed > 0) console.log(`Filled in the completion date of ${fixed} older order(s)`);
    } catch (err) {
        console.error('Could not fill in old order dates:', err.message);
    }

    app.listen(process.env.PORT, () => {
        console.log(`server started on port: ${process.env.PORT} in ${process.env.NODE_ENV} mode`);
    });
};

start();