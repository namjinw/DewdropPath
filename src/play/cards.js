// 튜토리얼 설명 카드 (R22, R43): 격자 아래 영역(30,620,480x96)에 최대 6초. 입력을 막지 않는다. 요소 카드 9종과 숨은 상호작용 카드 12종.
import { THEME } from '../theme.js';
import { CONFIG } from '../config.js';
import { t } from '../i18n/index.js';
import { panel, text, image, button, timerBar, inkGlyph, DEPTH } from '../ui/kit.js';
import { sfx } from '../audio.js';
import { markSeen } from '../save.js';

const M = THEME.motionMs;
const L = THEME.layout.play.tutorialCard;
const ELEMENT_IMG = { ice: 'ice', dirt: 'dirt', arrow: 'arrow_leaf', petal: 'petal_portal', mushroom: 'mushroom', pot: 'pot', acorn: 'acorn', tree: 'tree', frog: 'frog' };
// 카드 종류 -> [앞 그림, 뒤 그림]
const DEMO = {
  ice: ['ice', 'puddle'], dirt: ['dirt', 'grass_a'], arrow: ['arrow_leaf', 'arrow_leaf'], petal: ['petal_portal', 'petal_portal'], mushroom: ['mushroom', 'rock'],
  tree: ['tree', 'rock'], pot: ['pot', 'pot'], frog: ['frog', 'frog'], acorn: ['acorn', 'acorn'], acornQueue: ['dew_body', 'acorn']
};

export class CardManager {
  constructor(scene) {
    this.scene = scene;
    this.queue = [];
    this.current = null;
    this.paused = false;
  }
  // card: { id(본 것으로 저장할 키), textKey, demo: [앞, 뒤], closeOnMove(요소 카드는 첫 이동으로 닫힌다) }
  enqueue(card) { this.queue.push(card); if (!this.current && !this.paused) this.next(); }
  next() {
    if (this.current || !this.queue.length) return;
    this.open(this.queue.shift());
  }
  open(card) {
    const sc = this.scene;
    const [x, y, w, h] = L;
    markSeen(card.id);
    sfx.card();
    const c = sc.add.container(x, y).setDepth(DEPTH.popup - 2);
    const bg = panel(sc, 0, 0, w, h, { flat: true });
    bg.setPosition(w / 2, h / 2);
    c.add(bg);
    const demo = card.demo || ['pot', 'pot'];
    const a = image(sc, demo[0], 52, 16 + 26, 18 + 26);
    const b = image(sc, demo[1], 52, 96 + 26, 18 + 26);
    const arrow = inkGlyph(sc, 'ui-extra-icon-play-dark', 18).setPosition(82, 44);
    c.add([a, b, arrow]);
    // 앞 -> 뒤 데모를 900ms + 600ms 로 반복
    b.setAlpha(0.25);
    c.demoTween = sc.tweens.add({ targets: b, alpha: { from: 0.25, to: 1 }, duration: M.cardDemo, hold: M.cardDemoGap, yoyo: true, repeat: -1, ease: THEME.easing.cardDemo });
    const tx = text(sc, 160, 14 + 29, t(card.textKey), { size: 22, color: THEME.palette.ink, wrap: 196, origin: 0, align: 'left', lineSpacing: 0 });
    while (tx.height > 60 && parseInt(tx.style.fontSize, 10) > 16) tx.setFontSize(parseInt(tx.style.fontSize, 10) - 1);
    c.add(tx);
    const skip = button(sc, { x: 362 + 52, y: 12 + 25, w: 104, h: 50, variant: 'neutral', size: 18, label: t('tutorial.skip'), onClick: () => this.close(c) });
    c.add(skip);
    const bar = timerBar(sc, 362, 70, 104);
    c.add(bar);
    c.bar = bar; c.card = card;
    c.setAlpha(0).setY(y + 24);
    sc.tweens.add({ targets: c, alpha: 1, y, duration: M.cardSlideIn, ease: THEME.easing.cardSlideIn });
    const t0 = sc.time.now;
    c.tick = sc.time.addEvent({ delay: 50, loop: true, callback: () => { const r = 1 - (sc.time.now - t0) / (CONFIG.tutorialCardMaxSec * 1000); bar.setRatio(r); if (r <= 0) this.close(c); } });
    // 카드 탭으로도 닫는다
    bg.setSize(w, h); bg.setInteractive(); bg.on('pointerup', () => this.close(c));
    this.current = c;
  }
  close(c) {
    if (!c || c.closing) return;
    c.closing = true;
    if (c.tick) c.tick.remove();
    if (c.demoTween) c.demoTween.remove();
    const sc = this.scene;
    sc.tweens.add({ targets: c, alpha: 0, y: c.y + 24, duration: M.cardSlideOut, ease: THEME.easing.cardSlideOut, onComplete: () => { c.destroy(); if (this.current === c) this.current = null; this.next(); } });
  }
  // 첫 이동: 요소 카드는 닫힌다. 발견 모드 카드는 이동으로 닫히지 않는다 (R43)
  onMove() { if (this.current && this.current.card.closeOnMove) this.close(this.current); }
  closeAll() { this.queue = []; if (this.current) this.close(this.current); }
  setPaused(p) { this.paused = p; if (this.current) { this.current.setVisible(!p); if (this.current.tick) this.current.tick.paused = p; } if (!p) this.next(); }
}
export { DEMO, ELEMENT_IMG };
