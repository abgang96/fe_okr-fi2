// This file should not import any MSAL libraries directly
// to avoid SSR issues - configuration only

// Client ID and tenant ID from environment variables
const clientId = process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID || "4f34222d-3d22-4855-9d70-6aa95971c511";
const tenantId = process.env.NEXT_PUBLIC_MICROSOFT_TENANT_ID || '0f31460e-8f97-4bf6-9b20-fe837087ad59';

// Get base URL safely - never access window during module initialization
const getBaseUrl = () => {
  if (typeof window === 'undefined') {
    // Safe default for SSR
    return 'http://localhost:3000';
  }
  
  try {
    return window.location.origin;
  } catch (e) {
    console.error('Error accessing window.location:', e);
    return 'http://localhost:3000';
  }
};

// Create a safe, lazy-evaluated redirectUri function
// This will be evaluated when the config is actually used by MSAL, not on import
const getRedirectUri = () => {
  const baseUrl = getBaseUrl();
  return `${baseUrl}/auth/microsoft-callback`;
};

const getPostLogoutRedirectUri = () => {
  return getBaseUrl();
};

// Export configuration object - everything will be evaluated by MSAL when needed
export const msalConfig = {
  auth: {
    clientId,
    authority: `https://login.microsoftonline.com/${tenantId}`,
    redirectUri: getRedirectUri(),
    navigateToLoginRequestUrl: true,
    postLogoutRedirectUri: getPostLogoutRedirectUri(),
  },
  cache: {
    cacheLocation: "localStorage", // Using sessionStorage for better security
    storeAuthStateInCookie: true, // Set to false for modern browsers
  },
  system: {
    allowNativeBroker: false, // Disables WAM broker integration
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) return;
        switch (level) {
          case 0: console.error(message); break; // Error
          case 1: console.warn(message); break;  // Warning
          case 2: console.info(message); break;  // Info
          case 3: console.debug(message); break; // Verbose
        }
      },
      logLevel: 3, // Verbose level for debugging
      piiLoggingEnabled: false
    }
  }
};

// Scopes for login requests
export const loginRequest = {
  scopes: ["User.Read", "profile", "openid", "email"]
};

// Custom server-side flow configuration (for Web app type)
export const serverConfig = {
  authEndpoint: '/api/auth/microsoft/login', // Your server endpoint that initiates auth
  tokenEndpoint: '/api/auth/microsoft/token', // Your server endpoint that exchanges tokens
  loginCompletePage: '/test-auth', // Where to redirect after successful login
};
