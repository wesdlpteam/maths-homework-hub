/* window.claude stand-in for hosting outside claude.ai. Forwards sample and db calls to the Vercel helper.
   Acts only when window.claude is absent. */
(function () {
  const HELPER = (typeof location !== 'undefined' && /vercel\.app$/.test(location.hostname)) ? '' : 'https://maths-homework-hub.vercel.app';
  const KEY = 'hub.passcode';
  const BUDGET = 4 * 1024 * 1024; // base64 chars across all images
  const LADDER = [{ quality: 0.85 }, { quality: 0.75 }, { quality: 0.75, maxSide: 2000 }, { quality: 0.75, maxSide: 1600 }];

  const err = (code, message) => Object.assign(new Error(message || code), { code, message: message || code });

  // ---- browser defaults ----
  const browserStorage = {
    getItem: k => { try { return localStorage.getItem(k); } catch (e) { return null; } },
    setItem: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } },
    removeItem: k => { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } },
  };

  async function browserEncode(blob, { quality, maxSide }) {
    const bmp = await createImageBitmap(blob);
    const scale = maxSide ? Math.min(1, maxSide / Math.max(bmp.width, bmp.height)) : 1;
    const w = Math.max(1, Math.round(bmp.width * scale)), h = Math.max(1, Math.round(bmp.height * scale));
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    cv.getContext('2d').drawImage(bmp, 0, 0, w, h);
    if (bmp.close) bmp.close();
    return new Promise((res, rej) => cv.toBlob(b => (b ? res(b) : rej(err('bad_request', 'Could not read that image.'))), 'image/jpeg', quality));
  }

  function askPasscodeDialog() {
    return new Promise(resolve => {
      const dlg = document.createElement('dialog');
      dlg.className = 'pass-dialog';
      dlg.setAttribute('aria-labelledby', 'hub-pass-title');
      dlg.innerHTML = '<form method="dialog" class="pass-form">'
        + '<h2 class="pass-title" id="hub-pass-title">Staff passcode</h2>'
        + '<p class="pass-note">Type the passcode to use marking and saving. This device will remember it.</p>'
        + '<label class="pass-label" for="hub-pass-input">Passcode</label>'
        + '<input id="hub-pass-input" class="pass-input" type="password" autocomplete="current-password">'
        + '<div class="btn-row pass-actions"><button type="submit" class="btn primary">Continue</button>'
        + '<button type="button" class="btn" data-cancel>Cancel</button></div></form>';
      document.body.appendChild(dlg);
      const input = dlg.querySelector('input');
      let done = false;
      const finish = v => { if (done) return; done = true; dlg.close(); dlg.remove(); resolve(v); };
      dlg.querySelector('form').addEventListener('submit', e => { e.preventDefault(); finish(input.value.trim() || null); });
      dlg.querySelector('[data-cancel]').addEventListener('click', () => finish(null));
      dlg.addEventListener('cancel', e => { e.preventDefault(); finish(null); });
      dlg.showModal();
      input.focus();
    });
  }

  async function toBase64(blob) {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let s = '';
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(s);
  }

  // Re-encode down the ladder until total base64 fits the budget.
  async function fitImages(blobs, { encode = browserEncode, budget = BUDGET } = {}) {
    for (const rung of LADDER) {
      const out = [];
      let total = 0;
      for (const b of blobs) {
        const data = await toBase64(await encode(b, rung));
        total += data.length;
        out.push({ media_type: 'image/jpeg', data });
      }
      if (total <= budget) return out;
    }
    throw err('too_large', 'Those photos are too big to send. Try fewer pages at once.');
  }

  // POST to the helper. Passcode retry once on 401. Abort becomes cancelled.
  async function call(path, body, opts, deps) {
    opts = opts || {};
    const d = deps || {};
    const f = d.fetch || ((...a) => fetch(...a));
    const store = d.storage || browserStorage;
    const ask = d.askPasscode || askPasscodeDialog;
    const base = d.base != null ? d.base : HELPER;

    const attempt = async code => {
      const headers = { 'content-type': 'application/json' };
      if (code) headers['x-hub-passcode'] = code;
      let r;
      try {
        r = await f(base + path, { method: 'POST', headers, body: JSON.stringify(body), signal: opts.signal });
      } catch (e) {
        if (e && e.name === 'AbortError') throw err('cancelled', 'Stopped.');
        throw err('network', 'Could not reach the helper. Check the internet and try again.');
      }
      let json = null;
      try { json = await r.json(); } catch (e) { /* non-JSON reply */ }
      if (r.ok) return { ok: true, json };
      const e = (json && json.error) || {};
      return { ok: false, status: r.status, error: err(e.code || 'upstream_error', e.message || 'Something went wrong.') };
    };
    const getCode = async () => {
      let c = store.getItem(KEY);
      if (!c) {
        c = await ask();
        if (!c) throw err('cancelled', 'Cancelled.');
        store.setItem(KEY, c);
      }
      return c;
    };

    // Ask only when the helper says a passcode is needed (open access when none is set).
    let res = await attempt(opts.needPasscode ? store.getItem(KEY) : null);
    if (!res.ok && res.status === 401 && opts.needPasscode) {
      store.removeItem(KEY);
      res = await attempt(await getCode());
    }
    if (res.ok) return res.json;
    throw res.error;
  }

  // db over the helper. Listeners refetch after this shim's own writes under their collection.
  function makeDb(callFn) {
    const watchers = new Set();
    const rpc = (body, opts) => callFn('/api/db', body, opts);
    const wrap = docs => ({ docs: docs.map(x => ({ id: x.id, data: () => x.data })), size: docs.length, empty: !docs.length });
    const afterWrite = path => { watchers.forEach(w => { if (path.startsWith(w.path + '/')) w.run(); }); };
    const write = (op, path, data) => rpc({ op, path, data }, { needPasscode: true }).then(() => { afterWrite(path); });
    return {
      collection: p => ({
        get: async () => wrap((await rpc({ op: 'list', path: p })).docs || []),
        onSnapshot(cb) {
          const w = { path: p, live: true };
          w.run = () => rpc({ op: 'list', path: p }).then(r => { if (w.live) cb(wrap(r.docs || [])); }).catch(() => {});
          watchers.add(w);
          w.run();
          return () => { w.live = false; watchers.delete(w); };
        },
      }),
      doc: p => ({
        get: async () => { const d = (await rpc({ op: 'get', path: p })).doc; return { id: p.split('/').pop(), exists: !!d, data: () => (d ? d.data : undefined) }; },
        set: data => write('set', p, data),
        update: data => write('update', p, data),
        delete: () => write('delete', p),
      }),
    };
  }

  function makeClaude() {
    const sample = {
      json: async (prompt, o) => {
        o = o || {};
        const images = o.images && o.images.length ? await fitImages(o.images) : [];
        const r = await call('/api/sample', { prompt, images, tier: o.modelTier || 'default' }, { needPasscode: true, signal: o.signal });
        return r.result;
      },
      limits: () => ({ images: { maxCount: 4 } }),
    };
    const db = makeDb(call);
    const user = { id: () => 'staff', can: () => true, canEdit: () => true };
    const downloads = {
      save: async ({ filename, data }) => {
        const blob = data instanceof Blob ? data : new Blob([data]);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 10000);
      },
    };
    const parts = { sample, db, user, downloads };
    return { use: async name => parts[name] || null };
  }

  if (typeof module === 'object' && module.exports) module.exports = { fitImages, call, makeDb };
  if (typeof window !== 'undefined' && !window.claude) window.claude = makeClaude();
})();
