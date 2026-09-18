(() => {
  'use strict';
  const el = (tag, text, cls) => { const node = document.createElement(tag); if (text !== undefined) node.textContent = text; if (cls) node.className = cls; return node; };
  const button = (label, run, cls = 'game-choice') => { const node = el('button', label, cls); node.type = 'button'; node.addEventListener('click', run); return node; };
  function stat(label, value) { const node = el('div'); node.append(el('strong', value), el('span', label)); return node; }
  function stats(...values) { const node = el('div', undefined, 'game-stats'); values.forEach(([label, value]) => node.append(stat(label, value))); return node; }
  const games = {
    'learning-groups'(g) {
      const moons = [['Aster', -18], ['Boreal', 5], ['Clover', 26], ['Drift', -16], ['Ember', 28], ['Fern', 7]];
      if (g.round % 2) moons.reverse();
      const matched = new Set(); let selected = [], pairs = 0;
      const summary = stats(['Pairs found', '0 / 3'], ['One shared prediction', '5.3°'], ['Average mismatch', '15°']);
      const grid = el('div', undefined, 'moon-pairs');
      const pairList = el('div', undefined, 'matched-pairs');
      moons.forEach(([name, temperature], i) => {
        const card = button(undefined, () => {
          if (g.done || matched.has(i)) return;
          if (selected.length === 2) selected = [];
          selected = selected.includes(i) ? selected.filter(n => n !== i) : [...selected, i];
          [...grid.children].forEach((node, n) => node.setAttribute('aria-pressed', String(selected.includes(n))));
          if (selected.length < 2) { g.say('Choose another moon to make a pair.'); return; }
          if (Math.abs(moons[selected[0]][1] - moons[selected[1]][1]) > 3) { g.say('These moons have different climates. A single shared prediction would miss both. Try a closer pair.'); return; }
          pairs++; selected.forEach(n => { matched.add(n); grid.children[n].disabled = true; grid.children[n].classList.add('is-paired'); });
          const names = selected.map(n => moons[n][0]).join(' + ');
          pairList.append(el('span', `${names} ✓`));
          summary.children[0].querySelector('strong').textContent = `${pairs} / 3`;
          const error = moons.reduce((sum, [, t], n) => sum + (matched.has(n) ? 1 : Math.abs(t - 16 / 3)), 0) / moons.length;
          summary.children[2].querySelector('strong').textContent = `${error.toFixed(1)}°`;
          g.say(`${names} can use a prediction closer to their own conditions. Find the next pair.`);
          selected = [];
          if (pairs === 3) g.finish('Three local models bring the average mismatch from 15° to 1° in this example. Similar data can make collaboration more useful.');
          else [...grid.children].find(node => !node.disabled)?.focus({ preventScroll: true });
        });
        card.dataset.moon = name; card.setAttribute('aria-pressed', 'false');
        const moon = el('span', undefined, 'moon-orb'); moon.setAttribute('aria-hidden', 'true');
        card.append(moon, el('strong', name), el('span', `${temperature}°`, 'moon-temperature')); grid.append(card);
      });
      g.stage.append(summary, el('p', 'Shared climate summaries · select two moons at a time', 'arena-label'), grid, pairList);
    },
    'rover-coordination'(g) {
      const E = window.RoverMission;
      let mission = E.create(428 + g.round * 17), selected = 0, previous = null;
      const wrap = el('div', undefined, 'expedition');
      const mapPanel = el('div'), controls = el('div', undefined, 'exp-controls');
      const metric = stats(['Rounds left', '12'], ['Pods recovered', '0 / 3'], ['Mapped', '0%']);
      const caption = el('p', '', 'arena-label');
      const board = el('div', undefined, 'rover-board'); board.setAttribute('aria-label', 'Exploration map; arrow keys plan a step for the selected rover');
      const cells = Array.from({length: 63}, (_, n) => {
        const node = button(undefined, () => {
          if (mission.finished) return;
          const rover = mission.rovers.findIndex(r => r.pos === n);
          if (rover >= 0 && (mission.mode === 'shared' || rover === selected)) selected = rover;
          else if (!E.plan(mission, selected, n)) { g.say('Choose a highlighted neighboring tile.'); return; }
          render();
        }, 'rover-cell'); node.dataset.cell = n; board.append(node); return node;
      });
      const modeLabel = el('label', 'Map sharing'); modeLabel.htmlFor = 'exp-map-mode';
      const mode = el('select'); mode.id = 'exp-map-mode';
      [['shared','Shared map'],['private','Private maps']].forEach(([value, title]) => {const option=el('option', title); option.value=value; mode.append(option);});
      const modeNote = el('p', '', 'exp-small');
      const selector = el('div', undefined, 'rover-selector');
      const roverButtons = E.NAMES.map((name, i) => {
        const node = button(name, () => { selected = i; render(); }, 'rover-choice'); node.style.setProperty('--rover-color', E.COLORS[i]); node.setAttribute('aria-label', `Select ${name}`); selector.append(node); return node;
      });
      const planSummary = el('p', '', 'exp-plan');
      const pad = el('div', undefined, 'exp-pad');
      const directions = [['up','↑',-9],['left','←',-1],['stay','·',0],['right','→',1],['down','↓',9]];
      const dirButtons = directions.map(([name, symbol, delta]) => {
        const node = button(symbol, () => { E.plan(mission, selected, delta ? mission.rovers[selected].pos + delta : null); render(); }, 'exp-arrow');
        node.dataset.direction = name; node.setAttribute('aria-label', name === 'stay' ? 'Clear this rover’s planned step' : `Plan ${name}`); pad.append(node); return node;
      });
      const move = button('Move the team →', () => {
        const pods = mission.found.size, conflicts = mission.conflicts;
        if (!E.advance(mission)) return;
        render();
        g.say(mission.found.size > pods ? 'A pod recovered! Keep exploring the edges of the map.' : mission.conflicts > conflicts ? 'Two routes met. Those rovers waited. Try different destinations.' : `Round ${mission.round}: every step adds to what the team knows.`);
        if (mission.finished) {
          const r = E.result(mission);
          g.finish(`${r.found}/3 pods found, ${r.coverage}% mapped, ${r.repeats} revisits. ${r.found === 3 ? 'Mission complete!' : 'The expedition is over. A new route might reveal more.'}${previous ? ` Previous ${previous.mode} attempt: ${previous.found}/3 pods and ${previous.coverage}% mapped.` : ''}`);
          compare.hidden = false; compare.textContent = `Try ${mission.mode === 'shared' ? 'private maps' : 'a shared map'} on this planet`;
        }
      }, 'mini-primary');
      const compare = button('', () => {
        previous = E.result(mission); mission = E.create(mission.seed, mission.mode === 'shared' ? 'private' : 'shared'); selected = 0;
        g.resume(); compare.hidden = true; render(); g.say('Same planet, same starting positions. Compare how map sharing changes your decisions.'); mode.focus({ preventScroll: true });
      }, 'game-compare'); compare.hidden = true; compare.dataset.review = '';
      mode.addEventListener('change', () => { mission = E.create(mission.seed, mode.value); render(); });
      board.addEventListener('keydown', event => {
        const delta = {ArrowUp:-9,ArrowDown:9,ArrowLeft:-1,ArrowRight:1}[event.key];
        if (delta && !mission.finished) { event.preventDefault(); E.plan(mission, selected, mission.rovers[selected].pos + delta); render(); }
      });
      function render() {
        const visible = mission.finished || mission.mode === 'shared' ? E.knowledge(mission) : mission.rovers[selected].known;
        const adjacent = E.neighbors(mission.rovers[selected].pos).filter(n => !mission.rocks.has(n));
        cells.forEach((node, n) => {
          const known = visible.has(n), rover = mission.rovers.findIndex((r,i) => r.pos === n && (mission.finished || mission.mode === 'shared' || i === selected));
          const plan = mission.plans.findIndex((pos,i) => pos === n && (mission.mode === 'shared' || i === selected));
          node.className = 'rover-cell'; node.replaceChildren();
          if (known) node.classList.add('is-known');
          if (known && mission.rocks.has(n)) node.classList.add('is-rock');
          if (known && mission.supplies.includes(n)) node.classList.add(mission.found.has(n) ? 'is-collected' : 'is-supply');
          if (!mission.finished && adjacent.includes(n)) node.classList.add('is-reachable');
          if (plan >= 0) { node.classList.add('has-plan'); node.style.setProperty('--rover-color', E.COLORS[plan]); node.append(el('span', undefined, 'plan-marker')); }
          if (rover >= 0) { node.classList.remove('is-supply','is-collected'); node.style.setProperty('--rover-color', E.COLORS[rover]); node.append(el('span', undefined, 'rover-icon')); if(rover===selected) node.classList.add('is-selected'); }
          const terrain = !known ? 'unknown' : mission.rocks.has(n) ? 'crater' : mission.supplies.includes(n) ? mission.found.has(n) ? 'recovered pod' : 'supply pod' : 'open ground';
          node.setAttribute('aria-label', `Row ${Math.floor(n/9)+1}, column ${n%9+1}: ${terrain}${rover>=0 ? `, ${E.NAMES[rover]}` : ''}${plan>=0 ? ', planned step' : ''}`);
          node.tabIndex = !mission.finished && (rover===selected || adjacent.includes(n)) ? 0 : -1;
        });
        mode.value = mission.mode; mode.disabled = mission.round > 0;
        modeNote.textContent = mission.mode==='shared' ? 'See everyone’s discoveries and planned steps.' : 'See the selected rover’s discoveries and plan. Switch rovers to compare.';
        caption.textContent = `Sector ${mission.seed} · ${mission.mode === 'shared' ? 'Team map' : E.NAMES[selected] + '’s map'}`;
        const result = E.result(mission); [12-mission.round,`${mission.found.size} / 3`,`${result.coverage}%`].forEach((value,i)=>{metric.children[i].querySelector('strong').textContent=value;});
        roverButtons.forEach((node,i)=>node.setAttribute('aria-pressed', String(i===selected)));
        planSummary.textContent = mission.rovers.map((r,i)=>{
          if(mission.mode==='private' && i!==selected) return `${r.name}: private`;
          const step=mission.plans[i], delta=step===null?0:step-r.pos;
          return `${r.name}: ${delta===0?'wait':delta===-9?'↑':delta===9?'↓':delta===1?'→':'←'}`;
        }).join(' · ');
        dirButtons.forEach((node,i)=>{ const delta=directions[i][2]; node.disabled=mission.finished || (delta!==0 && !adjacent.includes(mission.rovers[selected].pos+delta)); });
        move.disabled = mission.finished || mission.plans.every(n=>n===null);
      }
      mapPanel.append(caption,board,el('p','✦ Supply pod · shaded tiles are unknown · highlighted tiles are possible steps','exp-small'));
      controls.append(modeLabel,mode,modeNote,el('p','1. Choose a rover','arena-label'),selector,el('p','2. Plan one step for each rover','arena-label'),pad,planSummary,move,compare);
      wrap.append(mapPanel,controls); g.stage.append(metric,wrap); render();
    },
    'risk-check'(g) {
      const missions = [ {name:'Dawn shuttle',range:[8,28],read:[8,14]}, {name:'Dust crossing',range:[12,32],read:[24,28]}, {name:'Quiet orbit',range:[4,12],read:[5,9]} ];
      if (g.round % 2) missions.reverse();
      let index = 0, evidence = false, approved = 0, held = 0;
      const metric = stats(['Mission', '1 / 3'], ['Launched', '0'], ['Held', '0']);
      const panel = el('div', undefined, 'launch-panel');
      const title = el('h3'); const value = el('strong', '', 'risk-value');
      const track = el('div', undefined, 'risk-track'); const band = el('span'); track.append(band); track.setAttribute('aria-hidden','true');
      const scale = el('div', undefined, 'risk-scale'); scale.append(el('span','0%'),el('span','Limit 20%'),el('span','40%'));
      const options = el('div', undefined, 'launch-options');
      const read = button('Take a reading',()=>{evidence=true;render();g.say('New evidence narrows the range. Compare its upper bound with the limit.');});
      function decide(launch) {
        if(g.done)return;
        const range=evidence?missions[index].read:missions[index].range;
        if(launch && range[1]>20){g.say('The upper bound still exceeds 20%. Take a reading or hold this mission.');return;}
        if(!launch && range[1]<=20){g.say('Holding is cautious, but the full range is within the limit. This toy mission can launch under the stated rule.');return;}
        launch?approved++:held++;
        metric.children[1].querySelector('strong').textContent=approved; metric.children[2].querySelector('strong').textContent=held;
        index++;
        if(index===missions.length){g.finish(`${approved} launched and ${held} held. Every decision followed the stated risk bound. More evidence can justify action, or show why it should wait.`);return;}
        evidence=false;render();g.say('Decision logged. A new mission brings different evidence.');read.focus({preventScroll:true});
      }
      options.append(read,button('Launch →',()=>decide(true)),button('Hold mission',()=>decide(false)));
      function render(){const m=missions[index],range=evidence?m.read:m.range;title.textContent=m.name;value.textContent=`${range[0]}–${range[1]}%`;band.style.left=`${range[0]/40*100}%`;band.style.width=`${(range[1]-range[0])/40*100}%`;read.disabled=evidence;metric.children[0].querySelector('strong').textContent=`${index+1} / 3`;}
      panel.append(el('span','Estimated range of risk','arena-label'),title,value,track,scale);g.stage.append(metric,panel,options);render();
    }
  };
  document.querySelectorAll('[data-mini-game]').forEach(root => {
    const slug=root.dataset.miniGame;if(!games[slug])return;
    const stage=root.querySelector('.mini-stage'),feedback=root.querySelector('.mini-feedback'),complete=root.querySelector('.game-complete');
    let initialized=false,opener=null;
    const g={stage,round:0,done:false,say(text){feedback.textContent=text;},resume(){g.done=false;complete.hidden=true;stage.querySelectorAll('button,input,select').forEach(n=>{n.disabled=false;});},finish(text){g.done=true;g.say(text);complete.hidden=false;stage.querySelectorAll('button,input,select').forEach(n=>{if(!n.hasAttribute('data-review'))n.disabled=true;});complete.tabIndex=-1;complete.focus({preventScroll:true});}};
    function reset(){g.round+=initialized?1:0;initialized=true;g.done=false;feedback.textContent='';complete.hidden=true;stage.replaceChildren();games[slug](g);}
    function open(trigger){opener=trigger;if(!initialized)reset();root.showModal();root.scrollTop=0;}
    document.querySelectorAll(`[data-open-game="${slug}"]`).forEach(node=>node.addEventListener('click',()=>open(node)));
    root.querySelector('.game-close').addEventListener('click',()=>root.close());
    root.addEventListener('close',()=>{if(!document.querySelector('dialog[open]'))opener?.focus({preventScroll:true});});
    root.querySelector('.mini-reset').addEventListener('click',()=>{reset();stage.querySelector('button:not(:disabled),input,select')?.focus({preventScroll:true});});
    root.querySelector('.game-star')?.addEventListener('click',()=>{root.close();window.CosmicStars?.open(opener);});
    if(location.hash===`#demo-${slug}`)open(document.querySelector(`[data-open-game="${slug}"]`));
  });
})();
