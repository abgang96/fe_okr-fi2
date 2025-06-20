import React from 'react';
import NoSSR from './NoSSR';

/**
 * This is a wrapper component that renders MSAL provider only on client-side.
 * The actual MSAL provider is loaded and rendered dynamically.
 */
const MSALClientSideProviderInner = ({ children }) => {
  const [msalInstance, setMsalInstance] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  
  // Initialize MSAL on client-side only
  React.useEffect(() => {
    const initMsal = async () => {
      try {
        // Import dependencies on demand
        const { PublicClientApplication } = await import('@azure/msal-browser');
        const { msalConfig } = await import('../../lib/msalConfig');
        
        // Initialize MSAL instance
        const instance = new PublicClientApplication(msalConfig);
        setMsalInstance(instance);
        setLoading(false);
      } catch (error) {
        console.error('MSAL initialization error:', error);
        setError(error);
        setLoading(false);
      }
    };
    
    initMsal();
  }, []);
  
  // If still loading, show nothing
  if (loading) {
    return null;
  }
  
  // If there was an error, show error message
  if (error) {
    return (
      <div className="text-red-500">
        Error initializing Microsoft authentication: {error.message}
      </div>
    );
  }
  
  // Load MsalProvider only when instance is available
  if (msalInstance) {
    // Dynamic import and render
    const MsalProvider = require('@azure/msal-react').MsalProvider;
    return <MsalProvider instance={msalInstance}>{children}</MsalProvider>;
  }
  
  // Fallback
  return <>{children}</>;
};

// Export with NoSSR wrapper
const MSALClientSideProvider = ({ children }) => {
  return (
    <NoSSR>
      <MSALClientSideProviderInner>{children}</MSALClientSideProviderInner>
    </NoSSR>
  );
};

export default MSALClientSideProvider;
