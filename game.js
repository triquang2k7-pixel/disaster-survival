/* ═══════════════════════════════════════════════
   Thoát Khỏi Thiên Tai — Disaster Survival (game.js)
   v2.0: Skin Shop, Gun System, Solo No Traps/Mines
   - Hệ thống 100 HP, mất máu theo hiểm họa & hồi máu bằng Tim ❤️ (5-10 HP)
   - Túi đồ phím 1 (Bẫy kẹp 🪤) & phím 2 (Mìn tàng hình 💣) & phím 3 (Súng 🔫)
   - Chế độ Solo: KHÔNG có bẫy và mìn, chỉ có tim, súng
   - Súng: Nhặt vật phẩm súng 🔫, mỗi lần nhặt +1 đạn, tích nhiều lần
   - Skin Shop: Mua skin bằng xu kiếm được khi chơi
   - Đồng bộ chơi Online 4 người đầy đủ (PeerJS + BroadcastChannel)
   ═══════════════════════════════════════════════ */

// ── Config ────────────────────────────────────
const GRID = 20;
const CELL = 24;
const CANVAS_PX = GRID * CELL;

const SPEEDS = { slow: 140, normal: 105, fast: 75 };
let currentSpeed = 'normal';

const MAX_HP = 100;

// Disaster Timers
const FIRE_INTERVAL_MIN     = 13000;
const FIRE_INTERVAL_MAX     = 18000;
const FIRE_WARN_TIME        = 4200;
const FIRE_SWEEP_SPEED      = 170;
const FIRE_BURN_TIME        = 2500;

const THUNDER_INTERVAL_MIN  = 15000;
const THUNDER_INTERVAL_MAX  = 21000;
const THUNDER_WARN_TIME     = 4200;
const THUNDER_STRIKE_TIME   = 600;
const THUNDER_SHOCK_TIME    = 2500;

const TORNADO_INTERVAL_MIN  = 16000;
const TORNADO_INTERVAL_MAX  = 23000;
const TORNADO_WARN_TIME     = 3800;
const TORNADO_DURATION      = 11000;

const LANDSLIDE_INTERVAL_MIN= 17000;
const LANDSLIDE_INTERVAL_MAX= 24000;
const LANDSLIDE_WARN_TIME   = 4200;
const LANDSLIDE_COLLAPSE_TIME = 6500;

const BOMB_INTERVAL_MIN     = 11000;
const BOMB_INTERVAL_MAX     = 16000;
const BOMB_FUSE_TIME        = 4500;
const BOMB_BLAST_RADIUS     = 2;
const BOMB_CRATER_DURATION  = 4000;

const ITEM_SPAWN_INTERVAL   = 6500;

// Gun Constants
const GUN_BULLET_SPEED = 6; // pixels per frame
const GUN_BULLET_DAMAGE = 35;
const GUN_BULLET_MAX_RANGE = CANVAS_PX; // max travel distance

// ══════════════════════════════════════════════
//  SKIN SHOP SYSTEM
// ══════════════════════════════════════════════

const SKIN_CATALOG = [
  { id: 'default',   name: 'Chiến Binh',     price: 0,   jacket: '#ea580c', cap: '#0284c7', glow: '#fb923c' },
  { id: 'ninja',     name: 'Ninja Bóng Đêm', price: 100, jacket: '#1e293b', cap: '#334155', glow: '#475569' },
  { id: 'fire',      name: 'Chiến Binh Lửa', price: 150, jacket: '#dc2626', cap: '#f59e0b', glow: '#ef4444' },
  { id: 'ice',       name: 'Băng Giá',       price: 150, jacket: '#0284c7', cap: '#7dd3fc', glow: '#38bdf8' },
  { id: 'toxic',     name: 'Độc Tố Xanh',    price: 200, jacket: '#15803d', cap: '#84cc16', glow: '#4ade80' },
  { id: 'royal',     name: 'Hoàng Gia',       price: 250, jacket: '#7c3aed', cap: '#fbbf24', glow: '#a78bfa' },
  { id: 'cyber',     name: 'Chiến Binh Cyber',price: 300, jacket: '#06b6d4', cap: '#d946ef', glow: '#22d3ee' },
  { id: 'shadow',    name: 'Bóng Ma',         price: 350, jacket: '#18181b', cap: '#52525b', glow: '#71717a' },
  { id: 'golden',    name: 'Vàng Ròng',       price: 500, jacket: '#d97706', cap: '#fbbf24', glow: '#f59e0b' },
  { id: 'rainbow',   name: 'Cầu Vồng',       price: 800, jacket: '#ec4899', cap: '#8b5cf6', glow: '#f472b6' },
  { id: 'dragon',    name: 'Rồng Thần',       price: 1000,jacket: '#b91c1c', cap: '#fbbf24', glow: '#dc2626' },
  { id: 'diamond',   name: 'Kim Cương',       price: 1500,jacket: '#0ea5e9', cap: '#e0f2fe', glow: '#38bdf8' },
];

// 4 Player Appearance (multiplayer fallback skins)
const PLAYER_SKINS_MULTI = [
  { jacket: '#ea580c', cap: '#0284c7', glow: '#fb923c', name: 'Người chơi 1' },
  { jacket: '#0284c7', cap: '#f59e0b', glow: '#38bdf8', name: 'Người chơi 2' },
  { jacket: '#16a34a', cap: '#ec4899', glow: '#4ade80', name: 'Người chơi 3' },
  { jacket: '#9333ea', cap: '#14b8a6', glow: '#c084fc', name: 'Người chơi 4' },
];

const INITIAL_SPAWNS = [
  { x: 5,  y: 5  },
  { x: 14, y: 5  },
  { x: 5,  y: 14 },
  { x: 14, y: 14 },
];

// Load saved skin data (starts with 100 bonus coins for new players)
let playerCoins = parseInt(localStorage.getItem('disaster_coins') || '100', 10);
let ownedSkins = JSON.parse(localStorage.getItem('disaster_owned_skins') || '["default"]');
let equippedSkinId = localStorage.getItem('disaster_equipped_skin') || 'default';

function saveShopData() {
  localStorage.setItem('disaster_coins', playerCoins.toString());
  localStorage.setItem('disaster_owned_skins', JSON.stringify(ownedSkins));
  localStorage.setItem('disaster_equipped_skin', equippedSkinId);
}

function getEquippedSkin() {
  return SKIN_CATALOG.find(s => s.id === equippedSkinId) || SKIN_CATALOG[0];
}

function getPlayerSkin(slot) {
  if (slot === mySlot) {
    return getEquippedSkin();
  }
  const rp = roomPlayers.find(p => p.slot === slot);
  if (rp && rp.skinId) {
    const customSkin = SKIN_CATALOG.find(s => s.id === rp.skinId);
    if (customSkin) return customSkin;
  }
  return PLAYER_SKINS_MULTI[slot % 4];
}

// ── DOM refs ──────────────────────────────────
const canvas        = document.getElementById('gameCanvas');
const ctx           = canvas.getContext('2d');
const elScore       = document.getElementById('score');
const elTimeDisplay = document.getElementById('timeDisplay');
const elBest        = document.getElementById('bestScore');
const elFinal       = document.getElementById('finalScore');
const elFinalTime   = document.getElementById('finalTime');
const elFinalCoins  = document.getElementById('finalCoins');
const elDeath       = document.getElementById('deathReason');
const elNewRecord   = document.getElementById('newRecord');
const elOverStart   = document.getElementById('overlayStart');
const elOverGO      = document.getElementById('overlayGameOver');
const elOverOnline  = document.getElementById('overlayOnline');
const elOverMultiGO = document.getElementById('overlayMultiGameOver');
const elOverCountdown = document.getElementById('overlayCountdown');
const elCountdownNum  = document.getElementById('countdownNum');
const elCountdownSub  = document.getElementById('countdownSub');
const elPause       = document.getElementById('pauseIndicator');
const wrapper       = document.getElementById('canvasWrapper');
const elWarn        = document.getElementById('hazardWarning');
const elWarnText    = document.getElementById('hazardWarnText');
const elMultiHud    = document.getElementById('multiHud');
const elCoinDisplay = document.getElementById('coinDisplay');
const elOverSkinShop = document.getElementById('overlaySkinShop');
const elSkinGrid    = document.getElementById('skinGrid');
const elShopCoinDisplay = document.getElementById('shopCoinDisplay');

let isCountingDown   = false;
let countdownTimerId = null;

// HP & Inventory DOM refs
const elHpFill      = document.getElementById('hpFill');
const elHpText      = document.getElementById('hpText');
const elSlotTrap    = document.getElementById('slotTrap');
const elSlotMine    = document.getElementById('slotMine');
const elSlotGun     = document.getElementById('slotGun');
const elCountTrap   = document.getElementById('countTrap');
const elCountMine   = document.getElementById('countMine');
const elCountGun    = document.getElementById('countGun');
const elEventToast  = document.getElementById('eventToast');
const elToastText   = document.getElementById('toastText');

// Online DOM refs
const elViewOnlineMenu    = document.getElementById('viewOnlineMenu');
const elViewOnlineLobby   = document.getElementById('viewOnlineLobby');
const elOnlinePlayerName  = document.getElementById('onlinePlayerName');
const elInputRoomCode     = document.getElementById('inputRoomCode');
const elOnlineError       = document.getElementById('onlineError');
const elDisplayRoomCode   = document.getElementById('displayRoomCode');
const elDisplayPlayerCount= document.getElementById('displayPlayerCount');
const elPlayerSlots       = document.getElementById('playerSlotsContainer');
const elBtnStartMultiGame = document.getElementById('btnStartMultiGame');
const elGuestWaitingMsg   = document.getElementById('guestWaitingMsg');
const elBtnToggleReady    = document.getElementById('btnToggleReady');
const elTextToggleReady   = document.getElementById('textToggleReady');
const elLobbyNoticeBar    = document.getElementById('lobbyNoticeBar');
const elTextStartMulti    = document.getElementById('textStartMulti');
const elRoomInviteHint    = document.getElementById('roomInviteHint');
const elResRoomCode       = document.getElementById('resRoomCode');
const elLeaderboardList   = document.getElementById('leaderboardList');
const elBtnHostPlayAgain  = document.getElementById('btnHostPlayAgain');
const elModeSubtitle      = document.getElementById('modeSubtitle');

// Internal Canvas Camera Shake (Pure 2D context offset - NO DOM text jumping!)
let camShakeTimer = 0;
let camShakeIntensity = 0;

function triggerScreenShake(intensity = 3, duration = 200) {
  camShakeIntensity = Math.max(camShakeIntensity, intensity);
  camShakeTimer = Math.max(camShakeTimer, duration);
}

// Light Atmospheric Fog System
const FOG_COUNT = 14;
let fogPuffs = [];

function initFog() {
  fogPuffs = [];
  for (let i = 0; i < FOG_COUNT; i++) {
    fogPuffs.push({
      x: Math.random() * CANVAS_PX,
      y: Math.random() * CANVAS_PX,
      radius: 55 + Math.random() * 45,
      vx: 0.12 + Math.random() * 0.18,
      vy: (Math.random() - 0.5) * 0.08,
      baseAlpha: 0.13 + Math.random() * 0.09,
      phase: Math.random() * Math.PI * 2,
      pulseSpeed: 0.001 + Math.random() * 0.0015,
    });
  }
}

let joinWatchdogTimer = null;
let roomHeartbeatTimer = null;

canvas.width  = CANVAS_PX;
canvas.height = CANVAS_PX;

// ── Player & Gameplay State ───────────────────
let player, dir, nextDir, running, paused, loopId, lastTime;
let survivalTime = 0;
let bonusScore = 0;
let bestScore = 0;
let particles = [];
let trail = [];
let floatingTexts = [];

// HP System (100 HP)
let hp = MAX_HP;
let damageCooldown = 0;
let trapFrozenTimer = 0;

// Inventory System (Key 1: Trap, Key 2: Landmine, Key 3: Gun)
let trapCount = 1;
let mineCount = 1;
let gunAmmo = 0;   // Gun bullets count
let items = [];
let itemTimer = 3000;
let placedTraps = [];
let placedMines = [];
let bullets = []; // Active flying bullets { x, y, vx, vy, ownerSlot, distTraveled }

// Coins earned this round
let roundCoins = 0;

// ── Concurrent Disasters State ────────────────
let fireWave = null;
let fireCells = new Set();
let spreadingFlames = new Map();
let burntGrass = new Map();
let fireTimer = 4000;

let thunderstorm = null;
let lightningCells = new Set();
let raindrops = [];
let puddleCells = new Set();
let electrifiedPuddles = new Set();
let puddleSpreadAcc = 0;
let thunderTimer = 8000;

let tornadoes = [];
let tornado = null;
let tornadoTimer = 11000;
let tornadoConvergenceTimer = 0;
let isTornadoConverging = false;
let mpMoveSyncTimer = 0;
const keysDown = new Set();

let burnDuration = 0;
let burnTickCooldown = 0;
let electroTickCooldown = 0;
let sinkholeTickCooldown = 0;
let tornadoTickCooldown = 0;
let playerHurtFlash = 0;
let lawnCanvas = null;

let landslide = null;
let sinkholeCells = new Set();
let landslideTimer = 14000;

let bombs = [];
let craters = [];
let shockwaves = [];
let bombTimer = 6000;
let tornadoSlowTimer = 0;

// ── Multiplayer State ─────────────────────────
let isMultiplayer = false;
let isHost = false;
let mySlot = 0;
let myPlayerId = 'p_' + Math.random().toString(36).substring(2, 8);
let myPlayerName = 'Player';
let currentRoomCode = '';
let roomPlayers = [];
let isSpectator = false;
let broadcastChannel = null;
let peer = null;
let peerConnections = [];
let lastSyncDisasterTime = 0;
let toastTimeout = null;

bestScore = parseInt(localStorage.getItem('disasterSurvivalBestScore') || '0', 10);
elBest.textContent = bestScore;
updateCoinDisplays();

// ── Lawn decorations ──────────────────────────
const lawnDecorations = [];
(function initLawnDecorations() {
  for (let gx = 0; gx < GRID; gx++) {
    for (let gy = 0; gy < GRID; gy++) {
      const rand = Math.random();
      if (rand < 0.16) {
        lawnDecorations.push({
          x: gx * CELL + 5 + Math.random() * (CELL - 10),
          y: gy * CELL + 5 + Math.random() * (CELL - 10),
          type: rand < 0.09 ? 'tuft' : (rand < 0.13 ? 'flower' : 'clover')
        });
      }
    }
  }
})();

// ── Background firefly particles (Optimized for 60 FPS) ──────────
(function initBgParticles() {
  const container = document.getElementById('bgParticles');
  if (!container) return;
  const colors = ['#00e5ff', '#7c4dff', '#00e676', '#ffea00'];
  // Keep particle count light to avoid CPU compositing bottle-necks
  for (let i = 0; i < 8; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const sz = 2 + Math.random() * 2;
    p.style.cssText = `
      width:${sz}px;height:${sz}px;
      left:${Math.random()*100}%;
      background:${colors[i%colors.length]};
      animation-duration:${10+Math.random()*12}s;
      animation-delay:${-Math.random()*15}s;
      will-change: transform;
      transform: translate3d(0, 0, 0);
    `;
    container.appendChild(p);
  }
})();

function setSpeed(sp) {
  currentSpeed = sp;
  document.querySelectorAll('.diff-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.speed === sp);
  });
}

function updateCoinDisplays() {
  if (elCoinDisplay) elCoinDisplay.textContent = playerCoins;
  if (elShopCoinDisplay) elShopCoinDisplay.textContent = playerCoins;
}

// ══════════════════════════════════════════════
//  SKIN SHOP FUNCTIONS
// ══════════════════════════════════════════════

function openSkinShop() {
  elOverStart.classList.add('hidden');
  elOverSkinShop.classList.remove('hidden');
  updateCoinDisplays();
  renderSkinShop();
}

function closeSkinShop() {
  elOverSkinShop.classList.add('hidden');
  elOverStart.classList.remove('hidden');
}

function renderSkinShop() {
  if (!elSkinGrid) return;
  elSkinGrid.innerHTML = '';

  for (const skin of SKIN_CATALOG) {
    const isOwned = ownedSkins.includes(skin.id);
    const isEquipped = equippedSkinId === skin.id;
    const canAfford = playerCoins >= skin.price;

    const card = document.createElement('div');
    card.className = `skin-card ${isEquipped ? 'equipped' : (isOwned ? 'owned' : (canAfford ? '' : 'locked'))}`;

    // Draw preview
    const previewDiv = document.createElement('div');
    previewDiv.className = 'skin-preview';

    const miniCanvas = document.createElement('canvas');
    miniCanvas.width = 48;
    miniCanvas.height = 48;
    const mctx = miniCanvas.getContext('2d');
    drawSkinPreview(mctx, skin, 24, 28);
    previewDiv.appendChild(miniCanvas);

    const nameEl = document.createElement('div');
    nameEl.className = 'skin-name';
    nameEl.textContent = skin.name;

    const priceEl = document.createElement('div');
    if (isEquipped) {
      priceEl.className = 'skin-price equipped-label';
      priceEl.textContent = 'Đang dùng';
    } else if (isOwned) {
      priceEl.className = 'skin-price owned-label';
      priceEl.textContent = 'Đã sở hữu';
    } else if (skin.price === 0) {
      priceEl.className = 'skin-price free';
      priceEl.textContent = 'Miễn phí';
    } else {
      priceEl.className = `skin-price buy`;
      priceEl.innerHTML = `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#ffb300" stroke-width="2" style="vertical-align:middle;margin-right:3px"><circle cx="12" cy="12" r="9" fill="rgba(255,179,0,0.2)"/><circle cx="12" cy="12" r="5"/></svg>${skin.price} Xu`;
    }

    card.appendChild(previewDiv);
    card.appendChild(nameEl);
    card.appendChild(priceEl);

    card.addEventListener('click', () => handleSkinClick(skin.id));
    elSkinGrid.appendChild(card);
  }
}

function drawSkinPreview(mctx, skin, cx, cy) {
  // Shadow
  mctx.fillStyle = 'rgba(0,0,0,0.25)';
  mctx.beginPath();
  mctx.ellipse(cx, cy + 12, 10, 4, 0, 0, Math.PI * 2);
  mctx.fill();

  // Glow
  mctx.save();
  mctx.shadowColor = skin.glow;
  mctx.shadowBlur = 12;

  // Torso
  mctx.fillStyle = skin.jacket;
  mctx.beginPath();
  mctx.roundRect(cx - 8, cy - 2, 16, 14, 5);
  mctx.fill();

  // Head
  mctx.fillStyle = '#fed7aa';
  mctx.beginPath();
  mctx.arc(cx, cy - 8, 8, 0, Math.PI * 2);
  mctx.fill();

  // Cap
  mctx.fillStyle = skin.cap;
  mctx.beginPath();
  mctx.arc(cx, cy - 10, 7, Math.PI, Math.PI * 2);
  mctx.fill();

  // Eyes
  mctx.fillStyle = '#1e293b';
  mctx.beginPath();
  mctx.arc(cx - 2.5, cy - 8, 1.5, 0, Math.PI * 2);
  mctx.arc(cx + 2.5, cy - 8, 1.5, 0, Math.PI * 2);
  mctx.fill();

  mctx.restore();
}

function handleSkinClick(skinId) {
  const skin = SKIN_CATALOG.find(s => s.id === skinId);
  if (!skin) return;

  const isOwned = ownedSkins.includes(skinId);

  if (isOwned) {
    // Equip it
    equippedSkinId = skinId;
    saveShopData();
    renderSkinShop();
    lawnCanvas = null; // Reset cached canvas
    return;
  }

  // Try to buy
  if (playerCoins >= skin.price) {
    playerCoins -= skin.price;
    ownedSkins.push(skinId);
    equippedSkinId = skinId;
    saveShopData();
    updateCoinDisplays();
    renderSkinShop();
    lawnCanvas = null;
  } else {
    showToast(`Không đủ xu! Cần ${skin.price} xu (bạn có ${playerCoins})`);
  }
}

// ══════════════════════════════════════════════
//  GAME START & RESET
// ══════════════════════════════════════════════

function startSoloGame() {
  isMultiplayer = false;
  isHost = true;
  mySlot = 0;
  myPlayerName = 'Player';
  isSpectator = false;
  if (elMultiHud) elMultiHud.classList.add('hidden');
  if (elModeSubtitle) elModeSubtitle.textContent = 'Chơi Đơn (Solo)';
  if (elOverSkinShop) elOverSkinShop.classList.add('hidden');
  startGame();
}

function startGame() {
  const spawn = isMultiplayer ? INITIAL_SPAWNS[mySlot % 4] : { x: 10, y: 10 };
  const initDir = (spawn.x < GRID / 2) ? { x: 1, y: 0 } : { x: -1, y: 0 };
  player  = { x: spawn.x, y: spawn.y, angle: Math.atan2(initDir.y, initDir.x), runDist: 0 };
  dir     = { ...initDir };
  nextDir = { ...initDir };
  keysDown.clear();
  tornadoConvergenceTimer = 0;
  isTornadoConverging = false;
  mpMoveSyncTimer = 0;
  survivalTime = 0;
  bonusScore = 0;
  roundCoins = 0;
  paused  = false;
  running = true;
  isSpectator = false;
  particles = [];
  trail   = [];
  floatingTexts = [];
  bullets = [];

  // Reset HP & Inventory
  hp = MAX_HP;
  damageCooldown = 0;
  trapFrozenTimer = 0;

  // SOLO MODE: No traps or mines! Only heart and gun items
  if (!isMultiplayer) {
    trapCount = 0;
    mineCount = 0;
  } else {
    trapCount = 1;
    mineCount = 1;
  }
  gunAmmo = 0;

  items = [];
  itemTimer = 3500;
  placedTraps = [];
  placedMines = [];

  updateHpUI();
  updateInventoryUI();

  // Reset Concurrent Disasters
  fireWave        = null;
  fireCells       = new Set();
  spreadingFlames = new Map();
  burntGrass      = new Map();
  fireTimer       = 3500;

  thunderstorm    = null;
  lightningCells  = new Set();
  raindrops       = [];
  puddleCells     = new Set();
  electrifiedPuddles = new Set();
  puddleSpreadAcc = 0;
  thunderTimer    = 7000;

  tornadoes       = [];
  tornado         = null;
  tornadoTimer    = 10000;

  burnDuration    = 0;
  burnTickCooldown = 0;
  electroTickCooldown = 0;
  sinkholeTickCooldown = 0;
  tornadoTickCooldown = 0;
  playerHurtFlash = 0;

  landslide       = null;
  sinkholeCells   = new Set();
  landslideTimer  = 13000;

  bombs           = [];
  craters         = [];
  shockwaves      = [];
  bombTimer       = 5500;
  tornadoSlowTimer = 0;

  hideWarning();

  if (countdownTimerId) {
    clearInterval(countdownTimerId);
    countdownTimerId = null;
  }
  isCountingDown = false;
  if (elOverCountdown) elOverCountdown.classList.add('hidden');

  elScore.textContent = '0';
  if (elTimeDisplay) elTimeDisplay.textContent = '0.0s';
  elOverStart.classList.add('hidden');
  elOverGO.classList.add('hidden');
  if (elOverOnline) elOverOnline.classList.add('hidden');
  if (elOverMultiGO) elOverMultiGO.classList.add('hidden');
  if (elOverSkinShop) elOverSkinShop.classList.add('hidden');
  elPause.classList.add('hidden');

  if (isMultiplayer) {
    if (elMultiHud) elMultiHud.classList.remove('hidden');
    const me = roomPlayers.find(p => p.slot === mySlot);
    if (me) {
      me.isAlive = true;
      me.x = player.x;
      me.y = player.y;
      me.hp = hp;
      me.isFrozen = false;
      me.score = 0;
      me.time = 0;
    }
    updateMultiHud();
  }

  lastTime = performance.now();
  if (loopId) cancelAnimationFrame(loopId);
  loopId = requestAnimationFrame(loop);

  startCountdown();
}

// ── Đếm ngược 3 2 1 ────
function startCountdown(onComplete) {
  if (countdownTimerId) clearInterval(countdownTimerId);
  isCountingDown = true;
  let count = 3;

  if (elOverCountdown && elCountdownNum && elCountdownSub) {
    elOverCountdown.classList.remove('hidden');
    elCountdownNum.classList.remove('go');
    elCountdownNum.textContent = '3';
    elCountdownSub.textContent = 'CHUẨN BỊ CHẠY!';
    elCountdownNum.style.animation = 'none';
    void elCountdownNum.offsetWidth;
    elCountdownNum.style.animation = '';
  }

  countdownTimerId = setInterval(() => {
    count--;
    if (!elOverCountdown) return;

    if (count === 2) {
      elCountdownNum.textContent = '2';
      elCountdownSub.textContent = 'SẴN SÀNG...';
      elCountdownNum.style.animation = 'none';
      void elCountdownNum.offsetWidth;
      elCountdownNum.style.animation = '';
    } else if (count === 1) {
      elCountdownNum.textContent = '1';
      elCountdownSub.textContent = 'XUẤT PHÁT!';
      elCountdownNum.style.animation = 'none';
      void elCountdownNum.offsetWidth;
      elCountdownNum.style.animation = '';
    } else if (count === 0) {
      elCountdownNum.textContent = 'BẮT ĐẦU!';
      elCountdownNum.classList.add('go');
      elCountdownSub.textContent = 'CHẠY NGAY ĐI!';
      elCountdownNum.style.animation = 'none';
      void elCountdownNum.offsetWidth;
      elCountdownNum.style.animation = '';
    } else {
      clearInterval(countdownTimerId);
      countdownTimerId = null;
      elOverCountdown.classList.add('hidden');
      isCountingDown = false;
      lastTime = performance.now();
      if (onComplete) onComplete();
    }
  }, 850);
}

// ── HP & Damage Management ────────────────────
function updateHpUI() {
  if (!elHpFill || !elHpText) return;
  const pct = Math.max(0, Math.min(100, (hp / MAX_HP) * 100));
  elHpFill.style.width = pct + '%';
  elHpText.textContent = `${hp}/${MAX_HP} HP`;

  elHpFill.classList.toggle('mid', pct <= 60 && pct > 30);
  elHpFill.classList.toggle('low', pct <= 30);
}

function updateInventoryUI() {
  if (elCountTrap) elCountTrap.textContent = 'x' + trapCount;
  if (elCountMine) elCountMine.textContent = 'x' + mineCount;
  if (elCountGun) elCountGun.textContent = 'x' + gunAmmo;

  const mobCountTrap = document.getElementById('mobileCountTrap');
  const mobCountMine = document.getElementById('mobileCountMine');
  const mobCountGun = document.getElementById('mobileCountGun');
  if (mobCountTrap) mobCountTrap.textContent = 'x' + trapCount;
  if (mobCountMine) mobCountMine.textContent = 'x' + mineCount;
  if (mobCountGun) mobCountGun.textContent = 'x' + gunAmmo;

  // In Solo mode: hide traps and mines slots completely!
  if (elSlotTrap) elSlotTrap.classList.toggle('hidden', !isMultiplayer);
  if (elSlotMine) elSlotMine.classList.toggle('hidden', !isMultiplayer);

  const mobileTrap = document.getElementById('mobileBtnTrap');
  const mobileMine = document.getElementById('mobileBtnMine');
  if (mobileTrap) mobileTrap.classList.toggle('hidden', !isMultiplayer);
  if (mobileMine) mobileMine.classList.toggle('hidden', !isMultiplayer);
}

function takeDamage(amount, reason) {
  if (isSpectator || damageCooldown > 0) return;

  hp = Math.max(0, hp - amount);
  damageCooldown = 650;

  updateHpUI();
  spawnDamageParticles(player.x, player.y);
  spawnFloatingText(`-${amount} HP`, player.x, player.y, '#ff1744');

  triggerScreenShake(2.2, 160);

  if (hp <= 0) {
    handlePlayerDeath(reason);
  }
}

function takeTickDamage(amount, reason, type = 'fire') {
  if (isSpectator) return;

  hp = Math.max(0, hp - amount);
  playerHurtFlash = 120;
  updateHpUI();

  let label = 'LỬA';
  let color = '#ff6e40';
  if (type === 'electric') { label = 'SẤM SÉT'; color = '#40c4ff'; }
  else if (type === 'tornado') { label = 'LỐC XOÁY'; color = '#cfd8dc'; }
  else if (type === 'sinkhole') { label = 'SỤT ĐẤT'; color = '#ffab40'; }

  spawnFloatingText(`-${amount} HP [${label}]`, player.x, player.y, color);

  if (hp <= 0) {
    handlePlayerDeath(reason);
  }
}

function healHp(amount) {
  if (isSpectator || hp >= MAX_HP) return;
  const prev = hp;
  hp = Math.min(MAX_HP, hp + amount);
  const actual = hp - prev;
  updateHpUI();
  spawnFloatingText(`+${actual} HP`, player.x, player.y, '#00e676');
}

function spawnDamageParticles(gx, gy) {
  const cx = gx * CELL + CELL / 2;
  const cy = gy * CELL + CELL / 2;
  for (let i = 0; i < 16; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 3.5;
    particles.push({
      x: cx, y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 2.5 + Math.random() * 3,
      color: '#ff1744',
      life: 350 + Math.random() * 200,
      maxLife: 550,
    });
  }
}

// ── Floating Combat Text ──────────────────────
function spawnFloatingText(text, gx, gy, color) {
  floatingTexts.push({
    text: text,
    x: gx * CELL + CELL / 2,
    y: gy * CELL,
    color: color,
    life: 1200,
    maxLife: 1200,
    vy: -0.6
  });
}

function updateAndDrawFloatingTexts(dt) {
  for (let i = floatingTexts.length - 1; i >= 0; i--) {
    const ft = floatingTexts[i];
    ft.life -= dt;
    ft.y += ft.vy;
    if (ft.life <= 0) {
      floatingTexts.splice(i, 1);
      continue;
    }
    const alpha = Math.min(1, ft.life / 400);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = '800 12px "JetBrains Mono", monospace';
    ctx.fillStyle = ft.color;
    ctx.shadowColor = 'rgba(0,0,0,0.9)';
    ctx.shadowBlur = 5;
    ctx.textAlign = 'center';
    ctx.fillText(ft.text, ft.x, ft.y);
    ctx.restore();
  }
}

// ── Event Toast Notification ──────────────────
function showToast(msg) {
  if (!elEventToast || !elToastText) return;
  elToastText.textContent = msg;
  elEventToast.classList.remove('hidden');
  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    elEventToast.classList.add('hidden');
  }, 3500);
}

// ══════════════════════════════════════════════
//  GUN SYSTEM (Phím 3 - Bắn 🔫)
// ══════════════════════════════════════════════

function shootGun(targetX, targetY) {
  if (isSpectator || trapFrozenTimer > 0 || !running || paused) return;

  if (gunAmmo <= 0) {
    showToast('Bạn chưa có đạn! Hãy nhặt súng Plasma trên bản đồ.');
    return;
  }

  gunAmmo--;
  updateInventoryUI();

  const startX = player.x * CELL + CELL / 2;
  const startY = player.y * CELL + CELL / 2;

  let vx, vy;
  if (targetX !== undefined && targetY !== undefined) {
    const dx = targetX - startX;
    const dy = targetY - startY;
    const len = Math.hypot(dx, dy) || 1;
    vx = (dx / len) * GUN_BULLET_SPEED;
    vy = (dy / len) * GUN_BULLET_SPEED;
  } else {
    const bDir = { x: dir.x, y: dir.y };
    if (bDir.x === 0 && bDir.y === 0) {
      if (player && typeof player.angle === 'number') {
        bDir.x = Math.cos(player.angle);
        bDir.y = Math.sin(player.angle);
      } else {
        bDir.x = 1;
      }
    }
    vx = bDir.x * GUN_BULLET_SPEED;
    vy = bDir.y * GUN_BULLET_SPEED;
  }

  bullets.push({
    x: startX,
    y: startY,
    vx: vx,
    vy: vy,
    ownerSlot: mySlot,
    distTraveled: 0,
    trail: [],
  });

  spawnFloatingText('BẮN!', player.x, player.y, '#ffab40');

  // Subtle gun muzzle flash (No screen shake on gun shoot to prevent text jumping)

  if (isMultiplayer) {
    broadcastNetworkMessage({
      type: 'GUN_SHOT',
      slot: mySlot,
      x: startX,
      y: startY,
      vx: vx,
      vy: vy,
    });
  }
}

function updateBullets(dt) {
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    const speed = Math.hypot(b.vx, b.vy);
    const steps = Math.ceil(speed);

    for (let s = 0; s < steps; s++) {
      b.x += b.vx / steps;
      b.y += b.vy / steps;
      b.distTraveled += speed / steps;

      // Trail particles
      if (Math.random() < 0.5) {
        b.trail.push({ x: b.x, y: b.y, life: 200 });
      }

      // Remove old trail
      b.trail = b.trail.filter(t => { t.life -= dt / steps; return t.life > 0; });

      // Out of bounds
      if (b.x < 0 || b.x > CANVAS_PX || b.y < 0 || b.y > CANVAS_PX || b.distTraveled > GUN_BULLET_MAX_RANGE) {
        bullets.splice(i, 1);
        break;
      }

      const bulletGx = Math.floor(b.x / CELL);
      const bulletGy = Math.floor(b.y / CELL);
      const cellKey = `${bulletGx},${bulletGy}`;

      // Environmental interaction: bullets put out fire!
      if (spreadingFlames.has(cellKey)) {
        spreadingFlames.delete(cellKey);
        spawnSteam(bulletGx, bulletGy);
        spawnFloatingText('DẬP LỬA', bulletGx, bulletGy, '#38bdf8');
        bullets.splice(i, 1);
        break;
      }
      if (fireCells.has(cellKey)) {
        fireCells.delete(cellKey);
        spawnSteam(bulletGx, bulletGy);
        spawnFloatingText('DẬP LỬA', bulletGx, bulletGy, '#38bdf8');
        bullets.splice(i, 1);
        break;
      }

      // Check hit on other players (multiplayer only)
      if (isMultiplayer) {
        for (const rp of roomPlayers) {
          if (rp.slot === b.ownerSlot || !rp.isAlive) continue;

          if (rp.x === bulletGx && rp.y === bulletGy) {
            spawnExplosionParticles(bulletGx, bulletGy);
            spawnFloatingText('TRÚNG ĐÍCH!', bulletGx, bulletGy, '#ff1744');
            bullets.splice(i, 1);

            // Only the bullet shooter's client sends the hit event to avoid duplicate damage
            if (b.ownerSlot === mySlot) {
              showToast(`Bạn bắn trúng ${rp.name}! (-${GUN_BULLET_DAMAGE} HP)`);
              broadcastNetworkMessage({
                type: 'BULLET_HIT',
                victimSlot: rp.slot,
                shooterSlot: b.ownerSlot,
                damage: GUN_BULLET_DAMAGE,
              });
            }
            break;
          }
        }
        if (i >= bullets.length || !bullets[i]) break;
      }
    }
  }
}

function drawBullets() {
  for (const b of bullets) {
    // Draw trail
    for (const t of b.trail) {
      const alpha = t.life / 200;
      ctx.fillStyle = `rgba(255, 145, 0, ${alpha * 0.6})`;
      ctx.beginPath();
      ctx.arc(t.x, t.y, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw bullet
    ctx.save();
    ctx.shadowColor = '#ff9100';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#ffea00';
    ctx.beginPath();
    ctx.arc(b.x, b.y, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Inner glow
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(b.x, b.y, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ══════════════════════════════════════════════
//  DEPLOY TRAPS & STEALTH MINES (KEYS 1 & 2)
// ══════════════════════════════════════════════

function deployTrap() {
  // Solo mode: no traps
  if (!isMultiplayer) {
    showToast('Chế độ chơi đơn không có bẫy!');
    return;
  }
  if (trapCount <= 0 || isSpectator || trapFrozenTimer > 0) return;
  trapCount--;
  updateInventoryUI();

  const trap = {
    id: 'trap_' + Math.random().toString(36).substring(2, 8),
    x: Math.round(player.x),
    y: Math.round(player.y),
    ownerSlot: mySlot,
    ownerName: myPlayerName,
    armTimer: 1800,
    steppedOff: false,
  };
  placedTraps.push(trap);
  spawnFloatingText('ĐÃ ĐẶT BẪY', player.x, player.y, '#ffea00');

  if (isMultiplayer) {
    broadcastNetworkMessage({
      type: 'TRAP_DEPLOYED',
      trap: trap,
    });
  }
}

function deployMine() {
  // Solo mode: no mines
  if (!isMultiplayer) {
    showToast('Chế độ chơi đơn không có mìn!');
    return;
  }
  if (mineCount <= 0 || isSpectator || trapFrozenTimer > 0) return;
  mineCount--;
  updateInventoryUI();

  const mine = {
    id: 'mine_' + Math.random().toString(36).substring(2, 8),
    x: Math.round(player.x),
    y: Math.round(player.y),
    ownerSlot: mySlot,
    ownerName: myPlayerName,
    armTimer: 1800,
    steppedOff: false,
  };
  placedMines.push(mine);

  const alertText = isMultiplayer
    ? `${myPlayerName} vừa gài một quả Mìn Tàng Hình!`
    : `Bạn vừa gài Mìn Tàng Hình! Cẩn thận dẫm phải!`;
  showToast(alertText);
  spawnFloatingText('GÀI MÌN (ẨN)', player.x, player.y, '#ff5252');

  if (isMultiplayer) {
    broadcastNetworkMessage({
      type: 'MINE_DEPLOYED',
      mine: mine,
      announcer: myPlayerName,
    });
  }
}

function checkTrapsAndMinesTrigger() {
  if (isSpectator) return;

  for (let i = placedTraps.length - 1; i >= 0; i--) {
    const t = placedTraps[i];
    const isOwner = (t.ownerSlot === mySlot);

    if (isOwner && (!t.steppedOff || t.armTimer > 0)) continue;
    if (!isOwner && t.armTimer > 1400) continue;

    if (Math.hypot(player.x - t.x, player.y - t.y) < 0.65) {
      trapFrozenTimer = 3000;
      takeDamage(15, 'Bị dính bẫy sắt và tử nạn!');
      showToast('BẠN BỊ DÍNH BẪY! Bất động 3 giây!');
      spawnFloatingText('BỊ KẸP CHÂN', player.x, player.y, '#ffea00');
      placedTraps.splice(i, 1);

      if (isMultiplayer) {
        broadcastNetworkMessage({
          type: 'TRAP_TRIGGERED',
          trapId: t.id,
          victimSlot: mySlot,
        });
      }
      break;
    }
  }

  for (let i = placedMines.length - 1; i >= 0; i--) {
    const m = placedMines[i];
    const isOwner = (m.ownerSlot === mySlot);

    if (isOwner && (!m.steppedOff || m.armTimer > 0)) continue;
    if (!isOwner && m.armTimer > 1400) continue;

    if (Math.hypot(player.x - m.x, player.y - m.y) < 0.65) {
      explodeLandmine(m);
      placedMines.splice(i, 1);

      if (isMultiplayer) {
        broadcastNetworkMessage({
          type: 'MINE_EXPLODED',
          mineId: m.id,
          x: m.x,
          y: m.y,
        });
      }
      break;
    }
  }
}

function explodeLandmine(mine) {
  const mx = mine.x;
  const my = mine.y;

  spawnExplosionParticles(mx, my);
  triggerScreenShake(3.0, 220);

  const blastRadius = 2;
  const px = player.x;
  const py = player.y;

  if (Math.hypot(px - mx, py - my) <= blastRadius + 0.3) {
    takeDamage(50, 'Bị nổ tung bởi quả mìn tàng hình!');
    showToast('MÌN PHÁT NỔ LAN! Mất 50 HP!');
  }

  const cells = [];
  for (let dx = -blastRadius; dx <= blastRadius; dx++) {
    for (let dy = -blastRadius; dy <= blastRadius; dy++) {
      if (dx * dx + dy * dy <= blastRadius * blastRadius + 1) {
        const cx = mx + dx;
        const cy = my + dy;
        if (cx >= 0 && cx < GRID && cy >= 0 && cy < GRID) {
          cells.push({ x: cx, y: cy });
          burntGrass.set(`${cx},${cy}`, 8000);
        }
      }
    }
  }
  craters.push({ cells, timeLeft: 3500, flash: 1.0 });
}

// ══════════════════════════════════════════════
//  PICKUP ITEMS
// ══════════════════════════════════════════════

function spawnItem() {
  if (items.length >= 3) return;
  let ix, iy, tries = 0;
  do {
    ix = 1 + Math.floor(Math.random() * (GRID - 2));
    iy = 1 + Math.floor(Math.random() * (GRID - 2));
    tries++;
  } while (tries < 100 && (Math.abs(ix - player.x) < 2 && Math.abs(iy - player.y) < 2));

  let type;
  const rand = Math.random();

  if (!isMultiplayer) {
    // SOLO: Only hearts, guns, and coins (NO traps or mines!)
    if (rand < 0.40) type = 'heart';
    else if (rand < 0.75) type = 'gun';
    else type = 'coin';
  } else {
    // MULTIPLAYER: hearts, traps, mines, guns, coins
    if (rand < 0.25) type = 'heart';
    else if (rand < 0.45) type = 'trap';
    else if (rand < 0.65) type = 'mine';
    else if (rand < 0.85) type = 'gun';
    else type = 'coin';
  }

  items.push({ x: ix, y: iy, type, pulse: 0, life: 12000 });
}

function updateItems(dt) {
  if (isMultiplayer && !isHost) {
    for (const it of items) {
      it.pulse = (it.pulse || 0) + dt * 0.005;
      if (!isSpectator && Math.hypot(player.x - it.x, player.y - it.y) < 0.75) {
        collectItem(it);
      }
    }
    return;
  }

  itemTimer -= dt;
  if (itemTimer <= 0) {
    spawnItem();
    itemTimer = ITEM_SPAWN_INTERVAL * (0.8 + Math.random() * 0.5);
  }

  for (let i = items.length - 1; i >= 0; i--) {
    const it = items[i];
    it.pulse = (it.pulse || 0) + dt * 0.005;
    it.life -= dt;

    if (!isSpectator && Math.hypot(player.x - it.x, player.y - it.y) < 0.75) {
      collectItem(it);
      items.splice(i, 1);
      continue;
    }

    if (isMultiplayer) {
      let taken = false;
      for (const rp of roomPlayers) {
        if (rp.slot !== mySlot && rp.isAlive && Math.hypot((rp.x || 0) - it.x, (rp.y || 0) - it.y) < 0.75) {
          taken = true;
          break;
        }
      }
      if (taken) {
        items.splice(i, 1);
        continue;
      }
    }

    if (it.life <= 0) {
      items.splice(i, 1);
    }
  }
}

function collectItem(it) {
  bonusScore += 50;

  if (it.type === 'heart') {
    const healAmount = 30 + Math.floor(Math.random() * 21); // 30 đến 50 HP
    healHp(healAmount);
    spawnPickupParticles(it.x, it.y, '#00e676');
  } else if (it.type === 'trap') {
    trapCount = Math.min(3, trapCount + 1);
    updateInventoryUI();
    spawnFloatingText('+1 BẪY', it.x, it.y, '#ffea00');
    spawnPickupParticles(it.x, it.y, '#ffea00');
  } else if (it.type === 'mine') {
    mineCount = Math.min(3, mineCount + 1);
    updateInventoryUI();
    spawnFloatingText('+1 MÌN', it.x, it.y, '#ff1744');
    spawnPickupParticles(it.x, it.y, '#ff1744');
  } else if (it.type === 'gun') {
    // GUN: +1 bullet, stackable (no max limit)
    gunAmmo++;
    updateInventoryUI();
    spawnFloatingText('+1 ĐẠN', it.x, it.y, '#ffab40');
    spawnPickupParticles(it.x, it.y, '#ffab40');
    showToast(`Nhặt được súng! Đạn: ${gunAmmo} viên (Phím 3/F hoặc click để bắn)`);
  } else if (it.type === 'coin') {
    const coinsEarned = 15;
    playerCoins += coinsEarned;
    saveShopData();
    updateCoinDisplays();
    spawnFloatingText(`+${coinsEarned} XU`, it.x, it.y, '#ffd700');
    spawnPickupParticles(it.x, it.y, '#ffd700');
    showToast(`Nhặt được +${coinsEarned} Xu mua Skin!`);
  }
}

function spawnPickupParticles(gx, gy, color) {
  const cx = gx * CELL + CELL / 2;
  const cy = gy * CELL + CELL / 2;
  for (let i = 0; i < 20; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 3.5;
    particles.push({
      x: cx, y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 2 + Math.random() * 3,
      color: color,
      life: 400 + Math.random() * 200,
      maxLife: 600,
    });
  }
}

// ══════════════════════════════════════════════
//  1. NÚI LỬA & LỬA ĐỐT LAN
// ══════════════════════════════════════════════

function startFireWave() {
  const dirs = ['left', 'right', 'top', 'bottom', 'diag-tl', 'diag-tr', 'diag-bl', 'diag-br'];
  const d = dirs[Math.floor(Math.random() * dirs.length)];
  const isDiag = d.startsWith('diag');

  const isFullSweep = Math.random() < 0.45;
  const maxDistance = isDiag
    ? (isFullSweep ? (GRID - 1) * 2 : Math.floor(GRID * (0.65 + Math.random() * 0.55)))
    : (isFullSweep ? (GRID - 1) : Math.floor(GRID * (0.35 + Math.random() * 0.35)));

  fireWave = {
    dir: d,
    isDiag: isDiag,
    state: 'warning',
    stateTime: 0,
    frontPos: -1,
    maxDistance: maxDistance,
    isFullSweep: isFullSweep,
    sweepAcc: 0,
    thickness: isDiag ? 4 : 3,
  };

  // "lúc núi lửa xảy ra thì lâu lâu có mưa sấm chớp xảy hoặc không"
  // Dynamic chance (42%): Volcanic storm combines eruption with sudden lightning & rain
  const triggerStorm = Math.random() < 0.42;
  if (triggerStorm && !thunderstorm) {
    setTimeout(() => {
      if (running && !thunderstorm) {
        startThunderstorm();
        showToast('THIÊN TAI KÉP: Núi Lửa kèm Mưa Bão Sấm Chớp!');
      }
    }, 1800);
  }
}

function updateFireWave(dt) {
  for (const [key, time] of burntGrass.entries()) {
    const nextTime = time - dt;
    if (nextTime <= 0) burntGrass.delete(key);
    else burntGrass.set(key, nextTime);
  }

  updateSpreadingFlames(dt);

  if (isMultiplayer && !isHost) return;

  if (!fireWave) {
    fireTimer -= dt;
    if (fireTimer <= 0) {
      startFireWave();
      fireTimer = FIRE_INTERVAL_MIN + Math.random() * (FIRE_INTERVAL_MAX - FIRE_INTERVAL_MIN);
    }
    return;
  }

  fireWave.stateTime += dt;

  if (fireWave.state === 'warning') {
    if (fireWave.stateTime >= FIRE_WARN_TIME) {
      fireWave.state = 'sweeping';
      fireWave.stateTime = 0;
      fireWave.frontPos = 0;
      fireWave.emberTimer = 0;
      // "núi lửa tràn qua thêm random vài chỗ có lửa"
      // Khi núi lửa bắt đầu tràn qua, văng dung nham tạo ngẫu nhiên 3-5 đốm lửa bốc cháy trên sân
      spawnRandomVolcanoFire(3 + Math.floor(Math.random() * 3));
    }
    return;
  }

  if (fireWave.state === 'sweeping') {
    fireWave.sweepAcc += dt;
    while (fireWave.sweepAcc >= FIRE_SWEEP_SPEED) {
      fireWave.sweepAcc -= FIRE_SWEEP_SPEED;
      fireWave.frontPos++;
    }

    // Đốm lửa tàn tích núi lửa liên tục rơi ngẫu nhiên vài chỗ trong suốt quá trình quét
    fireWave.emberTimer = (fireWave.emberTimer || 0) + dt;
    if (fireWave.emberTimer >= 360) {
      fireWave.emberTimer -= 360;
      spawnRandomVolcanoFire(1 + (Math.random() < 0.45 ? 1 : 0));
    }

    fireCells = new Set();
    const fw = fireWave;

    for (let offset = 0; offset < fw.thickness; offset++) {
      const pos = fw.frontPos - offset;
      if (pos < 0 || pos > fw.maxDistance) continue;

      if (!fw.isDiag) {
        for (let r = 0; r < GRID; r++) {
          let gx, gy;
          if (fw.dir === 'left')       { gx = pos; gy = r; }
          else if (fw.dir === 'right') { gx = GRID - 1 - pos; gy = r; }
          else if (fw.dir === 'top')   { gx = r; gy = pos; }
          else                         { gx = r; gy = GRID - 1 - pos; }

          const key = `${gx},${gy}`;
          fireCells.add(key);

          if (Math.random() < 0.12 && spreadingFlames.size < 20) {
            if (!spreadingFlames.has(key) && !puddleCells.has(key)) {
              spreadingFlames.set(key, {
                x: gx, y: gy,
                life: 3800 + Math.random() * 2500, maxLife: 6500,
                gen: 0,
                spreadTimer: 700 + Math.random() * 400
              });
            }
          }
          burntGrass.set(key, 12000);
        }
      } else {
        for (let i = 0; i < GRID; i++) {
          let gx, gy;
          if (fw.dir === 'diag-tl') { gx = i; gy = pos - i; }
          else if (fw.dir === 'diag-tr') { gx = GRID - 1 - i; gy = pos - i; }
          else if (fw.dir === 'diag-bl') { gx = i; gy = GRID - 1 - (pos - i); }
          else { gx = GRID - 1 - i; gy = GRID - 1 - (pos - i); }

          if (gx >= 0 && gx < GRID && gy >= 0 && gy < GRID) {
            const key = `${gx},${gy}`;
            fireCells.add(key);

            if (Math.random() < 0.12 && spreadingFlames.size < 20) {
              if (!spreadingFlames.has(key) && !puddleCells.has(key)) {
                spreadingFlames.set(key, {
                  x: gx, y: gy,
                  life: 3800 + Math.random() * 2500, maxLife: 6500,
                  gen: 0,
                  spreadTimer: 700 + Math.random() * 400
                });
              }
            }
            burntGrass.set(key, 12000);
          }
        }
      }
    }

    if (fw.frontPos >= fw.maxDistance) {
      fireWave.state = 'burning';
      fireWave.stateTime = 0;
      // Khi sóng dung nham tràn qua hết, để lại thêm vài đốm lửa tàn tích cháy rực khắp sân
      spawnRandomVolcanoFire(2 + Math.floor(Math.random() * 3));
    }
    return;
  }

  if (fireWave.state === 'burning') {
    fireWave.emberTimer = (fireWave.emberTimer || 0) + dt;
    if (fireWave.emberTimer >= 600) {
      fireWave.emberTimer -= 600;
      spawnRandomVolcanoFire(1);
    }

    if (fireWave.stateTime >= FIRE_BURN_TIME) {
      fireWave = null;
      fireCells = new Set();
    }
  }
}

function updateSpreadingFlames(dt) {
  const newFlames = [];

  for (const [key, f] of spreadingFlames.entries()) {
    f.life -= dt;
    f.spreadTimer -= dt;

    if (f.spreadTimer <= 0 && f.gen < 1 && spreadingFlames.size < 20) {
      f.spreadTimer = 1200 + Math.random() * 600;

      if (Math.random() < 0.12) {
        const dirs = [{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}];
        const ad = dirs[Math.floor(Math.random() * dirs.length)];
        const nx = f.x + ad.x;
        const ny = f.y + ad.y;
        const nKey = `${nx},${ny}`;

        if (nx >= 0 && nx < GRID && ny >= 0 && ny < GRID) {
          if (!puddleCells.has(nKey) && !spreadingFlames.has(nKey)) {
            newFlames.push({
              key: nKey,
              data: { x: nx, y: ny, life: 3200, maxLife: 3200, gen: f.gen + 1, spreadTimer: 99999 }
            });
            burntGrass.set(nKey, 8000);
            spawnFireSparks(nx, ny);
          }
        }
      }
    }

    if (f.life <= 0) spreadingFlames.delete(key);
  }

  for (const nf of newFlames) {
    if (!spreadingFlames.has(nf.key) && spreadingFlames.size < 20) {
      spreadingFlames.set(nf.key, nf.data);
    }
  }
}

// ── Random Volcanic Fire Spots ("núi lửa tràn qua thêm random vài chỗ có lửa") ──
function spawnRandomVolcanoFire(count = 1) {
  if (spreadingFlames.size >= 20) return;

  for (let c = 0; c < count; c++) {
    let rx, ry, tries = 0;
    let found = false;
    do {
      rx = Math.floor(Math.random() * GRID);
      ry = Math.floor(Math.random() * GRID);
      const key = `${rx},${ry}`;
      // Giữ khoảng cách an toàn nhẹ với người chơi để không bị nổ lửa ngay chân
      const pDist = (player && typeof player.x === 'number') ? Math.hypot(rx - player.x, ry - player.y) : 5;

      if (!puddleCells.has(key) && !spreadingFlames.has(key) && !fireCells.has(key) && pDist > 1.8) {
        found = true;
        spreadingFlames.set(key, {
          x: rx,
          y: ry,
          life: 4500 + Math.random() * 3200, // Cháy từ 4.5s đến 7.7s
          maxLife: 7700,
          gen: 0,
          isVolcanoEmber: true,
          spreadTimer: 1400 + Math.random() * 800
        });
        burntGrass.set(key, 16000);
        spawnFireSparks(rx, ry);
        spawnVolcanoEmberArc(rx, ry);
        break;
      }
      tries++;
    } while (tries < 40);
  }
}

function spawnVolcanoEmberArc(gx, gy) {
  const targetX = gx * CELL + CELL / 2;
  const targetY = gy * CELL + CELL / 2;
  const startX = targetX + (Math.random() - 0.5) * 50;
  const startY = targetY - (35 + Math.random() * 45);

  for (let i = 0; i < 4; i++) {
    particles.push({
      x: startX,
      y: startY,
      vx: (targetX - startX) * 0.08 + (Math.random() - 0.5) * 1.5,
      vy: (targetY - startY) * 0.08 + (Math.random() - 0.5) * 1.5,
      size: 2.2 + Math.random() * 2,
      color: Math.random() < 0.6 ? '#ff3d00' : '#ffea00',
      life: 280 + Math.random() * 200,
      maxLife: 480,
    });
  }
}

function spawnFireSparks(gx, gy) {
  const cx = gx * CELL + CELL / 2;
  const cy = gy * CELL + CELL / 2;
  for (let i = 0; i < 4; i++) {
    particles.push({
      x: cx + (Math.random() - 0.5) * 12,
      y: cy + (Math.random() - 0.5) * 12,
      vx: (Math.random() - 0.5) * 1.5,
      vy: -1 - Math.random() * 2,
      size: 1.5 + Math.random() * 2,
      color: Math.random() < 0.5 ? '#ff6e40' : '#ffea00',
      life: 400 + Math.random() * 250,
      maxLife: 650,
    });
  }
}

// ══════════════════════════════════════════════
//  2. BÃO SẤM CHỚP, MƯA & VŨNG NƯỚC NHIỄM ĐIỆN
// ══════════════════════════════════════════════

function startThunderstorm() {
  const zones = [];
  const numZones = 1 + (Math.random() < 0.5 ? 1 : 0);

  for (let z = 0; z < numZones; z++) {
    let cx, cy, tries = 0;
    do {
      cx = 2 + Math.floor(Math.random() * (GRID - 4));
      cy = 2 + Math.floor(Math.random() * (GRID - 4));
      tries++;
    } while (tries < 50 && (Math.abs(cx - player.x) < 3 && Math.abs(cy - player.y) < 3));

    const cells = [];
    const radius = 1 + (Math.random() < 0.5 ? 1 : 0);
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        if (Math.abs(dx) + Math.abs(dy) <= radius + 1) {
          const gx = cx + dx;
          const gy = cy + dy;
          if (gx >= 0 && gx < GRID && gy >= 0 && gy < GRID) {
            cells.push({ x: gx, y: gy });
          }
        }
      }
    }
    zones.push({ cx, cy, cells });
  }

  raindrops = [];
  for (let i = 0; i < 55; i++) {
    raindrops.push({
      x: Math.random() * CANVAS_PX,
      y: Math.random() * CANVAS_PX,
      l: 10 + Math.random() * 12,
      speed: 13 + Math.random() * 8,
    });
  }

  electrifiedPuddles = new Set();
  const numSeeds = 4 + Math.floor(Math.random() * 3);
  for (let s = 0; s < numSeeds; s++) {
    const px = Math.floor(Math.random() * GRID);
    const py = Math.floor(Math.random() * GRID);
    puddleCells.add(`${px},${py}`);
  }

  thunderstorm = {
    state: 'warning',
    stateTime: 0,
    targetZones: zones,
    flashAlpha: 0,
  };
}

function spreadWaterPuddles() {
  if (puddleCells.size >= 45) return;
  const newPuddles = new Set(puddleCells);
  const dirs = [{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}];

  for (const p of puddleCells) {
    if (Math.random() < 0.45) {
      const [px, py] = p.split(',').map(Number);
      const d = dirs[Math.floor(Math.random() * dirs.length)];
      const nx = px + d.x;
      const ny = py + d.y;
      if (nx >= 0 && nx < GRID && ny >= 0 && ny < GRID) {
        newPuddles.add(`${nx},${ny}`);
      }
    }
  }

  if (Math.random() < 0.3) {
    const rx = Math.floor(Math.random() * GRID);
    const ry = Math.floor(Math.random() * GRID);
    newPuddles.add(`${rx},${ry}`);
  }

  puddleCells = newPuddles;
}

function updateThunderstorm(dt) {
  if (thunderstorm && spreadingFlames.size > 0) {
    const extinguished = [];
    for (const [key, f] of spreadingFlames.entries()) {
      const hasWater = puddleCells.has(key);
      const rainDouse = Math.random() < (dt / 1000) * 0.55;

      if (hasWater || rainDouse) {
        extinguished.push({ key, x: f.x, y: f.y });
      }
    }

    for (const ex of extinguished) {
      spreadingFlames.delete(ex.key);
      spawnSteam(ex.x, ex.y);
      burntGrass.set(ex.key, 5000);
    }
  }

  if (isMultiplayer && !isHost) return;

  if (!thunderstorm) {
    thunderTimer -= dt;
    if (thunderTimer <= 0) {
      startThunderstorm();
      thunderTimer = THUNDER_INTERVAL_MIN + Math.random() * (THUNDER_INTERVAL_MAX - THUNDER_INTERVAL_MIN);
    }
    return;
  }

  thunderstorm.stateTime += dt;

  for (const r of raindrops) {
    r.y += r.speed;
    r.x -= 2;
    if (r.y > CANVAS_PX) {
      r.y = -15;
      r.x = Math.random() * (CANVAS_PX + 40);
    }
  }

  puddleSpreadAcc += dt;
  if (puddleSpreadAcc >= 800) {
    puddleSpreadAcc = 0;
    spreadWaterPuddles();
  }

  if (thunderstorm.state === 'warning') {
    if (thunderstorm.stateTime >= THUNDER_WARN_TIME) {
      thunderstorm.state = 'striking';
      thunderstorm.stateTime = 0;
      thunderstorm.flashAlpha = 0.85;

      triggerScreenShake(2.5, 200);

      electrifiedPuddles = new Set();
      let hitWater = false;

      for (const z of thunderstorm.targetZones) {
        spawnElectricSparks(z.cx, z.cy);
        for (const c of z.cells) {
          if (puddleCells.has(`${c.x},${c.y}`)) hitWater = true;
        }
      }

      if (hitWater || puddleCells.size > 0) {
        for (const p of puddleCells) electrifiedPuddles.add(p);
      }
    }
    return;
  }

  if (thunderstorm.state === 'striking') {
    thunderstorm.flashAlpha = Math.max(0, thunderstorm.flashAlpha - dt * 0.003);

    if (thunderstorm.stateTime >= THUNDER_STRIKE_TIME) {
      thunderstorm.state = 'electrified';
      thunderstorm.stateTime = 0;
      lightningCells = new Set();
      for (const z of thunderstorm.targetZones) {
        for (const c of z.cells) lightningCells.add(`${c.x},${c.y}`);
      }
    }
    return;
  }

  if (thunderstorm.state === 'electrified') {
    if (thunderstorm.stateTime >= THUNDER_SHOCK_TIME) {
      lightningCells = new Set();
      electrifiedPuddles = new Set();
      puddleCells = new Set();
      thunderstorm = null;
      raindrops = [];
    }
  }
}

function spawnSteam(gx, gy) {
  const cx = gx * CELL + CELL / 2;
  const cy = gy * CELL + CELL / 2;
  for (let i = 0; i < 12; i++) {
    particles.push({
      x: cx + (Math.random() - 0.5) * 16,
      y: cy + (Math.random() - 0.5) * 16,
      vx: (Math.random() - 0.5) * 1.2,
      vy: -1.2 - Math.random() * 1.5,
      size: 3.5 + Math.random() * 4,
      color: 'rgba(240, 248, 255, 0.75)',
      life: 500 + Math.random() * 300,
      maxLife: 800,
    });
  }
}

function spawnElectricSparks(gx, gy) {
  const cx = gx * CELL + CELL / 2;
  const cy = gy * CELL + CELL / 2;
  const colors = ['#40c4ff', '#80d8ff', '#ffea00', '#ffffff'];
  for (let i = 0; i < 30; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 4;
    particles.push({
      x: cx, y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 2.5 + Math.random() * 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      life: 400 + Math.random() * 300,
      maxLife: 700,
    });
  }
}

// ══════════════════════════════════════════════
//  3. LỐC XOÁY (Tornado 🌪️)
// ══════════════════════════════════════════════

function startTornado() {
  const quadrants = [
    { x: CELL * 3.5, y: CELL * 3.5, wander: 0.6 },
    { x: CANVAS_PX - CELL * 3.5, y: CANVAS_PX - CELL * 3.5, wander: 3.7 },
    { x: CANVAS_PX - CELL * 3.5, y: CELL * 3.5, wander: 2.2 },
    { x: CELL * 3.5, y: CANVAS_PX - CELL * 3.5, wander: 5.3 },
  ].sort(() => Math.random() - 0.5);

  const count = Math.min(3, Math.max(2, Math.floor(Math.random() * 2) + 2)); // 2 or 3 tornadoes
  tornadoes = [];
  tornadoConvergenceTimer = 0;
  isTornadoConverging = false;

  for (let i = 0; i < count; i++) {
    const q = quadrants[i % quadrants.length];
    tornadoes.push({
      id: i,
      x: q.x + (Math.random() - 0.5) * CELL,
      y: q.y + (Math.random() - 0.5) * CELL,
      vx: Math.cos(q.wander) * 1.3,
      vy: Math.sin(q.wander) * 1.3,
      state: 'warning',
      stateTime: 0,
      angle: Math.random() * Math.PI,
      wanderAngle: q.wander,
      patrolAngle: i * (Math.PI * 2 / count),
    });
  }
  tornado = tornadoes[0] || null;
}

function updateTornado(dt) {
  if (isMultiplayer && !isHost) {
    for (const t of tornadoes) t.angle += dt * 0.015;
    return;
  }

  if (tornadoes.length === 0) {
    tornadoTimer -= dt;
    if (tornadoTimer <= 0) {
      startTornado();
      tornadoTimer = TORNADO_INTERVAL_MIN + Math.random() * (TORNADO_INTERVAL_MAX - TORNADO_INTERVAL_MIN);
    }
    return;
  }

  // "Lốc xoáy xảy ra có thể tản ra đừng bao giờ đi chụm, chỉ lâu lâu nó dính chụm thôi"
  // Dynamic cycle: 85% of time they strongly disperse/spread out; every ~16s for 2.8s they briefly converge
  tornadoConvergenceTimer += dt;
  if (tornadoConvergenceTimer > 15500 && tornadoConvergenceTimer <= 18300) {
    if (!isTornadoConverging) {
      isTornadoConverging = true;
      showToast('CƠN BÃO HỢP LỰC! Các cơn lốc đang hút vào nhau!');
    }
  } else if (tornadoConvergenceTimer > 18300) {
    // Violent explosive repulsion when clumping ends
    if (isTornadoConverging) {
      isTornadoConverging = false;
      tornadoConvergenceTimer = 0;
      triggerScreenShake(2.0, 180);
      for (const t of tornadoes) {
        t.vx *= -2.2;
        t.vy *= -2.2;
      }
    }
  }

  let allDone = true;
  for (let i = 0; i < tornadoes.length; i++) {
    const t = tornadoes[i];
    t.stateTime += dt;
    t.angle += dt * 0.015;

    if (t.state === 'warning') {
      allDone = false;
      if (t.stateTime >= TORNADO_WARN_TIME) {
        t.state = 'active';
        t.stateTime = 0;
        if (i === 0) {
          triggerScreenShake(1.6, 140);
        }
      }
      continue;
    }

    if (t.state === 'active') {
      if (t.stateTime < TORNADO_DURATION) allDone = false;
      else continue;

      // 1. Separation / Anti-Clustering Force (Never cluster during normal roaming)
      for (let j = 0; j < tornadoes.length; j++) {
        if (i === j) continue;
        const other = tornadoes[j];
        const tdx = t.x - other.x;
        const tdy = t.y - other.y;
        const tdist = Math.hypot(tdx, tdy) || 1;

        if (!isTornadoConverging) {
          // Normal: Strong repulsion force so tornadoes disperse across the entire map
          const SEPARATION_DIST = 230;
          if (tdist < SEPARATION_DIST) {
            const repel = Math.pow(1 - tdist / SEPARATION_DIST, 1.4) * 0.18;
            t.vx += (tdx / tdist) * repel;
            t.vy += (tdy / tdist) * repel;
          }
        } else {
          // Occasional brief clumping ("lâu lâu dính chụm thôi")
          const pull = 0.045;
          t.vx -= (tdx / tdist) * pull;
          t.vy -= (tdy / tdist) * pull;

          // Electric plasma sparks bridging tornadoes
          if (Math.random() < 0.25 && particles.length < 90) {
            particles.push({
              x: t.x + (Math.random() - 0.5) * 16,
              y: t.y + (Math.random() - 0.5) * 16,
              vx: -(tdx / tdist) * 2.2,
              vy: -(tdy / tdist) * 2.2,
              size: 2.2,
              color: '#00e5ff',
              life: 180,
              maxLife: 180,
            });
          }
        }
      }

      // 2. Independent wandering heading (each tornado roams differently)
      t.wanderAngle = (t.wanderAngle || 0) + (Math.random() - 0.5) * 0.22;
      t.vx += Math.cos(t.wanderAngle) * 0.035;
      t.vy += Math.sin(t.wanderAngle) * 0.035;

      // 3. Gentle player tracking with patrol offset (does not overpower separation)
      const offsetAngle = t.patrolAngle + performance.now() * 0.0008;
      let targetX = (player.x * CELL + CELL / 2) + Math.cos(offsetAngle) * 75;
      let targetY = (player.y * CELL + CELL / 2) + Math.sin(offsetAngle) * 75;

      if (isMultiplayer) {
        let minDist = 99999;
        for (const rp of roomPlayers) {
          if (rp.isAlive) {
            const rpx = (rp.x || 0) * CELL + CELL / 2 + Math.cos(offsetAngle) * 75;
            const rpy = (rp.y || 0) * CELL + CELL / 2 + Math.sin(offsetAngle) * 75;
            const d = Math.hypot(rpx - t.x, rpy - t.y);
            if (d < minDist) { minDist = d; targetX = rpx; targetY = rpy; }
          }
        }
      }

      const dx = targetX - t.x;
      const dy = targetY - t.y;
      const dist = Math.hypot(dx, dy) || 1;

      // Gentle homing bias
      t.vx += (dx / dist) * 0.016;
      t.vy += (dy / dist) * 0.016;

      const speed = Math.hypot(t.vx, t.vy);
      const maxSpd = isTornadoConverging ? 2.4 : 1.75;
      if (speed > maxSpd) { t.vx = (t.vx / speed) * maxSpd; t.vy = (t.vy / speed) * maxSpd; }

      t.x += t.vx * (dt / 16);
      t.y += t.vy * (dt / 16);

      // Bounce smoothly off boundaries
      if (t.x < CELL * 1.5) { t.x = CELL * 1.5; t.vx = Math.abs(t.vx); }
      if (t.x > CANVAS_PX - CELL * 1.5) { t.x = CANVAS_PX - CELL * 1.5; t.vx = -Math.abs(t.vx); }
      if (t.y < CELL * 1.5) { t.y = CELL * 1.5; t.vy = Math.abs(t.vy); }
      if (t.y > CANVAS_PX - CELL * 1.5) { t.y = CANVAS_PX - CELL * 1.5; t.vy = -Math.abs(t.vy); }

      if (Math.random() < 0.28 && particles.length < 80) {
        const pAngle = Math.random() * Math.PI * 2;
        const pDist = 8 + Math.random() * 22;
        particles.push({
          x: t.x + Math.cos(pAngle) * pDist,
          y: t.y + Math.sin(pAngle) * pDist,
          vx: Math.cos(pAngle + Math.PI / 2) * 1.6,
          vy: Math.sin(pAngle + Math.PI / 2) * 1.6,
          size: 2 + Math.random() * 2.5,
          color: isTornadoConverging ? '#00e5ff' : (Math.random() < 0.5 ? '#cfd8dc' : '#b0bec5'),
          life: 250,
          maxLife: 250,
        });
      }
    }
  }

  if (allDone) { tornadoes = []; tornado = null; isTornadoConverging = false; }
  else { tornado = tornadoes[0] || null; }
}

// ══════════════════════════════════════════════
//  4. SỤT LỞ ĐẤT (Landslides)
// ══════════════════════════════════════════════

function startLandslide() {
  const numZones = 2 + Math.floor(Math.random() * 3);
  const zones = [];

  for (let z = 0; z < numZones; z++) {
    let cx, cy, tries = 0;
    do {
      cx = 2 + Math.floor(Math.random() * (GRID - 4));
      cy = 2 + Math.floor(Math.random() * (GRID - 4));
      tries++;
    } while (tries < 50 && (Math.abs(cx - player.x) < 3 && Math.abs(cy - player.y) < 3));

    const cells = [];
    const radius = 1 + (Math.random() < 0.5 ? 1 : 0);
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        if (Math.abs(dx) + Math.abs(dy) <= radius + 1) {
          const gx = cx + dx;
          const gy = cy + dy;
          if (gx >= 0 && gx < GRID && gy >= 0 && gy < GRID) cells.push({ x: gx, y: gy });
        }
      }
    }
    zones.push({ cx, cy, cells });
  }

  landslide = { state: 'warning', stateTime: 0, zones: zones };
}

function updateLandslide(dt) {
  if (isMultiplayer && !isHost) return;

  if (!landslide) {
    landslideTimer -= dt;
    if (landslideTimer <= 0) {
      startLandslide();
      landslideTimer = LANDSLIDE_INTERVAL_MIN + Math.random() * (LANDSLIDE_INTERVAL_MAX - LANDSLIDE_INTERVAL_MIN);
    }
    return;
  }

  landslide.stateTime += dt;

  if (landslide.state === 'warning') {
    if (landslide.stateTime >= LANDSLIDE_WARN_TIME) {
      landslide.state = 'collapsed';
      landslide.stateTime = 0;

      triggerScreenShake(2.0, 180);

      sinkholeCells = new Set();
      for (const z of landslide.zones) {
        for (const c of z.cells) sinkholeCells.add(`${c.x},${c.y}`);
        spawnEarthDust(z.cx, z.cy);
      }
    }
    return;
  }

  if (landslide.state === 'collapsed') {
    if (landslide.stateTime >= LANDSLIDE_COLLAPSE_TIME) {
      sinkholeCells = new Set();
      landslide = null;
    }
  }
}

function spawnEarthDust(gx, gy) {
  const cx = gx * CELL + CELL / 2;
  const cy = gy * CELL + CELL / 2;
  const colors = ['#4e342e', '#5d4037', '#6d4c41', '#8d6e63'];
  for (let i = 0; i < 25; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1.5 + Math.random() * 3;
    particles.push({
      x: cx, y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 3 + Math.random() * 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      life: 500 + Math.random() * 300,
      maxLife: 800,
    });
  }
}

// ══════════════════════════════════════════════
//  5. BOM HẸN GIỜ (Bombs)
// ══════════════════════════════════════════════

function startBombEvent() {
  const numBombs = 1 + (Math.random() < 0.5 ? 1 : 0) + (survivalTime > 25 && Math.random() < 0.35 ? 1 : 0);

  // Divide map into 4 quadrants for wide dispersal across the arena
  const sectors = [
    { minX: 1, maxX: 8,  minY: 1, maxY: 8 },
    { minX: 11, maxX: 18, minY: 1, maxY: 8 },
    { minX: 1, maxX: 8,  minY: 11, maxY: 18 },
    { minX: 11, maxX: 18, minY: 11, maxY: 18 },
  ].sort(() => Math.random() - 0.5);

  for (let i = 0; i < numBombs; i++) {
    const sec = sectors[i % sectors.length];
    let bx = 0, by = 0, tries = 0;
    let found = false;

    while (tries < 120 && !found) {
      tries++;
      bx = Math.floor(sec.minX + Math.random() * (sec.maxX - sec.minX + 1));
      by = Math.floor(sec.minY + Math.random() * (sec.maxY - sec.minY + 1));

      // Must be at least 3.2 cells away from player
      if (Math.hypot(bx - player.x, by - player.y) < 3.2) continue;

      // "bom nổ cũng tản ra nổ random tùy chỗ đừng dính chụm"
      // Must be strictly separated from ALL other bombs (minimum 7.0 cells)
      let tooClose = false;
      for (const eb of bombs) {
        if (Math.hypot(bx - eb.x, by - eb.y) < 6.8) {
          tooClose = true;
          break;
        }
      }
      if (!tooClose) found = true;
    }

    if (!found) {
      // Fallback
      bx = Math.floor(1 + Math.random() * (GRID - 2));
      by = Math.floor(1 + Math.random() * (GRID - 2));
    }

    // Stagger fuse times randomly so they explode independently at different seconds
    const staggeredFuse = BOMB_FUSE_TIME + (i * 1200) + (Math.random() - 0.5) * 1400;

    bombs.push({
      x: bx,
      y: by,
      state: 'ticking',
      stateTime: 0,
      fuseTime: Math.max(3200, staggeredFuse),
    });
  }
}

function explodeBomb(bomb) {
  bomb.state = 'exploding';
  bomb.stateTime = 0;

  const bx = bomb.x + 0.5;
  const by = bomb.y + 0.5;

  // 1. Instant explosive blast damage & knockback (Real explosion, NOT fire!)
  if (!isSpectator && running) {
    const pDist = Math.hypot(player.x - bx, player.y - by);
    if (pDist <= BOMB_BLAST_RADIUS) {
      const blastDamage = Math.round(55 - pDist * 8);
      takeDamage(blastDamage, 'Bị nổ tung bởi sóng xung kích quả bom!');
      spawnFloatingText(`NỔ BOM! (-${blastDamage} HP)`, player.x, player.y, '#ff1744');

      if (pDist > 0.05) {
        const knockAngle = Math.atan2(player.y - by, player.x - bx);
        const knockDist = (BOMB_BLAST_RADIUS - pDist + 0.5) * 1.05;
        player.x += Math.cos(knockAngle) * knockDist;
        player.y += Math.sin(knockAngle) * knockDist;
        player.x = (player.x + GRID) % GRID;
        player.y = (player.y + GRID) % GRID;
      }
    }
  }

  // 2. High-speed visual shockwave ring
  shockwaves.push({
    x: bx * CELL,
    y: by * CELL,
    r: 6,
    maxR: BOMB_BLAST_RADIUS * CELL,
    life: 380,
    maxLife: 380,
  });

  // 3. Scorched charred crater (not fire, purely scorched blast earth)
  const cells = [];
  for (let dx = -BOMB_BLAST_RADIUS; dx <= BOMB_BLAST_RADIUS; dx++) {
    for (let dy = -BOMB_BLAST_RADIUS; dy <= BOMB_BLAST_RADIUS; dy++) {
      if (dx * dx + dy * dy <= BOMB_BLAST_RADIUS * BOMB_BLAST_RADIUS + 0.5) {
        const cx = Math.floor(bomb.x + dx);
        const cy = Math.floor(bomb.y + dy);
        if (cx >= 0 && cx < GRID && cy >= 0 && cy < GRID) cells.push({ x: cx, y: cy });
      }
    }
  }

  craters.push({ cells, timeLeft: BOMB_CRATER_DURATION, flash: 1.0 });
  spawnExplosionParticles(bomb.x, bomb.y);

  triggerScreenShake(3.2, 220);
}

function spawnExplosionParticles(gx, gy) {
  const cx = gx * CELL + CELL / 2;
  const cy = gy * CELL + CELL / 2;
  const colors = ['#f8fafc', '#ffea00', '#ff9100', '#ff1744', '#475569', '#1e293b'];
  for (let i = 0; i < 26; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2.5 + Math.random() * 5;
    particles.push({
      x: cx, y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 3 + Math.random() * 3.5,
      color: colors[Math.floor(Math.random() * colors.length)],
      life: 380 + Math.random() * 300,
      maxLife: 680,
    });
  }
}

function updateBombs(dt) {
  if (isMultiplayer && !isHost) return;

  bombTimer -= dt;
  if (bombTimer <= 0) {
    startBombEvent();
    bombTimer = BOMB_INTERVAL_MIN + Math.random() * (BOMB_INTERVAL_MAX - BOMB_INTERVAL_MIN);
  }

  for (let i = bombs.length - 1; i >= 0; i--) {
    const b = bombs[i];
    b.stateTime += dt;
    if (b.state === 'ticking' && b.stateTime >= b.fuseTime) explodeBomb(b);
    if (b.state === 'exploding' && b.stateTime >= 400) bombs.splice(i, 1);
  }

  for (let i = craters.length - 1; i >= 0; i--) {
    const c = craters[i];
    c.timeLeft -= dt;
    c.flash = Math.max(0, c.flash - dt * 0.003);
    if (c.timeLeft <= 0) craters.splice(i, 1);
  }
}

// ── Warning Banners ───────
function updateWarningBanners() {
  const warnings = [];

  if (fireWave && fireWave.state === 'warning') {
    const sec = Math.max(0, (FIRE_WARN_TIME - fireWave.stateTime) / 1000).toFixed(1);
    const scope = fireWave.isDiag ? (fireWave.isFullSweep ? 'CHÉO TOÀN SÂN' : 'QUÉT CHÉO') : (fireWave.isFullSweep ? 'QUÉT HẾT SÂN' : `${fireWave.maxDistance} Ô`);
    warnings.push(`NÚI LỬA (${scope}) [${sec}s]`);
  }
  if (thunderstorm && thunderstorm.state === 'warning') {
    const sec = Math.max(0, (THUNDER_WARN_TIME - thunderstorm.stateTime) / 1000).toFixed(1);
    warnings.push(`BÃO SẤM CHỚP & MƯA [${sec}s]`);
  }
  const warnTornado = tornadoes.find(t => t.state === 'warning');
  if (warnTornado) {
    const sec = Math.max(0, (TORNADO_WARN_TIME - warnTornado.stateTime) / 1000).toFixed(1);
    const countText = tornadoes.length > 1 ? ` (${tornadoes.length} CƠN LỐC TẢN RỘNG)` : '';
    warnings.push(`LỐC XOÁY${countText} [${sec}s]`);
  }
  if (landslide && landslide.state === 'warning') {
    const sec = Math.max(0, (LANDSLIDE_WARN_TIME - landslide.stateTime) / 1000).toFixed(1);
    warnings.push(`SỤT LỞ ${landslide.zones.length} VÙNG [${sec}s]`);
  }

  if (warnings.length > 0) showWarning('[CẢNH BÁO HIỂM HỌA] ' + warnings.join(' | '));
  else hideWarning();
}

function showWarning(text) {
  elWarnText.textContent = text;
  elWarn.classList.remove('hidden');
}
function hideWarning() {
  elWarn.classList.add('hidden');
}

// ── Game loop (Optimized 60 FPS) ─────────────
function loop(now) {
  loopId = requestAnimationFrame(loop);
  // Clamp delta time to max 40ms to guarantee solid 60 FPS and avoid physics lag-spikes
  const dt = Math.min(now - lastTime, 40);
  lastTime = now;

  if (!running || paused) { draw(); return; }
  if (isCountingDown) { draw(); return; }

  if (damageCooldown > 0) damageCooldown -= dt;
  if (trapFrozenTimer > 0) trapFrozenTimer -= dt;
  if (camShakeTimer > 0) {
    camShakeTimer -= dt;
    if (camShakeTimer <= 0) {
      camShakeTimer = 0;
      camShakeIntensity = 0;
    }
  }

  for (const t of placedTraps) {
    if (t.armTimer > 0) t.armTimer -= dt;
    if (t.ownerSlot === mySlot && Math.hypot(player.x - t.x, player.y - t.y) > 0.85) t.steppedOff = true;
  }
  for (const m of placedMines) {
    if (m.armTimer > 0) m.armTimer -= dt;
    if (m.ownerSlot === mySlot && Math.hypot(player.x - m.x, player.y - m.y) > 0.85) m.steppedOff = true;
  }

  if (!isSpectator) survivalTime += dt / 1000;
  const currentPts = Math.floor(survivalTime * 10) + bonusScore;
  elScore.textContent = currentPts;
  if (elTimeDisplay) elTimeDisplay.textContent = survivalTime.toFixed(1) + 's';

  // In-place updates without garbage collector allocation lag
  for (let i = particles.length - 1; i >= 0; i--) {
    particles[i].life -= dt;
    if (particles[i].life <= 0) particles.splice(i, 1);
  }
  for (let i = trail.length - 1; i >= 0; i--) {
    trail[i].alpha -= dt * 0.003;
    if (trail[i].alpha <= 0) trail.splice(i, 1);
  }
  for (let i = shockwaves.length - 1; i >= 0; i--) {
    shockwaves[i].life -= dt;
    if (shockwaves[i].life <= 0) shockwaves.splice(i, 1);
  }

  updateItems(dt);
  updateBullets(dt);

  updateFireWave(dt);
  updateThunderstorm(dt);
  updateTornado(dt);
  updateLandslide(dt);
  updateBombs(dt);

  updateWarningBanners();

  // Smooth, continuous movement updated every frame
  updateMovement(dt);
  if (!running) return;

  if (!isSpectator) {
    checkHazardDamage(dt);
    checkTrapsAndMinesTrigger();
  }

  if (isMultiplayer && isHost && (now - lastSyncDisasterTime > 120)) {
    lastSyncDisasterTime = now;
    broadcastDisasterSync();
  }

  draw();
}

// ── Smooth Continuous Movement (Non-Grid) ──────
function updateMovement(dt) {
  if (trapFrozenTimer > 0 || isSpectator) return;

  // Determine directional input from held keyboard keys
  let inputX = 0;
  let inputY = 0;

  if (keysDown.has('ArrowUp') || keysDown.has('w') || keysDown.has('W')) inputY -= 1;
  if (keysDown.has('ArrowDown') || keysDown.has('s') || keysDown.has('S')) inputY += 1;
  if (keysDown.has('ArrowLeft') || keysDown.has('a') || keysDown.has('A')) inputX -= 1;
  if (keysDown.has('ArrowRight') || keysDown.has('d') || keysDown.has('D')) inputX += 1;

  if (inputX !== 0 || inputY !== 0) {
    const len = Math.hypot(inputX, inputY);
    dir.x = inputX / len;
    dir.y = inputY / len;
    nextDir.x = dir.x;
    nextDir.y = dir.y;
  } else if (nextDir && (nextDir.x !== 0 || nextDir.y !== 0)) {
    // If no keys held, keep running in last selected direction (swipe, mobile D-pad, auto-runner)
    dir.x = nextDir.x;
    dir.y = nextDir.y;
  }

  if (dir.x === 0 && dir.y === 0) return;

  // Smooth speeds in grid cells per second
  const speedTable = { slow: 4.8, normal: 6.4, fast: 8.2 };
  const cellSpeed = speedTable[currentSpeed] || 6.4;

  // Apply tornado slow penalty if caught in vortex
  if (tornadoSlowTimer > 0) tornadoSlowTimer -= dt;
  const speedMult = tornadoSlowTimer > 0 ? 0.48 : 1.0;
  const dist = cellSpeed * speedMult * (dt / 1000);

  // Update floating-point position
  player.x += dir.x * dist;
  player.y += dir.y * dist;

  // Smooth arena wrap-around without block snapping
  if (player.x < 0) player.x += GRID;
  if (player.x >= GRID) player.x -= GRID;
  if (player.y < 0) player.y += GRID;
  if (player.y >= GRID) player.y -= GRID;

  // Running cycle for leg swing & torso bob
  player.runDist = (player.runDist || 0) + dist * CELL;

  // Smooth target facing angle
  const targetAngle = Math.atan2(dir.y, dir.x);
  if (player.angle === undefined) player.angle = targetAngle;
  else {
    let diff = targetAngle - player.angle;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    player.angle += diff * Math.min(1, dt * 0.02);
  }

  // Smooth dynamic dust/trail particles
  if (Math.random() < 0.35) {
    trail.push({ x: player.x, y: player.y, alpha: 0.45 });
  }

  // Network sync throttle (send position every 60ms)
  if (isMultiplayer) {
    mpMoveSyncTimer += dt;
    if (mpMoveSyncTimer >= 60) {
      mpMoveSyncTimer = 0;
      const currentPts = Math.floor(survivalTime * 10) + bonusScore;
      broadcastNetworkMessage({
        type: 'PLAYER_MOVE',
        slot: mySlot,
        x: player.x,
        y: player.y,
        dir: dir,
        angle: player.angle,
        runDist: player.runDist,
        hp: hp,
        isFrozen: trapFrozenTimer > 0,
        score: currentPts,
        time: survivalTime,
        isAlive: !isSpectator,
        hasGun: gunAmmo > 0,
        skinId: equippedSkinId,
      });
    }
  }
}

function checkHazardDamage(dt) {
  if (isSpectator) return;
  const gx = Math.floor(player.x);
  const gy = Math.floor(player.y);
  const key = `${gx},${gy}`;
  const px = player.x * CELL + CELL / 2;
  const py = player.y * CELL + CELL / 2;

  if (puddleCells.has(key)) {
    if (burnDuration > 0) {
      burnDuration = 0;
      spawnSteam(gx, gy);
      spawnFloatingText('DẬP TẮT LỬA', player.x, player.y, '#40c4ff');
    }
  }

  // Check fire on current or immediate neighbor cells in player radius
  let onFire = fireCells.has(key) || spreadingFlames.has(key);
  if (!onFire) {
    for (let ox = -1; ox <= 1; ox++) {
      for (let oy = -1; oy <= 1; oy++) {
        if (ox === 0 && oy === 0) continue;
        const nk = `${(gx + ox + GRID) % GRID},${(gy + oy + GRID) % GRID}`;
        if (fireCells.has(nk) || spreadingFlames.has(nk)) {
          const ncx = ((gx + ox + GRID) % GRID) * CELL + CELL / 2;
          const ncy = ((gy + oy + GRID) % GRID) * CELL + CELL / 2;
          if (Math.hypot(px - ncx, py - ncy) < CELL * 0.65) {
            onFire = true;
            break;
          }
        }
      }
      if (onFire) break;
    }
  }

  if (onFire) {
    burnDuration = Math.max(burnDuration, 2400);
  }

  // Note: Craters are scorched earth blast marks from bombs, NOT fire!

  if (burnDuration > 0) {
    burnDuration -= dt;
    burnTickCooldown -= dt;
    if (burnTickCooldown <= 0) {
      burnTickCooldown = 380;
      takeTickDamage(4, 'Bị thiêu đốt bởi ngọn lửa!', 'fire');
      if (particles.length < 80) {
        particles.push({
          x: px + (Math.random() - 0.5) * 8,
          y: py,
          vx: (Math.random() - 0.5) * 0.8,
          vy: -1.2 - Math.random() * 0.8,
          size: 2.5,
          color: Math.random() < 0.5 ? '#ff6e40' : '#ff1744',
          life: 220,
          maxLife: 220,
        });
      }
    }
  }

  if (electrifiedPuddles.has(key)) {
    electroTickCooldown -= dt;
    if (electroTickCooldown <= 0) {
      electroTickCooldown = 350;
      takeTickDamage(7, 'Bị giật bởi dòng điện trong nước!', 'electric');
    }
  } else {
    electroTickCooldown = Math.min(electroTickCooldown, 80);
  }

  if (sinkholeCells.has(key)) {
    sinkholeTickCooldown -= dt;
    if (sinkholeTickCooldown <= 0) {
      sinkholeTickCooldown = 400;
      takeTickDamage(7, 'Bị lún sâu trong hố sụt lở đất!', 'sinkhole');
    }
  } else {
    sinkholeTickCooldown = Math.min(sinkholeTickCooldown, 80);
  }

  if (lightningCells.has(key)) {
    electroTickCooldown -= dt;
    if (electroTickCooldown <= 0) {
      electroTickCooldown = 300;
      takeTickDamage(18, 'Bị luồng sét cực mạnh giáng trúng!', 'electric');
    }
  }

  // Tornado: "giật người chơi khi chạm vào và đi chậm"
  let inVortex = false;
  for (const t of tornadoes) {
    if (t.state === 'active') {
      const dx = px - t.x;
      const dy = py - t.y;
      const dist = Math.hypot(dx, dy);
      if (dist < CELL * 1.9) {
        inVortex = true;
        // 1. Giảm tốc độ di chuyển (Đi chậm)
        tornadoSlowTimer = Math.max(tornadoSlowTimer, 1200);

        // 2. Giật người chơi (Xoáy lốc hút tâm & rung giật)
        const swirlAngle = Math.atan2(dy, dx) + Math.PI * 0.6;
        const pullFactor = Math.max(0.4, (CELL * 1.9 - dist) / CELL) * (dt / 1000) * 4.2;
        const jitterX = (Math.random() - 0.5) * 0.16;
        const jitterY = (Math.random() - 0.5) * 0.16;

        player.x += Math.cos(swirlAngle) * pullFactor + jitterX;
        player.y += Math.sin(swirlAngle) * pullFactor + jitterY;
        player.x = (player.x + GRID) % GRID;
        player.y = (player.y + GRID) % GRID;

        tornadoTickCooldown -= dt;
        if (tornadoTickCooldown <= 0) {
          tornadoTickCooldown = 320;
          takeTickDamage(6, 'Bị cuốn và giật trong lốc xoáy!', 'tornado');
          spawnFloatingText('GIẬT & CHẬM!', player.x, player.y, '#e0f2fe');
        }
      }
    }
  }
  if (!inVortex) tornadoTickCooldown = Math.min(tornadoTickCooldown, 80);
}

// ── Player Death Handling ─────────────────────
function handlePlayerDeath(reason) {
  if (!isMultiplayer) {
    gameOverSolo(reason);
    return;
  }

  isSpectator = true;
  hp = 0;
  updateHpUI();
  const currentPts = Math.floor(survivalTime * 10) + bonusScore;

  const me = roomPlayers.find(p => p.slot === mySlot);
  if (me) {
    me.isAlive = false;
    me.deathCause = reason;
    me.hp = 0;
    me.score = currentPts;
    me.time = survivalTime;
  }

  broadcastNetworkMessage({
    type: 'PLAYER_DEATH',
    slot: mySlot,
    reason: reason,
    score: currentPts,
    time: survivalTime,
  });

  updateMultiHud();
  checkMultiplayerMatchEnd();
}

function gameOverSolo(reason) {
  running = false;
  cancelAnimationFrame(loopId);
  hideWarning();

  const finalPts = Math.floor(survivalTime * 10) + bonusScore;
  const isRecord = finalPts > bestScore;
  if (isRecord) {
    bestScore = finalPts;
    localStorage.setItem('disasterSurvivalBestScore', bestScore.toString());
    elBest.textContent = bestScore;
  }

  // Award coins based on survival time and score
  roundCoins = Math.floor(survivalTime * 2) + Math.floor(finalPts / 10);
  playerCoins += roundCoins;
  saveShopData();
  updateCoinDisplays();

  elFinal.textContent = finalPts;
  if (elFinalTime) elFinalTime.textContent = survivalTime.toFixed(1) + 's';
  if (elFinalCoins) elFinalCoins.textContent = '+' + roundCoins;
  elDeath.textContent = reason || 'Bạn đã bị thiên tai đánh bại!';
  elNewRecord.classList.toggle('hidden', !isRecord);
  elOverGO.classList.remove('hidden');
}

// ══════════════════════════════════════════════
//  DRAWING
// ══════════════════════════════════════════════

function draw() {
  ctx.clearRect(0, 0, CANVAS_PX, CANVAS_PX);

  const isShaking = camShakeTimer > 0;
  if (isShaking) {
    ctx.save();
    const decay = camShakeTimer / 250;
    const curInt = camShakeIntensity * Math.min(1, decay);
    const sx = (Math.random() - 0.5) * curInt * 2;
    const sy = (Math.random() - 0.5) * curInt * 2;
    ctx.translate(sx, sy);
  }

  drawGrassLawn();
  drawWaterPuddles();
  drawSinkholes();
  drawFireCells();
  drawSpreadingFlames();
  drawCraters();
  drawShockwaves();
  drawLightningCells();
  drawTrail();
  drawPlacedTraps();
  drawPlacedMines();
  drawItems();
  drawBombs();
  drawBullets();
  drawAllSurvivors();
  drawTornado();
  drawParticles();
  updateAndDrawFloatingTexts(16);
  drawFireWarningEdge();
  drawLandslideWarning();
  drawThunderstorm();

  // Sương mù che mờ nhẹ (Atmospheric Light Mist)
  drawAtmosphericFog();

  if (isShaking) {
    ctx.restore();
  }

  if (paused) drawPauseOverlay();
}

function drawAtmosphericFog() {
  if (fogPuffs.length === 0) initFog();

  const px = (player && typeof player.x === 'number') ? (player.x * CELL + CELL / 2) : (CANVAS_PX / 2);
  const py = (player && typeof player.y === 'number') ? (player.y * CELL + CELL / 2) : (CANVAS_PX / 2);
  const now = performance.now();

  // 1. Drifting soft mist puffs
  for (let i = 0; i < fogPuffs.length; i++) {
    const f = fogPuffs[i];
    f.x += f.vx;
    f.y += f.vy;
    if (f.x - f.radius > CANVAS_PX) f.x = -f.radius;
    if (f.y - f.radius > CANVAS_PX) f.y = -f.radius;
    if (f.y + f.radius < 0) f.y = CANVAS_PX + f.radius;

    const alpha = f.baseAlpha * (0.8 + 0.2 * Math.sin(now * f.pulseSpeed + f.phase));

    // Distance to player: keep clear vision circle around player
    const dist = Math.hypot(f.x - px, f.y - py);
    let clearFactor = 1.0;
    if (dist < 75) {
      clearFactor = Math.max(0.08, (dist - 20) / 55);
    }

    const grad = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.radius);
    grad.addColorStop(0, `rgba(215, 230, 245, ${alpha * clearFactor})`);
    grad.addColorStop(0.65, `rgba(190, 210, 230, ${alpha * 0.55 * clearFactor})`);
    grad.addColorStop(1, 'rgba(170, 195, 220, 0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(f.x, f.y, f.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  // 2. Global atmospheric ambient haze with clear vision circle around the player
  const vignette = ctx.createRadialGradient(px, py, 45, px, py, 260);
  vignette.addColorStop(0, 'rgba(10, 18, 30, 0)');
  vignette.addColorStop(0.35, 'rgba(12, 22, 38, 0.08)');
  vignette.addColorStop(0.75, 'rgba(15, 28, 48, 0.20)');
  vignette.addColorStop(1, 'rgba(15, 28, 48, 0.32)');

  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, CANVAS_PX, CANVAS_PX);
}

function initLawnCanvas() {
  lawnCanvas = document.createElement('canvas');
  lawnCanvas.width = CANVAS_PX;
  lawnCanvas.height = CANVAS_PX;
  const lctx = lawnCanvas.getContext('2d');

  const grassLight = '#2d6b2e';
  const grassDark  = '#256126';

  for (let gx = 0; gx < GRID; gx++) {
    for (let gy = 0; gy < GRID; gy++) {
      lctx.fillStyle = (gx + gy) % 2 === 0 ? grassLight : grassDark;
      lctx.fillRect(gx * CELL, gy * CELL, CELL, CELL);
    }
  }

  for (const dec of lawnDecorations) {
    if (dec.type === 'tuft') {
      lctx.strokeStyle = '#1a4a1b';
      lctx.lineWidth = 1.3;
      lctx.beginPath();
      lctx.moveTo(dec.x, dec.y + 4);
      lctx.quadraticCurveTo(dec.x - 2, dec.y, dec.x - 3, dec.y - 4);
      lctx.moveTo(dec.x, dec.y + 4);
      lctx.quadraticCurveTo(dec.x + 2, dec.y, dec.x + 3, dec.y - 4);
      lctx.stroke();
    } else if (dec.type === 'flower') {
      lctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      lctx.beginPath();
      lctx.arc(dec.x - 2, dec.y, 2, 0, Math.PI * 2);
      lctx.arc(dec.x + 2, dec.y, 2, 0, Math.PI * 2);
      lctx.arc(dec.x, dec.y - 2, 2, 0, Math.PI * 2);
      lctx.arc(dec.x, dec.y + 2, 2, 0, Math.PI * 2);
      lctx.fill();
      lctx.fillStyle = '#ffea00';
      lctx.beginPath();
      lctx.arc(dec.x, dec.y, 1.6, 0, Math.PI * 2);
      lctx.fill();
    } else if (dec.type === 'clover') {
      lctx.fillStyle = '#1a4a1a';
      lctx.beginPath();
      lctx.arc(dec.x - 1.5, dec.y, 1.8, 0, Math.PI * 2);
      lctx.arc(dec.x + 1.5, dec.y, 1.8, 0, Math.PI * 2);
      lctx.arc(dec.x, dec.y - 1.8, 1.8, 0, Math.PI * 2);
      lctx.fill();
    }
  }

  lctx.strokeStyle = 'rgba(10, 40, 10, 0.12)';
  lctx.lineWidth = 1;
  for (let i = 1; i < GRID; i++) {
    lctx.beginPath(); lctx.moveTo(i * CELL, 0); lctx.lineTo(i * CELL, CANVAS_PX); lctx.stroke();
    lctx.beginPath(); lctx.moveTo(0, i * CELL); lctx.lineTo(CANVAS_PX, i * CELL); lctx.stroke();
  }
}

function drawGrassLawn() {
  if (!lawnCanvas) initLawnCanvas();
  ctx.drawImage(lawnCanvas, 0, 0);

  if (burntGrass.size === 0) return;
  for (const [key] of burntGrass.entries()) {
    const comma = key.indexOf(',');
    const gx = parseInt(key.slice(0, comma), 10);
    const gy = parseInt(key.slice(comma + 1), 10);

    ctx.fillStyle = '#1a0f08';
    ctx.fillRect(gx * CELL, gy * CELL, CELL, CELL);

    ctx.fillStyle = 'rgba(100, 40, 10, 0.35)';
    ctx.fillRect(gx * CELL + 2, gy * CELL + 2, CELL - 4, CELL - 4);
  }
}

function drawWaterPuddles() {
  if (puddleCells.size === 0) return;
  const now = performance.now() * 0.003;

  for (const p of puddleCells) {
    const [gx, gy] = p.split(',').map(Number);
    const x = gx * CELL;
    const y = gy * CELL;

    const isShocked = electrifiedPuddles.has(p);

    if (isShocked) {
      const flicker = 0.6 + Math.sin(now * 3 + gx * 2) * 0.4;
      ctx.fillStyle = `rgba(0, 176, 255, ${0.55 * flicker})`;
      ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);

      const cx = x + CELL / 2;
      const cy = y + CELL / 2;
      ctx.strokeStyle = `rgba(255, 234, 0, ${0.9 * flicker})`;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(cx - 2, cy - 6);
      ctx.lineTo(cx + 1, cy - 1);
      ctx.lineTo(cx - 2, cy + 1);
      ctx.lineTo(cx + 2, cy + 6);
      ctx.stroke();
    } else {
      const ripple = 0.3 + Math.sin(now + gx * 1.5 + gy * 1.2) * 0.1;
      ctx.fillStyle = `rgba(0, 176, 255, ${ripple})`;
      ctx.beginPath();
      ctx.roundRect(x + 2, y + 2, CELL - 4, CELL - 4, 8);
      ctx.fill();

      ctx.strokeStyle = 'rgba(128, 216, 255, 0.35)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
}

function drawPlacedTraps() {
  for (const t of placedTraps) {
    const cx = t.x * CELL + CELL / 2;
    const cy = t.y * CELL + CELL / 2;

    ctx.save();
    ctx.shadowColor = 'rgba(255, 234, 0, 0.7)';
    ctx.shadowBlur = 8;
    ctx.strokeStyle = '#ffea00';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 9, 0.3, Math.PI - 0.3);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, 9, Math.PI + 0.3, Math.PI * 2 - 0.3);
    ctx.stroke();
    ctx.fillStyle = '#ffea00';
    ctx.fillRect(cx - 3, cy - 3, 6, 6);
    ctx.restore();
  }
}

function drawPlacedMines() {
  for (const m of placedMines) {
    const cx = m.x * CELL + CELL / 2;
    const cy = m.y * CELL + CELL / 2;

    if (m.ownerSlot === mySlot) {
      ctx.save();
      ctx.globalAlpha = 0.38;
      ctx.fillStyle = '#263238';
      ctx.beginPath();
      ctx.arc(cx, cy, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ff5252';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.fillStyle = '#ff1744';
      ctx.beginPath();
      ctx.arc(cx, cy, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}

function drawSpreadingFlames() {
  if (spreadingFlames.size === 0) return;
  const time = performance.now() * 0.006;

  for (const [key, f] of spreadingFlames.entries()) {
    const x = f.x * CELL;
    const y = f.y * CELL;
    const cx = x + CELL / 2;
    const cy = y + CELL / 2;

    const flicker = 0.7 + Math.sin(time * 2 + f.x * 2.3 + f.y * 1.7) * 0.3;

    const grd = ctx.createRadialGradient(cx, cy, 1, cx, cy, CELL * 0.7);
    grd.addColorStop(0, `rgba(255, 234, 0, ${0.75 * flicker})`);
    grd.addColorStop(0.5, `rgba(255, 110, 64, ${0.55 * flicker})`);
    grd.addColorStop(1, 'transparent');
    ctx.fillStyle = grd;
    ctx.fillRect(x - 2, y - 2, CELL + 4, CELL + 4);

    // Procedural flame tongue
    const fH = 8 + Math.sin(time * 4 + f.x * 2) * 3;
    ctx.fillStyle = `rgba(255, 234, 0, ${0.9 * flicker})`;
    ctx.beginPath();
    ctx.moveTo(cx - 3, cy + 4);
    ctx.quadraticCurveTo(cx - 5, cy, cx, cy - fH);
    ctx.quadraticCurveTo(cx + 5, cy, cx + 3, cy + 4);
    ctx.closePath();
    ctx.fill();

    // Volcanic ember core & crackling sparks
    if (f.isVolcanoEmber) {
      ctx.fillStyle = `rgba(255, 61, 0, ${0.85 * flicker})`;
      ctx.beginPath();
      ctx.arc(cx, cy + 3, 4.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `rgba(255, 255, 255, ${0.9 * flicker})`;
      ctx.beginPath();
      ctx.arc(cx, cy + 3, 1.8, 0, Math.PI * 2);
      ctx.fill();

      if (Math.random() < 0.06 && particles.length < 75) {
        spawnFireSparks(f.x, f.y);
      }
    }
  }
}

function drawTornado() {
  if (tornadoes.length === 0) return;
  const now = performance.now();

  for (const t of tornadoes) {
    if (t.state === 'warning') {
      const pulse = 0.4 + Math.sin(now * 0.012 + t.id) * 0.35;
      const sec = Math.max(0, (TORNADO_WARN_TIME - t.stateTime) / 1000).toFixed(1);

      ctx.save();
      ctx.strokeStyle = `rgba(207, 216, 220, ${0.7 * pulse})`;
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(t.x, t.y, CELL * 1.6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = `rgba(176, 190, 197, ${0.2 * pulse})`;
      ctx.fill();

      // Rotating wind spirals
      ctx.strokeStyle = '#cfd8dc';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(t.x, t.y, 14, now * 0.005, now * 0.005 + Math.PI * 1.5);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(t.x, t.y, 8, -now * 0.008, -now * 0.008 + Math.PI * 1.2);
      ctx.stroke();

      ctx.font = '800 11px "JetBrains Mono", monospace';
      ctx.fillStyle = '#f8fafc';
      ctx.textAlign = 'center';
      ctx.fillText(sec + 's', t.x, t.y - 18);
      ctx.restore();
    } else if (t.state === 'active') {
      ctx.save();
      const tAngle = t.angle;

      // Concentric rotating vortex arms
      for (let r = 4; r >= 1; r--) {
        const radius = r * 11;
        const alpha = 0.2 + (4 - r) * 0.15;
        ctx.strokeStyle = isTornadoConverging
          ? `rgba(0, 229, 255, ${alpha + 0.15})`
          : `rgba(236, 239, 241, ${alpha})`;
        ctx.lineWidth = 3.5 - r * 0.6;
        ctx.beginPath();
        ctx.ellipse(t.x, t.y, radius, radius * 0.6, tAngle * (r % 2 === 0 ? 1 : -1) + r, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Dark eye of the storm
      const eyeGrd = ctx.createRadialGradient(t.x, t.y, 1, t.x, t.y, CELL * 0.8);
      eyeGrd.addColorStop(0, '#102027');
      eyeGrd.addColorStop(0.7, 'rgba(55, 71, 79, 0.4)');
      eyeGrd.addColorStop(1, 'transparent');
      ctx.fillStyle = eyeGrd;
      ctx.beginPath();
      ctx.arc(t.x, t.y, CELL * 0.8, 0, Math.PI * 2);
      ctx.fill();

      // Central eye core
      ctx.fillStyle = isTornadoConverging ? '#00e5ff' : '#cfd8dc';
      ctx.beginPath();
      ctx.arc(t.x, t.y, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }
}

function drawSinkholes() {
  if (sinkholeCells.size === 0) return;

  for (const key of sinkholeCells) {
    const [gx, gy] = key.split(',').map(Number);
    const x = gx * CELL;
    const y = gy * CELL;
    const cx = x + CELL / 2;
    const cy = y + CELL / 2;

    ctx.fillStyle = '#0a0604';
    ctx.fillRect(x, y, CELL, CELL);

    const grd = ctx.createRadialGradient(cx, cy, 2, cx, cy, CELL * 0.75);
    grd.addColorStop(0, '#000000');
    grd.addColorStop(0.7, '#3e2723');
    grd.addColorStop(1, '#5d4037');
    ctx.fillStyle = grd;
    ctx.fillRect(x, y, CELL, CELL);

    ctx.strokeStyle = '#8d6e63';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x + 2, y + 4); ctx.lineTo(cx, cy); ctx.lineTo(x + CELL - 3, y + CELL - 4);
    ctx.stroke();
  }
}

function drawLandslideWarning() {
  if (!landslide || landslide.state !== 'warning') return;

  const now = performance.now();
  const pulse = 0.4 + Math.sin(now * 0.01) * 0.35;
  const remainingSec = Math.max(0, (LANDSLIDE_WARN_TIME - landslide.stateTime) / 1000).toFixed(1);

  for (const z of landslide.zones) {
    for (const c of z.cells) {
      const x = c.x * CELL;
      const y = c.y * CELL;

      ctx.fillStyle = `rgba(141, 110, 99, ${0.3 * pulse})`;
      ctx.fillRect(x, y, CELL, CELL);

      ctx.strokeStyle = `rgba(255, 171, 64, ${0.65 * pulse})`;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(x + 1, y + 1, CELL - 2, CELL - 2);
      ctx.setLineDash([]);
    }

    const zx = z.cx * CELL + CELL / 2;
    const zy = z.cy * CELL + CELL / 2;

    ctx.save();
    ctx.shadowColor = 'rgba(255, 145, 0, 0.8)';
    ctx.shadowBlur = 12;

    // Seismic fault fissure graphics
    ctx.fillStyle = '#1b120c';
    ctx.beginPath();
    ctx.arc(zx, zy, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ff9800';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(zx - 7, zy - 4);
    ctx.lineTo(zx - 2, zy + 2);
    ctx.lineTo(zx + 2, zy - 3);
    ctx.lineTo(zx + 7, zy + 4);
    ctx.stroke();

    ctx.font = '800 11px "JetBrains Mono", monospace';
    ctx.fillStyle = '#ffea00';
    ctx.textAlign = 'center';
    ctx.fillText(remainingSec + 's', zx, zy - 13);
    ctx.restore();
  }
}

function drawItems() {
  for (const it of items) {
    const x = it.x * CELL + CELL / 2;
    const y = it.y * CELL + CELL / 2;
    const bounce = Math.sin(it.pulse || 0) * 3;

    ctx.save();
    if (it.type === 'heart') {
      // Bio-Medkit Energy Capsule
      const pPulse = 1 + Math.sin(it.pulse || 0) * 0.15;
      ctx.shadowColor = 'rgba(255, 23, 68, 0.9)';
      ctx.shadowBlur = 16;

      ctx.fillStyle = 'rgba(255, 23, 68, 0.25)';
      ctx.beginPath();
      ctx.arc(x, y + bounce, 10 * pPulse, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#ff1744';
      ctx.lineWidth = 1.8;
      ctx.stroke();

      // Glowing medical cross
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x - 2, y + bounce - 6, 4, 12);
      ctx.fillRect(x - 6, y + bounce - 2, 12, 4);

    } else if (it.type === 'trap') {
      // Tactical Bear Trap Pickup
      ctx.shadowColor = 'rgba(255, 234, 0, 0.85)';
      ctx.shadowBlur = 14;

      ctx.fillStyle = 'rgba(255, 234, 0, 0.2)';
      ctx.beginPath();
      ctx.arc(x, y + bounce, 10, 0, Math.PI * 2);
      ctx.fill();

      // Clamp jaws
      ctx.strokeStyle = '#ffea00';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y + bounce, 7.5, 0.3, Math.PI - 0.3);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, y + bounce, 7.5, Math.PI + 0.3, Math.PI * 2 - 0.3);
      ctx.stroke();

      // Trigger plate
      ctx.fillStyle = '#ffea00';
      ctx.beginPath();
      ctx.arc(x, y + bounce, 2.5, 0, Math.PI * 2);
      ctx.fill();

    } else if (it.type === 'mine') {
      // Proximity Landmine Pickup
      ctx.shadowColor = 'rgba(255, 82, 82, 0.9)';
      ctx.shadowBlur = 14;

      // Dark titanium disc
      ctx.fillStyle = '#263238';
      ctx.beginPath();
      ctx.arc(x, y + bounce, 9, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#ff5252';
      ctx.lineWidth = 1.6;
      ctx.stroke();

      // Blinking center LED diode
      const blink = Math.sin(performance.now() * 0.012) > 0;
      ctx.fillStyle = blink ? '#ff1744' : '#b71c1c';
      ctx.beginPath();
      ctx.arc(x, y + bounce, 3, 0, Math.PI * 2);
      ctx.fill();

    } else if (it.type === 'gun') {
      // Plasma Blaster Pickup
      ctx.shadowColor = 'rgba(255, 145, 0, 0.95)';
      ctx.shadowBlur = 16;

      ctx.fillStyle = 'rgba(255, 145, 0, 0.2)';
      ctx.beginPath();
      ctx.arc(x, y + bounce, 11, 0, Math.PI * 2);
      ctx.fill();

      const ringPulse = 0.5 + Math.sin((it.pulse || 0) * 2) * 0.3;
      ctx.strokeStyle = `rgba(255, 171, 64, ${ringPulse})`;
      ctx.lineWidth = 1.6;
      ctx.stroke();

      // Blaster chassis & barrel
      ctx.fillStyle = '#eceff1';
      ctx.fillRect(x - 5, y + bounce - 2, 11, 4);
      ctx.fillRect(x - 2, y + bounce + 2, 4, 4);
      // Cyan energy cell
      ctx.fillStyle = '#00e5ff';
      ctx.fillRect(x - 2, y + bounce - 1, 4, 2);

    } else if (it.type === 'coin') {
      // Holographic Energy Coin
      ctx.shadowColor = 'rgba(255, 215, 0, 0.95)';
      ctx.shadowBlur = 16;

      ctx.fillStyle = '#ffb300';
      ctx.beginPath();
      ctx.arc(x, y + bounce, 8.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.3;
      ctx.stroke();

      // Inner cyber coin pattern
      ctx.fillStyle = '#ffe082';
      ctx.beginPath();
      ctx.arc(x, y + bounce, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

// ── Draw All Survivors ─
function drawAllSurvivors() {
  if (!isMultiplayer) {
    drawSingleSurvivor(player, dir, mySlot, myPlayerName + ' (Tôi)', hp, trapFrozenTimer > 0, damageCooldown > 0, isSpectator);
    return;
  }

  for (const rp of roomPlayers) {
    if (rp.slot !== mySlot) {
      if (rp.renderX === undefined) { rp.renderX = rp.x || 0; rp.renderY = rp.y || 0; }
      rp.renderX += ((rp.x || 0) - rp.renderX) * 0.35;
      rp.renderY += ((rp.y || 0) - rp.renderY) * 0.35;

      drawSingleSurvivor(
        { x: rp.renderX, y: rp.renderY, angle: rp.angle, runDist: rp.runDist },
        rp.dir || { x: 0, y: 0 },
        rp.slot,
        rp.name || `P${rp.slot + 1}`,
        rp.hp !== undefined ? rp.hp : 100,
        rp.isFrozen,
        false,
        !rp.isAlive
      );
    }
  }

  drawSingleSurvivor(player, dir, mySlot, myPlayerName + ' (Tôi)', hp, trapFrozenTimer > 0, damageCooldown > 0, isSpectator);
}

function drawSingleSurvivor(p, pDir, slot, name, currentHp, isFrozen, isHit, isDead) {
  const cx = p.x * CELL + CELL / 2;
  const cy = p.y * CELL + CELL / 2;
  const now = performance.now();
  const skin = getPlayerSkin(slot);

  if (isHit && Math.floor(now / 100) % 2 === 0) return;

  ctx.save();

  // Dead state: Cyber casualty beacon
  if (isDead) {
    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(cx, cy, 10, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx - 6, cy); ctx.lineTo(cx + 6, cy);
    ctx.moveTo(cx, cy - 6); ctx.lineTo(cx, cy + 6);
    ctx.stroke();

    ctx.font = '700 9px "Inter", sans-serif';
    ctx.fillStyle = '#90a4ae';
    ctx.textAlign = 'center';
    ctx.fillText(name + ' [K.O]', cx, cy - 14);
    ctx.restore();
    return;
  }

  // Trapped / Frozen state: Electromagnetic lockdown rings
  if (isFrozen) {
    const fPulse = 0.6 + Math.sin(now * 0.012) * 0.35;
    ctx.strokeStyle = `rgba(255, 234, 0, ${fPulse})`;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(cx, cy, CELL * 0.72, 0, Math.PI * 2);
    ctx.stroke();

    // Lockdown cross
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(cx - 7, cy - 7); ctx.lineTo(cx + 7, cy + 7);
    ctx.moveTo(cx + 7, cy - 7); ctx.lineTo(cx - 7, cy + 7);
    ctx.stroke();
  }

  // Stride animation based on accumulated running distance
  const runDist = p.runDist || 0;
  const isMoving = (pDir.x !== 0 || pDir.y !== 0) && !isFrozen;
  const legOffset = isMoving ? Math.sin(runDist * 0.28) * 4.5 : 0;
  const bob = isMoving ? Math.abs(Math.sin(runDist * 0.28)) * 1.5 : 0;

  // Facing angle
  const facingAngle = (p.angle !== undefined) ? p.angle : Math.atan2(pDir.y || 0, pDir.x || 1);
  const lookDirX = Math.cos(facingAngle);
  const lookDirY = Math.sin(facingAngle);

  // Ground shadow
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 9, 8, 3.2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Glow aura
  ctx.shadowColor = skin.glow;
  ctx.shadowBlur = 10;

  // Animated legs (swinging forward & back)
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(cx - 4.5, cy + 4 - bob + legOffset, 3, 6);
  ctx.fillRect(cx + 1.5, cy + 4 - bob - legOffset, 3, 6);

  // Torso
  ctx.fillStyle = skin.jacket;
  ctx.beginPath();
  ctx.roundRect(cx - 6, cy - 3 - bob, 12, 10, 3.5);
  ctx.fill();

  // Tactical Backpack
  const backX = cx - lookDirX * 4;
  const backY = cy - 2 - bob - lookDirY * 4;
  ctx.fillStyle = '#3e2723';
  ctx.beginPath();
  ctx.roundRect(backX - 3, backY - 3, 6, 7, 2);
  ctx.fill();

  // Head
  const headY = cy - 7 - bob;
  ctx.fillStyle = skin.cap;
  ctx.beginPath();
  ctx.arc(cx, headY, 6, 0, Math.PI * 2);
  ctx.fill();

  // Glowing Tactical Visor Strip
  const vx = cx + lookDirX * 3.5;
  const vy = headY + lookDirY * 3.5;
  ctx.shadowColor = skin.glow;
  ctx.shadowBlur = 8;
  ctx.fillStyle = skin.glow;
  ctx.beginPath();
  ctx.arc(vx, vy, 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Mini Health Bar
  const hpPct = Math.max(0, Math.min(1, currentHp / MAX_HP));
  const barW = 20;
  const barH = 3;
  const barX = cx - barW / 2;
  const barY = cy - 19;

  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);

  ctx.fillStyle = hpPct > 0.6 ? '#00e676' : (hpPct > 0.3 ? '#ffab00' : '#ff1744');
  ctx.fillRect(barX, barY, barW * hpPct, barH);

  // Name Tag
  ctx.font = '700 9px "Inter", sans-serif';
  ctx.fillStyle = '#f8fafc';
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = 4;
  ctx.fillText(name, cx, cy - 23);

  // Draw equipped plasma firearm and aiming guidance
  const hasGun = (slot === mySlot && gunAmmo > 0) || (slot !== mySlot && p.hasGun);
  if (hasGun && !isDead) {
    const gunDist = 8;
    const gunX = cx + lookDirX * gunDist;
    const gunY = cy - bob + lookDirY * gunDist;

    ctx.save();
    ctx.fillStyle = '#263238';
    ctx.fillRect(gunX - 2, gunY - 2, 5, 4);
    ctx.fillStyle = '#ff9100'; // Plasma muzzle
    ctx.fillRect(gunX + lookDirX * 3 - 1, gunY - 1, 3, 2);

    // Laser aiming guide line
    ctx.strokeStyle = 'rgba(255, 145, 0, 0.35)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 5]);
    ctx.beginPath();
    ctx.moveTo(gunX, gunY);
    ctx.lineTo(gunX + lookDirX * 42, gunY + lookDirY * 42);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  // Gun ammo indicator badge
  if (slot === mySlot && gunAmmo > 0 && !isDead) {
    ctx.font = '800 8.5px "JetBrains Mono", monospace';
    ctx.fillStyle = '#ffab40';
    ctx.textAlign = 'left';
    ctx.fillText(`x${gunAmmo}`, cx + 9, cy - 2);
  }

  // On fire procedural flame tongues
  if (slot === mySlot && burnDuration > 0 && !isDead) {
    const fHeight = 7 + Math.sin(now * 0.02) * 3;
    ctx.fillStyle = 'rgba(255, 87, 34, 0.85)';
    ctx.beginPath();
    ctx.moveTo(cx - 4, headY - 4);
    ctx.quadraticCurveTo(cx - 6, headY - 8, cx, headY - 4 - fHeight);
    ctx.quadraticCurveTo(cx + 6, headY - 8, cx + 4, headY - 4);
    ctx.closePath();
    ctx.fill();
  }

  // Tornado slow & wind turbulence aura
  if (slot === mySlot && tornadoSlowTimer > 0 && !isDead) {
    ctx.save();
    const swirlTime = now * 0.009;
    ctx.strokeStyle = 'rgba(165, 243, 252, 0.75)';
    ctx.lineWidth = 1.6;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.arc(cx, cy, 14, swirlTime, swirlTime + Math.PI * 1.5);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  ctx.restore();
}

const rgbCache = new Map();
function hexToRgb(hex) {
  if (rgbCache.has(hex)) return rgbCache.get(hex);
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  const rgb = result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '74, 222, 128';
  rgbCache.set(hex, rgb);
  return rgb;
}

function drawTrail() {
  if (trail.length === 0) return;
  const skin = getEquippedSkin();
  const rgb = hexToRgb(skin.glow);
  for (const t of trail) {
    const x = t.x * CELL + CELL / 2;
    const y = t.y * CELL + CELL / 2;
    ctx.fillStyle = `rgba(${rgb}, ${t.alpha * 0.2})`;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawFireCells() {
  if (fireCells.size === 0) return;
  const time = performance.now() * 0.005;

  for (const key of fireCells) {
    const comma = key.indexOf(',');
    const gx = parseInt(key.slice(0, comma), 10);
    const gy = parseInt(key.slice(comma + 1), 10);
    const x = gx * CELL;
    const y = gy * CELL;

    const flicker = 0.7 + Math.sin(time + gx * 1.3 + gy * 0.7) * 0.3;
    ctx.fillStyle = `rgba(255, 23, 68, ${0.35 * flicker})`;
    ctx.fillRect(x, y, CELL, CELL);

    const cx = x + CELL / 2;
    const cy = y + CELL / 2;

    // High performance flame tongue (no shadowBlur inside tight loop)
    const flameH = 6 + Math.sin(time * 3 + gx * 2.5 + gy * 1.7) * 3;
    const sway = Math.sin(time * 4 + gy * 2) * 2;
    ctx.fillStyle = `rgba(255, 234, 0, ${0.85 * flicker})`;
    ctx.beginPath();
    ctx.moveTo(cx - 4, cy + 5);
    ctx.quadraticCurveTo(cx - 5 + sway, cy - 2, cx + sway, cy - flameH);
    ctx.quadraticCurveTo(cx + 4 + sway, cy - 1, cx + 4, cy + 5);
    ctx.closePath();
    ctx.fill();

    // Inner bright core
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.beginPath();
    ctx.moveTo(cx - 2, cy + 4);
    ctx.quadraticCurveTo(cx - 1 + sway * 0.5, cy, cx + sway * 0.5, cy - flameH * 0.5);
    ctx.quadraticCurveTo(cx + 2 + sway * 0.5, cy + 1, cx + 2, cy + 4);
    ctx.closePath();
    ctx.fill();
  }
}

function drawFireWarningEdge() {
  if (!fireWave || fireWave.state !== 'warning') return;

  const now = performance.now();
  const pulse = 0.4 + Math.sin(now * 0.009) * 0.3;
  const d = fireWave.dir;
  const warnDepth = (fireWave.maxDistance + 1) * CELL;

  ctx.save();
  let grd;

  if (d === 'left') {
    grd = ctx.createLinearGradient(0, 0, warnDepth, 0);
    grd.addColorStop(0, `rgba(255, 23, 68, ${pulse * 0.8})`);
    grd.addColorStop(0.85, `rgba(255, 145, 0, ${pulse * 0.35})`);
    grd.addColorStop(1, 'transparent');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, warnDepth, CANVAS_PX);
    if (!fireWave.isFullSweep) {
      ctx.strokeStyle = 'rgba(255, 234, 0, 0.6)';
      ctx.lineWidth = 2; ctx.setLineDash([6, 6]);
      ctx.beginPath(); ctx.moveTo(warnDepth, 0); ctx.lineTo(warnDepth, CANVAS_PX); ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.fillStyle = '#fff'; ctx.font = '800 16px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(255, 23, 68, 0.9)'; ctx.shadowBlur = 14;
    const bounceX = 20 + Math.sin(now * 0.01) * 8;
    ctx.fillText(fireWave.isFullSweep ? '▶▶ BÃO LỬA: QUÉT HẾT!' : '▶▶ CẢNH BÁO: NÉ PHẢI', bounceX + 70, CANVAS_PX / 2);
  } else if (d === 'right') {
    grd = ctx.createLinearGradient(CANVAS_PX, 0, CANVAS_PX - warnDepth, 0);
    grd.addColorStop(0, `rgba(255, 23, 68, ${pulse * 0.8})`);
    grd.addColorStop(0.85, `rgba(255, 145, 0, ${pulse * 0.35})`);
    grd.addColorStop(1, 'transparent');
    ctx.fillStyle = grd;
    ctx.fillRect(CANVAS_PX - warnDepth, 0, warnDepth, CANVAS_PX);
    if (!fireWave.isFullSweep) {
      ctx.strokeStyle = 'rgba(255, 234, 0, 0.6)';
      ctx.lineWidth = 2; ctx.setLineDash([6, 6]);
      ctx.beginPath(); ctx.moveTo(CANVAS_PX - warnDepth, 0); ctx.lineTo(CANVAS_PX - warnDepth, CANVAS_PX); ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.fillStyle = '#fff'; ctx.font = '800 16px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(255, 23, 68, 0.9)'; ctx.shadowBlur = 14;
    const bounceX = CANVAS_PX - 20 - Math.sin(now * 0.01) * 8;
    ctx.fillText(fireWave.isFullSweep ? 'BÃO LỬA: QUÉT HẾT! ◀◀' : 'CẢNH BÁO: NÉ TRÁI ◀◀', bounceX - 70, CANVAS_PX / 2);
  } else if (d === 'top') {
    grd = ctx.createLinearGradient(0, 0, 0, warnDepth);
    grd.addColorStop(0, `rgba(255, 23, 68, ${pulse * 0.8})`);
    grd.addColorStop(0.85, `rgba(255, 145, 0, ${pulse * 0.35})`);
    grd.addColorStop(1, 'transparent');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, CANVAS_PX, warnDepth);
    if (!fireWave.isFullSweep) {
      ctx.strokeStyle = 'rgba(255, 234, 0, 0.6)';
      ctx.lineWidth = 2; ctx.setLineDash([6, 6]);
      ctx.beginPath(); ctx.moveTo(0, warnDepth); ctx.lineTo(CANVAS_PX, warnDepth); ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.fillStyle = '#fff'; ctx.font = '800 16px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(255, 23, 68, 0.9)'; ctx.shadowBlur = 14;
    const bounceY = 28 + Math.sin(now * 0.01) * 8;
    ctx.fillText(fireWave.isFullSweep ? '▼▼ BÃO LỬA: QUÉT HẾT! ▼▼' : '▼▼ CẢNH BÁO: NÉ XUỐNG ▼▼', CANVAS_PX / 2, bounceY + 30);
  } else if (d === 'bottom') {
    grd = ctx.createLinearGradient(0, CANVAS_PX, 0, CANVAS_PX - warnDepth);
    grd.addColorStop(0, `rgba(255, 23, 68, ${pulse * 0.8})`);
    grd.addColorStop(0.85, `rgba(255, 145, 0, ${pulse * 0.35})`);
    grd.addColorStop(1, 'transparent');
    ctx.fillStyle = grd;
    ctx.fillRect(0, CANVAS_PX - warnDepth, CANVAS_PX, warnDepth);
    if (!fireWave.isFullSweep) {
      ctx.strokeStyle = 'rgba(255, 234, 0, 0.6)';
      ctx.lineWidth = 2; ctx.setLineDash([6, 6]);
      ctx.beginPath(); ctx.moveTo(0, CANVAS_PX - warnDepth); ctx.lineTo(CANVAS_PX, CANVAS_PX - warnDepth); ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.fillStyle = '#fff'; ctx.font = '800 16px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(255, 23, 68, 0.9)'; ctx.shadowBlur = 14;
    const bounceY = CANVAS_PX - 20 - Math.sin(now * 0.01) * 8;
    ctx.fillText(fireWave.isFullSweep ? '▲▲ BÃO LỬA: QUÉT HẾT! ▲▲' : '▲▲ CẢNH BÁO: NÉ LÊN ▲▲', CANVAS_PX / 2, bounceY - 30);
  } else {
    // Diagonal warnings
    const corner = d === 'diag-tl' ? [0,0] : d === 'diag-tr' ? [CANVAS_PX,0] : d === 'diag-bl' ? [0,CANVAS_PX] : [CANVAS_PX,CANVAS_PX];
    grd = ctx.createRadialGradient(corner[0], corner[1], 10, corner[0], corner[1], CANVAS_PX * 0.8);
    grd.addColorStop(0, `rgba(255, 23, 68, ${pulse * 0.8})`);
    grd.addColorStop(0.7, `rgba(255, 145, 0, ${pulse * 0.25})`);
    grd.addColorStop(1, 'transparent');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, CANVAS_PX, CANVAS_PX);
    const arrowMap = {'diag-tl':'↘','diag-tr':'↙','diag-bl':'↗','diag-br':'↖'};
    const posMap = {'diag-tl':[150,110],'diag-tr':[CANVAS_PX-150,110],'diag-bl':[150,CANVAS_PX-110],'diag-br':[CANVAS_PX-150,CANVAS_PX-110]};
    const pp = posMap[d];
    ctx.fillStyle = '#fff'; ctx.font = '800 15px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(255, 23, 68, 0.9)'; ctx.shadowBlur = 14;
    ctx.fillText(`${arrowMap[d]} CẢNH BÁO: ${fireWave.isFullSweep ? 'QUÉT CHÉO HẾT' : 'BÃO LỬA CHÉO'} ${arrowMap[d]}`, pp[0], pp[1]);
  }

  ctx.restore();
}

function drawThunderstorm() {
  if (!thunderstorm) return;
  const now = performance.now();

  ctx.fillStyle = 'rgba(5, 15, 25, 0.35)';
  ctx.fillRect(0, 0, CANVAS_PX, CANVAS_PX);

  ctx.strokeStyle = 'rgba(128, 216, 255, 0.6)';
  ctx.lineWidth = 1.4;
  for (const r of raindrops) {
    ctx.beginPath();
    ctx.moveTo(r.x, r.y);
    ctx.lineTo(r.x - 3, r.y + r.l);
    ctx.stroke();
  }

  if (thunderstorm.state === 'warning') {
    const pulse = 0.4 + Math.sin(now * 0.012) * 0.35;
    const remainingSec = Math.max(0, (THUNDER_WARN_TIME - thunderstorm.stateTime) / 1000).toFixed(1);

    for (const z of thunderstorm.targetZones) {
      for (const cell of z.cells) {
        const x = cell.x * CELL;
        const y = cell.y * CELL;

        ctx.fillStyle = `rgba(0, 176, 255, ${0.2 * pulse})`;
        ctx.fillRect(x, y, CELL, CELL);

        ctx.strokeStyle = `rgba(255, 234, 0, ${0.55 * pulse})`;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 3]);
        ctx.strokeRect(x + 1, y + 1, CELL - 2, CELL - 2);
        ctx.setLineDash([]);
      }

      const zx = z.cx * CELL + CELL / 2;
      const zy = z.cy * CELL + CELL / 2;

      ctx.save();
      ctx.shadowColor = 'rgba(0, 229, 255, 0.95)';
      ctx.shadowBlur = 16;
      ctx.fillStyle = '#00e5ff';
      ctx.beginPath();
      ctx.moveTo(zx + 2, zy - 10);
      ctx.lineTo(zx - 6, zy + 1);
      ctx.lineTo(zx - 1, zy + 1);
      ctx.lineTo(zx - 3, zy + 11);
      ctx.lineTo(zx + 7, zy - 1);
      ctx.lineTo(zx + 1, zy - 1);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(zx + 1, zy - 7);
      ctx.lineTo(zx - 3, zy);
      ctx.lineTo(zx, zy);
      ctx.lineTo(zx - 1, zy + 7);
      ctx.lineTo(zx + 4, zy);
      ctx.lineTo(zx + 1, zy);
      ctx.closePath();
      ctx.fill();

      ctx.font = '800 11px "JetBrains Mono", monospace';
      ctx.fillStyle = '#ffea00';
      ctx.fillText(remainingSec + 's', zx, zy - 14);
      ctx.restore();
    }
  }

  if (thunderstorm.state === 'striking') {
    if (thunderstorm.flashAlpha > 0) {
      ctx.fillStyle = `rgba(224, 247, 250, ${thunderstorm.flashAlpha})`;
      ctx.fillRect(0, 0, CANVAS_PX, CANVAS_PX);
    }

    ctx.save();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3.5;
    ctx.shadowColor = '#40c4ff';
    ctx.shadowBlur = 22;

    for (const z of thunderstorm.targetZones) {
      const targetX = z.cx * CELL + CELL / 2;
      const targetY = z.cy * CELL + CELL / 2;

      ctx.beginPath();
      ctx.moveTo(targetX + (Math.random() - 0.5) * 40, 0);

      let curX = targetX;
      const segments = 6;
      for (let s = 1; s <= segments; s++) {
        const nextY = (targetY / segments) * s;
        const nextX = s === segments ? targetX : curX + (Math.random() - 0.5) * 35;
        ctx.lineTo(nextX, nextY);
        curX = nextX;
      }
      ctx.stroke();

      ctx.strokeStyle = '#40c4ff';
      ctx.lineWidth = 1.8;
      ctx.stroke();
    }
    ctx.restore();
  }
}

function drawLightningCells() {
  if (lightningCells.size === 0) return;
  const time = performance.now() * 0.008;

  for (const key of lightningCells) {
    const [gx, gy] = key.split(',').map(Number);
    const x = gx * CELL;
    const y = gy * CELL;

    const flicker = 0.6 + Math.sin(time + gx * 2 + gy * 3) * 0.4;
    ctx.fillStyle = `rgba(0, 176, 255, ${0.35 * flicker})`;
    ctx.fillRect(x, y, CELL, CELL);

    const cx = x + CELL / 2;
    const cy = y + CELL / 2;
    const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, CELL * 0.6);
    grd.addColorStop(0, `rgba(255, 234, 0, ${0.6 * flicker})`);
    grd.addColorStop(0.5, `rgba(0, 176, 255, ${0.35 * flicker})`);
    grd.addColorStop(1, 'transparent');
    ctx.fillStyle = grd;
    ctx.fillRect(x, y, CELL, CELL);

    if ((gx + gy) % 2 === 0) {
      ctx.save();
      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = 1.8;
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(cx - 4, cy - 5);
      ctx.lineTo(cx + (Math.sin(time * 5 + gx) * 3), cy - 1);
      ctx.lineTo(cx - (Math.sin(time * 6 + gy) * 3), cy + 2);
      ctx.lineTo(cx + 4, cy + 6);
      ctx.stroke();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 0.8;
      ctx.stroke();
      ctx.restore();
    }
  }
}

function drawBombs() {
  for (const b of bombs) {
    if (b.state !== 'ticking') continue;
    const x = b.x * CELL + CELL / 2;
    const y = b.y * CELL + CELL / 2;
    const progress = b.stateTime / b.fuseTime;
    const urgency = Math.min(1, progress * 1.5);

    const previewR = BOMB_BLAST_RADIUS * CELL;
    ctx.beginPath();
    ctx.arc(x, y, previewR, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 23, 68, ${0.12 + urgency * 0.35})`;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 5]);
    ctx.stroke();
    ctx.setLineDash([]);

    const pGrd = ctx.createRadialGradient(x, y, 0, x, y, previewR);
    pGrd.addColorStop(0, `rgba(255, 23, 68, ${0.05 + urgency * 0.12})`);
    pGrd.addColorStop(0.8, `rgba(255, 145, 0, ${0.03 + urgency * 0.08})`);
    pGrd.addColorStop(1, 'transparent');
    ctx.fillStyle = pGrd;
    ctx.fill();

    const bombPulse = 1 + Math.sin(b.stateTime * (0.005 + urgency * 0.02)) * 0.15 * (1 + urgency);

    ctx.save();
    ctx.shadowColor = urgency > 0.6 ? '#ff1744' : '#ff9100';
    ctx.shadowBlur = 12 + urgency * 18;

    const baseR = (CELL * 0.38) * bombPulse;

    // Outer bomb casing (dark titanium sphere)
    const bombGrd = ctx.createRadialGradient(x - baseR * 0.35, y - baseR * 0.35, 1, x, y, baseR);
    bombGrd.addColorStop(0, '#475569');
    bombGrd.addColorStop(0.5, '#1e293b');
    bombGrd.addColorStop(1, '#090d16');
    ctx.fillStyle = bombGrd;
    ctx.beginPath();
    ctx.arc(x, y + 1, baseR, 0, Math.PI * 2);
    ctx.fill();

    // Warning hazard ring
    ctx.strokeStyle = urgency > 0.6 ? `rgba(255, 23, 68, ${0.6 + Math.sin(b.stateTime * 0.03) * 0.4})` : 'rgba(255, 234, 0, 0.6)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(x, y + 1, baseR * 0.72, 0, Math.PI * 2);
    ctx.stroke();

    // Detonator cap neck
    ctx.fillStyle = '#64748b';
    ctx.fillRect(x - 2.5, y - baseR - 3, 5, 4);

    // Glowing fuse wire & dynamic sparks
    const fuseSway = Math.sin(b.stateTime * 0.02) * 3;
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(x, y - baseR - 3);
    ctx.quadraticCurveTo(x + fuseSway, y - baseR - 7, x + 4 + fuseSway, y - baseR - 9);
    ctx.stroke();

    // Sizzling spark at wick tip
    const sparkX = x + 4 + fuseSway;
    const sparkY = y - baseR - 9;
    const sparkColor = urgency > 0.7 ? '#ff1744' : '#ffea00';
    ctx.fillStyle = sparkColor;
    ctx.shadowColor = sparkColor;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(sparkX, sparkY, 2.5 + Math.random() * 2, 0, Math.PI * 2);
    ctx.fill();

    // Core pulsing LED dot
    ctx.fillStyle = urgency > 0.5 ? (Math.floor(b.stateTime / 120) % 2 === 0 ? '#ff1744' : '#fff') : '#ffea00';
    ctx.beginPath();
    ctx.arc(x, y + 1, 2.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    const secsLeft = Math.max(0, (b.fuseTime - b.stateTime) / 1000).toFixed(1);
    ctx.fillStyle = secsLeft <= 1.5 ? '#ff1744' : '#ffea00';
    ctx.font = `800 ${11 + urgency * 2}px 'JetBrains Mono', monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(secsLeft + 's', x, y - CELL / 2 - 3);
    ctx.textAlign = 'start';
  }
}

function drawCraters() {
  const time = performance.now() * 0.003;
  for (const c of craters) {
    const fadeRatio = Math.min(1, c.timeLeft / 1000);

    for (const cell of c.cells) {
      const x = cell.x * CELL;
      const y = cell.y * CELL;
      const cx = x + CELL / 2;
      const cy = y + CELL / 2;

      // Scorched blast earth (not fire)
      ctx.fillStyle = `rgba(15, 23, 42, ${0.45 * fadeRatio})`;
      ctx.beginPath();
      ctx.roundRect(x + 1, y + 1, CELL - 2, CELL - 2, 4);
      ctx.fill();

      // Subtle charred blast core
      ctx.fillStyle = `rgba(30, 41, 59, ${0.35 * fadeRatio})`;
      ctx.fillRect(cx - 3, cy - 3, 6, 6);

      // Brief flash crack on detonation
      if (c.flash > 0.05) {
        ctx.strokeStyle = `rgba(255, 234, 0, ${c.flash * 0.8})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(cx - 5, cy - 4); ctx.lineTo(cx + 1, cy + 1); ctx.lineTo(cx + 6, cy - 3);
        ctx.stroke();
      }
    }
  }
}

function drawShockwaves() {
  if (shockwaves.length === 0) return;
  for (let i = shockwaves.length - 1; i >= 0; i--) {
    const sw = shockwaves[i];
    const progress = 1 - (sw.life / sw.maxLife);
    const currentR = sw.r + (sw.maxR - sw.r) * progress;
    const alpha = 1 - progress;

    ctx.save();
    ctx.strokeStyle = `rgba(255, 235, 59, ${alpha * 0.9})`;
    ctx.lineWidth = Math.max(1.2, 4.5 * (1 - progress));
    ctx.beginPath();
    ctx.arc(sw.x, sw.y, currentR, 0, Math.PI * 2);
    ctx.stroke();

    if (progress < 0.35) {
      ctx.fillStyle = `rgba(255, 255, 255, ${(0.35 - progress) * 2})`;
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, currentR * 0.75, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

function drawParticles() {
  if (particles.length === 0) return;
  if (particles.length > 80) particles.splice(0, particles.length - 80);
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= 16;
    if (p.life <= 0) { particles.splice(i, 1); continue; }
    const ratio = Math.max(0, p.life / p.maxLife);
    ctx.globalAlpha = ratio;
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, Math.max(1, p.size * ratio), Math.max(1, p.size * ratio));
    p.x += p.vx;
    p.y += p.vy;
  }
  ctx.globalAlpha = 1;
}

function drawPauseOverlay() {
  ctx.fillStyle = 'rgba(5, 10, 20, 0.78)';
  ctx.fillRect(0, 0, CANVAS_PX, CANVAS_PX);

  ctx.save();
  ctx.fillStyle = '#38bdf8';
  ctx.shadowColor = '#38bdf8';
  ctx.shadowBlur = 14;
  const barW = 8;
  const barH = 26;
  const cx = CANVAS_PX / 2;
  const cy = CANVAS_PX / 2 - 28;
  ctx.beginPath();
  ctx.roundRect(cx - barW - 4, cy - barH / 2, barW, barH, 3);
  ctx.roundRect(cx + 4, cy - barH / 2, barW, barH, 3);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = '#e8f4fd';
  ctx.font = '700 24px Orbitron, system-ui';
  ctx.textAlign = 'center';
  ctx.fillText('TẠM DỪNG', CANVAS_PX / 2, CANVAS_PX / 2 + 10);
  ctx.font = '500 12.5px Inter, system-ui';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('Nhấn Space để tiếp tục · Nhấn ESC để thoát', CANVAS_PX / 2, CANVAS_PX / 2 + 36);
  ctx.textAlign = 'start';
}

// ── Controls ──────────────────────────────────
const DIR_MAP = {
  ArrowUp:    { x:  0, y: -1 }, w: { x:  0, y: -1 }, W: { x:  0, y: -1 },
  ArrowDown:  { x:  0, y:  1 }, s: { x:  0, y:  1 }, S: { x:  0, y:  1 },
  ArrowLeft:  { x: -1, y:  0 }, a: { x: -1, y:  0 }, A: { x: -1, y:  0 },
  ArrowRight: { x:  1, y:  0 }, d: { x:  1, y:  0 }, D: { x:  1, y:  0 },
};

document.addEventListener('keydown', e => {
  // ESC key: Thoát ra Menu chính ở bất kỳ màn hình nào
  if (e.key === 'Escape' || e.code === 'Escape') {
    e.preventDefault();
    if (!elOverSkinShop.classList.contains('hidden')) {
      closeSkinShop();
      return;
    }
    if (!elOverOnline.classList.contains('hidden')) {
      closeOnlineModal();
      return;
    }
    exitToMainMenu();
    return;
  }

  if (e.key === '1' || e.code === 'Digit1') {
    e.preventDefault();
    if (running && !paused) deployTrap();
    return;
  }

  if (e.key === '2' || e.code === 'Digit2') {
    e.preventDefault();
    if (running && !paused) deployMine();
    return;
  }

  // Key 3, F, or J: Shoot Gun
  if (e.key === '3' || e.code === 'Digit3' || e.key === 'f' || e.key === 'F' || e.key === 'j' || e.key === 'J') {
    e.preventDefault();
    if (running && !paused) shootGun();
    return;
  }

  if (e.key === ' ' || e.key === 'Spacebar') {
    e.preventDefault();
    togglePause();
    return;
  }

  if (e.key === 'Enter') {
    if (!running && !isMultiplayer) startSoloGame();
    return;
  }

  const newDir = DIR_MAP[e.key];
  if (newDir && running && !paused && trapFrozenTimer <= 0) {
    e.preventDefault();
    keysDown.add(e.key);
    nextDir = newDir;
  }
});

function exitToMainMenu() {
  running = false;
  paused = false;
  isCountingDown = false;
  keysDown.clear();
  if (loopId) {
    cancelAnimationFrame(loopId);
    loopId = null;
  }
  if (countdownTimerId) {
    clearInterval(countdownTimerId);
    countdownTimerId = null;
  }
  hideWarning();
  if (elPause) elPause.classList.add('hidden');
  elOverGO.classList.add('hidden');
  elOverMultiGO.classList.add('hidden');
  elOverCountdown.classList.add('hidden');
  elOverSkinShop.classList.add('hidden');
  elOverOnline.classList.add('hidden');
  if (isMultiplayer) leaveOnlineRoom();
  elOverStart.classList.remove('hidden');
  updateCoinDisplays();
  draw();
}
window.exitToMainMenu = exitToMainMenu;

document.addEventListener('keyup', e => {
  if (DIR_MAP[e.key]) {
    keysDown.delete(e.key);
  }
});

window.addEventListener('blur', () => {
  keysDown.clear();
});

// Canvas click to aim & shoot directly with mouse
canvas.addEventListener('click', e => {
  if (!running || paused || isSpectator) return;
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const clickX = (e.clientX - rect.left) * scaleX;
  const clickY = (e.clientY - rect.top) * scaleY;
  shootGun(clickX, clickY);
});

function togglePause() {
  if (!running || isMultiplayer) return;
  paused = !paused;
  if (elPause) elPause.classList.toggle('hidden', !paused);
  if (!paused) { lastTime = performance.now(); accumulator = 0; }
}
window.togglePause = togglePause;

function changeDir(d) {
  if (trapFrozenTimer > 0) return;
  const map = {
    up:    { x:  0, y: -1 },
    down:  { x:  0, y:  1 },
    left:  { x: -1, y:  0 },
    right: { x:  1, y:  0 },
  };
  const nd = map[d];
  if (nd && running && !paused) {
    dir = nd;
    nextDir = nd;
    keysDown.clear();
  }
}
window.changeDir = changeDir;

// Touch swipe & tap to shoot
let touchStartX = 0, touchStartY = 0;
canvas.addEventListener('touchstart', e => {
  const t = e.touches[0];
  touchStartX = t.clientX;
  touchStartY = t.clientY;
}, { passive: true });

canvas.addEventListener('touchmove', e => { e.preventDefault(); }, { passive: false });

canvas.addEventListener('touchend', e => {
  if (trapFrozenTimer > 0) return;
  const t = e.changedTouches[0];
  const dx = t.clientX - touchStartX;
  const dy = t.clientY - touchStartY;
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);
  if (Math.max(absDx, absDy) < 20) {
    // Tap to shoot
    if (running && !paused) shootGun();
    return;
  }

  if (absDx > absDy) changeDir(dx > 0 ? 'right' : 'left');
  else changeDir(dy > 0 ? 'down' : 'up');
}, { passive: true });

// ══════════════════════════════════════════════
//  MOBILE VIRTUAL JOYSTICK (Điều khiển nút tròn 360°)
// ══════════════════════════════════════════════
let joystickActive = false;
let joystickTouchId = null;
let joystickCenter = { x: 0, y: 0 };
let joystickRadius = 36;

function initVirtualJoystick() {
  const base = document.getElementById('joystickBase');
  const knob = document.getElementById('joystickKnob');
  if (!base || !knob) return;

  function updateKnobFromCoord(clientX, clientY) {
    const dx = clientX - joystickCenter.x;
    const dy = clientY - joystickCenter.y;
    const dist = Math.hypot(dx, dy);
    const clampedDist = Math.min(dist, joystickRadius);
    let nx = 0, ny = 0;
    if (dist > 0) {
      nx = dx / dist;
      ny = dy / dist;
    }
    const kx = nx * clampedDist;
    const ky = ny * clampedDist;
    knob.style.transform = `translate(${kx}px, ${ky}px)`;

    if (dist > 6) { // Deadzone of 6px
      if (trapFrozenTimer <= 0 && running && !paused) {
        dir.x = nx;
        dir.y = ny;
        nextDir.x = nx;
        nextDir.y = ny;
        keysDown.clear();
      }
    }
  }

  function handleTouchStart(e) {
    if (joystickActive) return;
    const touch = e.changedTouches ? e.changedTouches[0] : e;
    joystickActive = true;
    joystickTouchId = (touch.identifier !== undefined) ? touch.identifier : 'mouse';
    const rect = base.getBoundingClientRect();
    joystickCenter = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };
    joystickRadius = Math.max(26, (rect.width / 2) - 10);
    base.classList.add('active');
    knob.style.transition = 'none';
    updateKnobFromCoord(touch.clientX, touch.clientY);
  }

  function handleTouchMove(e) {
    if (!joystickActive) return;
    let touch = null;
    if (e.changedTouches) {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === joystickTouchId) {
          touch = e.changedTouches[i];
          break;
        }
      }
    } else if (joystickTouchId === 'mouse') {
      touch = e;
    }
    if (!touch) return;
    if (e.cancelable) e.preventDefault();
    updateKnobFromCoord(touch.clientX, touch.clientY);
  }

  function handleTouchEnd(e) {
    if (!joystickActive) return;
    let matches = false;
    if (e.changedTouches) {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === joystickTouchId) {
          matches = true;
          break;
        }
      }
    } else if (joystickTouchId === 'mouse') {
      matches = true;
    }
    if (!matches) return;

    joystickActive = false;
    joystickTouchId = null;
    base.classList.remove('active');
    knob.style.transition = 'transform 0.16s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
    knob.style.transform = 'translate(0px, 0px)';
    
    // Stop moving when finger is lifted from joystick
    dir.x = 0;
    dir.y = 0;
    nextDir.x = 0;
    nextDir.y = 0;
  }

  // Multi-touch listeners
  base.addEventListener('touchstart', handleTouchStart, { passive: false });
  window.addEventListener('touchmove', handleTouchMove, { passive: false });
  window.addEventListener('touchend', handleTouchEnd, { passive: false });
  window.addEventListener('touchcancel', handleTouchEnd, { passive: false });

  // Mouse fallback for desktop testing
  base.addEventListener('mousedown', handleTouchStart);
  window.addEventListener('mousemove', e => {
    if (joystickActive && joystickTouchId === 'mouse') handleTouchMove(e);
  });
  window.addEventListener('mouseup', e => {
    if (joystickActive && joystickTouchId === 'mouse') handleTouchEnd(e);
  });
}
initVirtualJoystick();

// ══════════════════════════════════════════════
//  ONLINE MULTIPLAYER SYSTEM (4 PLAYERS)
// ══════════════════════════════════════════════

function openOnlineModal() {
  elOverStart.classList.add('hidden');
  elOverOnline.classList.remove('hidden');
  elViewOnlineMenu.classList.remove('hidden');
  elViewOnlineLobby.classList.add('hidden');
  elOnlineError.classList.add('hidden');
}

function closeOnlineModal() {
  leaveOnlineRoom();
}

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// ── Active Rooms Registry (Persistence & Room Discovery) ──
function registerActiveRoom(code, hostName) {
  try {
    const rooms = getActiveRooms();
    rooms[code] = {
      code: code,
      hostName: hostName,
      playerCount: roomPlayers.length,
      updatedAt: Date.now()
    };
    localStorage.setItem('disaster_active_rooms', JSON.stringify(rooms));
  } catch (e) {}
}

function updateActiveRoomPlayerCount(code, count) {
  try {
    const rooms = getActiveRooms();
    if (rooms[code]) {
      rooms[code].playerCount = count;
      rooms[code].updatedAt = Date.now();
      localStorage.setItem('disaster_active_rooms', JSON.stringify(rooms));
    }
  } catch (e) {}
}

function removeActiveRoom(code) {
  try {
    const rooms = getActiveRooms();
    delete rooms[code];
    localStorage.setItem('disaster_active_rooms', JSON.stringify(rooms));
  } catch (e) {}
}

function getActiveRooms() {
  try {
    const data = localStorage.getItem('disaster_active_rooms');
    const parsed = data ? JSON.parse(data) : {};
    const now = Date.now();
    for (const k in parsed) {
      if (now - parsed[k].updatedAt > 1800000) delete parsed[k]; // 30 min expiry
    }
    return parsed;
  } catch (e) {
    return {};
  }
}

function createOnlineRoom() {
  const nameInput = elOnlinePlayerName.value.trim();
  myPlayerName = nameInput || 'Host';
  currentRoomCode = generateRoomCode();
  isHost = true;
  isMultiplayer = true;
  mySlot = 0;

  roomPlayers = [{
    id: myPlayerId,
    name: myPlayerName,
    slot: 0,
    isHost: true,
    ready: true,
    isAlive: true,
    hp: MAX_HP,
    isFrozen: false,
    score: 0,
    time: 0,
    skinId: equippedSkinId,
  }];

  registerActiveRoom(currentRoomCode, myPlayerName);

  if (roomHeartbeatTimer) clearInterval(roomHeartbeatTimer);
  roomHeartbeatTimer = setInterval(() => {
    if (isHost && currentRoomCode) {
      updateActiveRoomPlayerCount(currentRoomCode, roomPlayers.length);
    }
  }, 3000);

  initNetwork(currentRoomCode);
  enterLobbyView();
}

function joinOnlineRoom() {
  const nameInput = elOnlinePlayerName.value.trim();
  const codeInput = elInputRoomCode.value.trim().toUpperCase();

  if (!codeInput || codeInput.length < 3) {
    showOnlineError('Vui lòng nhập mã phòng hợp lệ!');
    return;
  }

  // Check known rooms for room capacity
  const activeRooms = getActiveRooms();
  if (activeRooms[codeInput] && activeRooms[codeInput].playerCount >= 4) {
    showOnlineError('Phòng đã đầy người (4/4), bạn không thể vô!');
    return;
  }

  myPlayerName = nameInput || 'Khách';
  currentRoomCode = codeInput;
  isHost = false;
  isMultiplayer = true;
  mySlot = 1;

  roomPlayers = [{
    id: myPlayerId,
    name: myPlayerName,
    slot: 1,
    isHost: false,
    ready: false, // Guests start as NOT ready
    isAlive: true,
    hp: MAX_HP,
    isFrozen: false,
    score: 0,
    time: 0,
    skinId: equippedSkinId,
  }];

  initNetwork(currentRoomCode);

  broadcastNetworkMessage({
    type: 'JOIN_REQUEST',
    id: myPlayerId,
    name: myPlayerName,
    skinId: equippedSkinId,
  });

  enterLobbyView();

  // Watchdog timeout: if host doesn't respond or room doesn't exist
  if (joinWatchdogTimer) clearTimeout(joinWatchdogTimer);
  joinWatchdogTimer = setTimeout(() => {
    if (roomPlayers.length <= 1 && !isHost && isMultiplayer) {
      leaveOnlineRoom();
      elOverOnline.classList.remove('hidden');
      elViewOnlineMenu.classList.remove('hidden');
      elViewOnlineLobby.classList.add('hidden');
      elOverStart.classList.add('hidden');
      showOnlineError('Mã phòng không tồn tại hoặc chủ phòng đã đóng!');
    }
  }, 4500);
}

function showOnlineError(msg) {
  elOnlineError.textContent = msg;
  elOnlineError.classList.remove('hidden');
}

function copyRoomCode() {
  navigator.clipboard.writeText(currentRoomCode).then(() => {
    const btn = document.getElementById('btnCopyCode');
    if (btn) {
      btn.textContent = '✅ Đã chép';
      setTimeout(() => btn.textContent = '📋 Copy', 1500);
    }
  });
}

function enterLobbyView() {
  elViewOnlineMenu.classList.add('hidden');
  elViewOnlineLobby.classList.remove('hidden');
  elDisplayRoomCode.textContent = currentRoomCode;

  if (isHost) {
    if (elBtnStartMultiGame) {
      elBtnStartMultiGame.classList.remove('hidden');
      elBtnStartMultiGame.style.display = 'inline-flex';
    }
    if (elGuestWaitingMsg) {
      elGuestWaitingMsg.classList.add('hidden');
      elGuestWaitingMsg.style.display = 'none';
    }
    if (elBtnToggleReady) {
      elBtnToggleReady.classList.add('hidden');
      elBtnToggleReady.style.display = 'none';
    }
  } else {
    if (elBtnStartMultiGame) {
      elBtnStartMultiGame.classList.add('hidden');
      elBtnStartMultiGame.style.display = 'none';
    }
    if (elGuestWaitingMsg) {
      elGuestWaitingMsg.classList.remove('hidden');
      elGuestWaitingMsg.style.display = 'block';
    }
    if (elBtnToggleReady) {
      elBtnToggleReady.classList.remove('hidden');
      elBtnToggleReady.style.display = 'inline-flex';
    }
  }

  updateLobbyUI();
}

function togglePlayerReady() {
  if (isHost) return;
  const me = roomPlayers.find(p => p.id === myPlayerId);
  if (!me) return;

  me.ready = !me.ready;
  updateReadyButtonUI(me.ready);

  broadcastNetworkMessage({
    type: 'PLAYER_READY_TOGGLE',
    id: myPlayerId,
    ready: me.ready
  });

  updateLobbyUI();
}

function updateReadyButtonUI(isReady) {
  if (!elBtnToggleReady) return;
  elBtnToggleReady.classList.remove('ready-state-yes', 'ready-state-no');
  if (isReady) {
    elBtnToggleReady.classList.add('ready-state-yes');
    if (elTextToggleReady) elTextToggleReady.textContent = 'CHƯA SẴN SÀNG (HỦY)';
  } else {
    elBtnToggleReady.classList.add('ready-state-no');
    if (elTextToggleReady) elTextToggleReady.textContent = 'SẴN SÀNG';
  }
}

function updateLobbyUI() {
  elDisplayPlayerCount.textContent = `${roomPlayers.length}/4 người chơi`;
  elPlayerSlots.innerHTML = '';

  for (let i = 0; i < 4; i++) {
    const p = roomPlayers.find(pl => pl.slot === i);
    const card = document.createElement('div');
    card.className = `slot-card p${i} ${p ? '' : 'empty'}`;

    if (p) {
      const isMe = p.id === myPlayerId;
      let roleHtml = '';
      if (p.isHost) {
        roleHtml = `<span class="slot-role host"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" style="vertical-align:middle"><path d="M2 4l3 12h14l3-12-5 4-5-6-5 6z"/></svg> Host</span>`;
      } else if (p.ready) {
        roleHtml = `<span class="slot-role ready">✅ Sẵn sàng</span>`;
      } else {
        roleHtml = `<span class="slot-role not-ready">⏳ Chưa sẵn sàng</span>`;
      }

      card.innerHTML = `
        <span class="slot-avatar">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="7" r="4"/><path d="M5.5 21v-2a4.5 4.5 0 0 1 4.5-4.5h4a4.5 4.5 0 0 1 4.5 4.5v2"/></svg>
        </span>
        <span class="slot-name">${p.name} ${isMe ? '(Bạn)' : ''}</span>
        ${roleHtml}
      `;
    } else {
      card.innerHTML = `
        <span class="slot-avatar" style="opacity:0.35">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </span>
        <span class="slot-name">Vị trí ${i + 1} trống</span>
        <span class="slot-role" style="opacity:0.4">Chờ...</span>
      `;
    }
    elPlayerSlots.appendChild(card);
  }

  // Update Host Start Button and Ready Notice
  if (isHost) {
    if (elBtnToggleReady) {
      elBtnToggleReady.classList.add('hidden');
      elBtnToggleReady.style.display = 'none';
    }
    if (elBtnStartMultiGame) {
      elBtnStartMultiGame.classList.remove('hidden');
      elBtnStartMultiGame.style.display = 'inline-flex';
    }
    if (elGuestWaitingMsg) {
      elGuestWaitingMsg.classList.add('hidden');
      elGuestWaitingMsg.style.display = 'none';
    }

    const guests = roomPlayers.filter(p => !p.isHost);
    if (guests.length === 0) {
      elBtnStartMultiGame.disabled = false;
      if (elTextStartMulti) elTextStartMulti.textContent = 'Bắt đầu chơi ngay';
      if (elLobbyNoticeBar) {
        elLobbyNoticeBar.className = 'lobby-notice-bar waiting';
        elLobbyNoticeBar.textContent = 'Đang chờ thêm người chơi nhập mã phòng...';
        elLobbyNoticeBar.classList.remove('hidden');
      }
    } else {
      const unreadyGuests = guests.filter(p => !p.ready);
      if (unreadyGuests.length > 0) {
        // "nếu chưa sẵn sàng chủ sẽ không vào được chơi"
        elBtnStartMultiGame.disabled = true;
        if (elTextStartMulti) elTextStartMulti.textContent = 'Chờ người chơi sẵn sàng...';
        if (elLobbyNoticeBar) {
          elLobbyNoticeBar.className = 'lobby-notice-bar waiting';
          elLobbyNoticeBar.textContent = `⏳ Còn ${unreadyGuests.length} người chơi chưa bấm SẴN SÀNG!`;
          elLobbyNoticeBar.classList.remove('hidden');
        }
      } else {
        elBtnStartMultiGame.disabled = false;
        if (elTextStartMulti) elTextStartMulti.textContent = '🚀 Bắt đầu trận đấu';
        if (elLobbyNoticeBar) {
          elLobbyNoticeBar.className = 'lobby-notice-bar ready-all';
          elLobbyNoticeBar.textContent = '✅ Tất cả người chơi đã sẵn sàng! Chủ phòng có thể bắt đầu.';
          elLobbyNoticeBar.classList.remove('hidden');
        }
      }
    }
  } else {
    // Guest view
    if (elBtnToggleReady) {
      elBtnToggleReady.classList.remove('hidden');
      elBtnToggleReady.style.display = 'inline-flex';
    }
    if (elBtnStartMultiGame) {
      elBtnStartMultiGame.classList.add('hidden');
      elBtnStartMultiGame.style.display = 'none';
    }
    if (elGuestWaitingMsg) {
      elGuestWaitingMsg.classList.remove('hidden');
      elGuestWaitingMsg.style.display = 'block';
    }

    const me = roomPlayers.find(p => p.id === myPlayerId);
    const myReady = me ? me.ready : false;
    updateReadyButtonUI(myReady);

    if (elLobbyNoticeBar) {
      if (myReady) {
        elLobbyNoticeBar.className = 'lobby-notice-bar ready-all';
        elLobbyNoticeBar.textContent = '✅ Bạn đã sẵn sàng! Đang chờ Host bắt đầu trận đấu...';
      } else {
        elLobbyNoticeBar.className = 'lobby-notice-bar waiting';
        elLobbyNoticeBar.textContent = '👉 Hãy bấm nút "SẴN SÀNG" bên dưới để Host có thể bắt đầu!';
      }
      elLobbyNoticeBar.classList.remove('hidden');
    }
  }

  updateMultiHud();
}

function updateMultiHud() {
  if (!isMultiplayer) return;

  for (let i = 0; i < 4; i++) {
    const badge = document.getElementById(`mpBadge${i}`);
    if (!badge) continue;

    const p = roomPlayers.find(pl => pl.slot === i);
    if (p) {
      badge.style.display = 'inline-flex';
      const nameEl = badge.querySelector('.mp-name');
      const scoreEl = badge.querySelector('.mp-score');
      const iconEl = badge.querySelector('.mp-icon');

      if (nameEl) nameEl.textContent = p.name;
      if (scoreEl) scoreEl.textContent = `${p.hp !== undefined ? p.hp : 100}HP • ${p.score || 0}đ`;

      if (p.isAlive) {
        badge.classList.remove('dead');
        if (iconEl) {
          iconEl.innerHTML = p.isHost 
            ? '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#ffd700" stroke-width="2.2"><path d="M2 4l3 12h14l3-12-5 4-5-6-5 6z"/></svg>' 
            : (p.isFrozen 
              ? '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#67e8f9" stroke-width="2.2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>' 
              : '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#4ade80" stroke-width="2.2"><circle cx="12" cy="7" r="4"/><path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/></svg>');
        }
      } else {
        badge.classList.add('dead');
        if (iconEl) {
          iconEl.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#f43f5e" stroke-width="2.2"><circle cx="12" cy="11" r="7"/><path d="M9 18v3h6v-3"/><circle cx="9" cy="10" r="1.5" fill="#f43f5e"/><circle cx="15" cy="10" r="1.5" fill="#f43f5e"/></svg>';
        }
      }
    } else {
      badge.style.display = 'none';
    }
  }
}

function leaveOnlineRoom() {
  if (joinWatchdogTimer) {
    clearTimeout(joinWatchdogTimer);
    joinWatchdogTimer = null;
  }
  if (roomHeartbeatTimer) {
    clearInterval(roomHeartbeatTimer);
    roomHeartbeatTimer = null;
  }
  if (currentRoomCode) {
    removeActiveRoom(currentRoomCode);
  }
  if (broadcastChannel) {
    try {
      broadcastNetworkMessage({ type: 'LEAVE', id: myPlayerId, slot: mySlot });
      broadcastChannel.close();
    } catch (e) {}
    broadcastChannel = null;
  }
  for (const conn of peerConnections) {
    try { conn.close(); } catch (e) {}
  }
  peerConnections = [];
  if (peer) {
    try { peer.destroy(); } catch (e) {}
    peer = null;
  }

  isMultiplayer = false;
  isHost = false;
  currentRoomCode = null;
  roomPlayers = [];

  if (elMultiHud) elMultiHud.classList.add('hidden');
  if (elViewOnlineLobby) elViewOnlineLobby.classList.add('hidden');
  if (elViewOnlineMenu) elViewOnlineMenu.classList.remove('hidden');
  if (elOverOnline) elOverOnline.classList.add('hidden');
  if (elOverStart) elOverStart.classList.remove('hidden');
  if (elOnlineError) elOnlineError.classList.add('hidden');
}

function hostStartMatch() {
  if (!isHost) return;
  const guests = roomPlayers.filter(p => !p.isHost);
  const unreadyGuests = guests.filter(p => !p.ready);
  if (guests.length > 0 && unreadyGuests.length > 0) {
    showToast('⚠️ Không thể bắt đầu! Còn người chơi chưa bấm SẴN SÀNG.');
    return;
  }
  broadcastNetworkMessage({ type: 'START_MATCH', speed: currentSpeed });
  startMultiMatchGame();
}

function startMultiMatchGame() {
  elOverOnline.classList.add('hidden');
  elOverMultiGO.classList.add('hidden');
  if (elModeSubtitle) elModeSubtitle.textContent = `Phòng: ${currentRoomCode}`;
  startGame();
}

function hostRestartMatch() {
  if (!isHost) return;
  broadcastNetworkMessage({ type: 'RESTART_MATCH' });
  startMultiMatchGame();
}

function returnToLobby() {
  running = false;
  if (countdownTimerId) { clearInterval(countdownTimerId); countdownTimerId = null; }
  isCountingDown = false;
  if (elOverCountdown) elOverCountdown.classList.add('hidden');
  if (loopId) cancelAnimationFrame(loopId);
  elOverMultiGO.classList.add('hidden');
  elOverOnline.classList.remove('hidden');
  elViewOnlineMenu.classList.add('hidden');
  elViewOnlineLobby.classList.remove('hidden');
  updateLobbyUI();
}

// ── Networking (PeerJS + BroadcastChannel) ────
function initNetwork(roomCode) {
  try {
    if (broadcastChannel) broadcastChannel.close();
    broadcastChannel = new BroadcastChannel(`disaster_room_${roomCode}`);
    broadcastChannel.onmessage = (e) => handleNetworkMessage(e.data);
  } catch (err) {
    console.warn('BroadcastChannel error:', err);
  }

  if (window.Peer) {
    try {
      const peerId = isHost ? `distsurv_${roomCode}_host` : `distsurv_${roomCode}_${myPlayerId}`;
      if (peer) peer.destroy();
      peer = new Peer(peerId, { debug: 0 });

      peer.on('open', (id) => {
        if (!isHost) {
          const conn = peer.connect(`distsurv_${roomCode}_host`);
          conn.on('open', () => {
            peerConnections.push(conn);
            conn.send({ type: 'JOIN_REQUEST', id: myPlayerId, name: myPlayerName, skinId: equippedSkinId });
          });
          conn.on('data', (data) => handleNetworkMessage(data));
        }
      });

      peer.on('connection', (conn) => {
        peerConnections.push(conn);
        conn.on('data', (data) => {
          handleNetworkMessage(data);
          if (isHost) broadcastNetworkMessage(data, conn);
        });
      });
    } catch (e) {
      console.warn('PeerJS init error:', e);
    }
  }
}

function broadcastNetworkMessage(msg, excludeConn = null) {
  if (broadcastChannel) {
    try { broadcastChannel.postMessage(msg); } catch (e) {}
  }
  for (const conn of peerConnections) {
    if (conn !== excludeConn && conn.open) {
      try { conn.send(msg); } catch (e) {}
    }
  }
}

function handleNetworkMessage(msg) {
  if (!msg || !msg.type) return;

  switch (msg.type) {
    case 'JOIN_REQUEST': {
      if (isHost) {
        if (roomPlayers.length >= 4) {
          broadcastNetworkMessage({
            type: 'ROOM_FULL',
            targetId: msg.id,
            message: 'Phòng đã đầy người (4/4), bạn không thể vô!'
          });
          return;
        }
        let existing = roomPlayers.find(p => p.id === msg.id);
        if (!existing) {
          const slot = roomPlayers.length;
          roomPlayers.push({
            id: msg.id, name: msg.name, slot: slot, isHost: false,
            ready: false, isAlive: true, hp: MAX_HP, isFrozen: false, score: 0, time: 0,
            skinId: msg.skinId || 'default'
          });
          updateActiveRoomPlayerCount(currentRoomCode, roomPlayers.length);
        }
        broadcastNetworkMessage({ type: 'ROOM_UPDATE', players: roomPlayers });
        updateLobbyUI();
      }
      break;
    }

    case 'PLAYER_READY_TOGGLE': {
      const pl = roomPlayers.find(p => p.id === msg.id);
      if (pl) {
        pl.ready = !!msg.ready;
        if (isHost) {
          broadcastNetworkMessage({ type: 'ROOM_UPDATE', players: roomPlayers });
        }
        updateLobbyUI();
      }
      break;
    }

    case 'ROOM_FULL': {
      if (msg.targetId === myPlayerId) {
        if (joinWatchdogTimer) {
          clearTimeout(joinWatchdogTimer);
          joinWatchdogTimer = null;
        }
        leaveOnlineRoom();
        elOverOnline.classList.remove('hidden');
        elViewOnlineMenu.classList.remove('hidden');
        elViewOnlineLobby.classList.add('hidden');
        elOverStart.classList.add('hidden');
        showOnlineError('Phòng đã đầy người (4/4), bạn không thể vô!');
        showToast('⚠️ Phòng đã đầy người (4/4), bạn không thể vô!');
      }
      break;
    }

    case 'ROOM_UPDATE': {
      if (joinWatchdogTimer) {
        clearTimeout(joinWatchdogTimer);
        joinWatchdogTimer = null;
      }
      roomPlayers = msg.players || [];
      const me = roomPlayers.find(p => p.id === myPlayerId);
      if (me) mySlot = me.slot;
      updateLobbyUI();
      break;
    }

    case 'START_MATCH': { setSpeed(msg.speed || 'normal'); startMultiMatchGame(); break; }
    case 'RESTART_MATCH': { startMultiMatchGame(); break; }

    case 'PLAYER_MOVE': {
      const p = roomPlayers.find(pl => pl.slot === msg.slot);
      if (p) {
        p.x = msg.x; p.y = msg.y; p.dir = msg.dir;
        p.hp = msg.hp; p.isFrozen = msg.isFrozen;
        p.score = msg.score; p.time = msg.time; p.isAlive = msg.isAlive;
        p.hasGun = msg.hasGun;
        if (msg.skinId) p.skinId = msg.skinId;
      }
      updateMultiHud();
      break;
    }

    case 'PLAYER_DEATH': {
      const p = roomPlayers.find(pl => pl.slot === msg.slot);
      if (p) {
        p.isAlive = false; p.deathCause = msg.reason;
        p.hp = 0; p.score = msg.score; p.time = msg.time;
      }
      updateMultiHud();
      checkMultiplayerMatchEnd();
      break;
    }

    case 'TRAP_DEPLOYED': {
      if (!placedTraps.some(t => t.id === msg.trap.id)) placedTraps.push(msg.trap);
      break;
    }

    case 'MINE_DEPLOYED': {
      if (!placedMines.some(m => m.id === msg.mine.id)) {
        placedMines.push(msg.mine);
        if (msg.announcer !== myPlayerName) showToast(`CẢNH BÁO: ${msg.announcer} vừa gài Mìn Tàng Hình!`);
      }
      break;
    }

    case 'TRAP_TRIGGERED': {
      placedTraps = placedTraps.filter(t => t.id !== msg.trapId);
      const victim = roomPlayers.find(p => p.slot === msg.victimSlot);
      if (victim) { victim.isFrozen = true; setTimeout(() => { victim.isFrozen = false; }, 3000); }
      break;
    }

    case 'MINE_EXPLODED': {
      placedMines = placedMines.filter(m => m.id !== msg.mineId);
      explodeLandmine({ x: msg.x, y: msg.y });
      break;
    }

    case 'GUN_SHOT': {
      if (msg.slot !== mySlot) {
        bullets.push({
          x: msg.x, y: msg.y, vx: msg.vx, vy: msg.vy,
          ownerSlot: msg.slot, distTraveled: 0, trail: [],
        });
      }
      break;
    }

    case 'BULLET_HIT': {
      if (msg.victimSlot === mySlot) {
        const shooter = roomPlayers.find(p => p.slot === msg.shooterSlot);
        takeDamage(msg.damage, `Bị bắn hạ bởi ${shooter?.name || 'ai đó'}!`);
      }
      break;
    }

    case 'SYNC_DISASTERS': {
      if (!isHost) applyDisasterSync(msg);
      break;
    }

    case 'MATCH_OVER': { showMultiplayerGameOver(msg.leaderboard); break; }

    case 'LEAVE': {
      roomPlayers = roomPlayers.filter(pl => pl.id !== msg.id);
      updateLobbyUI();
      break;
    }
  }
}

function broadcastDisasterSync() {
  const syncMsg = {
    type: 'SYNC_DISASTERS',
    fireWave: fireWave,
    spreadingFlames: Array.from(spreadingFlames.entries()).map(([k, v]) => ({ key: k, x: v.x, y: v.y, life: v.life, gen: v.gen, isVolcanoEmber: !!v.isVolcanoEmber })),
    thunderstorm: thunderstorm ? { state: thunderstorm.state, targetZones: thunderstorm.targetZones } : null,
    lightningCells: Array.from(lightningCells),
    puddleCells: Array.from(puddleCells),
    electrifiedPuddles: Array.from(electrifiedPuddles),
    tornado: tornado ? { x: tornado.x, y: tornado.y, vx: tornado.vx, vy: tornado.vy, state: tornado.state, angle: tornado.angle } : null,
    tornadoes: tornadoes.map(t => ({ id: t.id, x: t.x, y: t.y, vx: t.vx, vy: t.vy, state: t.state, stateTime: t.stateTime, angle: t.angle })),
    landslide: landslide ? { state: landslide.state, zones: landslide.zones } : null,
    sinkholeCells: Array.from(sinkholeCells),
    bombs: bombs,
    items: items,
    placedTraps: placedTraps,
    placedMines: placedMines,
  };
  broadcastNetworkMessage(syncMsg);
}

function applyDisasterSync(sync) {
  if (sync.fireWave !== undefined) fireWave = sync.fireWave;

  if (sync.spreadingFlames) {
    spreadingFlames = new Map();
    for (const item of sync.spreadingFlames) {
      spreadingFlames.set(item.key, { x: item.x, y: item.y, life: item.life, maxLife: 7500, gen: item.gen, isVolcanoEmber: !!item.isVolcanoEmber, spreadTimer: 800 });
      burntGrass.set(item.key, 12000);
    }
  }

  if (sync.thunderstorm !== undefined) {
    if (sync.thunderstorm) {
      if (!thunderstorm) thunderstorm = { state: sync.thunderstorm.state, stateTime: 0, targetZones: sync.thunderstorm.targetZones, flashAlpha: 0 };
      else { thunderstorm.state = sync.thunderstorm.state; thunderstorm.targetZones = sync.thunderstorm.targetZones; }
    } else {
      thunderstorm = null;
    }
  }

  if (sync.lightningCells) lightningCells = new Set(sync.lightningCells);
  if (sync.puddleCells) puddleCells = new Set(sync.puddleCells);
  if (sync.electrifiedPuddles) electrifiedPuddles = new Set(sync.electrifiedPuddles);

  if (sync.tornadoes !== undefined) {
    tornadoes = sync.tornadoes;
    tornado = tornadoes[0] || null;
  } else if (sync.tornado !== undefined) {
    tornado = sync.tornado;
    tornadoes = sync.tornado ? [sync.tornado] : [];
  }
  if (sync.landslide !== undefined) landslide = sync.landslide;
  if (sync.sinkholeCells) sinkholeCells = new Set(sync.sinkholeCells);
  if (sync.bombs) bombs = sync.bombs;
  if (sync.items) items = sync.items;
  if (sync.placedTraps) placedTraps = sync.placedTraps;
  if (sync.placedMines) placedMines = sync.placedMines;
}

function checkMultiplayerMatchEnd() {
  if (!isMultiplayer) return;

  const alivePlayers = roomPlayers.filter(p => p.isAlive);

  if (alivePlayers.length <= 1) {
    if (isHost) {
      const sorted = [...roomPlayers].sort((a, b) => {
        if (a.isAlive && !b.isAlive) return -1;
        if (!a.isAlive && b.isAlive) return 1;
        return (b.score || 0) - (a.score || 0);
      });

      broadcastNetworkMessage({ type: 'MATCH_OVER', leaderboard: sorted });
      showMultiplayerGameOver(sorted);
    }
  }
}

function showMultiplayerGameOver(leaderboard) {
  running = false;
  if (loopId) cancelAnimationFrame(loopId);
  hideWarning();

  // Award coins in multiplayer too
  roundCoins = Math.floor(survivalTime * 2) + Math.floor((Math.floor(survivalTime * 10) + bonusScore) / 10);
  playerCoins += roundCoins;
  saveShopData();
  updateCoinDisplays();

  elResRoomCode.textContent = currentRoomCode;
  elLeaderboardList.innerHTML = '';

  leaderboard.forEach((p, idx) => {
    const row = document.createElement('div');
    row.className = 'lb-row';
    const isWinner = idx === 0 && p.isAlive;
    const rankBadge = isWinner 
      ? '<span class="lb-badge-winner" style="display:inline-flex;align-items:center;gap:4px;color:#ffd700;font-weight:800"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M6 9H4a2 2 0 0 1-2-2V5h4m14 4h2a2 2 0 0 0 2-2V5h-4M6 5h12v6a6 6 0 0 1-12 0V5zm4 10v4m4-4v4m-6 0h8"/></svg>#1 TOP</span>'
      : `<span class="lb-rank" style="font-weight:800;color:${idx === 1 ? '#94a3b8' : idx === 2 ? '#b45309' : '#64748b'}">#${idx + 1}</span>`;

    row.innerHTML = `
      <div class="lb-rank-group">
        <span class="lb-rank">${rankBadge}</span>
        <span class="lb-name">${p.name} ${p.id === myPlayerId ? '(Bạn)' : ''}</span>
      </div>
      <div class="lb-stats">
        <span class="lb-score">${p.score || 0} điểm</span>
        <span class="lb-time">${(p.time || 0).toFixed(1)}s ${p.isAlive ? '• Sống sót' : '• Đã ngã xuống'}</span>
      </div>
    `;
    elLeaderboardList.appendChild(row);
  });

  if (isHost) elBtnHostPlayAgain.classList.remove('hidden');
  else elBtnHostPlayAgain.classList.add('hidden');

  elOverMultiGO.classList.remove('hidden');
}
