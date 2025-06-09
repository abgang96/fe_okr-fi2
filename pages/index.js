import Head from 'next/head';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import OKRTree from '../components/OKRTree';
import Header from '../components/Header';
import { api } from '../lib/api';

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      if (typeof window === 'undefined') {
        return;
      }

      try {
        // Get authentication data from localStorage
        const token = localStorage.getItem('accessToken');
        const userStr = localStorage.getItem('user');
        const isAuth = localStorage.getItem('isAuthenticated');

        if (!token || !userStr || isAuth !== 'true') {
          throw new Error('No valid authentication found');
        }

        try {
          // Parse user data and verify authentication
          const userData = JSON.parse(userStr);
          
          // Verify token with backend
          const response = await api.get('/api/auth/me/');
          
          if (!response.data) {
            throw new Error('Invalid authentication response');
          }

          // Update user data
          const updatedUser = {
            ...userData,
            ...response.data
          };

          setUser(updatedUser);
          setIsAuthenticated(true);
          localStorage.setItem('user', JSON.stringify(updatedUser));

        } catch (apiError) {
          console.error('API verification failed:', apiError);
          throw new Error('Failed to verify authentication');
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        localStorage.clear();
        window.location.replace('/test-auth');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, the useEffect will handle redirection
  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Head>
        <title>OKR Dashboard</title>
      </Head>
      <Header user={user} />      <main className="container mx-auto px-4 py-8 content-with-fixed-header">
        <OKRTree />
      </main>
    </div>
  );
}