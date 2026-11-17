const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({viewport:{width:390,height:844}, hasTouch:true}); const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await page.addInitScript(() => {
    let conv = 0;
    const sample = async () => ({text:'Perché con yo il verbo ser fa soy.'});
    sample.json = async (prompt) => {
      await new Promise(r => setTimeout(r, 120));
      if (prompt.includes('MATERIALE DELLA LEZIONE')) return {title:'Il mercato', summary:'Frutta e verdura', topics:['frutta'], items:[
        {kind:'vocab', es:'la manzana', it:'la mela'}, {kind:'vocab', es:'la pera', it:'la pera'}, {kind:'vocab', es:'el plátano', it:'la banana'},
        {kind:'phrase', es:'¿Cuánto cuesta un kilo?', it:'Quanto costa un chilo?', drills:[{t:'build', it:'Quanto costa un chilo?', es:'¿Cuánto cuesta un kilo?'}]},
        {kind:'verb', es:'pesar', it:'pesare', forms:{tense:'presente', yo:'peso', 'tú':'pesas', 'él/ella/usted':'pesa', nosotros:'pesamos', vosotros:'pesáis', 'ellos/ellas/ustedes':'pesan'}},
        {kind:'grammar', es:'Cuánto cuesta / cuestan', it:'Singolare cuesta, plurale cuestan.', drills:[{t:'choice', q:'¿Cuánto ___ las peras?', o:['cuestan','cuesta'], a:0, why:'Plurale.'},{t:'cloze', q:'¿Cuánto ___ el kilo?', a:'cuesta', it:'Quanto costa il chilo?'}]},
        {kind:'vocab', es:'hola', it:'ciao'}]};
      if (prompt.includes('Traduzione dello studente')) return {verdict:'ok', fixed:'', note:'Va bene anche così.'};
      conv++;
      return conv === 1 ? {fix:'', note:'', reply:'¡Hola! ¿Cómo te llamas?', it:'Ciao! Come ti chiami?', hints:['Me llamo Lorenzo.'], done:false}
        : {fix:'Me llamo Lorenzo.', note:'Llamarse è riflessivo.', reply:'¡Encantada! Hasta luego.', it:'Piacere! A dopo.', hints:[], done:true};
    };
    sample.limits = async () => ({images:{maxCount:4}});
    window.claude = {use: async n => n === 'sample' ? sample : null};
    window.SpeechRecognition = window.webkitSpeechRecognition = class { start(){ setTimeout(() => { const res = [{transcript:window.__say || 'hola'}]; res.isFinal = true; this.onresult?.({results:[res]}); this.onend?.(); }, 100); } stop(){} abort(){} };
  });
  await page.goto('file://' + require('path').resolve(process.argv[2] || '../index.html')); await page.waitForFunction(() => typeof Store !== 'undefined' && Store.loaded); await page.waitForTimeout(300);
  const check = async (name, fn) => { try { const r = await fn(); console.log((r === true || r === undefined ? 'OK   ' : 'FAIL ') + name + (r === true || r === undefined ? '' : ' → ' + r)); } catch (e) { console.log('FAIL ' + name + ' → ' + e.message.split('\n')[0]); } };

  await check('importa una lezione da testo incollato', async () => {
    await page.click('.tabs [data-go="percorso"]'); await page.click('[data-action="import"]:visible');
    await page.click('[data-action="show-paste"]'); await page.fill('#imp-paste', 'Lezione al mercato: la manzana, la pera, el plátano, cuánto cuesta un kilo, pesar...');
    await page.click('[data-action="analyze"]'); await page.waitForSelector('[data-action="save-import"]', {timeout:5000});
    const dupOff = await page.evaluate(() => imp.result.items.find(i => i.es === 'hola').keep === false);
    await page.click('[data-action="save-import"]'); await page.waitForTimeout(300);
    const n = await page.evaluate(() => Object.keys(Store.data.items).length);
    return dupOff && n === 6 ? true : `duplicato scartato: ${dupOff}, elementi salvati: ${n}`;
  });
  await check('ripassa la lezione importata (verbo, grammatica, frase)', async () => {
    const lid = await page.evaluate(() => Object.keys(Store.data.lessons)[0]);
    await page.evaluate(id => startSession('lesson', id), lid); await page.waitForTimeout(200);
    for (let i = 0; i < 30; i++) {
      const done = await page.evaluate(() => { if (!S || S.state === 'done') return true; const ex = S.ex;
        if (ex.intro) { document.querySelector('#cont').click(); return false; }
        if (ex.opts) { document.querySelectorAll('.opt[data-opt]')[ex.opts.indexOf(ex.answer)].click(); document.querySelector('#check').click(); }
        else if (ex.type === 'build') { ex.es.split(/\s+/).forEach(w => [...document.querySelectorAll('#bank .tok:not(.used)')].find(x => x.textContent === w)?.click()); document.querySelector('#check').click(); }
        else if (document.querySelector('#ans')) { const a = document.querySelector('#ans'); a.value = cleanEs(expected(ex)[0]); a.dispatchEvent(new Event('input')); document.querySelector('#check').click(); }
        else if (ex.type === 'reveal') { document.querySelector('[data-action="reveal"]').click(); document.querySelector('[data-action="self"][data-g="3"]').click(); return false; }
        document.querySelector('#cont')?.click(); return false; });
      if (done) break; await page.waitForTimeout(60);
    }
    const r = await page.evaluate(() => ({left: Object.values(Store.data.items).filter(i => !i.srs).length, state: S?.state}));
    await page.evaluate(() => quit());
    return r.left === 0 ? true : `carte importate non ripassate: ${r.left}, stato ${r.state}`;
  });
  await check('elimina la lezione importata', async () => {
    const lid = await page.evaluate(() => Object.keys(Store.data.lessons)[0]);
    await page.evaluate(id => lessonSheet(id), lid); await page.click('[data-action="ask-del"]'); await page.click('[data-action="del-lesson"]'); await page.waitForTimeout(200);
    const r = await page.evaluate(() => [Object.keys(Store.data.lessons).length, Object.keys(Store.data.items).length]);
    return r[0] === 0 && r[1] === 0 ? true : `restano ${r[0]} lezioni e ${r[1]} elementi`;
  });
  await check('traduzione giudicata da Claude', async () => {
    const it = await page.evaluate(() => items().find(i => i.kind === 'drill' && i.d.t === 'tr').id);
    await page.evaluate(id => { startSession('daily'); S.queue = [drillEx(items().find(i => i.id === id), items().find(i => i.id === id).d, 2, items())]; S.total = 1; showEx(); }, it);
    await page.fill('#ans', 'una frase diversa ma giusta'); await page.click('#check'); await page.waitForSelector('.s-foot.ok', {timeout:3000});
    await page.evaluate(() => quit()); return true;
  });
  await check('spiegazione «Perché?» dopo un errore', async () => {
    await page.evaluate(() => { startSession('daily'); const it = items().find(i => i.kind === 'vocab'); S.queue = [{type:'type', item:it}]; S.total = 1; showEx(); });
    await page.fill('#ans', 'zzz'); await page.click('#check'); await page.click('[data-action="explain"]'); await page.waitForSelector('.explain', {timeout:3000});
    await page.evaluate(() => quit()); return true;
  });
  await check('conversazione fino al riepilogo, correzione salvata nel ripasso', async () => {
    await page.evaluate(() => startConv('c1')); await page.waitForSelector('#c-in'); await page.waitForTimeout(300);
    await page.fill('#c-in', 'Yo llamo Lorenzo'); await page.keyboard.press('Enter'); await page.waitForSelector('[data-action="c-end"].btn', {timeout:4000});
    await page.click('[data-action="c-end"].btn'); await page.waitForTimeout(200);
    const r = await page.evaluate(() => ({fix: Object.values(Store.data.items).filter(i => i.lessonId === 'conv').length, title: document.querySelector('.done-screen .big')?.textContent}));
    await page.evaluate(() => quitTalk());
    return r.fix === 1 && r.title ? true : JSON.stringify(r);
  });
  await check('pronuncia con il microfono', async () => {
    await page.evaluate(() => startSay('rep')); await page.waitForTimeout(200);
    await page.evaluate(() => window.__say = Tk.queue[0].es); await page.click('#mic'); await page.waitForSelector('.s-foot.ok', {timeout:3000});
    await page.evaluate(() => quitTalk()); return true;
  });
  await check('teoria guidata completa e argomento segnato come studiato', async () => {
    await page.evaluate(() => startGram('hay'));
    for (let i = 0; i < 12; i++) { const st = await page.evaluate(() => Tk && Tk.steps[Tk.i]); if (!st || st === 'end') break; if (await page.$('#check')) { await page.click('.opt[data-opt="0"]'); await page.click('#check'); } await page.click('#cont'); }
    const ok = await page.evaluate(() => !!gramDone('hay')); await page.evaluate(() => quitTalk()); return ok || 'non segnato';
  });
  await check('impostazioni: ogni opzione si salva', async () => {
    await page.evaluate(() => settingsSheet());
    for (const [k, v] of [['newPerDay','30'],['retain','0.95'],['goal','100'],['mute','true'],['haptics','false'],['pace','0.85']]) await page.click(`[data-action="set"][data-k="${k}"][data-v="${v}"]`);
    const p = await page.evaluate(() => profile());
    await page.evaluate(() => closeSheet());
    return p.newPerDay === 30 && p.retain === .95 && p.goal === 100 && p.mute === true && p.haptics === false && p.pace === .85 ? true : JSON.stringify(p);
  });
  await check('Quaderno: ricerca senza accenti e dettaglio', async () => {
    await page.click('.tabs [data-go="quaderno"]'); await page.fill('#book-q', 'boligrafo'); await page.waitForTimeout(150);
    const n = await page.$$eval('.word', x => x.length); await page.click('.word'); const det = await page.$('.word-detail');
    return n >= 1 && det ? true : `risultati ${n}`;
  });
  await check('allenamenti: ogni tipo parte', async () => {
    for (const k of ['conj','trad','dict','numore']) { await page.evaluate(k => startSession('train', k), k); const ok = await page.evaluate(() => !!S); if (!ok) return 'non parte: ' + k; await page.evaluate(() => quit()); }
    return true;
  });
  await check('punti deboli senza carte deboli: messaggio, nessun crash', async () => { await page.evaluate(() => { for (const l of Object.values(Store.data.prog)) for (const p of Object.values(l)) p.m = 0; startSession('weak'); }); return await page.evaluate(() => !S) || 'sessione vuota aperta'; });
  await check('tutte le lezioni e le unità si aprono', async () => {
    const r = await page.evaluate(() => { for (const l of lessons()) { lessonSheet(l.id); for (const u of l.units || []) { sheetOpenUnit = u.id; lessonSheet(l.id); } } closeSheet(); return true; }); return r;
  });
  await check('tutti gli argomenti di grammatica: scheda ed esercizi', async () => {
    return await page.evaluate(() => { const bad = []; for (const g of GRAMMAR) { gramSheet(g.id); const q = buildQueue('topic', g.id); if (!q.length) bad.push(g.id); } closeSheet(); return bad.length ? 'senza esercizi: ' + bad.join(', ') : true; });
  });
  console.log('\nerrori della pagina:', errs.length ? errs : 'nessuno');
  await b.close();
})();
