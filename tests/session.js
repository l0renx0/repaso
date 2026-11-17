const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const errors = [];
  const ctx = await b.newContext({viewport:{width:390,height:844}, hasTouch:true});
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('file://' + require('path').resolve(process.argv[2] || '../index.html')); await page.waitForTimeout(700);
  // 1. scheduler: a card answered "good" every time it is due
  console.log(await page.evaluate(() => {
    const out = []; let p = null, t = Date.now();
    for (const g of [3,3,3,3,3]) { p = schedule(p, g, t); out.push(Math.round((p.due - t)/DAY) + 'g'); t = p.due; }
    let q = null; t = Date.now(); const out2 = [];
    for (const g of [3,3,1,3,3]) { q = schedule(q, g, t); out2.push(g === 1 ? '10min' : Math.round((q.due - t)/DAY) + 'g'); t = q.due; }
    let e = null; t = Date.now(); const out3 = [];
    for (const g of [4,4,4]) { e = schedule(e, g, t); out3.push(Math.round((e.due - t)/DAY) + 'g'); t = e.due; }
    return 'sempre bene: ' + out.join(' → ') + ' | con un errore: ' + out2.join(' → ') + ' | sempre facile: ' + out3.join(' → ');
  }));
  // 2. stage by stability, ctx sentences found, interleaving
  console.log(await page.evaluate(() => {
    const all = items(), voc = all.filter(i => i.kind === 'vocab');
    const ctxN = voc.filter(i => ctxEx(i)).length;
    const ex = ctxEx(voc.find(i => ctxEx(i)));
    return `parole usabili in una frase del tutor: ${ctxN} | esempio: «${ex.q}» → ${ex.answers[0]}`;
  }));
  // set up a realistic state: many cards studied with varied strength, one leech
  await page.evaluate(() => {
    const now = Date.now(), all = shuffle(items().filter(i => ['vocab','phrase','verb'].includes(i.kind) && ['L2','L3','L4','L6'].includes(i.lessonId)));
    all.slice(0, 60).forEach((it, k) => { const s = [0.5, 2, 6, 20, 30][k % 5]; setP(it, {s, d:5, due:now - 3600e3, last:now - s*DAY*(0.6 + Math.random()*1.6), reps:3, lapses:k === 5 ? 5 : 0, m:0, w:[], g:3}); });
    Store.flush();
  });
  await page.reload(); await page.waitForTimeout(600);
  console.log(await page.evaluate(() => { const q = buildQueue('daily'); const types = q.map(e => e.type); let rep = 0; for (let i = 1; i < q.length; i++) if (q[i].type === q[i-1].type && !q[i].intro && !q[i-1].intro) rep++; return 'stadi: ' + q.filter(e => e.item && !e.intro).map(e => stage(e.item) + ':' + (P(e.item)?.s)).join(' ') + ' | coda: ' + types.join(', ') + ' | stesso tipo di fila: ' + rep; }));
  await page.click('[data-action="start"][data-scope="daily"]'); await page.waitForTimeout(400);
  const seen = {};
  for (let i = 0; i < 40; i++) {
    const t = await page.evaluate(() => S && S.state !== 'done' ? S.ex.type : null);
    if (!t) break;
    if (!seen[t]) { seen[t] = 1; await page.screenshot({path:require('os').tmpdir() + '/' + `ex-${t}.png`}); }
    const typed = await page.$('#ans');
    if (typed) {
      // answer wrong once to see the letter diff
      if (!seen['wrong-' + t]) { seen['wrong-' + t] = 1; const right = await page.evaluate(() => cleanEs(expected(S.ex)[0] || '')); await page.fill('#ans', right.slice(0, -2) + 'x' ); await page.click('#check'); await page.waitForTimeout(250); await page.screenshot({path:require('os').tmpdir() + '/' + `fb-wrong-${t}.png`}); }
      else { const right = await page.evaluate(() => cleanEs(expected(S.ex)[0] || '')); await page.fill('#ans', right); await page.click('#check'); await page.waitForTimeout(200); if (!seen['ok-' + t]) { seen['ok-' + t] = 1; await page.screenshot({path:require('os').tmpdir() + '/' + `fb-ok-${t}.png`}); } }
      await page.click('#cont'); continue;
    }
    const moved = await page.evaluate(() => { const ex = S.ex;
      if (ex.intro) { document.querySelector('#cont').click(); return 1; }
      if (ex.opts) { const j = ex.opts.indexOf(ex.answer); document.querySelectorAll('.opt[data-opt]')[j].click(); document.querySelector('#check').click(); return 2; }
      if (ex.type === 'build') { ex.es.split(/\s+/).forEach(w => { const b = [...document.querySelectorAll('#bank .tok:not(.used)')].find(x => x.textContent === w); b && b.click(); }); document.querySelector('#check').click(); return 2; }
      if (ex.type === 'match') { ex.items.forEach(it => { document.querySelector(`.opt[data-m="es"][data-id="${it.id}"]`).click(); document.querySelector(`.opt[data-m="it"][data-id="${it.id}"]`).click(); }); return 2; }
      if (ex.type === 'reveal') { document.querySelector('[data-action="reveal"]').click(); document.querySelector('[data-action="self"][data-g="3"]').click(); return 1; }
      document.querySelector('[data-action="skip"]').click(); return 2; });
    await page.waitForTimeout(150);
    if (moved === 2) await page.click('#cont');
    await page.waitForTimeout(100);
  }
  await page.screenshot({path:require('os').tmpdir() + '/' + 'done.png', fullPage:true});
  console.log('tipi visti:', Object.keys(seen).filter(k => !k.includes('-')).join(', '));
  console.log('errori:', errors);
  await b.close();
})();
