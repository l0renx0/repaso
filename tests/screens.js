const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const errors = [];
  for (const [name, vp, dark] of [['phone',{width:390,height:844},false],['mac',{width:1280,height:820},true]]) {
    const ctx = await b.newContext({viewport:vp, colorScheme: dark ? 'dark':'light', hasTouch: name==='phone'});
    const page = await ctx.newPage();
    page.on('pageerror', e => errors.push(name+': '+e.message));
    page.on('console', m => { if (m.type()==='error') errors.push(name+' console: '+m.text()); });
    await page.addInitScript(() => {
      const sample = async () => ({text:'ok'}); sample.json = async () => ({fix:'',note:'',reply:'¡Hola!',it:'Ciao',hints:[],done:false}); sample.limits = async () => ({});
      window.claude = {use: async n => n === 'sample' ? sample : null};
    });
    await page.goto('file://' + require('path').resolve(process.argv[2] || '../index.html')); await page.waitForTimeout(700);
    if (name==='phone') console.log('unresolved rules:', await page.evaluate(() => GRAMMAR.filter(g => g.ruleIds.length !== g.rules.length).map(g => g.id)), '| topic items:', await page.evaluate(() => GRAMMAR.map(g => g.id+':'+gramItems(g).length).join(' ')));
    await page.screenshot({path:require('os').tmpdir() + '/' + name+'-today.png', fullPage:true});
    const nav = name==='phone' ? '.tabs' : '.rail';
    await page.click(`${nav} [data-go="grammatica"]`); await page.waitForTimeout(500);
    await page.screenshot({path:require('os').tmpdir() + '/' + name+'-gram.png', fullPage:true});
    await page.click('[data-action="gram-open"][data-id="ser-estar"]'); await page.waitForTimeout(400);
    let k = 0;
    while (k++ < 12) {
      const st = await page.evaluate(() => Tk && Tk.steps[Tk.i]);
      if (!st) break;
      if (k <= 4) await page.screenshot({path:require('os').tmpdir() + '/' + `${name}-g${k}-${st}.png`});
      if (st === 'end') { await page.screenshot({path:require('os').tmpdir() + '/' + name+'-gend.png'}); break; }
      if (await page.locator('#check').count()) { await page.click('.opt[data-opt="0"]'); await page.click('#check'); await page.waitForTimeout(150); if (k===2) await page.screenshot({path:require('os').tmpdir() + '/' + name+'-gdisc-fb.png'}); }
      await page.click('#cont'); await page.waitForTimeout(150);
    }
    await page.click('[data-action="gram-practice"]'); await page.waitForTimeout(400);
    console.log(name, 'topic session total:', await page.evaluate(() => S && S.total));
    await page.screenshot({path:require('os').tmpdir() + '/' + name+'-topicsess.png'});
    // answer some to trigger combo
    for (let i=0;i<4;i++){ const ok = await page.evaluate(() => { const ex=S.ex; if (ex.opts) { const j = ex.opts.indexOf(ex.answer); document.querySelectorAll('.opt[data-opt]')[j]?.click(); return true; } return false; }); if (!ok) break; await page.click('#check'); await page.waitForTimeout(150); if (i===2) await page.screenshot({path:require('os').tmpdir() + '/' + name+'-combo.png'}); await page.click('#cont'); await page.waitForTimeout(100); }
    await page.keyboard.press('Escape'); await page.waitForTimeout(200);
    await page.click(`${nav} [data-go="grammatica"]`); await page.waitForTimeout(300);
    await page.click('[data-action="gram-open"][data-id="ser-estar"]'); await page.waitForTimeout(300);
    await page.screenshot({path:require('os').tmpdir() + '/' + name+'-gsheet.png'});
    await page.click('[data-action="close"]');
    await page.click(`${nav} [data-go="pratica"]`); await page.waitForTimeout(400);
    await page.screenshot({path:require('os').tmpdir() + '/' + name+'-pratica.png', fullPage:true});
    await page.click(`${nav} [data-go="percorso"]`); await page.waitForTimeout(300);
    await page.click('[data-lesson="L3"]'); await page.waitForTimeout(300);
    await page.click('[data-unit="L3.2"]'); await page.waitForTimeout(300);
    await page.screenshot({path:require('os').tmpdir() + '/' + name+'-unit.png'});
    await page.click('[data-action="close"]');
    await page.click(`${nav} [data-go="oggi"]`); await page.waitForTimeout(300);
    await page.click('[data-action="settings"]'); await page.waitForTimeout(300);
    await page.screenshot({path:require('os').tmpdir() + '/' + name+'-settings.png'});
    await page.click('[data-action="close"]');
    await page.click(`${nav} [data-go="quaderno"]`); await page.waitForTimeout(300);
    await page.click('[data-filter="review"]'); await page.waitForTimeout(200);
    console.log(name, 'hscroll', await page.evaluate(() => document.documentElement.scrollWidth > innerWidth));
    await ctx.close();
  }
  console.log('ERRORS', errors); await b.close();
})();
