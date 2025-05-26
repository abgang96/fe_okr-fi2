import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Function to get the current token
const getToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('accessToken');
  }
  return null;
};

// Add request interceptor for auth header
apiClient.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If the error is 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Try to refresh the token
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/api/auth/refresh/`, {
            refresh: refreshToken
          });

          if (response.data.access) {
            // Store the new token
            localStorage.setItem('accessToken', response.data.access);
            
            // Update Authorization header
            originalRequest.headers.Authorization = `Bearer ${response.data.access}`;
            
            // Retry the original request
            return apiClient(originalRequest);
          }
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
      }
    }
    return Promise.reject(error);
  }
);

// Helper function for checking backend connection
const checkConnection = async () => {
  try {
    await apiClient.get('/api/auth/me/');
    return true;
  } catch (error) {
    console.error('Backend connection failed:', error);
    return false;
  }
};

// Export the configured client and utilities
export const api = {
  get: (url) => apiClient.get(url),
  post: (url, data) => apiClient.post(url, data),
  put: (url, data) => apiClient.put(url, data),
  delete: (url) => apiClient.delete(url),
  checkConnection,
  
  // User methods
  getUsers: async () => {
    const response = await apiClient.get('/api/users/');
    return response.data;
  },

  getTeamMembers: async () => {
    const response = await apiClient.get('/api/teams-auth/team-members/');
    return response.data;
  },

  // Department methods
  getDepartments: async () => {
    const response = await apiClient.get('/api/departments/');
    return response.data;
  },
  
  // Business Unit methods
  getBusinessUnits: async () => {
    const response = await apiClient.get('/api/business-units/');
    return response.data;
  },
  
  getOKRBusinessUnits: async (okrId) => {
    const response = await apiClient.get(`/api/okrs/${okrId}/business_units/`);
    return response.data;
  },
  
  assignBusinessUnits: async (okrId, businessUnitIds) => {
    const response = await apiClient.post(`/api/okrs/${okrId}/assign_business_units/`, businessUnitIds);
    return response.data;
  },
  
  // OKR methods
  getOKRs: async (params = {}) => {
    const response = await apiClient.get('/api/okrs/', { params });
    return response.data;
  },
  
  createOKR: async (data) => {
    const response = await apiClient.post('/api/okrs/', data);
    return response.data;
  },
  
  updateOKR: async (id, data) => {
    const response = await apiClient.put(`/api/okrs/${id}/`, data);
    return response.data;
  },
  
  deleteOKR: async (id) => {
    await apiClient.delete(`/api/okrs/${id}/`);
  }
};

export default api;