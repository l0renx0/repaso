const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const page = await (await b.newContext({viewport:{width:390,height:844}, hasTouch:true})).newPage();
  const errs = []; page.on('pageerror', e => { errs.push(e.message); if (errs.length < 3) console.log('STACK', e.stack.split('\n').slice(0,4).join(' | ')); });
  await page.goto('file://' + require('path').resolve(process.argv[2] || '../index.html')); await page.waitForFunction(() => typeof Store !== 'undefined' && Store.loaded);
  const problems = []; let screens = 0;
  for (const [scope, arg] of [['lesson','S1'],['lesson','S3'],['lesson','L3'],['lesson','L8'],['topic','ubicadores'],['topic','ser-estar'],['lesson','S1'],['topic','por-para']]) {
    await page.evaluate(([s, a]) => startSession(s, a), [scope, arg]);
    const wrongOnce = new Set();
    for (let step = 0; step < 80; step++) {
      globalThis.__last = await page.evaluate(() => S ? S.ex.type + ' ' + S.state + ' ' + (S.ex.item?.id||'') : ''); const info = await page.evaluate(() => S && S.state !== 'done' ? {type:S.ex.type, intro:!!S.ex.intro, id:S.ex.item?.id, retry:!!S.ex.retry, opts:S.ex.opts || null} : null);
      if (!info) break;
      if (info.intro) { await page.click('#cont'); continue; }
      if (info.opts && info.type !== 'gen' || info.type === 'gen' && info.opts && await page.$('.opt[data-opt]')) {
        screens++;
        const n = await page.$$eval('.opt[data-opt]', x => x.length);
        for (let k = 0; k < n; k++) {
          await page.click(`.opt[data-opt="${k}"]`, {force:true});
          const r = await page.evaluate(k => ({label: document.querySelectorAll('.opt[data-opt]')[k].querySelector('span:last-child').textContent, gap: document.querySelector('#sbody .gap')?.textContent, sel: S.ex.opts[S.sel], hasGap: !!document.querySelector('#sbody .gap'), q: S.ex.d?.q || ''}), k);
          if (r.sel !== r.label) problems.push(`${info.id}${info.retry ? ' (ripetuto)' : ''}: tocco «${r.label}», l'app registra «${r.sel}»`);
          if (r.hasGap && ['choice'].includes(info.type) && r.gap !== r.label) problems.push(`${info.id}${info.retry ? ' (ripetuto)' : ''}: tocco «${r.label}», nella frase «${r.gap}»`);
        }
        const k = await page.evaluate(w => { const e = S.ex; return w ? e.opts.findIndex(o => o !== e.answer) : e.opts.indexOf(e.answer); }, !wrongOnce.has(info.id));
        wrongOnce.add(info.id);
        await page.click(`.opt[data-opt="${k}"]`, {force:true}); await page.click('#check');
        const res = await page.evaluate(k => ({cls: document.querySelector('#sfoot').className, chosen: S.ex.opts[k], ans: S.ex.answer, rightBtn: [...document.querySelectorAll('.opt.right span:last-child')].map(x => x.textContent)}), k);
        if ((res.chosen === res.ans) !== res.cls.includes('ok')) problems.push(`${info.id}: scelgo «${res.chosen}», giusta «${res.ans}», verdetto ${res.cls}`);
        if (res.rightBtn.length !== 1 || res.rightBtn[0] !== res.ans) problems.push(`${info.id}: evidenziata come giusta «${res.rightBtn.join('|')}» invece di «${res.ans}»`);
      } else {
        await page.evaluate(() => { const ex = S.ex;
          if (ex.type === 'build') { ex.es.split(/\s+/).forEach(w => [...document.querySelectorAll('#bank .tok:not(.used)')].find(x => x.textContent === w)?.click()); }
          else if (ex.type === 'match') { ex.items.forEach(it => { document.querySelector(`.opt[data-m="es"][data-id="${it.id}"]`).click(); document.querySelector(`.opt[data-m="it"][data-id="${it.id}"]`).click(); }); return; }
          else if (ex.type === 'reveal') { document.querySelector('[data-action="reveal"]').click(); document.querySelector('[data-action="self"][data-g="3"]').click(); return; }
          else if (document.querySelector('#ans')) { const a = document.querySelector('#ans'); a.value = 'zzz'; a.dispatchEvent(new Event('input')); }
          document.querySelector('#check')?.click(); });
      }
      await page.waitForTimeout(30);
      if (await page.$('#cont')) await page.click('#cont', {force:true});
    }
    await page.evaluate(() => { if (S) quit(); });
  }
  console.log(`schermate a scelta controllate: ${screens} | problemi: ${problems.length}`);
  [...new Set(problems)].slice(0, 20).forEach(p => console.log('  - ' + p));
  console.log('errori pagina:', errs.slice(0, 3));
  await b.close();
})();
