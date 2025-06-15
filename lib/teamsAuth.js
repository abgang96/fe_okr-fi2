import { app, authentication } from '@microsoft/teams-js';
import { initializeTeams } from './teamsHelpers';
import api from './api';

/**
 * Teams authentication service for handling SSO with Microsoft Teams
 * Enhanced version with better desktop/mobile client handling
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
  },  /**
   * Get Teams SSO token with platform-specific optimizations - enhanced for macOS compatibility
   */
  async getTeamsToken() {
    try {
      // Make sure Teams SDK is initialized
      await app.initialize();
      
      // Get client information to determine best authentication approach
      let clientType = 'unknown';
      let hostClientType = 'unknown';
      let platform = 'unknown';
      
      try {
        const context = await app.getContext();
        clientType = context.hostClientType || 'unknown';
        
        // Explicitly detect macOS by examining navigator.platform (for older browsers)
        // or userAgent (as fallback for all browsers)
        const userAgent = window.navigator.userAgent || '';
        if (window.navigator.platform) {
          if (window.navigator.platform.indexOf('Mac') !== -1) {
            platform = 'macOS';
          } else if (window.navigator.platform.indexOf('Win') !== -1) {
            platform = 'Windows';
          }
        } else if (userAgent.indexOf('Mac') !== -1) {
          platform = 'macOS';
        } else if (userAgent.indexOf('Windows') !== -1) {
          platform = 'Windows';
        }
        
        console.log(`Teams client type: ${clientType}, Platform: ${platform}`);
      } catch (contextError) {
        console.warn('Could not determine Teams client type:', contextError);
      }
      
      // First try silent token acquisition - works best on all platforms
      try {
        console.log('Attempting silent token acquisition...');
        const silentToken = await authentication.getAuthToken({
          resources: [window.location.origin],
          silent: true
        });
        console.log('Silent token acquisition succeeded');
        return silentToken;
      } catch (silentError) {
        console.log('Silent token acquisition failed:', silentError);
        
        // Special handling for macOS desktop client
        if (platform === 'macOS' || clientType === 'desktop') {
          try {
            console.log('Using macOS/desktop-specific authenticate method (Promise-based with wider popup)');
            const desktopToken = await authentication.authenticate({
              url: `${window.location.origin}/auth-start`,
              width: 700,  // Wider popup for macOS
              height: 600  // Taller popup for macOS
            });
            console.log('Desktop authentication succeeded with Promise approach');
            return desktopToken;          } catch (desktopError) {
            console.error('Desktop Promise authentication failed:', desktopError);
            // Fall through to callback approach
          }
        }
        
        // Enhanced fallback approach for all clients, with special handling for macOS
        console.log('Attempting authentication with callback approach');
        return new Promise((resolve, reject) => {
          // Check for Safari-specific issues on macOS
          const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
          
          // Use an enhanced popup size for macOS clients, especially Safari
          const popupWidth = platform === 'macOS' ? 800 : 600;
          const popupHeight = platform === 'macOS' ? 650 : 535;
          
          authentication.authenticate({
            url: `${window.location.origin}/auth-start?platform=${platform}`, // Pass platform info
            width: popupWidth,
            height: popupHeight,
            successCallback: (token) => {
              console.log("Authentication callback succeeded");
              resolve(token);
            },
            failureCallback: (error) => {
              console.error("Authentication callback failed", error);
              reject(error);
            }
          });
        });
      }
    } catch (error) {
      console.error('All authentication methods failed:', error);
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
      try {
        this.user = JSON.parse(user);
        this.isAuthenticated = true;
        return true;
      } catch (e) {
        console.error('Error parsing user data:', e);
        this.logout(); // Clear invalid data
      }
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
  try {
    // Get platform info
    const userAgent = window.navigator.userAgent;
    let platform = 'unknown';
    
    if (userAgent.indexOf('Windows') !== -1) platform = 'Windows';
    else if (userAgent.indexOf('Macintosh') !== -1) platform = 'macOS';
    
    console.log(`Getting Teams token on platform: ${platform}`);
    
    // Set timeout based on platform
    const tokenTimeoutDuration = platform === 'Windows' ? 25000 : 15000;
    
    // Get auth token from Teams with timeout
    const tokenPromise = authentication.getAuthToken({
      resources: [process.env.NEXT_PUBLIC_API_URL],
      silent: true
    });
    
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Teams token acquisition timed out after ${tokenTimeoutDuration/1000}s`)), tokenTimeoutDuration);
    });
    
    const teamsToken = await Promise.race([tokenPromise, timeoutPromise]);
    console.log('Got Teams token successfully');
    
    // Exchange Teams token for app token
    const response = await api.post('/api/auth/teams-login/', {
      teams_token: teamsToken
    });
    
    if (response.data && response.data.access_token) {
      // Store token and user info
      localStorage.setItem('accessToken', response.data.access_token);
      
      // Parse and store user data
      const userData = response.data.user;
      localStorage.setItem('user', JSON.stringify(userData));
      
      // Set token for all future API calls
      api.setToken(response.data.access_token);
      
      return userData;
    } else {
      throw new Error('Invalid response from token exchange');
    }
  } catch (error) {
    console.error('Teams auth error:', error);
    
    // Special handling for specific error messages
    if (error.message && error.message.includes('timed out')) {
      throw new Error(`Authentication timed out. Please try again or use manual sign-in.`);
    }
    
    throw error;
  }
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