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
    // 목록 글자는 16px 에서 시작해, 안내 문구까지 패널(아래쪽 여백 24px) 안에 들어올 때까지 14px 까지 줄인다
    // (목록이 길어져도 패널 밖으로 넘치지 않는다. 14 는 theme.fontSizesPx.min)
    const list = text(this, 70, 222, lines.join('\n'), { size: 16, wrap: 400, origin: 0, originY: 0, align: 'left', color: THEME.palette.text, lineSpacing: 8 }).setDepth(DEPTH.hud);
    const note = text(this, 70, 0, t('credits.licenseNote'), { size: 16, wrap: 400, origin: 0, originY: 0, align: 'left', color: THEME.palette.textDim }).setDepth(DEPTH.hud);
    const limit = 110 + 720 - 24;
    let size = 16;
    for (;;) {
      note.setY(list.y + list.height + 20);
      if (note.y + note.height <= limit || size <= THEME.fontSizesPx.min) break;
      size -= 1;
      list.setFontSize(size);
      note.setFontSize(size);
    }
    // 안내 문구를 누르면 제3자 고지 전문을 새 탭으로 연다 (설정 화면의 개인정보 버튼과 같은 방식. 글자 크기가 정해진 뒤에 누르는 영역을 만든다)
    note.setInteractive({ useHandCursor: true });
    note.on('pointerup', () => {
      try {
        const a = document.createElement('a');
        a.href = 'THIRD-PARTY-NOTICES.txt';
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        a.remove();
      } catch (e) { /* 무시 */ }
    });
    this.input.keyboard.on('keydown-ESC', () => bar.back.trigger());
  }
}
