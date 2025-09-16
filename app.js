/** ---------- Constants & State ---------- **/
const TOTAL_DEPLOYMENT = 6462500;
const MAX_PLAYERS = 8;
let playerCount = 0;

const els = {
  totalDeploymentText: document.getElementById('totalDeploymentText'),
  initArmy: document.getElementById('initArmy'),
  initMarines: document.getElementById('initMarines'),
  initAirforce: document.getElementById('initAirforce'),
  initStatus: document.getElementById('initStatus'),
  playersContainer: document.getElementById('playersContainer'),
  addBtn: document.getElementById('addBtn'),
  removeBtn: document.getElementById('removeBtn'),
  result: document.getElementById('result'),
  neededResult: document.getElementById('neededResult'),
  neededTooltip: document.getElementById('neededTooltip'),
  currentTotal: document.getElementById('currentTotal'),
  bars: {
    armyOrig: document.getElementById('barArmyOrig'),
    armyNew: document.getElementById('barArmyNew'),
    marinesOrig: document.getElementById('barMarinesOrig'),
    marinesNew: document.getElementById('barMarinesNew'),
    airforceOrig: document.getElementById('barAirforceOrig'),
    airforceNew: document.getElementById('barAirforceNew'),
  }
};
els.totalDeploymentText.textContent = TOTAL_DEPLOYMENT.toLocaleString();

/** ---------- Utils ---------- **/
const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
function num(v, d=0){ const n = Number(String(v).trim()); return Number.isFinite(n) ? n : d; }

// Security: Input sanitization
function sanitizeInput(input) {
  if (typeof input !== 'string') return '';
  return input.replace(/[<>\"'&]/g, function(match) {
    const escape = {
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '&': '&amp;'
    };
    return escape[match];
  });
}

// Security: Safe text content setting
function setTextContent(element, text) {
  if (element && typeof text === 'string') {
    element.textContent = text;
  }
}

// Security: Safe HTML setting with sanitization
function setInnerHTML(element, html) {
  if (element && typeof html === 'string') {
    // Only allow safe HTML patterns for our specific use case
    const safePattern = /^<div><span class="troop-label (army|marines|airforce)"><\/span> [\d.]+%<\/div>$/;
    if (safePattern.test(html.trim())) {
      element.innerHTML = html;
    } else {
      element.textContent = html.replace(/<[^>]*>/g, '');
    }
  }
}

/* Normalize three percentages to sum exactly 100 using largest remainder */
function normalizeTriple(a, m, f){
  a = clamp(Math.trunc(num(a)), 0, 100);
  m = clamp(Math.trunc(num(m)), 0, 100);
  f = clamp(Math.trunc(num(f)), 0, 100);
  const sum = a + m + f;
  if (sum === 100) return { a, m, f, normalized:false };
  if (sum === 0) return { a:34, m:33, f:33, normalized:true }; // sensible default
  // scale to 100
  const scale = 100 / sum;
  const aa = Math.floor(a * scale);
  const mm = Math.floor(m * scale);
  const ff = Math.floor(f * scale);
  let assigned = aa + mm + ff;
  let parts = [
    {k:'a', frac: a*scale - aa, v: aa},
    {k:'m', frac: m*scale - mm, v: mm},
    {k:'f', frac: f*scale - ff, v: ff}
  ].sort((x,y)=> y.frac - x.frac);
  while (assigned < 100) { parts[0].v++; assigned++; parts.sort((x,y)=> y.frac - x.frac); }
  const out = { a: parts.find(p=>p.k==='a').v, m: parts.find(p=>p.k==='m').v, f: parts.find(p=>p.k==='f').v, normalized:true };
  return out;
}

/* Allocate integer counts from total by percentages exactly (largest remainder) */
function allocateCounts(total, aPct, mPct, fPct){
  const aExact = total * aPct / 100;
  const mExact = total * mPct / 100;
  const fExact = total * fPct / 100;

  const aFloor = Math.floor(aExact);
  const mFloor = Math.floor(mExact);
  const fFloor = Math.floor(fExact);

  let assigned = aFloor + mFloor + fFloor;
  let remainder = total - assigned;

  const items = [
    { key:'a', floor:aFloor, frac:aExact - aFloor },
    { key:'m', floor:mFloor, frac:mExact - mFloor },
    { key:'f', floor:fFloor, frac:fExact - fFloor },
  ].sort((x,y)=> y.frac - x.frac);

  for(let i=0; i<items.length && remainder>0; i++, remainder--){
    items[i].floor += 1;
  }
  return {
    a: items.find(x=>x.key==='a').floor,
    m: items.find(x=>x.key==='m').floor,
    f: items.find(x=>x.key==='f').floor,
  };
}

/* Clipboard with fallback */
async function writeClipboard(text){
  try{
    await navigator.clipboard.writeText(text);
    return true;
  }catch(e){
    const ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly','');
    ta.style.position='fixed'; ta.style.left='-9999px';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  }
}

/** ---------- Players UI ---------- **/
function playerTemplate(i){
  const sanitizedI = sanitizeInput(String(i));
  return `
  <div class="player" id="player${sanitizedI}">
    <div class="flex-row" style="justify-content:space-between; gap:6px;">
      <strong>Player ${sanitizedI}</strong>
      <button class="secondary remove-player-btn" type="button" data-player-id="${sanitizedI}">Remove</button>
    </div>
    <div class="flex-row" style="margin-top:6px;">
      <input type="text" class="name-input" id="name${sanitizedI}" placeholder="Player Name" maxlength="50" />
      <label>Current Deployment:</label><input type="number" id="size${sanitizedI}" value="500000" min="0" max="10000000" inputmode="numeric" />
      <span class="troop-label army">Army</span><input type="number" id="army${sanitizedI}" value="50" min="0" max="100" inputmode="numeric" />
      <span class="troop-label marines">Marines</span><input type="number" id="marines${sanitizedI}" value="0" min="0" max="100" inputmode="numeric" />
      <span class="troop-label airforce">Air Force</span><input type="number" id="airforce${sanitizedI}" value="50" min="0" max="100" inputmode="numeric" />
    </div>
    <div class="troop-count" id="count${sanitizedI}" aria-live="polite"></div>
    <div style="position:relative; display:inline-block;">
      <button type="button" class="copy-player-btn" data-player-id="${sanitizedI}">Copy</button>
      <span id="tooltip${sanitizedI}" class="tooltip">Copied!</span>
    </div>
  </div>`;
}

function addPlayer(){
  if (playerCount >= MAX_PLAYERS) return;
  playerCount++;
  els.playersContainer.insertAdjacentHTML('beforeend', playerTemplate(playerCount));
  els.removeBtn.disabled = (playerCount === 0);
  els.addBtn.disabled = (playerCount >= MAX_PLAYERS);
}

function removePlayer(i){
  const el = document.getElementById('player'+i);
  if (el) el.remove();
  // don't renumber; just decrement count for add limit/UX.
  playerCount = Math.max(0, document.querySelectorAll('.player').length);
  els.removeBtn.disabled = (playerCount === 0);
  els.addBtn.disabled = (playerCount >= MAX_PLAYERS);
}

function removeLastPlayer(){
  const all = document.querySelectorAll('.player');
  if (all.length === 0) return;
  all[all.length - 1].remove();
  playerCount = Math.max(0, document.querySelectorAll('.player').length);
  els.removeBtn.disabled = (playerCount === 0);
  els.addBtn.disabled = (playerCount >= MAX_PLAYERS);
}

/** ---------- Core Calculations ---------- **/
function readInitNormalized(){
  const init = normalizeTriple(els.initArmy.value, els.initMarines.value, els.initAirforce.value);
  els.initArmy.value = init.a;
  els.initMarines.value = init.m;
  els.initAirforce.value = init.f;
  // show status pill if normalized
  els.initStatus.style.display = init.normalized ? 'inline-block' : 'none';
  return init;
}

function calculate(){
  const init = readInitNormalized(); // ensures 100%
  let armyTotal   = TOTAL_DEPLOYMENT * (init.a / 100);
  let marinesTotal= TOTAL_DEPLOYMENT * (init.m / 100);
  let airforceTotal=TOTAL_DEPLOYMENT * (init.f / 100);

  // apply player swaps
  const players = document.querySelectorAll('.player');
  players.forEach(p=>{
    const i = p.id.replace('player','');
    const size = clamp(Math.trunc(num(document.getElementById('size'+i).value, 0)), 0, TOTAL_DEPLOYMENT);
    const pcts = normalizeTriple(
      document.getElementById('army'+i).value,
      document.getElementById('marines'+i).value,
      document.getElementById('airforce'+i).value
    );
    // reflect normalized pct back into inputs
    document.getElementById('army'+i).value = pcts.a;
    document.getElementById('marines'+i).value = pcts.m;
    document.getElementById('airforce'+i).value = pcts.f;

    // counts exactly sum to size
    const alloc = allocateCounts(size, pcts.a, pcts.m, pcts.f);

    // Show troop counts per player
    document.getElementById('count'+i).textContent =
      `Troops to send: Army ${alloc.a.toLocaleString()}, Marines ${alloc.m.toLocaleString()}, Air Force ${alloc.f.toLocaleString()}`;

    // Remove player's original contribution (based on initial ratios) …
    armyTotal    -= size * (init.a / 100);
    marinesTotal -= size * (init.m / 100);
    airforceTotal-= size * (init.f / 100);
    // …and add their new allocation
    armyTotal    += alloc.a;
    marinesTotal += alloc.m;
    airforceTotal+= alloc.f;
  });

  const armyPct     = (armyTotal / TOTAL_DEPLOYMENT) * 100;
  const marinesPct  = (marinesTotal / TOTAL_DEPLOYMENT) * 100;
  const airforcePct = (airforceTotal / TOTAL_DEPLOYMENT) * 100;

  // Security: Use safe HTML setting
  const resultHTML = `
    <p>New Alliance Ratio:</p>
    <div><span class="troop-label army">Army</span> ${armyPct.toFixed(2)}%</div>
    <div><span class="troop-label marines">Marines</span> ${marinesPct.toFixed(2)}%</div>
    <div><span class="troop-label airforce">Air Force</span> ${airforcePct.toFixed(2)}%</div>
    <p class="small">Totals always sum to 100% and per-player counts sum exactly to the player's size.</p>
  `;
  setInnerHTML(els.result, resultHTML);

  // Update chart (original vs new)
  setBar(els.bars.armyOrig, init.a, true);
  setBar(els.bars.armyNew, armyPct);
  setBar(els.bars.marinesOrig, init.m, true);
  setBar(els.bars.marinesNew, marinesPct);
  setBar(els.bars.airforceOrig, init.f, true);
  setBar(els.bars.airforceNew, airforcePct);
}

function resetBars(){
  Object.values(els.bars).forEach(b=>{ b.style.width='0%'; b.textContent=''; });
  els.result.textContent = '';
}

/** ---------- Bars / Visualization ---------- **/
function setBar(el, pct, isOrig=false){
  const p = clamp(Math.round(num(pct)), 0, 100);
  el.style.width = p + '%';
  el.textContent = p + '%';
  // ensure original is visually distinct (already has .orig); nothing else needed
}

/** ---------- Needed Calculator ---------- **/
function calculateNeeded(){
  const init = readInitNormalized();
  const current = clamp(Math.trunc(num(els.currentTotal.value, 0)), 0, TOTAL_DEPLOYMENT);
  const missing = Math.max(0, TOTAL_DEPLOYMENT - current);
  const alloc = allocateCounts(missing, init.a, init.m, init.f);
  const html = `
    <div>Troops Needed to Reach Total:</div>
    <div><span class="troop-label army">Army</span>: ${alloc.a.toLocaleString()}</div>
    <div><span class="troop-label marines">Marines</span>: ${alloc.m.toLocaleString()}</div>
    <div><span class="troop-label airforce">Air Force</span>: ${alloc.f.toLocaleString()}</div>
    <br>
    <button type="button" id="copyNeededBtn" data-army="${alloc.a}" data-marines="${alloc.m}" data-airforce="${alloc.f}">Copy Needed</button>
  `;
  setInnerHTML(els.neededResult, html);
}

async function copyNeeded(a, m, f){
  const text = `Alliance needs: Army ${a.toLocaleString()}, Marines ${m.toLocaleString()}, Air Force ${f.toLocaleString()}`;
  const ok = await writeClipboard(text);
  els.neededTooltip.textContent = ok ? 'Copied!' : 'Copy failed';
  els.neededTooltip.style.display = 'inline';
  setTimeout(()=> els.neededTooltip.style.display='none', 1000);
}

/** ---------- Copy helpers ---------- **/
async function copyPlayer(playerId){
  const name = (document.getElementById('name'+playerId).value || ('Player ' + playerId)).trim();
  const size = clamp(Math.trunc(num(document.getElementById('size'+playerId).value, 0)), 0, TOTAL_DEPLOYMENT);
  const a = clamp(Math.trunc(num(document.getElementById('army'+playerId).value, 0)), 0, 100);
  const m = clamp(Math.trunc(num(document.getElementById('marines'+playerId).value, 0)), 0, 100);
  const f = clamp(Math.trunc(num(document.getElementById('airforce'+playerId).value, 0)), 0, 100);
  const pcts = normalizeTriple(a, m, f);
  const alloc = allocateCounts(size, pcts.a, pcts.m, pcts.f);
  const text = `${name}: Army ${alloc.a.toLocaleString()}, Marines ${alloc.m.toLocaleString()}, Air Force ${alloc.f.toLocaleString()}`;
  const ok = await writeClipboard(text);
  const tip = document.getElementById('tooltip'+playerId);
  tip.textContent = ok ? 'Copied!' : 'Copy failed';
  tip.style.display = 'inline';
  setTimeout(()=> tip.style.display='none', 1000);
}

/** ---------- IndexedDB Storage ---------- **/
// Ask for durable storage (Chrome/Edge/Firefox; ok if unsupported)
async function requestPersistence() {
  if (navigator.storage?.persist) {
    const granted = await navigator.storage.persist();
    console.log("Durable storage granted?", granted);
  }
}

// Tiny IndexedDB KV store
function openDB(name = "wgc", version = 1) {
  return new Promise((res, rej) => {
    const req = indexedDB.open(name, version);
    req.onupgradeneeded = () => req.result.createObjectStore("kv");
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}

async function dbSet(key, val) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction("kv", "readwrite");
    tx.objectStore("kv").put(val, key);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
}

async function dbGet(key) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction("kv", "readonly");
    const req = tx.objectStore("kv").get(key);
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}

// Save and load app state
async function saveState() {
  const state = {
    initArmy: clamp(num(els.initArmy.value), 0, 100),
    initMarines: clamp(num(els.initMarines.value), 0, 100),
    initAirforce: clamp(num(els.initAirforce.value), 0, 100),
    currentTotal: clamp(num(els.currentTotal.value), 0, 10000000),
    players: []
  };
  
  // Save player data with validation
  const players = document.querySelectorAll('.player');
  players.forEach(p => {
    const i = p.id.replace('player', '');
    const nameEl = document.getElementById('name' + i);
    const sizeEl = document.getElementById('size' + i);
    const armyEl = document.getElementById('army' + i);
    const marinesEl = document.getElementById('marines' + i);
    const airforceEl = document.getElementById('airforce' + i);
    
    if (nameEl && sizeEl && armyEl && marinesEl && airforceEl) {
      state.players.push({
        name: sanitizeInput(nameEl.value).substring(0, 50), // Limit to 50 chars
        size: clamp(num(sizeEl.value), 0, 10000000),
        army: clamp(num(armyEl.value), 0, 100),
        marines: clamp(num(marinesEl.value), 0, 100),
        airforce: clamp(num(airforceEl.value), 0, 100)
      });
    }
  });
  
  await dbSet('appState', state);
}

async function loadState() {
  try {
    const state = await dbGet('appState');
    if (!state || typeof state !== 'object') return;
    
    // Restore initial values with validation
    els.initArmy.value = clamp(num(state.initArmy), 0, 100) || 34;
    els.initMarines.value = clamp(num(state.initMarines), 0, 100) || 33;
    els.initAirforce.value = clamp(num(state.initAirforce), 0, 100) || 33;
    els.currentTotal.value = clamp(num(state.currentTotal), 0, 10000000) || 6462500;
    
    // Clear existing players
    els.playersContainer.innerHTML = '';
    playerCount = 0;
    
    // Restore players with validation
    if (Array.isArray(state.players) && state.players.length > 0) {
      state.players.slice(0, MAX_PLAYERS).forEach((player, index) => {
        if (typeof player === 'object' && player !== null) {
          addPlayer();
          const i = index + 1;
          const nameEl = document.getElementById('name' + i);
          const sizeEl = document.getElementById('size' + i);
          const armyEl = document.getElementById('army' + i);
          const marinesEl = document.getElementById('marines' + i);
          const airforceEl = document.getElementById('airforce' + i);
          
          if (nameEl) nameEl.value = sanitizeInput(String(player.name || '')).substring(0, 50);
          if (sizeEl) sizeEl.value = clamp(num(player.size), 0, 10000000) || 500000;
          if (armyEl) armyEl.value = clamp(num(player.army), 0, 100) || 50;
          if (marinesEl) marinesEl.value = clamp(num(player.marines), 0, 100) || 0;
          if (airforceEl) airforceEl.value = clamp(num(player.airforce), 0, 100) || 50;
        }
      });
    } else {
      // Add default player if none saved
      addPlayer();
    }
    
    // Update UI
    readInitNormalized();
    els.removeBtn.disabled = (playerCount === 0);
    els.addBtn.disabled = (playerCount >= MAX_PLAYERS);
    
  } catch (error) {
    console.error('Failed to load state:', error);
    // Fallback to default state
    addPlayer();
    readInitNormalized();
  }
}

// Auto-save on input changes
function setupAutoSave() {
  const inputs = [
    'initArmy', 'initMarines', 'initAirforce', 'currentTotal'
  ];
  
  inputs.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', saveState);
    }
  });
  
  // Save when players are added/removed
  const originalAddPlayer = addPlayer;
  addPlayer = function() {
    originalAddPlayer();
    saveState();
  };
  
  const originalRemovePlayer = removePlayer;
  removePlayer = function(i) {
    originalRemovePlayer(i);
    saveState();
  };
  
  const originalRemoveLastPlayer = removeLastPlayer;
  removeLastPlayer = function() {
    originalRemoveLastPlayer();
    saveState();
  };
}

/** ---------- Event Listeners ---------- **/
function setupEventListeners() {
  // Main buttons
  document.getElementById('addBtn').addEventListener('click', addPlayer);
  document.getElementById('removeBtn').addEventListener('click', removeLastPlayer);
  document.getElementById('calculateBtn').addEventListener('click', calculate);
  document.getElementById('resetBtn').addEventListener('click', resetBars);
  document.getElementById('calculateNeededBtn').addEventListener('click', calculateNeeded);
  
  // Input listeners
  ['initArmy','initMarines','initAirforce'].forEach(id=>{
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', ()=> readInitNormalized());
    }
  });
  
  // Delegated event listeners for dynamic content
  document.addEventListener('click', function(e) {
    if (e.target.classList.contains('remove-player-btn')) {
      const playerId = e.target.getAttribute('data-player-id');
      if (playerId) {
        removePlayer(parseInt(playerId));
      }
    }
    
    if (e.target.classList.contains('copy-player-btn')) {
      const playerId = e.target.getAttribute('data-player-id');
      if (playerId) {
        copyPlayer(parseInt(playerId));
      }
    }
    
    if (e.target.id === 'copyNeededBtn') {
      const army = parseInt(e.target.getAttribute('data-army'));
      const marines = parseInt(e.target.getAttribute('data-marines'));
      const airforce = parseInt(e.target.getAttribute('data-airforce'));
      if (!isNaN(army) && !isNaN(marines) && !isNaN(airforce)) {
        copyNeeded(army, marines, airforce);
      }
    }
  });
}

/** ---------- Wire up ---------- **/
document.addEventListener('DOMContentLoaded', async function() {
  // Request persistent storage
  await requestPersistence();
  
  // Load saved state
  await loadState();
  
  // Setup auto-save
  setupAutoSave();
  
  // Setup event listeners
  setupEventListeners();
  
  // First normalize/display
  readInitNormalized();
  resetBars();
});
