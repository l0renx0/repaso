// Simulated learner: one daily session for N days, using the app's own queue, exercise choice, grading and scheduler.
const { chromium } = require('playwright');
const file = process.argv[2], DAYS = +(process.argv[3] || 120), SEED = +(process.argv[4] || 1), KMUL = +(process.argv[5] || 1), NOCAL = process.argv[6] === 'nocal';
(async () => {
  const b = await chromium.launch(); const page = await (await b.newContext()).newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('file://' + require('path').resolve(file || '../index.html')); await page.waitForTimeout(700);
  const res = await page.evaluate(({DAYS, SEED, KMUL, NOCAL}) => { if (NOCAL) calib = () => 1;
    let seed = SEED; const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    Math.random = rand;
    let T = Date.now(); Date.now = () => T;
    Store.data = {prog:{}, lessons:{}, items:{}, meta:{}}; Store.saveLocal = () => {}; Store.write = () => Promise.resolve();
    if (typeof invalidate === 'function') invalidate();
    const hard = new Map(), kOf = id => { if (!hard.has(id)) hard.set(id, (.6 + rand()*.9)*KMUL); return hard.get(id); };
    const RECOG = new Set(['pick','listen','conj-pick','choice','match']);
    const recallP = (it, ex) => {
      const p = P(it), k = kOf(it.id);
      let pr = !p ? (RECOG.has(ex.type) ? .8 : .45) : Math.pow(retr(p, T), k);
      if (RECOG.has(ex.type) || ex.type === 'gen' && ex.mode === 'pick') pr = 1 - (1 - pr)*.45;
      return pr;
    };
    const days = [], log = {rev:0, revOk:0, mature:0, matureOk:0};
    let errors = 0;
    for (let d = 0; d < DAYS; d++) {
      if (rand() < .12) { T += DAY; days.push({d, skip:1}); continue; }      // some days you don't open the app
      let q; try { q = buildQueue('daily'); } catch (e) { errors++; days.push({d, err:String(e)}); T += DAY; continue; }
      S = {scope:'daily', queue:q, i:0, total:q.length, xp:0, right:0, answered:0, newSeen:0, missed:new Map(), tries:new Map(), consol:new Set(), rl:{n:0, ok:0}, graded:new Set(), sched:[], started:T, state:'ask', combo:0, best:0, t0:T};
      let n = 0, nNew = 0, nRev = 0, minutes = 0;
      for (let i = 0; i < S.queue.length && i < 200; i++) {
        const ex = S.queue[i]; S.i = i; S.ex = ex;
        if (ex.intro) { minutes += .3; continue; }
        if (ex.type === 'match') { ex.items.forEach(it => grade_(it, 3, '')); minutes += .6; continue; }
        const it = ex.item; if (!it) continue;
        const prev = P(it), isRev = prev && !ex.retry && !S.graded.has(it.id);
        const ok = rand() < recallP(it, ex);
        const len = (correctText(ex) || '').length, fast = rand() < (prev ? retr(prev, T) : .5);
        const ms = ok ? (RECOG.has(ex.type) ? (fast ? 2500 : 7000) : (fast ? 1500 + 90*len : 6000 + 300*len)) : 9000;
        S.t0 = T - ms; S.tAns = T; minutes += ms/60000 + .15;
        if (isRev) { log.rev++; if (ok) log.revOk++; if (prev.s >= 21) { log.mature++; if (ok) log.matureOk++; } nRev++; }
        if (!prev && !S.graded.has(it.id)) nNew++;
        let g;
        try { g = evGrade(ex, ok ? 'ok' : 'bad'); grade_(it, g, ok ? '' : 'x'); } catch (e) { errors++; }
        if (typeof afterAnswer === 'function') { try { afterAnswer(ex, ok ? 'ok' : 'bad', S.queue.length); } catch (e) { errors++; } }
        else if (!ok) { const tries = S.tries.get(it.id) || 0; if (tries < 2) { S.tries.set(it.id, tries + 1); S.queue.splice(Math.min(S.queue.length, i + 4), 0, {...ex, retry:true}); } }
        n++;
      }
      saveSession();
      const all = items(), c = counts(all);
      days.push({d, n, nNew, nRev, min:+minutes.toFixed(1), due:all.filter(i => P(i) && P(i).due <= T + DAY).length, seen:all.filter(i => P(i)).length, weak:c.weak, solid:c.solid});
      S = null; T += DAY;
    }
    const all = items(), leech = all.filter(i => (P(i)?.lapses || 0) >= 4).length;
    const act = days.filter(x => !x.skip && !x.err);
    const avg = k => +(act.reduce((a, x) => a + x[k], 0) / act.length).toFixed(1);
    return {errors, leech, retention:+(log.revOk/log.rev).toFixed(3), matureRetention:log.mature ? +(log.matureOk/log.mature).toFixed(3) : null, reviews:log.rev,
      avgExercises:avg('n'), avgNew:avg('nNew'), avgMin:avg('min'), maxMin:Math.max(...act.map(x => x.min)),
      seenEnd:act.at(-1).seen, solidEnd:act.at(-1).solid, weakEnd:act.at(-1).weak, dueBacklogEnd:act.at(-1).due,
      weeks:[0,1,2,3,4,6,8,12,16].map(w => act.filter(x => x.d >= w*7 && x.d < w*7 + 7)).filter(a => a.length).map(a => `${Math.round(a.reduce((s, x) => s + x.min, 0)/a.length)}min/${Math.round(a.reduce((s, x) => s + x.nNew, 0)/a.length)}new`).join(' ')};
  }, {DAYS, SEED, KMUL, NOCAL});
  console.log(JSON.stringify(res));
  if (errs.length) console.log('page errors:', errs.slice(0, 5));
  await b.close();
})();
