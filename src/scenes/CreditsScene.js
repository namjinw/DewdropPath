// S7 credits: assets/CREDITS.txt 의 제작자와 라이선스 목록을 보여 주고 메뉴로 돌아간다.
import { THEME } from '../theme.js';
import { t } from '../i18n/index.js';
import { Backdrop } from '../ui/bg.js';
import { panel, text, fadeIn, DEPTH } from '../ui/kit.js';
import { topBar } from '../ui/common.js';

export default class CreditsScene extends Phaser.Scene {
  constructor() { super('Credits'); }

  preload() {
    if (!this.cache.text.exists('credits')) this.load.text('credits', 'assets/CREDITS.txt');
  }

  create() {
    fadeIn(this);
    this.testHooks = {};
    new Backdrop(this, { zone: 1, clouds: [[380, 120, 100]] });
    const bar = topBar(this, { back: 'Menu', title: t('credits.title'), coins: false });
    this.testHooks.backButton = bar.back;
    panel(this, 40, 110, 460, 720).setDepth(DEPTH.objects);
    text(this, 70, 150, t('credits.body'), { size: 19, wrap: 400, origin: 0, originY: 0, align: 'left', color: THEME.palette.textDim }).setDepth(DEPTH.hud);
    const raw = this.cache.text.get('credits') || '';
    const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).filter((l) => !l.startsWith('#'));
    // 항목 사이는 빈 줄 대신 줄 간격으로 띄운다 (빈 줄을 쓰면 마지막 항목이 패널 밖으로 넘친다)
    const list = text(this, 70, 222, lines.join('\n'), { size: 15, wrap: 400, origin: 0, originY: 0, align: 'left', color: THEME.palette.text, lineSpacing: 8 }).setDepth(DEPTH.hud);
    text(this, 70, list.y + list.height + 20, t('credits.licenseNote'), { size: 15, wrap: 400, origin: 0, originY: 0, align: 'left', color: THEME.palette.textDim }).setDepth(DEPTH.hud);
    this.input.keyboard.on('keydown-ESC', () => bar.back.trigger());
  }
}
