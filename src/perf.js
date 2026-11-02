// 성능 단계 (R46, plan 3-13): 모바일 판단(터치 입력 기기 또는 화면 폭 540 이하), 저사양 전환(평균 30fps 미만이 3초 이어지면 모두 저사양 값).
import { CONFIG, TEST } from './config.js';

const PERF = CONFIG.perf;
let low = false;
let slowMs = 0;
let timer = null;

export const isMobile = () => {
  try { return (navigator.maxTouchPoints > 0) || window.innerWidth <= 540; } catch (e) { return false; }
};
export const isLowPerf = () => low;
export const forceLowPerf = (v) => { low = !!v; };

// 한 단계 값: tier = 'desktop' | 'mobile' | 'low'
export const tier = () => (low ? 'low' : isMobile() ? 'mobile' : 'desktop');
const pick = (m, l, d) => (low ? l : isMobile() ? m : d);
export const limits = () => ({
  buildingAnim: pick(PERF.buildingAnimMaxMobileCount, PERF.buildingAnimMaxLowPerfCount, PERF.buildingAnimMaxDesktopCount),
  decorAnim: pick(PERF.decorAnimMaxMobileCount, PERF.decorAnimMaxLowPerfCount, PERF.decorAnimMaxDesktopCount),
  particles: pick(PERF.particleMaxMobileCount, PERF.particleMaxLowPerfCount, PERF.particleMaxDesktopCount),
  boardParticles: pick(PERF.boardParticleMaxMobileCount, PERF.boardParticleMaxLowPerfCount, PERF.boardParticleMaxDesktopCount),
  residents: low ? CONFIG.gardenLowPerfResidentCount : 6,
  stars: low ? Math.round(CONFIG.skyStarCount / 2) : CONFIG.skyStarCount,
  themeScale: low ? 0.5 : 1
});

// 평균 프레임 간격이 lowPerfFrameMs(33ms) 이상으로 lowPerfSustainSec(3초) 이어지면 저사양으로 전환한다
export function monitor(game) {
  if (timer || TEST) return; // 테스트 모드의 소프트웨어 렌더링은 항상 느리다: 자동 전환을 하지 않는다
  timer = setInterval(() => {
    if (document.hidden) { slowMs = 0; return; }
    const fps = game.loop.actualFps || 60;
    if (1000 / fps >= PERF.lowPerfFrameMs) slowMs += 500; else slowMs = Math.max(0, slowMs - 500);
    if (!low && slowMs >= PERF.lowPerfSustainSec * 1000) { low = true; game.events.emit('lowperf'); }
  }, 500);
}
