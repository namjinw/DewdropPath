// 순수 퍼즐 로직 (Phaser 의존 없음, import 없음). plan.json 3-1 이동 처리 알고리즘(R26)을 그대로 구현한다.
// R1 칸 종류, R2 직진 슬라이드, R3 개화·클리어, R8 얼음, R9 꽃잎, R10 개구리, R27 흙, R28 바람개비, R29 버섯, R30 화분, R31 도토리,
// R43 숨은 상호작용 감지, R16/R34 풀이기(BFS)와 역할 시험.
// 같은 파일을 tools/ 의 스테이지 생성기·검증기가 Node 에서 읽는다. (게임 런타임에서는 힌트용 replay 만 쓰고 풀이기는 돌리지 않는다)

export const COLS = 6;
export const ROWS = 6;
export const N = COLS * ROWS;
export const DIR_NAMES = ['up', 'right', 'down', 'left'];
const DR = [-1, 0, 1, 0];
const DC = [0, 1, 0, -1];
export const GUARD_STEPS = 64; // config.slideLoopGuardStepCount

// 칸 종류(정적)
export const K = { GRASS: 0, ROCK: 1, TREE: 2, DIRT: 3, ICE: 4, PETAL: 5, ARROW: 6, MUSH: 7 };
// 점유(한 번의 이동 중)
const O_FREE = 0, O_ROCK = 1, O_TREE = 2, O_DIRT = 3, O_PUDDLE = 4, O_FROG = 5, O_POT = 6, O_ACORN = 7, O_DEW = 8;
const ARROW_DIR = { '^': 0, '>': 1, v: 2, '<': 3 };

// 이웃 칸 표: NB[dir * N + cell] = 다음 칸 또는 -1
export const NB = new Int8Array(4 * N).fill(-1);
for (let d = 0; d < 4; d++) {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const nr = r + DR[d];
      const nc = c + DC[d];
      if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) NB[d * N + r * COLS + c] = nr * COLS + nc;
    }
  }
}

// ---- 스테이지 해석 ----
// def.rows: 6줄 문자열(3-2 기호). def.frogs: [{ path: [[r,c],...], start }]
export function parseStage(def) {
  const kind = new Uint8Array(N);
  const arrowDir = new Int8Array(N).fill(-1);
  const budAt = new Int8Array(N).fill(-1);
  const iceAt = new Int8Array(N).fill(-1);
  const dirtAt = new Int8Array(N).fill(-1);
  const partner = new Int8Array(N).fill(-1);
  const pairAt = new Int8Array(N).fill(-1);
  const buds = [];
  const ices = [];
  const dirts = [];
  const petals = {};
  const pots = [];
  const acorns = [];
  let start = -1;
  def.rows.forEach((row, r) => {
    for (let c = 0; c < COLS; c++) {
      const ch = row[c];
      const i = r * COLS + c;
      if (ch === '#') kind[i] = K.ROCK;
      else if (ch === 'T') kind[i] = K.TREE;
      else if (ch === 'd') { kind[i] = K.DIRT; dirtAt[i] = dirts.length; dirts.push(i); }
      else if (ch === 'o') { budAt[i] = buds.length; buds.push(i); }
      else if (ch === 'i') { kind[i] = K.ICE; iceAt[i] = ices.length; ices.push(i); }
      else if (ch === 'a' || ch === 'b') { kind[i] = K.PETAL; (petals[ch] = petals[ch] || []).push(i); }
      else if (ch in ARROW_DIR) { kind[i] = K.ARROW; arrowDir[i] = ARROW_DIR[ch]; }
      else if (ch === 'm') kind[i] = K.MUSH;
      else if (ch === 'P') pots.push(i);
      else if (ch === 'c') acorns.push(i);
      else if (ch === 'D') start = i;
    }
  });
  const pairKeys = Object.keys(petals).sort();
  pairKeys.forEach((k, pi) => {
    const [p, q] = petals[k];
    if (q === undefined) return;
    partner[p] = q; partner[q] = p;
    pairAt[p] = pi; pairAt[q] = pi;
  });
  const frogs = (def.frogs || []).map((f) => ({ path: f.path.map(([r, c]) => r * COLS + c), start: f.start || 0 }));
  return {
    id: def.id, branch: def.branch, local: def.local, goal: def.goal, rows: def.rows,
    kind, arrowDir, budAt, iceAt, dirtAt, partner, pairAt,
    buds, ices, dirts, pots, acorns, frogs, start,
    petalCells: pairKeys.map((k) => petals[k]),
    fullMask: buds.length >= 31 ? -1 : (1 << buds.length) - 1
  };
}

export function initialState(level) {
  const frog = [];
  level.frogs.forEach((f) => { frog.push(f.start, f.start >= f.path.length - 1 ? -1 : 1); });
  return { dew: level.start, bloom: 0, broken: 0, collapsed: 0, frog, acorn: level.acorns.slice(), pot: level.pots.slice(), moves: 0 };
}

export function cloneState(st) {
  return { dew: st.dew, bloom: st.bloom, broken: st.broken, collapsed: st.collapsed, frog: st.frog.slice(), acorn: st.acorn.slice(), pot: st.pot.slice(), moves: st.moves };
}

export const frogCells = (level, st) => level.frogs.map((f, k) => f.path[st.frog[k * 2]]);

export function stateKey(st, identity = false) {
  let a = st.acorn;
  let p = st.pot;
  if (!identity) {
    if (a.length > 1) a = a.slice().sort((x, y) => x - y);
    if (p.length > 1) p = p.slice().sort((x, y) => x - y);
  }
  return `${st.dew}|${st.bloom}|${st.broken}|${st.collapsed}|${st.frog.join(',')}|${a.join(',')}|${p.join(',')}`;
}

export const remainingBuds = (level, st) => {
  let n = 0;
  for (let b = 0; b < level.buds.length; b++) if (!((st.bloom >> b) & 1)) n++;
  return n;
};
export const isCleared = (level, st) => st.bloom === level.fullMask;

// ---- 작동(work) 코드: 요소 역할 시험(T1, T2, U)에 쓴다. 코드 = type * 64 + index ----
export const W = { ROCK: 1, TREE: 2, DIRT: 3, ICE: 4, PETAL: 5, ARROW: 6, MUSH: 7, POT: 8, ACORN: 9, FROG: 10, PUDDLE: 11 };
export const workCode = (type, index) => type * 64 + index;

// 숨은 상호작용 번호(R43). 이벤트 id 는 H1~H12
const HID = { pot: { ARROW: 'H1', PETAL: 'H2', MUSH: 'H3', ICE: 'H4', DIRT: 'H5' }, acorn: { ARROW: 'H8', PETAL: 'H9', MUSH: 'H10', ICE: 'H11', DIRT: 'H12' } };

const occScratch = new Uint8Array(N);

// 한 번의 입력(d: 0 위, 1 오른쪽, 2 아래, 3 왼쪽)을 시뮬레이션한다. 아무것도 못 움직이면 null.
// opt.events: true 면 연출용 이벤트 목록(events)을 만든다. opt.forbid: 작동 코드 Set — 하나라도 일어나면 그 이동은 금지(null).
export function slide(level, st, d, opt) {
  const events = opt && opt.events ? [] : null;
  const forbid = opt && opt.forbid ? opt.forbid : null;
  const kind = level.kind;
  const occ = occScratch;
  occ.fill(0);
  for (let i = 0; i < N; i++) {
    const k = kind[i];
    if (k === K.ROCK) occ[i] = O_ROCK;
    else if (k === K.TREE) occ[i] = O_TREE;
    else if (k === K.DIRT && !((st.collapsed >> level.dirtAt[i]) & 1)) occ[i] = O_DIRT;
    else if (k === K.ICE && ((st.broken >> level.iceAt[i]) & 1)) occ[i] = O_PUDDLE;
  }
  const frogNow = [];
  for (let k = 0; k < level.frogs.length; k++) { const c = level.frogs[k].path[st.frog[k * 2]]; frogNow.push(c); occ[c] = O_FROG; }
  const acorn = st.acorn.slice();
  const pot = st.pot.slice();
  for (let k = 0; k < pot.length; k++) occ[pot[k]] = O_POT;
  for (let k = 0; k < acorn.length; k++) occ[acorn[k]] = O_ACORN;
  occ[st.dew] = O_DEW;

  const works = [];
  const hidden = [];
  let bad = false;
  const work = (type, index) => {
    const code = type * 64 + index;
    works.push(code);
    if (forbid && forbid.has(code)) bad = true;
  };
  const addHidden = (id, cell) => { if (!hidden.some((h) => h.id === id)) hidden.push({ id, cell }); };

  // 이동 순서: 진행 방향 앞쪽부터. 같은 값이면 이슬방울이 먼저, 도토리끼리는 칸 번호가 작은 것이 먼저
  const mv = [{ t: 0, i: 0, cell: st.dew }];
  for (let k = 0; k < acorn.length; k++) mv.push({ t: 1, i: k, cell: acorn[k] });
  const front = (m) => (d === 1 ? m.cell % COLS : d === 3 ? -(m.cell % COLS) : d === 2 ? Math.floor(m.cell / COLS) : -Math.floor(m.cell / COLS));
  mv.sort((a, b) => {
    const fa = front(a); const fb = front(b);
    if (fa !== fb) return fb - fa;
    if (a.t !== b.t) return a.t - b.t;
    return a.cell - b.cell;
  });
  const processed = { dew: false, acorn: new Array(acorn.length).fill(false) };
  const movedAcorn = new Array(acorn.length).fill(false);

  let inversion = false;
  let looped = false;

  // 물건(화분, 도토리) 슬라이드: 다음 칸이 비어 있는 동안 한 칸씩. 칸 효과는 받지 않는다. 반환: { end, cells, stopKind, stopCell }
  const thingSlide = (from, dir) => {
    const cells = [];
    let cur = from;
    let guard = 0;
    for (;;) {
      if (++guard > GUARD_STEPS) { looped = true; break; }
      const n = NB[dir * N + cur];
      if (n < 0 || occ[n] !== O_FREE) return { end: cur, cells, stopKind: n < 0 ? 'wall' : occ[n], stopCell: n };
      cur = n;
      cells.push(n);
    }
    return { end: cur, cells, stopKind: 'wall', stopCell: -1 };
  };

  // 물건이 지난 칸에서 숨은 상호작용(H1~H5, H8~H12)을 감지한다.
  const thingHidden = (who, cells, stopKind, stopCell) => {
    const map = HID[who];
    for (const c of cells) {
      const k = kind[c];
      if (k === K.ARROW) addHidden(map.ARROW, c);
      else if (k === K.PETAL) addHidden(map.PETAL, c);
      else if (k === K.MUSH) addHidden(map.MUSH, c);
      else if (k === K.ICE && !((st.broken >> level.iceAt[c]) & 1)) addHidden(map.ICE, c);
    }
    if (stopKind === O_DIRT) addHidden(map.DIRT, stopCell);
  };

  // ---- 이슬방울 ----
  let dewPos = st.dew;
  let dewMoved = false;
  let potMoved = false;
  let bloom = st.bloom;
  let steppedMask = 0;
  let wetMask = 0;
  let steps = 0;
  let cur = d;

  const runDew = () => {
    occ[dewPos] = O_FREE;
    const startCell = dewPos;
    let bloomOrder = 0;
    if (kind[dewPos] === K.ICE) steppedMask |= 1 << level.iceAt[dewPos];
    if (events) events.push({ e: 'start', cell: dewPos, dir: d });

    const enter = (n, landing) => {
      dewPos = n; steps++;
      if (events) events.push({ e: 'step', cell: n, dir: cur, landing: !!landing });
      const b = level.budAt[n];
      if (b >= 0 && !((bloom >> b) & 1)) { bloom |= 1 << b; bloomOrder++; if (events) events.push({ e: 'bloom', cell: n, order: bloomOrder, bud: b }); }
      const k = kind[n];
      if (k === K.ICE) { steppedMask |= 1 << level.iceAt[n]; if (events) events.push({ e: 'iceStep', cell: n }); }
      else if (k === K.PETAL) {
        const p = level.partner[n];
        if (p >= 0 && occ[p] === O_FREE) {
          work(W.PETAL, level.pairAt[n]);
          if (events) events.push({ e: 'teleport', from: n, to: p, dir: cur });
          dewPos = p; steps++;
        }
      } else if (k === K.ARROW) {
        const nd = level.arrowDir[n];
        if (nd !== cur) {
          work(W.ARROW, n);
          if (events) events.push({ e: 'turn', cell: n, from: cur, dir: nd });
          cur = nd;
        } else if (events) events.push({ e: 'leafSame', cell: n });
      } else if (k === K.MUSH) {
        const n1 = NB[cur * N + n];
        if (n1 >= 0 && occ[n1] !== O_FREE && occ[n1] !== O_TREE) {
          const n2 = NB[cur * N + n1];
          if (n2 >= 0 && occ[n2] === O_FREE) {
            work(W.MUSH, n);
            if (occ[n1] === O_ROCK) work(W.ROCK, n1);
            else if (occ[n1] === O_PUDDLE) work(W.PUDDLE, n1);
            if (events) events.push({ e: 'jump', from: n, over: n1, to: n2, dir: cur });
            enter(n2, true);
          }
        }
      }
    };

    for (;;) {
      if (steps >= GUARD_STEPS) { looped = true; if (events) events.push({ e: 'guard', cell: dewPos }); break; }
      const n = NB[cur * N + dewPos];
      if (n < 0) { if (events) events.push({ e: 'stop', cell: dewPos, dir: cur, bump: 'wall' }); break; }
      const o = occ[n];
      if (o === O_FREE) { enter(n, false); continue; }
      // 막힘
      if (o === O_POT) {
        const beyond = NB[cur * N + n];
        if (beyond >= 0 && occ[beyond] === O_FREE) {
          let pi = pot.indexOf(n);
          occ[n] = O_FREE;
          const r = thingSlide(n, cur);
          const dest = r.end;
          occ[dest] = O_POT;
          if (r.stopKind === O_ACORN) { const ai = acorn.indexOf(r.stopCell); if (ai >= 0 && !processed.acorn[ai]) inversion = true; }
          pot[pi] = dest;
          potMoved = true;
          work(W.POT, pi);
          thingHidden('pot', r.cells, r.stopKind, r.stopCell);
          if (events) events.push({ e: 'potPush', i: pi, from: n, to: dest, cells: r.cells, dir: cur });
          if (events) events.push({ e: 'stop', cell: dewPos, dir: cur, bump: 'pot' });
        } else if (events) events.push({ e: 'stop', cell: dewPos, dir: cur, bump: 'potStuck', target: n });
        break;
      }
      if (o === O_DIRT) {
        wetMask |= 1 << level.dirtAt[n];
        work(W.DIRT, level.dirtAt[n]);
        if (events) events.push({ e: 'dirtWet', cell: n });
        if (events) events.push({ e: 'stop', cell: dewPos, dir: cur, bump: 'dirt', target: n });
        break;
      }
      if (o === O_ROCK) work(W.ROCK, n);
      else if (o === O_TREE) work(W.TREE, n);
      else if (o === O_PUDDLE) work(W.PUDDLE, n);
      else if (o === O_FROG) work(W.FROG, frogNow.indexOf(n));
      else if (o === O_ACORN) {
        const ai = acorn.indexOf(n);
        work(W.ACORN, ai);
        if (ai >= 0 && !processed.acorn[ai]) inversion = true;
        // H6: 앞에서 처리된 도토리가 움직였고 그 새 위치 바로 뒤에 멈춤
        if (ai >= 0 && processed.acorn[ai] && movedAcorn[ai]) addHidden('H6', n);
      }
      if (events) events.push({ e: 'stop', cell: dewPos, dir: cur, bump: o === O_ROCK ? 'rock' : o === O_TREE ? 'tree' : o === O_FROG ? 'frog' : o === O_ACORN ? 'acorn' : 'puddle', target: n });
      break;
    }
    dewMoved = dewPos !== startCell;
    occ[dewPos] = O_DEW;
    processed.dew = true;
  };

  for (const m of mv) {
    if (bad) break;
    if (m.t === 0) { runDew(); continue; }
    const from = acorn[m.i];
    occ[from] = O_FREE;
    const r = thingSlide(from, d);
    occ[r.end] = O_ACORN;
    if (r.stopKind === O_ACORN) {
      const ai = acorn.indexOf(r.stopCell);
      if (ai >= 0 && !processed.acorn[ai]) inversion = true;
      // H6: 도토리끼리도 줄서기: 앞의 도토리가 움직였고 그 새 위치 바로 뒤에 멈춤
      if (ai >= 0 && processed.acorn[ai] && movedAcorn[ai]) addHidden('H6', from);
    } else if (r.stopKind === O_DEW && processed.dew && dewMoved) {
      addHidden('H6', from);
    }
    if (r.end !== from) {
      movedAcorn[m.i] = true;
      acorn[m.i] = r.end;
      thingHidden('acorn', r.cells, r.stopKind, r.stopCell);
      if (events) events.push({ e: 'acornSlide', i: m.i, from, to: r.end, cells: r.cells, dir: d });
    }
    processed.acorn[m.i] = true;
  }
  if (bad) return null;
  if (looped) return { looped: true, state: null, cleared: false, works, hidden, events, inversion };

  const acornMoved = movedAcorn.some(Boolean);
  if (!dewMoved && !potMoved && !acornMoved) return null;
  if (!dewMoved && !potMoved && acornMoved) addHidden('H7', acorn[movedAcorn.indexOf(true)]);

  // ---- 마무리(순서 고정): 횟수 -> 얼음 -> 흙 -> 개구리 -> 클리어 ----
  let broken = st.broken;
  for (let i = 0; i < level.ices.length; i++) {
    if (((steppedMask >> i) & 1) && level.ices[i] !== dewPos && !((broken >> i) & 1)) {
      broken |= 1 << i;
      work(W.ICE, i);
      if (events) events.push({ e: 'iceBreak', cell: level.ices[i] });
    }
  }
  let collapsed = st.collapsed;
  for (let i = 0; i < level.dirts.length; i++) {
    if ((wetMask >> i) & 1) { collapsed |= 1 << i; if (events) events.push({ e: 'dirtCrumble', cell: level.dirts[i] }); }
  }
  const frog = st.frog.slice();
  const fcell = frogNow.slice();
  for (let k = 0; k < level.frogs.length; k++) {
    const path = level.frogs[k].path;
    if (path.length < 2) continue;
    let i = frog[k * 2];
    let dd = frog[k * 2 + 1];
    let ni = i + dd;
    if (ni < 0 || ni >= path.length) { dd = -dd; ni = i + dd; }
    const target = path[ni];
    let blocked = target === dewPos;
    if (!blocked) for (let q = 0; q < pot.length; q++) if (pot[q] === target) { blocked = true; break; }
    if (!blocked) for (let q = 0; q < acorn.length; q++) if (acorn[q] === target) { blocked = true; break; }
    if (!blocked) for (let q = 0; q < fcell.length; q++) if (q !== k && fcell[q] === target) { blocked = true; break; }
    if (blocked) {
      if (target === dewPos) work(W.FROG, k);
      if (events) events.push({ e: 'frogStay', i: k });
      continue;
    }
    if (events) events.push({ e: 'frogHop', i: k, from: path[i], to: target });
    frog[k * 2] = ni; frog[k * 2 + 1] = dd; fcell[k] = target;
  }
  if (bad) return null;
  const state = { dew: dewPos, bloom, broken, collapsed, frog, acorn, pot, moves: st.moves + 1 };
  return { state, events, works, hidden, looped: false, inversion, cleared: bloom === level.fullMask, dewMoved, potMoved, acornMoved, bloomedNow: popcount(bloom) - popcount(st.bloom) };
}

function popcount(x) { let n = 0; while (x) { n += x & 1; x >>>= 1; } return n; }

// ---- 풀이기 (BFS) ----
// 반환: { moves, ways, solutions, nodes, looped, inversion } 또는 null(깊이/노드 한도 안에 해 없음).
// opt: maxDepth, maxNodes, forbid(Set), identity, paths(최적 방향열 목록, 기본 true), from, stopAtDepth(이 깊이 안에서 못 찾으면 null), inversionDepth
export function solve(level, opt = {}) {
  const maxDepth = opt.maxDepth ?? 18;
  const maxNodes = opt.maxNodes ?? 2000000;
  const identity = !!opt.identity;
  const wantPaths = opt.paths !== false;
  const forbid = opt.forbid || null;
  const explore = !!opt.explore; // 해를 찾아도 멈추지 않고 maxDepth 까지 탐색하며 looped/inversion 만 모은다
  const start = cloneState(opt.from || initialState(level));
  start.moves = 0;
  if (isCleared(level, start)) return { moves: 0, ways: 1, solutions: [[]], nodes: 1, looped: false, inversion: false };
  const index = new Map();
  const depthOf = [0];
  const preds = wantPaths ? [[]] : null;
  const waysOf = [1];
  index.set(stateKey(start, identity), 0);
  let layer = [start];
  let layerIdx = [0];
  let looped = false;
  let inversion = false;
  let nodes = 1;
  const goals = [];
  for (let depth = 1; depth <= maxDepth && layer.length; depth++) {
    const next = [];
    const nextIdx = [];
    let found = false;
    for (let li = 0; li < layer.length; li++) {
      const st = layer[li];
      const si = layerIdx[li];
      for (let d = 0; d < 4; d++) {
        const res = slide(level, st, d, forbid ? { forbid } : null);
        if (!res) continue;
        if (res.looped) { looped = true; continue; }
        if (res.inversion) inversion = true;
        const ns = res.state;
        ns.moves = 0;
        const kb = stateKey(ns, identity);
        let ni = index.get(kb);
        if (ni === undefined) {
          ni = depthOf.length;
          index.set(kb, ni);
          depthOf.push(depth);
          waysOf.push(waysOf[si]);
          if (preds) preds.push([[si, d]]);
          nodes++;
          if (res.cleared && !explore) { found = true; goals.push(ni); } else { next.push(ns); nextIdx.push(ni); }
        } else if (depthOf[ni] === depth) {
          waysOf[ni] += waysOf[si];
          if (preds) preds[ni].push([si, d]);
        }
      }
    }
    if (found) {
      let ways = 0;
      for (const g of goals) ways += waysOf[g];
      let solutions = null;
      if (wantPaths) {
        solutions = [];
        const cap = opt.pathCap ?? 12;
        const walk = (idx, acc) => {
          if (solutions.length >= cap) return;
          if (idx === 0) { solutions.push(acc.slice().reverse().map((x) => DIR_NAMES[x])); return; }
          for (const [pi, dd] of preds[idx]) { acc.push(dd); walk(pi, acc); acc.pop(); }
        };
        for (const g of goals) walk(g, []);
      }
      return { moves: depth, ways, solutions, nodes, looped, inversion };
    }
    layer = next; layerIdx = nextIdx;
    if (nodes > maxNodes) return explore ? { moves: -1, ways: 0, solutions: [], nodes, looped, inversion, truncated: true } : null;
  }
  return explore ? { moves: -1, ways: 0, solutions: [], nodes, looped, inversion } : null;
}

// 방향열을 따라가며 상태와 결과를 돌려준다. 못 움직이는 수가 있으면 거기서 null.
export function replay(level, dirs, from, opt) {
  let st = from ? cloneState(from) : initialState(level);
  const out = [];
  for (const name of dirs) {
    const d = typeof name === 'number' ? name : DIR_NAMES.indexOf(name);
    const res = slide(level, st, d, opt || { events: false });
    if (!res || !res.state) return null;
    out.push(res);
    st = res.state;
  }
  return { final: st, steps: out };
}

// 틀: rows 문자열의 한 칸을 바꾼 새 정의
export function withCell(def, cell, ch) {
  const rows = def.rows.map((r) => r.split(''));
  rows[Math.floor(cell / COLS)][cell % COLS] = ch;
  return { ...def, rows: rows.map((r) => r.join('')) };
}
