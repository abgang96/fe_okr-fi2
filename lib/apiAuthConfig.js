import axios from 'axios';
import React from 'react'; // Add missing React import
import NoSSR from '../components/auth/NoSSR';

// Get the base URL from environment variables - safe in both SSR and CSR
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

// Create a function that returns an axios instance with auth config
// This function should only be called client-side
const createAuthApiClient = () => {
  if (typeof window === 'undefined') return null;
  
  // Create axios instance for authenticated API calls
  const client = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
    },
    timeout: 15000,
  });
  
  /**
   * Safe localStorage access with try-catch
   */
  const safeGetItem = (key) => {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.error('localStorage.getItem error:', e);
      return null;
    }
  };
  
  // Add request interceptor to add auth token
  client.interceptors.request.use(
    async (config) => {
      try {
        const accessToken = safeGetItem('accessToken');
        
        if (accessToken) {
          config.headers.Authorization = `Bearer ${accessToken}`;
        }
        
        return config;
      } catch (error) {
        console.error('Auth interceptor error:', error);
        return config;
      }
    },
    (error) => Promise.reject(error)
  );
  
  // Add response interceptor to handle authentication errors
  client.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;
      
      // If error is 401 Unauthorized and we haven't already tried to refresh
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;
        
        try {
          // Dynamically import to avoid SSR issues
          const { msalAuth } = await import('./msalAuth');
          
          // Try to get a fresh token
          const newToken = await msalAuth.getToken();
          
          if (newToken) {
            // Update the request with the new token
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return client(originalRequest);
          }
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError);
        }
      }
      
      return Promise.reject(error);
    }
  );
  
  return client;
};

// Create a component that loads the API client only on client side
const ClientOnlyAPILoader = () => {
  React.useEffect(() => {
    // Set up global auth API client on the window object
    if (!window.authApiClient) {
      window.authApiClient = createAuthApiClient();
    }
  }, []);
  
  return null;
};

// Export a marker to include in _app.js if needed
export const AuthAPIClientLoader = () => {
  return <NoSSR><ClientOnlyAPILoader /></NoSSR>;
};

// For direct imports, provide a function that safely gets the client
export const getAuthApiClient = () => {
  if (typeof window === 'undefined') return null;
  
  // Use existing client or create a new one
  return window.authApiClient || createAuthApiClient();
};

// Legacy export for compatibility with existing code
export const authApiClient = typeof window !== 'undefined' ? 
  (window.authApiClient || createAuthApiClient()) : null;
