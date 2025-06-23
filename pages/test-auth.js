import React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import NoSSR from '../components/auth/NoSSR';
import MicrosoftLoginButton from '../components/auth/MicrosoftLoginButton';
import TeamsAuthHandler from '../components/auth/TeamsAuthHandler';
import { useAuth } from '../components/auth/AuthProvider';

// Server-side placeholder
const ServerContent = () => (
  <div className="p-8">
    <Head>
      <title>Authentication Test</title>
    </Head>
    <h1 className="text-2xl font-bold mb-4">Authentication Test</h1>
    <div className="animate-pulse w-full h-40 bg-gray-200 rounded-md"></div>
  </div>
);

// Client-side implementation
// const ClientContent = () => {
//   const [status, setStatus] = React.useState("Initializing...");
//   const [userInfo, setUserInfo] = React.useState(null);
//   const [isLoading, setIsLoading] = React.useState(true);
//   const [isTeams, setIsTeams] = React.useState(false);
//   const [redirecting, setRedirecting] = React.useState(false);
//   const [justLoggedOut, setJustLoggedOut] = React.useState(false);
//   const router = useRouter();

//   // Get auth context using hook
//   const { user, isAuthenticated, loading, error, logout } = useAuth();

//   // Check URL parameters for logout flag
//   React.useEffect(() => {
//     const urlParams = new URLSearchParams(window.location.search);
//     if (urlParams.get('loggedout') === 'true') {
//       setJustLoggedOut(true);
      
//       // Remove the query parameter without page refresh
//       const newUrl = window.location.pathname;
//       window.history.replaceState({}, document.title, newUrl);
//     }
//   }, []);

//   // Check if we're running in Teams
//   React.useEffect(() => {
//     const isInIframe = window.self !== window.top;
//     setIsTeams(isInIframe);
//     setIsLoading(false);
//   }, []);

//   // Check authentication status and redirect if authenticated
//   React.useEffect(() => {
//     if (loading) return;
    
//     // If authenticated, not already redirecting, and not just logged out, redirect to home page
//     if (isAuthenticated && user && !redirecting && !justLoggedOut) {
//       console.log("User is authenticated, redirecting to home page");
//       setStatus("Authenticated. Redirecting to home page...");
//       setUserInfo(user);
//       setRedirecting(true);
      
//       // Redirect to home page
//       router.replace('/');
//       return;
//     }

//     // If just logged out or not authenticated, show status
//     if (!isAuthenticated && !loading) {
//       setStatus("Not authenticated");
//     }
//   }, [isAuthenticated, user, loading, redirecting, router, justLoggedOut]);
  
//   // Handle logout
//   const handleLogout = async () => {
//     try {
//       setIsLoading(true);
//       await logout();
//       setStatus("Logged out");
//       setUserInfo(null);
//       setJustLoggedOut(true);
//     } catch (error) {
//       console.error("Logout error:", error);
//     } finally {
//       setIsLoading(false);
//     }
//   };
  
//   return (
//     <div className="p-8">
//       <Head>
//         <title>Authentication Test</title>
//       </Head>
      
//       <h1 className="text-2xl font-bold mb-4">Authentication Test</h1>
      
//       <div className="mb-6 p-4 border rounded-md bg-gray-50">
//         <h2 className="font-bold mb-2">Status</h2>
//         <p className="mb-2">Authentication Status: <span className="font-medium">{status}</span></p>
//         <p className="mb-2">Environment: <span className="font-medium">{isTeams ? 'Microsoft Teams' : 'Browser'}</span></p>
//         {error && (
//           <p className="mb-2 text-red-600">Error: {error}</p>
//         )}
//       </div>
      
//       {isAuthenticated && userInfo ? (
//         <>
//           <div className="mb-6 p-4 border rounded-md bg-green-50">
//             <h2 className="font-bold mb-2">User Information</h2>
//             <pre className="bg-gray-100 p-2 rounded overflow-auto max-h-60">
//               {JSON.stringify(userInfo, null, 2)}
//             </pre>
//           </div>
          
//           <button
//             onClick={handleLogout}
//             disabled={isLoading}
//             className={`bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700 transition-colors ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
//           >
//             {isLoading ? 'Logging out...' : 'Logout'}
//           </button>
//         </>
//       ) : (
//         <div className="mb-6 p-4 border rounded-md">
//           <h2 className="font-bold mb-4">Login Options</h2>
          
//           {isTeams ? (
//             <div className="mb-4">
//               <p className="mb-2">Microsoft Teams environment detected.</p>
//               <TeamsAuthHandler />
//             </div>
//           ) : (
//             <div className="mb-4">
//               <p className="mb-2">Choose an authentication method:</p>
//               <MicrosoftLoginButton className="mt-2" />
//             </div>
//           )}
//         </div>
//       )}
//     </div>
//   );
// };

const ClientContent = () => {
  const [status, setStatus] = React.useState("Initializing...");
  const [userInfo, setUserInfo] = React.useState(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isTeams, setIsTeams] = React.useState(false);
  const [redirecting, setRedirecting] = React.useState(false);
  const [justLoggedOut, setJustLoggedOut] = React.useState(false);
  const [handledRedirect, setHandledRedirect] = React.useState(false);
  const router = useRouter();

  const { user, isAuthenticated, loading, error, logout } = useAuth();

  // Check URL parameters for logout flag
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('loggedout') === 'true') {
      setJustLoggedOut(true);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Detect if in Teams
  React.useEffect(() => {
    const isInIframe = window.self !== window.top;
    setIsTeams(isInIframe);
    setIsLoading(false);
  }, []);

  // Handle MSAL redirect response only once
  React.useEffect(() => {
    const runRedirectHandler = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const hasCodeOrError = urlParams.get('code') || urlParams.get('error');

      if (!handledRedirect && hasCodeOrError) {
        try {
          const { msalAuth } = await import('../lib/msalAuth');
          const result = await msalAuth.handleRedirectResponse();

          console.log("MSAL redirect handled:", result);
          setHandledRedirect(true);

          // Clean up URL after redirect
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch (e) {
          console.error("Error handling redirect:", e);
        }
      }
    };

    runRedirectHandler();
  }, [handledRedirect]);

  // Redirect if authenticated
  React.useEffect(() => {
    if (loading || redirecting || justLoggedOut) return;

    if (isAuthenticated && user) {
      console.log("User is authenticated, redirecting to home page");
      setStatus("Authenticated. Redirecting to home page...");
      setUserInfo(user);
      setRedirecting(true);
      router.replace('/');
    } else if (!isAuthenticated && !loading) {
      setStatus("Not authenticated");
    }
  }, [isAuthenticated, user, loading, redirecting, router, justLoggedOut]);

  // Logout handler
  const handleLogout = async () => {
    try {
      setIsLoading(true);
      await logout();
      setStatus("Logged out");
      setUserInfo(null);
      setJustLoggedOut(true);
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8">
      <Head>
        <title>Authentication Test</title>
      </Head>

      <h1 className="text-2xl font-bold mb-4">Authentication Test</h1>

      <div className="mb-6 p-4 border rounded-md bg-gray-50">
        <h2 className="font-bold mb-2">Status</h2>
        <p className="mb-2">Authentication Status: <span className="font-medium">{status}</span></p>
        <p className="mb-2">Environment: <span className="font-medium">{isTeams ? 'Microsoft Teams' : 'Browser'}</span></p>
        {error && (
          <p className="mb-2 text-red-600">Error: {error}</p>
        )}
      </div>

      {isAuthenticated && userInfo ? (
        <>
          <div className="mb-6 p-4 border rounded-md bg-green-50">
            <h2 className="font-bold mb-2">User Information</h2>
            <pre className="bg-gray-100 p-2 rounded overflow-auto max-h-60">
              {JSON.stringify(userInfo, null, 2)}
            </pre>
          </div>

          <button
            onClick={handleLogout}
            disabled={isLoading}
            className={`bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700 transition-colors ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {isLoading ? 'Logging out...' : 'Logout'}
          </button>
        </>
      ) : (
        <div className="mb-6 p-4 border rounded-md">
          <h2 className="font-bold mb-4">Login Options</h2>
            {isTeams ? (
            <div className="mb-4">
              <p className="mb-2">Microsoft Teams environment detected.</p>
              <TeamsAuthHandler />
            </div>
          ) : (
            <div className="mb-4">
              <p className="mb-2">Choose an authentication method:</p>
              <MicrosoftLoginButton className="mt-2" />
            </div>
          )}
        </div>
      )}
    </div>
  );
};


// Main component with NoSSR pattern
const TestAuth = () => {
  return (
    <NoSSR fallback={<ServerContent />}>
      <ClientContent />
    </NoSSR>
  );
};

export default TestAuth;