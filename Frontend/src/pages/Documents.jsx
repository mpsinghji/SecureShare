import React, { useState, useEffect } from 'react';
import StatusBadge from '../components/StatusBadge';

const Documents = ({ authToken, onViewDocument }) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const response = await fetch(`${API_URL}/api/documents`, {
          headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (response.ok) {
          const data = await response.json();
          setDocuments(data);
        }
      } catch (error) {
        console.error("Error fetching documents:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, []);

  return (
    <div className="documents-container">
      <div className="header-section flex justify-between items-center mb-8">
        <div>
          <h2 className="font-headline-lg text-primary">Documents</h2>
          <p className="font-body-lg text-on-surface-variant">Manage your encrypted files and share links.</p>
        </div>
        <button className="primary-btn font-label-caps flex items-center gap-2">
          <span className="material-symbols-outlined">add</span>
          Upload New
        </button>
      </div>

      <div className="card p-0">
        <div className="documents-list">
          {loading && (
            <div className="p-6">
              <div className="skeleton h-6 w-1/3 mb-4"></div>
              <div className="skeleton h-4 w-1/4"></div>
            </div>
          )}
          {!loading && documents.length === 0 && <div className="p-6 text-on-surface-variant">No documents found.</div>}
          
          {!loading && documents.map((doc) => (
            <div key={doc.id} className="document-item cursor-pointer" onClick={() => onViewDocument(doc)}>
              <div className="flex justify-between items-start">
                <div className="flex gap-4 items-start">
                  <div className="doc-icon">
                    <span className="material-symbols-outlined text-primary">description</span>
                  </div>
                  <div>
                    <h3 className="font-body-lg text-primary font-semibold">{doc.name}</h3>
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
                    </div>
                  </div>
                </div>
                <button className="action-btn">
                  <span className="material-symbols-outlined text-on-surface-variant">more_vert</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .documents-container {
          padding: var(--margin-desktop) 0;
          max-width: var(--max-content-width);
          margin: 0 auto;
        }
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
        .p-6 { padding: 24px; }
        .ml-2 { margin-left: 8px; }

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

