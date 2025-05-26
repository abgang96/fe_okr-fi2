import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import MicrosoftAuthButton from '../components/auth/MicrosoftAuthButton';
import { api } from '../lib/api';

const LoginPage = () => {
  const [authError, setAuthError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userInfo, setUserInfo] = useState(null);
  const router = useRouter();

  // Check if user is already authenticated
  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (typeof window === 'undefined') {
          return;
        }

        const token = localStorage.getItem('accessToken');
        const userStr = localStorage.getItem('user');
        const isAuth = localStorage.getItem('isAuthenticated');

        if (!token || !userStr || isAuth !== 'true') {
          setIsLoading(false);
          return;
        }

        try {
          // Verify the token is still valid
          const authCheck = await api.get('/api/auth/me/');

          if (authCheck.data) {
            const userData = JSON.parse(userStr);
            setIsAuthenticated(true);
            setUserInfo(userData);

            // Use replace to prevent back button from coming back to login
            window.location.replace('/');
            return;
          }
        } catch (error) {
          console.error('Auth verification failed:', error);
          localStorage.clear();
        }
      } catch (error) {
        console.error('Auth check error:', error);
        localStorage.clear();
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4">Checking authentication...</p>
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