import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import NoSSR from '../../components/auth/NoSSR';
import Head from 'next/head';

// Safe localStorage access with try-catch
const safeLocalStorage = {
  getItem: (key) => {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.error('localStorage.getItem error:', e);
      return null;
    }
  },
  removeItem: (key) => {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.error('localStorage.removeItem error:', e);
    }
  }
};

// Server-side placeholder - just shows a loading screen
const ServerContent = () => (
  <div className="flex flex-col items-center justify-center min-h-screen p-5">
    <Head>
      <title>Authentication in progress...</title>
    </Head>
    <div className="text-2xl mb-4">Authenticating...</div>
    <div className="w-16 h-16 border-t-4 border-blue-500 border-solid rounded-full animate-spin"></div>
  </div>
);

// Client-side handler
const ClientCallback = () => {
  const router = useRouter();
  const [status, setStatus] = useState('Processing your login...');
  const [error, setError] = useState(null);
  const [warning, setWarning] = useState(null);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    // Track mount state to prevent state updates after unmount
    let isMounted = true;
    
    const processRedirect = async () => {
      try {
        // Check for errors in URL
        const urlParams = new URLSearchParams(window.location.search);
        const urlError = urlParams.get('error');
        const urlErrorDescription = urlParams.get('error_description');
        
        if (urlError) {
          console.error('Auth error in URL:', urlError, urlErrorDescription);
          if (isMounted) {
            setStatus('Authentication failed');
            setError(urlErrorDescription || urlError);
          }
          
          setTimeout(() => {
            if (isMounted) router.replace('/test-auth');
          }, 1500);
          return;
        }
        
        // Import msalAuth dynamically to avoid SSR issues
        const { msalAuth } = await import('../../lib/msalAuth');
        
        if (isMounted) setStatus('Completing Microsoft authentication...');
        
        // Process the code in the URL
        console.log('Processing authentication code');
        const result = await msalAuth.handleRedirectResponse();
        console.log('Code processed:', result);
        
        if (result.success) {
          if (isMounted) {
            setStatus('Authentication successful! Redirecting to home page...');
            setRedirecting(true);
            
            // Immediate redirect to home page (/) on successful authentication
            router.replace('/');
          }
        } else if (result.type && result.type === 'warning') { 
          if (isMounted) {
            setStatus('Authentication in progress...');
            setWarning(result.error || 'Failed to authenticate with Microsoft');
          }
          
          // Redirect back to login page after a delay
          setTimeout(() => {
            if (isMounted) router.replace('/test-auth');
          }, 1500);

        }
        else {
          if (isMounted) {
            setStatus('Authentication failed');
            setError(result.error || 'Failed to authenticate with Microsoft');
          }
          
          // Redirect back to login page after a delay
          setTimeout(() => {
            if (isMounted) router.replace('/test-auth');
          }, 1500);
        }
      } catch (error) {
        console.error('Error processing redirect:', error);
        
        if (isMounted) {
          setStatus('Authentication error');
          setError(error.message || 'An unexpected error occurred');
        }
        
        // Redirect back to login page after a delay
        setTimeout(() => {
          if (isMounted) router.replace('/test-auth');
        }, 1500);
      }
    };

    processRedirect();
    
    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false;
    };
  }, [router]);

  
  
  //  useEffect(() => {
  //   let isMounted = true;

  //   const processRedirect = async () => {
  //     try {
  //       // If we've already processed this session, skip re-processing
  //       if (sessionStorage.getItem('authProcessed') === 'true') {
  //         console.log('Auth already processed, skipping...');
  //         router.replace('/');
  //         return;
  //       }

  //       // Parse error params from URL
  //       const urlParams = new URLSearchParams(window.location.search);
  //       const urlError = urlParams.get('error');
  //       const urlErrorDescription = urlParams.get('error_description');

  //       if (urlError) {
  //         console.error('Auth error in URL:', urlError, urlErrorDescription);
  //         if (isMounted) {
  //           setStatus('Authentication failed');
  //           setError(urlErrorDescription || urlError);
  //         }

  //         return setTimeout(() => {
  //           if (isMounted) router.replace('/test-auth');
  //         }, 1500);
  //       }

  //       // Dynamically import to avoid SSR crash
  //       const { msalAuth } = await import('../../lib/msalAuth');

  //       if (isMounted) setStatus('Completing Microsoft authentication...');

  //       const result = await msalAuth.handleRedirectResponse();
  //       console.log('Code processed:', result);

  //       if (result.success) {
  //         if (isMounted) {
  //           setStatus('Authentication successful! Redirecting...');
  //           sessionStorage.setItem('authProcessed', 'true');
  //           setRedirecting(true);
  //           router.replace('/');
  //         }
  //       } else if (result.type === 'warning') {
  //         if (isMounted) {
  //           setStatus('Authentication warning...');
  //           setWarning(result.error || 'Microsoft login issue');
  //         }
  //         return setTimeout(() => {
  //           if (isMounted) router.replace('/test-auth');
  //         }, 1500);
  //       } else {
  //         if (isMounted) {
  //           setStatus('Authentication failed');
  //           setError(result.error || 'Could not complete Microsoft sign-in');
  //         }
  //         return setTimeout(() => {
  //           if (isMounted) router.replace('/test-auth');
  //         }, 1500);
  //       }
  //     } catch (err) {
  //       console.error('Redirect processing error:', err);
  //       if (isMounted) {
  //         setStatus('Authentication error');
  //         setError(err?.message || 'Unexpected error occurred');
  //       }
  //       return setTimeout(() => {
  //         if (isMounted) router.replace('/test-auth');
  //       }, 1500);
  //     }
  //   };

  //   processRedirect();

  //   return () => {
  //     isMounted = false;
  //   };
  //  }, [router]);
  
  
  // return (
  //   <div className="flex flex-col items-center justify-center min-h-screen p-5">
  //     <Head>
  //       <title>Authentication in progress...</title>
  //     </Head>
  //     <div className="text-2xl mb-4">{String(status)}</div>
  //     {!error && (
  //       <div className="w-16 h-16 border-t-4 border-blue-500 border-solid rounded-full animate-spin"></div>
  //     )}
  //     {error && (
  //       <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
  //         {String(error)}
  //       </div>
  //     )}
  //     {warning && (
  //       <div className="mt-4 p-4 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
  //         {String(warning)}
  //       </div>
  //     )}
  //   </div>
  // );
  
  return (
      <div className="flex flex-col items-center justify-center min-h-screen p-5">
        <Head>
          <title>Authentication in progress...</title>
        </Head>

        <div className="text-2xl mb-4">{String(status)}</div>

        {!error && !warning && (
          <div className="w-16 h-16 border-t-4 border-blue-500 border-solid rounded-full animate-spin" />
        )}

        {error && (
          <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {String(error)}
          </div>
        )}

        {warning && (
          <div className="mt-4 p-4 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
            {String(warning)}
          </div>
        )}
      </div>
    );

};


// Main component with SSR safety
const MicrosoftCallback = () => {
  return (
    <NoSSR fallback={<ServerContent />}>
      <ClientCallback />
    </NoSSR>
  );
};

export default MicrosoftCallback;