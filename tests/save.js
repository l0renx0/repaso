const { chromium } = require('playwright');
const file = process.argv[2];
(async () => {
  const b = await chromium.launch(); const errors = [];
  const ctx = await b.newContext({viewport:{width:390,height:844}});
  const page = await ctx.newPage();
  page.on('pageerror', e => { errors.push(e.message); console.log('PAGEERR', e.message); }); page.on('console', m => console.log('CONSOLE', m.type(), m.text().slice(0, 200)));
  // the fake account lives in this test process, like a real server, not in the browser
  const DB = {};
  await page.exposeFunction('__dbSet', (path, v) => { DB[path] = JSON.parse(v); });
  await page.exposeFunction('__dbDel', path => { delete DB[path]; });
  await page.exposeFunction('__dbList', path => JSON.stringify(Object.keys(DB).filter(k => k.startsWith(path + '/') && k.split('/').length === path.split('/').length + 1).map(k => [k.split('/').pop(), DB[k]])));
  await page.exposeFunction('__dbKeys', () => Object.keys(DB));
  await page.addInitScript(() => {
    const n = p => p.split('/').length;
    const doc = path => { if (n(path) % 2) throw new TypeError('document path needs an even number of segments: ' + path);
      return {id:path.split('/').pop(), path, set: async b => { await new Promise(r => setTimeout(r, 30)); await window.__dbSet(path, JSON.stringify(b)); }, delete: async () => window.__dbDel(path), collection: sub => coll(path + '/' + sub)}; };
    const coll = path => { if (n(path) % 2 === 0) throw new TypeError('collection path needs an odd number of segments: ' + path);
      const q = {path, limit: () => q, get: async () => { const docs = JSON.parse(await window.__dbList(path)).map(([id, v]) => ({id, exists:true, data: () => v})); return {docs, size:docs.length, empty:!docs.length}; }, doc: id => doc(path + '/' + id)}; return q; };
    window.claude = {use: async nm => nm === 'db' ? {doc, collection:coll} : nm === 'user' ? {id: async () => 'u123', isOwner: () => true} : null};
  });
  await page.goto('file://' + require('path').resolve(file || '../index.html')); await page.waitForFunction(() => typeof Store !== 'undefined' && Store.loaded); await page.waitForTimeout(200);
  console.log('mode at start:', await page.evaluate(() => Store.mode), '| note:', await page.textContent('.mode-note'));
  await page.click('[data-action="start"][data-scope="daily"]'); await page.waitForTimeout(300);
  let answered = 0;
  for (let i = 0; i < 12 && answered < 6; i++) {
    const did = await page.evaluate(() => { const ex = S.ex; if (ex.intro) { document.querySelector('#cont').click(); return 'intro'; }
      if (ex.opts) { const j = ex.opts.indexOf(ex.answer); document.querySelectorAll('.opt[data-opt]')[j].click(); document.querySelector('#check').click(); return 'ans'; }
      document.querySelector('[data-action="skip"]')?.click(); return 'skip'; });
    if (did !== 'intro') { answered++; await page.waitForTimeout(80); await page.click('#cont'); }
    await page.waitForTimeout(80);
  }
  const seen1 = await page.evaluate(() => seenCount(items()));
  console.log('before close: state', await page.evaluate(() => JSON.stringify({S: !!S, layer: !!document.querySelector('.session'), pending: Store.pending, dirty: [...Store.dirty], mock: Object.keys({})})));
  await page.keyboard.press('Escape'); await page.waitForTimeout(1200);
  // the iPhone wipes the page's local storage when the app is closed
  await page.evaluate(() => { localStorage.removeItem('repaso:v3'); localStorage.removeItem('repaso:v1'); });
  await page.reload(); await page.waitForFunction(() => typeof Store !== 'undefined' && Store.loaded); await page.waitForTimeout(200);
  const seen2 = await page.evaluate(() => seenCount(items()));
  console.log('after reopen: state', await page.evaluate(() => JSON.stringify({mode: Store.mode, err: Store.lastError, progKeys: Object.keys(Store.data.prog), mock: Object.keys({}), sample: JSON.stringify(Object.values(Object.values(Store.data.prog)[0] || {})[0] || null)})));
  console.log('cards seen before close:', seen1, '| after reopen with empty device storage:', seen2, '| xp kept:', await page.evaluate(() => JSON.stringify(profile().xpByDay)));
  console.log('docs in account:', Object.keys(DB).join(', '));
  // close before the account save completes: progress must come back from the device copy and be uploaded
  await page.click('[data-action="start"][data-scope="daily"]'); await page.waitForTimeout(300);
  await page.evaluate(() => { const ex = S.ex; if (ex.opts) { const j = ex.opts.indexOf(ex.answer); document.querySelectorAll('.opt[data-opt]')[j].click(); document.querySelector('#check').click(); } });
  const seen3 = await page.evaluate(() => seenCount(items()));
  await page.reload(); await page.waitForFunction(() => typeof Store !== 'undefined' && Store.loaded); await page.waitForTimeout(200);
  console.log('quick close: seen', seen3, '→ after reopen', await page.evaluate(() => seenCount(items())));
  console.log('errors', errors); await b.close();
})();
