import React, { useState } from 'react';
import api from '../../lib/api';
import axios from 'axios';
import { useRouter } from 'next/router';

// Constants for Microsoft OAuth
const TENANT_ID = process.env.NEXT_PUBLIC_MICROSOFT_TENANT_ID || '0f31460e-8f97-4bf6-9b20-fe837087ad59';
const MICROSOFT_AUTH_URL = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/authorize`;
const REDIRECT_URI = typeof window !== 'undefined' ? 
  `${window.location.origin}/auth/microsoft-callback` : 
  'http://localhost:3000/auth/microsoft-callback';

// API URL for backend calls
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Update these with your actual app registration values
const CLIENT_ID = process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID || '4f34222d-3d22-4855-9d70-6aa95971c511';

/**
 * Button component that initiates Microsoft OAuth sign-in flow
 */
const MicrosoftAuthButton = ({ onLoginStart, onLoginComplete, onError, redirectToHome = false }) => {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [debugInfo, setDebugInfo] = useState(null);
  const router = useRouter();

  const handleLogin = () => {
    try {
      setIsLoggingIn(true);
      if (onLoginStart) onLoginStart();
      
      // Build Microsoft OAuth URL with necessary parameters
      const authParams = new URLSearchParams({
        client_id: CLIENT_ID,
        response_type: 'code',
        redirect_uri: REDIRECT_URI,        scope: 'openid profile email User.Read',
        response_mode: 'query',  // Changed from 'fragment' to 'query'
        state: window.btoa(JSON.stringify({ returnUrl: window.location.origin })),
      });
      
      const authUrl = `${MICROSOFT_AUTH_URL}?${authParams.toString()}`;
      
      // Log the authentication configuration for debugging
      const debugData = {
        clientId: CLIENT_ID,
        tenantId: TENANT_ID,
        redirectUri: REDIRECT_URI,
        authUrl: authUrl
      };
      
      console.log('Microsoft Auth Config:', debugData);
      setDebugInfo(debugData);

      // Redirect to Microsoft login instead of opening a popup
      window.location.href = authUrl;
    } catch (error) {
      console.error('Error initiating Microsoft login :', error);
      setIsLoggingIn(false);
      if (onError) onError(error);
    }
  };
  
  return (
    <div>
      <button
        className="w-full flex items-center justify-center px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        onClick={handleLogin}
        disabled={isLoggingIn}
      >
        <svg className="w-5 h-5 mr-2" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
          <rect x="1" y="1" width="9" height="9" fill="#f25022" />
          <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
          <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
          <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
        </svg>
        {isLoggingIn ? 'Signing in...' : 'Sign in with Microsoft'}
      </button>
      
      {/* Debug info display - only visible during login */}
      {debugInfo && (
        <div className="mt-4 p-2 border border-gray-300 rounded text-xs bg-gray-50">
          <p className="font-semibold">Auth Debug Info:</p>
          <p><strong>Client ID:</strong> {debugInfo.clientId}</p>
          <p><strong>Tenant ID:</strong> {debugInfo.tenantId}</p>
          <p><strong>Redirect URI:</strong> {debugInfo.redirectUri}</p>
          <p className="mt-2 text-xs">Make sure this redirect URI is registered in your Azure app registration.</p>
        </div>
      )}
    </div>
  );
};

export default MicrosoftAuthButton;