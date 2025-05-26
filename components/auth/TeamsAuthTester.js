import { useState, useEffect } from 'react';
import teamsAuth from '../../lib/teamsAuth';
import api from '../../lib/api';

/**
 * Component for testing Teams authentication locally
 * This simulates the Teams SSO flow for local development
 */
const TeamsAuthTester = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState('');

  // Function to simulate Teams token and authenticate with backend
  const handleDirectAuth = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // This is a mock function that simulates getting a token from Teams
      // In real Teams environment, this would be done via teamsAuth.getTeamsToken()
      const response = await api.post('/api/auth/teams/', {
        // We're passing the access token directly instead of getting it from Teams
        token: accessToken
      });
      
      // Save authentication data
      const userData = response.data.user;
      const tokens = response.data.tokens;
      
      localStorage.setItem('accessToken', tokens.access);
      localStorage.setItem('refreshToken', tokens.refresh);
      localStorage.setItem('user', JSON.stringify(userData));
      
      setUser(userData);
    } catch (error) {
      console.error('Authentication error:', error);
      setError(error.response?.data?.error || error.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };
  
  // Use development authentication shortcut
  const handleDevAuth = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.post('/api/auth/teams/', {
        token: 'development'  // Special keyword for development mode
      });
      
      // Save authentication data
      const userData = response.data.user;
      const tokens = response.data.tokens;
      
      localStorage.setItem('accessToken', tokens.access);
      localStorage.setItem('refreshToken', tokens.refresh);
      localStorage.setItem('user', JSON.stringify(userData));
      
      setUser(userData);
    } catch (error) {
      console.error('Development authentication error:', error);
      setError(error.response?.data?.error || error.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  // Function to check current auth status
  const checkAuthStatus = () => {
    const token = localStorage.getItem('accessToken');
    const storedUser = localStorage.getItem('user');
    
    if (token && storedUser) {
      setUser(JSON.parse(storedUser));
      setAccessToken(token);
      return true;
    }
    
    return false;
  };

  // Function to logout
  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setUser(null);
    setAccessToken('');
  };
  
  // Check auth status on component mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  return (
    <div className="p-6 max-w-sm mx-auto bg-white rounded-xl shadow-md">
      <h2 className="text-xl font-bold mb-4">Teams Authentication Tester</h2>
      
      {user ? (
        <div className="mb-4">
          <h3 className="text-lg font-semibold">Authenticated User</h3>
          <p><strong>Username:</strong> {user.username}</p>
          <p><strong>Email:</strong> {user.email}</p>
          <p><strong>Department:</strong> {user.department || 'N/A'}</p>
          <p><strong>Job Title:</strong> {user.job_title || 'N/A'}</p>
          
          <button 
            onClick={handleLogout}
            className="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Logout
          </button>
        </div>
      ) : (
        <div>
          <div className="mb-6 p-4 bg-blue-100 rounded">
            <h3 className="font-medium mb-2">Quick Development Login</h3>
            <p className="text-sm mb-3">
              Use this option to quickly log in with a development account.
              No Microsoft Graph token needed.
            </p>
            <button 
              onClick={handleDevAuth}
              disabled={loading}
              className={`w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 ${
                loading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {loading ? 'Authenticating...' : 'Login as Dev User'}
            </button>
          </div>
          
          <div className="border-t pt-4">
            <h3 className="font-medium mb-2">Graph API Token Login</h3>
            <p className="mb-2 text-sm">
              To test Teams authentication with a real Graph API token:
            </p>
            
            <textarea
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              className="w-full p-2 border rounded mb-2"
              rows={5}
              placeholder="Paste Microsoft Graph API token here..."
            />
            
            <button 
              onClick={handleDirectAuth}
              disabled={loading || !accessToken}
              className={`w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 ${
                loading || !accessToken ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {loading ? 'Authenticating...' : 'Authenticate with Token'}
            </button>
          </div>
          
          {error && (
            <div className="mt-2 p-2 bg-red-100 text-red-700 rounded">
              Error: {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TeamsAuthTester;