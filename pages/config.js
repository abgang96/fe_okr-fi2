import { useState, useEffect } from 'react';
import { app, pages } from '@microsoft/teams-js';
import Head from 'next/head';

export default function ConfigPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState();

  useEffect(() => {
    // Initialize Teams SDK
    const initialize = async () => {
      try {
        await app.initialize();
        
        // Register on save handler
        pages.config.registerOnSaveHandler(function(saveEvent) {
          const settings = {
            entityId: 'OKRTreeConfig',
            contentUrl: window.location.origin,
            suggestedDisplayName: 'OKR Tree'
          };
          
          pages.config.setConfig(settings);
          saveEvent.notifySuccess();
        });
        
        // Make save button clickable
        pages.config.setValidityState(true);
        
        setLoading(false);
      } catch (err) {
        setError(`Error initializing Teams SDK: ${err.message}`);
        setLoading(false);
      }
    };

    // Only initialize in browser environment
    if (typeof window !== 'undefined') {
      initialize();
    }
  }, []);

  if (loading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  if (error) {
    return <div className="flex h-screen items-center justify-center text-red-500">{error}</div>;
  }

  return (
    <div className="p-6">
      <Head>
        <title>OKR Tree - Configuration</title>
      </Head>
      
      <header className="mb-6">
        <h1 className="text-2xl font-bold">OKR Tree Configuration</h1>
      </header>
      
      <main>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <p className="mb-4">The OKR Tree app will be added to your team. Click Save to continue.</p>
          
          <p className="text-sm text-gray-500">
            This app allows you to visualize and manage your team's Objectives and Key Results in a tree structure.
          </p>
        </div>
      </main>
    </div>
  );
} 