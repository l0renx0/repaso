const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  // 1. 2500 imported items in the account, read in pages
  { const page = await (await b.newContext()).newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
    await page.addInitScript(() => {
      const DB = {}; for (let k = 0; k < 2500; k++) DB['data/users/u/repaso/items/i' + k] = {kind:'vocab', es:'palabra' + k, it:'parola' + k, lessonId:'lx', createdAt:1000 + k, misses:0};
      DB['data/users/u/repaso/lessons/lx'] = {title:'Grande', date:'2026-01-01', createdAt:1};
      const n = p => p.split('/').length;
      const coll = path => { const mk = (f = [], ord = null, lim = 1000) => ({ where: (fl, op, v) => mk([...f, [fl, op, v]], ord, lim), orderBy: fl => mk(f, fl, lim), limit: l => mk(f, ord, l),
        get: async () => { let docs = Object.keys(DB).filter(k => k.startsWith(path + '/') && n(k) === n(path) + 1).map(k => ({id:k.split('/').pop(), exists:true, data: () => DB[k]}));
          for (const [fl, op, v] of f) docs = docs.filter(d => op === '>' ? d.data()[fl] > v : true);
          if (ord) docs.sort((a, b) => a.data()[ord] - b.data()[ord]); docs = docs.slice(0, lim); return {docs, size:docs.length, empty:!docs.length}; },
        doc: id => ({set: async v => { DB[path + '/' + id] = v; }, delete: async () => {}}) }); return mk(); };
      window.claude = {use: async nm => nm === 'db' ? {doc: p => ({collection: s => coll(p + '/' + s)}), collection: coll} : nm === 'user' ? {id: async () => 'u'} : null};
    });
    await page.goto('file://' + require('path').resolve(process.argv[2] || '../index.html')); await page.waitForFunction(() => typeof Store !== 'undefined' && Store.loaded);
    const r = await page.evaluate(() => ({n: Object.keys(Store.data.items).length, mode: Store.mode}));
    console.log((r.n === 2500 && r.mode === 'cloud' ? 'OK   ' : 'FAIL ') + `lettura a pagine: ${r.n} voci su 2500, modalità ${r.mode}`, errs.length ? errs : '');
  }
  // 2. the keyboard covers half the screen: answer box and Check must stay visible
  { const page = await (await b.newContext({viewport:{width:390,height:844}})).newPage();
    await page.goto('file://' + require('path').resolve(process.argv[2] || '../index.html')); await page.waitForFunction(() => typeof Store !== 'undefined' && Store.loaded);
    await page.evaluate(() => { startSession('daily'); const it = items().find(i => i.kind === 'vocab'); S.queue = [{type:'type', item:it}]; S.total = 1; showEx();
      document.documentElement.style.setProperty('--vvh', '420px'); document.documentElement.style.setProperty('--vvt', '0px'); });
    await page.waitForTimeout(200);
    const r = await page.evaluate(() => ({check: document.querySelector('#check').getBoundingClientRect().bottom, ans: document.querySelector('#ans').getBoundingClientRect().top}));
    await page.screenshot({path:require('os').tmpdir() + '/' + 'keyboard.png'});
    console.log((r.check <= 420 ? 'OK   ' : 'FAIL ') + `con la tastiera aperta (schermo visibile 420px) il pulsante Controlla finisce a ${Math.round(r.check)}px`);
  }
  await b.close();
})();
