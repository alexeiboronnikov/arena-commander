import React, { useState } from 'react';

export default function SettingsModal({ sortMode, onSortChange, viewMode, onViewModeChange, token, onTokenChange, theme, onThemeChange, onClose }) {
  const [tokenStatus, setTokenStatus] = useState(null);

  const handleApplyToken = async () => {
    setTokenStatus(null);
    try {
      const response = await fetch('https://api.are.na/v3/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        localStorage.setItem('arena_token', token);
        window.location.reload();
      } else {
        const data = await response.json().catch(() => ({}));
        setTokenStatus(data.error || data.message || `Error ${response.status}`);
      }
    } catch (e) {
      setTokenStatus(e.message || 'Network error');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content settings-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Application Settings</h2>
        </div>
        <div className="modal-body">
          <div className="settings-section">
            <h3>API Token</h3>
            <div className="settings-token-row">
              <input
                type="password"
                className="settings-text-input"
                value={token}
                onChange={(e) => { onTokenChange(e.target.value); setTokenStatus(null); }}
                placeholder="Enter your Are.na API token"
              />
              <button className="nc-button" onClick={handleApplyToken}>Apply</button>
            </div>
            <p className="settings-help">
              <a href="https://www.are.na/developers/personal-access-tokens" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>Get your token here</a>
            </p>
            {tokenStatus === 'ok' && (
              <span className="settings-token-applied">Applied</span>
            )}
            {tokenStatus && tokenStatus !== 'ok' && (
              <span className="settings-token-error">{tokenStatus}</span>
            )}
          </div>

          <div className="settings-section">
            <h3>Theme</h3>
            <p className="settings-help">Light or dark appearance.</p>
            <div className="settings-options">
              <label className="settings-option">
                <input
                  type="radio"
                  name="theme"
                  value="light"
                  checked={theme === 'light'}
                  onChange={() => onThemeChange('light')}
                />
                <span>Light</span>
              </label>
              <label className="settings-option">
                <input
                  type="radio"
                  name="theme"
                  value="dark"
                  checked={theme === 'dark'}
                  onChange={() => onThemeChange('dark')}
                />
                <span>Dark</span>
              </label>
            </div>
          </div>

          <div className="settings-section">
            <h3>View Mode</h3>
            <p className="settings-help">Choose how items are displayed in the panel.</p>
            <div className="settings-options">
              <label className="settings-option">
                <input
                  type="radio"
                  name="viewMode"
                  value="list"
                  checked={viewMode === 'list'}
                  onChange={(e) => onViewModeChange(e.target.value)}
                />
                <span>List</span>
              </label>
              <label className="settings-option">
                <input
                  type="radio"
                  name="viewMode"
                  value="gallery"
                  checked={viewMode === 'gallery'}
                  onChange={(e) => onViewModeChange(e.target.value)}
                />
                <span>Gallery</span>
              </label>
              <label className="settings-option">
                <input
                  type="radio"
                  name="viewMode"
                  value="auto"
                  checked={viewMode === 'auto'}
                  onChange={(e) => onViewModeChange(e.target.value)}
                />
                <span>Auto (Gallery when images are more than 50%)</span>
              </label>
            </div>
          </div>

          <div className="settings-section">
            <h3>Sorting Mode</h3>
            <p className="settings-help">How files and folders are ordered in the panels.</p>
            <div className="settings-options">
              <label className="settings-option">
                <input 
                  type="radio" 
                  name="sortMode" 
                  value="auto" 
                  checked={sortMode === 'auto'} 
                  onChange={(e) => onSortChange(e.target.value)}
                />
                <span>Auto (Folders First, then Alphabetical)</span>
              </label>
              <label className="settings-option">
                <input 
                  type="radio" 
                  name="sortMode" 
                  value="alpha" 
                  checked={sortMode === 'alpha'} 
                  onChange={(e) => onSortChange(e.target.value)}
                />
                <span>Alphabetical (Mixed)</span>
              </label>
              <label className="settings-option">
                <input 
                  type="radio" 
                  name="sortMode" 
                  value="newest" 
                  checked={sortMode === 'newest'} 
                  onChange={(e) => onSortChange(e.target.value)}
                />
                <span>Newest First</span>
              </label>
              <label className="settings-option">
                <input 
                  type="radio" 
                  name="sortMode" 
                  value="oldest" 
                  checked={sortMode === 'oldest'} 
                  onChange={(e) => onSortChange(e.target.value)}
                />
                <span>Oldest First</span>
              </label>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="nc-button" onClick={onClose}>Close (ESC)</button>
        </div>
      </div>
    </div>
  );
}
