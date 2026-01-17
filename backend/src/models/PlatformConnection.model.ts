import mongoose, { Schema, Document } from 'mongoose';

export interface IPlatformConnection extends Document {
    userId: string; // Firebase UID
    platform: 'amazon' | 'flipkart' | 'bigbasket' | 'jiomart' | 'blinkit';
    platformUserId: string;
    accessToken: string; // Encrypted
    refreshToken: string; // Encrypted
    email: string;
    displayName: string;
    connectedAt: Date;
    lastUsed: Date;
    expiresAt: Date;
    isActive: boolean;
    metadata: {
        accountType?: string;
        preferences?: any;
    };
}

const PlatformConnectionSchema = new Schema<IPlatformConnection>({
    userId: {
        type: String,
        required: true,
        index: true
    },
    platform: {
        type: String,
        required: true,
        enum: ['amazon', 'flipkart', 'bigbasket', 'jiomart', 'blinkit']
    },
    platformUserId: {
        type: String,
        required: true
    },
    accessToken: {
        type: String,
        required: true
    },
    refreshToken: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    displayName: {
        type: String,
        required: true
    },
    connectedAt: {
        type: Date,
        default: Date.now
    },
    lastUsed: {
        type: Date,
        default: Date.now
    },
    expiresAt: {
        type: Date,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    metadata: {
        type: Schema.Types.Mixed,
        default: {}
    }
}, {
    timestamps: true
});

// Compound index for unique user-platform combinations
PlatformConnectionSchema.index({ userId: 1, platform: 1 }, { unique: true });

export const PlatformConnection = mongoose.model<IPlatformConnection>('PlatformConnection', PlatformConnectionSchema);
