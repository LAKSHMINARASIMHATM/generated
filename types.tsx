
export enum Category {
  Dairy = 'Dairy',
  Bakery = 'Bakery',
  Fruits = 'Fruits',
  Vegetables = 'Vegetables',
  Meat = 'Meat',
  Beverages = 'Beverages',
  Snacks = 'Snacks',
  Household = 'Household',
  Other = 'Other'
}

export interface BillItem {
  name: string;
  price: number;
  quantity: number;
  category: Category;
  mrp?: number;
}

export interface Bill {
  id: string;
  storeName: string;
  totalAmount: number;
  items: BillItem[];
  date: string;
  image?: string;
  parsedText?: string;
}

export interface PriceComparison {
  itemName: string;
  originalPrice: number;
  platforms: {
    name: string;
    price: number;
    url: string;
  }[];
  bestPrice: number;
  bestPlatform: string;
  savings: number;
}

export interface InsightData {
  category: string;
  amount: number;
  percentage: number;
}

export interface MonthlyTrend {
  month: string;
  amount: number;
}
