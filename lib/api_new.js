import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
console.log('Using API base URL:', API_BASE_URL);

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

// Function to manage access rights caching
const getCachedAccess = () => {
  try {
    const cachedAccess = localStorage.getItem('userAccess');
    const cacheTime = localStorage.getItem('userAccessTime');
    
    if (cachedAccess && cacheTime) {
      // Use cache if it's less than 2 minutes old
      if ((Date.now() - parseInt(cacheTime)) < 120000) {
        console.log('Using cached access data');
        return JSON.parse(cachedAccess);
      }
    }
  } catch (e) {
    console.warn('Error reading cached access:', e);
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

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/api/auth/refresh/`, {
            refresh: refreshToken
          });

          if (response.data.access) {
            localStorage.setItem('accessToken', response.data.access);
            originalRequest.headers.Authorization = `Bearer ${response.data.access}`;
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

// Export the configured client and utilities
export const api = {
  get: (url) => apiClient.get(url),
  post: (url, data) => apiClient.post(url, data),
  put: (url, data) => apiClient.put(url, data),
  delete: (url) => apiClient.delete(url),
  
  // User Access Management
  getCurrentUserAccess: async () => {
    try {
      // First check cache
      const cachedAccess = getCachedAccess();
      if (cachedAccess) {
        return cachedAccess;
      }

      const token = getToken();
      console.log('Current token:', token ? 'Present' : 'Missing');
      
      if (!token) {
        console.warn('No auth token available');
        const defaultAccess = {
          add_objective_access: false,
          admin_master_access: false
        };
        return defaultAccess;
      }
      
      console.log('Fetching fresh access data');
      const response = await apiClient.get('/api/user-access/check_current_user_access/');
      
      if (!response || !response.data) {
        console.warn('No data received from access check endpoint');
        return {
          add_objective_access: false,
          admin_master_access: false
        };
      }
      
      // Cache the result
      const accessData = {
        add_objective_access: Boolean(response.data.add_objective_access),
        admin_master_access: Boolean(response.data.admin_master_access)
      };
      
      localStorage.setItem('userAccess', JSON.stringify(accessData));
      localStorage.setItem('userAccessTime', Date.now().toString());
      
      return accessData;
    } catch (error) {
      console.error('Error in getCurrentUserAccess:', error);
      return {
        add_objective_access: false,
        admin_master_access: false
      };
    }
  },
  
  // Rest of the existing methods...
  getUsers: async () => {
    const response = await apiClient.get('/api/users/');
    return response.data;
  },

  getTeamMembers: async () => {
    try {
      console.log('Fetching team members...');
      const response = await apiClient.get('/api/users/team-members/');
      console.log('Team members response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching team members:', error.response?.status, error.response?.data);
      return [];
    }
  },

  // ... other methods from the original api.js
};

export default api;
