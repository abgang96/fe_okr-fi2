import React from 'react';
import NoSSR from './NoSSR';
import { useAuth } from './AuthProvider';

/**
 * Client-side Teams auth handler implementation
 */
const ClientHandler = () => {
  const [status, setStatus] = React.useState('Initializing...');
  const [error, setError] = React.useState(null);
  
  // Get auth context using hook
  const auth = useAuth();
  
  React.useEffect(() => {
    const initTeamsAuth = async () => {
      try {
        setStatus('Initializing Teams authentication...');
        
        // Check if we're in Teams
        const isInIframe = window.self !== window.top;
        
        if (isInIframe) {
          setStatus('Teams environment detected. Authenticating...');
          
          // Import Teams SDK on demand (client-side only)
          try {
            const teamsJs = await import('@microsoft/teams-js');
            
            // Initialize Teams SDK
            await teamsJs.app.initialize();
            
            // Get Teams context
            const context = await teamsJs.app.getContext();
            console.log('Teams context:', context);
            
            // Attempt Teams SSO authentication through MSAL
            const result = await auth.login();
            
            if (result?.success) {
              setStatus('Teams authentication successful');
            } else {
              setError(`Authentication failed: ${result?.error || 'Unknown error'}`);
            }
          } catch (authError) {
            console.error('Teams auth error:', authError);
            setError(`Teams authentication error: ${authError.message}`);
          }
        } else {
          setStatus('Not running in Teams context');
        }
      } catch (err) {
        console.error('Teams auth initialization error:', err);
        setError(`Teams initialization error: ${err.message}`);
      }
    };
    
    initTeamsAuth();
  }, [auth]);
  
  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded my-4">
        <p className="font-bold">Authentication Error</p>
        <p>{error}</p>
      </div>
    );
  }
  
  return (
    <div className="text-gray-500 text-sm my-2">
      <p>{status}</p>
    </div>
  );
};

// Server-side placeholder component (does nothing)
const ServerHandler = () => {
  return (
    <div className="text-gray-500 text-sm my-2">
      <p>Initializing Teams authentication...</p>
    </div>
  );
};

// Main component with NoSSR wrapper
const TeamsAuthHandler = () => {
  return (
    <NoSSR fallback={<ServerHandler />}>
      <ClientHandler />
    </NoSSR>
  );
};

export default TeamsAuthHandler;
