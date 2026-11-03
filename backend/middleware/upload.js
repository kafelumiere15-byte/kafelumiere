const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'products');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };
// a product's photo count is NOT limited; this is only a technical ceiling so a mistaken
// upload of thousands of files at once can't take the server down
const TECHNICAL_CEILING = 500;

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${EXT[file.mimetype]}`);
    }
});

const fileFilter = (req, file, cb) => {
    if (EXT[file.mimetype]) return cb(null, true);
    const err = new Error('Only JPG, PNG or WEBP images are allowed');
    err.statusCode = 400;
    cb(err);
};

// several photos: the form field must be named "images"; no product-facing limit on how many, 2 MB each
module.exports = multer({ storage, fileFilter, limits: { fileSize: 2 * 1024 * 1024, files: TECHNICAL_CEILING } }).array('images', TECHNICAL_CEILING);