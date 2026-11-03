const mongoose = require('mongoose');
const useReliableDns = require('./dns');

// hide the password when printing the URI
const maskUri = (uri = '') => uri.replace(/\/\/([^:@/]+):([^@]+)@/, '//$1:****@');

const hintsFor = (uri, message = '') => {
    if (message.includes('querySrv') && !message.includes('ENOTFOUND')) {
        return [
            'Your network/DNS is refusing the Atlas (SRV) lookup. Try:',
            '  1. Change Windows DNS to 8.8.8.8 / 1.1.1.1, then run: ipconfig /flushdns',
            '  2. Or switch network (e.g. phone hotspot) to confirm it is your ISP/router DNS',
            '  3. Or turn off VPN / antivirus web shield, if you use one',
        ];
    }
    const isAtlas = uri.startsWith('mongodb+srv://') || uri.includes('mongodb.net');
    if (isAtlas) {
        return [
            'Looks like MongoDB Atlas. Check:',
            '  1. Atlas > Network Access: add your IP (or 0.0.0.0/0 for school/dev use)',
            '  2. Atlas > Database Access: the user + password in DB_URI are correct',
            '  3. Special characters in the password must be URL-encoded (@ -> %40, # -> %23)',
            '  4. You replaced <password> and the placeholder text in the URI',
        ];
    }
    return [
        'Looks like a LOCAL MongoDB. Check:',
        '  1. MongoDB is installed AND running (Windows: Services > "MongoDB Server" > Start)',
        '  2. Nothing else is blocking port 27017',
        '  3. No MongoDB installed? Use a free MongoDB Atlas cluster instead and paste its',
        '     connection string into DB_URI in backend/config/.env',
    ];
};

const connectDatabase = async () => {
    const uri = process.env.DB_URI;

    if (!uri) {
        console.error('DB_URI is missing. Create backend/config/.env (copy config/.env.example) and set DB_URI.');
        process.exit(1);
    }

    useReliableDns(uri);

    try {
        const con = await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
        console.log(`MongoDB Database connected with HOST: ${con.connection.host}`);
    } catch (err) {
        console.error('\nCould not connect to MongoDB.');
        console.error(`  DB_URI : ${maskUri(uri)}`);
        console.error(`  Reason : ${err.message}\n`);
        hintsFor(uri, err.message).forEach(line => console.error(line));
        console.error('\nAfter fixing it, type  rs  then Enter in this terminal to restart.\n');
        process.exit(1);
    }
};

module.exports = connectDatabase