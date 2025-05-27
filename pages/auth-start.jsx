// pages/auth-start.jsx
import { useEffect } from 'react';
import { app , authentication } from '@microsoft/teams-js';

export default function AuthStart() {
  useEffect(() => {
    const runAuth = async () => {
      try {
        // Initialize the Teams SDK
        await app.initialize();

        // Try to silently get token from Microsoft Teams
        const token = await authentication.getAuthToken();

        // Send token back to main window
        authentication.notifySuccess(token);
      } catch (error) {
        console.error('Failed to get Teams token:', error);
        authentication.notifyFailure(error.message || 'Token fetch failed');
      }
    };

    runAuth();
  }, []);

  return (
    <div style={{ textAlign: 'center', paddingTop: '100px' }}>
      <h2>Signing you in...</h2>
      <p>This window will close automatically.</p>
    </div>
  );
}
