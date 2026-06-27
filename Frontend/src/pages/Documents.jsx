import React, { useState, useEffect, useRef } from 'react';
import StatusBadge from '../components/StatusBadge';

const Documents = ({ authToken, setCurrentScreen, onViewDocument }) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [menuDocId, setMenuDocId] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [activeModal, setActiveModal] = useState(null);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [adminUsers, setAdminUsers] = useState([]);
  const [modalInput, setModalInput] = useState('');

  // Decode JWT to get user info
  const decodeToken = (token) => {
    try {
      return JSON.parse(atob(token.split('.')[1]));
    } catch (e) { return null; }
  };
  const user = decodeToken(authToken);
  const isAdmin = user?.email === 'admin@secureshare.com';

  const getTimeRemaining = (expiresAt) => {
    if (!expiresAt) return null;
    const expiry = new Date(expiresAt);
    const now = new Date();
    const diffMs = expiry - now;
    if (diffMs <= 0) return 'Expired';
    
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) return `Expires in ${diffDays}d ${diffHours % 24}h`;
    if (diffHours > 0) return `Expires in ${diffHours}h ${diffMins % 60}m`;
    return `Expires in ${diffMins}m`;
  };

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        
        // Fetch profile to know who we are
        const profileRes = await fetch(`${API_URL}/api/user/profile`, {
          headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (profileRes.ok) {
          const profileData = await profileRes.json();
          setUserProfile(profileData);
        }

        const fetchUrl = isAdmin ? `${API_URL}/api/admin/documents` : `${API_URL}/api/documents`;
        const response = await fetch(fetchUrl, {
          headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (response.ok) {
          const data = await response.json();
          setDocuments(data);
        }

        if (isAdmin) {
          const usersRes = await fetch(`${API_URL}/api/admin/users`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
          });
          if (usersRes.ok) setAdminUsers(await usersRes.json());
        }
      } catch (error) {
        console.error("Error fetching documents:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, []);

  // Click outside to close context menu
  const menuRef = useRef(null);
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuDocId(null);
      }
    };
    if (menuDocId !== null) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuDocId]);

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to permanently delete this document?')) return;
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/documents/${id}`, {
        method: 'DELETE', headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (response.ok) setDocuments(documents.filter(d => d.id !== id));
    } catch (err) {}
    setMenuDocId(null);
  };

  const handleEditExpiry = async (e, doc) => {
    e.stopPropagation();
    setSelectedDoc(doc);
    setModalInput('');
    setActiveModal('expiry');
    setMenuDocId(null);
  };

  const submitEditExpiry = async () => {
    const newDays = modalInput;
    let expires_at = null;
    if (newDays.trim() !== '') {
      const days = parseInt(newDays);
      if (!isNaN(days)) {
        expires_at = new Date();
        expires_at.setDate(expires_at.getDate() + days);
      }
    }
    
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/documents/${doc.id}/expiry`, {
        method: 'PUT', headers: { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ expires_at: expires_at ? expires_at.toISOString() : null })
      });
      if (response.ok) {
        const fetchUrl = isAdmin ? `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/admin/documents` : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/documents`;
        const fetchDocuments = async () => {
          const res = await fetch(fetchUrl, { headers: { 'Authorization': `Bearer ${authToken}` } });
          if (res.ok) setDocuments(await res.json());
        };
        fetchDocuments();
      }
    } catch (err) {}
    setActiveModal(null);
  };

  const handleAdminExtendExpiry = async (e, doc) => {
    e.stopPropagation();
    setSelectedDoc(doc);
    setModalInput('');
    setActiveModal('adminExpiry');
    setMenuDocId(null);
  };

  const submitAdminExtendExpiry = async () => {
    const hours = modalInput;
    if (!hours || isNaN(parseInt(hours))) return;
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/admin/documents/${selectedDoc.id}/expiry`, {
        method: 'PUT', headers: { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ addHours: parseInt(hours) })
      });
      if (response.ok) {
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/admin/documents`, { headers: { 'Authorization': `Bearer ${authToken}` } });
        if (res.ok) setDocuments(await res.json());
      }
    } catch (err) {}
    setActiveModal(null);
  };

  const handleAdminEditSharing = async (e, doc) => {
    e.stopPropagation();
    setSelectedDoc(doc);
    setActiveModal('adminAccess');
    setMenuDocId(null);
  };

  const submitAdminEditSharing = async (updatedSharedUsernames) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/admin/documents/${selectedDoc.id}/sharing`, {
        method: 'PUT', headers: { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ shared_with_usernames: updatedSharedUsernames.join(',') })
      });
      if (response.ok) {
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/admin/documents`, { headers: { 'Authorization': `Bearer ${authToken}` } });
        if (res.ok) {
          const updatedDocs = await res.json();
          setDocuments(updatedDocs);
          setSelectedDoc(updatedDocs.find(d => d.id === selectedDoc.id));
        }
      }
    } catch (err) {}
  };

  let filteredDocs = documents.filter(doc => {
    if (searchQuery && !doc.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (activeTab === 'active' && doc.status !== 'active') return false;
    if (activeTab === 'revoked' && doc.status !== 'revoked') return false;
    if (activeTab === 'shared' && doc.user_email === userProfile?.email) return false;
    return true;
  });

  filteredDocs.sort((a, b) => {
    if (sortBy === 'newest') return new Date(b.uploaded_at) - new Date(a.uploaded_at);
    if (sortBy === 'oldest') return new Date(a.uploaded_at) - new Date(b.uploaded_at);
    if (sortBy === 'alpha-asc') return a.name.localeCompare(b.name);
    if (sortBy === 'alpha-desc') return b.name.localeCompare(a.name);
    if (sortBy === 'expiry') {
      if (!a.expires_at && !b.expires_at) return 0;
      if (!a.expires_at) return 1;
      if (!b.expires_at) return -1;
      return new Date(a.expires_at) - new Date(b.expires_at);
    }
    return 0;
  });

  return (
    <div className="documents-container">
      <div className="header-section flex justify-between items-center mb-8">
        <div>
          <h2 className="font-headline-lg text-primary">Documents</h2>
          <p className="font-body-lg text-on-surface-variant">Manage your encrypted files and share links.</p>
        </div>
        <button 
          className="primary-btn font-label-caps flex items-center gap-2"
          onClick={() => setCurrentScreen('upload')}
        >
          <span className="material-symbols-outlined">add</span>
          Upload New
        </button>
      </div>

      <div className="card p-0">
        <div className="documents-toolbar flex justify-between items-center px-6 py-4 border-b border-subtle">
          <div className="tabs flex gap-6">
            <button className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>{isAdmin ? 'All System Docs' : 'All'}</button>
            <button className={`tab-btn ${activeTab === 'active' ? 'active' : ''}`} onClick={() => setActiveTab('active')}>Active</button>
            <button className={`tab-btn ${activeTab === 'revoked' ? 'active' : ''}`} onClick={() => setActiveTab('revoked')}>Revoked</button>
            <button className={`tab-btn ${activeTab === 'shared' ? 'active' : ''}`} onClick={() => setActiveTab('shared')}>Shared with Me</button>
          </div>
          <div className="flex gap-4 items-center">
            <div className="search-bar relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 transform -translate-y-1/2 text-on-surface-variant" style={{ fontSize: '18px' }}>search</span>
              <input 
                type="text" 
                placeholder="Search documents..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 bg-surface border border-outline-variant rounded-full text-sm outline-none focus:border-primary"
              />
            </div>
            <select 
              className="bg-surface border border-outline-variant rounded-md text-sm p-2 outline-none focus:border-primary text-on-surface cursor-pointer"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="alpha-asc">Name (A-Z)</option>
              <option value="alpha-desc">Name (Z-A)</option>
              <option value="expiry">Nearest Expiry</option>
            </select>
          </div>
        </div>

        <div className="documents-list">
          {loading && (
            <div className="p-6">
              <div className="skeleton h-6 w-1/3 mb-4"></div>
              <div className="skeleton h-4 w-1/4"></div>
            </div>
          )}
          {!loading && filteredDocs.length === 0 && <div className="p-6 text-on-surface-variant">{documents.length === 0 ? 'No documents yet. Upload your first file!' : 'No documents match your search.'}</div>}
          
          {!loading && filteredDocs.map((doc) => (
            <div key={doc.id} className="document-item cursor-pointer" onClick={() => onViewDocument(doc)}>
              <div className="flex justify-between items-start">
                <div className="flex gap-4 items-start">
                  <div className="doc-icon">
                    <span className="material-symbols-outlined text-primary">description</span>
                  </div>
                  <div>
                    <h3 className="font-body-lg text-primary font-semibold flex items-center gap-2">
                      {doc.name}
                      {doc.user_email !== userProfile?.email && (
                        <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: '16px' }} title={`Shared by ${doc.user_email}`}>group</span>
                      )}
                    </h3>
                    <div className="flex gap-4 mt-2">
                      <StatusBadge 
                        status={doc.status === 'active' ? 'active' : 'critical'} 
                        text={doc.status === 'active' ? 'Active' : 'Revoked'} 
                      />
                      <span className="font-code-sm text-on-surface-variant flex items-center gap-1">
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>visibility</span> {doc.views} Views
                      </span>
                      {doc.prints > 0 && (
                        <span className="font-code-sm text-status-critical flex items-center gap-1 ml-2">
                          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>print</span> {doc.prints} Prints
                        </span>
                      )}
                      {doc.expires_at && (
                        <span className="font-code-sm flex items-center gap-1 ml-2" style={{ color: '#F59E0B' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>timer</span> 
                          {getTimeRemaining(doc.expires_at)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="relative" ref={menuDocId === doc.id ? menuRef : null}>
                  <button 
                    className="action-btn"
                    onClick={(e) => { e.stopPropagation(); setMenuDocId(menuDocId === doc.id ? null : doc.id); }}
                  >
                    <span className="material-symbols-outlined text-on-surface-variant">more_vert</span>
                  </button>
                  
                  {menuDocId === doc.id && (
                    <div className="context-menu" onClick={(e) => e.stopPropagation()}>
                      {isAdmin && (
                        <>
                          <button className="menu-item" onClick={(e) => handleAdminExtendExpiry(e, doc)}>
                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add_circle</span> Admin: Extend Expiry (+Hrs)
                          </button>
                          <button className="menu-item" onClick={(e) => handleAdminEditSharing(e, doc)}>
                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>group_add</span> Admin: Edit Access
                          </button>
                        </>
                      )}
                      {(doc.user_email === userProfile?.email || isAdmin) ? (
                        <>
                          <button className="menu-item" onClick={(e) => handleEditExpiry(e, doc)}>
                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>edit_calendar</span> Edit Expiry
                          </button>
                          <button className="menu-item text-status-critical" onClick={(e) => handleDelete(e, doc.id)}>
                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>delete</span> Delete Permanently
                          </button>
                        </>
                      ) : (
                        <div className="menu-item text-on-surface-variant cursor-default">No actions available</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modals */}
      {activeModal && (
        <div className="doc-modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="doc-modal-content" onClick={e => e.stopPropagation()}>
            {activeModal === 'expiry' && (
              <>
                <h3 className="font-headline-sm text-primary mb-4">Edit Expiry</h3>
                <p className="font-body-sm text-on-surface-variant mb-4">Enter number of days to keep active from now (leave blank for no expiry, or 0 to revoke instantly):</p>
                <input type="number" className="w-full bg-surface-container border border-outline-variant p-2 rounded-md mb-4 text-on-surface" value={modalInput} onChange={e => setModalInput(e.target.value)} />
                <div className="doc-modal-footer">
                  <button className="doc-modal-btn cancel" onClick={() => setActiveModal(null)}>Cancel</button>
                  <button className="doc-modal-btn primary" onClick={submitEditExpiry}>Save</button>
                </div>
              </>
            )}
            {activeModal === 'adminExpiry' && (
              <>
                <h3 className="font-headline-sm text-primary mb-4">Admin: Extend Expiry</h3>
                <p className="font-body-sm text-on-surface-variant mb-4">Enter number of hours to add to expiry:</p>
                <input type="number" className="w-full bg-surface-container border border-outline-variant p-2 rounded-md mb-4 text-on-surface" value={modalInput} onChange={e => setModalInput(e.target.value)} />
                <div className="doc-modal-footer">
                  <button className="doc-modal-btn cancel" onClick={() => setActiveModal(null)}>Cancel</button>
                  <button className="doc-modal-btn primary" onClick={submitAdminExtendExpiry}>Extend</button>
                </div>
              </>
            )}
            {activeModal === 'adminAccess' && (
              <>
                <h3 className="font-headline-sm text-primary mb-4">Admin: Edit Access</h3>
                <p className="font-body-sm text-on-surface-variant mb-4">Manage access for this document.</p>
                <div className="doc-modal-scroll">
                  {adminUsers.map(u => {
                    const hasAccess = selectedDoc.shared_with_usernames?.includes(u.username);
                    return (
                      <div key={u.id} className="flex justify-between items-center p-3 border-b border-outline-variant last:border-b-0">
                        <div>
                          <div className="font-body-md text-primary font-semibold">@{u.username}</div>
                          <div className="font-code-sm text-on-surface-variant">{u.email}</div>
                        </div>
                        <button 
                          className={`doc-modal-action-btn ${hasAccess ? 'revoke' : 'grant'}`}
                          onClick={() => {
                            let updated;
                            if (hasAccess) {
                              updated = (selectedDoc.shared_with_usernames || []).filter(name => name !== u.username);
                            } else {
                              updated = [...(selectedDoc.shared_with_usernames || []), u.username];
                            }
                            setSelectedDoc({ ...selectedDoc, shared_with_usernames: updated });
                          }}
                        >
                          {hasAccess ? 'Revoke' : 'Grant'}
                        </button>
                      </div>
                    );
                  })}
                </div>
                <div className="doc-modal-footer">
                  <button className="doc-modal-btn cancel" onClick={() => setActiveModal(null)}>Cancel</button>
                  <button className="doc-modal-btn primary" onClick={() => {
                    submitAdminEditSharing(selectedDoc.shared_with_usernames || []);
                    setActiveModal(null);
                  }}>Save Changes</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <style>{`
        .documents-container {
          padding: var(--margin-desktop) 0;
          max-width: var(--max-content-width);
          margin: 0 auto;
        }

        .doc-modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background-color: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
        }
        .doc-modal-content {
          background-color: var(--surface);
          padding: 24px;
          border-radius: var(--radius-lg);
          box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04);
          width: 100%;
          max-width: 500px;
          max-height: 80vh;
          display: flex;
          flex-direction: column;
        }
        .doc-modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 16px;
        }
        .doc-modal-btn {
          font-family: var(--font-body);
          font-weight: 600;
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 8px 16px;
          border-radius: var(--radius-sm);
          border: none;
          cursor: pointer;
          transition: background-color 0.2s, opacity 0.2s;
        }
        .doc-modal-btn.cancel {
          background-color: transparent;
          color: var(--on-surface-variant);
        }
        .doc-modal-btn.cancel:hover {
          background-color: var(--surface-container-high);
        }
        .doc-modal-btn.primary {
          background-color: var(--primary);
          color: var(--on-primary);
        }
        .doc-modal-btn.primary:hover {
          background-color: var(--inverse-surface);
        }
        .doc-modal-scroll {
          max-height: 240px;
          overflow-y: auto;
          border: 1px solid var(--outline-variant);
          border-radius: var(--radius-md);
          margin-bottom: 16px;
          background-color: var(--surface-container-lowest);
        }
        .doc-modal-action-btn {
          font-family: var(--font-body);
          font-weight: 600;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 6px 12px;
          border-radius: var(--radius-full);
          border: none;
          color: white;
          cursor: pointer;
          transition: opacity 0.2s;
        }
        .doc-modal-action-btn.revoke { background-color: var(--status-critical); }
        .doc-modal-action-btn.grant { background-color: var(--status-emerald); }
        .doc-modal-action-btn:hover { opacity: 0.9; }

        .primary-btn {
          background-color: var(--primary);
          color: white;
          padding: 8px 16px;
          border-radius: var(--radius-lg);
          transition: transform 0.1s;
        }
        .primary-btn:active {
          transform: scale(0.95);
        }
        .documents-list {
          display: flex;
          flex-direction: column;
        }
        .document-item {
          padding: 24px;
          border-bottom: 1px solid var(--border-subtle);
          transition: background-color 0.2s;
        }
        .cursor-pointer {
          cursor: pointer;
        }
        .document-item:last-child {
          border-bottom: none;
        }
        .document-item:hover {
          background-color: var(--surface-container-low);
        }
        .doc-icon {
          width: 48px;
          height: 48px;
          background-color: var(--surface-container);
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .action-btn {
          width: 32px;
          height: 32px;
          border-radius: var(--radius-full);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background-color 0.2s;
        }
        .action-btn:hover {
          background-color: var(--surface-container-high);
        }
        
        .context-menu {
          position: absolute;
          top: 40px;
          right: 0;
          background-color: var(--surface-container-lowest);
          border: 1px solid var(--outline-variant);
          border-radius: var(--radius-md);
          box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
          min-width: 200px;
          z-index: 50;
          overflow: hidden;
        }
        .menu-item {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 12px 16px;
          background: none;
          border: none;
          color: var(--on-surface);
          font-family: var(--font-body);
          font-size: 14px;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        .menu-item:hover {
          background-color: var(--surface-container-high);
        }
        .menu-item.text-status-critical {
          color: var(--status-critical);
        }

        .tab-btn {
          background: none;
          border: none;
          border-bottom: 2px solid transparent;
          color: var(--on-surface-variant);
          font-weight: 600;
          padding: 8px 4px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .tab-btn:hover {
          color: var(--on-surface);
        }
        .tab-btn.active {
          color: var(--primary);
          border-bottom-color: var(--primary);
        }
        
        .border-subtle { border-color: var(--border-subtle); }
        .px-6 { padding-left: 24px; padding-right: 24px; }
        .py-4 { padding-top: 16px; padding-bottom: 16px; }
        .p-6 { padding: 24px; }
        .ml-2 { margin-left: 8px; }
        .relative { position: relative; }
        .absolute { position: absolute; }
        .left-3 { left: 12px; }
        .top-1\\/2 { top: 50%; }
        .transform { transform: translateY(-50%); }
        .pl-10 { padding-left: 40px; }
        .pr-4 { padding-right: 16px; }
        .py-2 { padding-top: 8px; padding-bottom: 8px; }
        .rounded-full { border-radius: 9999px; }
        .outline-none:focus { outline: none; }

        .skeleton {
          background: linear-gradient(90deg, var(--surface-container) 25%, var(--surface-container-high) 50%, var(--surface-container) 75%);
          background-size: 200% 100%;
          animation: skeleton-loading 1.5s infinite;
          border-radius: var(--radius-sm);
        }
        .h-6 { height: 24px; }
        .h-4 { height: 16px; }
        .w-1\\/3 { width: 33%; }
        .w-1\\/4 { width: 25%; }
        .mb-4 { margin-bottom: 16px; }
        
        @keyframes skeleton-loading {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
};

export default Documents;

