// S1 menu (R41): 제목, 숨 쉬는 이슬 캐릭터(스킨 적용), 플레이(가장 큰 버튼), 정원, 패스(받을 보상 배지), 상점, 설정, 크레딧.
// 별 합계, 코인, 이어하기는 두지 않는다. 플레이: 기록이 없으면 1-1 바로 시작, 있으면 챕터 지도(S2)의 최근 챕터.
import { THEME } from '../theme.js';
import { TEST_STAGE } from '../config.js';
import { t } from '../i18n/index.js';
import { Backdrop } from '../ui/bg.js';
import { DewRig } from '../ui/dew.js';
import { button, badge, chip, titleText, go, fadeIn, DEPTH, glow } from '../ui/kit.js';
import { bakeOval } from '../art.js';
import { appliedSkin, isSaveAvailable } from '../save.js';
import { claimableCount, hasAnyRecord, recentBranch } from '../progress.js';
import { startMusic } from '../audio.js';
import { sfx } from '../audio.js';

export default class MenuScene extends Phaser.Scene {
  constructor() { super('Menu'); }

  create() {
    fadeIn(this);
    this.testHooks = {};
    new Backdrop(this, { zone: 1, clouds: [[40, 210, 120], [372, 236, 104]] });
    const D = DEPTH;
    // 제목: 흰 글자 + 10px 진한 테두리 + 7px 그림자
    titleText(this, 270, 113, t('menu.title'), { maxW: 500, minSize: 48 }).setDepth(D.hud);

    // 잔디 타원 + 꽃 + 이슬 캐릭터
    bakeOval(this);
    this.add.image(270, 442, 'menu_oval').setScale(0.5).setDepth(D.objects - 2);
    const flowers = [['flower_3_bloom', 131, 400, 70, 80], ['flower_1_wake', 166, 422, 52, 60], ['flower_3_bloom', 413, 394, 74, 84], ['flower_0_bud', 373, 425, 46, 54]];
    flowers.forEach(([key, x, y, w, h], i) => {
      const im = this.add.image(x, y + h / 2, key).setOrigin(0.5, 1).setDisplaySize(w, h).setDepth(D.objects - 1);
      const sway = key === 'flower_3_bloom' ? { angle: { from: -2, to: 2 }, duration: 1500 } : { scaleY: { from: im.scaleY, to: im.scaleY * 1.03 }, duration: 1200 };
      this.tweens.add({ targets: im, ...sway, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: i * 300 });
    });
    this.dew = new DewRig(this, { x: 270, y: 270 + 0.89 * 148, box: THEME.dew.imageBoxPx.menu, skin: appliedSkin(), depth: D.objects });
    this.dew.setExpr('smile').startBreath().startBlink();
    this.time.addEvent({ delay: 6500, loop: true, callback: () => { this.dew.hop(14, 400, 1); this.dew.setExpr('hop'); this.time.delayedCall(420, () => this.dew.setExpr('smile')); } });
    // 위 번쩍임 입자
    this.add.particles(270, 430, 'p_gold', { x: { min: -110, max: 110 }, y: { min: -90, max: 20 }, lifespan: 1800, alpha: { start: 0.9, end: 0 }, scale: { min: 0.6, max: 1.3 }, speedY: -10, frequency: 500, quantity: 1, blendMode: 'ADD', maxAliveParticles: 6 }).setDepth(D.objects + 1);

    // 버튼 (asset-map S1)
    const play = button(this, { x: 270, y: 558, w: 360, h: 104, variant: 'primary', label: t('menu.play'), glyph: 'ui-extra-icon-play-dark', iconSize: 36, onClick: () => this.play(), depth: D.hud });
    this.testHooks.startButton = play;
    this.garden = button(this, { x: 177, y: 670, w: 174, h: 84, variant: 'secondary', label: t('menu.garden'), icon: 'b1_gardener_hut_day', iconSize: 44, onClick: () => go(this, 'Garden', { from: 'Menu' }), depth: D.hud });
    this.pass = button(this, { x: 363, y: 670, w: 174, h: 84, variant: 'secondary', size: 20, label: t('menu.pass'), icon: 'reward_closed', iconSize: 40, onClick: () => go(this, 'Pass', { from: 'Menu' }), depth: D.hud });
    button(this, { x: 177, y: 768, w: 174, h: 84, variant: 'secondary', label: t('menu.shop'), icon: 'coin', iconSize: 36, onClick: () => go(this, 'Shop', { from: 'Menu' }), depth: D.hud });
    button(this, { x: 363, y: 768, w: 174, h: 84, variant: 'neutral', label: t('menu.settings'), code: 'gear', iconSize: 32, onClick: () => go(this, 'Settings'), depth: D.hud });
    button(this, { x: 270, y: 857, w: 180, h: 62, variant: 'neutral', label: t('menu.credits'), code: 'book', iconSize: 26, onClick: () => go(this, 'Credits'), depth: D.hud });
    const n = claimableCount();
    if (n > 0) { this.passBadge = badge(this, 444, 634, n, 42).setDepth(D.hud + 1); this.passBadge.setPulse(true); }
    if (!isSaveAvailable()) {
      const c = chip(this, 270, 912, t('common.saveUnavailable'), { kind: 'rose', size: 18, maxW: 480, h: 44 }).setDepth(D.popup);
      c.setAlpha(0.98);
    }
    // 키보드: Enter/Space = 플레이
    this.input.keyboard.on('keydown-ENTER', () => play.trigger());
    this.input.keyboard.on('keydown-SPACE', () => play.trigger());
    startMusic(this);
  }

  play() {
    if (TEST_STAGE) { go(this, 'Play', { stage: TEST_STAGE }); return; }
    if (!hasAnyRecord()) { go(this, 'Play', { stage: 1 }); return; }
    go(this, 'StageSelect', { branch: recentBranch() });
  }
}
