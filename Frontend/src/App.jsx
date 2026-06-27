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
import { showToast } from './utils/toast';

function App() {
  const getInitialScreen = () => {
    const match = window.location.pathname.match(/^\/view\/(.+)$/);
    if (match) return 'viewer';
    return 'dashboard';
  };
  const [currentScreen, setCurrentScreen] = useState(getInitialScreen());
  
  const getInitialDocument = () => {
    const match = window.location.pathname.match(/^\/view\/(.+)$/);
    if (match) return { id: match[1] };
    return null;
  };
  
  const [authToken, setAuthToken] = useState(localStorage.getItem('secureshare_token') || null);
  const [selectedDocument, setSelectedDocument] = useState(getInitialDocument());
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const performLogout = () => {
    localStorage.removeItem('secureshare_token');
    setAuthToken(null);
    setShowLogoutModal(false);
    setLoggingOut(false);
  };

  const handleLogoutRequest = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = () => {
    setLoggingOut(true);
    // Brief animation delay then perform logout
    setTimeout(() => {
      showToast('Logged out successfully', 'success');
      performLogout();
    }, 1200);
  };

  const cancelLogout = () => {
    setShowLogoutModal(false);
  };

  useEffect(() => {
    const handleAuthError = () => {
      showToast('Session expired. Please log in again.', 'error');
      setTimeout(() => {
        performLogout();
      }, 500);
    };
    window.addEventListener('auth-error', handleAuthError);
    
    // Global fetch interceptor to catch 401 (Unauthorized / Token Expired)
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
      const response = await originalFetch.apply(this, args);
      if (response.status === 401) {
        // Only trigger logout if it's an API request and not an auth request (like login/verify)
        const url = typeof args[0] === 'string' ? args[0] : (args[0] ? args[0].url : '');
        if (url && url.includes('/api/') && !url.includes('/api/auth/')) {
          window.dispatchEvent(new Event('auth-error'));
        }
      }
      return response;
    };

    return () => {
      window.removeEventListener('auth-error', handleAuthError);
      window.fetch = originalFetch;
    };
  }, []);

  if (!authToken && currentScreen !== 'viewer') {
    return (
      <ErrorBoundary>
        <Login setAuthToken={setAuthToken} />
      </ErrorBoundary>
    );
  }

  const renderScreen = () => {
    switch (currentScreen) {
      case 'dashboard': return <Dashboard authToken={authToken} />;
      case 'documents': return <Documents authToken={authToken} setCurrentScreen={setCurrentScreen} onViewDocument={(doc) => { setSelectedDocument(doc); setCurrentScreen('viewer'); }} />;
      case 'upload': return <SecureUpload authToken={authToken} setCurrentScreen={setCurrentScreen} />;
      case 'viewer': return <SecureViewer authToken={authToken} document={selectedDocument} onClose={() => setCurrentScreen('documents')} />;
      default: return <Dashboard authToken={authToken} />;
    }
  };

  const isViewer = currentScreen === 'viewer';

  return (
    <ErrorBoundary>
      <div className="app-layout">
        {!isViewer && <TopAppBar authToken={authToken} currentScreen={currentScreen} setCurrentScreen={setCurrentScreen} onLogout={handleLogoutRequest} />}
          
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

        {/* Logout Confirmation Modal */}
        {showLogoutModal && (
          <div className="logout-overlay" onClick={cancelLogout}>
            <div className="logout-modal" onClick={e => e.stopPropagation()}>
              {loggingOut ? (
                <div className="logout-loading">
                  <div className="logout-spinner"></div>
                  <p className="font-headline-sm text-primary mt-4">Logging out...</p>
                  <p className="font-body-sm text-on-surface-variant mt-2">Clearing your secure session</p>
                </div>
              ) : (
                <>
                  <div className="logout-icon-wrap">
                    <span className="material-symbols-outlined" style={{ fontSize: '40px', color: 'var(--status-critical)' }}>logout</span>
                  </div>
                  <h3 className="font-headline-sm text-primary mt-4">Logout</h3>
                  <p className="font-body-md text-on-surface-variant mt-2 mb-6">Are you sure you want to end your secure session?</p>
                  <div className="logout-actions">
                    <button className="logout-cancel-btn" onClick={cancelLogout}>Cancel</button>
                    <button className="logout-confirm-btn" onClick={confirmLogout}>Yes, Logout</button>
                  </div>
                </>
              )}
            </div>
          </div>
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

        /* Logout Modal */
        .logout-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.5);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          animation: fadeIn 0.2s ease-out;
        }
        .logout-modal {
          background: var(--surface);
          border-radius: var(--radius-xl);
          padding: 32px;
          width: 90%;
          max-width: 380px;
          text-align: center;
          box-shadow: 0 20px 40px rgba(0,0,0,0.2);
          animation: slideUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .logout-icon-wrap {
          width: 72px;
          height: 72px;
          border-radius: var(--radius-full);
          background-color: rgba(239, 68, 68, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto;
        }
        .logout-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 24px 0;
        }
        .logout-spinner {
          width: 48px;
          height: 48px;
          border: 3px solid var(--surface-container-high);
          border-top-color: var(--primary);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        .logout-actions {
          display: flex;
          gap: 12px;
          justify-content: center;
        }
        .logout-cancel-btn {
          padding: 10px 24px;
          border-radius: var(--radius-full);
          border: 1px solid var(--outline-variant);
          background: transparent;
          color: var(--on-surface);
          font-family: var(--font-inter);
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        .logout-cancel-btn:hover {
          background-color: var(--surface-container);
        }
        .logout-confirm-btn {
          padding: 10px 24px;
          border-radius: var(--radius-full);
          border: none;
          background: var(--status-critical);
          color: white;
          font-family: var(--font-inter);
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: opacity 0.2s, transform 0.1s;
        }
        .logout-confirm-btn:hover {
          opacity: 0.9;
        }
        .logout-confirm-btn:active {
          transform: scale(0.95);
        }
        .mt-4 { margin-top: 16px; }
        .mt-2 { margin-top: 8px; }
        .mb-6 { margin-bottom: 24px; }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes spin {
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
    </ErrorBoundary>
  );
}

export default App;
