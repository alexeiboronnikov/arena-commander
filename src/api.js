const API_BASE = 'https://api.are.na/v3';
const READ_PROXY_BASE = '/arena-v2';

function getToken() {
  return localStorage.getItem('arena_token') || '';
}

function authHeaders() {
  return { 'Authorization': `Bearer ${getToken()}` };
}

function headers() {
  return { ...authHeaders(), 'Content-Type': 'application/json' };
}

function getTextValue(item) {
  return (
    item?.content ||
    item?.content_html ||
    item?.description ||
    item?.description_html ||
    item?.value ||
    item?.text ||
    item?.body ||
    item?.attributes?.content ||
    item?.attributes?.content_html ||
    item?.attributes?.description ||
    item?.attributes?.description_html ||
    ''
  );
}

function hasTextValue(item) {
  return Boolean(getTextValue(item));
}

function normalizeBlockResponse(data) {
  return (
    data?.block ||
    data?.data ||
    data
  );
}

function normalizeItems(data) {
  if (Array.isArray(data)) return data;

  return (
    data.data ||
    data.contents ||
    data.channels ||
    data.users ||
    data.following ||
    data.followers ||
    []
  );
}

function mergeBlockDetails(item, details) {
  const normalized = normalizeBlockResponse(details);

  if (!normalized) return item;

  const attributes = normalized.attributes || {};

  return {
    ...item,
    ...normalized,
    ...attributes,
    id: item.id || normalized.id,
    connection: item.connection || normalized.connection
  };
}

function getItemKind(item) {
  return item?.class || item?.type || item?.base_class || item?.content_class || '';
}

function isUntitledBlock(item) {
  if (!item?.id) return false;

  const title = String(item?.title || '').trim().toLowerCase();

  const isUntitled =
    !title ||
    title === 'untitled';

  if (!isUntitled) return false;

  const kind = getItemKind(item);

  const isDefinitelyNotText =
    kind === 'Channel' ||
    kind === 'User' ||
    kind === 'Image' ||
    kind === 'Link' ||
    kind === 'Media' ||
    kind === 'Attachment';

  return !isDefinitelyNotText;
}

async function fetchRead(url) {
  const proxiedV2Url = `${READ_PROXY_BASE}${url}`;

  try {
    const response = await fetch(proxiedV2Url, {
      method: 'GET',
      headers: authHeaders()
    });

    if (response.ok) {
      return response;
    }

    console.warn('[fetchRead] proxied v2 failed, falling back to v3:', response.status, proxiedV2Url);
  } catch (e) {
    console.warn('[fetchRead] proxied v2 error, falling back to v3:', proxiedV2Url, e);
  }

  return fetch(`${API_BASE}${url}`, {
    method: 'GET',
    headers: authHeaders()
  });
}

async function fetchBlockDetails(blockId) {
  const urls = [
    `${READ_PROXY_BASE}/blocks/${blockId}`,
    `${API_BASE}/blocks/${blockId}`
  ];

  for (const url of urls) {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: authHeaders()
      });

      if (!response.ok) {
        console.warn('[fetchBlockDetails] Failed:', blockId, response.status, url);
        continue;
      }

      const data = await response.json();
      const details = normalizeBlockResponse(data);

      if (details) {
        return details;
      }
    } catch (e) {
      console.warn('[fetchBlockDetails] Error:', blockId, url, e);
    }
  }

  return null;
}

async function enrichUntitledTextBlocks(items) {
  if (!Array.isArray(items)) return items;

  return Promise.all(
    items.map(async item => {
      if (!isUntitledBlock(item)) return item;

      if (hasTextValue(item)) return item;

      const details = await fetchBlockDetails(item.id);

      if (!details) return item;

      return mergeBlockDetails(item, details);
    })
  );
}

export async function getCurrentUser() {
  const response = await fetch(`${API_BASE}/me`, {
    method: 'GET',
    headers: authHeaders()
  });

  if (!response.ok) throw new Error('Failed to fetch user');

  return response.json();
}

export async function getUserFollowing(userId) {
  const response = await fetchRead(`/users/${userId}/following`);

  if (!response.ok) throw new Error('Failed to fetch following');

  return response.json();
}

export async function getUserFollowers(userId) {
  const response = await fetchRead(`/users/${userId}/followers`);

  if (!response.ok) throw new Error('Failed to fetch followers');

  return response.json();
}

export async function getBlock(blockId) {
  const details = await fetchBlockDetails(blockId);

  if (!details) {
    throw new Error('Failed to fetch block');
  }

  return details;
}

export const fetcher = async (url) => {
  const response = await fetchRead(url);

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    console.error('fetcher error:', response.status, url, err);
    throw new Error(err.message || err.error || 'Failed to fetch data');
  }

  const data = await response.json();
  const items = normalizeItems(data);

  return enrichUntitledTextBlocks(items);
};

export async function createChannel(title, status = 'closed') {
  const response = await fetch(`${API_BASE}/channels`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      title,
      status
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    console.error('createChannel error:', err);
    throw new Error(err.message || err.error || 'Failed to create channel');
  }

  return response.json();
}

export async function createBlock(channelId, content, title, description) {
  const body = {
    value: content,
    content,
    channels: [{ id: channelId }]
  };
  if (title) body.title = title;
  if (description) body.description = description;

  const response = await fetch(`${API_BASE}/blocks`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    console.error('createBlock error:', err);
    throw new Error(err.message || err.error || 'Failed to create block');
  }

  return response.json();
}

export async function updateBlock(blockId, content, title, description) {
  const body = {
    content,
    value: content
  };
  if (title !== undefined) body.title = title;
  if (description !== undefined) body.description = description;

  const response = await fetch(`${API_BASE}/blocks/${blockId}`, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    console.error('updateBlock error:', err);
    throw new Error(err.message || err.error || 'Failed to update block');
  }

  return response.json();
}

export async function createConnection(connectableId, connectableType, targetChannelId) {
  const normalizedType = connectableType === 'Channel' ? 'Channel' : 'Block';

  const attempts = [
    {
      source_id: connectableId,
      source_type: normalizedType,
      target_channel_id: targetChannelId
    },
    {
      connectable_id: connectableId,
      connectable_type: normalizedType,
      channel_id: targetChannelId
    },
    {
      connectable_id: connectableId,
      connectable_type: normalizedType,
      channels: [{ id: targetChannelId }]
    }
  ];

  let lastError = 'Unknown error';

  for (const payload of attempts) {
    const response = await fetch(`${API_BASE}/connections`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(payload)
    });

    if (response.ok) {
      return response.json();
    }

    const text = await response.text().catch(() => '');
    console.error('createConnection attempt failed:', response.status, payload, text);

    const lowered = String(text).toLowerCase();

    if (
      response.status === 422 &&
      (
        lowered.includes('must be unique') ||
        lowered.includes('already') ||
        lowered.includes('duplicate')
      )
    ) {
      return {
        ok: true,
        alreadyConnected: true,
        connectable_id: connectableId,
        connectable_type: normalizedType,
        target_channel_id: targetChannelId
      };
    }

    lastError = `${response.status} ${text || 'Unknown error'}`;
  }

  throw new Error(`Failed to create connection: ${lastError}`);
}

async function parseResponseBody(response) {
  const text = await response.text().catch(() => '');
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function isUnfollowSuccessLike(response, err) {
  if (response.ok || response.status === 204) {
    return true;
  }

  const message = String(
    err?.message ||
    err?.error ||
    err?.raw ||
    ''
  ).toLowerCase();

  return (
    response.status === 404 ||
    message.includes('not found') ||
    message.includes('already') ||
    message.includes('no follow') ||
    message.includes('no subscription')
  );
}

async function requestFirstSuccessfulUnfollow(requests) {
  const errors = [];

  for (const request of requests.filter(Boolean)) {
    try {
      const response = await fetch(`${API_BASE}${request.path}`, {
        method: request.method,
        headers: authHeaders()
      });

      const body = await parseResponseBody(response);

      if (response.ok || response.status === 204) {
        return {
          ok: true,
          method: request.method,
          path: request.path,
          status: response.status,
          body
        };
      }

      if (isUnfollowSuccessLike(response, body)) {
        errors.push({
          method: request.method,
          path: request.path,
          status: response.status,
          err: body,
          ignorable: true
        });
        continue;
      }

      errors.push({
        method: request.method,
        path: request.path,
        status: response.status,
        err: body
      });
    } catch (error) {
      errors.push({
        method: request.method,
        path: request.path,
        status: 'NETWORK_ERROR',
        err: { message: error?.message || String(error) }
      });
    }
  }

  console.error('unfollowItem errors:', errors);

  const onlyIgnorableErrors =
    errors.length > 0 &&
    errors.every(entry => entry.ignorable);

  if (onlyIgnorableErrors) {
    return {
      ok: true,
      alreadyUnfollowed: true
    };
  }

  throw new Error(
    errors.find(entry => !entry.ignorable)?.err?.message ||
    errors.find(entry => !entry.ignorable)?.err?.error ||
    'Failed to unfollow'
  );
}

export async function unfollowItem(currentUser, item) {
  const currentUserId = currentUser?.id;
  const currentUserSlug = currentUser?.slug;

  const itemId = item?.id;
  const itemSlug = item?.slug || item?.username;
  const itemType = item?.class || item?.type;

  const followId =
    item?.follow?.id ||
    item?.follow_id ||
    item?.following?.id ||
    item?.subscription?.id;

  const requests = [
    followId ? { method: 'DELETE', path: `/follows/${followId}` } : null,
    followId ? { method: 'DELETE', path: `/subscriptions/${followId}` } : null,

    itemType === 'User' && itemId ? { method: 'DELETE', path: `/users/${itemId}/follow` } : null,
    itemType === 'User' && itemSlug ? { method: 'DELETE', path: `/users/${itemSlug}/follow` } : null,
    itemType === 'User' && itemId ? { method: 'DELETE', path: `/users/${itemId}/unfollow` } : null,
    itemType === 'User' && itemSlug ? { method: 'DELETE', path: `/users/${itemSlug}/unfollow` } : null,
    itemType === 'User' && itemId ? { method: 'POST', path: `/users/${itemId}/unfollow` } : null,
    itemType === 'User' && itemSlug ? { method: 'POST', path: `/users/${itemSlug}/unfollow` } : null,

    itemType === 'Channel' && itemId ? { method: 'DELETE', path: `/channels/${itemId}/follow` } : null,
    itemType === 'Channel' && itemSlug ? { method: 'DELETE', path: `/channels/${itemSlug}/follow` } : null,
    itemType === 'Channel' && itemId ? { method: 'DELETE', path: `/channels/${itemId}/unfollow` } : null,
    itemType === 'Channel' && itemSlug ? { method: 'DELETE', path: `/channels/${itemSlug}/unfollow` } : null,
    itemType === 'Channel' && itemId ? { method: 'POST', path: `/channels/${itemId}/unfollow` } : null,
    itemType === 'Channel' && itemSlug ? { method: 'POST', path: `/channels/${itemSlug}/unfollow` } : null,

    currentUserId && itemId ? { method: 'DELETE', path: `/users/${currentUserId}/following/${itemId}` } : null,
    currentUserSlug && itemSlug ? { method: 'DELETE', path: `/users/${currentUserSlug}/following/${itemSlug}` } : null
  ];

  return requestFirstSuccessfulUnfollow(requests);
}

export async function deleteConnection(connectionId) {
  const response = await fetch(`${API_BASE}/connections/${connectionId}`, {
    method: 'DELETE',
    headers: headers()
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || err.error || 'Failed to delete connection');
  }

  return true;
}

export async function deleteChannel(slug) {
  const response = await fetch(`${API_BASE}/channels/${slug}`, {
    method: 'DELETE',
    headers: headers()
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || err.error || 'Failed to delete channel');
  }

  return true;
}


export async function addItemToChannel(item, targetChannelId) {
  if (!item?.id || !targetChannelId) {
    throw new Error('Missing item or target channel');
  }

  const itemType = (item.class || item.type) === 'Channel' ? 'Channel' : 'Block';
  return createConnection(item.id, itemType, targetChannelId);
}


export async function getMyChannels(userSlug) {
  if (!userSlug) return [];

  const allChannels = [];
  let page = 1;

  while (true) {
    const response = await fetchRead(`/users/${userSlug}/contents?type=Channel&sort=updated_at_desc&per=100&page=${page}`);

    if (!response.ok) {
      throw new Error('Failed to fetch channels');
    }

    const data = await response.json();
    const items = normalizeItems(data);

    if (!Array.isArray(items) || items.length === 0) {
      break;
    }

    allChannels.push(...items);

    if (items.length < 100) {
      break;
    }

    page += 1;
  }

  return allChannels;
}

export async function findOrCreateSystemChannel(userSlug) {
  const channels = await getMyChannels(userSlug);
  const existing = channels.find(c => String(c.title || '').trim()    .toLowerCase() === '~system');
  if (existing) return existing;
  return createChannel('~system', 'closed');
}

export async function readSystemConfig(systemChannelId) {
  const response = await fetchRead(`/channels/${systemChannelId}/contents?per=100`);
  if (!response.ok) return [];
  const data = await response.json();
  const items = normalizeItems(data) || [];
  const configBlock = items.find(item =>
    String(item.title || '').trim() === '.config' &&
    (item.class === 'Text' || item.content_class === 'Text' || item.type === 'Text')
  );
  if (!configBlock) return [];
  try {
    const parsed = JSON.parse(configBlock.content || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveSystemConfig(systemChannelId, ids) {
  const content = JSON.stringify([...ids]);
  const response = await fetchRead(`/channels/${systemChannelId}/contents?per=100`);
  if (response.ok) {
    const data = await response.json();
    const items = normalizeItems(data) || [];
    const configBlock = items.find(item =>
      String(item.title || '').trim() === '.config' &&
      (item.class === 'Text' || item.content_class === 'Text' || item.type === 'Text')
    );
    if (configBlock) {
      return updateBlock(configBlock.id, content);
    }
  }
  return createBlock(systemChannelId, content, '.config');
}
