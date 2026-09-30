// hashcats pod miner — injected EIP-1193 provider shim (v2).
// Bridge priority:
//   1) window.__podminerCall — CDP binding injected by the runner (puppeteer
//      exposeFunction). Not a network request, so page CSP cannot block it.
//   2) fetch to the local signer daemon (fallback when no binding).
// Presents as MetaMask so the site treats it as a normal injected wallet.
(() => {
  // Reroute the site's rate-limited primary RPC to the drpc fallback (429 bypass).
  try {
    const _fetch = window.fetch.bind(window);
    const PRIMARY = 'https://rpc.mainnet.chain.robinhood.com';
    const FALLBACK = 'https://robinhood.drpc.org';
    window.fetch = (input, init) => {
      try {
        let url = typeof input === 'string' ? input : (input && input.url) || '';
        if (url.indexOf(PRIMARY) === 0) {
          const nu = url.replace(PRIMARY, FALLBACK);
          if (typeof input === 'string') return _fetch(nu, init);
          return _fetch(new Request(nu, input));
        }
      } catch (_) {}
      return _fetch(input, init);
    };
    console.log('[pod-miner] rpc reroute active ->', FALLBACK);
  } catch (_) {}
  const DAEMON = 'http://127.0.0.1:8787';
  const listeners = Object.create(null);
  const emit = (ev, payload) => {
    (listeners[ev] || []).forEach((fn) => {
      try { fn(payload); } catch (_) {}
    });
  };

  async function call(payload) {
    if (typeof window.__podminerCall === 'function') {
      const out = await window.__podminerCall(JSON.stringify(payload));
      return JSON.parse(out);
    }
    const res = await fetch(DAEMON + '/rpc', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await res.json();
  }

  async function rpc(method, params) {
    const body = await call({ method, params: params || [] });
    if (body && body.error) {
      const err = new Error((body.error && body.error.message) || 'provider error');
      err.code = (body.error && body.error.code) || -32603;
      err.data = body.error && body.error.data;
      throw err;
    }
    return body ? body.result : null;
  }

  const provider = {
    isMetaMask: true,
    isPodMiner: true,
    _metamask: { isUnlocked: async () => true },
    async request({ method, params }) {
      switch (method) {
        case 'eth_requestAccounts':
        case 'eth_accounts':
          return rpc('eth_accounts', params);
        case 'eth_chainId':
          return '0x1237'; // Robinhood Chain 4663
        case 'net_version':
          return '4663';
        case 'wallet_switchEthereumChain': {
          const want = ((params && params[0] && params[0].chainId) || '').toLowerCase();
          if (want && want !== '0x1237') {
            const err = new Error('Unrecognized chain ID. The pod wallet is pinned to Robinhood Chain (0x1237).');
            err.code = 4902;
            throw err;
          }
          return null;
        }
        case 'wallet_addEthereumChain':
          return null;
        default:
          return rpc(method, params);
      }
    },
    on(ev, fn) { (listeners[ev] = listeners[ev] || []).push(fn); },
    removeListener(ev, fn) { listeners[ev] = (listeners[ev] || []).filter((f) => f !== fn); },
  };

  const info = {
    uuid: '9f1b6763-2dcb-4c2a-b0dd-7a6b9ff6d4e1',
    name: 'MetaMask',
    icon: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiI+PHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiBmaWxsPSIjZjY4NTFiIi8+PC9zdmc+',
    rdns: 'io.metamask',
  };

  const announce = () => {
    window.dispatchEvent(new CustomEvent('eip6963:announceProvider', { detail: Object.freeze({ info, provider }) }));
  };

  window.addEventListener('eip6963:requestProvider', announce);
  window.ethereum = provider;
  announce();
  window.addEventListener('load', announce);
  console.log('[pod-miner] provider shim v2 injected (bridge:', typeof window.__podminerCall === 'function' ? 'cdp-binding' : 'fetch', ')');
})();
