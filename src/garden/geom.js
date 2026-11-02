// 정원 아이소메트릭 좌표 (plan 3-6, theme.garden): 칸 64x32, 화면 좌표 = 원점 + ((x - y) * 32, (x + y) * 16).
// 보기 변환: 확대(1.0 <-> 0.6)와 카메라 이동(pan)을 오브젝트마다 직접 적용한다 (보조 카메라 없이 깊이 정렬을 한 곳에서 한다).
import { THEME } from '../theme.js';
import { CONFIG } from '../config.js';

const G = THEME.garden;
export const TW = G.tile.w;
export const TH = G.tile.h;
export const PIVOT = { x: 270, y: 500 }; // 영지 중심이 놓이는 곳, 확대의 기준점

export class GardenView {
  constructor(n) {
    this.n = n;
    this.zoom = 1;
    this.pan = { x: 0, y: 0 }; // 세계 단위(확대 1.0 기준)
    this.origin = { x: 270, y: PIVOT.y - n * (TH / 2) }; // 영지 맨 위 꼭짓점
  }
  setPlot(n) { this.n = n; this.origin = { x: 270, y: PIVOT.y - n * (TH / 2) }; }
  // 칸 (x, y) 의 위쪽 꼭짓점 (세계 좌표)
  vertex(x, y) { return { x: this.origin.x + (x - y) * (TW / 2), y: this.origin.y + (x + y) * (TH / 2) }; }
  // 세계 -> 화면
  toScreen(wx, wy) { return { x: PIVOT.x + (wx - PIVOT.x - this.pan.x) * this.zoom, y: PIVOT.y + (wy - PIVOT.y - this.pan.y) * this.zoom }; }
  // 화면 -> 세계
  toWorld(sx, sy) { return { x: PIVOT.x + (sx - PIVOT.x) / this.zoom + this.pan.x, y: PIVOT.y + (sy - PIVOT.y) / this.zoom + this.pan.y }; }
  // 화면 위치 -> 연속 칸 좌표(실수). 위쪽 꼭짓점이 정수 (x, y)
  tileAt(sx, sy) {
    const w = this.toWorld(sx, sy);
    const a = (w.x - this.origin.x) / (TW / 2);
    const b = (w.y - this.origin.y) / (TH / 2);
    return { x: (a + b) / 2, y: (b - a) / 2 };
  }
  inside(x, y, size = 1) { return x >= 0 && y >= 0 && x + size <= this.n && y + size <= this.n; }
  // 카메라 이동 한도: 영지 끝에서 바깥 120px 여유까지 (gardenPanMarginPx)
  clampPan() {
    const m = CONFIG.gardenPanMarginPx;
    const halfW = this.n * (TW / 2) + m;
    const halfH = this.n * (TH / 2) + m + 40;
    const limX = Math.max(0, halfW - 270 / this.zoom);
    const limY = Math.max(0, halfH - 300 / this.zoom);
    this.pan.x = Math.max(-limX, Math.min(limX, this.pan.x));
    this.pan.y = Math.max(-limY, Math.min(limY, this.pan.y));
  }
}

// 놓인 아이템의 세계 기준점(이미지 아래 가운데가 닿는 곳)과 크기 (3-6, theme.garden.items)
export function itemSpec(item) {
  const I = G.items;
  if (item.kind === 'building') return { w: I.buildingWidthPx, ratio: I.buildingBottomRatio, footDy: 68, size: 2 };
  if (item.kind === 'ground') return { w: I.floorWidthPx, ratio: I.floorBottomRatio, footDy: 34, size: 1 };
  return { w: I.decorWidthPx, ratio: I.decorBottomRatio, footDy: 35, size: 1 };
}
// 겹침 순서: (x + y) x 10 + (바닥 0, 물건 5, 주민 6). 2x2 는 앞쪽 끝 칸(x+1, y+1) 기준
export const depthOf = (item, x, y) => G_DEPTH + ((item.kind === 'building' ? x + y + 2 : x + y) * 10 + (item.kind === 'ground' ? 0 : 5)) * 0.5;
export const residentDepth = (x, y) => G_DEPTH + ((x + y) * 10 + 6) * 0.5;
const G_DEPTH = THEME.depth.gardenBase;
