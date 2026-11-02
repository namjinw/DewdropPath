// 정원 시각 (R45, plan 3-10): 한국 표준시(UTC+9)를 Date.now() 산술로 계산한다. 기기 시간대와 서버 시계는 쓰지 않는다.
// ?test=1&hour=22[&min=30][&timeScale=600] 일 때만 시각을 덮어쓴다 (config.js 의 TEST_CLOCK).
import { CONFIG, TEST_CLOCK } from './config.js';

const t0 = Date.now();

export function kstMinutes(now = Date.now()) {
  if (TEST_CLOCK) {
    const base = TEST_CLOCK.hour * 60 + TEST_CLOCK.min;
    if (!TEST_CLOCK.timeScale) return base;
    // timeScale 600 이면 실제 1초 = 가상 10분 (실제 ms x scale / 60000 분)
    return Math.floor(base + ((now - t0) * TEST_CLOCK.timeScale) / 60000) % 1440;
  }
  return Math.floor((((now + CONFIG.gardenClockUtcOffsetS * 1000) % 86400000) + 86400000) % 86400000 / 60000);
}

// 새벽 05:00~06:59, 낮 07:00~16:59, 해 질 녘 17:00~18:59, 밤 19:00~04:59
export function periodOf(minutes = kstMinutes()) {
  if (minutes >= CONFIG.gardenDawnStartMinuteCount && minutes < CONFIG.gardenDayStartMinuteCount) return 'dawn';
  if (minutes >= CONFIG.gardenDayStartMinuteCount && minutes < CONFIG.gardenDuskStartMinuteCount) return 'day';
  if (minutes >= CONFIG.gardenDuskStartMinuteCount && minutes < CONFIG.gardenNightStartMinuteCount) return 'dusk';
  return 'night';
}
export const currentPeriod = () => periodOf(kstMinutes());
export const PERIODS = ['dawn', 'day', 'dusk', 'night'];
// 밤 별: 18:00 이후 8개 먼저, 19:00 이후 전부 (3-12-7, theme.motionNotes.period)
export function starCountFor(minutes = kstMinutes()) {
  if (periodOf(minutes) === 'night') return CONFIG.skyStarCount;
  if (minutes >= 1080 && minutes < CONFIG.gardenNightStartMinuteCount) return 8;
  return 0;
}
