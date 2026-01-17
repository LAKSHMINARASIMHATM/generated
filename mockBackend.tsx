import { Bill, Category } from './types.tsx';

// Simulating the database using LocalStorage
const STORAGE_KEYS = {
  BILLS: 'smartspend_bills',
  USER: 'smartspend_user',
  AUTH_TOKEN: 'smartspend_token'
};

export const mockBackend = {
  auth: {
    login: async (email: string) => {
      const user = { id: 'u1', name: 'Thrifty Futurist', email };
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
      localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, 'mock_jwt_token');
      return user;
    },
    signup: async (name: string, email: string) => {
      const user = { id: 'u1', name, email };
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
      localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, 'mock_jwt_token');
      return user;
    },
    logout: () => {
      localStorage.removeItem(STORAGE_KEYS.USER);
      localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    },
    getMe: () => {
      const user = localStorage.getItem(STORAGE_KEYS.USER);
      return user ? JSON.parse(user) : null;
    },
    updateProfile: (name: string, email: string) => {
      const user = mockBackend.auth.getMe();
      if (user) {
        const updated = { ...user, name, email };
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updated));
        return updated;
      }
      return null;
    },
    updatePassword: (currentPassword: string, newPassword: string) => {
      // Mock password validation - in real app, this would verify against stored hash
      if (currentPassword.length < 6 || newPassword.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }
      // In mock backend, we just return success
      return { success: true, message: 'Password updated successfully' };
    },
    getNotificationSettings: () => {
      const settings = localStorage.getItem('smartspend_notifications');
      return settings ? JSON.parse(settings) : {
        offerAlerts: true,
        monthlySummaries: true,
        priceDrops: true,
        weeklyDigest: false
      };
    },
    updateNotificationSettings: (settings: any) => {
      localStorage.setItem('smartspend_notifications', JSON.stringify(settings));
      return settings;
    },
    getLinkedPlatforms: () => {
      const platforms = localStorage.getItem('smartspend_platforms');
      return platforms ? JSON.parse(platforms) : [
        { id: 'amazon', name: 'Amazon', connected: false },
        { id: 'flipkart', name: 'Flipkart', connected: false },
        { id: 'bigbasket', name: 'BigBasket', connected: false },
        { id: 'jiomart', name: 'JioMart', connected: false },
        { id: 'blinkit', name: 'Blinkit', connected: false }
      ];
    },
    updateLinkedPlatforms: (platforms: any[]) => {
      localStorage.setItem('smartspend_platforms', JSON.stringify(platforms));
      return platforms;
    }
  },

  bills: {
    getAll: (): Bill[] => {
      const bills = localStorage.getItem(STORAGE_KEYS.BILLS);
      return bills ? JSON.parse(bills) : [];
    },
    save: (bill: Bill) => {
      const bills = mockBackend.bills.getAll();
      const updated = [bill, ...bills];
      localStorage.setItem(STORAGE_KEYS.BILLS, JSON.stringify(updated));
      return bill;
    },
    delete: (id: string) => {
      const bills = mockBackend.bills.getAll();
      const updated = bills.filter(b => b.id !== id);
      localStorage.setItem(STORAGE_KEYS.BILLS, JSON.stringify(updated));
    }
  },

  analysis: {
    getSpendingInsights: (bills: Bill[]) => {
      const categorySpending: Record<string, number> = {};
      const monthlySpending: Record<string, number> = {};
      const totalSpent = bills.reduce((sum, b) => sum + b.totalAmount, 0);

      bills.forEach(bill => {
        const month = new Date(bill.date).toISOString().slice(0, 7);
        monthlySpending[month] = (monthlySpending[month] || 0) + bill.totalAmount;

        bill.items.forEach(item => {
          categorySpending[item.category] = (categorySpending[item.category] || 0) + (item.price * item.quantity);
        });
      });

      const categoryBreakdown = Object.entries(categorySpending).map(([category, amount]) => ({
        category,
        amount,
        percentage: totalSpent > 0 ? (amount / totalSpent) * 100 : 0
      })).sort((a, b) => b.amount - a.amount);

      return {
        totalSpent,
        totalBills: bills.length,
        avgBillAmount: bills.length > 0 ? totalSpent / bills.length : 0,
        categoryBreakdown,
        monthlyTrend: Object.entries(monthlySpending).map(([month, amount]) => ({ month, amount })).sort((a, b) => a.month.localeCompare(b.month))
      };
    },

    generateShoppingList: (bills: Bill[]) => {
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      const filteredBills = bills.filter(b => new Date(b.date) >= threeMonthsAgo);
      const itemFrequency: Record<string, { count: number; totalPrice: number; totalQuantity: number; category: Category }> = {};

      filteredBills.forEach(bill => {
        bill.items.forEach(item => {
          const key = item.name.toLowerCase().trim();
          if (!itemFrequency[key]) {
            itemFrequency[key] = { count: 0, totalPrice: 0, totalQuantity: 0, category: item.category };
          }
          itemFrequency[key].count += 1;
          itemFrequency[key].totalPrice += item.price;
          itemFrequency[key].totalQuantity += item.quantity;
        });
      });

      return Object.entries(itemFrequency)
        .filter(([_, data]) => data.count >= 2)
        .map(([name, data]) => ({
          id: Math.random().toString(36).substr(2, 9),
          name: name.charAt(0).toUpperCase() + name.slice(1),
          frequency: data.count,
          avgPrice: data.totalPrice / data.count,
          suggestedQuantity: Math.ceil(data.totalQuantity / data.count), // Average quantity per purchase, rounded up
          category: data.category,
          checked: false
        }))
        .sort((a, b) => b.frequency - a.frequency);
    }
  }
};