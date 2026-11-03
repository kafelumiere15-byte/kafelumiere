const fs = require('fs');
const path = require('path');

const UPLOAD_ROOT = path.join(__dirname, '..', 'uploads');

// delete an uploaded image by its public url (e.g. /uploads/products/abc.jpg)
const removeFileByUrl = (url) => {
    if (!url || !url.startsWith('/uploads/')) return;
    const full = path.join(__dirname, '..', url);
    // safety: never delete anything outside the uploads folder
    if (!full.startsWith(UPLOAD_ROOT + path.sep)) return;
    fs.unlink(full, () => { /* ignore "file not found" */ });
};

// delete the files multer just saved (used when validation fails afterwards)
const removeMulterFiles = (files) => {
    (files || []).forEach(file => removeFileByUrl(`/uploads/products/${file.filename}`));
};

// delete every photo of a product (list of { url })
const removeProductImages = (images) => {
    (images || []).forEach(img => removeFileByUrl(img && img.url));
};

module.exports = { removeFileByUrl, removeMulterFiles, removeProductImages };
