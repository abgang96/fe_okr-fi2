import { useState, useEffect } from 'react';
import { app, pages } from '@microsoft/teams-js';

/**
 * Initialize Microsoft Teams SDK
 * Enhanced with macOS compatibility and better error handling
 */
export const initializeTeams = async () => {
  try {
    // Get platform info
    const userAgent = window.navigator.userAgent;
    let platform = 'unknown';
    
    if (userAgent.indexOf('Windows') !== -1) platform = 'Windows';
    else if (userAgent.indexOf('Macintosh') !== -1) platform = 'macOS';
    else if (userAgent.indexOf('Android') !== -1) platform = 'Android';
    else if (userAgent.indexOf('iPhone') !== -1 || userAgent.indexOf('iPad') !== -1) platform = 'iOS';
    
    console.log(`Detected platform: ${platform}`);
    
    // Check if we're in an iframe (likely Teams)
    const isInIframe = window.self !== window.top;
    
    if (isInIframe) {
      try {
        console.log(`Initializing Teams SDK on ${platform}...`);
        
        // Prepare platform-specific initialization options
        let initOptions = {};
        
        // Windows Teams client needs special handling
        if (platform === 'Windows') {
          console.log('Using Windows-specific initialization options');
          initOptions = {
            frameContext: {
              contentUrl: window.location.origin,
              websiteUrl: window.location.origin
            },
            validateNativePlatformUnsupported: true,
            hostName: undefined, // Let Teams auto-detect
            disableAppWindowEvents: false, // Important for Windows
            enableLongRunningSdkCalls: true // Critical for Windows desktop client
          };
        }
        
        // Set a longer timeout for initialization (30 seconds)
        const initPromise = app.initialize(initOptions);
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error(`Teams SDK initialization timed out on ${platform}`)), 30000);
        });
        
        await Promise.race([initPromise, timeoutPromise]);
        console.log('Teams SDK initialized successfully');
        
        // Verify initialization by getting context
        try {
          const context = await app.getContext();
          console.log('Teams context obtained:', context?.app?.host?.name || 'Unknown host');
        } catch (contextError) {
          console.warn('Could not get Teams context but initialization succeeded:', contextError);
        }
        
        return true;
      } catch (initError) {
        // Check if the error is about "No Parent window"
        if (initError.message && initError.message.includes('No Parent window')) {
          console.log('Not running in Teams - this is normal when running in a browser');
          return false;
        }
        
        // For Windows & macOS, try a fallback initialization method
        if (platform === 'Windows' || platform === 'macOS') {
          console.log(`Trying fallback initialization for ${platform}...`);
          try {
            // More aggressive fallback options for desktop clients
            await app.initialize({
              // Minimal initialization for authentication only
              isFullScreen: false,
              enablePrint: false,
              enableLongRunningSdkCalls: true
            });
            console.log('Fallback initialization succeeded');
            return true;
          } catch (fallbackError) {
            console.error(`Fallback initialization failed on ${platform}:`, fallbackError);
            
            // Last resort - return true anyway and try to continue with auth
            // This sometimes works on Windows Teams client
            console.log('Proceeding with authentication despite initialization failure');
            return true;
          }
        }
        
        console.error(`Teams SDK initialization failed on ${platform}:`, initError);
        return false;
      }
    } else {
      console.log('Not in an iframe - likely not running in Teams');
      return false;
    }
  } catch (error) {
    console.error('Error in Teams initialization process:', error);
    return false;
  }
};

/**
 * Get the current Teams context
 */
export const getTeamsContext = async () => {
  try {
    const context = await app.getContext();
    return context;
  } catch (error) {
    console.error('Error getting Teams context:', error);
    return null;
  }
};

/**
 * Custom hook to detect if we're running in Teams
 */
export const useTeamsContext = () => {
  const [isTeams, setIsTeams] = useState(false);
  const [context, setContext] = useState(null);
  const [theme, setTheme] = useState('default');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        if (typeof window !== 'undefined') {
          // Only initialize in browser environment
          const isInIframe = window.self !== window.top;
          
          if (isInIframe) {
            // Likely in Teams, try to initialize
            const initialized = await initializeTeams();
            if (initialized) {
              const teamsContext = await getTeamsContext();
              setIsTeams(true);
              setContext(teamsContext);
              
              // Set theme
              if (teamsContext?.theme) {
                setTheme(teamsContext.theme);
              }
              
              // Register theme change handler
              app.registerOnThemeChangeHandler((newTheme) => {
                setTheme(newTheme);
              });
            }
          } else {
            // Not in Teams, set loading to false
            console.log('Not running in Teams context');
          }
        }
      } catch (error) {
        console.log('Not running in Teams context or initialization error');
      } finally {
        setLoading(false);
      }
    };
    
    init();
  }, []);

  return { isTeams, context, theme, loading };
};

/**
 * Register the config handler for configurable tabs
 */
export const registerTabConfigHandler = (contentUrl, websiteUrl, entityId, name) => {
  pages.config.registerOnSaveHandler((saveEvent) => {
    const settings = {
      entityId,
      contentUrl,
      websiteUrl,
      suggestedDisplayName: name
    };
    
    pages.config.setConfig(settings);
    saveEvent.notifySuccess();
  });
  
  // Enable the save button
  pages.config.setValidityState(true);
};

/**
 * Open a URL in a Teams task module (dialog)
 */
export const openTaskModule = async (url, title, width, height) => {
  try {
    const taskInfo = {
      url,
      title,
      width,
      height
    };
    
    await pages.tasks.startTask(taskInfo);
  } catch (error) {
    console.error('Error opening task module:', error);
  }
};

/**
 * Get theme class name based on Teams theme
 */
export const getThemeClassName = (theme) => {
  switch (theme) {
    case 'dark':
      return 'teams-dark-theme dark';
    case 'contrast':
      return 'teams-contrast-theme dark';
    case 'default':
    default:
      return 'teams-light-theme';
  }
};