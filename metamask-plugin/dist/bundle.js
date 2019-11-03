() => (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
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

},{}],2:[function(require,module,exports){
const {
  activateWebSocket,
  deactivateWebSocket,
  doFetch,
  websocket,
} = require('./fetch-websocket');
// const { makeCapTP, E } = require('@agoric/captp')
// const providerUri = 'ws://localhost:8000/captp/provider';

let purses = [];
let offerDates = [];

const walletListeners = [];
const WALLET_DOMAIN = 'localhost'

/**
const { dispatch, getBootstrap } = makeCapTP('myid', myconn.send, myBootstrap);
myconn.onReceive = obj => handler[obj.type](obj);
**/

console.log('activating web socket')

activateWebSocket({
  onConnect() {
    console.log('on connect!')
    walletGetPurses();
    walletGetInbox();
  },
  onDisconnect() {
    /*
    deactivateConnection()
    dispatch(serverDisconnected());
    dispatch(updatePurses(null));
    dispatch(updateInbox(null));
    */
  },
  onMessage: messageHandler,
});

function messageHandler(message) {
  console.log('message handler received', message)
  if (!message) return;
  const { type, data } = message;
  if (type === 'walletUpdatePurses') {
    updatePurses(JSON.parse(data));
  }
  if (type === 'walletUpdateInbox') {
    updateInbox(JSON.parse(data));
  }

  if (type === 'walletOfferAdded') {
    walletGetInbox();
  }

  if (!message.type) {
    return message
  }
  console.log(`Informing ${walletListeners.length} listeners`, message)
  for (let listener of walletListeners) {
    listener(message)
  }
  return message
}

function updatePurses (_purses) {
  if (!!_purses) {
    purses = _purses
  }

  updateUi();
}

async function updateInbox(_offers) {

  const offers = _offers.filter((incoming) => {
    const isNew = !offerDates.includes(incoming.date)
    const isDecided = 'status' in incoming
    return isNew && !isDecided
  })
  offerDates = offerDates.concat(offers.map(offer => offer.date))

  for (let offer of offers) {

/*
 *
 * "[{"instanceId":"autoswap_5496","date":1572772669847,"extent0":1,"extent1":1,"purseName0":"Moola purse","purseName1":"Simolean purse","assayId0":"moola_3467","assayId1":"simolean_2059","status":"decline"}, *
 *
 *
 * Pay 1 simolean_2059 from Simolean purse
to receive 2 moola_3467 into Moola purse
 * */

    const message = `\

Would you like to Pay ${offer.extent0} ${offer.assayId0}
  from ${offer.purseName0}


to receive ${offer.extent1} ${offer.assayId1}
  from ${offer.purseName1}?`;

    const approved = await promptUser(message)
    console.log('user said ', approved)
    if (approved) {
      walletAcceptOffer(offer.date)
    } else {
      walletDeclineOffer(offer.date)
    }
  }
}

function walletAcceptOffer (date) {
  doFetch({
    type: 'walletAcceptOffer',
    data: date,
  }); // todo toast
}

function walletDeclineOffer (date) {
  doFetch({
    type: 'walletDeclineOffer',
    data: date,
  }); // todo toast
}

function walletGetPurses() {
  return doFetch({ type: 'walletGetPurses' }, true).then(messageHandler);
}
function walletAddOffer(offer) {
  const method = {
    type: 'walletAddOffer',
    data: offer
  }
  return doFetch(method, true).then(messageHandler);
}
function walletGetInbox() {
  return doFetch({ type: 'walletGetInbox' }).then(messageHandler);
}


// Get the remote's bootstrap object and call a remote method.
/**
let wallet
getBootstrap().then((res) => {
  console.log('got res', res)
  wallet = res;


})
.catch((reason) => {
  console.error('Problem getting wallet', reason)
})
**/

const permittedMethods = ['walletGetPurses', 'walletAddOffer']
wallet.registerApiRequestHandler((origin) => {

  const api = {

    // Pretty sure dead code:
    send: async (message) => {
      if (origin === WALLET_DOMAIN || permittedMethods.includes(message.type)) {
        websocket.send(message);
      }
    },
    registerDispatch: async (dispatch) => {
      console.log('plugin registering an event listener')
      if (!websocket) throw new Error('There is no websocket connection to blockchain.')
      websocket.addEventListener((message) => {
        dispatch(message);
      })
   },


    onMessage: (listener) => {
      console.log('a listener has requested on message')
      walletListeners.push(listener);
      walletGetInbox()
      walletGetPurses()
    },
    walletAddOffer,
    walletGetPurses,
  }

  console.log('requesting domain is ', origin)
  if (origin === WALLET_DOMAIN) {
    api.walletAcceptOffer = walletAcceptOffer
    api.walletDeclineOffer = walletDeclineOffer
  }

  return api
})

let created = false
function updateUi () {
  let method = created ? 'updateAsset' : 'addAsset'
  console.log('updating ui!', purses)

  for (let purse of purses) {
    const asset = {
      symbol: purse.assayId,
      balance: purse.extent,
      identifier: 'purse' + purse.assayId,
      decimals: 0,
      customViewUrl: 'http://localhost:8000/wallet'
    }

    console.log('sending asset', asset)
    wallet.send({
      method: 'wallet_manageAssets',
      params: [ method, asset ],
    })
    .catch((reason) => {
      console.error(`problem updating asset`, reason)
    })
  }
  created = true
}

async function promptUser (message) {
  const response = await wallet.send({ method: 'confirm', params: [message] })
  return response.result
}

async function persist() {
  wallet.updatePluginState({
    offers,
    purses,
  })
}


},{"./fetch-websocket":1}]},{},[2])