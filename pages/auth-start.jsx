// pages/auth-start.jsx 
import { useEffect, useState } from 'react';
import { app, authentication } from '@microsoft/teams-js';

export default function AuthStart() {
  const [status, setStatus] = useState('Initializing authentication...');
  const [error, setError] = useState(null);
  useEffect(() => {
    const runAuth = async () => {
      try {
        setStatus('Initializing Teams SDK...');
        
        // Get platform info from URL if available
        const urlParams = new URLSearchParams(window.location.search);
        const platform = urlParams.get('platform') || 'unknown';
          console.log(`Auth start - Platform from URL: ${platform}`);
          // Check if we're in a Teams iframe first
        const isInTeamsIframe = window.self !== window.top;
        const isInTeamsPopup = window.opener && window.opener !== window;
        
        // Initialize the Teams SDK with a timeout
        const initializeWithTimeout = async () => {
          // Don't even try to initialize if not in Teams context to avoid the error
          if (!isInTeamsIframe && !isInTeamsPopup) {
            throw new Error('Not running in Teams context');
          }
          
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('SDK initialization timed out')), 15000);
          });
          
          return Promise.race([
            app.initialize(),
            timeoutPromise
          ]);
        };
        
        try {
          await initializeWithTimeout();
          setStatus('Teams SDK initialized');
        } catch (initError) {
          const isNoParentError = initError.message && initError.message.includes('No Parent window');
          const isNotInTeamsError = initError.message && initError.message.includes('Not running in Teams');
          
          if (isNoParentError || isNotInTeamsError) {
            console.log('Running outside of Teams environment - switching to web auth flow');
            setStatus('Running outside Teams - using web authentication');
          } else {
            console.warn(`Teams initialization failed: ${initError}. Proceeding with alternative authentication.`);
            setStatus('Teams initialization failed - trying alternative auth method');
          }
        }

        try {
          // Get client information to set approach - also with timeout
          const contextPromise = app.getContext();
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Context fetch timed out')), 5000);
          });
          
          const context = await Promise.race([contextPromise, timeoutPromise])
            .catch(err => {
              console.warn(`Context fetch failed or timed out: ${err}. Using default context.`);
              return { hostClientType: platform === 'Windows' ? 'desktop' : 'unknown' };
            });
            
          const clientType = context.hostClientType || 'unknown';
          setStatus(`Client detected: ${clientType} on ${platform}. Getting token...`);
            // Try to silently get token from Microsoft Teams with platform-specific settings
          const authParams = {
            resources: [window.location.origin]
          };
          
          // Platform-specific handling
          if (platform === 'macOS') {
            authParams.claims = JSON.stringify({
              access_token: {
                safari_compatibility: { essential: true }  // Custom claim to help with Safari
              }
            });
          } else if (platform === 'Windows') {
            // Windows-specific auth params if needed
            console.log('Using Windows-specific auth parameters');
            authParams.claims = JSON.stringify({
              access_token: {
                windows_compatibility: { essential: true }  // Custom claim for Windows
              }
            });
          }
          
          // Create a promise that times out after 20 seconds
          const authTimeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Token acquisition timed out')), 20000);
          });
          
          // Race the auth token acquisition against the timeout
          const token = await Promise.race([
            authentication.getAuthToken(authParams),
            authTimeoutPromise
          ]);
          
          setStatus('Authentication successful');
          console.log('Token obtained successfully');
          
          // Send token back to main window
          authentication.notifySuccess(token);
        } catch (tokenError) {
          setStatus(`Error getting token (${platform}), trying backup approach...`);
          console.error('Failed to get token:', tokenError);
          
          // Try fallback approach for specific errors
          if (tokenError.errorCode && 
             (tokenError.errorCode === 'consent_required' || 
              tokenError.errorCode === 'user_consent_pending' || 
              tokenError.errorCode === '500')) {
              try {
              // Get platform info from URL if available
              const urlParams = new URLSearchParams(window.location.search);
              const platform = urlParams.get('platform') || 'unknown';
              
              setStatus(`Requesting user consent for ${platform}...`);
              
              // Adjust popup dimensions for macOS - larger size helps prevent popup issues
              const popupWidth = platform === 'macOS' ? 800 : 600;
              const popupHeight = platform === 'macOS' ? 650 : 535;
              
              // Try to get a new token with fresh consent
              const consentToken = await authentication.authenticate({
                url: window.location.href,
                width: popupWidth,
                height: popupHeight
              });
              
              setStatus('Authentication with consent successful');
              authentication.notifySuccess(consentToken);
            } catch (consentError) {
              // Special handling for macOS authentication errors
              const urlParams = new URLSearchParams(window.location.search);
              const platform = urlParams.get('platform') || 'unknown';
              
              if (platform === 'macOS') {
                setStatus('Retrying macOS authentication with fallback method...');
                
                try {
                  // Use alternative approach for macOS - try the callback-based version
                  await new Promise((resolve, reject) => {
                    authentication.authenticate({
                      url: window.location.href,
                      width: 900,  // Even wider for macOS fallback
                      height: 700, // Even taller for macOS fallback
                      successCallback: (token) => {
                        setStatus('macOS fallback authentication succeeded');
                        authentication.notifySuccess(token);
                        resolve(token);
                      },
                      failureCallback: (error) => {
                        setError(`macOS fallback authentication failed: ${error}`);
                        authentication.notifyFailure('Failed with macOS fallback');
                        reject(error);
                      }
                    });
                  });
                } catch (macError) {
                  setError(`Could not authenticate on macOS: ${macError.message || macError}`);
                  authentication.notifyFailure('Failed on all macOS authentication attempts');
                }
              } else {
                setError(`Could not authenticate with consent: ${consentError.message}`);
                authentication.notifyFailure('Failed to get token even with consent');
              }
            }
          } else {
            setError(`Authentication failed: ${tokenError.message}`);
            authentication.notifyFailure(tokenError.message || 'Token fetch failed');
          }
        }
      } catch (error) {
        setError(`Critical error: ${error.message}`);
        console.error('Failed to initialize or authenticate:', error);
        authentication.notifyFailure(error.message || 'Authentication failed');
      }
    };

    runAuth();
  }, []);

  return (
    <div style={{ textAlign: 'center', padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ marginBottom: '20px' }}>
        <img 
          src="/tor.png" 
          alt="App Logo" 
          style={{ height: '50px', width: 'auto', marginBottom: '10px' }} 
        />
        <h2 style={{ color: '#444', margin: '10px 0' }}>Signing you in...</h2>
      </div>
      
      <div style={{ 
        padding: '15px', 
        backgroundColor: '#f7f7f7', 
        borderRadius: '5px',
        marginBottom: '20px'
      }}>
        <p>{status}</p>
        
        {/* Progress indicator */}
        {!error && (
          <div style={{ 
            margin: '15px auto', 
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #3498db',
            borderRadius: '50%',
            width: '30px',
            height: '30px',
            animation: 'spin 2s linear infinite'
          }} />
        )}
      </div>
      
      {error && (
        <div style={{ 
          padding: '15px', 
          backgroundColor: '#fff3f3', 
          color: '#d32f2f',
          border: '1px solid #ffcdd2',
          borderRadius: '5px', 
          marginBottom: '20px'
        }}>
          <p><strong>Error:</strong> {error}</p>
          <p style={{ marginTop: '10px' }}>Please close this window and try again.</p>
        </div>
      )}
      
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
