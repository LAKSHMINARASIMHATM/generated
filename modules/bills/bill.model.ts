import { BillItem } from '../../types.tsx';

export interface Bill {
  id: string;
  userId: string;
  storeName: string;
  totalAmount: number;
  items: BillItem[];
  date: string;
  image?: string;
  createdAt: string;
}