import { Request, Response } from 'express';
import { PlatformConnection } from '../../models/PlatformConnection.model';
import { OAuthSimulatorService } from '../../services/oauth-simulator.service';

/**
 * Initiate OAuth connection for a platform
 */
export const initiateConnection = async (req: Request, res: Response) => {
    try {
        const { platform } = req.params;
        const userId = req.body.userId || req.query.userId; // Firebase UID

        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        if (!OAuthSimulatorService.isValidPlatform(platform)) {
            return res.status(400).json({ error: 'Invalid platform' });
        }

        // Generate OAuth URL
        const { url, state } = OAuthSimulatorService.generateAuthUrl(platform, userId);

        // Store state in session or temporary storage (for production, use Redis)
        // For now, we'll include it in the URL and validate on callback

        res.json({
            authUrl: url,
            state,
            platform
        });
    } catch (error: any) {
        console.error('Initiate connection error:', error);
        res.status(500).json({ error: error.message || 'Failed to initiate connection' });
    }
};

/**
 * Handle OAuth callback
 */
export const handleCallback = async (req: Request, res: Response) => {
    try {
        const { code, state, platform, user_id, email } = req.query;

        if (!code || !state || !platform || !user_id) {
            return res.status(400).json({ error: 'Missing required parameters' });
        }

        // In production, validate state token against stored value
        // For simulation, we'll proceed

        // Generate tokens
        const tokens = OAuthSimulatorService.generateTokens();
        const encryptedTokens = OAuthSimulatorService.encryptTokens(tokens);

        // Simulate fetching user info from platform
        const userInfo = await OAuthSimulatorService.simulateUserInfo(
            platform as string,
            email as string || `user@${platform}.com`
        );

        // Check if connection already exists
        const existingConnection = await PlatformConnection.findOne({
            userId: user_id as string,
            platform: platform as string
        });

        if (existingConnection) {
            // Update existing connection
            existingConnection.accessToken = encryptedTokens.accessToken;
            existingConnection.refreshToken = encryptedTokens.refreshToken;
            existingConnection.expiresAt = tokens.expiresAt;
            existingConnection.lastUsed = new Date();
            existingConnection.isActive = true;
            existingConnection.email = userInfo.email;
            existingConnection.displayName = userInfo.displayName;
            await existingConnection.save();
        } else {
            // Create new connection
            await PlatformConnection.create({
                userId: user_id,
                platform,
                platformUserId: userInfo.platformUserId,
                accessToken: encryptedTokens.accessToken,
                refreshToken: encryptedTokens.refreshToken,
                email: userInfo.email,
                displayName: userInfo.displayName,
                expiresAt: tokens.expiresAt,
                metadata: {
                    accountType: userInfo.accountType
                }
            });
        }

        // Redirect back to frontend
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
        res.redirect(`${frontendUrl}/profile?connected=${platform}&success=true`);
    } catch (error: any) {
        console.error('OAuth callback error:', error);
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
        res.redirect(`${frontendUrl}/profile?error=${encodeURIComponent(error.message)}`);
    }
};

/**
 * Get user's platform connections
 */
export const getConnections = async (req: Request, res: Response) => {
    try {
        const { userId } = req.query;

        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        const connections = await PlatformConnection.find({
            userId: userId as string,
            isActive: true
        }).select('-accessToken -refreshToken'); // Don't send tokens to frontend

        res.json({ connections });
    } catch (error: any) {
        console.error('Get connections error:', error);
        res.status(500).json({ error: error.message || 'Failed to fetch connections' });
    }
};

/**
 * Disconnect a platform
 */
export const disconnectPlatform = async (req: Request, res: Response) => {
    try {
        const { platform } = req.params;
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        const connection = await PlatformConnection.findOne({
            userId,
            platform
        });

        if (!connection) {
            return res.status(404).json({ error: 'Connection not found' });
        }

        // Soft delete - mark as inactive
        connection.isActive = false;
        await connection.save();

        res.json({ message: 'Platform disconnected successfully', platform });
    } catch (error: any) {
        console.error('Disconnect platform error:', error);
        res.status(500).json({ error: error.message || 'Failed to disconnect platform' });
    }
};
