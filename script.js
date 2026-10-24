/* ===== EduArcade – script.js ===== */
(function () {
  'use strict';

  /* =========================================================
     1) LEARNING CONTENT – now lives in questions.js
     ========================================================= */
  const BANKS = window.EDU_BANKS;
  if (!BANKS) { console.error('EduArcade: questions.js did not load. Make sure it comes BEFORE script.js.'); return; }

  /* =========================================================
     2) HELPERS
     ========================================================= */
  const root = document.getElementById('eduArcade');
  const $ = (s, el = root) => el.querySelector(s);
  const $$ = (s, el = root) => Array.from(el.querySelectorAll(s));
  const shuffle = arr => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const NS = 'http://www.w3.org/2000/svg';

  /* ---- Sound (generated, no files needed) ---- */
  let soundOn = true, actx = null;
  function audio() { if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === 'suspended') actx.resume(); return actx; }
  function tone(freq, dur = 0.12, type = 'triangle', vol = 0.15) {
    if (!soundOn) return;
    try {
      const c = audio(), o = c.createOscillator(), g = c.createGain();
      o.type = type; o.frequency.value = freq;
      g.gain.setValueAtTime(vol, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
      o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + dur);
    } catch (e) {}
  }
  function noise(dur = 0.2, vol = 0.3) {
    if (!soundOn) return;
    try {
      const c = audio(), len = Math.floor(c.sampleRate * dur), buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
      const s = c.createBufferSource(), g = c.createGain(); s.buffer = buf; g.gain.value = vol;
      s.connect(g); g.connect(c.destination); s.start();
    } catch (e) {}
  }
  const SFX = {
    click: () => tone(620, 0.08),
    flip: () => tone(420, 0.07, 'sine', 0.12),
    good: () => { tone(880, 0.15); setTimeout(() => tone(1320, 0.2), 110); },
    bad: () => tone(150, 0.35, 'sawtooth', 0.1),
    win: () => [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.25), i * 130)),
    shot: () => noise(0.15, 0.35),
    boom: () => { noise(0.5, 0.45); tone(70, 0.4, 'sine', 0.3); }
  };

  /* ---- XP (saved in the browser) ---- */
  let xp = 0;
  try { xp = parseInt(localStorage.getItem('eduArcadeXP'), 10) || 0; } catch (e) {}
  $('#xpTotal').textContent = xp;
  function addXP(n) {
    xp += n;
    try { localStorage.setItem('eduArcadeXP', xp); } catch (e) {}
    const el = $('#xpTotal'); el.textContent = xp;
    const box = el.parentElement; box.classList.remove('bump'); void box.offsetWidth; box.classList.add('bump');
  }

  /* ---- Visual effects ---- */
  function confetti(n = 90) {
    const fx = $('#fx'), cols = ['#f43f5e', '#facc15', '#22c55e', '#3b82f6', '#a855f7', '#fb923c'];
    for (let i = 0; i < n; i++) {
      const s = document.createElement('i');
      s.className = 'confetti';
      s.style.left = Math.random() * 100 + '%';
      s.style.background = cols[i % cols.length];
      s.style.setProperty('--dx', (Math.random() * 200 - 100) + 'px');
      s.style.animationDuration = (2 + Math.random() * 2) + 's';
      s.style.animationDelay = Math.random() * 0.4 + 's';
      fx.appendChild(s);
      setTimeout(() => s.remove(), 4600);
    }
  }
  function popText(x, y, txt, color = '#facc15') {
    const s = document.createElement('div');
    s.className = 'pop-text'; s.textContent = txt; s.style.color = color;
    s.style.left = x + 'px'; s.style.top = y + 'px';
    $('#fx').appendChild(s); setTimeout(() => s.remove(), 1000);
  }
  function popAt(el, txt, color) { const r = el.getBoundingClientRect(); popText(r.left + r.width / 2, r.top + r.height / 2, txt, color); }
  function setStats(items) {
    $('#gameStats').innerHTML = items.map(([icon, label, val]) => `<div class="chip"><span>${icon}</span><small>${label}</small><b>${val}</b></div>`).join('');
  }

  /* ---- Draw items without repeats until a game's whole bank has been used ---- */
  const pools = new Map();
  function drawItems(bank, n) {
    let pool = pools.get(bank) || [];
    const out = [];
    while (out.length < n) {
      if (!pool.length) pool = shuffle(bank).filter(x => !out.includes(x));
      if (!pool.length) break;
      out.push(pool.pop());
    }
    pools.set(bank, pool);
    return out;
  }

  /* ---- Question popup (returns true/false) ---- */
  function ask(title, sub, bank) {
    return new Promise(resolve => {
      const it = drawItems(bank, 1)[0], m = $('#qModal'), opts = $('#qOpts'), fact = $('#qFact'), btn = $('#qContinue'), card = $('#qCard');
      $('#qTitle').textContent = title || 'Brain Check!';
      $('#qSub').textContent = sub || '';
      $('#qText').textContent = it.q;
      opts.innerHTML = ''; fact.className = 'q-fact'; fact.textContent = ''; btn.style.display = 'none';
      let correct = false;
      const answers = shuffle(it.a.map((t, i) => ({ t, ok: i === it.c })));
      answers.forEach((ans, i) => {
        const b = document.createElement('button');
        b.className = 'q-opt'; b.style.animationDelay = (150 + i * 70) + 'ms';
        const letter = document.createElement('span'); letter.className = 'q-letter'; letter.textContent = 'ABCD'[i] || '•';
        b.append(letter, document.createTextNode(ans.t));
        b.addEventListener('click', () => {

          $$('.q-opt', opts).forEach((x, j) => { x.disabled = true; if (answers[j].ok) x.classList.add('right'); });
          correct = ans.ok;
          if (correct) { SFX.good(); fact.textContent = '✅ Correct! ' + it.fact; }
          else {
            b.classList.add('wrong'); SFX.bad();
            card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake');
            fact.textContent = '💡 Did you know? ' + it.fact;
          }
          fact.classList.add('show'); btn.style.display = 'inline-block';
        });
        opts.appendChild(b);
      });
      btn.onclick = () => { m.classList.remove('open'); card.classList.remove('shake'); resolve(correct); };
      m.classList.add('open');
    });
  }

  /* ---- Message popup ---- */
  function showMsg(icon, title, text, btnText) {
    return new Promise(res => {
      const m = $('#msgModal');
      $('#msgIcon').textContent = icon; $('#msgTitle').textContent = title; $('#msgText').textContent = text;
      const b = $('#msgBtn'); b.textContent = btnText || 'Continue';
      b.onclick = () => { m.classList.remove('open'); res(); };
      m.classList.add('open');
    });
  }

  /* =========================================================
     GAME 1 – BOLT BRAIN
     ========================================================= */
  function startBolts(stage, token) {
    stage.innerHTML = `
      <div class="bolt-wrap">
        <div class="progress"><i id="boltBar"></i></div>
        <div class="bolt-board"><div class="gears"><span>⚙️</span><span>⚙️</span></div><div class="plank" id="plank"></div></div>
        <p class="hint">Click a bolt to unscrew it. Every 2 bolts = 1 question. Wrong answers cost a life.</p>
      </div>`;
    let level = 1, score = 0, lives = 3, removed = 0, total = 0, locked = true;
    const SLOTS = [[8,14],[50,12],[92,14],[8,86],[50,88],[92,86],[29,50],[71,50],[8,50],[92,50],[29,14],[71,86]];
    const hud = () => {
      setStats([['🏁', 'Level', level], ['⭐', 'Score', score], ['', 'Lives', '❤️'.repeat(lives) + '🖤'.repeat(3 - lives)]]);
      $('#boltBar').style.width = (total ? removed / total * 100 : 0) + '%';
    };
    function build() {
      const p = $('#plank'); p.className = 'plank'; void p.offsetWidth; p.classList.add('drop'); p.innerHTML = '';
      total = Math.min(2 + level * 2, 12); removed = 0;
      shuffle(SLOTS).slice(0, total).forEach((s, i) => {
        const b = document.createElement('button');
        b.className = 'bolt' + (Math.random() < 0.3 ? ' brass' : '');
        b.setAttribute('aria-label', 'Unscrew bolt');
        b.style.left = s[0] + '%'; b.style.top = s[1] + '%';
        b.style.animationDelay = (350 + i * 80) + 'ms';
        b.innerHTML = '<span class="bolt-head"></span>';
        b.addEventListener('click', () => unscrew(b));
        p.appendChild(b);
      });
      hud(); locked = false;
    }
    async function unscrew(b) {
      if (locked || b.classList.contains('out')) return;
      const hole = document.createElement('span'); hole.className = 'hole';
      hole.style.left = b.style.left; hole.style.top = b.style.top; b.parentNode.insertBefore(hole, b);
      b.style.animationDelay = '0ms'; b.classList.add('out');
      SFX.click(); setTimeout(() => tone(900, 0.08), 300);
      removed++; hud();
      const needQ = removed % 2 === 0, finished = removed === total;
      if (needQ || finished) locked = true;
      await sleep(800); if (token !== session) return;
      b.remove();
      if (needQ) {
        const ok = await ask('🔩 Brain Check!', 'Correct = +10 points  •  Wrong = −1 life', BANKS.bolts);
        if (token !== session) return;
        if (ok) { score += 10; addXP(10); } else lives--;
        hud();
        if (lives <= 0) {
          SFX.boom();
          await showMsg('💥', 'Game Over', `You reached level ${level} with ${score} points. Keep learning and try again!`, 'Play Again');
          if (token !== session) return;
          level = 1; score = 0; lives = 3; build(); return;
        }
      }
      if (finished) levelDone(); else locked = false;
    }
    async function levelDone() {
      $('#plank').classList.add('fall'); SFX.win(); confetti();
      const bonus = level * 20; score += bonus; addXP(bonus); hud();
      await sleep(1100); if (token !== session) return;
      await showMsg('🏆', `Level ${level} Complete!`, `Bonus +${bonus} points. More bolts are coming!`, 'Next Level ➜');
      if (token !== session) return;
      level++; build();
    }
    hud();
    showMsg('🔩', 'Bolt Brain', 'Unscrew all the bolts to drop the plank. Every 2 bolts, answer a question. You have 3 lives!', 'Start Game')
      .then(() => { if (token === session) build(); });
    return { stop() {} };
  }

  /* =========================================================
     GAME 2 – OPERATION: KNOWLEDGE (shooter)
     ========================================================= */
  function startShooter(stage, token) {
    stage.innerHTML = `
      <div class="shoot-wrap">
        <canvas id="shootCanvas" width="900" height="500"></canvas>
        <div class="ammo-bar" id="ammoBar"></div>
        <div class="shoot-flash" id="shootFlash"></div>
      </div>
      <p class="hint">Aim and click (or tap) to shoot the drones. Out of ammo? Answer a question to resupply. Gold drones = 25 pts!</p>`;
    const cv = $('#shootCanvas'), ctx = cv.getContext('2d'), W = 900, H = 500;
    let ammo = 3, score = 0, shield = 5, wave = 1, kills = 0;
    let paused = true, over = false, asking = false, running = true;
    let drones = [], parts = [], texts = [], tracers = [], rings = [];
    let spawnT = 1, last = performance.now(), shake = 0, recoil = 0, flashT = 0;
    const mouse = { x: W / 2, y: H / 2 };
    const stars = Array.from({ length: 70 }, () => ({ x: Math.random() * W, y: Math.random() * H * 0.6, r: Math.random() * 1.5 + 0.3, t: Math.random() * 6 }));

    function hud() {
      setStats([['🎯', 'Score', score], ['🌊', 'Wave', wave], ['🛡️', 'Base', shield]]);
      const bar = $('#ammoBar');
      if (!ammo) { bar.innerHTML = '<em>OUT OF AMMO</em>'; return; }
      bar.innerHTML = Array.from({ length: Math.min(ammo, 15) }, (_, i) => `<span class="bullet" style="animation-delay:${i * 40}ms"></span>`).join('') + (ammo > 15 ? `<b>+${ammo - 15}</b>` : '');
    }
    function flashRed() { const f = $('#shootFlash'); f.classList.remove('hit'); void f.offsetWidth; f.classList.add('hit'); }
    function spawn() {
      const dir = Math.random() < 0.5 ? 1 : -1, y = 60 + Math.random() * (H * 0.5);
      const gold = Math.random() < 0.18;
      drones.push({ x: dir > 0 ? -40 : W + 40, y, baseY: y, vx: (60 + Math.random() * 50) * (1 + wave * 0.12) * dir * (gold ? 1.3 : 1), r: gold ? 22 : 24 + Math.random() * 8, t: Math.random() * 6, gold });
    }
    function explode(x, y, c) {
      for (let i = 0; i < 30; i++) {
        const a = Math.random() * Math.PI * 2, sp = 80 + Math.random() * 260;
        parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60, life: 0.5 + Math.random() * 0.6, max: 1.1, r: 2 + Math.random() * 4, c: Math.random() < 0.5 ? c : '#fef08a' });
      }
      rings.push({ x, y, r: 6, life: 0.4 });
    }
    function update(dt) {
      spawnT -= dt;
      if (spawnT <= 0) { spawn(); spawnT = Math.max(0.6, 2.2 - wave * 0.18) * (0.7 + Math.random() * 0.6); }
      drones.forEach(d => { d.t += dt; d.x += d.vx * dt; d.y = d.baseY + Math.sin(d.t * 2) * 18; });
      drones = drones.filter(d => {
        if ((d.vx > 0 && d.x > W + 50) || (d.vx < 0 && d.x < -50)) {
          shield--; shake = 14; SFX.bad(); flashRed();
          texts.push({ x: d.vx > 0 ? W - 80 : 80, y: d.y, txt: 'BASE HIT!', life: 1, color: '#f87171' });
          hud(); return false;
        }
        return true;
      });
      if (shield <= 0 && !over) gameOver();
      if (kills >= 6 + wave * 2) {
        wave++; kills = 0; SFX.win(); hud();
        texts.push({ x: W / 2, y: H / 2, txt: 'WAVE ' + wave, life: 1.6, big: true, color: '#facc15' });
      }
    }
    function animateFx(dt) {
      parts.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt; p.life -= dt; });
      parts = parts.filter(p => p.life > 0);
      texts.forEach(t => { t.y -= 40 * dt; t.life -= dt; }); texts = texts.filter(t => t.life > 0);
      tracers.forEach(t => t.life -= dt); tracers = tracers.filter(t => t.life > 0);
      rings.forEach(r => { r.r += 260 * dt; r.life -= dt; }); rings = rings.filter(r => r.life > 0);
      shake *= 0.88; recoil *= 0.85; flashT = Math.max(0, flashT - dt);
    }
    function drawDrone(d) {
      ctx.save(); ctx.translate(d.x, d.y); ctx.rotate(Math.sign(d.vx) * 0.12);
      const s = d.r / 26; ctx.scale(s, s);
      ctx.strokeStyle = '#475569'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(-30, -6); ctx.lineTo(30, -6); ctx.stroke();
      const rw = Math.abs(Math.sin(d.t * 40)) * 18 + 4;
      ctx.fillStyle = 'rgba(203,213,225,.6)';
      [-30, 30].forEach(x => { ctx.beginPath(); ctx.ellipse(x, -10, rw, 3, 0, 0, Math.PI * 2); ctx.fill(); });
      ctx.fillStyle = d.gold ? '#f59e0b' : '#64748b';
      ctx.beginPath(); ctx.ellipse(0, 0, 20, 12, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = d.gold ? '#fde047' : '#ef4444'; ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 14;
      ctx.beginPath(); ctx.arc(0, 2, 5, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    function draw(now) {
      ctx.save();
      if (shake > 0.5) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#0b1026'); g.addColorStop(0.6, '#1e1b4b'); g.addColorStop(1, '#3b0764');
      ctx.fillStyle = g; ctx.fillRect(-20, -20, W + 40, H + 40);
      stars.forEach(s => { ctx.globalAlpha = 0.3 + 0.7 * Math.abs(Math.sin(now / 1000 + s.t)); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill(); });
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#fef3c7'; ctx.shadowColor = '#fef3c7'; ctx.shadowBlur = 35;
      ctx.beginPath(); ctx.arc(790, 80, 30, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
      ctx.fillStyle = '#111827'; ctx.beginPath(); ctx.moveTo(0, H);
      for (let x = 0; x <= W; x += 30) ctx.lineTo(x, H - 90 - Math.sin(x / 90) * 25 - Math.sin(x / 37) * 10);
      ctx.lineTo(W, H); ctx.fill();
      drones.forEach(drawDrone);
      tracers.forEach(t => { ctx.strokeStyle = `rgba(253,224,71,${t.life / 0.08})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(t.x1, t.y1); ctx.lineTo(t.x2, t.y2); ctx.stroke(); });
      rings.forEach(r => { ctx.strokeStyle = `rgba(255,255,255,${r.life / 0.4})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2); ctx.stroke(); });
      parts.forEach(p => { ctx.globalAlpha = Math.max(0, p.life / p.max); ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill(); });
      ctx.globalAlpha = 1;
      // Turret
      const bx = W / 2, by = H - 8, ang = Math.atan2(mouse.y - by, mouse.x - bx);
      ctx.save(); ctx.translate(bx, by); ctx.rotate(ang);
      ctx.fillStyle = '#334155'; ctx.fillRect(10 - recoil, -7, 60, 14);
      ctx.fillStyle = '#1e293b'; ctx.fillRect(56 - recoil, -9, 14, 18);
      if (flashT > 0) { ctx.fillStyle = '#fde047'; ctx.shadowColor = '#facc15'; ctx.shadowBlur = 25; ctx.beginPath(); ctx.moveTo(70, 0); ctx.lineTo(102, -13); ctx.lineTo(94, 0); ctx.lineTo(102, 13); ctx.fill(); }
      ctx.restore();
      ctx.fillStyle = '#475569'; ctx.beginPath(); ctx.arc(bx, by + 4, 34, Math.PI, 0); ctx.fill();
      texts.forEach(t => { ctx.globalAlpha = Math.max(0, Math.min(1, t.life)); ctx.fillStyle = t.color; ctx.font = (t.big ? '700 46px' : '700 22px') + ' Fredoka, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(t.txt, t.x, t.y); });
      ctx.globalAlpha = 1;
      ctx.restore();
      // Crosshair
      ctx.save(); ctx.translate(mouse.x, mouse.y);
      ctx.strokeStyle = ammo ? '#22d3ee' : '#ef4444'; ctx.lineWidth = 2; ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = 10;
      const r = 18 + recoil;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
      [[0, -1], [0, 1], [1, 0], [-1, 0]].forEach(([a, b]) => { ctx.beginPath(); ctx.moveTo(a * (r - 6), b * (r - 6)); ctx.lineTo(a * (r + 8), b * (r + 8)); ctx.stroke(); });
      ctx.fillStyle = ctx.strokeStyle; ctx.beginPath(); ctx.arc(0, 0, 2, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    function shoot() {
      if (paused || over) return;
      if (ammo <= 0) { resupply(); return; }
      ammo--; recoil = 10; flashT = 0.08; shake = Math.max(shake, 4); SFX.shot();
      const bx = W / 2, by = H - 8, ang = Math.atan2(mouse.y - by, mouse.x - bx);
      tracers.push({ x1: bx + Math.cos(ang) * 95, y1: by + Math.sin(ang) * 95, x2: mouse.x, y2: mouse.y, life: 0.08 });
      let hit = -1;
      for (let i = drones.length - 1; i >= 0; i--) { const d = drones[i]; if (Math.hypot(d.x - mouse.x, d.y - mouse.y) < d.r + 8) { hit = i; break; } }
      if (hit >= 0) {
        const d = drones.splice(hit, 1)[0], pts = d.gold ? 25 : 10;
        score += pts; kills++; addXP(d.gold ? 5 : 2); shake = 12;
        explode(d.x, d.y, d.gold ? '#facc15' : '#f97316'); SFX.boom();
        texts.push({ x: d.x, y: d.y, txt: '+' + pts, life: 1, color: d.gold ? '#facc15' : '#4ade80' });
      }
      hud();
      if (ammo <= 0) setTimeout(() => { if (token === session && !over) resupply(); }, 450);
    }
    async function resupply() {
      if (asking || over) return;
      asking = true; paused = true;
      const ok = await ask('🎯 Ammo Resupply', 'Correct = +3 bullets  •  Wrong = +1 bullet', BANKS.shooter);
      if (token !== session) return;
      ammo += ok ? 3 : 1; if (ok) addXP(10);
      asking = false; paused = false; last = performance.now(); hud();
    }
    async function gameOver() {
      over = true; paused = true; SFX.boom();
      await showMsg('💥', 'Base Destroyed', `You scored ${score} points and reached wave ${wave}. Answer more questions to keep your ammo up!`, 'Play Again');
      if (token !== session) return;
      ammo = 3; score = 0; shield = 5; wave = 1; kills = 0; drones = []; parts = []; texts = [];
      over = false; paused = false; last = performance.now(); hud();
    }
    function pos(e) { const r = cv.getBoundingClientRect(); mouse.x = (e.clientX - r.left) * W / r.width; mouse.y = (e.clientY - r.top) * H / r.height; }
    cv.addEventListener('pointermove', pos);
    cv.addEventListener('pointerdown', e => { e.preventDefault(); pos(e); shoot(); });
    function loop(now) {
      if (!running) return;
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (!paused) update(dt);
      animateFx(dt); draw(now);
      requestAnimationFrame(loop);
    }
    hud(); requestAnimationFrame(loop);
    showMsg('🎯', 'Operation: Knowledge', 'Defend your base from drones. You start with only 3 bullets, so make every shot count! Answer questions to earn more ammo.', 'Start Mission')
      .then(() => { if (token === session) { paused = false; last = performance.now(); } });
    return { stop() { running = false; } };
  }

  /* =========================================================
     GAME 3 – CONNECT IT (draw lines)
     ========================================================= */
  function startMatch(stage, token) {
    let score = 0, done = 0, set = [];
    const hud = () => setStats([['🔗', 'Matched', `${done}/${set.length}`], ['⭐', 'Score', score]]);
    const center = (el, side) => {
      const b = $('#mb').getBoundingClientRect(), r = el.getBoundingClientRect();
      return { x: (side === 'l' ? r.right : r.left) - b.left, y: r.top + r.height / 2 - b.top };
    };
    const curve = (a, b) => { const mx = (a.x + b.x) / 2; return `M${a.x},${a.y} C${mx},${a.y} ${mx},${b.y} ${b.x},${b.y}`; };

    function build() {
      set = drawItems(BANKS.match, 5); done = 0;
      const rights = shuffle(set);
      stage.innerHTML = `
        <div class="match-board" id="mb">
          <svg id="msvg"></svg>
          <div class="match-col">${set.map((p, i) => `<div class="m-item l" data-k="${p.term}" style="animation-delay:${i * 70}ms"><span class="m-ic">${p.icon}</span><span class="m-txt">${p.term}</span><span class="dot"></span></div>`).join('')}</div>
          <div class="match-col">${rights.map((p, i) => `<div class="m-item r" data-k="${p.term}" style="animation-delay:${i * 70}ms"><span class="dot"></span><span class="m-txt">${p.def}</span></div>`).join('')}</div>
        </div>
        <p class="hint">Drag a line from each word to its meaning (or tap a word, then tap its meaning).</p>`;
      hud(); bind();
    }

    function bind() {
      const board = $('#mb'), svg = $('#msvg');
      let sel = null, temp = null;
      const clearTemp = () => { if (temp) { temp.remove(); temp = null; } };
      const clearSel = () => { if (sel) sel.classList.remove('sel'); sel = null; clearTemp(); };
      const move = e => {
        if (!temp || !sel) return;
        const b = board.getBoundingClientRect();
        temp.setAttribute('d', curve(center(sel, 'l'), { x: e.clientX - b.left, y: e.clientY - b.top }));
      };


      $$('.m-item.l', board).forEach(el => el.addEventListener('pointerdown', e => {
        if (el.classList.contains('done')) return;
        e.preventDefault(); clearSel();
        sel = el; el.classList.add('sel'); SFX.flip();
        try { el.setPointerCapture(e.pointerId); } catch (err) {}
        temp = document.createElementNS(NS, 'path'); temp.setAttribute('class', 'temp'); svg.appendChild(temp);
        move(e);
      }));
      board.addEventListener('pointermove', e => {
        move(e);

        $$('.m-item.r', board).forEach(x => x.classList.remove('hover'));
        const t = document.elementFromPoint(e.clientX, e.clientY), r = t && t.closest('.m-item.r');
        if (r && sel && !r.classList.contains('done')) r.classList.add('hover');
      });
      board.addEventListener('pointerup', e => {
        if (!sel) return;

        $$('.m-item.r', board).forEach(x => x.classList.remove('hover'));
        const t = document.elementFromPoint(e.clientX, e.clientY), r = t && t.closest('.m-item.r');
        if (r && board.contains(r) && !r.classList.contains('done')) tryMatch(r); else clearTemp();
      });

      async function tryMatch(r) {
        const l = sel, ok = r.dataset.k === l.dataset.k;
        clearSel();
        const p = document.createElementNS(NS, 'path');
        p.setAttribute('d', curve(center(l, 'l'), center(r, 'r')));
        p.setAttribute('class', ok ? 'good' : 'bad');
        svg.appendChild(p);
        if (ok) {
          l.classList.add('done'); r.classList.add('done');
          score += 10; done++; addXP(5); SFX.good(); popAt(r, '+10', '#4ade80'); hud();
          if (done === set.length) {
            SFX.win(); confetti();
            await sleep(700); if (token !== session) return;
            await showMsg('🔗', 'All Connected!', 'Great job! You matched every word to its meaning.', 'Next Round ➜');
            if (token !== session) return;
            build();
          }
        } else {
          SFX.bad(); score = Math.max(0, score - 2); hud();
          [l, r].forEach(x => { x.classList.remove('shake'); void x.offsetWidth; x.classList.add('shake'); });
          setTimeout(() => { p.remove(); l.classList.remove('shake'); r.classList.remove('shake'); }, 650);
        }
      }
    }
    build();
    return { stop() {} };
  }

  /* =========================================================
     GAME 4 – FLASH CARDS
     ========================================================= */
  function startFlash(stage, token) {
    const total = BANKS.flash.length;
    let deck = shuffle(BANKS.flash), known = 0, review = 0, busy = false;
    stage.innerHTML = `
      <div class="flash-wrap">
        <div class="progress"><i id="fBar"></i></div>
        <div class="flash-scene"><div class="flash-move" id="fMove">
          <div class="flash-card" id="fCard">
            <div class="face front"><span class="f-ic" id="fIc"></span><h3 id="fTerm"></h3><small>Tap to flip</small></div>
            <div class="face back"><small>Meaning</small><p id="fDef"></p></div>
          </div>
        </div></div>
        <div class="flash-actions">
          <button class="btn bad" id="fAgain">↺ Study Again</button>
          <button class="btn ghost" id="fFlip">Flip</button>
          <button class="btn good" id="fKnow">✓ I Know It</button>
        </div>
      </div>`;
    const hud = () => { setStats([['✅', 'Known', `${known}/${total}`], ['🔁', 'Reviews', review]]); $('#fBar').style.width = known / total * 100 + '%'; };
    function show() {
      const c = deck[0], card = $('#fCard'), m = $('#fMove');
      card.style.transition = 'none'; card.classList.remove('flipped'); void card.offsetWidth; card.style.transition = '';
      $('#fIc').textContent = c.icon; $('#fTerm').textContent = c.term; $('#fDef').textContent = c.def;
      m.className = 'flash-move'; void m.offsetWidth; m.classList.add('enter');
      hud();
    }
    const flip = () => { if (!busy) { $('#fCard').classList.toggle('flipped'); SFX.flip(); } };
    async function next(knew) {
      if (busy) return; busy = true;
      $('#fMove').className = 'flash-move ' + (knew ? 'fly-right' : 'fly-left');
      const c = deck.shift();
      if (knew) { known++; addXP(3); SFX.good(); popAt($('#fKnow'), '+3 XP', '#4ade80'); }
      else { review++; deck.push(c); SFX.flip(); }
      await sleep(420); if (token !== session) return;
      busy = false;
      if (!deck.length) {
        hud(); SFX.win(); confetti();
        await showMsg('🎓', 'Deck Mastered!', `You learned all ${total} cards with ${review} extra reviews.`, 'Study Again');
        if (token !== session) return;
        deck = shuffle(BANKS.flash); known = 0; review = 0;
      }
      show();
    }
    $('#fCard').addEventListener('click', flip);
    $('#fFlip').addEventListener('click', flip);
    $('#fKnow').addEventListener('click', () => next(true));
    $('#fAgain').addEventListener('click', () => next(false));
    show();
    return { stop() {} };
  }

  /* =========================================================
     GAME 5 – MEMORY MATCH
     ========================================================= */
  function startMemory(stage, token) {
    let moves = 0, found = 0, first = null, lock = false, set = [];
    const hud = () => setStats([['🧩', 'Pairs', `${found}/${set.length}`], ['👆', 'Moves', moves]]);
    function build() {
      set = drawItems(BANKS.memory, 6); moves = 0; found = 0; first = null; lock = false;
      const cards = shuffle(set.flatMap(p => [
        { k: p.term, type: 'term', txt: p.term, ic: p.icon },
        { k: p.term, type: 'def', txt: p.def, ic: '' }
      ]));
      stage.innerHTML = `
        <div class="mem-grid">${cards.map((c, i) => `
          <button class="mem-card" data-k="${c.k}" style="animation-delay:${i * 50}ms">
            <span class="mem-inner">
              <span class="mem-face mem-back">?</span>
              <span class="mem-face mem-front ${c.type}">${c.ic ? `<span class="mi">${c.ic}</span>` : ''}<span class="mt">${c.txt}</span></span>
            </span>
          </button>`).join('')}
        </div>
        <p class="hint">Flip two cards at a time. Match each word with its meaning.</p>`;

      $$('.mem-card', stage).forEach(b => b.addEventListener('click', () => flip(b)));
      hud();
    }
    async function flip(b) {
      if (lock || b === first || b.classList.contains('flipped')) return;
      b.classList.add('flipped'); SFX.flip();
      if (!first) { first = b; return; }
      moves++; hud();
      const a = first; first = null;
      if (a.dataset.k === b.dataset.k) {
        await sleep(450); if (token !== session) return;
        a.classList.add('matched'); b.classList.add('matched');
        found++; addXP(5); SFX.good(); popAt(b, '+5 XP', '#4ade80'); hud();
        if (found === set.length) {
          SFX.win(); confetti();
          await sleep(800); if (token !== session) return;
          await showMsg('🧠', 'Memory Master!', `You found all ${set.length} pairs in ${moves} moves.`, 'Play Again');
          if (token !== session) return;
          build();
        }
      } else {
        lock = true;
        await sleep(900); if (token !== session) return;
        a.classList.add('nope'); b.classList.add('nope'); SFX.bad();
        await sleep(450); if (token !== session) return;
        a.classList.remove('flipped', 'nope'); b.classList.remove('flipped', 'nope');
        lock = false;
      }
    }
    build();
    return { stop() {} };
  }

  /* =========================================================
     3) MENU / NAVIGATION
     ========================================================= */
  let session = 0, current = null;
  const GAMES = {
    bolts: ['🔩 Bolt Brain', startBolts],
    shooter: ['🎯 Operation: Knowledge', startShooter],
    match: ['🔗 Connect It', startMatch],
    flash: ['📚 Flash Cards', startFlash],
    memory: ['🧠 Memory Match', startMemory]
  };
  function stopCurrent() {
    session++;
    if (current && current.stop) current.stop();
    current = null;

    $$('.overlay').forEach(o => o.classList.remove('open'));
  }
  function openGame(id) {
    const g = GAMES[id]; if (!g) return;
    stopCurrent(); SFX.click();
    $('#hub').classList.remove('active');
    $('#gameScreen').classList.add('active');
    $('#gameTitle').textContent = g[0];
    $('#gameStats').innerHTML = '';
    current = g[1]($('#stage'), session);
    root.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function goHome() {
    stopCurrent(); SFX.click();
    $('#stage').innerHTML = '';
    $('#gameScreen').classList.remove('active');
    $('#hub').classList.add('active');
  }


  $$('.game-card').forEach(c => c.addEventListener('click', () => openGame(c.dataset.game)));
  $('#backBtn').addEventListener('click', goHome);
  $('#soundBtn').addEventListener('click', () => {
    soundOn = !soundOn;
    $('#soundBtn').textContent = soundOn ? '🔊' : '🔇';
    if (soundOn) SFX.click();
  });
})();
