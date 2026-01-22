
import { app } from './app';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

// Import models to ensure they are registered
import './models/PlatformConnection.model';
import './models/Bill.model';

dotenv.config();

const PORT = process.env.PORT || 8000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smartspend';

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
    .then(() => {
        console.log('✅ MongoDB connected successfully');
        console.log(`📊 Database: ${MONGODB_URI}`);
    })
    .catch((error) => {
        console.error('❌ MongoDB connection error:', error.message);
        console.log('⚠️  Server will continue without MongoDB. Platform connections will not work.');
    });

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});

export default app;
