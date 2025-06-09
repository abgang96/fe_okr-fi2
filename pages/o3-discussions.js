import { useState, useEffect } from 'react';
import Head from 'next/head';
import { app } from '@microsoft/teams-js';
import Header from '../components/Header';
import DiscussionsList from '../components/discussions/DiscussionsList';
import LoginForm from '../components/auth/LoginForm';
import api from '../lib/api';

export default function O3DiscussionsPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isTeamsContext, setIsTeamsContext] = useState(false);

  useEffect(() => {
    // Check if we're running in Teams
    const checkTeamsContext = async () => {
      try {
        if (typeof window !== 'undefined') {
          // Only run in browser environment
          const context = await app.getContext();
          setIsTeamsContext(!!context);
        }
      } catch (error) {
        console.log('Not running in Teams context');
        setIsTeamsContext(false);
      }
    };    // Check authentication status
    const checkAuth = () => {
      // Check for access token and user data
      const token = localStorage.getItem('accessToken');
      const userData = localStorage.getItem('user');
      
      if (token && userData) {
        // User is authenticated
        setIsAuthenticated(true);
        // Parse and set user data from localStorage
        setUser(JSON.parse(userData));
        
        // Fetch task challenges
        fetchChallenges();
      } else {
        setLoading(false);
      }
    };

    checkTeamsContext();
    checkAuth();
  }, []);

  const fetchChallenges = async () => {
    try {
      setLoading(true);
      const challengesData = await api.getTaskChallenges();
      setChallenges(challengesData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching task challenges:', error);
      setLoading(false);
    }
  };

  const handleLogin = (credentials) => {
    // This is a placeholder for actual login logic
    console.log('Logging in with:', credentials);
    // Mock successful login
    localStorage.setItem('auth_token', 'mock_token');
    setIsAuthenticated(true);
    setUser({ name: credentials.username, email: `${credentials.username}@example.com` });
    
    // Fetch challenges after login
    fetchChallenges();
  };
  
  const handleChallengeAdded = (newChallenge) => {
    // Update the challenges list with the newly added challenge
    setChallenges(prevChallenges => [...prevChallenges, newChallenge]);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Head>
        <title>O3 Discussions | OKR Tree</title>
        <meta name="description" content="Manage task discussions and challenges" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Header 
        isAuthenticated={isAuthenticated} 
        user={user} 
        isTeamsContext={isTeamsContext} 
      />

      <main className="container mx-auto px-4 py-8 content-with-fixed-header">
        {!isAuthenticated ? (
          <LoginForm onLogin={handleLogin} />
        ) : loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-lg">Loading discussions...</div>
          </div>
        ) : (
          <DiscussionsList 
            challenges={challenges} 
            onChallengeAdded={handleChallengeAdded}
          />
        )}
      </main>
    </div>
  );
}