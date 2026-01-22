
const API_BASE_URL = '/api/v1';

const getHeaders = () => ({
  'Content-Type': 'application/json',
});

const handleResponse = async (res: Response) => {
  if (!res.ok) {
    const error = await res.text();
    throw new Error(error || `API error: ${res.status}`);
  }
  return res.json();
};

export const api = {
  bills: {
    getAll: async () => {
      const res = await fetch(`${API_BASE_URL}/bills`, { headers: getHeaders() });
      return handleResponse(res);
    },

    getById: async (id: string) => {
      const res = await fetch(`${API_BASE_URL}/bills/${id}`, { headers: getHeaders() });
      return handleResponse(res);
    },

    save: async (bill: any) => {
      const res = await fetch(`${API_BASE_URL}/bills`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(bill)
      });
      return handleResponse(res);
    },

    delete: async (id: string) => {
      const res = await fetch(`${API_BASE_URL}/bills/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      if (!res.ok) throw new Error('Failed to delete bill');
      return true;
    },

    sync: async (bills: any[]) => {
      const res = await fetch(`${API_BASE_URL}/bills/sync`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ bills })
      });
      return handleResponse(res);
    }
  },

  analysis: {
    getInsights: async () => {
      const res = await fetch(`${API_BASE_URL}/analysis/insights`, { headers: getHeaders() });
      return handleResponse(res);
    },

    getShoppingList: async () => {
      const res = await fetch(`${API_BASE_URL}/analysis/shopping-list`, { headers: getHeaders() });
      return handleResponse(res);
    },

    getPrices: async (billId: string) => {
      const res = await fetch(`${API_BASE_URL}/analysis/prices/${billId}`, { headers: getHeaders() });
      return handleResponse(res);
    }
  },

  settings: {
    getNotifications: async () => {
      // For now, use localStorage as backend doesn't have this endpoint
      const settings = localStorage.getItem('smartspend_notifications');
      return settings ? JSON.parse(settings) : {
        offerAlerts: true,
        monthlySummaries: true,
        priceDrops: true,
        weeklyDigest: false
      };
    },

    updateNotifications: async (settings: any) => {
      localStorage.setItem('smartspend_notifications', JSON.stringify(settings));
      return settings;
    }
  }
};
