const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../utils/cloudinary');

const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
// a product's photo count is NOT limited; this is only a technical ceiling so a mistaken
// upload of thousands of files at once can't take the server down
const TECHNICAL_CEILING = 500;

// photos are uploaded straight to Cloudinary (not saved to the server's own disk), because
// Render's free-tier disk is wiped on every deploy/restart, which was deleting product photos
const storage = new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => ({
        folder: 'kafe-lumiere/products',
        format: EXT[file.mimetype],
        public_id: `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`,
    }),
});

const fileFilter = (req, file, cb) => {
    if (EXT[file.mimetype]) return cb(null, true);
    const err = new Error('Only JPG, PNG or WEBP images are allowed');
    err.statusCode = 400;
    cb(err);
};

// several photos: the form field must be named "images"; no product-facing limit on how many, 2 MB each
module.exports = multer({ storage, fileFilter, limits: { fileSize: 2 * 1024 * 1024, files: TECHNICAL_CEILING } }).array('images', TECHNICAL_CEILING);
