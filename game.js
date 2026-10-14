/* ═══════════════════════════════════════════════
   Thoát Khỏi Thiên Tai — Disaster Survival (game.js)
   100 HP, Traps & Landmines Edition:
   - Hệ thống 100 HP, mất máu theo hiểm họa & hồi máu bằng Tim ❤️ (5-10 HP)
   - Túi đồ phím 1 (Bẫy kẹp 🪤) & phím 2 (Mìn tàng hình 💣)
   - Bẫy kẹp: Hiện rõ, ai dẫm trúng (kể cả người thả) bị đứng yên 3s và mất máu
   - Mìn tàng hình: Thông báo khi thả, tàng hình hoàn toàn, dẫm trúng nổ lan người xung quanh
   - Lửa núi lửa đốt lan từ điểm quét, trời mưa/vũng nước dập tắt lửa
   - Lốc xoáy, bão sấm chớp nhiễm điện vũng nước, sụt lở đất
   - Đồng bộ chơi Online 4 người đầy đủ (PeerJS + BroadcastChannel)
   ═══════════════════════════════════════════════ */

// ── Config ────────────────────────────────────
const GRID = 20;                 // cells per row/col
const CELL = 24;                 // px per cell
const CANVAS_PX = GRID * CELL;   // 480 px

const SPEEDS = { slow: 140, normal: 105, fast: 75 };
let currentSpeed = 'normal';

const MAX_HP = 100;

// Disaster Timers (Independent & Concurrent)
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

// 4 Player Appearance Skins
const PLAYER_SKINS = [
  { jacket: '#ea580c', cap: '#0284c7', glow: '#fb923c', name: 'Người chơi 1' }, // Cam đỏ
  { jacket: '#0284c7', cap: '#f59e0b', glow: '#38bdf8', name: 'Người chơi 2' }, // Xanh cyan
  { jacket: '#16a34a', cap: '#ec4899', glow: '#4ade80', name: 'Người chơi 3' }, // Xanh lá
  { jacket: '#9333ea', cap: '#14b8a6', glow: '#c084fc', name: 'Người chơi 4' }, // Tím
];

const INITIAL_SPAWNS = [
  { x: 5,  y: 5  },
  { x: 14, y: 5  },
  { x: 5,  y: 14 },
  { x: 14, y: 14 },
];

// ── DOM refs ──────────────────────────────────
const canvas        = document.getElementById('gameCanvas');
const ctx           = canvas.getContext('2d');
const elScore       = document.getElementById('score');
const elTimeDisplay = document.getElementById('timeDisplay');
const elBest        = document.getElementById('bestScore');
const elFinal       = document.getElementById('finalScore');
const elFinalTime   = document.getElementById('finalTime');
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

let isCountingDown   = false;
let countdownTimerId = null;

// HP & Inventory DOM refs
const elHpFill      = document.getElementById('hpFill');
const elHpText      = document.getElementById('hpText');
const elCountTrap   = document.getElementById('countTrap');
const elCountMine   = document.getElementById('countMine');
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
const elResRoomCode       = document.getElementById('resRoomCode');
const elLeaderboardList   = document.getElementById('leaderboardList');
const elBtnHostPlayAgain  = document.getElementById('btnHostPlayAgain');
const elModeSubtitle      = document.getElementById('modeSubtitle');

canvas.width  = CANVAS_PX;
canvas.height = CANVAS_PX;

// ── Player & Gameplay State ───────────────────
let player, dir, nextDir, running, paused, loopId, lastTime;
let survivalTime = 0;   // in seconds
let bonusScore = 0;
let bestScore = 0;
let particles = [];
let trail = [];
let floatingTexts = [];

// HP System (100 HP)
let hp = MAX_HP;
let damageCooldown = 0;
let trapFrozenTimer = 0; // Frozen duration when trapped

// Inventory System (Key 1: Trap, Key 2: Landmine)
let trapCount = 1;
let mineCount = 1;
let items = [];
let itemTimer = 3000;
let placedTraps = []; // { id, x, y, ownerSlot, ownerName }
let placedMines = []; // { id, x, y, ownerSlot, ownerName }

// ── Concurrent Disasters State ────────────────
// 1. Núi lửa & Lửa đốt lan & Cỏ cháy
let fireWave = null;
let fireCells = new Set();
let spreadingFlames = new Map(); // "x,y" => { x, y, life, maxLife, gen, spreadTimer }
let burntGrass = new Map();      // "x,y" => duration remaining
let fireTimer = 4000;

// 2. Thunderstorm & Mưa dập lửa & Vũng nước dẫn điện
let thunderstorm = null;
let lightningCells = new Set();
let raindrops = [];
let puddleCells = new Set();       // "x,y" of water puddles
let electrifiedPuddles = new Set();// "x,y" of shocked water
let puddleSpreadAcc = 0;
let thunderTimer = 8000;

// 3. Tornado (1 to 3 random tornadoes)
let tornadoes = [];
let tornado = null;
let tornadoTimer = 11000;

// Burn & Environmental Damage over Time (DoT)
let burnDuration = 0;       // Remaining ms of burn effect on player
let burnTickCooldown = 0;   // Cooldown between fire burn ticks
let electroTickCooldown = 0;// Cooldown between electrified puddle ticks
let sinkholeTickCooldown = 0;// Cooldown between sinkhole ticks
let tornadoTickCooldown = 0;// Cooldown between tornado ticks
let playerHurtFlash = 0;    // Visual hurt tint without screen shake
let lawnCanvas = null;      // Cached pre-rendered background canvas

// 4. Landslides (2-4 Dead Zones)
let landslide = null;
let sinkholeCells = new Set();
let landslideTimer = 14000;

// 5. Bombs
let bombs = [];
let craters = [];
let bombTimer = 6000;

// ── Multiplayer State ─────────────────────────
let isMultiplayer = false;
let isHost = false;
let mySlot = 0;
let myPlayerId = 'p_' + Math.random().toString(36).substring(2, 8);
let myPlayerName = 'Chiến Binh';
let currentRoomCode = '';
let roomPlayers = []; // { id, name, slot, isHost, ready, isAlive, deathCause, x, y, dir, hp, isFrozen, score, time }
let isSpectator = false;
let broadcastChannel = null;
let peer = null;
let peerConnections = [];
let lastSyncDisasterTime = 0;
let toastTimeout = null;

bestScore = parseInt(localStorage.getItem('disasterSurvivalBestScore') || '0', 10);
elBest.textContent = bestScore;

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

// ── Background firefly particles ──────────────
(function initBgParticles() {
  const container = document.getElementById('bgParticles');
  if (!container) return;
  const colors = ['#86efac', '#4ade80', '#fef08a', '#facc15', '#38bdf8'];
  for (let i = 0; i < 35; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const sz = 2 + Math.random() * 4;
    p.style.cssText = `
      width:${sz}px;height:${sz}px;
      left:${Math.random()*100}%;
      background:${colors[i%colors.length]};
      box-shadow: 0 0 6px ${colors[i%colors.length]};
      animation-duration:${7+Math.random()*12}s;
      animation-delay:${-Math.random()*20}s;
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

// ══════════════════════════════════════════════
//  GAME START & RESET
// ══════════════════════════════════════════════

function startSoloGame() {
  isMultiplayer = false;
  isHost = true;
  mySlot = 0;
  isSpectator = false;
  if (elMultiHud) elMultiHud.classList.add('hidden');
  if (elModeSubtitle) elModeSubtitle.textContent = 'Chơi Đơn (Solo)';
  startGame();
}

function startGame() {
  const spawn = isMultiplayer ? INITIAL_SPAWNS[mySlot % 4] : { x: 10, y: 10 };
  player  = { x: spawn.x, y: spawn.y };
  // Hướng chạy ban đầu (không đứng yên để tránh bất tử)
  const initDir = (spawn.x < GRID / 2) ? { x: 1, y: 0 } : { x: -1, y: 0 };
  dir     = { ...initDir };
  nextDir = { ...initDir };
  survivalTime = 0;
  bonusScore = 0;
  paused  = false;
  running = true;
  isSpectator = false;
  particles = [];
  trail   = [];
  floatingTexts = [];

  // Reset HP & Inventory
  hp = MAX_HP;
  damageCooldown = 0;
  trapFrozenTimer = 0;
  trapCount = 1;
  mineCount = 1;
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
  bombTimer       = 5500;

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

  // Bắt đầu đếm ngược 3 2 1
  startCountdown();
}

// ── Đếm ngược 3 2 1 trước khi bắt đầu trận đấu ────
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
      elCountdownNum.textContent = 'BẮT ĐẦU! 🏃‍♂️';
      elCountdownNum.classList.add('go');
      elCountdownSub.textContent = 'CHẠY THOÁT THIÊN TAI!';
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
}

function takeDamage(amount, reason) {
  if (isSpectator || damageCooldown > 0) return;

  hp = Math.max(0, hp - amount);
  damageCooldown = 650; // Grace period before next tick of damage

  updateHpUI();
  spawnDamageParticles(player.x, player.y);
  spawnFloatingText(`-${amount} HP`, player.x, player.y, '#ef4444');

  wrapper.classList.add('shake');
  setTimeout(() => wrapper.classList.remove('shake'), 250);

  if (hp <= 0) {
    handlePlayerDeath(reason);
  }
}

// Sát thương rút máu êm theo thời gian (DoT) cho lửa, nước điện, cát lún, lốc xoáy...
function takeTickDamage(amount, reason, type = 'fire') {
  if (isSpectator) return;

  hp = Math.max(0, hp - amount);
  playerHurtFlash = 120;
  updateHpUI();

  let icon = '🔥';
  let color = '#f97316';
  if (type === 'electric') { icon = '⚡'; color = '#38bdf8'; }
  else if (type === 'tornado') { icon = '🌪️'; color = '#cbd5e1'; }
  else if (type === 'sinkhole') { icon = '🕳️'; color = '#d97706'; }

  spawnFloatingText(`-${amount} ${icon}`, player.x, player.y, color);

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
  spawnFloatingText(`+${actual} HP ❤️`, player.x, player.y, '#4ade80');
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
      color: '#ef4444',
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
    ctx.shadowColor = 'rgba(0,0,0,0.85)';
    ctx.shadowBlur = 4;
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
//  DEPLOY TRAPS & STEALTH MINES (KEYS 1 & 2)
// ══════════════════════════════════════════════

function deployTrap() {
  if (trapCount <= 0 || isSpectator || trapFrozenTimer > 0) return;
  trapCount--;
  updateInventoryUI();

  const trap = {
    id: 'trap_' + Math.random().toString(36).substring(2, 8),
    x: player.x,
    y: player.y,
    ownerSlot: mySlot,
    ownerName: myPlayerName,
    armTimer: 1800,     // 1.8s an toàn để người gài kịp bước ra ngoài
    steppedOff: false,  // Phải bước ra khỏi ô mới có thể bị dính lại nếu quay lại
  };
  placedTraps.push(trap);
  spawnFloatingText('ĐÃ ĐẶT BẪY 🪤', player.x, player.y, '#facc15');

  if (isMultiplayer) {
    broadcastNetworkMessage({
      type: 'TRAP_DEPLOYED',
      trap: trap,
    });
  }
}

function deployMine() {
  if (mineCount <= 0 || isSpectator || trapFrozenTimer > 0) return;
  mineCount--;
  updateInventoryUI();

  const mine = {
    id: 'mine_' + Math.random().toString(36).substring(2, 8),
    x: player.x,
    y: player.y,
    ownerSlot: mySlot,
    ownerName: myPlayerName,
    armTimer: 1800,     // 1.8s an toàn để người gài kịp bước ra ngoài
    steppedOff: false,  // Phải bước ra khỏi ô mới có thể bị dính lại nếu quay lại
  };
  placedMines.push(mine);

  const alertText = isMultiplayer
    ? `🚨 ${myPlayerName} vừa gài một quả Mìn Tàng Hình!`
    : `🚨 Bạn vừa gài Mìn Tàng Hình! Cẩn thận dẫm phải!`;
  showToast(alertText);
  spawnFloatingText('GÀI MÌN 💣 (ẨN)', player.x, player.y, '#f87171');

  if (isMultiplayer) {
    broadcastNetworkMessage({
      type: 'MINE_DEPLOYED',
      mine: mine,
      announcer: myPlayerName,
    });
  }
}

// Check player stepping on traps or mines
function checkTrapsAndMinesTrigger() {
  if (isSpectator) return;

  // 1. Check Traps (Kể cả người thả cũng tính dính bẫy nếu quay lại dẫm trúng)
  for (let i = placedTraps.length - 1; i >= 0; i--) {
    const t = placedTraps[i];
    const isOwner = (t.ownerSlot === mySlot);

    // Người thả: Phải bước ra khỏi ô (steppedOff) VÀ hết armTimer mới bị dính lại
    if (isOwner && (!t.steppedOff || t.armTimer > 0)) {
      continue;
    }
    // Người chơi khác: Cần sau 400ms mới kích hoạt
    if (!isOwner && t.armTimer > 1400) {
      continue;
    }

    if (t.x === player.x && t.y === player.y) {
      trapFrozenTimer = 3000; // 3 seconds freeze!
      takeDamage(15, 'Bị dính bẫy sắt và tử nạn!');
      showToast('🪤 BẠN BỊ DÍNH BẪY! Bất động 3 giây!');
      spawnFloatingText('BỊ KẸP CHÂN 🪤', player.x, player.y, '#facc15');
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

  // 2. Check Landmines (Mìn tàng hình dẫm trúng nổ lan, người thả cũng tính dính nếu quay lại)
  for (let i = placedMines.length - 1; i >= 0; i--) {
    const m = placedMines[i];
    const isOwner = (m.ownerSlot === mySlot);

    // Người thả: Phải bước ra khỏi ô (steppedOff) VÀ hết armTimer mới bị dính lại
    if (isOwner && (!m.steppedOff || m.armTimer > 0)) {
      continue;
    }
    // Người chơi khác: Cần sau 400ms mới kích hoạt
    if (!isOwner && m.armTimer > 1400) {
      continue;
    }

    if (m.x === player.x && m.y === player.y) {
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
  wrapper.classList.add('shake');
  setTimeout(() => wrapper.classList.remove('shake'), 400);

  // Mìn nổ lan bán kính 2 ô xung quanh!
  const blastRadius = 2;
  const px = player.x;
  const py = player.y;

  if (Math.hypot(px - mx, py - my) <= blastRadius + 0.3) {
    takeDamage(50, 'Bị nổ tung bởi quả mìn tàng hình!');
    showToast('💥 MÌN PHÁT NỔ LAN! Mất 50 HP!');
  }

  // Leave a burnt crater
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
//  PICKUP ITEMS (❤️ Tim hồi máu, 🪤 Bẫy, 💣 Mìn)
// ══════════════════════════════════════════════

function spawnItem() {
  if (items.length >= 3) return;
  let ix, iy, tries = 0;
  do {
    ix = 1 + Math.floor(Math.random() * (GRID - 2));
    iy = 1 + Math.floor(Math.random() * (GRID - 2));
    tries++;
  } while (tries < 100 && (Math.abs(ix - player.x) < 2 && Math.abs(iy - player.y) < 2));

  // 50% Tim ❤️ (hồi 5-10 HP), 25% Bẫy 🪤, 25% Mìn 💣
  const rand = Math.random();
  let type = 'heart';
  if (rand < 0.5) type = 'heart';
  else if (rand < 0.75) type = 'trap';
  else type = 'mine';

  items.push({ x: ix, y: iy, type, pulse: 0, life: 12000 });
}

function updateItems(dt) {
  if (isMultiplayer && !isHost) {
    for (const it of items) {
      it.pulse = (it.pulse || 0) + dt * 0.005;
      if (!isSpectator && it.x === player.x && it.y === player.y) {
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

    if (!isSpectator && it.x === player.x && it.y === player.y) {
      collectItem(it);
      items.splice(i, 1);
      continue;
    }

    // Check if other multiplayer runners picked it up
    if (isMultiplayer) {
      let taken = false;
      for (const rp of roomPlayers) {
        if (rp.slot !== mySlot && rp.isAlive && rp.x === it.x && rp.y === it.y) {
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
    // Hồi từ 5 đến 10 HP
    const healAmount = 5 + Math.floor(Math.random() * 6);
    healHp(healAmount);
    spawnPickupParticles(it.x, it.y, '#f87171');
  } else if (it.type === 'trap') {
    trapCount = Math.min(3, trapCount + 1);
    updateInventoryUI();
    spawnFloatingText('+1 BẪY 🪤', it.x, it.y, '#facc15');
    spawnPickupParticles(it.x, it.y, '#facc15');
  } else if (it.type === 'mine') {
    mineCount = Math.min(3, mineCount + 1);
    updateInventoryUI();
    spawnFloatingText('+1 MÌN 💣', it.x, it.y, '#ef4444');
    spawnPickupParticles(it.x, it.y, '#ef4444');
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
//  1. NÚI LỬA & LỬA ĐỐT LAN TỪ ĐIỂM QUÉT (DẬP BỞI MƯA)
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
}

function updateFireWave(dt) {
  for (const [key, time] of burntGrass.entries()) {
    const nextTime = time - dt;
    if (nextTime <= 0) {
      burntGrass.delete(key);
    } else {
      burntGrass.set(key, nextTime);
    }
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
    }
    return;
  }

  if (fireWave.state === 'sweeping') {
    fireWave.sweepAcc += dt;
    while (fireWave.sweepAcc >= FIRE_SWEEP_SPEED) {
      fireWave.sweepAcc -= FIRE_SWEEP_SPEED;
      fireWave.frontPos++;
    }

    fireCells = new Set();
    const fw = fireWave;

    for (let offset = 0; offset < fw.thickness; offset++) {
      const pos = fw.frontPos - offset;
      if (pos < 0 || pos > fw.maxDistance) continue;

      if (!fw.isDiag) {
        // Orthogonal sweep (thẳng)
        for (let r = 0; r < GRID; r++) {
          let gx, gy;
          if (fw.dir === 'left')       { gx = pos; gy = r; }
          else if (fw.dir === 'right') { gx = GRID - 1 - pos; gy = r; }
          else if (fw.dir === 'top')   { gx = r; gy = pos; }
          else                         { gx = r; gy = GRID - 1 - pos; }

          const key = `${gx},${gy}`;
          fireCells.add(key);

          // Lửa lan ra random ít chỗ thôi (chỉ ~10% số ô quét và tối đa 6 ô cháy):
          if (Math.random() < 0.10 && spreadingFlames.size < 6) {
            if (!spreadingFlames.has(key) && !puddleCells.has(key)) {
              spreadingFlames.set(key, {
                x: gx,
                y: gy,
                life: 3500,
                maxLife: 3500,
                gen: 0,
                spreadTimer: 700 + Math.random() * 400
              });
            }
          }
          burntGrass.set(key, 12000);
        }
      } else {
        // Diagonal sweep (lan chéo)
        for (let i = 0; i < GRID; i++) {
          let gx, gy;
          if (fw.dir === 'diag-tl') { // Top-Left -> Bottom-Right: x + y = pos
            gx = i;
            gy = pos - i;
          } else if (fw.dir === 'diag-tr') { // Top-Right -> Bottom-Left: (GRID-1-x) + y = pos
            gx = GRID - 1 - i;
            gy = pos - i;
          } else if (fw.dir === 'diag-bl') { // Bottom-Left -> Top-Right: x + (GRID-1-y) = pos
            gx = i;
            gy = GRID - 1 - (pos - i);
          } else { // diag-br: Bottom-Right -> Top-Left: (GRID-1-x) + (GRID-1-y) = pos
            gx = GRID - 1 - i;
            gy = GRID - 1 - (pos - i);
          }

          if (gx >= 0 && gx < GRID && gy >= 0 && gy < GRID) {
            const key = `${gx},${gy}`;
            fireCells.add(key);

            // Lửa lan ra random ít chỗ thôi:
            if (Math.random() < 0.10 && spreadingFlames.size < 6) {
              if (!spreadingFlames.has(key) && !puddleCells.has(key)) {
                spreadingFlames.set(key, {
                  x: gx,
                  y: gy,
                  life: 3500,
                  maxLife: 3500,
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
    }
    return;
  }

  if (fireWave.state === 'burning') {
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

    // Lửa lan ra random ít chỗ thôi: chỉ lan 1 lần (gen < 1), tỉ lệ 12%, tối đa 6 ô
    if (f.spreadTimer <= 0 && f.gen < 1 && spreadingFlames.size < 6) {
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
              data: {
                x: nx,
                y: ny,
                life: 3000,
                maxLife: 3000,
                gen: f.gen + 1,
                spreadTimer: 99999
              }
            });
            burntGrass.set(nKey, 8000);
            spawnFireSparks(nx, ny);
          }
        }
      }
    }

    if (f.life <= 0) {
      spreadingFlames.delete(key);
    }
  }

  for (const nf of newFlames) {
    if (!spreadingFlames.has(nf.key) && spreadingFlames.size < 6) {
      spreadingFlames.set(nf.key, nf.data);
    }
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
      color: Math.random() < 0.5 ? '#f97316' : '#facc15',
      life: 400 + Math.random() * 250,
      maxLife: 650,
    });
  }
}

// ══════════════════════════════════════════════
//  2. BÃO SẤM CHỚP, MƯA DẬP TẮT LỬA & VŨNG NƯỚC NHIỄM ĐIỆN
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
  // KHI TRỜI MƯA CÓ THỂ DẬP TẮT LỬA NÚI LỬA!
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

      wrapper.classList.add('shake');
      setTimeout(() => wrapper.classList.remove('shake'), 400);

      electrifiedPuddles = new Set();
      let hitWater = false;

      for (const z of thunderstorm.targetZones) {
        spawnElectricSparks(z.cx, z.cy);
        for (const c of z.cells) {
          if (puddleCells.has(`${c.x},${c.y}`)) {
            hitWater = true;
          }
        }
      }

      if (hitWater || puddleCells.size > 0) {
        for (const p of puddleCells) {
          electrifiedPuddles.add(p);
        }
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
        for (const c of z.cells) {
          lightningCells.add(`${c.x},${c.y}`);
        }
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
  const colors = ['#38bdf8', '#7dd3fc', '#fef08a', '#ffffff'];
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
//  3. LỐC XOÁY (Tornado Disaster 🌪️ - Random 1 to 3)
// ══════════════════════════════════════════════

function startTornado() {
  const corners = [
    { x: CELL * 3, y: CELL * 3 },
    { x: CANVAS_PX - CELL * 3, y: CELL * 3 },
    { x: CELL * 3, y: CANVAS_PX - CELL * 3 },
    { x: CANVAS_PX - CELL * 3, y: CANVAS_PX - CELL * 3 },
    { x: CANVAS_PX / 2, y: CELL * 2 },
    { x: CANVAS_PX / 2, y: CANVAS_PX - CELL * 2 },
  ];
  // Random từ 1 đến 3 cơn lốc xoáy
  const count = Math.floor(Math.random() * 3) + 1;
  tornadoes = [];
  const shuffled = [...corners].sort(() => Math.random() - 0.5);

  for (let i = 0; i < count; i++) {
    const c = shuffled[i % shuffled.length];
    const ox = (Math.random() - 0.5) * CELL * 2;
    const oy = (Math.random() - 0.5) * CELL * 2;
    tornadoes.push({
      id: i,
      x: Math.max(CELL * 2, Math.min(CANVAS_PX - CELL * 2, c.x + ox)),
      y: Math.max(CELL * 2, Math.min(CANVAS_PX - CELL * 2, c.y + oy)),
      vx: (Math.random() - 0.5) * 1.5,
      vy: (Math.random() - 0.5) * 1.5,
      state: 'warning',
      stateTime: 0,
      angle: Math.random() * Math.PI,
    });
  }
  tornado = tornadoes[0] || null;
}

function updateTornado(dt) {
  if (isMultiplayer && !isHost) {
    for (const t of tornadoes) {
      t.angle += dt * 0.015;
    }
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
          wrapper.classList.add('shake');
          setTimeout(() => wrapper.classList.remove('shake'), 300);
        }
      }
      continue;
    }

    if (t.state === 'active') {
      if (t.stateTime < TORNADO_DURATION) {
        allDone = false;
      } else {
        continue;
      }

      // Tracking target (nearest living survivor)
      let targetX = player.x * CELL + CELL / 2;
      let targetY = player.y * CELL + CELL / 2;

      if (isMultiplayer) {
        let minDist = 99999;
        for (const rp of roomPlayers) {
          if (rp.isAlive) {
            const rpx = rp.x * CELL + CELL / 2;
            const rpy = rp.y * CELL + CELL / 2;
            const d = Math.hypot(rpx - t.x, rpy - t.y);
            if (d < minDist) {
              minDist = d;
              targetX = rpx;
              targetY = rpy;
            }
          }
        }
      }

      const dx = targetX - t.x;
      const dy = targetY - t.y;
      const dist = Math.hypot(dx, dy) || 1;

      t.vx += (dx / dist) * 0.035;
      t.vy += (dy / dist) * 0.035;
      const speed = Math.hypot(t.vx, t.vy);
      if (speed > 1.6) {
        t.vx = (t.vx / speed) * 1.6;
        t.vy = (t.vy / speed) * 1.6;
      }

      t.x += t.vx * (dt / 16);
      t.y += t.vy * (dt / 16);

      if (t.x < CELL) { t.x = CELL; t.vx *= -1; }
      if (t.x > CANVAS_PX - CELL) { t.x = CANVAS_PX - CELL; t.vx *= -1; }
      if (t.y < CELL) { t.y = CELL; t.vy *= -1; }
      if (t.y > CANVAS_PX - CELL) { t.y = CANVAS_PX - CELL; t.vy *= -1; }

      if (Math.random() < 0.25 && particles.length < 80) {
        const pAngle = Math.random() * Math.PI * 2;
        const pDist = 8 + Math.random() * 22;
        particles.push({
          x: t.x + Math.cos(pAngle) * pDist,
          y: t.y + Math.sin(pAngle) * pDist,
          vx: Math.cos(pAngle + Math.PI / 2) * 1.6,
          vy: Math.sin(pAngle + Math.PI / 2) * 1.6,
          size: 2 + Math.random() * 2.5,
          color: Math.random() < 0.5 ? '#cbd5e1' : '#a1a1aa',
          life: 250,
          maxLife: 250,
        });
      }
    }
  }

  if (allDone) {
    tornadoes = [];
    tornado = null;
  } else {
    tornado = tornadoes[0] || null;
  }
}

// ══════════════════════════════════════════════
//  4. SỤT LỞ ĐẤT (Landslides 2-4 zones)
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
          if (gx >= 0 && gx < GRID && gy >= 0 && gy < GRID) {
            cells.push({ x: gx, y: gy });
          }
        }
      }
    }
    zones.push({ cx, cy, cells });
  }

  landslide = {
    state: 'warning',
    stateTime: 0,
    zones: zones,
  };
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

      wrapper.classList.add('shake');
      setTimeout(() => wrapper.classList.remove('shake'), 400);

      sinkholeCells = new Set();
      for (const z of landslide.zones) {
        for (const c of z.cells) {
          sinkholeCells.add(`${c.x},${c.y}`);
        }
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
  const colors = ['#78350f', '#92400e', '#b45309', '#d97706'];
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
  const numBombs = 1 + (Math.random() < 0.4 ? 1 : 0);

  for (let i = 0; i < numBombs; i++) {
    let bx, by, tries = 0;
    do {
      bx = Math.floor(Math.random() * GRID);
      by = Math.floor(Math.random() * GRID);
      tries++;
    } while (tries < 100 && (Math.abs(bx - player.x) < 3 && Math.abs(by - player.y) < 3));

    bombs.push({
      x: bx, y: by,
      state: 'ticking',
      stateTime: 0,
      fuseTime: BOMB_FUSE_TIME,
    });
  }
}

function explodeBomb(bomb) {
  bomb.state = 'exploding';
  bomb.stateTime = 0;

  const cells = [];
  for (let dx = -BOMB_BLAST_RADIUS; dx <= BOMB_BLAST_RADIUS; dx++) {
    for (let dy = -BOMB_BLAST_RADIUS; dy <= BOMB_BLAST_RADIUS; dy++) {
      if (dx * dx + dy * dy <= BOMB_BLAST_RADIUS * BOMB_BLAST_RADIUS + 1) {
        const cx = bomb.x + dx;
        const cy = bomb.y + dy;
        if (cx >= 0 && cx < GRID && cy >= 0 && cy < GRID) {
          cells.push({ x: cx, y: cy });
        }
      }
    }
  }

  craters.push({ cells, timeLeft: BOMB_CRATER_DURATION, flash: 1.0 });
  spawnExplosionParticles(bomb.x, bomb.y);

  wrapper.classList.add('shake');
  setTimeout(() => wrapper.classList.remove('shake'), 300);
}

function spawnExplosionParticles(gx, gy) {
  const cx = gx * CELL + CELL / 2;
  const cy = gy * CELL + CELL / 2;
  const colors = ['#ef4444', '#f97316', '#fbbf24', '#fff'];
  for (let i = 0; i < 28; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 4;
    particles.push({
      x: cx, y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 3 + Math.random() * 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      life: 500 + Math.random() * 400,
      maxLife: 900,
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
    if (b.state === 'ticking' && b.stateTime >= b.fuseTime) {
      explodeBomb(b);
    }
    if (b.state === 'exploding' && b.stateTime >= 400) {
      bombs.splice(i, 1);
    }
  }

  for (let i = craters.length - 1; i >= 0; i--) {
    const c = craters[i];
    c.timeLeft -= dt;
    c.flash = Math.max(0, c.flash - dt * 0.003);
    if (c.timeLeft <= 0) {
      craters.splice(i, 1);
    }
  }
}

// ── Consolidated Warning Banner Display ───────
function updateWarningBanners() {
  const warnings = [];

  if (fireWave && fireWave.state === 'warning') {
    const sec = Math.max(0, (FIRE_WARN_TIME - fireWave.stateTime) / 1000).toFixed(1);
    const scope = fireWave.isDiag ? (fireWave.isFullSweep ? 'CHÉO TOÀN SÂN' : 'QUÉT CHÉO') : (fireWave.isFullSweep ? 'QUÉT HẾT SÂN' : `${fireWave.maxDistance} Ô`);
    warnings.push(`🔥 NÚI LỬA (${scope}) [${sec}s]`);
  }
  if (thunderstorm && thunderstorm.state === 'warning') {
    const sec = Math.max(0, (THUNDER_WARN_TIME - thunderstorm.stateTime) / 1000).toFixed(1);
    warnings.push(`⚡ SẤM CHỚP & MƯA DẬP LỬA [${sec}s]`);
  }
  const warnTornado = tornadoes.find(t => t.state === 'warning');
  if (warnTornado) {
    const sec = Math.max(0, (TORNADO_WARN_TIME - warnTornado.stateTime) / 1000).toFixed(1);
    const countText = tornadoes.length > 1 ? ` (${tornadoes.length} CƠN LỐC)` : '';
    warnings.push(`🌪️ LỐC XOÁY${countText} [${sec}s]`);
  }
  if (landslide && landslide.state === 'warning') {
    const sec = Math.max(0, (LANDSLIDE_WARN_TIME - landslide.stateTime) / 1000).toFixed(1);
    warnings.push(`🕳️ SỤT LỞ ${landslide.zones.length} VÙNG [${sec}s]`);
  }

  if (warnings.length > 0) {
    showWarning('⚠️ ' + warnings.join(' | '));
  } else {
    hideWarning();
  }
}

function showWarning(text) {
  elWarnText.textContent = text;
  elWarn.classList.remove('hidden');
}
function hideWarning() {
  elWarn.classList.add('hidden');
}

// ── Game loop ─────────────────────────────────
let accumulator = 0;

function loop(now) {
  loopId = requestAnimationFrame(loop);
  const dt = now - lastTime;
  lastTime = now;

  if (!running || paused) {
    draw();
    return;
  }

  // Trong thời gian đếm ngược 3 2 1: Chỉ vẽ khung cảnh, chưa kích hoạt di chuyển hay thiên tai!
  if (isCountingDown) {
    draw();
    return;
  }

  if (damageCooldown > 0) damageCooldown -= dt;
  if (trapFrozenTimer > 0) trapFrozenTimer -= dt;

  // Update arming timers & steppedOff for traps and mines
  for (const t of placedTraps) {
    if (t.armTimer > 0) t.armTimer -= dt;
    if (t.ownerSlot === mySlot && (player.x !== t.x || player.y !== t.y)) {
      t.steppedOff = true;
    }
  }
  for (const m of placedMines) {
    if (m.armTimer > 0) m.armTimer -= dt;
    if (m.ownerSlot === mySlot && (player.x !== m.x || player.y !== m.y)) {
      m.steppedOff = true;
    }
  }

  if (!isSpectator) {
    survivalTime += dt / 1000;
  }
  const currentPts = Math.floor(survivalTime * 10) + bonusScore;
  elScore.textContent = currentPts;
  if (elTimeDisplay) elTimeDisplay.textContent = survivalTime.toFixed(1) + 's';

  // Particle decay
  particles = particles.filter(p => {
    p.life -= dt;
    return p.life > 0;
  });

  // Trail decay
  trail = trail.filter(t => {
    t.alpha -= dt * 0.003;
    return t.alpha > 0;
  });

  // Update items
  updateItems(dt);

  // UPDATE ALL DISASTERS CONCURRENTLY!
  updateFireWave(dt);
  updateThunderstorm(dt);
  updateTornado(dt);
  updateLandslide(dt);
  updateBombs(dt);

  updateWarningBanners();

  // Check ongoing hazard damage for living player (smooth DoT)
  if (!isSpectator) {
    checkHazardDamage(dt);
    checkTrapsAndMinesTrigger();
  }

  // Multiplayer Host Sync
  if (isMultiplayer && isHost && (now - lastSyncDisasterTime > 120)) {
    lastSyncDisasterTime = now;
    broadcastDisasterSync();
  }

  // Movement step
  accumulator += dt;
  let baseStep = SPEEDS[currentSpeed];

  while (accumulator >= baseStep) {
    accumulator -= baseStep;
    update();
    if (!running) return;
  }

  draw();
}

// Check ongoing environmental damage with smooth DoT (Damage over Time)
function checkHazardDamage(dt) {
  if (isSpectator) return;
  const key = `${player.x},${player.y}`;

  // 1. Dẫm vũng nước sẽ dập tắt lửa ngay lập tức! 💧
  if (puddleCells.has(key)) {
    if (burnDuration > 0) {
      burnDuration = 0;
      spawnSteam(player.x, player.y);
      spawnFloatingText('💨 Đã dập tắt lửa!', player.x, player.y, '#38bdf8');
    }
  }

  // 2. Núi lửa & Ngọn lửa lan rộng (Bị bén lửa và thiêu đốt máu từ từ)
  if (fireCells.has(key) || spreadingFlames.has(key)) {
    burnDuration = Math.max(burnDuration, 2400); // Bén lửa cháy 2.4s
  }

  // Đất cháy miệng hố bom cũng làm bén lửa
  for (const c of craters) {
    for (const cell of c.cells) {
      if (cell.x === player.x && cell.y === player.y) {
        burnDuration = Math.max(burnDuration, 1600);
        break;
      }
    }
  }

  // Xử lý rút máu khi đang bị bỏng lửa (mỗi 380ms rút 4 HP, không giật màn hình)
  if (burnDuration > 0) {
    burnDuration -= dt;
    burnTickCooldown -= dt;
    if (burnTickCooldown <= 0) {
      burnTickCooldown = 380;
      takeTickDamage(4, 'Bị thiêu đốt bởi ngọn lửa!', 'fire');
      if (particles.length < 80) {
        particles.push({
          x: player.x * CELL + CELL / 2 + (Math.random() - 0.5) * 8,
          y: player.y * CELL + CELL / 2,
          vx: (Math.random() - 0.5) * 0.8,
          vy: -1.2 - Math.random() * 0.8,
          size: 2.5,
          color: Math.random() < 0.5 ? '#f97316' : '#ef4444',
          life: 220,
          maxLife: 220,
        });
      }
    }
  }

  // 3. Vũng nước nhiễm điện (Giật điện rút máu theo nhịp mỗi 350ms rút 7 HP)
  if (electrifiedPuddles.has(key)) {
    electroTickCooldown -= dt;
    if (electroTickCooldown <= 0) {
      electroTickCooldown = 350;
      takeTickDamage(7, 'Bị giật bởi dòng điện trong nước!', 'electric');
    }
  } else {
    electroTickCooldown = Math.min(electroTickCooldown, 80);
  }

  // 4. Sụt lở đất / Hố sụt lún (Cát lún rút máu mỗi 400ms rút 7 HP)
  if (sinkholeCells.has(key)) {
    sinkholeTickCooldown -= dt;
    if (sinkholeTickCooldown <= 0) {
      sinkholeTickCooldown = 400;
      takeTickDamage(7, 'Bị lún sâu trong hố sụt lở đất!', 'sinkhole');
    }
  } else {
    sinkholeTickCooldown = Math.min(sinkholeTickCooldown, 80);
  }

  // 5. Luồng sét đánh trực tiếp (Lúc cao trào của sấm chớp)
  if (lightningCells.has(key)) {
    electroTickCooldown -= dt;
    if (electroTickCooldown <= 0) {
      electroTickCooldown = 300;
      takeTickDamage(18, 'Bị luồng sét cực mạnh giáng trúng!', 'electric');
    }
  }

  // 6. Lốc xoáy (Khi đứng gần tâm lốc xoáy bị hút và cuốn rút máu mỗi 320ms rút 5 HP)
  const px = player.x * CELL + CELL / 2;
  const py = player.y * CELL + CELL / 2;
  let inVortex = false;
  for (const t of tornadoes) {
    if (t.state === 'active') {
      const dist = Math.hypot(px - t.x, py - t.y);
      if (dist < CELL * 1.6) {
        inVortex = true;
        tornadoTickCooldown -= dt;
        if (tornadoTickCooldown <= 0) {
          tornadoTickCooldown = 320;
          takeTickDamage(5, 'Bị cuốn vào tâm cơn lốc xoáy!', 'tornado');
        }
        break;
      }
    }
  }
  if (!inVortex) {
    tornadoTickCooldown = Math.min(tornadoTickCooldown, 80);
  }
}

// ── Update runner ─────────────────────────────
function update() {
  if (trapFrozenTimer > 0) {
    // Player is trapped/frozen in place!
    return;
  }

  dir = { ...nextDir };
  if (dir.x === 0 && dir.y === 0) return;

  if (!isSpectator) {
    trail.push({ x: player.x, y: player.y, alpha: 0.5 });
  }

  let nx = player.x + dir.x;
  let ny = player.y + dir.y;

  if (nx < 0) nx = GRID - 1;
  if (nx >= GRID) nx = 0;
  if (ny < 0) ny = GRID - 1;
  if (ny >= GRID) ny = 0;

  player.x = nx;
  player.y = ny;

  // Broadcast position in multiplayer
  if (isMultiplayer) {
    const currentPts = Math.floor(survivalTime * 10) + bonusScore;
    broadcastNetworkMessage({
      type: 'PLAYER_MOVE',
      slot: mySlot,
      x: player.x,
      y: player.y,
      dir: dir,
      hp: hp,
      isFrozen: trapFrozenTimer > 0,
      score: currentPts,
      time: survivalTime,
      isAlive: !isSpectator,
    });
  }

  if (isSpectator) return;

  checkTrapsAndMinesTrigger();
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

  elFinal.textContent = finalPts;
  if (elFinalTime) elFinalTime.textContent = survivalTime.toFixed(1) + 's';
  elDeath.textContent = reason || 'Bạn đã bị thiên tai đánh bại!';
  elNewRecord.classList.toggle('hidden', !isRecord);
  elOverGO.classList.remove('hidden');
}

// ══════════════════════════════════════════════
//  DRAWING
// ══════════════════════════════════════════════

function draw() {
  ctx.clearRect(0, 0, CANVAS_PX, CANVAS_PX);

  drawGrassLawn();
  drawWaterPuddles();
  drawSinkholes();
  drawFireCells();
  drawSpreadingFlames();
  drawCraters();
  drawLightningCells();
  drawTrail();
  drawPlacedTraps();
  drawPlacedMines();
  drawItems();
  drawBombs();
  drawAllSurvivors();
  drawTornado();
  drawParticles();
  updateAndDrawFloatingTexts(16);
  drawFireWarningEdge();
  drawLandslideWarning();
  drawThunderstorm();

  if (paused) drawPauseOverlay();
}

// ── Pre-rendered Grass Lawn & Burnt Soil Cache (Cực mượt) ──
function initLawnCanvas() {
  lawnCanvas = document.createElement('canvas');
  lawnCanvas.width = CANVAS_PX;
  lawnCanvas.height = CANVAS_PX;
  const lctx = lawnCanvas.getContext('2d');

  const grassLight = '#33832e';
  const grassDark  = '#2a7226';

  for (let gx = 0; gx < GRID; gx++) {
    for (let gy = 0; gy < GRID; gy++) {
      lctx.fillStyle = (gx + gy) % 2 === 0 ? grassLight : grassDark;
      lctx.fillRect(gx * CELL, gy * CELL, CELL, CELL);
    }
  }

  for (const dec of lawnDecorations) {
    if (dec.type === 'tuft') {
      lctx.strokeStyle = '#1d541b';
      lctx.lineWidth = 1.3;
      lctx.beginPath();
      lctx.moveTo(dec.x, dec.y + 4);
      lctx.quadraticCurveTo(dec.x - 2, dec.y, dec.x - 3, dec.y - 4);
      lctx.moveTo(dec.x, dec.y + 4);
      lctx.quadraticCurveTo(dec.x + 2, dec.y, dec.x + 3, dec.y - 4);
      lctx.stroke();
    } else if (dec.type === 'flower') {
      lctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      lctx.beginPath();
      lctx.arc(dec.x - 2, dec.y, 2, 0, Math.PI * 2);
      lctx.arc(dec.x + 2, dec.y, 2, 0, Math.PI * 2);
      lctx.arc(dec.x, dec.y - 2, 2, 0, Math.PI * 2);
      lctx.arc(dec.x, dec.y + 2, 2, 0, Math.PI * 2);
      lctx.fill();
      lctx.fillStyle = '#facc15';
      lctx.beginPath();
      lctx.arc(dec.x, dec.y, 1.6, 0, Math.PI * 2);
      lctx.fill();
    } else if (dec.type === 'clover') {
      lctx.fillStyle = '#1c5e1a';
      lctx.beginPath();
      lctx.arc(dec.x - 1.5, dec.y, 1.8, 0, Math.PI * 2);
      lctx.arc(dec.x + 1.5, dec.y, 1.8, 0, Math.PI * 2);
      lctx.arc(dec.x, dec.y - 1.8, 1.8, 0, Math.PI * 2);
      lctx.fill();
    }
  }

  lctx.strokeStyle = 'rgba(20, 60, 20, 0.12)';
  lctx.lineWidth = 1;
  for (let i = 1; i < GRID; i++) {
    lctx.beginPath(); lctx.moveTo(i * CELL, 0); lctx.lineTo(i * CELL, CANVAS_PX); lctx.stroke();
    lctx.beginPath(); lctx.moveTo(0, i * CELL); lctx.lineTo(CANVAS_PX, i * CELL); lctx.stroke();
  }
}

function drawGrassLawn() {
  if (!lawnCanvas) initLawnCanvas();
  ctx.drawImage(lawnCanvas, 0, 0);

  // Chỉ vẽ những ô đất bị cháy xém (tiết kiệm hàng ngàn lệnh vẽ mỗi giây)
  if (burntGrass.size === 0) return;
  for (const [key] of burntGrass.entries()) {
    const comma = key.indexOf(',');
    const gx = parseInt(key.slice(0, comma), 10);
    const gy = parseInt(key.slice(comma + 1), 10);

    ctx.fillStyle = '#1c130d';
    ctx.fillRect(gx * CELL, gy * CELL, CELL, CELL);

    ctx.fillStyle = 'rgba(120, 53, 15, 0.4)';
    ctx.fillRect(gx * CELL + 2, gy * CELL + 2, CELL - 4, CELL - 4);
  }
}

// ── Draw Water Puddles (Vũng nước an toàn, chỉ giật khi dính điện) ──
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
      ctx.fillStyle = `rgba(14, 165, 233, ${0.65 * flicker})`;
      ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);

      ctx.fillStyle = `rgba(254, 240, 138, ${0.85 * flicker})`;
      ctx.font = '11px serif';
      ctx.textAlign = 'center';
      ctx.fillText('⚡', x + CELL / 2, y + CELL / 2 + 4);
      ctx.textAlign = 'start';
    } else {
      const ripple = 0.35 + Math.sin(now + gx * 1.5 + gy * 1.2) * 0.1;
      ctx.fillStyle = `rgba(56, 189, 248, ${ripple})`;
      ctx.beginPath();
      ctx.roundRect(x + 2, y + 2, CELL - 4, CELL - 4, 8);
      ctx.fill();

      ctx.strokeStyle = 'rgba(186, 230, 253, 0.4)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
}

// ── Draw Placed Traps (Bẫy kẹp hiện rõ không tàng hình) ───────
function drawPlacedTraps() {
  for (const t of placedTraps) {
    const cx = t.x * CELL + CELL / 2;
    const cy = t.y * CELL + CELL / 2;

    ctx.save();
    ctx.shadowColor = 'rgba(234, 179, 8, 0.8)';
    ctx.shadowBlur = 8;
    ctx.font = '16px serif';
    ctx.textAlign = 'center';
    ctx.fillText('🪤', cx, cy + 6);
    ctx.restore();
  }
}

// ── Draw Placed Landmines (Mìn TÀNG HÌNH!) ─────────────────────
function drawPlacedMines() {
  for (const m of placedMines) {
    const cx = m.x * CELL + CELL / 2;
    const cy = m.y * CELL + CELL / 2;

    // TÀNG HÌNH: Chỉ người đặt nhìn thấy bóng mờ 25% opacity! Người khác vô hình 100%!
    if (m.ownerSlot === mySlot) {
      ctx.save();
      ctx.globalAlpha = 0.28;
      ctx.font = '14px serif';
      ctx.textAlign = 'center';
      ctx.fillText('💣', cx, cy + 5);
      ctx.restore();
    }
  }
}

// ── Draw Spreading Flames (Lửa cháy lan từ vệt quét) ─────────
function drawSpreadingFlames() {
  if (spreadingFlames.size === 0) return;
  const time = performance.now() * 0.006;

  for (const [key, f] of spreadingFlames.entries()) {
    const x = f.x * CELL;
    const y = f.y * CELL;
    const cx = x + CELL / 2;
    const cy = y + CELL / 2;

    const flicker = 0.7 + Math.sin(time * 2 + f.x * 2.3 + f.y * 1.7) * 0.3;

    const grd = ctx.createRadialGradient(cx, cy, 1, cx, cy, CELL * 0.65);
    grd.addColorStop(0, `rgba(254, 240, 138, ${0.8 * flicker})`);
    grd.addColorStop(0.5, `rgba(249, 115, 22, ${0.6 * flicker})`);
    grd.addColorStop(1, 'transparent');
    ctx.fillStyle = grd;
    ctx.fillRect(x - 2, y - 2, CELL + 4, CELL + 4);

    ctx.font = `${10 + Math.sin(time * 3 + f.x) * 2}px serif`;
    ctx.textAlign = 'center';
    ctx.globalAlpha = 0.85;
    ctx.fillText('🔥', cx, cy + 4);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'start';
  }
}

// ── Draw Tornado (Lốc Xoáy 🌪️) ─────────────────
function drawTornado() {
  if (tornadoes.length === 0) return;
  const now = performance.now();

  for (const t of tornadoes) {
    if (t.state === 'warning') {
      const pulse = 0.4 + Math.sin(now * 0.012 + t.id) * 0.35;
      const sec = Math.max(0, (TORNADO_WARN_TIME - t.stateTime) / 1000).toFixed(1);

      ctx.save();
      ctx.strokeStyle = `rgba(203, 213, 225, ${0.7 * pulse})`;
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(t.x, t.y, CELL * 1.6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = `rgba(148, 163, 184, ${0.2 * pulse})`;
      ctx.fill();

      ctx.shadowColor = '#cbd5e1';
      ctx.shadowBlur = 12;
      ctx.font = '24px serif';
      ctx.textAlign = 'center';
      ctx.fillText('🌪️', t.x, t.y + 8);

      ctx.font = '800 11px "JetBrains Mono", monospace';
      ctx.fillStyle = '#f8fafc';
      ctx.fillText(sec + 's', t.x, t.y - 18);
      ctx.restore();
    } else if (t.state === 'active') {
      ctx.save();
      const tAngle = t.angle;

      for (let r = 3; r >= 1; r--) {
        const radius = r * 13;
        const alpha = 0.22 + (3 - r) * 0.14;

        ctx.strokeStyle = `rgba(226, 232, 240, ${alpha})`;
        ctx.lineWidth = 3 - r * 0.5;
        ctx.beginPath();
        ctx.ellipse(t.x, t.y, radius, radius * 0.65, tAngle * (r % 2 === 0 ? 1 : -1), 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.fillStyle = 'rgba(71, 85, 105, 0.35)';
      ctx.beginPath();
      ctx.arc(t.x, t.y, CELL * 1.3, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowColor = '#94a3b8';
      ctx.shadowBlur = 12;
      ctx.font = '26px serif';
      ctx.textAlign = 'center';
      ctx.fillText('🌪️', t.x, t.y + 9);

      ctx.restore();
    }
  }
}

// ── Draw Landslide Sinkholes ──────────────────
function drawSinkholes() {
  if (sinkholeCells.size === 0) return;

  for (const key of sinkholeCells) {
    const [gx, gy] = key.split(',').map(Number);
    const x = gx * CELL;
    const y = gy * CELL;
    const cx = x + CELL / 2;
    const cy = y + CELL / 2;

    ctx.fillStyle = '#0f0804';
    ctx.fillRect(x, y, CELL, CELL);

    const grd = ctx.createRadialGradient(cx, cy, 2, cx, cy, CELL * 0.75);
    grd.addColorStop(0, '#000000');
    grd.addColorStop(0.7, '#451a03');
    grd.addColorStop(1, '#78350f');
    ctx.fillStyle = grd;
    ctx.fillRect(x, y, CELL, CELL);

    ctx.strokeStyle = '#b45309';
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

      ctx.fillStyle = `rgba(180, 83, 9, ${0.35 * pulse})`;
      ctx.fillRect(x, y, CELL, CELL);

      ctx.strokeStyle = `rgba(251, 191, 36, ${0.7 * pulse})`;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(x + 1, y + 1, CELL - 2, CELL - 2);
      ctx.setLineDash([]);
    }

    const zx = z.cx * CELL + CELL / 2;
    const zy = z.cy * CELL + CELL / 2;

    ctx.save();
    ctx.shadowColor = 'rgba(245, 158, 11, 0.9)';
    ctx.shadowBlur = 12;
    ctx.font = '20px serif';
    ctx.textAlign = 'center';
    ctx.fillText('🕳️', zx, zy + 6);

    ctx.font = '800 11px "JetBrains Mono", monospace';
    ctx.fillStyle = '#fef08a';
    ctx.fillText(remainingSec + 's', zx, zy - 13);
    ctx.restore();
  }
}

// ── Draw Items (❤️ Tim, 🪤 Bẫy, 💣 Mìn) ────────
function drawItems() {
  for (const it of items) {
    const x = it.x * CELL + CELL / 2;
    const y = it.y * CELL + CELL / 2;
    const bounce = Math.sin(it.pulse || 0) * 3;

    ctx.save();
    if (it.type === 'heart') {
      ctx.shadowColor = 'rgba(239, 68, 68, 0.9)';
      ctx.shadowBlur = 12;

      ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
      ctx.beginPath();
      ctx.arc(x, y + bounce, CELL * 0.45, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = '16px serif';
      ctx.textAlign = 'center';
      ctx.fillText('❤️', x, y + bounce + 5);
    } else if (it.type === 'trap') {
      ctx.shadowColor = 'rgba(234, 179, 8, 0.9)';
      ctx.shadowBlur = 12;

      ctx.fillStyle = 'rgba(234, 179, 8, 0.2)';
      ctx.beginPath();
      ctx.arc(x, y + bounce, CELL * 0.45, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = '15px serif';
      ctx.textAlign = 'center';
      ctx.fillText('🪤', x, y + bounce + 5);
    } else {
      ctx.shadowColor = 'rgba(248, 113, 113, 0.9)';
      ctx.shadowBlur = 12;

      ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
      ctx.beginPath();
      ctx.arc(x, y + bounce, CELL * 0.45, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = '15px serif';
      ctx.textAlign = 'center';
      ctx.fillText('💣', x, y + bounce + 5);
    }
    ctx.restore();
  }
}

// ── Draw All Survivors (Player & Online Runners) ─
function drawAllSurvivors() {
  if (!isMultiplayer) {
    drawSingleSurvivor(player, dir, mySlot, myPlayerName, hp, trapFrozenTimer > 0, damageCooldown > 0, isSpectator);
    return;
  }

  // Draw other online runners
  for (const rp of roomPlayers) {
    if (rp.slot !== mySlot) {
      drawSingleSurvivor(
        { x: rp.x || 0, y: rp.y || 0 },
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

  // Draw self on top
  drawSingleSurvivor(player, dir, mySlot, myPlayerName + ' (Tôi)', hp, trapFrozenTimer > 0, damageCooldown > 0, isSpectator);
}

function drawSingleSurvivor(p, pDir, slot, name, currentHp, isFrozen, isHit, isDead) {
  const cx = p.x * CELL + CELL / 2;
  const cy = p.y * CELL + CELL / 2;
  const now = performance.now();
  const skin = PLAYER_SKINS[slot % 4];

  if (isHit && Math.floor(now / 100) % 2 === 0) {
    return;
  }

  ctx.save();

  // If Dead: Draw Ghost Spectator 👻
  if (isDead) {
    ctx.globalAlpha = 0.55;
    ctx.font = '20px serif';
    ctx.textAlign = 'center';
    ctx.fillText('👻', cx, cy + 6);

    ctx.font = '700 9px "Inter", sans-serif';
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText(name, cx, cy - 12);
    ctx.restore();
    return;
  }

  // If Frozen in Trap: draw chains / lock
  if (isFrozen) {
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, CELL * 0.7, 0, Math.PI * 2);
    ctx.stroke();

    ctx.font = '14px serif';
    ctx.textAlign = 'center';
    ctx.fillText('⛓️', cx, cy - 14);
  }

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 9, 8, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  // Torso / Jacket
  ctx.fillStyle = skin.jacket;
  ctx.beginPath();
  ctx.roundRect(cx - 6, cy - 2, 12, 11, 4);
  ctx.fill();

  // Backpack
  ctx.fillStyle = '#78350f';
  ctx.fillRect(cx - (pDir.x || 0) * 4 - 3, cy - 1, 6, 8);

  // Head
  ctx.fillStyle = '#fed7aa';
  ctx.beginPath();
  ctx.arc(cx, cy - 6, 6, 0, Math.PI * 2);
  ctx.fill();

  // Cap / Headband
  ctx.fillStyle = skin.cap;
  ctx.beginPath();
  ctx.arc(cx, cy - 8, 5.5, Math.PI, Math.PI * 2);
  ctx.fill();

  // Eyes
  const eyeX = cx + (pDir.x || 0) * 2.5;
  const eyeY = cy - 6 + (pDir.y || 0) * 2.5;
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.arc(eyeX - 1.5, eyeY, 1.2, 0, Math.PI * 2);
  ctx.arc(eyeX + 1.5, eyeY, 1.2, 0, Math.PI * 2);
  ctx.fill();

  // Floating Mini Health Bar above head
  const hpPct = Math.max(0, Math.min(1, currentHp / MAX_HP));
  const barW = 20;
  const barH = 3;
  const barX = cx - barW / 2;
  const barY = cy - 18;

  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);

  ctx.fillStyle = hpPct > 0.6 ? '#22c55e' : (hpPct > 0.3 ? '#eab308' : '#ef4444');
  ctx.fillRect(barX, barY, barW * hpPct, barH);

  // Name Tag
  ctx.font = '700 9px "Inter", sans-serif';
  ctx.fillStyle = '#f8fafc';
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = 4;
  ctx.fillText(name, cx, cy - 22);

  // Hiệu ứng đang bị cháy (bén lửa): hiện ngọn lửa nhỏ trên đầu nhắc người chơi chạy ra vũng nước!
  if (slot === mySlot && burnDuration > 0 && !isDead) {
    ctx.font = '13px serif';
    ctx.fillText('🔥', cx, cy - 32);
  }

  ctx.restore();
}

function drawTrail() {
  for (const t of trail) {
    const x = t.x * CELL + CELL / 2;
    const y = t.y * CELL + CELL / 2;
    ctx.fillStyle = `rgba(74, 222, 128, ${t.alpha * 0.25})`;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── Draw Fire Disaster (Núi Lửa) ───────────────
function drawFireCells() {
  if (fireCells.size === 0) return;
  const time = performance.now() * 0.005;

  for (const key of fireCells) {
    const [gx, gy] = key.split(',').map(Number);
    const x = gx * CELL;
    const y = gy * CELL;

    const flicker = 0.7 + Math.sin(time + gx * 1.3 + gy * 0.7) * 0.3;
    ctx.fillStyle = `rgba(239, 68, 68, ${0.45 * flicker})`;
    ctx.fillRect(x, y, CELL, CELL);

    const cx = x + CELL / 2;
    const cy = y + CELL / 2;
    const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, CELL * 0.7);
    grd.addColorStop(0, `rgba(251, 191, 36, ${0.5 * flicker})`);
    grd.addColorStop(0.5, `rgba(239, 68, 68, ${0.35 * flicker})`);
    grd.addColorStop(1, 'transparent');
    ctx.fillStyle = grd;
    ctx.fillRect(x - 2, y - 2, CELL + 4, CELL + 4);

    if ((gx + gy) % 3 === 0) {
      ctx.font = `${11 + Math.sin(time * 2 + gx) * 2}px serif`;
      ctx.textAlign = 'center';
      ctx.globalAlpha = 0.7 + Math.sin(time * 3 + gy) * 0.3;
      ctx.fillText('🔥', cx, cy + 5);
      ctx.globalAlpha = 1;
      ctx.textAlign = 'start';
    }
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
    grd.addColorStop(0, `rgba(239, 68, 68, ${pulse * 0.85})`);
    grd.addColorStop(0.85, `rgba(245, 158, 11, ${pulse * 0.4})`);
    grd.addColorStop(1, 'transparent');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, warnDepth, CANVAS_PX);

    if (!fireWave.isFullSweep) {
      ctx.strokeStyle = 'rgba(254, 240, 138, 0.7)';
      ctx.lineWidth = 2; ctx.setLineDash([6, 6]);
      ctx.beginPath(); ctx.moveTo(warnDepth, 0); ctx.lineTo(warnDepth, CANVAS_PX); ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.fillStyle = '#fff'; ctx.font = '800 18px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(239, 68, 68, 0.9)'; ctx.shadowBlur = 12;
    const bounceX = 20 + Math.sin(now * 0.01) * 8;
    ctx.fillText(fireWave.isFullSweep ? '➜ 🔥 (QUÉT HẾT SÂN!)' : '➜ 🔥 (NÉ SANG PHẢI)', bounceX + 70, CANVAS_PX / 2);
  } else if (d === 'right') {
    grd = ctx.createLinearGradient(CANVAS_PX, 0, CANVAS_PX - warnDepth, 0);
    grd.addColorStop(0, `rgba(239, 68, 68, ${pulse * 0.85})`);
    grd.addColorStop(0.85, `rgba(245, 158, 11, ${pulse * 0.4})`);
    grd.addColorStop(1, 'transparent');
    ctx.fillStyle = grd;
    ctx.fillRect(CANVAS_PX - warnDepth, 0, warnDepth, CANVAS_PX);

    if (!fireWave.isFullSweep) {
      ctx.strokeStyle = 'rgba(254, 240, 138, 0.7)';
      ctx.lineWidth = 2; ctx.setLineDash([6, 6]);
      ctx.beginPath(); ctx.moveTo(CANVAS_PX - warnDepth, 0); ctx.lineTo(CANVAS_PX - warnDepth, CANVAS_PX); ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.fillStyle = '#fff'; ctx.font = '800 18px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(239, 68, 68, 0.9)'; ctx.shadowBlur = 12;
    const bounceX = CANVAS_PX - 20 - Math.sin(now * 0.01) * 8;
    ctx.fillText(fireWave.isFullSweep ? '🔥 ⮜ (QUÉT HẾT SÂN!)' : '🔥 ⮜ (NÉ SANG TRÁI)', bounceX - 70, CANVAS_PX / 2);
  } else if (d === 'top') {
    grd = ctx.createLinearGradient(0, 0, 0, warnDepth);
    grd.addColorStop(0, `rgba(239, 68, 68, ${pulse * 0.85})`);
    grd.addColorStop(0.85, `rgba(245, 158, 11, ${pulse * 0.4})`);
    grd.addColorStop(1, 'transparent');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, CANVAS_PX, warnDepth);

    if (!fireWave.isFullSweep) {
      ctx.strokeStyle = 'rgba(254, 240, 138, 0.7)';
      ctx.lineWidth = 2; ctx.setLineDash([6, 6]);
      ctx.beginPath(); ctx.moveTo(0, warnDepth); ctx.lineTo(CANVAS_PX, warnDepth); ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.fillStyle = '#fff'; ctx.font = '800 18px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(239, 68, 68, 0.9)'; ctx.shadowBlur = 12;
    const bounceY = 28 + Math.sin(now * 0.01) * 8;
    ctx.fillText(fireWave.isFullSweep ? '⬇ 🔥 (QUÉT HẾT SÂN!) ⬇' : '⬇ 🔥 (NÉ XUỐNG DƯỚI) ⬇', CANVAS_PX / 2, bounceY + 30);
  } else if (d === 'bottom') {
    grd = ctx.createLinearGradient(0, CANVAS_PX, 0, CANVAS_PX - warnDepth);
    grd.addColorStop(0, `rgba(239, 68, 68, ${pulse * 0.85})`);
    grd.addColorStop(0.85, `rgba(245, 158, 11, ${pulse * 0.4})`);
    grd.addColorStop(1, 'transparent');
    ctx.fillStyle = grd;
    ctx.fillRect(0, CANVAS_PX - warnDepth, CANVAS_PX, warnDepth);

    if (!fireWave.isFullSweep) {
      ctx.strokeStyle = 'rgba(254, 240, 138, 0.7)';
      ctx.lineWidth = 2; ctx.setLineDash([6, 6]);
      ctx.beginPath(); ctx.moveTo(0, CANVAS_PX - warnDepth); ctx.lineTo(CANVAS_PX, CANVAS_PX - warnDepth); ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.fillStyle = '#fff'; ctx.font = '800 18px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(239, 68, 68, 0.9)'; ctx.shadowBlur = 12;
    const bounceY = CANVAS_PX - 20 - Math.sin(now * 0.01) * 8;
    ctx.fillText(fireWave.isFullSweep ? '⬆ 🔥 (QUÉT HẾT SÂN!) ⬆' : '⬆ 🔥 (NÉ LÊN TRÊN) ⬆', CANVAS_PX / 2, bounceY - 30);
  } else if (d === 'diag-tl') {
    grd = ctx.createRadialGradient(0, 0, 10, 0, 0, CANVAS_PX * 0.8);
    grd.addColorStop(0, `rgba(239, 68, 68, ${pulse * 0.85})`);
    grd.addColorStop(0.7, `rgba(245, 158, 11, ${pulse * 0.3})`);
    grd.addColorStop(1, 'transparent');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, CANVAS_PX, CANVAS_PX);

    ctx.fillStyle = '#fff'; ctx.font = '800 17px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(239, 68, 68, 0.9)'; ctx.shadowBlur = 12;
    ctx.fillText(fireWave.isFullSweep ? '↘ 🔥 QUÉT CHÉO TOÀN SÂN! ↘' : '↘ 🔥 (NÚI LỬA QUÉT CHÉO) ↘', 150, 110);
  } else if (d === 'diag-tr') {
    grd = ctx.createRadialGradient(CANVAS_PX, 0, 10, CANVAS_PX, 0, CANVAS_PX * 0.8);
    grd.addColorStop(0, `rgba(239, 68, 68, ${pulse * 0.85})`);
    grd.addColorStop(0.7, `rgba(245, 158, 11, ${pulse * 0.3})`);
    grd.addColorStop(1, 'transparent');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, CANVAS_PX, CANVAS_PX);

    ctx.fillStyle = '#fff'; ctx.font = '800 17px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(239, 68, 68, 0.9)'; ctx.shadowBlur = 12;
    ctx.fillText(fireWave.isFullSweep ? '↙ 🔥 QUÉT CHÉO TOÀN SÂN! ↙' : '↙ 🔥 (NÚI LỬA QUÉT CHÉO) ↙', CANVAS_PX - 150, 110);
  } else if (d === 'diag-bl') {
    grd = ctx.createRadialGradient(0, CANVAS_PX, 10, 0, CANVAS_PX, CANVAS_PX * 0.8);
    grd.addColorStop(0, `rgba(239, 68, 68, ${pulse * 0.85})`);
    grd.addColorStop(0.7, `rgba(245, 158, 11, ${pulse * 0.3})`);
    grd.addColorStop(1, 'transparent');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, CANVAS_PX, CANVAS_PX);

    ctx.fillStyle = '#fff'; ctx.font = '800 17px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(239, 68, 68, 0.9)'; ctx.shadowBlur = 12;
    ctx.fillText(fireWave.isFullSweep ? '↗ 🔥 QUÉT CHÉO TOÀN SÂN! ↗' : '↗ 🔥 (NÚI LỬA QUÉT CHÉO) ↗', 150, CANVAS_PX - 110);
  } else {
    grd = ctx.createRadialGradient(CANVAS_PX, CANVAS_PX, 10, CANVAS_PX, CANVAS_PX, CANVAS_PX * 0.8);
    grd.addColorStop(0, `rgba(239, 68, 68, ${pulse * 0.85})`);
    grd.addColorStop(0.7, `rgba(245, 158, 11, ${pulse * 0.3})`);
    grd.addColorStop(1, 'transparent');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, CANVAS_PX, CANVAS_PX);

    ctx.fillStyle = '#fff'; ctx.font = '800 17px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(239, 68, 68, 0.9)'; ctx.shadowBlur = 12;
    ctx.fillText(fireWave.isFullSweep ? '↖ 🔥 QUÉT CHÉO TOÀN SÂN! ↖' : '↖ 🔥 (NÚI LỬA QUÉT CHÉO) ↖', CANVAS_PX - 150, CANVAS_PX - 110);
  }

  ctx.restore();
}

// ── Draw Thunderstorm Disaster ────────────────
function drawThunderstorm() {
  if (!thunderstorm) return;
  const now = performance.now();

  ctx.fillStyle = 'rgba(10, 24, 38, 0.35)';
  ctx.fillRect(0, 0, CANVAS_PX, CANVAS_PX);

  ctx.strokeStyle = 'rgba(186, 230, 253, 0.65)';
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

        ctx.fillStyle = `rgba(56, 189, 248, ${0.25 * pulse})`;
        ctx.fillRect(x, y, CELL, CELL);

        ctx.strokeStyle = `rgba(250, 204, 21, ${0.6 * pulse})`;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 3]);
        ctx.strokeRect(x + 1, y + 1, CELL - 2, CELL - 2);
        ctx.setLineDash([]);
      }

      const zx = z.cx * CELL + CELL / 2;
      const zy = z.cy * CELL + CELL / 2;

      ctx.save();
      ctx.shadowColor = 'rgba(56, 189, 248, 0.9)';
      ctx.shadowBlur = 15;
      ctx.font = '22px serif';
      ctx.textAlign = 'center';
      ctx.fillText('⚡', zx, zy + 6);

      ctx.font = '800 11px "JetBrains Mono", monospace';
      ctx.fillStyle = '#fef08a';
      ctx.fillText(remainingSec + 's', zx, zy - 14);
      ctx.restore();
    }
  }

  if (thunderstorm.state === 'striking') {
    if (thunderstorm.flashAlpha > 0) {
      ctx.fillStyle = `rgba(240, 249, 255, ${thunderstorm.flashAlpha})`;
      ctx.fillRect(0, 0, CANVAS_PX, CANVAS_PX);
    }

    ctx.save();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3.5;
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 20;

    for (const z of thunderstorm.targetZones) {
      const targetX = z.cx * CELL + CELL / 2;
      const targetY = z.cy * CELL + CELL / 2;

      ctx.beginPath();
      ctx.moveTo(targetX + (Math.random() - 0.5) * 40, 0);

      let curX = targetX;
      let curY = 0;
      const segments = 6;
      for (let s = 1; s <= segments; s++) {
        const nextY = (targetY / segments) * s;
        const nextX = s === segments ? targetX : curX + (Math.random() - 0.5) * 35;
        ctx.lineTo(nextX, nextY);
        curX = nextX;
        curY = nextY;
      }
      ctx.stroke();

      ctx.strokeStyle = '#38bdf8';
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
    ctx.fillStyle = `rgba(14, 165, 233, ${0.4 * flicker})`;
    ctx.fillRect(x, y, CELL, CELL);

    const cx = x + CELL / 2;
    const cy = y + CELL / 2;
    const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, CELL * 0.6);
    grd.addColorStop(0, `rgba(254, 240, 138, ${0.7 * flicker})`);
    grd.addColorStop(0.5, `rgba(56, 189, 248, ${0.4 * flicker})`);
    grd.addColorStop(1, 'transparent');
    ctx.fillStyle = grd;
    ctx.fillRect(x, y, CELL, CELL);

    if ((gx + gy) % 2 === 0) {
      ctx.font = '10px serif';
      ctx.textAlign = 'center';
      ctx.globalAlpha = 0.8;
      ctx.fillText('⚡', cx, cy + 4);
      ctx.globalAlpha = 1;
      ctx.textAlign = 'start';
    }
  }
}

// ── Draw Bombs & Craters ──────────────────────
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
    ctx.strokeStyle = `rgba(239, 68, 68, ${0.15 + urgency * 0.35})`;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 5]);
    ctx.stroke();
    ctx.setLineDash([]);

    const pGrd = ctx.createRadialGradient(x, y, 0, x, y, previewR);
    pGrd.addColorStop(0, `rgba(239, 68, 68, ${0.06 + urgency * 0.12})`);
    pGrd.addColorStop(0.8, `rgba(245, 158, 11, ${0.04 + urgency * 0.08})`);
    pGrd.addColorStop(1, 'transparent');
    ctx.fillStyle = pGrd;
    ctx.fill();

    const bombPulse = 1 + Math.sin(b.stateTime * (0.005 + urgency * 0.02)) * 0.15 * (1 + urgency);

    ctx.shadowColor = `rgba(239, 68, 68, ${0.4 + urgency * 0.6})`;
    ctx.shadowBlur = 10 + urgency * 16;
    ctx.font = `${17 + bombPulse * 2}px serif`;
    ctx.textAlign = 'center';
    ctx.fillText('💣', x, y + 6);
    ctx.textAlign = 'start';
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    const secsLeft = Math.max(0, (b.fuseTime - b.stateTime) / 1000).toFixed(1);
    ctx.fillStyle = secsLeft <= 1.5 ? '#ef4444' : '#fef08a';
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

      const flicker = 0.5 + Math.sin(time + cell.x * 2.1 + cell.y * 1.7) * 0.3;
      ctx.fillStyle = `rgba(180, 60, 20, ${0.25 * fadeRatio * flicker})`;
      ctx.beginPath();
      ctx.roundRect(x + 1, y + 1, CELL - 2, CELL - 2, 3);
      ctx.fill();

      const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, CELL * 0.6);
      grd.addColorStop(0, `rgba(251, 146, 60, ${0.3 * fadeRatio * flicker})`);
      grd.addColorStop(1, 'transparent');
      ctx.fillStyle = grd;
      ctx.fillRect(x, y, CELL, CELL);

      if (c.flash > 0.1) {
        ctx.strokeStyle = `rgba(239, 68, 68, ${c.flash * 0.5})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx - 4, cy - 3); ctx.lineTo(cx + 2, cy + 1); ctx.lineTo(cx + 5, cy - 2);
        ctx.stroke();
      }
    }
  }
}

function drawParticles() {
  if (particles.length === 0) return;
  if (particles.length > 80) {
    particles.splice(0, particles.length - 80);
  }
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= 16;
    if (p.life <= 0) {
      particles.splice(i, 1);
      continue;
    }
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
  ctx.fillStyle = 'rgba(6,8,15,.55)';
  ctx.fillRect(0, 0, CANVAS_PX, CANVAS_PX);
  ctx.fillStyle = '#e2e8f0';
  ctx.font = '700 28px Inter, system-ui';
  ctx.textAlign = 'center';
  ctx.fillText('⏸  Tạm dừng', CANVAS_PX / 2, CANVAS_PX / 2);
  ctx.font = '400 13px Inter, system-ui';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('Nhấn Space để tiếp tục', CANVAS_PX / 2, CANVAS_PX / 2 + 30);
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
  // Deploy Trap on key '1'
  if (e.key === '1' || e.code === 'Digit1') {
    e.preventDefault();
    if (running && !paused) deployTrap();
    return;
  }

  // Deploy Landmine on key '2'
  if (e.key === '2' || e.code === 'Digit2') {
    e.preventDefault();
    if (running && !paused) deployMine();
    return;
  }

  if (e.key === ' ' || e.key === 'Spacebar') {
    e.preventDefault();
    if (running && !isMultiplayer) {
      paused = !paused;
      elPause.classList.toggle('hidden', !paused);
      if (!paused) { lastTime = performance.now(); accumulator = 0; }
    }
    return;
  }

  if (e.key === 'Enter') {
    if (!running && !isMultiplayer) startSoloGame();
    return;
  }

  const newDir = DIR_MAP[e.key];
  if (newDir && running && !paused && trapFrozenTimer <= 0) {
    e.preventDefault();
    nextDir = newDir;
  }
});

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
    nextDir = nd;
  }
}

// Touch swipe
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
  if (Math.max(absDx, absDy) < 20) return;

  if (absDx > absDy) {
    changeDir(dx > 0 ? 'right' : 'left');
  } else {
    changeDir(dy > 0 ? 'down' : 'up');
  }
}, { passive: true });

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
  elOverOnline.classList.add('hidden');
  elOverStart.classList.remove('hidden');
}

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function createOnlineRoom() {
  const nameInput = elOnlinePlayerName.value.trim();
  myPlayerName = nameInput || 'Host';
  currentRoomCode = generateRoomCode();
  isHost = true;
  isMultiplayer = true;
  mySlot = 0;

  roomPlayers = [
    {
      id: myPlayerId,
      name: myPlayerName,
      slot: 0,
      isHost: true,
      ready: true,
      isAlive: true,
      hp: MAX_HP,
      isFrozen: false,
      score: 0,
      time: 0
    }
  ];

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

  myPlayerName = nameInput || 'Khách';
  currentRoomCode = codeInput;
  isHost = false;
  isMultiplayer = true;

  initNetwork(currentRoomCode);

  broadcastNetworkMessage({
    type: 'JOIN_REQUEST',
    id: myPlayerId,
    name: myPlayerName,
  });

  enterLobbyView();
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
    elBtnStartMultiGame.classList.remove('hidden');
    elGuestWaitingMsg.classList.add('hidden');
  } else {
    elBtnStartMultiGame.classList.add('hidden');
    elGuestWaitingMsg.classList.remove('hidden');
  }

  updateLobbyUI();
}

function updateLobbyUI() {
  elDisplayPlayerCount.textContent = `${roomPlayers.length}/4 người chơi`;
  elPlayerSlots.innerHTML = '';

  for (let i = 0; i < 4; i++) {
    const p = roomPlayers.find(pl => pl.slot === i);
    const card = document.createElement('div');
    card.className = `slot-card p${i} ${p ? '' : 'empty'}`;

    if (p) {
      card.innerHTML = `
        <span class="slot-avatar">🏃</span>
        <span class="slot-name">${p.name} ${p.id === myPlayerId ? '(Bạn)' : ''}</span>
        <span class="slot-role ${p.isHost ? 'host' : 'guest'}">${p.isHost ? '👑 Host' : 'Khách'}</span>
      `;
    } else {
      card.innerHTML = `
        <span class="slot-avatar" style="opacity:0.3">➕</span>
        <span class="slot-name">Vị trí ${i + 1} trống</span>
        <span class="slot-role" style="opacity:0.4">Chờ...</span>
      `;
    }
    elPlayerSlots.appendChild(card);
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
        if (iconEl) iconEl.textContent = p.isHost ? '👑' : (p.isFrozen ? '⛓️' : '🏃');
      } else {
        badge.classList.add('dead');
        if (iconEl) iconEl.textContent = '💀';
      }
    } else {
      badge.style.display = 'none';
    }
  }
}

function leaveOnlineRoom() {
  if (broadcastChannel) {
    broadcastNetworkMessage({ type: 'LEAVE', id: myPlayerId, slot: mySlot });
    broadcastChannel.close();
    broadcastChannel = null;
  }
  if (peer) {
    peer.destroy();
    peer = null;
  }
  isMultiplayer = false;
  isHost = false;
  roomPlayers = [];
  if (elMultiHud) elMultiHud.classList.add('hidden');
}

function hostStartMatch() {
  if (!isHost) return;
  broadcastNetworkMessage({
    type: 'START_MATCH',
    speed: currentSpeed,
  });
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
  broadcastNetworkMessage({
    type: 'RESTART_MATCH',
  });
  startMultiMatchGame();
}

function returnToLobby() {
  running = false;
  if (countdownTimerId) {
    clearInterval(countdownTimerId);
    countdownTimerId = null;
  }
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
    broadcastChannel.onmessage = (e) => {
      handleNetworkMessage(e.data);
    };
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
            conn.send({
              type: 'JOIN_REQUEST',
              id: myPlayerId,
              name: myPlayerName,
            });
          });
          conn.on('data', (data) => handleNetworkMessage(data));
        }
      });

      peer.on('connection', (conn) => {
        peerConnections.push(conn);
        conn.on('data', (data) => {
          handleNetworkMessage(data);
          if (isHost) {
            broadcastNetworkMessage(data, conn);
          }
        });
      });
    } catch (e) {
      console.warn('PeerJS init error:', e);
    }
  }
}

function broadcastNetworkMessage(msg, excludeConn = null) {
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage(msg);
    } catch (e) {}
  }
  for (const conn of peerConnections) {
    if (conn !== excludeConn && conn.open) {
      try {
        conn.send(msg);
      } catch (e) {}
    }
  }
}

function handleNetworkMessage(msg) {
  if (!msg || !msg.type) return;

  switch (msg.type) {
    case 'JOIN_REQUEST': {
      if (isHost) {
        if (roomPlayers.length >= 4) {
          broadcastNetworkMessage({ type: 'ROOM_FULL', targetId: msg.id });
          return;
        }
        let existing = roomPlayers.find(p => p.id === msg.id);
        if (!existing) {
          const slot = roomPlayers.length;
          roomPlayers.push({
            id: msg.id,
            name: msg.name,
            slot: slot,
            isHost: false,
            ready: true,
            isAlive: true,
            hp: MAX_HP,
            isFrozen: false,
            score: 0,
            time: 0
          });
        }
        broadcastNetworkMessage({
          type: 'ROOM_UPDATE',
          players: roomPlayers,
        });
        updateLobbyUI();
      }
      break;
    }

    case 'ROOM_UPDATE': {
      roomPlayers = msg.players || [];
      const me = roomPlayers.find(p => p.id === myPlayerId);
      if (me) {
        mySlot = me.slot;
      }
      updateLobbyUI();
      break;
    }

    case 'START_MATCH': {
      setSpeed(msg.speed || 'normal');
      startMultiMatchGame();
      break;
    }

    case 'RESTART_MATCH': {
      startMultiMatchGame();
      break;
    }

    case 'PLAYER_MOVE': {
      const p = roomPlayers.find(pl => pl.slot === msg.slot);
      if (p) {
        p.x = msg.x;
        p.y = msg.y;
        p.dir = msg.dir;
        p.hp = msg.hp;
        p.isFrozen = msg.isFrozen;
        p.score = msg.score;
        p.time = msg.time;
        p.isAlive = msg.isAlive;
      }
      updateMultiHud();
      break;
    }

    case 'PLAYER_DEATH': {
      const p = roomPlayers.find(pl => pl.slot === msg.slot);
      if (p) {
        p.isAlive = false;
        p.deathCause = msg.reason;
        p.hp = 0;
        p.score = msg.score;
        p.time = msg.time;
      }
      updateMultiHud();
      checkMultiplayerMatchEnd();
      break;
    }

    case 'TRAP_DEPLOYED': {
      if (!placedTraps.some(t => t.id === msg.trap.id)) {
        placedTraps.push(msg.trap);
      }
      break;
    }

    case 'MINE_DEPLOYED': {
      if (!placedMines.some(m => m.id === msg.mine.id)) {
        placedMines.push(msg.mine);
        if (msg.announcer !== myPlayerName) {
          showToast(`🚨 ${msg.announcer} vừa gài một quả Mìn Tàng Hình! Cẩn thận!`);
        }
      }
      break;
    }

    case 'TRAP_TRIGGERED': {
      placedTraps = placedTraps.filter(t => t.id !== msg.trapId);
      const victim = roomPlayers.find(p => p.slot === msg.victimSlot);
      if (victim) {
        victim.isFrozen = true;
        setTimeout(() => { victim.isFrozen = false; }, 3000);
      }
      break;
    }

    case 'MINE_EXPLODED': {
      placedMines = placedMines.filter(m => m.id !== msg.mineId);
      explodeLandmine({ x: msg.x, y: msg.y });
      break;
    }

    case 'SYNC_DISASTERS': {
      if (!isHost) {
        applyDisasterSync(msg);
      }
      break;
    }

    case 'MATCH_OVER': {
      showMultiplayerGameOver(msg.leaderboard);
      break;
    }

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
    spreadingFlames: Array.from(spreadingFlames.entries()).map(([k, v]) => ({ key: k, x: v.x, y: v.y, life: v.life, gen: v.gen })),
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
      spreadingFlames.set(item.key, { x: item.x, y: item.y, life: item.life, maxLife: 6000, gen: item.gen, spreadTimer: 800 });
      burntGrass.set(item.key, 10000);
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

      broadcastNetworkMessage({
        type: 'MATCH_OVER',
        leaderboard: sorted,
      });

      showMultiplayerGameOver(sorted);
    }
  }
}

function showMultiplayerGameOver(leaderboard) {
  running = false;
  if (loopId) cancelAnimationFrame(loopId);
  hideWarning();

  elResRoomCode.textContent = currentRoomCode;
  elLeaderboardList.innerHTML = '';

  const medals = ['🥇', '🥈', '🥉', '💀'];

  leaderboard.forEach((p, idx) => {
    const row = document.createElement('div');
    row.className = 'lb-row';
    const isWinner = idx === 0 && p.isAlive;
    const medal = isWinner ? '🏆' : (medals[idx] || '💀');

    row.innerHTML = `
      <div class="lb-rank-group">
        <span class="lb-rank">${medal}</span>
        <span class="lb-name">${p.name} ${p.id === myPlayerId ? '(Bạn)' : ''}</span>
      </div>
      <div class="lb-stats">
        <span class="lb-score">${p.score || 0} điểm</span>
        <span class="lb-time">${(p.time || 0).toFixed(1)}s ${p.isAlive ? '• Sống sót' : '• Đã ngã xuống'}</span>
      </div>
    `;
    elLeaderboardList.appendChild(row);
  });

  if (isHost) {
    elBtnHostPlayAgain.classList.remove('hidden');
  } else {
    elBtnHostPlayAgain.classList.add('hidden');
  }

  elOverMultiGO.classList.remove('hidden');
}
