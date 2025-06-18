import { useState, useEffect } from 'react';
import { app, pages } from '@microsoft/teams-js';

/**
 * Initialize Microsoft Teams SDK
 * Now handles the case when running outside of Teams environment
 */
export const initializeTeams = async () => {
  try {
    // Check if we're running in a browser environment
    if (typeof window === 'undefined') {
      return false;
    }
    
    // Check if we're running within an iframe (likely Teams)
    const isInIframe = window.self !== window.top;
    
    if (isInIframe) {
      // Likely in Teams, try to initialize
      await app.initialize();
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