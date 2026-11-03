const path = require('path');
const express = require('express');
const app = express();
const cors = require('cors');
const auth = require('./routes/auth');
const category = require('./routes/category');
const product = require('./routes/product');
const admin = require('./routes/admin');
const cart = require('./routes/cart');
const order = require('./routes/order');
const pos = require('./routes/pos');
const user = require('./routes/user');
const report = require('./routes/report');
const errorMiddleware = require('./middleware/error');

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// uploaded product images are served from here:  http://localhost:4001/uploads/products/<file>
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/api/v1/health', (req, res) => res.status(200).json({ success: true, message: 'Kafé Lumière API is running' }));
app.use('/api/v1', auth);
app.use('/api/v1', category);
app.use('/api/v1', product);
app.use('/api/v1', admin);
app.use('/api/v1', cart);
app.use('/api/v1', order);
app.use('/api/v1', pos);
app.use('/api/v1', user);
app.use('/api/v1', report);

// 404 for unknown routes
app.use((req, res) => res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` }));
// Central error handler (must be last)
app.use(errorMiddleware);

module.exports = app