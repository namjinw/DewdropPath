// 효과음/음악 관리. 설정(효과음, 음악)은 save.js 에 저장된다. 모든 재생은 try/catch 로 감싸 소리 문제로 게임이 멈추지 않게 한다.
// 파일과 재생 속도(playbackRate)는 assets/manifest.json 의 sfxUsage 를 따른다. 새 소리 이벤트(plan 8번)는 기존 파일의 음높이만 바꿔 재사용한다.
import { isSfxOn, isMusicOn } from './save.js';
import { CONFIG } from './config.js';

// 로드할 파일 목록 (assets/audio/sfx/<키>.ogg). 키는 파일 이름이다. manifest.json 의 sfx 와 같아야 한다.
export const SFX_FILES = [
  'slide_ch1', 'slide_ch2', 'slide_ch3', 'slide_ch4', 'slide_ch5',
  'drop', 'blocked', 'chime', 'pleasing-bell', 'bell-ding2', 'pluck', 'complete', 'bong', 'hint',
  'ice-shatter', 'teleport', 'frog-croak1', 'frog-croak2', 'frog-croak3', 'frog-croak4', 'switch',
  'trying-to-unlock', 'ui-click-1', 'ui-click-2', 'dirt_crumble', 'pot_slide', 'place'
];
export const MUSIC_KEY = 'island';

// 파일마다 녹음 크기가 달라(assets/LICENSES.md 의 평균 dB) 같은 음량으로 틀면 들쭉날쭉하다. 평균 dB 를 기준으로 음량을 맞춘다.
const MEAN_DB = {
  slide_ch1: -26, slide_ch2: -26, slide_ch3: -26, slide_ch4: -26, slide_ch5: -26,
  drop: -23, blocked: -21, chime: -20, 'pleasing-bell': -20, 'bell-ding2': -25, pluck: -24, complete: -20,
  bong: -20, hint: -20, 'ice-shatter': -27, teleport: -24, 'frog-croak1': -20, 'frog-croak2': -20, 'frog-croak3': -20,
  'frog-croak4': -22, switch: -28, 'trying-to-unlock': -22, 'ui-click-1': -27, 'ui-click-2': -20,
  dirt_crumble: -24, pot_slide: -26, place: -24
};
const LEVEL = { ui: 0.16, move: 0.2, bloom: 0.24, reward: 0.28, soft: 0.18 };
const CAP = { 'ice-shatter': 0.35, 'ui-click-1': 0.36, switch: 0.4, slide_ch1: 0.4, slide_ch2: 0.4, slide_ch3: 0.4, slide_ch4: 0.4, slide_ch5: 0.4 };

// 동시 재생 제한: 같은 소리는 MIN_GAP_MS 안에 다시 틀지 않고, 한꺼번에 울리는 소리는 MAX_VOICES 개까지만 낸다.
// 중요한 소리(보상, 클리어)는 force 로 한도를 넘어 재생하되 가장 오래된 소리를 끊어 자리를 만든다.
const MIN_GAP_MS = 45;
const MAX_VOICES = 5;
const MAX_VOICES_FORCE = 7;

let game = null;
let music = null;
let voices = [];
const lastAt = {};
const timers = new Set();

export function initAudio(g) { game = g; }

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

function volumeFor(key, level) {
  const gain = 10 ** ((-20 - (MEAN_DB[key] ?? -22)) / 20);
  return Math.min(CAP[key] ?? 0.7, LEVEL[level] * gain);
}

// opts: level(음량 종류), rate(재생 속도), force(한도를 넘어 재생), vol(음량 배율)
function play(key, { level = 'ui', rate = 1, force = false, vol = 1 } = {}) {
  if (!game || !isSfxOn()) return;
  try {
    if (!game.cache.audio.exists(key)) return;
    const t = now();
    voices = voices.filter((v) => v.until > t);
    if (t - (lastAt[key + rate] || 0) < MIN_GAP_MS) return;
    const limit = force ? MAX_VOICES_FORCE : MAX_VOICES;
    if (voices.length >= limit) {
      if (!force) return;
      const oldest = voices.shift();
      try { oldest.sound.stop(); oldest.sound.destroy(); } catch (e) { /* 이미 끝남 */ }
    }
    lastAt[key + rate] = t;
    const sound = game.sound.add(key, { volume: volumeFor(key, level) * vol, rate });
    const ms = (sound.totalDuration || sound.duration || 0.6) * 1000 / rate + 120;
    const cleanup = () => { try { sound.destroy(); } catch (e) { /* 무시 */ } };
    sound.once('complete', cleanup);
    voices.push({ sound, until: t + ms });
    sound.play();
  } catch (e) { /* 소리 실패는 무시 */ }
}

// 일정 시간 뒤에 틀기 (연속음). 장면이 바뀌어도 소리는 그대로 이어진다.
function later(ms, fn) {
  const id = setTimeout(() => { timers.delete(id); fn(); }, ms);
  timers.add(id);
}

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const click = () => play('ui-click-1', { level: 'ui' });
const seq = (key, rates, gap, level = 'reward') => rates.forEach((rate, i) => later(i * gap, () => play(key, { level, rate, force: true })));

export const sfx = {
  // F17: 버튼 누름과 화면 이동, 설정 토글, 패널 열고 닫기는 모두 같은 가벼운 클릭
  click,
  soft: () => play('ui-click-2', { level: 'ui' }), // F19 공유 복사
  back: click, select: click, toggle: click, open: click, close: click, pop: click,
  // F1 + R42: 챕터별 부드러운 미끄러짐 5종 (±3% 음높이, 차임보다 낮게)
  slide: (branch = 1) => {
    const jitter = 1 + (Math.random() * 2 - 1) * (CONFIG.slideSoundPitchJitterPct / 100);
    play(`slide_ch${Math.min(5, Math.max(1, branch))}`, { level: 'move', rate: jitter, vol: CONFIG.slideSoundVolumeRatio * 1.6 });
  },
  // F3: 벽에 닿는 낮은 톡
  wall: () => play('drop', { level: 'move' }),
  // F4: 막힌 입력
  blocked: () => play('blocked', { level: 'soft' }),
  // F2: 개화 순서대로 한 계단씩 올라가는 차임 (rate 1 + 0.08 x 순서, 5번째 이후는 같은 음)
  bloom: (order = 1) => play('chime', { level: 'bloom', rate: 1 + 0.08 * Math.min(order, 5) }),
  // F5: 연쇄 마지막의 반짝이는 벨
  chain: () => seq('pleasing-bell', [1, 1.12, 1.26], 110),
  // F6: 팡파르(complete) 1회와 차임 4음 (rate 1, 1.12, 1.26, 1.5)
  clear: () => {
    play('complete', { level: 'reward', force: true });
    [1, 1.12, 1.26, 1.5].forEach((rate, i) => later(180 + i * 130, () => play('chime', { level: 'reward', rate, force: true })));
  },
  // F7: 별 번호 순서대로 rate 가 올라가는 벨
  star: (i = 0) => play('pleasing-bell', { level: 'reward', rate: [1, 1.12, 1.26][Math.min(i, 2)], force: true }),
  // F8: 맑은 종소리 2음 (rate 1, 1.25)
  newBest: () => seq('bell-ding2', [1, 1.25], 170),
  // F9: 낮은 한 음
  starLost: () => play('bong', { level: 'soft' }),
  // F10: 얼음이 깨지는 짧은 소리 (깨질 때 한 번만)
  ice: () => play('ice-shatter', { level: 'move' }),
  // F11: 휙 하는 상승음 (음높이는 파일에 구워져 있다)
  teleport: () => play('teleport', { level: 'move' }),
  // F12: 개굴
  frog: () => play(pick(['frog-croak1', 'frog-croak2', 'frog-croak3', 'frog-croak4']), { level: 'move' }),
  // F13, F27: 되감기
  undo: () => play('switch', { level: 'move' }),
  hintRewind: () => play('switch', { level: 'move', rate: 0.8 }),
  // F15: 자물쇠 해제
  unlock: () => play('trying-to-unlock', { level: 'reward', force: true }),
  // F16: 패스 보상 받기, 부드러운 3음 (pluck rate 1, 1.19, 1.5)
  passClaim: () => seq('pluck', [1, 1.19, 1.5], 140),
  // F18, F25: 작은 안내 차임
  banner: () => play('hint', { level: 'soft' }),
  card: () => play('hint', { level: 'soft' }),
  branchBanner: () => play('hint', { level: 'soft', rate: 1.12 }),
  // F20: 코인 획득, 부드러운 물방울 톡톡 2음
  coinGain: () => { play('drop', { level: 'reward', rate: 1.25, force: true }); later(140, () => play('drop', { level: 'reward', rate: 1.5, force: true })); },
  // F21: 힌트 표시, 맑은 짧은 한 음
  hintUse: () => play('chime', { level: 'reward', rate: 1.26 }),
  // F22: 힌트 불가, 짧고 낮은 부드러운 한 음
  hintFail: () => play('bong', { level: 'soft', rate: 1.2 }),
  // F23: 구매 성공, 부드러운 2음 (pluck rate 1, 1.5)
  buySuccess: () => seq('pluck', [1, 1.5], 150),
  // F24: 코인 부족
  coinShort: () => play('drop', { level: 'soft', rate: 0.85 }),
  // v5 새 소리 이벤트 (기존 파일의 음높이만 바꿔 재사용)
  dirtCrumble: () => play('dirt_crumble', { level: 'move' }),
  arrowTurn: () => play('pluck', { level: 'move', rate: 1.6 }),
  mushroomJump: () => play('drop', { level: 'move', rate: 0.7, vol: 1.3 }),
  potPush: () => play('pot_slide', { level: 'move' }),
  acornRoll: () => { play('drop', { level: 'soft', rate: 1.7, vol: 0.8 }); later(110, () => play('drop', { level: 'soft', rate: 1.9, vol: 0.7 })); },
  perfect: () => seq('bell-ding2', [1, 1.25, 1.5], 170),
  passLevel: () => seq('chime', [1, 1.26, 1.5], 100),
  gardenPick: () => play('ui-click-1', { level: 'ui', rate: 1.25 }),
  gardenPlace: () => play('place', { level: 'move' }),
  gardenFail: () => play('blocked', { level: 'soft', rate: 0.9 }),
  residentTap: () => play('chime', { level: 'soft', rate: 1.5 }),
  plotExpand: () => seq('pluck', [1, 1.19, 1.5, 1.8], 120),
  applyStyle: () => play('chime', { level: 'reward', rate: 1.12 }),
  constructTock: () => play('drop', { level: 'soft', rate: 1.8, vol: 0.9 }),
  constructDone: () => play('chime', { level: 'reward', rate: 1.5, force: true })
};

// 음악 파일(756KB)은 첫 로딩을 늦추지 않도록 메뉴가 뜬 뒤에 불러온다.
let musicLoading = false;
export function startMusic(scene) {
  if (!game || !isMusicOn()) return;
  try {
    if (!game.cache.audio.exists(MUSIC_KEY)) {
      if (musicLoading || !scene) return;
      musicLoading = true;
      scene.load.audio(MUSIC_KEY, `assets/audio/music/${MUSIC_KEY}.ogg`);
      scene.load.once('complete', () => { musicLoading = false; startMusic(); });
      scene.events.once('shutdown', () => { musicLoading = false; }); // 불러오는 중에 화면이 바뀌면 다음 메뉴에서 다시 시도한다
      scene.load.start();
      return;
    }
    if (!music) music = game.sound.add(MUSIC_KEY, { loop: true, volume: 0.35 });
    if (!music.isPlaying) music.play();
  } catch (e) { /* 무시 */ }
}

export function stopMusic() {
  try { if (music && music.isPlaying) music.stop(); } catch (e) { /* 무시 */ }
}

// 설정 화면에서 음악 토글을 바꾼 뒤 호출한다.
export function syncMusic(scene) {
  if (isMusicOn()) startMusic(scene); else stopMusic();
}

// 탭이 가려지면 소리를 멈추고 돌아오면 이어서 튼다
export function setPaused(p) {
  try { if (!game) return; if (p) game.sound.pauseAll(); else game.sound.resumeAll(); } catch (e) { /* 무시 */ }
}
