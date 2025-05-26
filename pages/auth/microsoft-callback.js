import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function MicrosoftCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const { code, error, error_description } = router.query;

        if (error) {
          console.error('Microsoft auth error:', error, error_description);
          router.push('/auth/error?error=' + encodeURIComponent(error_description || error));
          return;
        }

        if (!code) {
          console.error('No auth code received from Microsoft');
          router.push('/auth/error?error=' + encodeURIComponent('No authorization code received'));
          return;
        }

        try {
          console.log('Exchanging authorization code for tokens...');

          // Exchange code for tokens
          const response = await fetch('/api/auth/microsoft/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code }),
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.message || data.error || response.statusText);
          }

          console.log('Token response received:', {
            hasTokens: !!data.tokens,
            hasUser: !!data.user,
            tokenTypes: data.tokens ? Object.keys(data.tokens) : [],
          });

          if (!data.tokens?.access) {
            console.error('Invalid token response:', data);
            throw new Error('No valid access token in response');
          }

          // Store authentication data
          try {
            //localStorage.clear(); // Clear any existing auth data

            // Store tokens
            localStorage.setItem('accessToken', data.tokens.access);
            if (data.tokens.refresh) {
              localStorage.setItem('refreshToken', data.tokens.refresh);
            }
            if (data.tokens.microsoft_token) {
              localStorage.setItem('microsoftToken', data.tokens.microsoft_token);
            }

            // Store user data if available
            if (data.user) {
              localStorage.setItem('user', JSON.stringify(data.user));
            }

            localStorage.setItem('isAuthenticated', 'true');

            // Verify storage was successful
            const storedToken = localStorage.getItem('accessToken');
            if (!storedToken) {
              throw new Error('Failed to store authentication data');
            }

            // Redirect to home page
            console.log('Authentication successful, redirecting...');
            window.location.replace('/');
          } catch (storageError) {
            console.error('Storage error:', storageError);
            throw new Error('Failed to store authentication data: ' + storageError.message);
          }
        } catch (error) {
          console.error('Authentication error:', error);
          //localStorage.clear(); // Clean up any partial data
          router.push('/auth/error?error=' + encodeURIComponent(error.message || 'Authentication failed'));
        }
      } catch (error) {
        console.error('Callback handling error:', error);
        //localStorage.clear();
        router.push('/auth/error?error=' + encodeURIComponent('Failed to process authentication'));
      }
    };

    if (router.isReady) {
      handleCallback();
    }
  }, [router.isReady, router.query]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-xl font-semibold mb-4">Signing in...</h1>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
        <p className="mt-4 text-gray-600">Please wait while we complete your sign in</p>
      </div>
    </div>
  );
}