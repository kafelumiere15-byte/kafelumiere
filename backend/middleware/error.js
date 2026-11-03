// Express 5 forwards errors from async handlers here automatically.
module.exports = (err, req, res, next) => {
    let statusCode = err.statusCode || 500;
    let message = err.message || 'Internal Server Error';

    // Mongoose validation errors -> list the messages
    if (err.name === 'ValidationError') {
        statusCode = 400;
        message = Object.values(err.errors).map(e => e.message).join('. ');
    }
    // Duplicate key (e.g. same email)
    if (err.code === 11000) {
        statusCode = 409;
        const field = Object.keys(err.keyValue || {})[0] || 'value';
        message = `An account with this ${field} already exists`;
    }
    // Image upload problems (multer)
    if (err.code === 'LIMIT_FILE_SIZE') {
        statusCode = 400;
        message = 'Each image must be 2MB or smaller';
    } else if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') {
        statusCode = 400;
        message = 'That is too many photos to upload at once. Please upload them in a few smaller batches';
    } else if (err.name === 'MulterError') {
        statusCode = 400;
        message = `Upload error: ${err.message}`;
    }
    // Bad ObjectId
    if (err.name === 'CastError') {
        statusCode = 400;
        message = `Invalid ${err.path}: ${err.value}`;
    }

    if (process.env.NODE_ENV === 'DEVELOPMENT' && statusCode === 500) console.error(err)

    res.status(statusCode).json({ success: false, message });
}