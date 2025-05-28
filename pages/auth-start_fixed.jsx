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
        
        // Initialize the Teams SDK
        await app.initialize();
        setStatus('Teams SDK initialized');

        try {
          // Get client information to set approach
          const context = await app.getContext();
          const clientType = context.hostClientType || 'unknown';
          setStatus(`Client detected: ${clientType}. Getting token...`);
          
          // Try to silently get token from Microsoft Teams
          const token = await authentication.getAuthToken({
            resources: [window.location.origin]
          });
          
          setStatus('Authentication successful');
          console.log('Token obtained successfully');
          
          // Send token back to main window
          authentication.notifySuccess(token);
        } catch (tokenError) {
          setStatus('Error getting token, trying backup approach...');
          console.error('Failed to get token:', tokenError);
          
          // Try fallback approach for specific errors
          if (tokenError.errorCode && 
             (tokenError.errorCode === 'consent_required' || 
              tokenError.errorCode === 'user_consent_pending' || 
              tokenError.errorCode === '500')) {
            
            try {
              setStatus('Requesting user consent...');
              // Try to get a new token with fresh consent
              const consentToken = await authentication.authenticate({
                url: window.location.href,
                width: 600,
                height: 535
              });
              
              setStatus('Authentication with consent successful');
              authentication.notifySuccess(consentToken);
            } catch (consentError) {
              setError(`Could not authenticate with consent: ${consentError.message}`);
              authentication.notifyFailure('Failed to get token even with consent');
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
