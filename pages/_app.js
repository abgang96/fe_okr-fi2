import '../styles/globals.css';
import '../styles/header.css';
import '../styles/okr-tree.css';
import { AuthProvider } from '../components/auth/AuthProvider';
import { AuthAPIClientLoader } from '../lib/apiAuthConfig';
import React, { useEffect } from 'react';
import NoSSR from '../components/auth/NoSSR';
import { useRouter } from 'next/router';

// Component to initialize MSAL as early as possible and handle redirects
const MsalInitializer = () => {
  const [initStatus, setInitStatus] = React.useState('waiting');
  const router = useRouter();
  
  useEffect(() => {
    // Skip handling redirects on the callback page itself
    const isCallbackPage = router.pathname.includes('/auth/microsoft-callback');
    const isTestAuth = router.pathname === '/test-auth';
    
    const initMsal = async () => {
      try {
        setInitStatus('initializing');
        
        // Check if we just logged out (from query parameter)
        const justLoggedOut = router.query.loggedout === 'true';
        
        // If we're on the test-auth page and just logged out, don't auto-redirect
        if (isTestAuth && justLoggedOut) {
          console.log("Just logged out on test-auth page, skipping auto-redirect");
          setInitStatus('skipped-after-logout');
          return;
        }
        
        // Dynamic import to avoid SSR issues
        const { msalAuth } = await import('../lib/msalAuth');
        
        console.log("Pre-initializing MSAL from _app.js");
        const success = await msalAuth.ensureInitialized();
        
        if (success) {
          console.log("MSAL pre-initialization complete");
          setInitStatus('success');
          
          // Handle redirect if we're not on the callback page
          if (!isCallbackPage) {
            try {
              // Try to handle any pending redirects
              console.log("Checking for redirect response in _app.js");
              const response = await msalAuth.handleRedirectResponse();
              
              if (response && response.success) {
                console.log("Redirect handled successfully in _app.js");
                
                // If we're on test-auth page and user is authenticated,
                // and not just logged out, redirect to home
                if (isTestAuth && !justLoggedOut) {
                  console.log("On test-auth page with authenticated user, redirecting to home");
                  router.replace('/');
                }
              }
            } catch (redirectError) {
              console.error("Error handling redirect in _app.js:", redirectError);
            }
          }
        } else {
          console.error("MSAL pre-initialization failed");
          setInitStatus('failed');
        }
      } catch (e) {
        console.error("MSAL pre-initialization error:", e);
        setInitStatus('failed');
      }
    };
    
    // Start initialization on mount
    initMsal();
    
    // No cleanup needed - let initialization complete even if component unmounts
  }, [router.pathname, router.query]);
  
  // This component doesn't render anything visible
  return null;
};

/**
 * Main app component
 * Implements a strict separation between client and server rendering
 */
function MyApp({ Component, pageProps }) {
  return (
    <AuthProvider>
      {/* Auth API client loader - only runs on client */}
      <AuthAPIClientLoader />
      
      {/* Initialize MSAL early - only on client side */}
      <NoSSR>
        <MsalInitializer />
      </NoSSR>
      
      <div className="app-container">
        <Component {...pageProps} />
      </div>
    </AuthProvider>
  );
}

export default MyApp;