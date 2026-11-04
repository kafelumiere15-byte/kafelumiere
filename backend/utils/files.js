const cloudinary = require('./cloudinary');

// delete an uploaded image from Cloudinary by its public_id (stored as "filename" on the product)
const removeFileByPublicId = (publicId) => {
    if (!publicId) return;
    cloudinary.uploader.destroy(publicId, () => { /* ignore "not found" */ });
};

// delete the files multer/Cloudinary just saved (used when validation fails afterwards)
const removeMulterFiles = (files) => {
    (files || []).forEach(file => removeFileByPublicId(file.filename));
};

// delete every photo of a product (list of { filename, url })
const removeProductImages = (images) => {
    (images || []).forEach(img => removeFileByPublicId(img && img.filename));
};

module.exports = { removeFileByPublicId, removeMulterFiles, removeProductImages };
