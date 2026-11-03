// 부팅: 필요한 이미지와 소리를 불러오고, 코드 아트(pastelize 굽기, 아이콘, 입자, 알약)를 구운 뒤 메뉴로 간다. 첫 로딩은 판 위 요소와 UI 만 쓴다.
import { THEME } from '../theme.js';
import { CORE_AI, UI_FILES, AI_DIR, UI_DIR } from '../assets.js';
import { SFX_FILES } from '../audio.js';
import { TEST_START, TEST_ARGS } from '../config.js';
import { bakeUi, bakeIcons, bakeParticles, bakePills } from '../art.js';

export default class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload() {
    const W = THEME.layout.baseWidthPx;
    const H = THEME.layout.baseHeightPx;
    this.cameras.main.setBackgroundColor(THEME.palette.bg);
    this.add.rectangle(W / 2, H * 0.55, 300, 14, 0x3B5B4A, 0.2);
    const bar = this.add.rectangle(W / 2 - 150, H * 0.55, 2, 14, 0x73D6AD).setOrigin(0, 0.5);
    this.load.on('progress', (p) => { bar.width = Math.max(2, 300 * p); });
    this.load.on('loaderror', (f) => { console.warn(`load failed: ${f.key}`); });
    for (const k of CORE_AI) this.load.image(k, `${AI_DIR}/${k}.webp`);
    for (const k of UI_FILES) this.load.image(k, `${UI_DIR}/${k}.png`);
    for (const k of SFX_FILES) this.load.audio(k, `assets/audio/sfx/${k}.ogg`);
  }

  create() {
    bakeUi(this);
    bakeIcons(this);
    bakeParticles(this);
    bakePills(this);
    if (window.__dewGuard) window.__dewGuard.ready(); // 여기까지 오면 시작에 성공한 것이다: 시작 실패 안내(src/guard.js)를 끈다
    this.scene.start(TEST_START || 'Menu', TEST_START ? TEST_ARGS : undefined);
  }
}
