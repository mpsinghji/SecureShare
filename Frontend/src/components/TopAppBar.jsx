import React from 'react';

const TopAppBar = ({ currentScreen, setCurrentScreen, onLogout }) => {
  return (
    <header className="top-app-bar">
      <div className="flex items-center gap-3">
        <span className="material-symbols-outlined text-primary" style={{ fontSize: '28px' }}>shield</span>
        <h1 className="font-headline-md text-primary">SecureShare</h1>
      </div>
      <div className="flex items-center gap-4">
        <div className="desktop-nav">
          <button 
            className={`nav-link font-label-caps ${currentScreen === 'dashboard' ? 'active text-primary' : 'text-on-surface-variant'}`}
            onClick={() => setCurrentScreen('dashboard')}
          >
            Dashboard
          </button>
          <button 
            className={`nav-link font-label-caps ${currentScreen === 'documents' ? 'active text-primary' : 'text-on-surface-variant'}`}
            onClick={() => setCurrentScreen('documents')}
          >
            Documents
          </button>
        </div>
        <div className="avatar bg-primary-container">
          <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuCXpxJ0VJCS_a6U_-8fC-u_eoVt0m8QWjTbqOqP-AkqYzYPyP1DkBMMxqONexP9fVqZ9inW8FjhMKjSypl0l1lB7opfDPnvG6T7xSrIrcF6MtapPdpIEnujtouhUaEdHyJ4ZzS-cWEgTZWhQxW0FbNlRaoSgWUbgipgtVvH4OHI1yrc7V2W52MZhl826u3fpryTcqE7o5SjwjPsGElmFzQzyU2ayJjk-qn6cJZNLvSvVOuNqkKUp52hMx5Rou5oNl1gGX0fbOkuoI0" alt="User Profile" />
        </div>
      </div>
      <style>{`
        .top-app-bar {
          width: 100%;
          position: sticky;
          top: 0;
          background-color: var(--surface);
          border-bottom: 1px solid var(--outline-variant);
          z-index: 50;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 var(--margin-desktop);
          height: 64px;
        }
        @media (max-width: 768px) {
          .top-app-bar {
            padding: 0 var(--margin-mobile);
          }
          .desktop-nav {
            display: none;
          }
        }
        .desktop-nav {
          display: flex;
          gap: 24px;
          margin-right: 24px;
        }
        .nav-link {
          transition: color 0.2s;
        }
        .nav-link:hover {
          color: var(--primary);
        }
        .avatar {
          width: 40px;
          height: 40px;
          border-radius: var(--radius-full);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          border: 1px solid var(--outline-variant);
        }
        .avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
      `}</style>
    </header>
  );
};

export default TopAppBar;
