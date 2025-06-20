// Client ID and tenant ID from environment variables
const CLIENT_ID = process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID || "4f34222d-3d22-4855-9d70-6aa95971c511";
const TENANT_ID = process.env.NEXT_PUBLIC_MICROSOFT_TENANT_ID || '0f31460e-8f97-4bf6-9b20-fe837087ad59';
const REDIRECT_URI = process.env.NEXT_PUBLIC_REDIRECT_URI || 'http://localhost:3000/auth/microsoft-callback';

/**
 * This API route initiates the Microsoft login flow using authorization code flow
 * Works with Web app type registration (not SPA type)
 */
export default function handler(req, res) {
  try {
    // We only handle GET requests for login initiation
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Generate a simple state value to prevent CSRF attacks
    const state = Math.random().toString(36).substring(2, 15);
    
    // Parse the return URL from query param, or use default
    const returnUrl = req.query.returnUrl || '/';  // Default to home page
    
    // Build the Microsoft OAuth authorization URL
    const authUrl = new URL(`https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/authorize`);
    authUrl.searchParams.append('client_id', CLIENT_ID);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('redirect_uri', REDIRECT_URI);
    authUrl.searchParams.append('scope', 'User.Read profile openid email');
    authUrl.searchParams.append('state', JSON.stringify({ state, returnUrl }));
    authUrl.searchParams.append('prompt', 'select_account');
    
    // Redirect the user to the Microsoft login page
    res.redirect(authUrl.toString());
  } catch (error) {
    console.error('Login API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
