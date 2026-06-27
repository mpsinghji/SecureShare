import React, { useState, useEffect, useRef } from 'react';
import StatusBadge from '../components/StatusBadge';
import { showToast } from '../utils/toast';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First', icon: 'arrow_downward' },
  { value: 'oldest', label: 'Oldest First', icon: 'arrow_upward' },
  { value: 'alpha-asc', label: 'Name (A-Z)', icon: 'sort_by_alpha' },
  { value: 'alpha-desc', label: 'Name (Z-A)', icon: 'sort_by_alpha' },
  { value: 'expiry', label: 'Nearest Expiry', icon: 'timer' },
];

const USERS_PAGE_SIZE = 10;

const Documents = ({ authToken, setCurrentScreen, onViewDocument }) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [sortOpen, setSortOpen] = useState(false);
  const [menuDocId, setMenuDocId] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [activeModal, setActiveModal] = useState(null);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [adminUsers, setAdminUsers] = useState([]);
  const [modalInput, setModalInput] = useState('');
  const [accessSearch, setAccessSearch] = useState('');
  const [usersPage, setUsersPage] = useState(1);
  const [expiryMode, setExpiryMode] = useState('days');
  const [sharePrintToggle, setSharePrintToggle] = useState(false);
  const [shareAccessMode, setShareAccessMode] = useState('public');
  const [shareUsersInput, setShareUsersInput] = useState('');

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

  // Click outside to close context menu & sort dropdown
  const menuRef = useRef(null);
  const sortRef = useRef(null);
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuDocId(null);
      }
      if (sortRef.current && !sortRef.current.contains(e.target)) {
        setSortOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuDocId, sortOpen]);

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
    setExpiryMode('days');
    setActiveModal('expiry');
    setMenuDocId(null);
  };

  const submitEditExpiry = async () => {
    if (!selectedDoc) return;
    let expires_at = null;
    
    if (expiryMode === 'revoke') {
      expires_at = new Date(0);
    } else if (expiryMode === 'forever') {
      expires_at = null;
    } else if (expiryMode === 'days') {
      const days = parseInt(modalInput);
      if (!isNaN(days) && days > 0) {
        expires_at = new Date();
        expires_at.setDate(expires_at.getDate() + days);
      } else {
        return showToast('Please enter a valid number of days', 'error');
      }
    } else if (expiryMode === 'hours') {
      const hours = parseInt(modalInput);
      if (!isNaN(hours) && hours > 0) {
        expires_at = new Date();
        expires_at.setHours(expires_at.getHours() + hours);
      } else {
        return showToast('Please select valid hours', 'error');
      }
    }
    
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const response = await fetch(`${API_URL}/api/documents/${selectedDoc.id}/expiry`, {
        method: 'PUT', headers: { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ expires_at: expires_at ? expires_at.toISOString() : null })
      });
      if (response.ok) {
        showToast('Expiry updated successfully', 'success');
        const fetchUrl = isAdmin ? `${API_URL}/api/admin/documents` : `${API_URL}/api/documents`;
        const res = await fetch(fetchUrl, { headers: { 'Authorization': `Bearer ${authToken}` } });
        if (res.ok) setDocuments(await res.json());
      } else {
        const errData = await response.json().catch(() => ({}));
        showToast(errData.error || 'Failed to update expiry', 'error');
      }
    } catch (err) {
      showToast('Network error', 'error');
    }
    setActiveModal(null);
  };

  const handleAdminExtendExpiry = async (e, doc) => {
    e.stopPropagation();
    setSelectedDoc(doc);
    setModalInput('');
    setActiveModal('adminExpiry');
    setMenuDocId(null);
  };

  const submitAdminExtendExpiry = async (hoursToAdd) => {
    if (!hoursToAdd || isNaN(parseInt(hoursToAdd))) return;
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const response = await fetch(`${API_URL}/api/admin/documents/${selectedDoc.id}/expiry`, {
        method: 'PUT', headers: { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ addHours: parseInt(hoursToAdd) })
      });
      if (response.ok) {
        showToast('Expiry extended successfully', 'success');
        const res = await fetch(`${API_URL}/api/admin/documents`, { headers: { 'Authorization': `Bearer ${authToken}` } });
        if (res.ok) setDocuments(await res.json());
      }
    } catch (err) {}
    setActiveModal(null);
  };

  const handleAdminEditSharing = async (e, doc) => {
    e.stopPropagation();
    setSelectedDoc(doc);
    setAccessSearch('');
    setUsersPage(1);
    setActiveModal('adminAccess');
    setMenuDocId(null);
  };

  const submitAdminEditSharing = async (updatedSharedUsernames) => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const response = await fetch(`${API_URL}/api/admin/documents/${selectedDoc.id}/sharing`, {
        method: 'PUT', headers: { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ shared_with_usernames: updatedSharedUsernames.join(',') })
      });
      if (response.ok) {
        showToast('Access updated successfully', 'success');
        const res = await fetch(`${API_URL}/api/admin/documents`, { headers: { 'Authorization': `Bearer ${authToken}` } });
        if (res.ok) {
          const updatedDocs = await res.json();
          setDocuments(updatedDocs);
          setSelectedDoc(updatedDocs.find(d => d.id === selectedDoc.id));
        }
      }
    } catch (err) {}
  };

  const handleOpenShareLink = (e, doc) => {
    e.stopPropagation();
    setSelectedDoc(doc);
    setSharePrintToggle(doc.allow_print);
    if (doc.shared_with_usernames && doc.shared_with_usernames.length > 0) {
      setShareAccessMode('users');
      setShareUsersInput(doc.shared_with_usernames.join(', '));
    } else {
      setShareAccessMode('public');
      setShareUsersInput('');
    }
    setActiveModal('shareLink');
    setMenuDocId(null);
  };

  const submitShareLink = async () => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      
      let updatedUsers = [];
      if (shareAccessMode === 'users') {
        updatedUsers = shareUsersInput.split(',').map(s => s.trim()).filter(s => s.length > 0);
      }

      // Update sharing access
      await fetch(`${API_URL}/api/documents/${selectedDoc.id}/sharing`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ shared_with_usernames: updatedUsers })
      });
      
      // Update print toggle
      if (sharePrintToggle !== selectedDoc.allow_print) {
        await fetch(`${API_URL}/api/documents/${selectedDoc.id}/allow_print`, {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ allow_print: sharePrintToggle })
        });
      }

      // Update local doc state
      setDocuments(documents.map(d => 
        d.id === selectedDoc.id 
          ? { ...d, allow_print: sharePrintToggle, shared_with_usernames: updatedUsers } 
          : d
      ));

      if (shareAccessMode === 'public') {
        const link = `${window.location.origin}/view/${selectedDoc.id}`;
        navigator.clipboard.writeText(link).then(() => {
          showToast('Share settings updated & link copied!', 'success');
        }).catch(() => {
          showToast('Settings updated, but failed to copy link', 'error');
        });
      } else {
        showToast('Share settings updated!', 'success');
      }
      
      setActiveModal(null);
    } catch (err) {
      console.error("Failed to update share settings", err);
      showToast('Failed to update share settings', 'error');
    }
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

  // Filter users for access modal
  const filteredUsers = adminUsers.filter(u => {
    if (!accessSearch) return true;
    const q = accessSearch.toLowerCase();
    return u.username?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
  });
  const visibleUsers = filteredUsers.slice(0, usersPage * USERS_PAGE_SIZE);
  const hasMoreUsers = visibleUsers.length < filteredUsers.length;

  const currentSort = SORT_OPTIONS.find(s => s.value === sortBy);

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
            {/* Custom Sort Dropdown */}
            <div className="sort-dropdown" ref={sortRef}>
              <button 
                className="sort-trigger"
                onClick={() => setSortOpen(!sortOpen)}
              >
                <span className="material-symbols-outlined sort-icon">swap_vert</span>
                <span className="sort-label">{currentSort?.label}</span>
                <span className={`material-symbols-outlined sort-chevron ${sortOpen ? 'open' : ''}`}>expand_more</span>
              </button>
              {sortOpen && (
                <div className="sort-menu">
                  {SORT_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      className={`sort-option ${sortBy === opt.value ? 'active' : ''}`}
                      onClick={() => { setSortBy(opt.value); setSortOpen(false); }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{opt.icon}</span>
                      <span>{opt.label}</span>
                      {sortBy === opt.value && (
                        <span className="material-symbols-outlined sort-check">check</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
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
                    {/* Admin: Show uploader and sharing */}
                    {isAdmin && (
                      <div className="font-code-sm text-on-surface-variant mt-1 flex flex-col gap-1">
                        <div className="flex items-center gap-1">
                          <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>person</span>
                          Uploaded by: {doc.user_email}
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>share</span>
                          Shared with: {doc.shared_with_usernames && doc.shared_with_usernames.length > 0 ? doc.shared_with_usernames.join(', ') : 'Public (Anyone with link)'}
                        </div>
                      </div>
                    )}
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
                      {/* Share Link - always available */}
                      <button className="menu-item" onClick={(e) => handleOpenShareLink(e, doc)}>
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>link</span> Share Link
                      </button>
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
        <div className="premium-modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="premium-modal-content" onClick={e => e.stopPropagation()}>
            {activeModal === 'shareLink' && (
              <>
                <div className="premium-modal-header">
                  <h3 className="premium-modal-title">Share Settings</h3>
                  <p className="premium-modal-subtitle">Configure link access and viewer permissions.</p>
                </div>
                
                <div className="mb-6">
                  <label className="font-label-caps text-on-surface-variant mb-2 block">General Access</label>
                  <select 
                    className="premium-select mb-4"
                    value={shareAccessMode}
                    onChange={(e) => setShareAccessMode(e.target.value)}
                  >
                    <option value="public">Anyone with the link (Public)</option>
                    <option value="users">Selected people only (Restricted)</option>
                  </select>

                  {shareAccessMode === 'users' && (
                    <div className="mb-4">
                      <label className="font-label-caps text-on-surface-variant mb-2 block">Add people (emails or usernames, comma separated)</label>
                      <input 
                        type="text"
                        className="premium-input"
                        placeholder="e.g. user@domain.com, user2"
                        value={shareUsersInput}
                        onChange={(e) => setShareUsersInput(e.target.value)}
                      />
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between bg-surface-container p-4 rounded-xl mb-4 border border-outline-variant">
                  <div>
                    <div className="font-body-md text-on-surface font-medium">Allow Printing</div>
                    <div className="font-body-sm text-on-surface-variant mt-1">Viewers can print this document</div>
                  </div>
                  <label className="toggle-switch">
                    <input type="checkbox" checked={sharePrintToggle} onChange={(e) => setSharePrintToggle(e.target.checked)} />
                    <span className="slider"></span>
                  </label>
                </div>

                <div className="premium-modal-footer">
                  <button className="premium-btn cancel" onClick={() => setActiveModal(null)}>Cancel</button>
                  <button className="premium-btn primary" onClick={submitShareLink}>
                    {shareAccessMode === 'public' ? 'Save & Copy Link' : 'Save Changes'}
                  </button>
                </div>
              </>
            )}
            {activeModal === 'expiry' && (
              <>
                <div className="premium-modal-header">
                  <h3 className="premium-modal-title">Edit Expiry</h3>
                  <p className="premium-modal-subtitle">Update when this document will automatically expire.</p>
                </div>
                <div className="mb-4">
                  <select 
                    className="premium-select mb-4"
                    value={expiryMode} 
                    onChange={e => {
                      setExpiryMode(e.target.value);
                      if (e.target.value === 'hours') setModalInput('1');
                      if (e.target.value === 'days') setModalInput('');
                    }}
                  >
                    <option value="hours">In Hours</option>
                    <option value="days">In Days</option>
                    <option value="forever">Forever (No Expiry)</option>
                    <option value="revoke">Revoke Instantly</option>
                  </select>
                  
                  {expiryMode === 'hours' && (
                    <select className="premium-select" value={modalInput} onChange={e => setModalInput(e.target.value)}>
                      <option value="1">+1 Hour</option>
                      <option value="2">+2 Hours</option>
                      <option value="6">+6 Hours</option>
                      <option value="12">+12 Hours</option>
                      <option value="24">+24 Hours</option>
                    </select>
                  )}
                  {expiryMode === 'days' && (
                    <input type="number" placeholder="Number of days" className="premium-input" value={modalInput} onChange={e => setModalInput(e.target.value)} />
                  )}
                </div>
                <div className="premium-modal-footer">
                  <button className="premium-btn cancel" onClick={() => setActiveModal(null)}>Cancel</button>
                  <button className="premium-btn primary" onClick={submitEditExpiry}>Save Changes</button>
                </div>
              </>
            )}
            {activeModal === 'adminExpiry' && (
              <>
                <div className="premium-modal-header">
                  <h3 className="premium-modal-title">Admin: Extend Expiry</h3>
                  <p className="premium-modal-subtitle">Extend the expiration time for this document.</p>
                </div>
                
                <div className="mb-4 text-center">
                  <div className="text-sm text-on-surface-variant mb-1">Current Expiry</div>
                  <div className="font-semibold text-primary">
                    {selectedDoc?.expires_at ? new Date(selectedDoc.expires_at).toLocaleString() : 'Never'}
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm text-on-surface-variant mb-2">Quick Extend:</label>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {[1, 2, 6, 12, 24, 48].map(hours => (
                      <button 
                        key={hours}
                        className={`premium-btn ${modalInput === hours.toString() ? 'primary' : 'secondary'} flex-1 min-w-[70px] text-sm py-2`}
                        onClick={() => setModalInput(hours.toString())}
                        style={{ padding: '8px' }}
                      >
                        +{hours}h
                      </button>
                    ))}
                  </div>
                  
                  <label className="block text-sm text-on-surface-variant mb-2">Custom Hours:</label>
                  <input 
                    type="number" 
                    className="premium-input w-full" 
                    placeholder="Enter hours to extend..."
                    value={modalInput}
                    onChange={e => setModalInput(e.target.value)}
                  />
                </div>

                {modalInput && !isNaN(parseInt(modalInput)) && selectedDoc?.expires_at && (
                  <div className="mb-4 text-center p-3 bg-surface-variant rounded-md">
                    <div className="text-xs text-on-surface-variant mb-1">New Expiry Preview</div>
                    <div className="font-medium text-success">
                      {new Date(new Date(selectedDoc.expires_at).getTime() + parseInt(modalInput) * 60 * 60 * 1000).toLocaleString()}
                    </div>
                  </div>
                )}

                <div className="premium-modal-footer">
                  <button className="premium-btn cancel" onClick={() => setActiveModal(null)}>Cancel</button>
                  <button 
                    className="premium-btn primary" 
                    onClick={() => submitAdminExtendExpiry(modalInput)}
                    disabled={!modalInput || isNaN(parseInt(modalInput))}
                  >
                    Confirm Extension
                  </button>
                </div>
              </>
            )}
            {activeModal === 'adminAccess' && (
              <>
                <div className="premium-modal-header">
                  <h3 className="premium-modal-title">Admin: Edit Access</h3>
                  <p className="premium-modal-subtitle">Manage access for this document across all users.</p>
                </div>
                {/* Search users */}
                <div className="access-search-bar mb-4">
                  <span className="material-symbols-outlined access-search-icon">search</span>
                  <input
                    type="text"
                    placeholder="Search users by name or email..."
                    value={accessSearch}
                    onChange={(e) => { setAccessSearch(e.target.value); setUsersPage(1); }}
                    className="access-search-input"
                  />
                  {accessSearch && (
                    <button className="access-search-clear" onClick={() => setAccessSearch('')}>
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
                    </button>
                  )}
                </div>
                <div className="doc-modal-scroll">
                  {visibleUsers.length === 0 && (
                    <div className="p-4 text-on-surface-variant text-center font-body-sm">No users found.</div>
                  )}
                  {visibleUsers.map(u => {
                    const userIdentifier = u.username || u.email;
                    const hasAccess = selectedDoc.shared_with_usernames?.includes(userIdentifier);
                    return (
                      <div key={u.id} className="flex justify-between items-center p-3 border-b border-outline-variant last:border-b-0">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold font-body-sm">
                            {(u.username || u.email)[0].toUpperCase()}
                          </div>
                          <div>
                            <div className="font-body-md text-primary font-semibold">@{u.username || 'anonymous'}</div>
                            <div className="font-code-sm text-on-surface-variant">{u.email}</div>
                          </div>
                        </div>
                        <button 
                          className={`doc-modal-action-btn ${hasAccess ? 'revoke' : 'grant'}`}
                          onClick={() => {
                            let updated;
                            if (hasAccess) {
                              updated = (selectedDoc.shared_with_usernames || []).filter(name => name !== userIdentifier);
                            } else {
                              updated = [...(selectedDoc.shared_with_usernames || []), userIdentifier];
                            }
                            setSelectedDoc({ ...selectedDoc, shared_with_usernames: updated });
                          }}
                        >
                          {hasAccess ? 'Revoke' : 'Grant'}
                        </button>
                      </div>
                    );
                  })}
                  {hasMoreUsers && (
                    <button 
                      className="load-more-btn"
                      onClick={() => setUsersPage(p => p + 1)}
                    >
                      Show More ({filteredUsers.length - visibleUsers.length} remaining)
                    </button>
                  )}
                </div>
                <div className="premium-modal-footer">
                  <button className="premium-btn cancel" onClick={() => setActiveModal(null)}>Cancel</button>
                  <button className="premium-btn primary" onClick={() => {
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
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          animation: fadeIn 0.2s ease-out;
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
          animation: slideUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
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
          max-height: 300px;
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

        /* Access Search Bar */
        .access-search-bar {
          position: relative;
          display: flex;
          align-items: center;
        }
        .access-search-icon {
          position: absolute;
          left: 12px;
          color: var(--on-surface-variant);
          font-size: 20px;
          pointer-events: none;
        }
        .access-search-input {
          width: 100%;
          padding: 10px 36px 10px 40px;
          border: 1px solid var(--outline-variant);
          border-radius: var(--radius-full);
          background-color: var(--surface-container);
          color: var(--on-surface);
          font-family: var(--font-inter);
          font-size: 13px;
          outline: none;
          transition: border-color 0.2s, background-color 0.2s;
        }
        .access-search-input:focus {
          border-color: var(--primary);
          background-color: var(--surface-container-lowest);
        }
        .access-search-clear {
          position: absolute;
          right: 8px;
          background: none;
          border: none;
          color: var(--on-surface-variant);
          cursor: pointer;
          padding: 4px;
          border-radius: var(--radius-full);
          display: flex;
          align-items: center;
          transition: color 0.2s;
        }
        .access-search-clear:hover { color: var(--on-surface); }

        /* Load More Button */
        .load-more-btn {
          width: 100%;
          padding: 10px;
          background: none;
          border: none;
          border-top: 1px solid var(--outline-variant);
          color: var(--primary);
          font-family: var(--font-inter);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        .load-more-btn:hover {
          background-color: var(--surface-container-low);
        }

        .text-center { text-align: center; }
        .p-4 { padding: 16px; }

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
          min-width: 220px;
          z-index: 50;
          overflow: hidden;
          animation: menuSlide 0.15s ease-out;
        }
        @keyframes menuSlide {
          from { opacity: 0; transform: translateY(-4px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
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

        /* Custom Sort Dropdown */
        .sort-dropdown {
          position: relative;
        }
        .sort-trigger {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background-color: var(--surface-container-lowest);
          border: 1px solid var(--outline-variant);
          border-radius: var(--radius-full);
          cursor: pointer;
          transition: all 0.2s;
          font-family: var(--font-inter);
          font-size: 13px;
          font-weight: 500;
          color: var(--on-surface);
          white-space: nowrap;
        }
        .sort-trigger:hover {
          border-color: var(--primary);
          background-color: var(--surface-container-low);
        }
        .sort-icon {
          font-size: 18px !important;
          color: var(--on-surface-variant);
        }
        .sort-label {
          color: var(--on-surface);
        }
        .sort-chevron {
          font-size: 18px !important;
          color: var(--on-surface-variant);
          transition: transform 0.2s;
        }
        .sort-chevron.open {
          transform: rotate(180deg);
        }
        .sort-menu {
          position: absolute;
          top: calc(100% + 6px);
          right: 0;
          background-color: var(--surface-container-lowest);
          border: 1px solid var(--outline-variant);
          border-radius: var(--radius-md);
          box-shadow: 0 10px 25px -5px rgba(0,0,0,0.15);
          min-width: 200px;
          z-index: 60;
          overflow: hidden;
          animation: menuSlide 0.15s ease-out;
        }
        .sort-option {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 10px 14px;
          background: none;
          border: none;
          color: var(--on-surface);
          font-family: var(--font-inter);
          font-size: 13px;
          cursor: pointer;
          transition: background-color 0.15s;
        }
        .sort-option:hover {
          background-color: var(--surface-container-high);
        }
        .sort-option.active {
          background-color: var(--surface-container);
          font-weight: 600;
          color: var(--primary);
        }
        .sort-check {
          margin-left: auto;
          font-size: 18px !important;
          color: var(--primary);
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

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default Documents;
