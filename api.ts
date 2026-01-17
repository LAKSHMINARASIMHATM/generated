
const API_BASE_URL = '/api/v1';

const getHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('smartspend_token')}`
});

export const api = {
  auth: {
    login: (email: string) => 
      fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      }).then(res => res.json()),
    
    signup: (name: string, email: string) =>
      fetch(`${API_BASE_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email })
      }).then(res => res.json()),

    getMe: () =>
      fetch(`${API_BASE_URL}/auth/me`, { headers: getHeaders() }).then(res => res.json())
  },

  bills: {
    upload: (image: string) =>
      fetch(`${API_BASE_URL}/bills/upload`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ image })
      }).then(res => res.json()),

    getAll: () =>
      fetch(`${API_BASE_URL}/bills`, { headers: getHeaders() }).then(res => res.json()),

    getById: (id: string) =>
      fetch(`${API_BASE_URL}/bills/${id}`, { headers: getHeaders() }).then(res => res.json()),

    delete: (id: string) =>
      fetch(`${API_BASE_URL}/bills/${id}`, { method: 'DELETE', headers: getHeaders() })
  },

  analysis: {
    getInsights: () =>
      fetch(`${API_BASE_URL}/analysis/spending-insights`, { headers: getHeaders() }).then(res => res.json()),

    getShoppingList: () =>
      fetch(`${API_BASE_URL}/analysis/shopping-list`, { headers: getHeaders() }).then(res => res.json())
  }
};
