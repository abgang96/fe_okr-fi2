import Head from 'next/head';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import OKRTree from '../components/OKRTree';
import Header from '../components/Header';
import { api } from '../lib/api';
import { useAuth } from '../components/auth/AuthProvider';

export default function Home() {
  const [isLoading, setIsLoading] = useState(true);
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Wait for auth to complete loading
        if (authLoading) {
          return;
        }

        // If not authenticated, redirect to test-auth
        if (!isAuthenticated || !user) {
          router.push('/test-auth');
          return;
        }
        
        // Auth verification successful
        setIsLoading(false);
      } catch (error) {
        console.error('Auth check failed:', error);
        router.push('/test-auth');
      }
    };
    
    checkAuth();
  }, [isAuthenticated, user, authLoading, router]);

  // Show loading state while auth is being checked
  if (isLoading || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4 mx-auto"></div>
          <p>Loading application...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Head>
        <title>OKR Tree</title>
        <meta name="description" content="OKR Management Application" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Header user={user} />

      <main className="container mx-auto px-4 py-6">
        <OKRTree />
      </main>
    </div>
  );
}