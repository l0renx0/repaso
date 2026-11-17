const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const page = await (await b.newContext()).newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  // an account that already holds 5 studied cards of lesson 1, and answers slowly
  await page.addInitScript(() => {
    if (!localStorage.getItem('__mockdb')) {
      const now = Date.now(), prog = {}; ['L1:p:hola','L1:p:buenos-dias','L1:p:buenas-tardes','L1:p:buenas-noches','L1:p:adios'].forEach(id => prog[id] = {s:5, d:5, due:now + 3*864e5, last:now - 864e5, reps:2, lapses:0, m:0, w:[], g:3});
      localStorage.setItem('__mockdb', JSON.stringify({'data/users/u1/repaso/prog/L1': prog}));
    }
    const store = JSON.parse(localStorage.getItem('__mockdb')), save = () => localStorage.setItem('__mockdb', JSON.stringify(store));
    const slow = () => new Promise(r => setTimeout(r, 1500)), n = p => p.split('/').length;
    const doc = path => ({id:path.split('/').pop(), get: async () => ({exists:path in store, data:() => store[path]}), set: async v => { store[path] = JSON.parse(JSON.stringify(v)); save(); }, delete: async () => { delete store[path]; save(); }, collection: sub => coll(path + '/' + sub)});
    const coll = path => { const q = {limit: () => q, get: async () => { await slow(); const docs = Object.keys(store).filter(k => k.startsWith(path + '/') && n(k) === n(path) + 1).map(k => ({id:k.split('/').pop(), exists:true, data:() => store[k]})); return {docs, size:docs.length, empty:!docs.length}; }, doc: id => doc(path + '/' + id)}; return q; };
    window.claude = {use: async nm => nm === 'db' ? {doc, collection:coll} : nm === 'user' ? {id: async () => 'u1'} : null};
  });
  await page.goto('file://' + require('path').resolve(process.argv[2] || '../index.html')); await page.waitForTimeout(250);
  // while the account is still loading: the start button, and an answer saved straight away
  const btn = await page.evaluate(() => { const b = document.querySelector('[data-action="start"][data-scope="daily"]'); return b ? (b.disabled ? 'disattivato: ' : 'attivo: ') + b.textContent.trim() : '-'; });
  await page.evaluate(() => { const it = items().find(i => i.id === 'L1:p:gracias'); setP(it, schedule(null, 3)); Store.flush(); });
  await page.waitForTimeout(8000);
  const r = await page.evaluate(() => ({inApp: Object.keys(Store.data.prog.L1 || {}).length, inAccount: Object.keys(JSON.parse(localStorage.getItem('__mockdb'))['data/users/u1/repaso/prog/L1'] || {}).length}));
  console.log(`pulsante durante il caricamento → ${btn} | carte di L1 nell'app: ${r.inApp} | nell'account: ${r.inAccount} (attese 6) | errori: ${errs.length}`);
  await b.close();
})();
