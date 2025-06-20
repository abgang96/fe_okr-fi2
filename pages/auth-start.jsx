// pages/auth-start.jsx 
import { useEffect, useState } from 'react';
import { app, authentication } from '@microsoft/teams-js';
import { PublicClientApplication, InteractionType } from "@azure/msal-browser";
import { msalConfig, loginRequest } from '../lib/msalConfig';
import { msalAuth } from '../lib/msalAuth';

export default function AuthStart() {
  const [status, setStatus] = useState('Initializing authentication...');
  const [error, setError] = useState(null);
  const [isMacOS, setIsMacOS] = useState(false);
  const [isInTeams, setIsInTeams] = useState(false);
  
  // Enhanced platform detection that works better in Teams
  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      const platform = navigator.platform || '';
      const userAgent = navigator.userAgent || '';
      // More comprehensive macOS detection
      const isMac = platform.toLowerCase().includes('mac') || 
                    userAgent.toLowerCase().includes('macintosh') ||
                    userAgent.toLowerCase().includes('mac os x');
      setIsMacOS(isMac);
      
      // Check if we're running in Teams
      const isInIframe = window.self !== window.top;
      setIsInTeams(isInIframe);
      
      console.log(`Platform detected: ${platform}, UserAgent: ${userAgent}, isMac: ${isMac}, inTeams: ${isInIframe}`);
    }
  }, []);

  useEffect(() => {
    const runAuth = async () => {
      try {
        if (isInTeams) {
          // Teams authentication flow
          setStatus('Initializing Teams SDK...');
          
          try {
            // Initialize the Teams SDK
            await app.initialize();
            setStatus('Teams SDK initialized');
            
            // Get client information
            const context = await app.getContext();
            const clientType = context.hostClientType || 'unknown';
            const osPlatform = isMacOS ? 'macOS' : 'other OS';
            setStatus(`Client detected: ${clientType} on ${osPlatform}. Getting token...`);
            
            // Get Teams SSO token
            const token = await authentication.getAuthToken();
            setStatus('Teams token acquired successfully');
            
            // Pass token back to parent/opener
            if (window.opener) {
              // For popup flow
              authentication.notifySuccess(token);
            } else {
              // For tab flow - redirect back with token
              window.location.href = `${window.location.origin}/test-auth?teamsToken=${encodeURIComponent(token)}`;
            }
          } catch (teamsError) {
            console.error('Teams authentication error:', teamsError);
            setError(`Teams auth error: ${teamsError.message}`);
            setStatus('Authentication failed');
            
            if (window.opener) {
              authentication.notifyFailure(teamsError.message);
            }
          }
        } else {
          // Standard browser authentication using MSAL
          setStatus('Starting MSAL authentication flow...');
          
          try {
            // Create a new MSAL instance for this page
            const msalInstance = new PublicClientApplication(msalConfig);
            
            // Set the active account if we have one
            const accounts = msalInstance.getAllAccounts();
            if (accounts.length > 0) {
              msalInstance.setActiveAccount(accounts[0]);
            }
            
            // Start login redirect flow
            await msalInstance.loginRedirect(loginRequest);
            // The page will redirect to Microsoft, so no more code will run here
          } catch (msalError) {
            console.error('MSAL authentication error:', msalError);
            setError(`Auth error: ${msalError.message}`);
            setStatus('Authentication failed');
          }
        }
      } catch (generalError) {
        console.error('General authentication error:', generalError);
        setError(`Error: ${generalError.message}`);
        setStatus('Authentication failed');
      }
    };
    
    // Start authentication process
    if (!error) {
      runAuth();
    }
  }, [isInTeams, isMacOS]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
      <h1 className="text-xl font-bold mb-4">Authentication In Progress</h1>
      <p className="mb-4">{status}</p>
      
      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-md mt-4 max-w-md">
          <h2 className="font-bold mb-2">Error</h2>
          <p>{error}</p>
        </div>
      )}
      
      <div className="mt-6">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
      </div>
    </div>
  );
}
