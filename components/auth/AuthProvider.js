import React, { createContext, useContext } from 'react';
import NoSSR from './NoSSR';

// Create an empty default context with safe values
export const AuthContext = createContext({
  isAuthenticated: false,
  user: null,
  loading: false,
  error: null,
  login: async () => ({ success: false }),
  logout: async () => {},
  getToken: async () => null,
});

// Safe auth hook for both client and server
export const useAuth = () => {
  return useContext(AuthContext);
};

// Server-side placeholder - does nothing but renders children
function ServerAuthProvider({ children }) {
  return <>{children}</>;
}

// Actual auth implementation - only imported and rendered on client
function ClientAuthProvider({ children }) {
  // We'll import and define all the actual implementation here
  // This component is never rendered on server
  const [state, setState] = React.useState({
    isAuthenticated: false,
    user: null,
    loading: true,
    error: null,
  });

  // Reference to track if component is mounted
  const isMounted = React.useRef(false);

  React.useEffect(() => {
    isMounted.current = true;
    
    // Safely import client-side dependencies and initialize
    const initAuth = async () => {
      try {
        // Import msalAuth
        const { msalAuth } = await import('../../lib/msalAuth');
        
        console.log("AuthProvider: Initializing MSAL");
        
        // Ensure MSAL is properly initialized
        const initialized = await msalAuth.ensureInitialized();
        
        if (!initialized) {
          console.error("AuthProvider: MSAL initialization failed");
          
          // Check if component is still mounted before updating state
          if (isMounted.current) {
            setState({
              isAuthenticated: false,
              user: null,
              loading: false,
              error: "Failed to initialize Microsoft authentication",
            });
          }
          return;
        }
        
        console.log("AuthProvider: MSAL initialized successfully");
        
        // Check if there's any pending redirect response to handle
        // But only do this if we're not already on the callback page
        if (typeof window !== 'undefined' && 
            !window.location.pathname.includes('/auth/microsoft-callback')) {
          try {
            console.log("AuthProvider: Checking for redirect response");
            const redirectResult = await msalAuth.handleRedirectResponse();
            if (redirectResult.success) {
              console.log("AuthProvider: Redirect response handled successfully");
              if (isMounted.current) {
                setState({
                  isAuthenticated: true,
                  user: redirectResult.user,
                  loading: false,
                  error: null,
                });
              }
              return;
            }
          } catch (redirectError) {
            console.warn('Error handling redirect response:', redirectError);
            // Continue with normal initialization
          }
        }
        
        // Check if we have a user already
        const user = msalAuth.getCurrentUser();
        
        // Check if component is still mounted before updating state
        if (isMounted.current) {
          if (user) {
            console.log("AuthProvider: User found in storage");
            setState({
              isAuthenticated: true,
              user,
              loading: false,
              error: null,
            });
          } else {
            console.log("AuthProvider: No user found");
            setState({
              isAuthenticated: false,
              user: null,
              loading: false,
              error: null,
            });
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        
        // Check if component is still mounted before updating state
        if (isMounted.current) {
          setState({
            isAuthenticated: false,
            user: null,
            loading: false,
            error: error.message || "Authentication initialization failed",
          });
        }
      }
    };
    
    initAuth();
    
    // Cleanup function to prevent memory leaks
    return () => {
      isMounted.current = false;
    };
  }, []);
  
  // Client-side login function
  const login = async () => {
    // Only update state if component is mounted
    if (!isMounted.current) return { success: false, error: 'Component unmounted' };
    
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      // Dynamically import to avoid SSR issues
      const { msalAuth } = await import('../../lib/msalAuth');
      
      console.log("AuthProvider: Starting login process");
      
      // Try to ensure MSAL is initialized before login
      const initialized = await msalAuth.ensureInitialized();
      if (!initialized) {
        const error = 'MSAL initialization failed before login';
        console.error(error);
        
        if (isMounted.current) {
          setState(prev => ({
            ...prev,
            loading: false,
            error,
          }));
        }
        
        return { success: false, error };
      }
      
      // Now perform login
      const result = await msalAuth.login();
      console.log("AuthProvider: Login result", result);
      
      // Only update state if component is mounted
      if (!isMounted.current) return result;
      
      if (result.success) {
        setState({
          isAuthenticated: true,
          user: result.user,
          loading: false,
          error: null,
        });
      } else {
        setState(prev => ({
          ...prev,
          loading: false,
          error: result.error || 'Authentication failed',
        }));
      }
      
      return result;
    } catch (error) {
      console.error('Login error:', error);
      
      // Only update state if component is mounted
      if (isMounted.current) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: error.message || 'Login failed',
        }));
      }
      
      return { success: false, error: error.message || 'Login failed' };
    }
  };
  
  // Client-side logout function
  const logout = async () => {
    // Only update state if component is mounted
    if (!isMounted.current) return false;
    
    setState(prev => ({ ...prev, loading: true }));
    try {
      // Dynamically import to avoid SSR issues
      const { msalAuth } = await import('../../lib/msalAuth');
      
      // Try to ensure MSAL is initialized before logout
      const initialized = await msalAuth.ensureInitialized();
      if (!initialized) {
        const error = 'MSAL initialization failed before logout';
        console.error(error);
        
        if (isMounted.current) {
          setState(prev => ({
            ...prev,
            loading: false,
            error,
          }));
        }
        
        return false;
      }
      
      await msalAuth.logout();
      
      // Only update state if component is mounted
      if (isMounted.current) {
        setState({
          isAuthenticated: false,
          user: null,
          loading: false,
          error: null,
        });
      }
      
      return true;
    } catch (error) {
      console.error('Logout error:', error);
      
      // Only update state if component is mounted
      if (isMounted.current) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: error.message || 'Logout failed',
        }));
      }
      
      return false;
    }
  };
  
  // Client-side token getter
  const getToken = async () => {
    try {
      // Dynamically import to avoid SSR issues
      const { msalAuth } = await import('../../lib/msalAuth');
      
      // Try to ensure MSAL is initialized before getting token
      const initialized = await msalAuth.ensureInitialized();
      if (!initialized) {
        console.error('MSAL initialization failed before getToken');
        return null;
      }
      
      return await msalAuth.getToken();
    } catch (error) {
      console.error('Get token error:', error);
      return null;
    }
  };
  
  // Create full context value with real implementation
  const contextValue = {
    ...state,
    login,
    logout,
    getToken,
  };
  
  // Pure client-side rendering
  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// Main AuthProvider component
export const AuthProvider = ({ children }) => {
  return (
    <AuthContext.Provider value={{ isAuthenticated: false, user: null, loading: false, error: null }}>
      <NoSSR fallback={<ServerAuthProvider>{children}</ServerAuthProvider>}>
        <ClientAuthProvider>
          {children}
        </ClientAuthProvider>
      </NoSSR>
    </AuthContext.Provider>
  );
};
