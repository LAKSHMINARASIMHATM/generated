import { Router } from 'express';
import {
    initiateConnection,
    handleCallback,
    getConnections,
    disconnectPlatform
} from './platforms.controller';

const router = Router();

// Initiate OAuth connection
router.post('/connect/:platform', (req, res, next) => {
    console.log(`🔌 Connect request for platform: ${req.params.platform}`);
    next();
}, initiateConnection);

// OAuth callback
router.get('/callback', (req, res, next) => {
    console.log('↩️ OAuth callback received');
    next();
}, handleCallback);

// Get user's connections
router.get('/connections', getConnections);

// Disconnect platform
router.delete('/:platform/disconnect', disconnectPlatform);

export default router;
