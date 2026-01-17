import { encryptToken, decryptToken, generateRandomToken, generateStateToken } from '../utils/encryption';

interface OAuthTokens {
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
}

interface PlatformConfig {
    name: string;
    color: string;
    icon: string;
}

const PLATFORMS: Record<string, PlatformConfig> = {
    amazon: { name: 'Amazon', color: '#FF9900', icon: '📦' },
    flipkart: { name: 'Flipkart', color: '#2874F0', icon: '🛒' },
    bigbasket: { name: 'BigBasket', color: '#84C225', icon: '🥬' },
    jiomart: { name: 'JioMart', color: '#0066CC', icon: '🏪' },
    blinkit: { name: 'Blinkit', color: '#F8CB46', icon: '⚡' }
};

export class OAuthSimulatorService {
    /**
     * Generate authorization URL for platform
     */
    static generateAuthUrl(platform: string, userId: string): { url: string; state: string } {
        const state = generateStateToken();
        const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

        // Simulated OAuth authorization URL
        const authUrl = `${baseUrl}/oauth/authorize?` +
            `platform=${platform}&` +
            `state=${state}&` +
            `user_id=${userId}&` +
            `redirect_uri=${encodeURIComponent(`${process.env.BACKEND_URL || 'http://localhost:8000'}/api/v1/platforms/callback`)}`;

        return { url: authUrl, state };
    }

    /**
     * Generate mock OAuth tokens
     */
    static generateTokens(): OAuthTokens {
        const accessToken = `access_${generateRandomToken(32)}`;
        const refreshToken = `refresh_${generateRandomToken(32)}`;
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

        return {
            accessToken,
            refreshToken,
            expiresAt
        };
    }

    /**
     * Encrypt tokens for storage
     */
    static encryptTokens(tokens: OAuthTokens): { accessToken: string; refreshToken: string } {
        return {
            accessToken: encryptToken(tokens.accessToken),
            refreshToken: encryptToken(tokens.refreshToken)
        };
    }

    /**
     * Decrypt tokens from storage
     */
    static decryptTokens(encryptedTokens: { accessToken: string; refreshToken: string }): { accessToken: string; refreshToken: string } {
        return {
            accessToken: decryptToken(encryptedTokens.accessToken),
            refreshToken: decryptToken(encryptedTokens.refreshToken)
        };
    }

    /**
     * Simulate fetching user info from platform
     */
    static async simulateUserInfo(platform: string, email: string): Promise<{
        platformUserId: string;
        email: string;
        displayName: string;
        accountType: string;
    }> {
        const platformConfig = PLATFORMS[platform] || PLATFORMS.amazon;

        return {
            platformUserId: `${platform}_${generateRandomToken(8)}`,
            email: email,
            displayName: email.split('@')[0],
            accountType: 'premium'
        };
    }

    /**
     * Get platform configuration
     */
    static getPlatformConfig(platform: string): PlatformConfig {
        return PLATFORMS[platform] || PLATFORMS.amazon;
    }

    /**
     * Validate platform name
     */
    static isValidPlatform(platform: string): boolean {
        return platform in PLATFORMS;
    }
}
