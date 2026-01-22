import mongoose, { Schema, Document } from 'mongoose';

export interface IBillItem {
    name: string;
    price: number;
    quantity?: number;
    category?: string;
}

export interface IBill extends Document {
    id: string; // Custom ID for frontend compatibility
    storeName: string;
    totalAmount: number;
    date: Date;
    items: IBillItem[];
    userId?: string; // Firebase UID
    createdAt: Date;
    updatedAt: Date;
}

const BillItemSchema = new Schema<IBillItem>({
    name: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    quantity: {
        type: Number,
        default: 1
    },
    category: {
        type: String,
        default: 'general'
    }
});

const BillSchema = new Schema<IBill>({
    id: {
        type: String,
        required: true,
        unique: true
    },
    storeName: {
        type: String,
        required: true
    },
    totalAmount: {
        type: Number,
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    items: {
        type: [BillItemSchema],
        required: true,
        default: []
    },
    userId: {
        type: String,
        index: true
    }
}, {
    timestamps: true
});

// Index for faster queries
BillSchema.index({ userId: 1, date: -1 });
BillSchema.index({ id: 1 });

export const Bill = mongoose.model<IBill>('Bill', BillSchema);
