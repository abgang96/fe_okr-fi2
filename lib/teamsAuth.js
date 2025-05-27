import { app , authentication } from '@microsoft/teams-js';
import { initializeTeams } from './teamsHelpers';
import api from './api';

/**
 * Teams authentication service for handling SSO with Microsoft Teams
 */
export const teamsAuth = {
  isAuthenticated: false,
  user: null,
  token: null,
  
  /**
   * Initialize Teams authentication
   */
  async initialize() {
    try {
      await initializeTeams();
      return true;
    } catch (error) {
      console.error('Failed to initialize Teams auth:', error);
      return false;
    }
  },
  
  /**
   * Get Teams SSO token and authenticate with backend
   */
  async login() {
    try {
      // Get Teams SSO token
      const teamsSsoToken = await this.getTeamsToken();
      
      if (!teamsSsoToken) {
        throw new Error('Failed to obtain Teams SSO token');
      }
      
      // Exchange Teams token for our app's JWT token with backend
      const authResponse = await api.post('/auth/teams/', {
        token: teamsSsoToken
      });
      
      // Save authentication data
      this.token = authResponse.data.tokens.access;
      this.refreshToken = authResponse.data.tokens.refresh;
      this.user = authResponse.data.user;
      this.isAuthenticated = true;
      
      // Store tokens in localStorage (consider using secure storage in production)
      localStorage.setItem('accessToken', this.token);
      localStorage.setItem('refreshToken', this.refreshToken);
      localStorage.setItem('user', JSON.stringify(this.user));
      
      return this.user;
    } catch (error) {
      console.error('Teams authentication failed:', error);
      this.isAuthenticated = false;
      return null;
    }
  },
  
  /**
   * Get Teams SSO token
   */
  async getTeamsToken() {
    try {
      // Make sure Teams SDK is initialized
      await app.initialize();
      
      // Try to get token silently first
      try {
        const token = await authentication.getAuthToken();
        return token;
      } catch (silentError) {
        // If silent token acquisition fails, try with UI
        console.log('Silent token acquisition failed, trying with consent:', silentError);
        
        // return new Promise((resolve, reject) => {
        //   authentication.authenticate({
        //     // url: window.location.origin,
        //     url: `${window.location.origin}/auth-start`,
        //     width: 600,
        //     height: 535,
        //     successCallback: (result) => resolve(result),
        //     failureCallback: (reason) => reject(reason)
        //   });
        // });

        // Use the Promise-based authentication flow (no success/failure callbacks)
        const token = await authentication.authenticate({
          url: `${window.location.origin}/auth-start`,
          width: 600,
          height: 535,
        });

        return token;
        
      }
    } catch (error) {
      console.error('Failed to get Teams token:', error);
      return null;
    }
  },
  
  /**
   * Check if user is authenticated (from localStorage or session)
   */
  checkAuth() {
    const token = localStorage.getItem('accessToken');
    const user = localStorage.getItem('user');
    
    if (token && user) {
      this.token = token;
      this.user = JSON.parse(user);
      this.isAuthenticated = true;
      return true;
    }
    
    return false;
  },
  
  /**
   * Log out current user
   */
  logout() {
    this.token = null;
    this.refreshToken = null;
    this.user = null;
    this.isAuthenticated = false;
    
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  },
  
  /**
   * Refresh token if expired
   */
  async refreshAuth() {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }
      
      const response = await api.post('/token/refresh/', {
        refresh: refreshToken
      });
      
      this.token = response.data.access;
      localStorage.setItem('accessToken', this.token);
      
      return true;
    } catch (error) {
      console.error('Token refresh failed:', error);
      this.logout();
      return false;
    }
  }
};

/**
 * Configure API client with authentication token
 */
export const configureApiAuth = () => {
  const token = localStorage.getItem('accessToken');
  
  // Instead of trying to access api.defaults.headers, set the token in localStorage
  // The api.js interceptor will pick up the token from localStorage automatically
  if (token) {
    localStorage.setItem('accessToken', token);
    // No need to set api.defaults.headers directly
  } else {
    localStorage.removeItem('accessToken');
  }
};

/**
 * Hook to ensure user is authenticated in Teams context
 */
export const useTeamsAuth = async () => {
  // Check if already authenticated
  if (teamsAuth.checkAuth()) {
    configureApiAuth();
    return teamsAuth.user;
  }
  
  // Initialize Teams and authenticate
  await teamsAuth.initialize();
  const user = await teamsAuth.login();
  
  if (user) {
    configureApiAuth();
  }
  
  return user;
};

/**
 * Get the current Teams context if available
 * @returns {Promise<Object|null>} The Teams context object or null if not in Teams
 */
export const getTeamsContext = async () => {
  try {
    if (!app.isInitialized()) {
      await initializeTeams();
    }
    const context = await app.getContext();
    return context;
  } catch (error) {
    console.warn('Not in Teams context:', error);
    return null;
  }
};

export default teamsAuth;