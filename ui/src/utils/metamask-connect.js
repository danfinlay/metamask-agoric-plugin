/* globals ethereum, fetch */

// todo: refactor this to a class

let index, pluginApi

// === FETCH
export async function logInAndInstall () {
  if (typeof ethereum === 'undefined') { // eslint-disable-line no-undef
    alert('Please install MetaMask from metamask.io')
    return
  }
  console.log('logging in to metamask')
  const origin = new URL('package.json', 'http://localhost:8090').toString()
  const pluginOrigin = `wallet_plugin_${origin}`
  const result = await ethereum.send({ // eslint-disable-line no-undef
    method: 'wallet_requestPermissions',
    params: [{
      [pluginOrigin]: {}
    }]
  })

  return result.result && !result.error
}

export async function requestIndex () {
  console.log('requesting index')
  if (typeof ethereum === 'undefined') { // eslint-disable-line no-undef
    alert('Please install MetaMask from metamask.io')
    return
  }

  try {
    if (!index) {
      index = await ethereum.requestIndex() // eslint-disable-line no-undef
    }
    console.log('now we try to get that plugin API')
    if (!pluginApi) {
      pluginApi = await index.getPluginApi('http://localhost:8090/package.json')
      console.log('oh boyo we did!', pluginApi)
    }
  } catch (e) {
    console.error('Problem loading plugin api', e)
  }
  return pluginApi
}

export async function walletAcceptOffer (date) {
  if (!pluginApi) {
    await requestIndex()
  }
  pluginApi.walletAcceptOffer(date)
}

export async function walletAddOffer (offer) {
  console.log('trying to add offer', offer)
  if (!pluginApi) {
    await requestIndex()
  }
  console.log('adding offer', offer)
  return pluginApi.walletAddOffer(offer)
}

export async function walletGetPurses () {
  console.log('walletGetPurses called')
  if (!pluginApi) {
    await requestIndex()
  }
  return pluginApi.walletGetPurses()
}

export async function walletDeclineOffer (date) {
  if (!pluginApi) {
    await requestIndex()
  }
  pluginApi.walletDeclineOffer(date)
}

export async function doFetch(req) {
  return fetch('/vat', {
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

export async function createWeb3Socket({ onConnect, onDisconnect, onMessage }) {
  await requestIndex()
  if (pluginApi) {
    console.log('registering message handler on pluginApi')
    pluginApi.onMessage((data) => {
      console.log('received data from plugin', data)
      onMessage(data)

    })
    .catch((reason) => {
      console.error(`issue registering listener`, reason)
    })
    .then(() => {
      console.log('we really did register that listener. plugin said so.')
    })
  }
}

function closeWebSocket() {
}

function isWebSocketActive() {
  return true
}

export function activateWebSocket(websocketListeners = {}) {
  createWeb3Socket(websocketListeners);
}

export function deactivateWebSocket() {
  closeWebSocket();
}
