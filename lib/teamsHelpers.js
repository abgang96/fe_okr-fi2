import { useState, useEffect, createContext, useContext } from 'react';
import React from 'react';

// Create Teams context
export const TeamsContext = createContext({
  isTeams: false,
  context: null,
  initialized: false,
  loading: true,
  error: null,
});

/**
 * Initialize Microsoft Teams SDK - client-side only
 */
export const initializeTeams = async () => {
  try {
    // Check if we're running in a browser environment
    if (typeof window === 'undefined') {
      return false;
    }
    
    // Dynamically import the Teams SDK to avoid SSR issues
    const teamsJs = await import('@microsoft/teams-js');
    
    // Check if we're running within an iframe (likely Teams)
    const isInIframe = window.self !== window.top;
    
    if (isInIframe) {
      // Likely in Teams, try to initialize
      await teamsJs.app.initialize();
      return true;
    } else {
      // Not in Teams, return false without throwing an error
      console.log('Not running in Teams context - SDK initialization skipped');
      return false;
    }
  } catch (error) {
    // Some other initialization error occurred
    console.error('Error initializing Microsoft Teams SDK:', error);
    return false;
  }
};

/**
 * Get the current Teams context - client-side only
 */
export const getTeamsContext = async () => {
  try {
    // Check if we're running in a browser environment
    if (typeof window === 'undefined') {
      return null;
    }
    
    // Dynamically import the Teams SDK to avoid SSR issues
    const teamsJs = await import('@microsoft/teams-js');
    
    const context = await teamsJs.app.getContext();
    return context;
  } catch (error) {
    console.error('Error getting Teams context:', error);
    return null;
  }
};

/**
 * Teams Context Provider component
 */
export const TeamsContextProvider = ({ children }) => {
  const [state, setState] = useState({
    isTeams: false,
    context: null,
    initialized: false,
    loading: true,
    error: null,
  });
  
  const [isMounted, setIsMounted] = useState(false);
  
  // Client-side only effect
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  // Initialize Teams SDK
  useEffect(() => {
    if (!isMounted) return;
    
    const init = async () => {
      try {
        const initialized = await initializeTeams();
        
        if (initialized) {
          const context = await getTeamsContext();
          
          setState({
            isTeams: true,
            context,
            initialized,
            loading: false,
            error: null,
          });
        } else {
          setState({
            isTeams: false,
            context: null,
            initialized: false,
            loading: false,
            error: null,
          });
        }
      } catch (error) {
        console.error('Teams initialization error:', error);
        setState({
          isTeams: false,
          context: null,
          initialized: false,
          loading: false,
          error: error.message,
        });
      }
    };
    
    init();
  }, [isMounted]);
  
  return (
    <TeamsContext.Provider value={state}>
      {children}
    </TeamsContext.Provider>
  );
};

/**
 * Custom hook to use Teams context
 */
export const useTeamsContext = () => {
  const context = useContext(TeamsContext);
  
  if (!context) {
    // Default values if used outside provider
    return {
      isTeams: false,
      context: null,
      initialized: false,
      loading: typeof window !== 'undefined',
      error: 'useTeamsContext used outside of TeamsContextProvider',
    };
  }
  
  return context;
};