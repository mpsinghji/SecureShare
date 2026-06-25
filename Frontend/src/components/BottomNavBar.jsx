import React from 'react';

const BottomNavBar = ({ currentScreen, setCurrentScreen }) => {
  return (
    <nav className="bottom-nav-bar md:hidden">
      <button 
        className={`nav-item ${currentScreen === 'dashboard' ? 'active' : ''}`}
        onClick={() => setCurrentScreen('dashboard')}
      >
        <span className="material-symbols-outlined" style={{ fontVariationSettings: currentScreen === 'dashboard' ? "'FILL' 1" : "'FILL' 0" }}>dashboard</span>
        <span className="font-label-caps">Dashboard</span>
      </button>
      <button 
        className={`nav-item ${currentScreen === 'documents' ? 'active' : ''}`}
        onClick={() => setCurrentScreen('documents')}
      >
        <span className="material-symbols-outlined" style={{ fontVariationSettings: currentScreen === 'documents' ? "'FILL' 1" : "'FILL' 0" }}>description</span>
        <span className="font-label-caps">Documents</span>
      </button>
      <button 
        className={`nav-item ${currentScreen === 'upload' ? 'active' : ''}`}
        onClick={() => setCurrentScreen('upload')}
      >
        <span className="material-symbols-outlined" style={{ fontVariationSettings: currentScreen === 'upload' ? "'FILL' 1" : "'FILL' 0" }}>add_circle</span>
        <span className="font-label-caps">Upload</span>
      </button>
      <style>{`
        .bottom-nav-bar {
          position: fixed;
          bottom: 0;
          left: 0;
          width: 100%;
          display: flex;
          justify-content: space-around;
          align-items: center;
          background-color: var(--surface);
          border-top: 1px solid var(--outline-variant);
          height: 80px;
          padding-bottom: env(safe-area-inset-bottom);
          z-index: 50;
        }
        @media (min-width: 768px) {
          .bottom-nav-bar {
            display: none;
          }
        }
        .nav-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: var(--on-surface-variant);
          transition: color 0.2s;
          padding: 4px 12px;
          border-radius: var(--radius-xl);
        }
        .nav-item:hover {
          color: var(--primary);
        }
        .nav-item.active {
          background-color: var(--secondary-container);
          color: var(--on-secondary-container);
        }
        .nav-item .material-symbols-outlined {
          margin-bottom: 2px;
        }
      `}</style>
    </nav>
  );
};

export default BottomNavBar;
