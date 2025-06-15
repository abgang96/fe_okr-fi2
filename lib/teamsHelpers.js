import { useState, useEffect } from 'react';
import { app, pages } from '@microsoft/teams-js';

/**
 * Initialize Microsoft Teams SDK
 * Enhanced with macOS compatibility and better error handling
 */
export const initializeTeams = async () => {
  try {
    // Check if we're running in a browser environment
    if (typeof window === 'undefined') {
      return false;
    }
    
    // Detect platform and browser
    const userAgent = window.navigator.userAgent || '';
    let platform = 'unknown';
    let browser = 'unknown';
    
    // Platform detection
    if (window.navigator.platform) {
      if (window.navigator.platform.indexOf('Mac') !== -1) {
        platform = 'macOS';
      } else if (window.navigator.platform.indexOf('Win') !== -1) {
        platform = 'Windows';
      } else if (window.navigator.platform.indexOf('iPhone') !== -1 || 
                window.navigator.platform.indexOf('iPad') !== -1) {
        platform = 'iOS';
      } else if (userAgent.indexOf('Android') !== -1) {
        platform = 'Android';
      }
    }
    
    // Browser detection
    if (userAgent.indexOf('Safari') !== -1 && userAgent.indexOf('Chrome') === -1) {
      browser = 'Safari';
    } else if (userAgent.indexOf('Chrome') !== -1) {
      browser = 'Chrome';
    } else if (userAgent.indexOf('Firefox') !== -1) {
      browser = 'Firefox';
    }
    
    console.log(`Platform: ${platform}, Browser: ${browser}`);
    
    // Check if we're running within an iframe (likely Teams)
    const isInIframe = window.self !== window.top;
    
    if (isInIframe) {
      // Set initialization config options based on platform
      const initOptions = {};
        // Special handling for different platforms to ensure reliable authentication
      if (platform === 'macOS') {
        // Use more lenient frame context options for macOS
        initOptions.frameContext = {
          contentUrl: window.location.origin,
          websiteUrl: window.location.origin,
        };
      } else if (platform === 'Windows') {
        // Add Windows-specific initialization options
        initOptions.frameContext = {
          contentUrl: window.location.origin,
          websiteUrl: window.location.origin,
        };
        // Add additional Windows-specific settings if needed
      }
      
      // Try to initialize with appropriate options and a timeout
      try {
        // Create a promise that rejects after timeout
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Teams SDK initialization timed out')), 10000); // 10 seconds timeout
        });
        
        // Race the initialization against the timeout
        await Promise.race([
          app.initialize(initOptions),
          timeoutPromise
        ]);
        
        console.log(`Teams SDK initialized successfully on ${platform}`);
        return true;      } catch (initError) {
        console.warn(`Teams SDK initialization issue on ${platform}:`, initError);
        
        // Check if the error is about "No Parent window" - which means we're not actually in Teams
        if (initError.message && initError.message.includes('No Parent window')) {
          console.log('Detected "No Parent window" error - application is likely running outside of Teams');
          return false; // Return false without throwing the error
        }
        
        // For Windows, try a fallback initialization method
        if (platform === 'Windows') {
          try {
            console.log('Trying fallback initialization method for Windows...');
            await app.initialize();
            console.log('Fallback initialization succeeded');
            return true;
          } catch (fallbackError) {
            console.error('Fallback initialization also failed:', fallbackError);
            
            // Also check the fallback error for "No Parent window"
            if (fallbackError.message && fallbackError.message.includes('No Parent window')) {
              console.log('Detected "No Parent window" error in fallback - likely not in Teams');
              return false;
            }
            
            throw fallbackError;
          }
        }
        throw initError;
      }
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