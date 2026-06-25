import React, { useState, useEffect } from 'react';
import TopAppBar from './components/TopAppBar';
import BottomNavBar from './components/BottomNavBar';
import Dashboard from './pages/Dashboard';
import Documents from './pages/Documents';
import SecureUpload from './pages/SecureUpload';
import SecureViewer from './pages/SecureViewer';
import Login from './pages/Login';
import './App.css';

import ErrorBoundary from './components/ErrorBoundary';

function App() {
  const [currentScreen, setCurrentScreen] = useState('dashboard');
  const [authToken, setAuthToken] = useState(localStorage.getItem('secureshare_token') || null);
  const [selectedDocument, setSelectedDocument] = useState(null);

  const handleLogout = () => {
    localStorage.removeItem('secureshare_token');
    setAuthToken(null);
  };

  if (!authToken) {
    return (
      <ErrorBoundary>
        <Login setAuthToken={setAuthToken} />
      </ErrorBoundary>
    );
  }

  const renderScreen = () => {
    switch (currentScreen) {
      case 'dashboard': return <Dashboard authToken={authToken} />;
      case 'documents': return <Documents authToken={authToken} onViewDocument={(doc) => { setSelectedDocument(doc); setCurrentScreen('viewer'); }} />;
      case 'upload': return <SecureUpload authToken={authToken} setCurrentScreen={setCurrentScreen} />;
      case 'viewer': return <SecureViewer authToken={authToken} document={selectedDocument} onClose={() => setCurrentScreen('documents')} />;
      default: return <Dashboard authToken={authToken} />;
    }
  };

  const isViewer = currentScreen === 'viewer';

  return (
    <ErrorBoundary>
      <div className="app-layout">
        {!isViewer && <TopAppBar currentScreen={currentScreen} setCurrentScreen={setCurrentScreen} onLogout={handleLogout} />}
        
        <main className="main-content">
          {renderScreen()}
        </main>

        {!isViewer && <BottomNavBar currentScreen={currentScreen} setCurrentScreen={setCurrentScreen} />}

        {!isViewer && currentScreen !== 'upload' && (
          <button 
            className="fab" 
            onClick={() => setCurrentScreen('upload')}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>add</span>
          </button>
        )}

      <style>{`
        .app-layout {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
        }
        .main-content {
          flex-grow: 1;
        }
        .fab {
          position: fixed;
          right: 24px;
          bottom: 104px;
          width: 56px;
          height: 56px;
          background-color: var(--primary);
          color: white;
          border-radius: var(--radius-full);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
          z-index: 40;
          transition: transform 0.2s, background-color 0.2s;
        }
        .fab:hover {
          background-color: var(--on-background);
        }
        .fab:active {
          transform: scale(0.95);
        }
        @media (min-width: 768px) {
          .fab {
            bottom: 48px;
            right: 48px;
          }
        }
      `}</style>
    </div>
    </ErrorBoundary>
  );
}

export default App;

