const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const page = await (await b.newContext()).newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('file://' + require('path').resolve(process.argv[2] || '../index.html')); await page.waitForTimeout(700);
  const r = await page.evaluate(() => {
    const out = {}; const add = (k, v) => (out[k] ||= []).push(v);
    const all = items(), now = Date.now();
    const realP = P;
    // force each card into each stage and build its exercises
    const stagesS = [null, 0.5, 2, 6, 25];
    for (const it of all) {
      for (const s of stagesS) {
        P = x => x === it && s ? {s, d:5, due:now, last:now - s*DAY, reps:3, lapses:0, m:0, w:[], g:3} : realP(x);
        for (let rep = 0; rep < 3; rep++) {
          let exs;
          try { exs = makeEx(it, all, null); } catch (e) { add('crash makeEx', it.id + ': ' + e.message); continue; }
          for (const ex of exs) {
            if (ex.intro) continue;
            const where = `${it.id} [${ex.type}]`;
            try {
              if (ex.opts && !(ex.type === 'gen' && ex.mode !== 'pick')) {
                const n = ex.opts.filter(o => o === ex.answer).length;
                if (n !== 1) add('risposta non tra le opzioni (o doppia)', where + ' → ' + ex.answer);
                if (new Set(ex.opts.map(norm)).size !== ex.opts.length) add('opzioni doppie', where + ': ' + ex.opts.join(' | '));
                if (ex.opts.length < 2) add('meno di 2 opzioni', where);
                if (ex.type === 'pick' && ex.dir === 'it-es') { const twins = all.filter(o => o !== it && (o.kind === 'vocab' || o.kind === 'phrase') && norm(o.it) === norm(it.it) && ex.opts.some(op => op !== ex.answer && norm(op) === norm(cleanEs(o.es)))); if (twins.length) add('opzione ambigua (stesso significato)', where + ': ' + twins.map(t => t.es).join(', ')); }
                if (ex.type === 'pick' && ex.dir === 'es-it') { const twins = all.filter(o => o !== it && norm(cleanEs(o.es)) === norm(cleanEs(it.es)) && ex.opts.some(op => op !== ex.answer && norm(op) === norm(o.it))); if (twins.length) add('opzione ambigua (stessa parola)', where); }
              }
              if (['type','dict','conj','cloze','tr','fix','ctx'].includes(ex.type) || ex.type === 'gen' && ex.mode === 'write') {
                const exp = expected(ex);
                if (!exp.length || !exp[0]) add('nessuna risposta attesa', where);
                else {
                  const said = ex.type === 'dict' ? speakable(it.es) : cleanEs(exp[0]);
                  const g = grade(said, exp, ex.type === 'tr' || ex.type === 'fix');
                  if (g.r !== 'ok') add("l'app non accetta la propria risposta", `${where}: «${said}» → ${g.r}`);
                }
                if (/…/.test(it.es) && ['type','dict','build'].includes(ex.type)) add('scrivere una frase con i puntini', where + ': ' + it.es);
              }
              if (ex.type === 'build') { const need = ex.es.split(/\s+/), have = ex.toks.map(t => t.w); if (need.some(w => !have.includes(w))) add('componi: manca una parola', where); if (norm(need.join(' ')) !== norm(ex.es)) add('componi', where); }
            } catch (e) { add('crash controllo', where + ': ' + e.message); }
          }
        }
      }
    }
    P = realP;
    // generators
    const gens = all.filter(i => i.kind === 'gen');
    for (const g of gens) for (let k = 0; k < 400; k++) {
      let ex; try { ex = genEx(g, k % 3); } catch (e) { add('crash generatore', g.gen + ': ' + e.message); continue; }
      if (ex.mode === 'pick' && (ex.opts.filter(o => o === ex.answer).length !== 1 || new Set(ex.opts).size !== ex.opts.length || ex.opts.length < 3)) add('generatore: opzioni', `${g.gen}: ${ex.answer} | ${ex.opts.join(' | ')}`);
      if (ex.mode === 'write') { const gg = grade(ex.answer, expected(ex)); if (gg.r !== 'ok') add('generatore: risposta propria rifiutata', g.gen + ' ' + ex.answer); }
    }
    // same Italian meaning, different Spanish: typing either should be fine but only one is accepted
    const byIt = {};
    for (const i of all.filter(i => i.kind === 'vocab' || i.kind === 'phrase')) (byIt[norm(i.it)] ||= []).push(i.es);
    for (const [k, v] of Object.entries(byIt)) if (v.length > 1) add('stesso italiano, più parole spagnole', `«${k}» → ${v.join(' | ')}`);
    // the same Spanish twice
    const byEs = {};
    for (const i of all.filter(i => i.kind === 'vocab' || i.kind === 'phrase')) (byEs[bare(cleanEs(i.es))] ||= []).push(i.id);
    for (const [k, v] of Object.entries(byEs)) if (v.length > 1) add('stessa parola in più carte', `${k}: ${v.join(', ')}`);
    // alternatives written as «a / b»: is each full form accepted?
    for (const i of all.filter(i => (i.kind === 'vocab' || i.kind === 'phrase') && i.es.includes(' / '))) {
      const parts = cleanEs(i.es).split(' / ');
      if (parts[1].split(' ').length < parts[0].split(' ').length) {
        const full2 = parts[0].split(' ').slice(0, parts[0].split(' ').length - parts[1].split(' ').length).concat(parts[1].split(' ')).join(' ');
        if (grade(full2, [i.es]).r !== 'ok') add('forma alternativa completa rifiutata', `${i.es}: «${full2}»`);
      }
    }
    return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, {n:v.length, ex:[...new Set(v)].slice(0, 12)}]));
  });
  for (const [k, v] of Object.entries(r)) { console.log(`\n### ${k}: ${v.n}`); v.ex.forEach(x => console.log('  - ' + x)); }
  console.log('\npage errors:', errs.slice(0, 5));
  await b.close();
})();
