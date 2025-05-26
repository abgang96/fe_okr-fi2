import axios from 'axios';

const TENANT_ID = process.env.NEXT_PUBLIC_MICROSOFT_TENANT_ID;
const CLIENT_ID = process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID;
const CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET;
const REDIRECT_URI = process.env.NEXT_PUBLIC_REDIRECT_URI || 'http://localhost:3000/auth/microsoft-callback';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ message: 'Authorization code is required' });
    }

    console.log('Exchanging code for tokens...');

    // Exchange the authorization code for tokens with Microsoft
    const msTokenResponse = await axios.post(
      `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`,
      new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code: code,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
        scope: 'openid profile email User.Read'
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    if (!msTokenResponse.data.access_token) {
      console.error('No access token in Microsoft response:', msTokenResponse.data);
      return res.status(400).json({
        message: 'Microsoft token exchange failed',
        error: 'No access token received'
      });
    }

    console.log('Microsoft token exchange successful, fetching user info...');

    // Get user info from Microsoft Graph
    const userResponse = await axios.get('https://graph.microsoft.com/v1.0/me', {
      headers: {
        Authorization: `Bearer ${msTokenResponse.data.access_token}`,
      },
    });

    console.log('User info fetched, exchanging token with backend...');

    // Primary backend endpoint for token exchange
    try {
      console.log('Attempting backend token exchange...');
      const backendTokenResponse = await axios.post(
        `${API_BASE_URL}/api/auth/auth/`,
        {
          token: msTokenResponse.data.access_token,
          email: userResponse.data.mail || userResponse.data.userPrincipalName,
          name: userResponse.data.displayName,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );

      if (!backendTokenResponse.data.tokens?.access) {
        console.error('Invalid backend response:', backendTokenResponse.data);
        return res.status(400).json({
          message: 'Backend token exchange failed',
          error: 'Invalid token response format'
        });
      }

      console.log('Backend token exchange successful:', backendTokenResponse.data);
      // Return both Microsoft and backend tokens
      return res.status(200).json({
        tokens: {
          access: backendTokenResponse.data.tokens.access,
          refresh: backendTokenResponse.data.tokens.refresh,
          microsoft_token: msTokenResponse.data.access_token
        },
        user: {
          ...userResponse.data,
          ...backendTokenResponse.data.user
        }
      });
    } catch (backendError) {
      console.error('Backend token exchange failed:', {
        status: backendError.response?.status,
        data: backendError.response?.data,
        error: backendError.message
      });

      // If backend fails, return proper error
      return res.status(backendError.response?.status || 500).json({
        message: 'Backend token exchange failed',
        error: backendError.response?.data?.error || backendError.message
      });
    }
  } catch (error) {
    console.error('Token exchange error:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });

    return res.status(error.response?.status || 500).json({
      message: 'Token exchange failed',
      error: error.response?.data || error.message,
    });
  }
}
