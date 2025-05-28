import '../styles/globals.css';
import { useEffect, useState } from 'react';
import { useTeamsContext } from '../lib/teamsHelpers';
import teamsAuth from '../lib/teamsAuth';
import { configureApiAuth } from '../lib/teamsAuth';
import api from '../lib/api';

// Development environment flag
const isDevelopment = process.env.NODE_ENV === 'development';

function MyApp({ Component, pageProps }) {
  const { isTeams, context, loading: teamsLoading } = useTeamsContext();
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  // Initialize authentication
  useEffect(() => {
    const initAuth = async () => {
      // Check if we're already authenticated
      if (teamsAuth.checkAuth()) {
        setUser(teamsAuth.user);
        configureApiAuth();
        setAuthLoading(false);
        return;
      }
      
      // Handle development environment - bypass Teams auth
      if (isDevelopment && !isTeams) {
        console.log('Development environment detected. Authentication bypass available at /test-auth');
        
        // Optional: Create a development user for testing
        // Uncomment the following to automatically authenticate in development
        /*
        const devUser = {
          id: 'dev-user-id',
          username: 'dev-user',
          email: 'dev@example.com',
          department: 'Development'
        };
        setUser(devUser);
        */
      }
        // Only try Teams authentication if we're in Teams context
      if (isTeams && !teamsLoading && context) {
        try {
          const initialized = await teamsAuth.initialize();
          if (!initialized) {
            console.warn('Teams SDK initialization failed - continuing without Teams auth');
            setAuthLoading(false);
            return;
          }
          
          console.log('Teams client type:', context.hostClientType || 'unknown');
          const authenticatedUser = await teamsAuth.login();
          
          if (authenticatedUser) {
            console.log('Authentication successful');
            setUser(authenticatedUser);
            configureApiAuth();
          } else {
            console.error('Authentication failed - no user returned');
          }
        } catch (error) {
          console.error('Teams authentication failed:', error);
        }
      }
      
      setAuthLoading(false);
    };
    
    initAuth();
  }, [isTeams, teamsLoading, context]);
  
  // Show loading state while Teams is initializing
  if (teamsLoading || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="spinner-border animate-spin inline-block w-8 h-8 border-4 rounded-full text-blue-600" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2">Loading...</p>
        </div>
      </div>
    );
  }
  
  // Show auth warning in development mode
  if (isDevelopment && !user) {
    return (
      <>
        <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4 m-4">
          <p className="text-yellow-700">
            <strong>Development Mode:</strong> You're not authenticated. Visit <a href="/test-auth" className="underline">the test auth page</a> to authenticate, or continue as an unauthenticated user.
          </p>
        </div>
        <Component {...pageProps} user={user} isTeams={isTeams} teamsContext={context} />
      </>
    );
  }
  
  // Pass authentication details to all pages
  return <Component {...pageProps} user={user} isTeams={isTeams} teamsContext={context} />;
}

export default MyApp;