import '../styles/globals.css';
import '../styles/header.css';
import '../styles/okr-tree.css';
import '../styles/toggleStyles.css';
import '../styles/dropdown-portal.css';

import { AuthProvider } from '../components/auth/AuthProvider';
import { AuthAPIClientLoader } from '../lib/apiAuthConfig';

import React, { useEffect } from 'react';
import NoSSR from '../components/auth/NoSSR';
import { useRouter } from 'next/router';

// Component to initialize MSAL (without handling redirects here)
const MsalInitializer = () => {
const [initStatus, setInitStatus] = React.useState('waiting');
const router = useRouter();

useEffect(() => {
const initMsal = async () => {
try {
setInitStatus('initializing');

    const { msalAuth } = await import('../lib/msalAuth');

    console.log('Pre-initializing MSAL from _app.js...');
    const success = await msalAuth.ensureInitialized();

    if (success) {
      console.log('MSAL initialized');
      setInitStatus('success');
    } else {
      console.error('MSAL initialization failed');
      setInitStatus('failed');
    }
  } catch (e) {
    console.error('MSAL init error in _app.js:', e);
    setInitStatus('failed');
  }
};

initMsal();
}, []);

return null; // no UI
};

function MyApp({ Component, pageProps }) {
  return (
    <AuthProvider>
      <AuthAPIClientLoader />
      <NoSSR>
        <MsalInitializer />
      </NoSSR>
      <div className="app-container">
        <Component {...pageProps} />
      </div>
    </AuthProvider>
  );
}

export default MyApp;