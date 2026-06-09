import React, { useEffect, useMemo, useRef, useState } from 'react';
import { marked } from 'marked';
import { getItemDisplayName } from '../utils/displayName';
import { getNoteContent } from '../utils/noteContent';

const getIcon = (type) => {
  switch(type) {
    case 'Channel': 
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256"><path d="M80,40a40,40,0,1,0,40,40A40,40,0,0,0,80,40Zm0,64a24,24,0,1,1,24-24A24,24,0,0,1,80,104Zm96,16a40,40,0,1,0-40-40A40,40,0,0,0,176,120Zm0-64a24,24,0,1,1-24,24A24,24,0,0,1,176,56ZM80,136a40,40,0,1,0,40,40A40,40,0,0,0,80,136Zm0,64a24,24,0,1,1,24-24A24,24,0,0,1,80,200Zm96-64a40,40,0,1,0,40,40A40,40,0,0,0,176,136Zm0,64a24,24,0,1,1,24-24A24,24,0,0,1,176,200Z"></path></svg>
      );
    case 'Image': 
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256"><path d="M247.31,124.76c-.35-.79-8.82-19.58-27.65-38.41C194.57,61.26,162.88,48,128,48S61.43,61.26,36.34,86.35C17.51,105.18,9,124,8.69,124.76a8,8,0,0,0,0,6.5c.35.79,8.82,19.57,27.65,38.4C61.43,194.74,93.12,208,128,208s66.57-13.26,91.66-38.34c18.83-18.83,27.3-37.61,27.65-38.4A8,8,0,0,0,247.31,124.76ZM128,192c-30.78,0-57.67-11.19-79.93-33.25A133.47,133.47,0,0,1,25,128,133.33,133.33,0,0,1,48.07,97.25C70.33,75.19,97.22,64,128,64s57.67,11.19,79.93,33.25A133.46,133.46,0,0,1,231.05,128C223.84,141.46,192.43,192,128,192Zm0-112a48,48,0,1,0,48,48A48.05,48.05,0,0,0,128,80Zm0,80a32,32,0,1,1,32-32A32,32,0,0,1,128,160Z"></path></svg>
      );
    case 'Text': 
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256"><path d="M232,48H160a40,40,0,0,0-32,16A40,40,0,0,0,96,48H24a8,8,0,0,0-8,8V200a8,8,0,0,0,8,8H96a24,24,0,0,1,24,24,8,8,0,0,0,16,0,24,24,0,0,1,24-24h72a8,8,0,0,0,8-8V56A8,8,0,0,0,232,48ZM96,192H32V64H96a24,24,0,0,1,24,24V200A39.81,39.81,0,0,0,96,192Zm128,0H160a39.81,39.81,0,0,0-24,8V88a24,24,0,0,1,24-24h64Z"></path></svg>
      );
    case 'Link': 
    case 'Embed':
    case 'Attachment':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256"><path d="M216,40H40A16,16,0,0,0,24,56V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40Zm0,160H40V56H216V200ZM80,84A12,12,0,1,1,68,72,12,12,0,0,1,80,84Zm40,0a12,12,0,1,1-12-12A12,12,0,0,1,120,84Z"></path></svg>
      );
    case 'User':
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M13 8C13 5.23858 10.7614 3 8 3C5.23858 3 3 5.23858 3 8C3 10.7614 5.23858 13 8 13V14C4.68629 14 2 11.3137 2 8C2 4.68629 4.68629 2 8 2C11.3137 2 14 4.68629 14 8C14 11.3137 11.3137 14 8 14V13C10.7614 13 13 10.7614 13 8Z" fill="currentColor"/>
        </svg>
      );
    default: 
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256"><path d="M216,40H40A16,16,0,0,0,24,56V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40Zm0,160H40V56H216V200ZM80,84A12,12,0,1,1,68,72,12,12,0,0,1,80,84Zm40,0a12,12,0,1,1-12-12A12,12,0,0,1,120,84Z"></path></svg>
      );
  }
};

const formatDate = (dateString) => {
  if (!dateString) return '';
  const d = new Date(dateString);
  const year = d.getFullYear().toString().slice(-2);
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${day}-${month}-${year}`;
};

const getItemType = (item) => item?.class || item?.type || '';

const getImageUrl = (item) => {
  return (
    item?.image?.display?.url ||
    item?.image?.thumb?.url ||
    item?.image?.large?.src ||
    item?.image?.original?.url ||
    item?.image?.src ||
    item?.attachment?.url ||
    ''
  );
};

const getChannelAvatarUrl = (item) => {
  return (
    item?.owner?.avatar_image?.display ||
    item?.owner?.avatar?.display ||
    item?.user?.avatar_image?.display ||
    item?.user?.avatar?.display ||
    ''
  );
};

const stripHtml = (html) => {
  if (!html) return '';
  return String(html)
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const getNoteText = (item) => {
  return stripHtml(
    item?.content ||
    item?.content_html ||
    item?.description ||
    item?.description_html ||
    item?.value ||
    item?.text ||
    item?.body ||
    ''
  );
};

const isImageItem = (item) => getItemType(item) === 'Image';

const isMasonryImageItem = (item) => {
  const type = getItemType(item);
  return type === 'Image' || type === 'Link';
};

export default function Panel({
  isActive, path, items, isLoading, selectedIndex, setSelectedIndex, onSelect, onPreview, onBack, onCreate, onDelete, onMove, onLoadMore, onDropItem, iframeSrc, onCloseIframe, onExternal, sortMode, onSortChange, onActivate, sourceSelector, sourceName, viewMode = 'auto', side, onContextMenuItem, onEscapeWithSearch, registerHasSearch, textPreview, onCloseTextPreview, onSaveTextPreview, onOpenUser }) {
  const listRef = useRef(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchQueryRef = useRef('');
  const hasSearchQueryRef = useRef(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');

  const visibleItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) return items;

    return items.filter((item) =>
      getItemDisplayName(item).toLowerCase().includes(query)
    );
  }, [items, searchQuery]);

  const hasSearch = searchQuery.trim().length > 0;
  const showUpDirectory = !hasSearch && path.length > 0;

  const imageCount = visibleItems.filter(isImageItem).length;
  const shouldUseAutoGallery = visibleItems.length > 0 && (imageCount / visibleItems.length) > 0.5;
  const effectiveViewMode = viewMode === 'auto'
    ? (shouldUseAutoGallery ? 'gallery' : 'list')
    : viewMode;

  const masonryItems = visibleItems.filter(isMasonryImageItem);
  const regularGalleryItems = visibleItems.filter(item => !isMasonryImageItem(item));

  const maxIndex = showUpDirectory ? visibleItems.length : Math.max(visibleItems.length - 1, 0);

  useEffect(() => {
    if (!isActive) return;

    const clearSearch = () => {
      searchQueryRef.current = '';
      setSearchQuery('');
      setSelectedIndex(path.length > 0 ? 0 : 0);
    };

    const selectFirstMatch = (query) => {
      const lowerQuery = query.trim().toLowerCase();
      const matchedItems = lowerQuery
        ? items.filter(item => getItemDisplayName(item).toLowerCase().includes(lowerQuery))
        : items;

      if (matchedItems.length === 0) {
        setSelectedIndex(0);
        return;
      }

      setSelectedIndex(0);
    };

    const getSelectedItem = () => {
      if (showUpDirectory && selectedIndex === 0) return null;
      const actualIndex = showUpDirectory ? selectedIndex - 1 : selectedIndex;
      return visibleItems[actualIndex] || null;
    };

    const handleKeyDown = (e) => {
      if (document.querySelector('.modal-overlay') || document.querySelector('.source-selector-overlay')) return;

      const isPrintableKey = e.key.length === 1;
      const hasSystemModifier = e.ctrlKey || e.metaKey || e.altKey;

      if (hasSystemModifier) return;

      if (e.key === 'ArrowUp') {
        e.preventDefault();

        if (effectiveViewMode === 'gallery') {
          const nextIndex = getNearestGalleryIndex('up');
          if (nextIndex !== null) {
            setSelectedIndex(nextIndex);
            return;
          }
        }

        setSelectedIndex(prev => Math.max(0, prev - 1));
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();

        if (effectiveViewMode === 'gallery') {
          const nextIndex = getNearestGalleryIndex('down');
          if (nextIndex !== null) {
            setSelectedIndex(nextIndex);
            return;
          }
        }

        setSelectedIndex(prev => Math.min(maxIndex, prev + 1));
      } else if (e.key === 'PageUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(0, prev - 10));
      } else if (e.key === 'PageDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(maxIndex, prev + 10));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();

        if (effectiveViewMode === 'gallery') {
          const nextIndex = getNearestGalleryIndex('left');
          if (nextIndex !== null) {
            setSelectedIndex(nextIndex);
            return;
          }
        }

        setSelectedIndex(0);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();

        if (effectiveViewMode === 'gallery') {
          const nextIndex = getNearestGalleryIndex('right');
          if (nextIndex !== null) {
            setSelectedIndex(nextIndex);
            return;
          }
        }

        setSelectedIndex(maxIndex);
      } else if (e.key === 'Home') {
        e.preventDefault();
        setSelectedIndex(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        setSelectedIndex(maxIndex);
      } else if (e.key === 'Enter') {
        const isCmd = e.metaKey || e.getModifierState('Meta') || e.getModifierState('Command');
        const isCtrl = e.ctrlKey || e.getModifierState('Control');
        const isAlt = e.altKey || e.getModifierState('Alt');
        const isShift = e.shiftKey || e.getModifierState('Shift');

        e.preventDefault();

        if (isCmd || isCtrl || isShift || isAlt) {
          const item = getSelectedItem();
          if (item && onExternal) onExternal(item);
          return;
        }

        if (showUpDirectory && selectedIndex === 0) {
          onBack();
        } else {
          const item = getSelectedItem();
          const itemType = item?.class || item?.type;

          if (item && (itemType === 'Channel' || itemType === 'User')) {
            clearSearch();
          }

          if (item) onSelect(item);
        }
      } else if (e.key === ' ') {
        e.preventDefault();
        const item = getSelectedItem();
        if (item) onPreview(item);
      } else if ((e.key === 'N' || e.key === 'n') && e.shiftKey && !searchQueryRef.current) {
        e.preventDefault();
        if (onCreate) onCreate();
      } else if (e.key === 'Backspace') {
        if (searchQueryRef.current) {
          e.preventDefault();
          const newQuery = searchQueryRef.current.slice(0, -1);
          searchQueryRef.current = newQuery;
          setSearchQuery(newQuery);
          selectFirstMatch(newQuery);
          return;
        }

        e.preventDefault();
        const item = getSelectedItem();
        if (item && onDelete) onDelete(item);
      } else if (e.key === 'Delete') {
        e.preventDefault();
        const item = getSelectedItem();
        if (item && onDelete) onDelete(item);
      } else if (isPrintableKey) {
        e.preventDefault();
        const newQuery = searchQueryRef.current + e.key;
        searchQueryRef.current = newQuery;
        setSearchQuery(newQuery);
        selectFirstMatch(newQuery);
      } else if (e.key === 'Escape') {
        if (isEditing) {
          e.preventDefault();
          e.stopPropagation();
          setIsEditing(false);
          return;
        }
        if (textPreview && onCloseTextPreview) {
          e.preventDefault();
          e.stopPropagation();
          onCloseTextPreview();
          return;
        }
        if (searchQueryRef.current || searchQuery) {
          e.preventDefault();
          e.stopPropagation();
          clearSearch();
          if (onEscapeWithSearch) onEscapeWithSearch();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, items, visibleItems, selectedIndex, path, searchQuery, showUpDirectory, maxIndex, onSelect, onPreview, onBack, onExternal, onMove, onDelete, onCreate, textPreview, onCloseTextPreview, isEditing]);


  useEffect(() => {
    searchQueryRef.current = searchQuery;
    hasSearchQueryRef.current = Boolean(searchQuery.trim());

    if (registerHasSearch) {
      registerHasSearch(Boolean(searchQuery.trim()));
    }
  }, [searchQuery, registerHasSearch]);

  useEffect(() => {
    if (selectedIndex > maxIndex) {
      setSelectedIndex(maxIndex);
    }
  }, [selectedIndex, maxIndex, setSelectedIndex]);

  useEffect(() => {
    if (!isActive || !listRef.current || iframeSrc) return;

    const container = listRef.current;
    const selectedElement = container.querySelector('.panel-item.selected, .gallery-item.selected');

    if (!selectedElement) return;

    const header = container.querySelector('.panel-columns-header');
    const headerHeight = header ? header.offsetHeight : 0;

    const itemTop = selectedElement.offsetTop - headerHeight;
    const itemBottom = itemTop + selectedElement.offsetHeight;
    const viewTop = container.scrollTop;
    const viewBottom = container.scrollTop + container.clientHeight - headerHeight;

    if (itemTop < viewTop) {
      container.scrollTop = Math.max(0, itemTop);
    } else if (itemBottom > viewBottom) {
      container.scrollTop = Math.max(0, itemBottom - (container.clientHeight - headerHeight));
    }
  }, [selectedIndex, isActive, items.length, path.length, iframeSrc, effectiveViewMode]);

  const getGalleryNavigationItems = () => {
    const container = listRef.current;
    if (!container) return [];

    return Array.from(container.querySelectorAll('[data-gallery-index]'))
      .map((node) => {
        const index = Number(node.getAttribute('data-gallery-index'));
        const rect = node.getBoundingClientRect();

        return {
          node,
          index,
          left: rect.left,
          right: rect.right,
          top: rect.top,
          bottom: rect.bottom,
          width: rect.width,
          height: rect.height,
          centerX: rect.left + rect.width / 2,
          centerY: rect.top + rect.height / 2
        };
      })
      .filter((item) => Number.isFinite(item.index));
  };

  const getNearestGalleryIndex = (direction) => {
    const navItems = getGalleryNavigationItems();
    if (navItems.length === 0) return null;

    const current = navItems.find((item) => item.index === selectedIndex) || navItems[0];
    if (!current) return null;

    const getHorizontalOverlap = (a, b) => {
      return Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
    };

    const getVerticalOverlap = (a, b) => {
      return Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
    };

    const isCandidateInDirection = (item) => {
      if (item.index === current.index) return false;

      if (direction === 'left') return item.centerX < current.centerX - 4;
      if (direction === 'right') return item.centerX > current.centerX + 4;
      if (direction === 'up') return item.centerY < current.centerY - 4;
      if (direction === 'down') return item.centerY > current.centerY + 4;

      return false;
    };

    const directionalCandidates = navItems.filter(isCandidateInDirection);
    if (directionalCandidates.length === 0) return null;

    const overlappingCandidates = directionalCandidates.filter((item) => {
      if (direction === 'up' || direction === 'down') {
        return getHorizontalOverlap(current, item) > 0;
      }

      if (direction === 'left' || direction === 'right') {
        return getVerticalOverlap(current, item) > 0;
      }

      return false;
    });

    const candidates = overlappingCandidates.length > 0 ? overlappingCandidates : directionalCandidates;

    const scoreCandidate = (item) => {
      const dx = item.centerX - current.centerX;
      const dy = item.centerY - current.centerY;

      if (direction === 'up' || direction === 'down') {
        const verticalDistance =
          direction === 'down'
            ? Math.max(0, item.top - current.bottom)
            : Math.max(0, current.top - item.bottom);

        const horizontalDistance = Math.abs(item.centerX - current.centerX);
        const overlapBonus = getHorizontalOverlap(current, item);

        return verticalDistance * 1000 + horizontalDistance - overlapBonus;
      }

      const horizontalDistance =
        direction === 'right'
          ? Math.max(0, item.left - current.right)
          : Math.max(0, current.left - item.right);

      const verticalDistance = Math.abs(item.centerY - current.centerY);
      const overlapBonus = getVerticalOverlap(current, item);

      return horizontalDistance * 1000 + verticalDistance - overlapBonus;
    };

    candidates.sort((a, b) => {
      const scoreDiff = scoreCandidate(a) - scoreCandidate(b);
      if (scoreDiff !== 0) return scoreDiff;

      const distanceA = Math.hypot(a.centerX - current.centerX, a.centerY - current.centerY);
      const distanceB = Math.hypot(b.centerX - current.centerX, b.centerY - current.centerY);
      return distanceA - distanceB;
    });

    return candidates[0]?.index ?? null;
  };

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    if (scrollHeight - scrollTop - clientHeight < 200) {
      if (onLoadMore) onLoadMore();
    }
  };

  const handleDragStart = (e, item) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ id: item.id, side }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    // Only clear if leaving the panel itself, not a child
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    try {
      const data = e.dataTransfer.getData('application/json');
      if (data) {
        const item = JSON.parse(data);
        if (onDropItem) onDropItem(item);
      }
    } catch (err) {
      console.error('Failed to parse dropped item', err);
    }
  };

  return (
    <div
      className={`panel ${isActive ? 'active' : ''}`}
      onMouseDown={() => {
        if (onActivate) onActivate();
      }}
      onClick={() => {
        if (onActivate) onActivate();
      }}
    >
      {sourceSelector}
      {!iframeSrc && !textPreview && (
        <div className="panel-header">
          <span className="panel-title">{path.length === 0 ? sourceName : path.join(' / ')}</span>
        </div>
      )}
      <div 
        className={`panel-content ${isDragOver ? 'drag-over' : ''} ${iframeSrc ? 'has-iframe' : ''} ${textPreview && !iframeSrc ? 'has-text-preview' : ''}`}
        ref={listRef} 
        onScroll={handleScroll}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {textPreview && !iframeSrc && (
          <div className="panel-text-preview-wrapper">
            <div className="panel-text-preview-bar">
              <span className="panel-text-preview-title">{textPreview.title || 'Untitled'}</span>
              <div className="panel-text-preview-actions">
                {isEditing ? (
                  <>
                    <button className="panel-iframe-close" onClick={() => { setIsEditing(false); }}>Cancel</button>
                    <button className="panel-iframe-close" onClick={() => { onSaveTextPreview(textPreview, editContent); setIsEditing(false); }}>Save</button>
                  </>
                ) : (
                  <>
                    <button className="panel-iframe-close" onClick={() => { setEditContent(getNoteContent(textPreview) || ''); setIsEditing(true); }}>Edit</button>
                    <button className="panel-iframe-close" onClick={onCloseTextPreview}>✕ ESC</button>
                  </>
                )}
              </div>
            </div>
            {isEditing ? (
              <textarea
                className="editor-textarea"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                style={{ flex: 1, minHeight: 0, border: 'none', borderRadius: 0 }}
                autoFocus
              />
            ) : (
              <div className="panel-text-preview-content">
                <div
                  className="markdown-body"
                  dangerouslySetInnerHTML={{ __html: marked(getNoteContent(textPreview) || '*Empty note*') }}
                />
                <div className="text-preview-meta">
                  {textPreview.user && (
                    <div className="text-preview-meta-line">
                      <svg className="text-preview-meta-icon" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M12 20v-6M12 8V4M4 12h16"/></svg>
                      <span className="text-preview-meta-label">Created</span>
                      <span className="text-preview-meta-value">
                        <span className="text-preview-user-link" onClick={() => onOpenUser && onOpenUser(textPreview.user)}>
                          {textPreview.user.full_name || textPreview.user.username || textPreview.user.slug || 'Unknown'}
                        </span>
                        {textPreview.created_at ? ' \u00b7 ' + new Date(textPreview.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                      </span>
                    </div>
                  )}
                  {textPreview.connection?.connected_by && (
                    <div className="text-preview-meta-line">
                      <svg className="text-preview-meta-icon" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4"/></svg>
                      <span className="text-preview-meta-label">Added</span>
                      <span className="text-preview-meta-value">
                        <span className="text-preview-user-link" onClick={() => onOpenUser && onOpenUser(textPreview.connection.connected_by)}>
                          {textPreview.connection.connected_by.name || textPreview.connection.connected_by.initials || 'Unknown'}
                        </span>
                        {textPreview.connection.connected_at ? ' \u00b7 ' + new Date(textPreview.connection.connected_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
        {!iframeSrc && !textPreview && effectiveViewMode === 'list' && (
          <div className="panel-columns-header">
            <span className="col-icon"></span>
            <span className="col-name">Name</span>
            <span className="col-size">Size</span>
            <span className="col-date">Created</span>
          </div>
        )}
        {iframeSrc && (
          <div className="panel-iframe-wrapper">
            <div className="panel-iframe-bar" onMouseEnter={() => window.focus()}>
              <span className="panel-iframe-url">{iframeSrc}</span>
              <button className="panel-iframe-close" onClick={onCloseIframe}>✕ ESC</button>
            </div>
            <iframe
              src={iframeSrc}
              className="panel-iframe"
              title="preview"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            />
          </div>
        )}
        {!iframeSrc && !textPreview && isLoading && <div className="panel-item loading">Loading...</div>}
        {!iframeSrc && !textPreview && !isLoading && effectiveViewMode === 'list' && showUpDirectory && (
          <div 
            className={`panel-item ${selectedIndex === 0 && isActive ? 'selected' : ''}`}
            onMouseDown={(e) => {
              e.stopPropagation();
              setSelectedIndex(0);
              if (onActivate) onActivate();
            }}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedIndex(0);
              if (onActivate) onActivate();
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              setSelectedIndex(0);
              if (onActivate) onActivate();
              if (onBack) onBack();
            }}
          >
             <span className="item-icon">{getIcon('Channel')}</span>
             <span className="item-name">..</span>
             <span className="item-size">UP--DIR</span>
             <span className="item-date"></span>
          </div>
        )}

        {!iframeSrc && !textPreview && !isLoading && effectiveViewMode === 'list' && visibleItems.map((item, idx) => {
          const displayIndex = showUpDirectory ? idx + 1 : idx;
          const isSelected = selectedIndex === displayIndex && isActive;
          
          return (
            <div 
              key={item.id || idx} 
              className={`panel-item ${isSelected ? 'selected' : ''} ${item.isDeleting ? 'deleting' : ''}`}
              onMouseDown={(e) => {
                e.stopPropagation();
                setSelectedIndex(displayIndex);
                if (onActivate) onActivate();
              }}
              onClick={(e) => {
                        e.stopPropagation();
                        setSelectedIndex(displayIndex);
                        if (onActivate) onActivate();
                        if (!item.isDeleting && type === 'Image' && onPreview) {
                          onPreview(item);
                          return;
                        }
                      }}
                      onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setSelectedIndex(displayIndex);
                if (onActivate) onActivate();
                if (!item.isDeleting && onContextMenuItem) onContextMenuItem(item, e);
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                setSelectedIndex(displayIndex);
                if (onActivate) onActivate();
                if (!item.isDeleting && onSelect) onSelect(item);
              }}
              draggable={!item.isDeleting}
              onDragStart={(e) => !item.isDeleting && handleDragStart(e, item)}
            >
              <span className="item-icon">
                {getIcon(item.class || item.type)}
                {item.isDeleting && <span style={{ marginLeft: '4px', color: '#FFFF55', fontSize: '0.7em', verticalAlign: 'middle' }}>[DEL]</span>}
              </span>
              <span className="item-name">
                {(() => {
                  const name = getItemDisplayName(item);
                  if (!searchQuery) return name;
                  const index = name.toLowerCase().indexOf(searchQuery.toLowerCase());
                  if (index === -1) return name;
                  return (
                    <>
                      {name.substring(0, index)}
                      <span className="search-highlight">{name.substring(index, index + searchQuery.length)}</span>
                      {name.substring(index + searchQuery.length)}
                    </>
                  );
                })()}
              </span>
              <span className="item-size">
                {(item.class === 'Channel' || item.type === 'Channel') 
                  ? `<DIR> ${item.length !== undefined ? item.length : item.counts?.contents || 0}` 
                  : (item.image?.file_size ? `${Math.round(item.image.file_size / 1024)}K` : '')}
              </span>
              <span className="item-date">{formatDate(item.created_at)}</span>
            </div>
          );
        })}

        {!iframeSrc && !textPreview && !isLoading && effectiveViewMode === 'gallery' && (
          <div className="gallery-layout">
            <div className="gallery-masonry">
              {showUpDirectory && (
                <div
                  className={`gallery-item gallery-masonry-item gallery-updir ${selectedIndex === 0 && isActive ? 'selected' : ''}`}
                  data-gallery-index={0}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    setSelectedIndex(0);
                    if (onActivate) onActivate();
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedIndex(0);
                    if (onActivate) onActivate();
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setSelectedIndex(0);
                    if (onActivate) onActivate();
                    if (onBack) onBack();
                  }}
                >
                  <div className="gallery-card gallery-card-channel">
                    <div className="gallery-channel-avatar gallery-updir-avatar">..</div>
                    <div className="gallery-channel-name">Up directory</div>
                  </div>
                </div>
              )}

              {masonryItems.length > 0 && (
                <>
                {masonryItems.map((item, idx) => {
                  const originalIndex = visibleItems.findIndex(visibleItem => String(visibleItem.id) === String(item.id));
                  const displayIndex = showUpDirectory ? originalIndex + 1 : originalIndex;
                  const isSelected = selectedIndex === displayIndex && isActive;
                  const type = getItemType(item);
                  const imageUrl = getImageUrl(item);

                  return (
                    <div
                      key={item.id || idx}
                      className={`gallery-item gallery-masonry-item ${isSelected ? 'selected' : ''} ${item.isDeleting ? 'deleting' : ''}`}
                      data-gallery-index={displayIndex}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setSelectedIndex(displayIndex);
                        if (onActivate) onActivate();
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedIndex(displayIndex);
                        if (onActivate) onActivate();
                        if (!item.isDeleting && type === 'Image' && onPreview) {
                          onPreview(item);
                          return;
                        }
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setSelectedIndex(displayIndex);
                        if (onActivate) onActivate();
                        if (!item.isDeleting && onContextMenuItem) onContextMenuItem(item, e);
                      }}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        setSelectedIndex(displayIndex);
                        if (onActivate) onActivate();
                        if (!item.isDeleting && onSelect) onSelect(item);
                      }}
                      draggable={!item.isDeleting}
                      onDragStart={(e) => !item.isDeleting && handleDragStart(e, item)}
                    >
                      {type === 'Image' && (
                        <div className="gallery-card gallery-card-image">
                          {imageUrl ? (
                            <img src={imageUrl} alt={getItemDisplayName(item)} className="gallery-image gallery-image-masonry" />
                          ) : (
                            <div className="gallery-image gallery-placeholder">{getItemDisplayName(item)}</div>
                          )}
                        </div>
                      )}

                      {type === 'Link' && (
                        <div className="gallery-card gallery-card-link">
                          <div className="gallery-link-preview">
                            {imageUrl ? (
                              <img src={imageUrl} alt={getItemDisplayName(item)} className="gallery-image gallery-image-masonry" />
                            ) : (
                              <div className="gallery-image gallery-placeholder">{getItemDisplayName(item)}</div>
                            )}
                          </div>
                          <div className="gallery-link-title">{getItemDisplayName(item)}</div>
                        </div>
                      )}
                    </div>
                  );
                })}
                </>
              )}
            </div>

            {regularGalleryItems.length > 0 && (
              <div className="gallery-grid gallery-grid-regular">
                {regularGalleryItems.map((item, idx) => {
                  const originalIndex = visibleItems.findIndex(visibleItem => String(visibleItem.id) === String(item.id));
                  const displayIndex = showUpDirectory ? originalIndex + 1 : originalIndex;
                  const isSelected = selectedIndex === displayIndex && isActive;
                  const type = getItemType(item);
                  const noteText = getNoteText(item);
                  const avatarUrl = getChannelAvatarUrl(item);

                  return (
                    <div
                      key={item.id || idx}
                      className={`gallery-item ${isSelected ? 'selected' : ''} ${item.isDeleting ? 'deleting' : ''}`}
                      data-gallery-index={displayIndex}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setSelectedIndex(displayIndex);
                        if (onActivate) onActivate();
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedIndex(displayIndex);
                        if (onActivate) onActivate();
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setSelectedIndex(displayIndex);
                        if (onActivate) onActivate();
                        if (!item.isDeleting && onContextMenuItem) onContextMenuItem(item, e);
                      }}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        setSelectedIndex(displayIndex);
                        if (onActivate) onActivate();
                        if (!item.isDeleting && onSelect) onSelect(item);
                      }}
                      draggable={!item.isDeleting}
                      onDragStart={(e) => !item.isDeleting && handleDragStart(e, item)}
                    >
                      {type === 'Text' && (
                        <div className="gallery-card gallery-card-note">
                          <div className="gallery-note-title">{getItemDisplayName(item)}</div>
                          <div className="gallery-note-body">{noteText || 'Empty note'}</div>
                        </div>
                      )}

                      {type === 'Channel' && (
                        <div className="gallery-card gallery-card-channel">
                          <div className="gallery-channel-avatar">
                            {avatarUrl ? (
                              <img src={avatarUrl} alt={getItemDisplayName(item)} className="gallery-avatar-image" />
                            ) : (
                              <span>{getItemDisplayName(item).slice(0, 1).toUpperCase()}</span>
                            )}
                          </div>
                          <div className="gallery-channel-name">{getItemDisplayName(item)}</div>
                        </div>
                      )}

                      {!['Image', 'Link', 'Text', 'Channel'].includes(type) && (
                        <div className="gallery-card gallery-card-default">
                          <div className="gallery-default-icon">{getIcon(type)}</div>
                          <div className="gallery-default-name">{getItemDisplayName(item)}</div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
        {!iframeSrc && !textPreview && !isLoading && hasSearch && visibleItems.length === 0 && (
          <div className="panel-item loading">No matches</div>
        )}
      </div>
      {searchQuery && (
        <div className="panel-search-bar">
          Search: {searchQuery}
        </div>
      )}
    </div>
  );
}
