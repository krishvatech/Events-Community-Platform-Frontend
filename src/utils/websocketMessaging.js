/**
 * WebSocket utility for real-time messaging with Redis Channel Layer.
 * Provides WebSocket connection with fallback to REST polling.
 * Events: message.created, message.edited, message.deleted
 */

function getWsRoot() {
  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
  const baseUrl = apiBase.replace(/\/api\/?$/, '');
  const protocol = baseUrl.startsWith('https') ? 'wss' : 'ws';
  return `${protocol}://${new URL(baseUrl).host}`;
}

function getAuthToken() {
  return (
    localStorage.getItem('access') ||
    localStorage.getItem('access_token') ||
    localStorage.getItem('accessToken')
  );
}

/**
 * Connect to WebSocket for a conversation with real-time message updates.
 * @param {number} conversationId - The conversation ID
 * @param {Object} handlers - Handlers for events: { onMessageCreated, onMessageEdited, onMessageDeleted, onError }
 * @returns {Object} WebSocket connection object with close() method
 */
export function connectToConversation(conversationId, handlers = {}) {
  const { onMessageCreated, onMessageEdited, onMessageDeleted, onError, onConnected } = handlers;

  const wsRoot = getWsRoot();
  const token = getAuthToken();
  const wsUrl = token
    ? `${wsRoot}/ws/messaging/conversations/${conversationId}/?token=${encodeURIComponent(token)}`
    : `${wsRoot}/ws/messaging/conversations/${conversationId}/`;

  let ws = null;
  let reconnectAttempts = 0;
  const maxReconnectAttempts = 5;
  const reconnectDelay = 2000; // Start with 2 seconds

  function connect() {
    try {
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log(`[WS] Connected to conversation ${conversationId}`);
        reconnectAttempts = 0;
        if (onConnected) onConnected();
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const type = data.type || '';

          if (type === 'message.created' && onMessageCreated) {
            onMessageCreated(data.message);
          } else if (type === 'message.edited' && onMessageEdited) {
            onMessageEdited(data.message);
          } else if (type === 'message.deleted' && onMessageDeleted) {
            onMessageDeleted(data.message);
          }
        } catch (e) {
          console.error('[WS] Failed to parse message:', e);
        }
      };

      ws.onerror = (event) => {
        console.error('[WS] WebSocket error:', event);
        if (onError) onError(event);
      };

      ws.onclose = (event) => {
        console.warn(`[WS] Disconnected from conversation ${conversationId}`);

        // Attempt to reconnect with exponential backoff
        if (reconnectAttempts < maxReconnectAttempts) {
          reconnectAttempts++;
          const delay = reconnectDelay * Math.pow(1.5, reconnectAttempts - 1);
          console.log(`[WS] Attempting to reconnect in ${Math.round(delay)}ms...`);
          setTimeout(() => {
            connect();
          }, delay);
        } else {
          console.error('[WS] Max reconnect attempts exceeded. Falling back to polling only.');
          if (onError) onError(new Error('WebSocket reconnect failed'));
        }
      };
    } catch (e) {
      console.error('[WS] Failed to connect:', e);
      if (onError) onError(e);
    }
  }

  connect();

  return {
    close: () => {
      if (ws) {
        ws.close();
        ws = null;
      }
    },
    isConnected: () => ws && ws.readyState === WebSocket.OPEN,
  };
}

/**
 * Send a message via REST API (WebSocket is receive-only for our use case).
 * @param {number} conversationId - The conversation ID
 * @param {string} body - Message body
 * @param {Array} attachments - Optional attachments
 * @returns {Promise<Object>} Message object from server
 */
export async function sendMessage(conversationId, body, attachments = []) {
  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
  const url = `${apiBase}/messaging/conversations/${conversationId}/messages/`;

  const token = getAuthToken();
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const formData = new FormData();
  formData.append('body', body);

  if (Array.isArray(attachments)) {
    attachments.forEach((file) => {
      formData.append('attachments', file);
    });
  }

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: formData,
    credentials: 'include',
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || `Failed to send message: ${res.status}`);
  }

  return res.json();
}
