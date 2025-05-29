import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import MicrosoftAuthButton from '../components/auth/MicrosoftAuthButton';
import { api } from '../lib/api';

import { app, authentication } from '@microsoft/teams-js';
import { useTeamsAuth } from '../lib/teamsAuth';

const LoginPage = () => {
  const [authError, setAuthError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userInfo, setUserInfo] = useState(null);
  const [authStatus, setAuthStatus] = useState("Checking authentication...");
  const router = useRouter();

  useEffect(() => {
    const runTeamsAuth = async () => {
      console.log("Starting authentication process");
      setAuthStatus("Initializing authentication...");
      
      // Check if we're in a Teams iframe
      const isInTeams = window.parent !== window.self;
      const isInTeamsPopup = window.opener && window.opener !== window;
      
      console.log("Environment check: In Teams?", isInTeams, "In popup?", isInTeamsPopup);
      
      // Special case for authentication popup window
      if (isInTeamsPopup) {
        try {
          setAuthStatus("Processing authentication popup...");
          await app.initialize();
          const token = await authentication.getAuthToken();
          console.log("Got auth token from popup");
          authentication.notifySuccess(token);
          setIsLoading(false);
        } catch (error) {
          console.error('Popup auth failed:', error);
          setAuthStatus(`Authentication popup failed: ${error.message || 'Unknown error'}`);
          authentication.notifyFailure(error.message || 'Popup authentication failed');
          setIsLoading(false);
        }
        return; // Don't run anything else in popup
      }
      
      // Main authentication flow
      try {
        setAuthStatus("Initializing Teams SDK...");
        
        // Try-catch for app.initialize() as it might fail in some environments
        try {
          await app.initialize();
          console.log("Teams SDK initialized successfully");
        } catch (initError) {
          console.log("Teams SDK initialization failed, continuing with standard auth:", initError);
        }
        
        // Check for existing authentication first
        const existingToken = localStorage.getItem('accessToken');
        const userStr = localStorage.getItem('user');
        
        if (existingToken && userStr) {
          try {
            setAuthStatus("Verifying existing authentication...");
            // Verify the token is still valid
            const authCheck = await api.get('/api/auth/me/');
            if (authCheck.data) {
              console.log("Existing authentication is valid");
              const userData = JSON.parse(userStr);
              setIsAuthenticated(true);
              setUserInfo(userData);
              setIsLoading(false);
              window.location.replace('/');
              return;
            }
          } catch (error) {
            console.log("Existing token validation failed, continuing with new authentication");
            localStorage.removeItem('accessToken');
            localStorage.removeItem('user');
          }
        }
        
        // Proceed with Teams authentication if in Teams
        if (isInTeams) {
          setAuthStatus("Authenticating with Teams...");
          let teamsAuthAttempted = false;
          
          try {
            // Set timeout to prevent infinite hanging
            const timeoutPromise = new Promise((_, reject) => {
              setTimeout(() => reject(new Error("Teams authentication timed out")), 10000);
            });
            
            // Race between the auth attempt and timeout
            const user = await Promise.race([
              useTeamsAuth(),
              timeoutPromise
            ]);
            
            teamsAuthAttempted = true;
            
            if (user) {
              console.log("Teams authentication successful:", user);
              setIsAuthenticated(true);
              setUserInfo(user);
              setIsLoading(false);
              window.location.replace('/');
              return;
            }
          } catch (error) {
            console.error('Teams authentication error:', error);
            setAuthStatus(`Teams auth failed: ${error.message}. Trying alternative method...`);
            
            // For specific error cases in desktop teams, try fallback authentication
            if (teamsAuthAttempted) {
              try {
                setAuthStatus("Trying authentication with popup...");
                await authentication.authenticate({
                  url: window.location.origin + "/auth-start",
                  width: 600,
                  height: 535
                });
                // If successful, the page will be redirected by the returned token processing
                return;
              } catch (popupError) {
                console.error('Popup authentication failed:', popupError);
                setAuthStatus(`Popup authentication failed: ${popupError.message}`);
              }
            }
          }
        }
        
        // If we reach here, Teams auth failed or we're not in Teams
        setAuthStatus("Ready for manual authentication");
        setIsAuthenticated(false);
        setIsLoading(false);
        
      } catch (error) {
        console.error('Authentication process error:', error);
        setAuthStatus(`Authentication error: ${error.message}`);
        setIsAuthenticated(false);
        setIsLoading(false);
      } finally {
        // Ensure loading state is cleared after a maximum timeout
        setTimeout(() => {
          if (isLoading) {
            console.log("Forcing end of loading state after timeout");
            setIsLoading(false);
            setAuthStatus("Authentication process timed out. Please try signing in manually.");
          }
        }, 15000);
      }
    };

    runTeamsAuth();
  }, [isLoading]);  // Adding isLoading as dependency to prevent re-runs during state updates

  // Handle successful login
  const handleLoginComplete = async (userData) => {
    try {
      setAuthError(null);
      setIsAuthenticated(true);
      setUserInfo(userData);

      // Verify we can still access protected endpoints
      await api.get('/api/auth/me/');

      // Redirect to home page
      window.location.replace('/');
    } catch (error) {
      console.error('Login verification failed:', error);
      handleLoginError(error);
    }
  };

  // Handle login error
  const handleLoginError = (error) => {
    console.error('Login error:', error);
    setAuthError(error.message || 'Authentication failed');
    setIsAuthenticated(false);
    localStorage.clear();
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4">{authStatus}</p>
          
          {/* Add a timeout message after 5 seconds */}
          {authStatus.includes("Checking") && (
            <div className="mt-4 text-sm text-gray-500 max-w-md">
              <p>If this takes longer than expected, you might need to:</p>
              <ul className="list-disc pl-5 mt-2 text-left">
                <li>Refresh the page</li>
                <li>Try opening the app in a browser tab</li>
                <li>Check your network connection</li>
              </ul>
              
              <button 
                onClick={() => setIsLoading(false)}
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
              >
                Continue to sign-in
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // If already authenticated, show redirecting state
  if (isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  // Show login page
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-blue-100">
      <Head>
        <title>Sign In - OKR Management</title>
      </Head>
      <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Sign in to OKR Management
            </h2>
            {authStatus && authStatus !== "Ready for manual authentication" && (
              <p className="mt-2 text-center text-sm text-gray-600">
                {authStatus}
              </p>
            )}
          </div>

          {authError && (
            <div className="rounded-md bg-red-50 p-4 mb-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Authentication Error
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{authError}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="mt-8 space-y-6">
            <MicrosoftAuthButton
              onLoginComplete={handleLoginComplete}
              onLoginError={handleLoginError}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;