
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import router from './routes';
import { errorMiddleware } from './middleware/error.middleware';

export const app = express();

app.use(helmet());
app.use(cors({
    origin: true, // Allow all origins
    credentials: true
}));
app.use(express.json({ limit: '50mb' }) as any);
app.use(express.urlencoded({ extended: true, limit: '50mb' }) as any);

app.use('/api/v1', router);

// Handle 404 routes
app.use((req, res) => {
    res.status(404).json({
        error: 'Not Found',
        path: req.originalUrl,
        method: req.method
    });
});

app.use(errorMiddleware as any);

export default app;
