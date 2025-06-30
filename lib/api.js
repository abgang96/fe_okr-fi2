import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
console.log('Using API base URL:', API_BASE_URL);

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000, // Increased timeout to 60 seconds to handle slower connections
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

// Add response interceptor for retry logic
apiClient.interceptors.response.use(
  response => response,
  async error => {
    const { config, message } = error;
    
    // Only retry if it's a timeout or network error and we haven't retried yet
    if (
      (message.includes('timeout') || message.includes('Network Error')) &&
      !config._retry
    ) {
      config._retry = true;
      console.log('Retrying API request due to timeout or network error');
      
      try {
        // Retry the request
        return await apiClient(config);
      } catch (retryError) {
        console.error('Retry also failed:', retryError);
        return Promise.reject(retryError);
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
  getUsers: async (searchQuery = '') => {
    try {
      let url = '/api/users/';
      // If searchQuery is provided, add it as a query parameter
      if (searchQuery && searchQuery.trim() !== '') {
        url += `?search=${encodeURIComponent(searchQuery.trim())}`;
      }
      const response = await apiClient.get(url);
      return response.data;
    } catch (error) {
      console.error('Error fetching users:', error);
      return [];
    }
  },

  getUserByTeamsId: async (teamsId) => {
    const response = await apiClient.get(`/api/users/?teams_id=${teamsId}`);
    return response.data.length > 0 ? response.data[0] : null;
  },  getTeamMembers: async () => {
    try {
      console.log('Fetching team members...');
      const response = await apiClient.get('/api/users/team-members/');  // Updated endpoint
      console.log('Team members response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching team members:', error.response?.status, error.response?.data);
      return [];
    }
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
  
  getOKRAssignedUsers: async (okrId) => {
    const response = await apiClient.get(`/api/okrs/${okrId}/assigned_users/`);
    return response.data;
  },
  
  createOKR: async (data) => {
    const response = await apiClient.post('/api/okrs/', data);
    return response.data;
  },
  
  updateOKR: async (id, data) => {
    const response = await apiClient.put(`/api/okrs/${id}/`, data);
    return response.data;
  },  deleteOKR: async (id) => {
    await apiClient.delete(`/api/okrs/${id}/`);
  },
  
  // Question Master methods
  getQuestionsMaster: async (authType) => {
    try {
      const params = {};
      if (authType !== undefined) {
        params.auth_type = authType;
      }
      
      console.log('Fetching questions with params:', params);
      const response = await apiClient.get('/api/questions-master/', { params });
      
      if (!response.data) {
        console.warn('No questions found');
        return [];
      }
      
      // Return list of questions or empty array
      return Array.isArray(response.data) ? response.data : [];
      
    } catch (error) {
      console.error('Error fetching questions:', error.response?.data || error);
      throw error;
    }
  },
  
  getQuestionMasterDetail: async (id) => {
    try {
      console.log('Fetching question details for:', id);
      const response = await apiClient.get(`/api/questions-master/${id}/`);
      return response.data;
    } catch (error) {
      console.error('Error fetching question details:', error);
      throw error;
    }
  },
  
  createQuestionMaster: async (data) => {
    const response = await apiClient.post('/api/questions-master/', data);
    return response.data;
  },
  
  updateQuestionMaster: async (id, data) => {
    const response = await apiClient.patch(`/api/questions-master/${id}/`, data);
    return response.data;
  },
  
  deleteQuestionMaster: async (id) => {
    await apiClient.delete(`/api/questions-master/${id}/`);
  },
    // Options for questions
  addOptionToQuestion: async (questionId, optionDesc) => {
    const response = await apiClient.post(`/api/questions-master/${questionId}/add_option/`, { option_desc: optionDesc });
    return response.data;
  },
    removeOptionFromQuestion: async (questionId, optionId) => {
    await apiClient.delete(`/api/questions-master/${questionId}/remove_option/`, { 
      data: { option_id: optionId } 
    });
  },    // User Access Management
  _getCachedAccess: () => {
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
  },

  getCurrentUserAccess: async () => {
    try {
      // Check if cache is still valid (less than 5 minutes old)
      const cachedAccessTime = localStorage.getItem('userAccessTime');
      const currentTime = Date.now();
      const cacheAge = cachedAccessTime ? currentTime - parseInt(cachedAccessTime) : Infinity;
      const cacheValid = cacheAge < 5 * 60 * 1000; // 5 minutes
      
      // Try to use cache first if it's valid
      if (cacheValid) {
        const cachedAccess = api._getCachedAccess();
        if (cachedAccess) {
          console.log('Using cached access data (age in seconds):', Math.floor(cacheAge / 1000));
          return cachedAccess;
        }
      }
      
      // No valid cache, fetch from API
      console.log('Fetching fresh access data from API');
      const token = getToken();
      
      if (!token) {
        console.warn('No auth token available');
        const defaultAccess = {
          add_objective_access: false,
          admin_master_access: false
        };
        return defaultAccess;
      }
      
      const response = await apiClient.get('/api/user-access/check_current_user_access/');
      
      if (!response || !response.data) {
        console.warn('No data received from access check endpoint');
        return {
          add_objective_access: false,
          admin_master_access: false
        };
      }
      
      // Ensure we're getting explicitly boolean values (not truthy/falsy conversion)
      const accessData = {
        add_objective_access: response.data.add_objective_access === true,
        admin_master_access: response.data.admin_master_access === true
      };
      
      console.log('Received access data from API:', response.data);
      console.log('Processed access data (explicit boolean check):', accessData);
      
      // Cache the access data
      localStorage.setItem('userAccess', JSON.stringify(accessData));
      localStorage.setItem('userAccessTime', currentTime.toString());
      
      return accessData;
    } catch (error) {
      console.error('Error in getCurrentUserAccess:', error);
      
      // If API call fails, try to use cached data regardless of age
      try {
        const cachedAccess = api._getCachedAccess();
        if (cachedAccess) {
          console.log('Using expired cached access data due to API error');
          return cachedAccess;
        }
      } catch (cacheError) {
        console.error('Error reading cached access:', cacheError);
      }
      
      return {
        add_objective_access: false,
        admin_master_access: false
      };
    }
  },
  
  getUsersWithAccess: async () => {
    const response = await apiClient.get('/api/user-access/');
    return response.data;
  },
  
  updateUserAccess: async (userId, accessData) => {
    const response = await apiClient.post(`/api/user-access/${userId}/update_access/`, accessData);
    return response.data;
  },
  
};

export default api;