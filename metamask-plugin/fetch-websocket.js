/* globals window, WebSocket, fetch */

// todo: refactor this to a class

const API_URL = 'ws://localhost:8000/';

// === FETCH

async function doFetch(req, toWallet = false) {
  return fetch('http://localhost:8000/vat', {
    method: 'POST',
    body: JSON.stringify(req),
    headers: { 'Content-Type': 'application/json' },
  })
    .then(response => response.json())
    .then(({ ok, res }) => (ok ? res : {}))
    .catch(err => {
      console.log('Fetch Error', err);
    });
}

// === WEB SOCKET

let websocket = new WebSocket(API_URL);

function createWebSocket({ onConnect, onDisconnect, onMessage }) {
  console.log('creating?')
  if (!websocket) {
    throw new Error('Cannot create websocket when websocket construction failed.')
  }
  console.log('creating websocket', onMessage)

  if (onConnect) {
    websocket.addEventListener('open', () => onConnect());
  }

  if (onMessage) {
    websocket.addEventListener('message', ({ data }) => onMessage(data));
  }
}

function closeWebSocket() {
  websocket.close();
  websocket = null;
}

function activateWebSocket(websocketListeners = {}) {
  console.log('activating')
  createWebSocket(websocketListeners);
}

function deactivateWebSocket() {
  if (!isWebSocketActive()) return;
  closeWebSocket();
}

module.exports = {
  doFetch,
  activateWebSocket,
  deactivateWebSocket,
  websocket,
}
