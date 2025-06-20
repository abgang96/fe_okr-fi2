import React, { useState, useEffect } from 'react';

/**
 * A component that only renders its children on the client side.
 * This ensures that components with browser-specific code or React hooks
 * don't execute during server-side rendering, preventing hydration issues.
 */
const NoSSR = ({ children, fallback = null }) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return isMounted ? children : fallback;
};

export default NoSSR;
