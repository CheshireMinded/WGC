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
  return `
  <div class="player" id="player${i}">
    <div class="flex-row" style="justify-content:space-between; gap:6px;">
      <strong>Player ${i}</strong>
      <button class="secondary" type="button" onclick="removePlayer(${i})">Remove</button>
    </div>
    <div class="flex-row" style="margin-top:6px;">
      <input type="text" class="name-input" id="name${i}" placeholder="Player Name" />
      <label>Current Deployment:</label><input type="number" id="size${i}" value="500000" min="0" inputmode="numeric" />
      <span class="troop-label army">Army</span><input type="number" id="army${i}" value="50" min="0" max="100" inputmode="numeric" />
      <span class="troop-label marines">Marines</span><input type="number" id="marines${i}" value="0" min="0" max="100" inputmode="numeric" />
      <span class="troop-label airforce">Air Force</span><input type="number" id="airforce${i}" value="50" min="0" max="100" inputmode="numeric" />
    </div>
    <div class="troop-count" id="count${i}" aria-live="polite"></div>
    <div style="position:relative; display:inline-block;">
      <button type="button" onclick="copyPlayer(${i})">Copy</button>
      <span id="tooltip${i}" class="tooltip">Copied!</span>
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

  els.result.innerHTML = `
    <p>New Alliance Ratio:</p>
    <div><span class="troop-label army">Army</span> ${armyPct.toFixed(2)}%</div>
    <div><span class="troop-label marines">Marines</span> ${marinesPct.toFixed(2)}%</div>
    <div><span class="troop-label airforce">Air Force</span> ${airforcePct.toFixed(2)}%</div>
    <p class="small">Totals always sum to 100% and per-player counts sum exactly to the player's size.</p>
  `;

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
    <button type="button" onclick="copyNeeded(${alloc.a}, ${alloc.m}, ${alloc.f})">Copy Needed</button>
  `;
  els.neededResult.innerHTML = html;
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
// ask for durable/persistent storage when available
async function requestPersistence() {
  if (navigator.storage && navigator.storage.persist) {
    const granted = await navigator.storage.persist();
    console.log("Persistent storage granted?", granted);
  }
}

// simple IDB helpers
function openDB(name, version = 1) {
  return new Promise((res, rej) => {
    const req = indexedDB.open(name, version);
    req.onupgradeneeded = () => req.result.createObjectStore('kv');
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}

async function dbSet(key, val) {
  const db = await openDB('trooptools');
  return new Promise((res, rej) => {
    const tx = db.transaction('kv', 'readwrite');
    tx.objectStore('kv').put(val, key);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
}

async function dbGet(key) {
  const db = await openDB('trooptools');
  return new Promise((res, rej) => {
    const tx = db.transaction('kv', 'readonly');
    const req = tx.objectStore('kv').get(key);
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}

// Save and load app state
async function saveState() {
  const state = {
    initArmy: els.initArmy.value,
    initMarines: els.initMarines.value,
    initAirforce: els.initAirforce.value,
    currentTotal: els.currentTotal.value,
    players: []
  };
  
  // Save player data
  const players = document.querySelectorAll('.player');
  players.forEach(p => {
    const i = p.id.replace('player', '');
    state.players.push({
      name: document.getElementById('name' + i).value,
      size: document.getElementById('size' + i).value,
      army: document.getElementById('army' + i).value,
      marines: document.getElementById('marines' + i).value,
      airforce: document.getElementById('airforce' + i).value
    });
  });
  
  await dbSet('appState', state);
}

async function loadState() {
  try {
    const state = await dbGet('appState');
    if (!state) return;
    
    // Restore initial values
    els.initArmy.value = state.initArmy || 34;
    els.initMarines.value = state.initMarines || 33;
    els.initAirforce.value = state.initAirforce || 33;
    els.currentTotal.value = state.currentTotal || 6462500;
    
    // Clear existing players
    els.playersContainer.innerHTML = '';
    playerCount = 0;
    
    // Restore players
    if (state.players && state.players.length > 0) {
      state.players.forEach((player, index) => {
        addPlayer();
        const i = index + 1;
        document.getElementById('name' + i).value = player.name || '';
        document.getElementById('size' + i).value = player.size || 500000;
        document.getElementById('army' + i).value = player.army || 50;
        document.getElementById('marines' + i).value = player.marines || 0;
        document.getElementById('airforce' + i).value = player.airforce || 50;
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

/** ---------- Wire up ---------- **/
document.addEventListener('DOMContentLoaded', async function() {
  // Request persistent storage
  await requestPersistence();
  
  // Load saved state
  await loadState();
  
  // Setup auto-save
  setupAutoSave();
  
  // Wire up input listeners
  ['initArmy','initMarines','initAirforce'].forEach(id=>{
    document.getElementById(id).addEventListener('input', ()=> readInitNormalized());
  });
  
  // First normalize/display
  readInitNormalized();
  resetBars();
});
