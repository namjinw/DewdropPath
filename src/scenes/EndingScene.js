// 엔딩: 모든 스테이지를 클리어하면 한 번 보여 준다. 이슬이가 뛰고 꽃이 핀 정원, 기록 요약, "계속 개발 중" 안내, 스테이지 목록/메뉴 버튼.
import { THEME } from '../theme.js';
import { CONFIG } from '../config.js';
import { t } from '../i18n/index.js';
import { Backdrop } from '../ui/bg.js';
import { DewRig } from '../ui/dew.js';
import { button, panel, text, headingText, chip, ribbon, image, go, fadeIn, DEPTH } from '../ui/kit.js';
import { appliedSkin } from '../save.js';
import { totalStars, perfectTotal, recentBranch } from '../progress.js';
import { limits } from '../perf.js';
import { sfx, startMusic } from '../audio.js';

const P = THEME.palette;

export default class EndingScene extends Phaser.Scene {
  constructor() { super('Ending'); }

  create() {
    fadeIn(this);
    this.testHooks = {};
    new Backdrop(this, { zone: 5, clouds: [[30, 130, 110], [390, 160, 96]] });
    const D = DEPTH;
    panel(this, 30, 50, 480, 720).setDepth(D.objects);
    const top = D.hud;

    image(this, 'crown', 84, 270, 120).setDepth(top);
    headingText(this, 270, 206, t('ending.title'), { maxW: 420, minSize: 24 }).setDepth(top);

    // 꽃 다섯 송이와 뛰는 이슬
    [[96, 392, 66], [176, 410, 56], [364, 410, 56], [444, 392, 66]].forEach(([x, y, s], i) => {
      const im = this.add.image(x, y, 'flower_3_bloom').setOrigin(0.5, 1).setDisplaySize(s, s * 1.14).setDepth(top);
      this.tweens.add({ targets: im, angle: { from: -3, to: 3 }, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: i * 250 });
    });
    const box = THEME.dew.imageBoxPx.menu;
    this.dew = new DewRig(this, { x: 270, y: 262 + 0.89 * box, box, skin: appliedSkin(), depth: top });
    this.dew.setExpr('clear').startBreath().startBlink();
    this.time.addEvent({ delay: 1500, loop: true, callback: () => this.dew.hop(18, 420, 1) });

    chip(this, 270, 438, t('ending.stats', { s: totalStars(), max: CONFIG.stageCount * 3, p: perfectTotal(), total: CONFIG.stageCount }), { kind: 'gold', size: 22, maxW: 420 }).setDepth(top);
    text(this, 270, 540, t('ending.body'), { size: 22, wrap: 400, color: P.text, lineSpacing: 6 }).setDepth(top);
    // 안내: 계속 개발 중
    ribbon(this, 270, 664, t('ending.notice'), { kind: 'sky', size: 20, h: 64, maxW: 360 }).setDepth(top);

    // 꽃잎이 천천히 떨어진다 (입자 상한은 성능 단계를 따른다)
    const n = Math.max(6, Math.min(16, limits().particles));
    this.add.particles(0, 0, 'p_petal', { x: { min: 20, max: 520 }, y: -20, speedY: { min: 50, max: 90 }, speedX: { min: -25, max: 25 }, lifespan: 9000, rotate: { start: 0, end: 360 }, scale: { min: 0.8, max: 1.2 }, frequency: 9000 / n, quantity: 1, maxAliveParticles: n, advance: 4000 }).setDepth(D.hud - 1);

    const stages = button(this, { x: 270, y: 832, w: 360, h: 84, variant: 'primary', size: 26, label: t('ending.toStages'), onClick: () => go(this, 'StageSelect', { branch: recentBranch() }), depth: top });
    button(this, { x: 270, y: 912, w: 200, h: 62, variant: 'neutral', size: 20, label: t('ending.toMenu'), onClick: () => go(this, 'Menu'), depth: top });
    this.testHooks.stagesButton = stages;
    this.input.keyboard.on('keydown-ENTER', () => stages.trigger());
    this.input.keyboard.on('keydown-ESC', () => go(this, 'Menu'));
    sfx.clear();
    this.time.delayedCall(700, () => sfx.perfect());
    startMusic(this);
  }
}
