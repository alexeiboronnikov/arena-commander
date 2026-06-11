import React, { useState, useEffect, useCallback, useRef } from 'react';
import useSWR, { mutate } from 'swr';
import useSWRInfinite from 'swr/infinite';
import Panel from './components/Panel';
import PreviewModal from './components/PreviewModal';
import EditorModal from './components/EditorModal';
import ConfirmModal from './components/ConfirmModal';
import SettingsModal from './components/SettingsModal';
import CreateChannelModal from './components/CreateChannelModal';
import SourceSelector from './components/SourceSelector';

import { getCurrentUser, fetcher, getBlock, createBlock, updateBlock, deleteConnection, createConnection, deleteChannel, createChannel, unfollowItem, addItemToChannel, getMyChannels, findOrCreateSystemChannel, readSystemConfig, saveSystemConfig } from './api';
import './index.css';
import { getItemDisplayName } from './utils/displayName';

function usePanel(userSlug, side, sortMode) {
  const storageKey = `panel_state_${side}`;
  const sourceKey = `panel_source_${side}`;
  
  // Load initial state from localStorage
  const initialState = JSON.parse(localStorage.getItem(storageKey) || '{"path":[], "slugs":[], "ids":[]}');
  const initialSource = localStorage.getItem(sourceKey) || 'personal';
  
  const [path, setPath] = useState(initialState.path);
  const [slugs, setSlugs] = useState(initialState.slugs);
  const [ids, setIds] = useState(initialState.ids);
  const [sourceType, setSourceType] = useState(initialSource);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [lastExitedSlug, setLastExitedSlug] = useState(null);
  const [deletingIds, setDeletingIds] = useState(new Set());
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [selectionAnchorIndex, setSelectionAnchorIndex] = useState(null);

  // Persist source to localStorage
  useEffect(() => {
    localStorage.setItem(sourceKey, sourceType);
  }, [sourceType, sourceKey]);

  // Persist state to localStorage
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify({ path, slugs, ids }));
  }, [path, slugs, ids, storageKey]);

  const getKey = (pageIndex, previousPageData) => {
    if (!userSlug) return null;
    if (previousPageData && !previousPageData.length) return null;
    const page = pageIndex + 1;

    if (slugs.length === 0) {
      if (sourceType === 'following') {
        return `/users/${userSlug}/following?per=100&page=${page}`;
      }
      if (sourceType === 'followers') {
        return `/users/${userSlug}/followers?per=100&page=${page}`;
      }
      return `/users/${userSlug}/contents?type=Channel&sort=updated_at_desc&per=100&page=${page}`;
    } else {
      const lastSlug = slugs[slugs.length - 1];
      if (lastSlug.startsWith('user:')) {
        const targetUserSlug = lastSlug.replace('user:', '');
        return `/users/${targetUserSlug}/contents?type=Channel&sort=updated_at_desc&per=100&page=${page}`;
      }
      return `/channels/${lastSlug}/contents?per=100&page=${page}`;
    }
  };

  const { data, error, isLoading, isValidating, size, setSize, mutate: panelMutate } = useSWRInfinite(getKey, fetcher, {
    keepPreviousData: true,
    revalidateFirstPage: false,
    revalidateOnFocus: false
  });

  const hasData = Array.isArray(data) && data.length > 0;
  const lastPage = hasData ? data[data.length - 1] : null;
  const isFullyLoaded = hasData && Array.isArray(lastPage) && lastPage.length < 100;

  // Preload all pages before showing the list.
  // This prevents items from appearing gradually while navigating.
  useEffect(() => {
    if (!hasData) return;
    if (isValidating) return;
    if (isFullyLoaded) return;

    if (Array.isArray(lastPage) && lastPage.length === 100) {
      setSize(data.length + 1);
    }
  }, [hasData, data, isValidating, isFullyLoaded, lastPage, setSize]);

  const rawItems = React.useMemo(() => {
    if (!data || data.length === 0) return [];

    const flatItems = data.flat();
    const seen = new Set();
    const deduped = [];

    for (const item of flatItems) {
      const key =
        item?.id != null
          ? `id:${item.id}`
          : item?.slug
            ? `slug:${item.slug}`
            : `${item?.class || item?.type || 'item'}:${getItemDisplayName(item)}`;

      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(item);
    }

    return deduped;
  }, [data, isFullyLoaded]);

  const items = React.useMemo(() => {
    let sorted = [...rawItems];

    const alphaSort = (a, b) => {
      const aTitle = getItemDisplayName(a).toLowerCase();
      const bTitle = getItemDisplayName(b).toLowerCase();
      return aTitle.localeCompare(bTitle);
    };

    const updatedDescSort = (a, b) => {
      const aIsChannel = (a.class || a.type) === 'Channel';
      const bIsChannel = (b.class || b.type) === 'Channel';

      if (aIsChannel !== bIsChannel) {
        return aIsChannel ? -1 : 1;
      }

      const aDate = new Date(a.updated_at || a.created_at || 0).getTime();
      const bDate = new Date(b.updated_at || b.created_at || 0).getTime();
      return bDate - aDate;
    };

    const isRoot = slugs.length === 0;
    const preserveRecentAtRoot =
      isRoot && (sourceType === 'following' || sourceType === 'personal');

    if (preserveRecentAtRoot) {
      sorted.sort(updatedDescSort);
    } else if (sortMode === 'auto') {
      const dirs = sorted.filter(i => i.class === 'Channel' || i.type === 'Channel');
      const files = sorted.filter(i => !(i.class === 'Channel' || i.type === 'Channel'));

      dirs.sort(alphaSort);
      files.sort(alphaSort);
      sorted = [...dirs, ...files];
    } else if (sortMode === 'newest') {
      sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } else if (sortMode === 'oldest') {
      sorted.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    } else if (sortMode === 'alpha') {
      sorted.sort(alphaSort);
    }

    return sorted.map(item => ({
      ...item,
      isDeleting: deletingIds.has(item.id)
    }));
  }, [rawItems, sortMode, deletingIds, slugs.length, sourceType]);

  const loadMore = useCallback(() => {
    // Disabled: pages are now preloaded automatically before displaying the list.
  }, []);

  const url = getKey(0, null);

  useEffect(() => {
    if (!lastExitedSlug || items.length === 0) return;

    const normalizedLastExited = String(lastExitedSlug);
    const index = items.findIndex(i =>
      String(i?.id ?? '') === normalizedLastExited ||
      String(i?.slug ?? '') === normalizedLastExited
    );

    if (index === -1) return;

    const displayIndex = path.length > 0 ? index + 1 : index;
    setSelectedIndex(displayIndex);
    setLastExitedSlug(null);
  }, [items, lastExitedSlug, path.length]);

  useEffect(() => {
    if (slugs.length !== 0 || sourceType !== 'following' || items.length === 0) return;
    if (lastExitedSlug) return;

    const followedContainer = path[path.length - 1];
    if (!followedContainer) return;

    const normalizedTarget = String(followedContainer).trim().toLowerCase();

    const index = items.findIndex((item) => {
      const candidates = [
        item?.title,
        item?.name,
        item?.full_name,
        item?.username,
        item?.slug
      ]
        .filter(Boolean)
        .map(value => String(value).trim().toLowerCase());

      return candidates.includes(normalizedTarget);
    });

    if (index === -1) return;

    setSelectedIndex(index);
  }, [items, path, slugs.length, sourceType, lastExitedSlug]);

  const pushLevel = (title, slug, id) => {
    setPath(prev => [...prev, title]);
    setSlugs(prev => [...prev, slug]);
    setIds(prev => [...prev, id]);
    setSelectedIndex(0);
    setSelectedIds(new Set());
    setSelectionAnchorIndex(null);
    setLastExitedSlug(null);
  };

  const popLevel = () => {
    if (slugs.length === 0) return;
    const exitingId = ids[ids.length - 1];
    setPath(prev => prev.slice(0, -1));
    setSlugs(prev => prev.slice(0, -1));
    setIds(prev => prev.slice(0, -1));
    setLastExitedSlug(exitingId);
  };

  const markAsDeleting = (id) => {
    setDeletingIds(prev => new Set(prev).add(id));
  };

  const unmarkAsDeleting = (id) => {
    setDeletingIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const resetToRoot = useCallback(() => {
    setPath([]);
    setSlugs([]);
    setIds([]);
    setSelectedIndex(0);
    setSelectedIds(new Set());
    setSelectionAnchorIndex(null);
    setLastExitedSlug(null);
  }, []);

  return { 
    path, slugs, ids, items, isLoading: isLoading || (!!userSlug && !error && !isFullyLoaded), url, pushLevel, popLevel, selectedIndex, setSelectedIndex, loadMore, markAsDeleting, unmarkAsDeleting,
    selectedIds, setSelectedIds, selectionAnchorIndex, setSelectionAnchorIndex,
    sourceType, setSourceType, resetToRoot, mutate: panelMutate,
    setPath, setSlugs, setIds, setLastExitedSlug
  };
}

export default function App() {
  const [user, setUser] = useState(null);
  const [activePanel, setActivePanel] = useState('left');
  const [sortMode, setSortMode] = useState(localStorage.getItem('global_sort_mode') || 'auto');
  const [viewMode, setViewMode] = useState(localStorage.getItem('global_view_mode') || 'auto');
  const [token, setToken] = useState(localStorage.getItem('arena_token') || '');
  const [isSettingsOpen, setIsSettingsOpen] = useState(!localStorage.getItem('arena_token'));
  const [previewItem, setPreviewItem] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteItem, setDeleteItem] = useState(null);
  const [moveItem, setMoveItem] = useState(null); 
  const [targetChannel, setTargetChannel] = useState(null);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [leftIframe, setLeftIframe] = useState(null);
  const [rightIframe, setRightIframe] = useState(null);
  const [leftTextPreview, setLeftTextPreview] = useState(null);
  const [rightTextPreview, setRightTextPreview] = useState(null);
  const [leftHasSearch, setLeftHasSearch] = useState(false);
  const [rightHasSearch, setRightHasSearch] = useState(false);
  const [sourceSelectorPanel, setSourceSelectorPanel] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [currentLocationTarget, setCurrentLocationTarget] = useState(null);
  const [myChannels, setMyChannels] = useState([]);
  const [myChannelsLoading, setMyChannelsLoading] = useState(false);
  const [movingIds, setMovingIds] = useState(new Set());
  const [connectedChannelIds, setConnectedChannelIds] = useState(new Set());
  const connectedChannelIdsRef = useRef(connectedChannelIds);
  useEffect(() => { connectedChannelIdsRef.current = connectedChannelIds; }, [connectedChannelIds]);
  const [systemChannelId, setSystemChannelId] = useState(null);
  const [panelSplit, setPanelSplit] = useState(() => {
    const saved = Number(localStorage.getItem('arena_panel_split'));
    return Number.isFinite(saved) && saved >= 20 && saved <= 80 ? saved : 50;
  });
  const [isResizingPanels, setIsResizingPanels] = useState(false);
  const panelsContainerRef = useRef(null);
  const resizeStateRef = useRef({
    active: false
  });
  const pendingIframeCloseRef = useRef(null);

  const clampPanelSplit = useCallback((value) => {
    return Math.max(20, Math.min(80, value));
  }, []);

  const getSnappedPanelSplit = useCallback((value) => {
    const SNAP_TARGET = 50;
    const SNAP_RANGE = 2;
    return Math.abs(value - SNAP_TARGET) <= SNAP_RANGE ? SNAP_TARGET : value;
  }, []);

  const updatePanelSplitFromClientX = useCallback((clientX) => {
    const container = panelsContainerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    if (!rect.width) return;

    const raw = ((clientX - rect.left) / rect.width) * 100;
    const clamped = clampPanelSplit(raw);
    const snapped = getSnappedPanelSplit(clamped);

    setPanelSplit(snapped);
  }, [clampPanelSplit, getSnappedPanelSplit]);

  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('arena_theme');
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('arena_theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('arena_panel_split', String(panelSplit));
  }, [panelSplit]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!resizeStateRef.current.active) return;
      e.preventDefault();
      updatePanelSplitFromClientX(e.clientX);
    };

    const handleMouseUp = () => {
      if (!resizeStateRef.current.active) return;
      resizeStateRef.current.active = false;
      setIsResizingPanels(false);
      document.body.classList.remove('is-resizing-panels');
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [updatePanelSplitFromClientX]);


  useEffect(() => {
    getCurrentUser().then(setUser).catch(console.error);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadMyChannels() {
      if (!user?.slug) return;

      setMyChannelsLoading(true);

      try {
        const channels = await getMyChannels(user.slug);

        if (!cancelled) {
          const deduped = [];
          const seen = new Set();

          channels.forEach((channel) => {
            const id = String(channel?.id || '');
            if (!id || seen.has(id)) return;
            seen.add(id);
            deduped.push(channel);
          });

          deduped.sort((a, b) => {
            const aName = String(a.title || a.name || a.slug || '').toLowerCase();
            const bName = String(b.title || b.name || b.slug || '').toLowerCase();
            return aName.localeCompare(bName);
          });

          setMyChannels(deduped);
        }
      } catch (e) {
        console.error('[MY CHANNELS] Failed:', e);
        if (!cancelled) {
          setMyChannels([]);
        }
      } finally {
        if (!cancelled) {
          setMyChannelsLoading(false);
        }
      }
    }

    loadMyChannels();

    return () => {
      cancelled = true;
    };
  }, [user?.slug]);

  useEffect(() => {
    if (!user?.slug || myChannels.length === 0) return;
    let cancelled = false;
    (async () => {
      try {
        const system = await findOrCreateSystemChannel(user.slug);
        if (cancelled) return;
        setSystemChannelId(system.id);
        const ids = await readSystemConfig(system.id);
        if (!cancelled && ids.length > 0) {
          setConnectedChannelIds(new Set(ids));
        }
      } catch (e) {
        console.warn('[SYSTEM CHANNEL]', e);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.slug, myChannels]);

  const left = usePanel(user?.slug, 'left', sortMode);
  const right = usePanel(user?.slug, 'right', sortMode);

  useEffect(() => {
    if (!currentLocationTarget) return;

    const panel = currentLocationTarget.side === 'left' ? left : right;

    panel.setSourceType(currentLocationTarget.sourceType);
    panel.setPath(currentLocationTarget.path);
    panel.setSlugs(currentLocationTarget.slugs);
    panel.setIds(currentLocationTarget.ids);
    panel.setSelectedIndex(0);
    panel.setSelectedIds(new Set());
    panel.setSelectionAnchorIndex(null);
    panel.setLastExitedSlug(null);

    setCurrentLocationTarget(null);
  }, [currentLocationTarget, left, right]);

  const leftRef = useRef(null);
  const rightRef = useRef(null);
  useEffect(() => { leftRef.current = left; }, [left]);
  useEffect(() => { rightRef.current = right; }, [right]);

  useEffect(() => {
    localStorage.setItem('global_sort_mode', sortMode);
  }, [sortMode]);

  useEffect(() => {
    localStorage.setItem('global_view_mode', viewMode);
  }, [viewMode]);

  useEffect(() => {
    localStorage.setItem('arena_token', token);
  }, [token]);

  // Auto-load when keyboard navigating past 50% of the list
  useEffect(() => {
    const active = activePanel === 'left' ? left : right;
    if (active.items.length > 0 && active.selectedIndex >= active.items.length / 2) {
      active.loadMore();
    }
  }, [activePanel, left.selectedIndex, right.selectedIndex, left.items.length, right.items.length]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (isSettingsOpen) { setIsSettingsOpen(false); return; }

        // Avoid intercepting when modal or source selector is open
        if (
          document.querySelector('.modal-overlay') ||
          document.querySelector('.source-selector-overlay')
        ) return;

        const pendingClose = pendingIframeCloseRef.current;

        if (pendingClose === 'left' && leftIframe && !leftHasSearch) {
          e.preventDefault();
          pendingIframeCloseRef.current = null;
          setLeftIframe(null);
          return;
        }

        if (pendingClose === 'right' && rightIframe && !rightHasSearch) {
          e.preventDefault();
          pendingIframeCloseRef.current = null;
          setRightIframe(null);
          return;
        }

        pendingIframeCloseRef.current = null;

        if (leftIframe) { setLeftIframe(null); return; }
        if (rightIframe) { setRightIframe(null); return; }
      }

      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        setIsSettingsOpen(true);
      }

      if (e.ctrlKey && e.key === 'c') {
        e.preventDefault();
        const active = activePanel === 'left' ? left : right;
        if (active.sourceType === 'personal') {
          setShowCreateChannel(true);
        }
      }

      if (e.key === 'Tab') {
        e.preventDefault();
        setActivePanel(prev => prev === 'left' ? 'right' : 'left');
      } else if (e.ctrlKey && e.key === '1') {
        e.preventDefault();
        setSourceSelectorPanel('left');
      } else if (e.ctrlKey && e.key === '2') {
        e.preventDefault();
        setSourceSelectorPanel('right');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [leftIframe, rightIframe, leftHasSearch, rightHasSearch, isSettingsOpen]);

  const handleSelect = (panel, item) => {
    const type = item.class || item.type;
    const isLeft = panel === left;
    if (type === 'Channel') {
      if (isLeft) { setRightIframe(null); setRightTextPreview(null); } else { setLeftIframe(null); setLeftTextPreview(null); }
      panel.pushLevel(item.title || item.name || item.slug || `Channel ${item.id}`, item.slug || item.id, item.id);
    } else if (type === 'User') {
      if (isLeft) { setRightIframe(null); setRightTextPreview(null); } else { setLeftIframe(null); setLeftTextPreview(null); }
      panel.pushLevel(item.full_name || item.name || item.username || item.slug || `User ${item.id}`, `user:${item.slug || item.id}`, item.id);
    } else if (type === 'Link') {
      const url = item.source?.url || item.attachment?.url;
      if (isLeft) setRightTextPreview(null); else setLeftTextPreview(null);
      if (url) {
        if (isLeft) setRightIframe(url); else setLeftIframe(url);
      } else {
        setPreviewItem(item);
      }
    } else if (type === 'Text') {
      if (isLeft) { setRightIframe(null); setRightTextPreview(item); } else { setLeftIframe(null); setLeftTextPreview(item); }
      getBlock(item.id).then(full => {
        const merged = full ? { ...item, ...full, ...(full.attributes || {}) } : item;
        if (isLeft) setRightTextPreview(merged); else setLeftTextPreview(merged);
      }).catch(() => {});
    } else {
      if (isLeft) { setRightIframe(null); setRightTextPreview(null); } else { setLeftIframe(null); setLeftTextPreview(null); }
      setPreviewItem(item);
    }
  };

  const handleExternal = useCallback((item) => {
    console.log('[DEBUG] handleExternal called for:', item);
    let url;
    const type = item.class || item.type || item.base_class || item.base_type;
    if (type === 'Channel') {
      url = `https://www.are.na/channel/${item.slug}`;
    } else if (type === 'User') {
      url = `https://www.are.na/${item.slug}`;
    } else {
      url = item.source?.url || item.attachment?.url || `https://www.are.na/block/${item.id}`;
    }
    console.log('[DEBUG] Opening URL:', url);
    if (url) {
      const win = window.open(url, '_blank');
      if (!win) {
        console.error('[DEBUG] Popup blocked!');
        alert('Browser blocked the popup. Please allow popups for this site.');
      }
    }
  }, []);

  const renderSourceSelector = (side) => {
    const targetPanel = side === 'left' ? left : right;
    const oppositePanel = side === 'left' ? right : left;
    const hasCurrentLocation = oppositePanel.path.length > 0 || oppositePanel.slugs.length > 0 || oppositePanel.sourceType !== 'personal';

    return (
      <SourceSelector 
        activePanelId={side}
        currentLocationPath={
          hasCurrentLocation
            ? {
                sourceType: oppositePanel.sourceType,
                path: [...oppositePanel.path],
                slugs: [...oppositePanel.slugs],
                ids: [...oppositePanel.ids]
              }
            : null
        }
        onClose={() => {
          setSourceSelectorPanel(null);
          setCurrentLocationTarget(null);
        }}
        onSelect={(newSource) => {
          if (newSource === 'current-location') {
            if (hasCurrentLocation) {
              setCurrentLocationTarget({
                side,
                sourceType: oppositePanel.sourceType,
                path: [...oppositePanel.path],
                slugs: [...oppositePanel.slugs],
                ids: [...oppositePanel.ids]
              });
            }
            setSourceSelectorPanel(null);
            return;
          }

          if (targetPanel.sourceType !== newSource) {
            targetPanel.setSourceType(newSource);
            targetPanel.resetToRoot();
          } else {
            targetPanel.resetToRoot();
          }

          setCurrentLocationTarget(null);
          setSourceSelectorPanel(null);
        }}
      />
    );
  };

  const getAllPersonalChannels = useCallback(() => {
    return myChannels;
  }, [myChannels]);

  const handleAddToChannel = async (item, channel) => {
    try {
      await addItemToChannel(item, channel.id);
      left.mutate();
      right.mutate();
    } catch (e) {
      console.error('[ADD TO CHANNEL] Failed:', e);
      alert('Add to failed: ' + (e.message || 'Unknown error'));
    } finally {
      setContextMenu(null);
    }
  };

  const getSourceName = (type) => {
    switch(type) {
      case 'personal': return 'My Arena';
      case 'following': return "I'm Following";
      case 'followers': return 'My Followers';
      default: return 'Arena';
    }
  };

  const handleCreate = async (panel) => {
    if (panel.sourceType !== 'personal') {
      alert('New folders can only be created in My Arena.');
      return;
    }

    const title = window.prompt('New folder/channel title:');

    if (!title || !title.trim()) return;

    const visibilityInput = window.prompt(
      'Visibility: public, closed, or private',
      'closed'
    );

    const normalizedVisibility = (visibilityInput || 'closed').trim().toLowerCase();
    const status = ['public', 'closed', 'private'].includes(normalizedVisibility)
      ? normalizedVisibility
      : 'closed';

    try {
      const channel = await createChannel(title.trim(), status);

      // If you are inside another channel, connect the new channel there,
      // so it behaves like a folder inside the current folder.
      if (panel.ids.length > 0) {
        const parentChannelId = panel.ids[panel.ids.length - 1];
        await createConnection(channel.id, 'Channel', parentChannelId);
        const next = new Set(connectedChannelIdsRef.current);
        next.add(channel.id);
        setConnectedChannelIds(next);
        if (systemChannelId) saveSystemConfig(systemChannelId, next);
      }

      panel.mutate(undefined, { revalidateFirstPage: true });

      setTimeout(() => {
        panel.mutate(undefined, { revalidateFirstPage: true });
      }, 1200);
    } catch (e) {
      console.error('[CREATE CHANNEL] Failed:', e);
      alert('Failed to create folder: ' + (e.message || 'Unknown error'));
    }
  };

  const handleDelete = (panel, item) => {
    console.log('[DEBUG] App.handleDelete reached for:', item.title || item.name || item.slug);
    setDeleteItem(item);
  };

  const handleMove = (panel, item) => {
    if (!item.connection || !item.connection.id) return;

    const oppositePanel = panel === left ? right : left;
    
    if (oppositePanel.ids.length === 0) {
      alert('You can only move an item into a channel. Please open a target channel in the opposite panel first.');
      return;
    }
    
    const targetChannelId = oppositePanel.ids[oppositePanel.ids.length - 1];
    const targetChannelName = oppositePanel.path[oppositePanel.path.length - 1] || 'Unknown Channel';
    
    setMoveItem(item);
    setTargetChannel({ id: targetChannelId, name: targetChannelName });
  };

  const saveEdit = async (data) => {
    const active = activePanel === 'left' ? left : right;
    const content = typeof data === 'string' ? data : data.content;
    try {
      if (isCreating) {
        const channelId = active.ids[active.ids.length - 1];
        await createBlock(channelId, content);
      } else if (editItem) {
        await updateBlock(editItem.id, content, data.title, data.description);
      }
      mutate(active.url);
    } catch (e) {
      console.error(e);
      alert('Failed to save note');
    } finally {
      setIsCreating(false);
      setEditItem(null);
    }
  };

  const confirmDelete = async () => {
    const active = activePanel === 'left' ? left : right;
    const itemsToProcess = Array.isArray(deleteItem) ? deleteItem : [deleteItem];
    const itemIds = new Set(itemsToProcess.map(item => item?.id).filter(id => id !== undefined && id !== null));

    const isFollowingRoot = active.sourceType === 'following' && active.slugs.length === 0;
    
    setDeleteItem(null); // Close modal instantly

    // Optimistic UI: remove from the list immediately
    active.mutate(
      (currentData) => currentData?.map(page => page.filter(i => !itemIds.has(i.id))),
      { revalidate: false }
    );

    active.setSelectedIds?.(new Set());
    active.setSelectionAnchorIndex?.(null);

    try {
      if (isFollowingRoot) {
        // In "I'm Following", Delete means unfollow/unsubscribe.
        // Never delete the user/channel itself.
        for (const item of itemsToProcess) {
          await unfollowItem(user, item);
        }
      } else {
        for (const itemToDelete of itemsToProcess) {
          const isChannel =
            itemToDelete.class === 'Channel' ||
            itemToDelete.type === 'Channel' ||
            itemToDelete.base_class === 'Channel';
          
          if (itemToDelete.connection?.id) {
            await deleteConnection(itemToDelete.connection.id);
          } else if (isChannel) {
            await deleteChannel(itemToDelete.slug || itemToDelete.id);
          } else {
            throw new Error('This item cannot be deleted');
          }
        }
      }
      
      // Wait and sync with server
      setTimeout(() => {
        active.mutate();
      }, 1500);
    } catch (e) {
      console.error(isFollowingRoot ? '[UNFOLLOW] Failed:' : '[DELETE] Failed:', e);
      alert((isFollowingRoot ? 'Unfollow failed: ' : 'Deletion failed: ') + (e.message || 'Unknown error'));

      // Rollback: sync again if it failed
      active.mutate();
    }
  };

  const confirmMove = async () => {
    const active = activePanel === 'left' ? left : right;
    const opposite = activePanel === 'left' ? right : left;
    const itemToMove = moveItem;
    const target = targetChannel;

    setMoveItem(null); 
    setTargetChannel(null);

    if (!itemToMove || !target) return;

    // 1. Mark as in-progress (semi-transparent) in source
    active.markAsDeleting(itemToMove.id);

    try {
      const itemType = itemToMove.class === 'Channel' ? 'Channel' : 'Block';
      
      // 2. Add to target folder
      try {
        await createConnection(itemToMove.id, itemType, target.id);
        
        // 3. Optimistically show in target panel immediately after successful creation
        opposite.mutate(
          (currentData) => {
            if (!currentData) return [[itemToMove]];
            const newData = [...currentData];
            newData[0] = [itemToMove, ...newData[0]];
            return newData;
          },
          { revalidate: false }
        );
      } catch (err) {
        if (!err.message.includes('unique')) throw err;
      }

      // 4. Remove from source folder
      if (itemToMove.connection?.id) {
        await deleteConnection(itemToMove.connection.id);
      }

      // 5. Instantly remove from source panel UI
      active.mutate(
        (currentData) => currentData?.map(page => page.filter(i => i.id !== itemToMove.id)),
        { revalidate: false }
      );

      // 6. Final sync after delay
      setTimeout(() => {
        active.mutate();
        opposite.mutate();
        active.unmarkAsDeleting(itemToMove.id);
      }, 1500);

    } catch (e) {
      console.error('[MOVE] Failed:', e.message);
      alert('Move failed: ' + e.message);
      active.unmarkAsDeleting(itemToMove.id);
      active.mutate();
      opposite.mutate();
    }
  };

  const handleDropMove = async (dragData, targetSide) => {
    const { id, ids, side } = dragData;

    const latestSource = side === 'left' ? leftRef.current : rightRef.current;
    const latestTarget = targetSide === 'left' ? leftRef.current : rightRef.current;

    if (!latestSource || !latestTarget) return;

    const targetChannelId = latestTarget.ids[latestTarget.ids.length - 1];

    // Dropping onto root is ignored silently.
    // Copying/moving needs an actual target folder/channel.
    if (!targetChannelId) return;

    const draggedIds = Array.isArray(ids) && ids.length > 0 ? ids : [id];

    const sourceItems = latestSource.items || [];
    const fallbackItems = (side === 'left' ? rightRef.current : leftRef.current)?.items || [];

    const droppedItems = draggedIds
      .map(draggedId =>
        sourceItems.find(i => String(i.id) === String(draggedId)) ||
        fallbackItems.find(i => String(i.id) === String(draggedId))
      )
      .filter(Boolean);

    if (droppedItems.length === 0) return;

    const sourceChannelId = latestSource.ids[latestSource.ids.length - 1];

    // Dropping inside the same channel does nothing.
    if (sourceChannelId && String(sourceChannelId) === String(targetChannelId)) return;

    const movingIdList = droppedItems.map(item => item.id);

    if (movingIdList.some(itemId => movingIds.has(itemId))) return;

    setMovingIds(prev => {
      const next = new Set(prev);
      movingIdList.forEach(itemId => next.add(itemId));
      return next;
    });

    try {
      const copiedItems = [];

      for (const droppedItem of droppedItems) {
        const itemType = droppedItem.class || droppedItem.type;

        try {
          if (itemType === 'User') {
            const profileSlug = droppedItem.slug || droppedItem.username || droppedItem.id;
            const profileName = droppedItem.full_name || droppedItem.name || droppedItem.username || profileSlug;
            const profileUrl = `https://www.are.na/${profileSlug}`;

            const copiedItem = await createBlock(
              targetChannelId,
              `${profileName}\n${profileUrl}`
            );

            copiedItems.push(copiedItem);
          } else {
            const connectableType = itemType === 'Channel' ? 'Channel' : 'Block';
            const response = await createConnection(droppedItem.id, connectableType, targetChannelId);

            copiedItems.push({
              ...droppedItem,
              connection: response?.id ? { id: response.id } : droppedItem.connection
            });
          }
        } catch (e) {
          const message = String(e?.message || '');

          // Duplicate/unique copy attempts should be silent.
          if (!message.toLowerCase().includes('unique')) {
            console.error('[MULTI-COPY] Failed silently for item:', droppedItem.id, e);
          }
        }
      }

      if (copiedItems.length > 0) {
        latestTarget.mutate(
          (currentData) => {
            if (!currentData) return [copiedItems];

            const newData = [...currentData];
            const firstPage = Array.isArray(newData[0]) ? newData[0] : [];

            const existingIds = new Set(firstPage.map(item => String(item.id)));
            const newVisibleItems = copiedItems.filter(item => !existingIds.has(String(item.id)));

            if (newVisibleItems.length > 0) {
              newData[0] = [...newVisibleItems, ...firstPage];
            }

            return newData;
          },
          { revalidate: false }
        );
      }

      setTimeout(() => {
        latestTarget.mutate();
      }, 1200);
    } finally {
      setMovingIds(prev => {
        const next = new Set(prev);
        movingIdList.forEach(itemId => next.delete(itemId));
        return next;
      });
    }
  };

  const handleModalNavigate = useCallback((dir) => {
    const active = activePanel === 'left' ? left : right;
    const maxIndex = active.path.length > 0 ? active.items.length : active.items.length - 1;
    
    let newIndex = active.selectedIndex + dir;
    
    while (newIndex >= 0 && newIndex <= maxIndex) {
      const actualIndex = active.path.length > 0 ? newIndex - 1 : newIndex;
      if (actualIndex === -1) {
         newIndex += dir;
         continue;
      }
      const item = active.items[actualIndex];
      const type = item?.class || item?.type;
      
      if (type !== 'Channel') {
         active.setSelectedIndex(newIndex);
         setPreviewItem(item);
         break;
      }
      newIndex += dir;
    }
  }, [activePanel, left, right]);

  // Preload nearby preview images when a preview is opened.
  // This makes both forward and backward navigation smoother.
  useEffect(() => {
    if (!previewItem) return;

    const active = activePanel === 'left' ? left : right;
    const currentIndex = active.items.findIndex(i => i.id === previewItem.id);

    if (currentIndex === -1) return;

    const preloadImage = (item) => {
      if (!item) return;

      const imageUrl =
        item.image?.large?.src ||
        item.image?.display?.url ||
        item.image?.src;

      if (imageUrl) {
        const img = new Image();
        img.src = imageUrl;
      }
    };

    const preloadNearestPreviewable = (direction) => {
      let index = currentIndex + direction;

      while (index >= 0 && index < active.items.length) {
        const item = active.items[index];
        const type = item?.class || item?.type;

        // Match modal navigation behavior: skip folders/channels.
        if (type !== 'Channel') {
          preloadImage(item);
          break;
        }

        index += direction;
      }
    };

    // Current item, useful when switching very quickly.
    preloadImage(previewItem);

    // Next item.
    preloadNearestPreviewable(1);

    // Previous item.
    preloadNearestPreviewable(-1);
  }, [previewItem, activePanel, left.items, right.items]);

  return (
    <div className="app">
      <div
        className={`panels-container ${isResizingPanels ? 'resizing' : ''} ${activePanel === 'left' ? 'active-left' : 'active-right'}`}
        ref={panelsContainerRef}
        style={{
          gridTemplateColumns: `${panelSplit}fr ${100 - panelSplit}fr`,
          ['--panel-split']: `${panelSplit}%`
        }}
      >
        <div className="panel-shell">
        <Panel 
          isActive={activePanel === 'left'}
          registerHasSearch={setLeftHasSearch}
          onEscapeWithSearch={() => {
            if (rightIframe) {
              pendingIframeCloseRef.current = 'right';
            }
          }}
          path={left.path}
          items={left.slugs.length === 0 && left.sourceType === 'personal'
            ? left.items.filter(item => !connectedChannelIds.has(item.id))
            : left.items}
          isLoading={left.isLoading}
          selectedIndex={left.selectedIndex}
          setSelectedIndex={left.setSelectedIndex}
          selectedIds={left.selectedIds}
          setSelectedIds={left.setSelectedIds}
          selectionAnchorIndex={left.selectionAnchorIndex}
          setSelectionAnchorIndex={left.setSelectionAnchorIndex}
          onSelect={(item) => handleSelect(left, item)}
          onPreview={setPreviewItem}
          onBack={() => { setRightIframe(null); setRightTextPreview(null); left.popLevel(); }}
          onCreate={() => handleCreate(left)}
          onDelete={(item) => handleDelete(left, item)}
          onMove={(item) => handleMove(left, item)}
          onDropItem={(item) => handleDropMove(item, 'left')}
          onLoadMore={left.loadMore}
          iframeSrc={leftIframe}
          onCloseIframe={() => setLeftIframe(null)}
          textPreview={leftTextPreview}
          onCloseTextPreview={() => setLeftTextPreview(null)}
          onSaveTextPreview={async (item, content) => {
            try {
              await updateBlock(item.id, content);
              setLeftTextPreview({ ...item, content });
              mutate(left.url);
            } catch (e) {
              console.error(e);
              alert('Failed to save note');
            }
          }}
          onOpenUser={(user) => {
            setLeftTextPreview(null);
            setRightIframe(null);
            left.pushLevel(user.full_name || user.name || user.username || user.slug || `User ${user.id}`, `user:${user.slug || user.id}`, user.id);
          }}
          onExternal={handleExternal}
          onActivate={() => setActivePanel('left')}
          onContextMenuItem={(item, event) => {
            event.preventDefault();
            event.stopPropagation();
            setActivePanel('left');
            setContextMenu({ item, x: event.clientX, y: event.clientY, side: 'left', query: '', selectedIndex: 0 });
          }}
          sourceSelector={sourceSelectorPanel === 'left' ? renderSourceSelector('left') : null}
          sourceName={getSourceName(left.sourceType)}
          viewMode={viewMode}
          side="left"
        />
        </div>
        <div
          className={`panel-divider ${Math.abs(panelSplit - 50) < 0.001 ? 'snapped' : ''}`}
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize panels"
          title="Drag to resize. Double-click to reset."
          onMouseDown={(e) => {
            e.preventDefault();
            resizeStateRef.current.active = true;
            setIsResizingPanels(true);
            document.body.classList.add('is-resizing-panels');
          }}
          onDoubleClick={(e) => {
            e.preventDefault();
            setPanelSplit(50);
          }}
        />
        <div className="panel-shell">
        <Panel 
          isActive={activePanel === 'right'}
          registerHasSearch={setRightHasSearch}
          onEscapeWithSearch={() => {
            if (leftIframe) {
              pendingIframeCloseRef.current = 'left';
            }
          }}
          path={right.path}
          items={right.slugs.length === 0 && right.sourceType === 'personal'
            ? right.items.filter(item => !connectedChannelIds.has(item.id))
            : right.items}
          isLoading={right.isLoading}
          selectedIndex={right.selectedIndex}
          setSelectedIndex={right.setSelectedIndex}
          selectedIds={right.selectedIds}
          setSelectedIds={right.setSelectedIds}
          selectionAnchorIndex={right.selectionAnchorIndex}
          setSelectionAnchorIndex={right.setSelectionAnchorIndex}
          onSelect={(item) => handleSelect(right, item)}
          onPreview={setPreviewItem}
          onBack={right.popLevel}
          onCreate={(title) => handleCreate(right, title)}
          onDelete={(item) => setDeleteItem(item)}
          onMove={(item) => handleMove(right, item)}
          onLoadMore={right.loadMore}
          onDropItem={(item) => handleDropMove(item, 'right')}
          iframeSrc={rightIframe}
          onCloseIframe={() => setRightIframe(null)}
          textPreview={rightTextPreview}
          onCloseTextPreview={() => setRightTextPreview(null)}
          onSaveTextPreview={async (item, content) => {
            try {
              await updateBlock(item.id, content);
              setRightTextPreview({ ...item, content });
              mutate(right.url);
            } catch (e) {
              console.error(e);
              alert('Failed to save note');
            }
          }}
          onOpenUser={(user) => {
            setRightTextPreview(null);
            setLeftIframe(null);
            right.pushLevel(user.full_name || user.name || user.username || user.slug || `User ${user.id}`, `user:${user.slug || user.id}`, user.id);
          }}
          onExternal={handleExternal}
          sortMode={sortMode}
          onSortChange={setSortMode}
          onActivate={() => setActivePanel('right')}
          onContextMenuItem={(item, event) => {
            event.preventDefault();
            event.stopPropagation();
            setActivePanel('right');
            setContextMenu({ item, x: event.clientX, y: event.clientY, side: 'right', query: '', selectedIndex: 0 });
          }}
          sourceSelector={sourceSelectorPanel === 'right' ? renderSourceSelector('right') : null}
          sourceName={getSourceName(right.sourceType)}
          viewMode={viewMode}
          side="right"
        />
        </div>
      </div>
      
      {contextMenu && (() => {
        const channels = getAllPersonalChannels().filter(
          channel => String(channel.id) !== String(contextMenu.item?.id)
        );

        const query = (contextMenu.query || '').trim().toLowerCase();
        const filteredChannels = query
          ? channels.filter(channel =>
              String(channel.title || channel.name || channel.slug || '')
                .toLowerCase()
                .includes(query)
            )
          : channels;

        return (
          <div className="source-selector-overlay" onClick={() => setContextMenu(null)}>
            <div
              className="source-selector channel-picker-menu"
              style={{
                position: 'fixed',
                top: Math.min(contextMenu.y, window.innerHeight - 380),
                left: Math.min(contextMenu.x, window.innerWidth - 320),
                width: '300px',
                zIndex: 3000
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="source-selector-header">
                Add to
              </div>

              <div className="channel-picker-search">
                <input
                  className="channel-picker-input"
                  type="text"
                  value={contextMenu.query || ''}
                  onChange={(e) =>
                    setContextMenu(prev => prev ? { ...prev, query: e.target.value } : prev)
                  }
                  onKeyDown={(e) => {
                    e.stopPropagation();

                    if (e.key === 'Escape') {
                      e.preventDefault();
                      setContextMenu(null);
                      return;
                    }

                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      setContextMenu(prev => {
                        if (!prev) return prev;
                        const max = Math.max(filteredChannels.length - 1, 0);
                        const nextIndex = typeof prev.selectedIndex === 'number' ? prev.selectedIndex + 1 : 0;
                        return { ...prev, selectedIndex: Math.min(nextIndex, max) };
                      });
                      return;
                    }

                    if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      setContextMenu(prev => {
                        if (!prev) return prev;
                        const nextIndex = typeof prev.selectedIndex === 'number' ? prev.selectedIndex - 1 : 0;
                        return { ...prev, selectedIndex: Math.max(nextIndex, 0) };
                      });
                      return;
                    }

                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const selected = filteredChannels[contextMenu.selectedIndex || 0];
                      if (selected) {
                        handleAddToChannel(contextMenu.item, selected);
                      }
                    }
                  }}
                  placeholder="Search channels..."
                  autoFocus
                />
              </div>

              <div className="source-selector-list channel-picker-list">
                {myChannelsLoading ? (
                  <div className="channel-picker-empty">
                    Loading channels...
                  </div>
                ) : filteredChannels.length === 0 ? (
                  <div className="channel-picker-empty">
                    No channels found
                  </div>
                ) : (
                  filteredChannels.map((channel, idx) => (
                    <div
                      key={channel.id || channel.slug || idx}
                      className={`source-selector-item ${idx === (contextMenu.selectedIndex || 0) ? 'selected' : ''}`}
                      onMouseEnter={() =>
                        setContextMenu(prev => prev ? { ...prev, selectedIndex: idx } : prev)
                      }
                      onClick={() => handleAddToChannel(contextMenu.item, channel)}
                    >
                      <span className="source-selector-key">#</span>
                      <span className="source-selector-name">
                        {channel.title || channel.name || channel.slug}
                      </span>
                    </div>
                  ))
                )}
              </div>

              <div className="source-selector-footer">
                [↑↓] Select [ENTER] Add [ESC] Cancel
              </div>
            </div>
          </div>
        );
      })()}

      {previewItem && (
        <PreviewModal 
          item={previewItem} 
          onClose={() => setPreviewItem(null)} 
          onNavigate={handleModalNavigate}
        />
      )}
      {(editItem || isCreating) && (
        <EditorModal
          item={editItem}
          onSave={saveEdit}
          onClose={() => { setEditItem(null); setIsCreating(false); }}
        />
      )}
      {showCreateChannel && (
        <CreateChannelModal
          onSave={async (title, visibility) => {
            try {
              const channel = await createChannel(title, visibility);
              const active = activePanel === 'left' ? left : right;
              if (active.ids.length > 0) {
                const parentId = active.ids[active.ids.length - 1];
                await createConnection(channel.id, 'Channel', parentId);
                const next = new Set(connectedChannelIdsRef.current);
                next.add(channel.id);
                setConnectedChannelIds(next);
                if (systemChannelId) saveSystemConfig(systemChannelId, next);
              }
                active.mutate(undefined, { revalidateFirstPage: true });
                setTimeout(() => active.mutate(undefined, { revalidateFirstPage: true }), 1200);
            } catch (e) {
              console.error('[CREATE CHANNEL] Failed:', e);
              alert('Failed to create channel: ' + (e.message || 'Unknown error'));
            }
            setShowCreateChannel(false);
          }}
          onClose={() => setShowCreateChannel(false)}
        />
      )}
      {deleteItem && (() => {
        const active = activePanel === 'left' ? left : right;
        const items = Array.isArray(deleteItem) ? deleteItem : [deleteItem];
        const isFollowingRoot = active.sourceType === 'following' && active.slugs.length === 0;
        const label = items.length === 1
          ? getItemDisplayName(items[0])
          : `${items.length} selected items`;

        return (
          <ConfirmModal
            title={isFollowingRoot ? 'Unfollow Item' : 'Delete Item'}
            message={isFollowingRoot
              ? `Unfollow "${label}"?`
              : `Are you sure you want to delete or remove "${label}"?`}
            onConfirm={confirmDelete}
            onClose={() => setDeleteItem(null)}
          />
        );
      })()}
      {moveItem && targetChannel && (
        <ConfirmModal
          title="Move Item"
          message={`Move "${getItemDisplayName(moveItem)}" to "${targetChannel.name}"?`}
          onConfirm={confirmMove}
          onClose={() => { setMoveItem(null); setTargetChannel(null); }}
        />
      )}
      {isSettingsOpen && (
        <SettingsModal 
          sortMode={sortMode}
          onSortChange={setSortMode}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          token={token}
          onTokenChange={setToken}
          theme={theme}
          onThemeChange={setTheme}
          onClose={() => setIsSettingsOpen(false)} 
        />
      )}

      <div className="status-bar">
        <span>{!localStorage.getItem('arena_token') ? <span className="status-warning">API token is not set</span> : user ? `User: ${user.name} | Channels: ${user.counts?.channels}` : 'Loading...'}</span>
        <span>TAB: Switch | Ctrl+1/2: Source | SPACE: Preview | ENTER: Open | DEL: Remove | mouse drag: Move between panels | Ctrl+S: Settings | Ctrl+C: New Channel</span>
      </div>
    </div>
  );
}
