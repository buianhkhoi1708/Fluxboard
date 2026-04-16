require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./src/common/config/db');
const errorHandler = require('./src/common/middlewares/error.middleware');

const app = express();

connectDB();

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.get('/api/v1/health-check', (req, res) => {
    res.status(200).json({ status: 'UP', message: 'FluxBoard Node.js Backend is running' });
});

app.use('/api/v1/auth', require('./src/modules/auth/routes/auth.routes'));
app.use('/api/v1/users', require('./src/modules/user/routes/user.routes'));
app.use('/api/v1/rbac', require('./src/modules/rbac/routes/rbac.routes'));
app.use('/api/v1/boards', require('./src/modules/board/routes/board.routes'));
app.use('/api/v1/ai', require('./src/modules/ai/routes/ai.routes'));

app.use(errorHandler);

const PORT = process.env.SERVER_PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});