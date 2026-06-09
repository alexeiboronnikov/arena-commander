import React, { useEffect, useRef, useState } from 'react';

export default function CreateChannelModal({ onSave, onClose }) {
  const inputRef = useRef(null);
  const [title, setTitle] = useState('');
  const [visibility, setVisibility] = useState('closed');

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSave = () => {
    if (title.trim()) {
      onSave(title.trim(), visibility);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal editor-modal">
        <div className="modal-header">
          <h2>New Channel</h2>
          <span>[Esc]</span>
        </div>

        <div className="editor-body">
          <label className="editor-label">Name</label>
          <input
            ref={inputRef}
            className="editor-input"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Folder name"
          />

          <label className="editor-label">Visibility</label>
          <select
            className="editor-input"
            value={visibility}
            onChange={(e) => setVisibility(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{ appearance: 'auto', cursor: 'pointer' }}
          >
            <option value="closed">Closed</option>
            <option value="public">Public</option>
            <option value="private">Private</option>
          </select>
        </div>

        <div className="modal-actions">
          <button onClick={onClose}>Cancel [Esc]</button>
          <button onClick={handleSave} disabled={!title.trim()}>
            Create [Enter]
          </button>
        </div>
      </div>
    </div>
  );
}
