import React from 'react';
import NoSSR from './NoSSR';
import { useAuth } from './AuthProvider';

// Client-side only button implementation
const ClientButton = ({ className, onLoginComplete }) => {
  const [isLoggingIn, setIsLoggingIn] = React.useState(false);
  const [error, setError] = React.useState(null);
  
  // Get auth context using hook
  const auth = useAuth();
  
  const handleLogin = async () => {
    try {
      setIsLoggingIn(true);
      setError(null);
      
      console.log("Starting login process from button");
      const result = await auth.login();
      console.log("Login result:", result);
      
      if (result?.success && onLoginComplete) {
        onLoginComplete(result.user);
      } else if (!result?.success) {
        setError(result?.error || 'Login failed');
      }
    } catch (error) {
      console.error('Login failed:', error);
      setError(error.message || 'Login failed');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="flex flex-col">
      <button
        onClick={handleLogin}
        disabled={isLoggingIn}
        className={`flex items-center justify-center gap-2 bg-[#2F2F2F] text-white py-2 px-4 rounded hover:bg-[#404040] transition-colors ${isLoggingIn ? 'opacity-70 cursor-not-allowed' : ''} ${className || ''}`}
      >
        {/* Microsoft logo */}
        <svg width="21" height="21" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
          <rect x="1" y="1" width="9" height="9" fill="#F25022"/>
          <rect x="1" y="11" width="9" height="9" fill="#00A4EF"/>
          <rect x="11" y="1" width="9" height="9" fill="#7FBA00"/>
          <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
        </svg>
        
        {isLoggingIn ? 'Signing in...' : 'Sign in with Microsoft'}
      </button>
      
      {error && (
        <div className="mt-2 text-sm text-red-500">
          Error: {error}
        </div>
      )}
    </div>
  );
};

// Server-side fallback/placeholder button (no functionality)
const ServerButton = ({ className }) => {
  return (
    <button
      disabled
      className={`flex items-center justify-center gap-2 bg-[#2F2F2F] text-white py-2 px-4 rounded opacity-70 cursor-not-allowed ${className || ''}`}
    >
      {/* Microsoft logo */}
      <svg width="21" height="21" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
        <rect x="1" y="1" width="9" height="9" fill="#F25022"/>
        <rect x="1" y="11" width="9" height="9" fill="#00A4EF"/>
        <rect x="11" y="1" width="9" height="9" fill="#7FBA00"/>
        <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
      </svg>
      
      Sign in with Microsoft
    </button>
  );
};

// Main component with NoSSR wrapper 
const MSALLoginButton = (props) => {
  return (
    <NoSSR fallback={<ServerButton {...props} />}>
      <ClientButton {...props} />
    </NoSSR>
  );
};

export default MSALLoginButton;
