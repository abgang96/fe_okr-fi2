import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import axios from 'axios';
import { app, authentication } from '@microsoft/teams-js';

export default function MacOSFallback() {
  const [status, setStatus] = useState('Initializing macOS fallback authentication...');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const runMacOSAuth = async () => {
      try {
        setStatus('Initializing Teams SDK...');
        
        // Try to initialize the Teams SDK
        try {
          await app.initialize();
          console.log('Teams SDK initialized successfully');
        } catch (initError) {
          console.error('Teams SDK initialization failed:', initError);
          setStatus('Teams SDK initialization failed. Using alternative approach...');
        }
        
        // Get a token directly from Teams using the callback style that works better on macOS
        setStatus('Requesting authentication token...');
        
        try {
          const token = await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error("Authentication timed out")), 60000);
            
            authentication.authenticate({
              url: window.location.origin + '/auth-start?fallback=true',
              width: 600,
              height: 535,
              successCallback: (result) => {
                clearTimeout(timeout);
                resolve(result);
              },
              failureCallback: (reason) => {
                clearTimeout(timeout);
                reject(new Error(reason || 'Authentication failed'));
              }
            });
          });
          
          setStatus('Token received, exchanging with backend...');
          
          // Send the token to our API endpoint for macOS fallback
          const response = await axios.post('/api/auth/microsoft/token', {
            teamsToken: token,
            isMacOS: true
          });
          
          if (response.data.tokens?.access) {
            setStatus('Authentication successful! Redirecting...');
            
            // Save auth data
            localStorage.setItem('accessToken', response.data.tokens.access);
            localStorage.setItem('refreshToken', response.data.tokens.refresh || '');
            localStorage.setItem('user', JSON.stringify(response.data.user));
            localStorage.setItem('isAuthenticated', 'true');
            
            // Redirect to home page
            setTimeout(() => {
              window.location.replace('/');
            }, 1000);
          } else {
            throw new Error('Invalid authentication response');
          }
        } catch (authError) {
          console.error('Authentication failed:', authError);
          setError(`Authentication failed: ${authError.message || 'Unknown error'}`);
        }
      } catch (error) {
        console.error('macOS fallback error:', error);
        setError(`Error: ${error.message || 'Unknown error'}`);
      } finally {
        setIsLoading(false);
      }
    };

    runMacOSAuth();
  }, []);

  return (
    <>
      <Head>
        <title>macOS Authentication - OKR Dashboard</title>
      </Head>
      
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <div className="text-center mb-6">
            <img 
              src="/tor.png" 
              alt="Logo" 
              className="h-12 mx-auto mb-4" 
            />
            <h1 className="text-2xl font-bold text-gray-800">macOS Authentication</h1>
            <p className="text-gray-600 mt-2">Special authentication flow for macOS Teams clients</p>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-md mb-6">
            <p className="text-gray-700">{status}</p>
            
            {isLoading && (
              <div className="flex justify-center mt-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            )}
            
            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}
          </div>
          
          {!isLoading && error && (
            <div className="text-center">
              <button 
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
              <p className="mt-4 text-sm text-gray-500">
                If you continue to experience issues, please try opening the app in Microsoft Teams on another device.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
