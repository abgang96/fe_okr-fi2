// Client-side MSAL authentication service
// This must only be imported on client-side

import { PublicClientApplication, BrowserAuthError } from "@azure/msal-browser";
import { msalConfig, loginRequest } from "./msalConfig";

// Singleton instance for MSAL
let msalInstance = null;
// Initialization promise that all functions will await
let initPromise = null;

let hasHandledRedirect = false;

// Check if we're running on client or server
const isServer = typeof window === 'undefined';

/**
 * Safe localStorage access with try-catch
 */
const safeLocalStorage = {
  getItem: (key) => {
    if (isServer) return null;
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.error('localStorage.getItem error:', e);
      return null;
    }
  },
  setItem: (key, value) => {
    if (isServer) return;
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.error('localStorage.setItem error:', e);
    }
  },
  removeItem: (key) => {
    if (isServer) return;
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.error('localStorage.removeItem error:', e);
    }
  }
};

/**
 * Initialize the MSAL instance
 * Returns a promise that resolves with the MSAL instance
 */
const initializeMsal = async () => {
  if (isServer) {
    throw new Error('MSAL cannot be initialized on the server');
  }
  
  // If already initialized, return the instance
  if (msalInstance) {
    return msalInstance;
  }
  
  // If initialization is in progress, wait for it to complete
  if (initPromise) {
    return initPromise;
  }
  
  // Start initialization
  initPromise = (async () => {
    try {
      console.log('Creating new MSAL instance');
      const instance = new PublicClientApplication(msalConfig);
      await instance.initialize();
      console.log('MSAL initialized successfully');
      msalInstance = instance;
      return instance;
    } catch (error) {
      console.error('MSAL initialization failed:', error);
      throw error;
    }
  })();
  
  return initPromise;
};

/**
 * Extract user information from account
 */
const createUserObject = (account) => {
  return {
    id: account.localAccountId || account.homeAccountId,
    username: account.username,
    name: account.name,
  };
};

/**
 * Get stored user from localStorage
 */
const getStoredUser = () => {
  if (isServer) return null;
  
  try {
    const userStr = safeLocalStorage.getItem('msalUser');
    return userStr ? JSON.parse(userStr) : null;
  } catch (error) {
    console.error('Error getting stored user:', error);
    return null;
  }
};

/**
 * Store user in localStorage
 */
const storeUser = (user) => {
  if (isServer || !user) return;
  
  try {
    safeLocalStorage.setItem('msalUser', JSON.stringify(user));
  } catch (error) {
    console.error('Error storing user:', error);
  }
};

// Our simplified MSAL authentication service
export const msalAuth = {
  /**
   * Initialize MSAL instance - must be called before any other methods
   */
  initialize: async () => {
    try {
      return await initializeMsal();
    } catch (error) {
      console.error('MSAL initialization failed:', error);
      throw error;
    }
  },

  /**
   * Ensure MSAL is initialized - used by components to safely initialize MSAL
   * Returns true if successful, false if failed
   */
  ensureInitialized: async () => {
    try {
      await initializeMsal();
      return true;
    } catch (error) {
      console.error('MSAL ensure initialization failed:', error);
      return false;
    }
  },
  
  /**
   * Get the current user, either from storage or active account
   */
  getCurrentUser: () => {
    if (isServer) return null;
    
    // First check storage
    const storedUser = getStoredUser();
    if (storedUser) return storedUser;
    
    // Then check MSAL accounts if initialized
    if (msalInstance) {
      const accounts = msalInstance.getAllAccounts();
      if (accounts.length > 0) {
        const user = createUserObject(accounts[0]);
        storeUser(user);
        return user;
      }
    }
    
    return null;
  },
  
  /**
   * Log in with Microsoft using server-side authentication flow
   * This approach works with Web app registration type
   */
  login: async () => {
    if (isServer) return { success: false, error: 'Cannot login on server' };
    
    try {
      // Check if we already have a valid user and token
      const storedUser = getStoredUser();
      const storedToken = safeLocalStorage.getItem('accessToken');
      
      if (storedUser && storedToken) {
        console.log('Using existing user and token');
        return {
          success: true,
          user: storedUser,
          token: storedToken
        };
      }
      
      // Store current URL for redirect back
      try {
        safeLocalStorage.setItem('msalLoginRedirectUrl', window.location.href);
      } catch (e) {
        console.error('Could not store redirect URL:', e);
      }
      
      console.log('Starting server-side authentication flow');
      
      // Get the current URL for the returnUrl parameter
      const currentUrl = window.location.href;
      const returnUrl = encodeURIComponent(currentUrl);
      
      // Redirect to our server-side login endpoint
      const loginEndpoint = `/api/auth/microsoft/login?returnUrl=${returnUrl}`;
      window.location.href = loginEndpoint;
      
      // Return pending status - we'll be redirected away from the page
      return { 
        success: false, 
        pendingRedirect: true, 
        error: 'Redirect login initiated' 
      };
    } catch (error) {
      console.error('Login error:', error);
      
      // Format a user-friendly error message
      let errorMessage = 'Authentication failed';
      if (error instanceof BrowserAuthError) {
        errorMessage = error.errorMessage || error.errorCode;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      return { success: false, error: errorMessage };
    }
  },
    /**
   * Log out from Microsoft
   * @param {boolean} redirectToLoginPage - Whether to redirect to the login page after logout
   */
  logout: async (redirectToLoginPage = false) => {
    if (isServer) return false;
    
    try {
      // Make sure MSAL is initialized
      const instance = await initializeMsal();
      
      // Clear storage
      safeLocalStorage.removeItem('msalUser');
      safeLocalStorage.removeItem('accessToken');
      
      // If redirecting to login page, set a flag in localStorage to prevent auto-login
      if (redirectToLoginPage) {
        safeLocalStorage.setItem('justLoggedOut', 'true');
      }
      
      // Log out from MSAL
      await instance.logout();
      return true;
    } catch (error) {
      console.error('Logout error:', error);
      return false;
    }
  },
  
  /**
   * Get access token for API calls
   */
  getToken: async () => {
    if (isServer) return null;
    
    try {
      // Check if we have a token in storage first
      const storedToken = safeLocalStorage.getItem('accessToken');
      if (storedToken) return storedToken;
      
      // Make sure MSAL is initialized
      const instance = await initializeMsal();
      
      // Get accounts
      const accounts = instance.getAllAccounts();
      if (accounts.length === 0) return null;
      
      // Set active account
      instance.setActiveAccount(accounts[0]);
      
      // Get token silently
      const result = await instance.acquireTokenSilent({
        scopes: loginRequest.scopes,
        account: accounts[0]
      });
      
      if (result) {
        safeLocalStorage.setItem('accessToken', result.accessToken);
        return result.accessToken;
      }
      
      return null;
    } catch (error) {
      console.error('Get token error:', error);
      return null;
    }
  },
  
  /**
   * Handle redirect response from Microsoft login
   * This processes the authorization code returned to the callback page
   */
  // handleRedirectResponse: async () => {
  //   if (isServer) return { success: false, error: 'Cannot handle redirect on server' };
    
  //   try {
  //     console.log('Handling redirect response');
      
  //     // Check if we have an authorization code in the URL
  //     const urlParams = new URLSearchParams(window.location.search);
  //     const authCode = urlParams.get('code');
  //     const error = urlParams.get('error');
  //     const errorDescription = urlParams.get('error_description');
      
  //     // Handle errors returned from Microsoft
  //     if (error) {
  //       console.error('Microsoft auth error:', error, errorDescription);
  //       return {
  //         success: false,
  //         error: errorDescription || error || 'Authentication failed'
  //       };
  //     }
      
  //     // If we have an authorization code, exchange it for tokens
  //     if (authCode) {
  //       console.log('Received authorization code, exchanging for tokens');
        
  //       // Exchange code for tokens using our server API
  //       const response = await fetch('/api/auth/microsoft/token', {
  //         method: 'POST',
  //         headers: { 'Content-Type': 'application/json' },
  //         body: JSON.stringify({ code: authCode })
  //       });
        
  //       const data = await response.json();
        
  //       // Check for errors in the token exchange
  //       if (!response.ok || data.error) {
  //         console.error('Token exchange error:', data);
  //         return {
  //           success: false,
  //           error: data.error || data.message || 'Token exchange failed'
  //         };
  //       }
        
  //       // Make sure we have the required data
  //       if (!data.tokens || !data.tokens.access) {
  //         console.error('Invalid token response:', data);
  //         return {
  //           success: false,
  //           error: 'Invalid token response'
  //         };
  //       }
        
  //       console.log('Token exchange successful');

        
  //       // Extract user info from response
  //       const user = data.user ? {
  //         id: data.user.id,
  //         username: data.user.mail || data.user.userPrincipalName,
  //         name: data.user.displayName
  //       } : {
  //         id: 'unknown',
  //         username: 'unknown',
  //         name: 'Unknown User'
  //       };
        
  //       // Store user and token
  //       storeUser(user);
  //       safeLocalStorage.setItem('accessToken', data.tokens.access);
        
  //       // Store refresh token if available
  //       if (data.tokens.refresh) {
  //         safeLocalStorage.setItem('refreshToken', data.tokens.refresh);
  //       }
        
  //       return {
  //         success: true,
  //         user,
  //         token: data.tokens.access
  //       };
  //     }
      
  //     // No code or error in URL
  //     return { success: false, error: 'No authentication code received' };
  //   } catch (error) {
  //     console.error('Error handling redirect:', error);
      
  //     // Format a user-friendly error message
  //     let errorMessage = 'Failed to complete authentication';
  //     if (error instanceof BrowserAuthError) {
  //       errorMessage = error.errorMessage || error.errorCode;
  //     } else if (error.message) {
  //       errorMessage = error.message;
  //     }
      
  //     return { success: false, error: errorMessage };
  //   }
  //   },

handleRedirectResponse: async () => {
  if (isServer) return { success: -1, error: 'Cannot handle redirect on server' };

  try {
    console.log('Handling redirect response');

    const urlParams = new URLSearchParams(window.location.search);

    // 🛑 Avoid executing before URL is ready (fix for flashing "No code" error)
    if (!window.location.search || window.location.search.length < 5) {
      console.log('Redirect response skipped: URL params not ready');
      return {type:'warning', success: 0, error: 'Waiting for redirect response... Please Have Patience!' };
    }

    const authCode = urlParams.get('code');
    const error = urlParams.get('error');
    const errorDescription = urlParams.get('error_description');

    if (error) {
      console.error('Microsoft auth error:', error, errorDescription);
      return {
        success: -1,
        error: errorDescription || error || 'Authentication failed'
      };
    }

    if (authCode) {
      console.log('Received authorization code, exchanging for tokens');

      const response = await fetch('/api/auth/microsoft/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: authCode })
      });

      const data = await response.json();

      if (!response.ok || data.error || !data.tokens?.access) {
        console.error('Token exchange error:', data);
        return {
          success: -1,
          error: data.error || data.message || 'Token exchange failed'
        };
      }

      console.log('Token exchange successful');

      const user = data.user ? {
        id: data.user.id,
        username: data.user.mail || data.user.userPrincipalName,
        name: data.user.displayName
      } : {
        id: 'unknown',
        username: 'unknown',
        name: 'Unknown User'
      };

      storeUser(user);
      safeLocalStorage.setItem('accessToken', data.tokens.access);
      if (data.tokens.refresh) {
        safeLocalStorage.setItem('refreshToken', data.tokens.refresh);
      }

      // ✅ Force reload to re-evaluate auth context
      window.history.replaceState({}, document.title, window.location.pathname);
      window.location.reload();

      return { success: 1, user, token: data.tokens.access };
    }

    return { success: -1, error: 'No authentication code received' };
  } catch (error) {
    console.error('Error handling redirect:', error);
    return {
      success: -1,
      error: error.message || 'Failed to complete authentication'
    };
  }
  }
  




};
