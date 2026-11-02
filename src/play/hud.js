// S3 위쪽 HUD와 아래쪽 조작 (theme.layout.play). 모든 부품은 UI 키트(ui/kit.js)로 만든다.
import { THEME } from '../theme.js';
import { CONFIG } from '../config.js';
import { t } from '../i18n/index.js';
import { panel, text, image, button, roundButton, badge, coinPill, DEPTH, glow } from '../ui/kit.js';
import { getBalance, getHintCount, onWalletChange } from '../wallet.js';

const L = THEME.layout.play;
const P = THEME.palette;

export function buildHud(scene, o) {
  const D = DEPTH.hud;
  const h = {};
  const [px, py, ps] = L.pause;
  h.pause = roundButton(scene, { x: px + ps / 2, y: py + ps / 2, size: ps, variant: 'neutral', code: 'pause', onClick: o.onPause, depth: D });
  const [sx, sy, sw, sh] = L.stage;
  panel(scene, sx, sy, sw, sh, { flat: true, depth: D });
  h.stageText = text(scene, sx + sw / 2, sy + sh / 2 - 3, t('play.stage', { b: o.branch, n: o.local }), { size: 32, color: P.text, maxW: sw - 16 }).setDepth(D + 1);
  const [tx, ty, tw, th] = L.stars;
  h.starPanel = panel(scene, tx, ty, tw, th, { flat: true, depth: D });
  h.stars = [0, 1, 2].map((i) => image(scene, 'star_full', 40, tx + tw / 2 + (i - 1) * 44, ty + th / 2 - 3).setDepth(D + 1));
  h.starPanel.setSize(tw, th);
  h.starPanel.setInteractive();
  h.starPanel.on('pointerup', () => o.onStarTap && o.onStarTap());
  const [cx, cy, cw, ch] = L.coins;
  h.coins = coinPill(scene, cx, cy, cw, ch, getBalance()).setDepth(D);
  const off = onWalletChange(() => h.coins.setValue(getBalance()));
  scene.events.once('shutdown', off);
  const [mx, my, mw, mh] = L.moves;
  h.movesPanel = panel(scene, mx, my, mw, mh, { flat: true, depth: D });
  h.moves = text(scene, mx + mw / 2, my + mh / 2 - 3, '', { size: 26, color: P.text, maxW: mw - 20 }).setDepth(D + 1);
  const [fx, fy, fw, fh] = L.flowers;
  panel(scene, fx, fy, fw, fh, { flat: true, depth: D });
  h.flowerIcon = scene.add.image(0, fy + fh / 2 - 3, 'flower_0_bud').setDisplaySize(30, 34).setDepth(D + 1);
  h.flowers = text(scene, 0, fy + fh / 2 - 3, '', { size: 26, color: P.text, origin: 0 }).setDepth(D + 1);
  h.flowerBox = { x: fx, w: fw };
  h.setMoves = (k, goal) => { h.moves.setText(t('play.moves', { k, goal })); h.moves.setColor(k > goal ? P.danger : P.text); };
  h.setFlowers = (n) => {
    h.flowers.setText(t('play.flowersLeft', { n }));
    const total = 30 + 8 + h.flowers.width;
    h.flowerIcon.setX(h.flowerBox.x + h.flowerBox.w / 2 - total / 2 + 15);
    h.flowers.setX(h.flowerBox.x + h.flowerBox.w / 2 - total / 2 + 38);
  };
  h.setStars = (n, fade) => {
    h.stars.forEach((s, i) => { const full = i < n; s.setTexture(full ? 'star_full' : 'star_empty'); });
  };
  return h;
}

export function buildControls(scene, o) {
  const D = DEPTH.hud;
  const c = { dpad: {} };
  const d = L.dpad;
  const half = d.size / 2;
  const spec = [['up', d.up, -90, 0], ['left', d.left, 180, 3], ['right', d.right, 0, 1], ['down', d.down, 90, 2]];
  for (const [name, [x, y], rot, dir] of spec) {
    c.dpad[name] = roundButton(scene, { x: x + half, y: y + half, size: d.size, variant: 'secondary', glyph: 'ui-extra-icon-play-dark', glyphRot: rot, onClick: () => o.onMove(dir), sound: () => {}, depth: D });
    c.dpad[dir] = c.dpad[name];
  }
  const [ux, uy, uw, uh] = L.undo;
  c.undo = button(scene, { x: ux + uw / 2, y: uy + uh / 2, w: uw, h: uh, variant: 'neutral', size: 20, code: 'undo', iconSize: 32, col: true, label: t('play.undo', { n: `${o.undoLeft}/${CONFIG.undoPerStageCount}` }), onClick: o.onUndo, onDisabledClick: o.onUndoEmpty, depth: D });
  const [rx, ry, rw, rh] = L.restart;
  c.restart = button(scene, { x: rx + rw / 2, y: ry + rh / 2, w: rw, h: rh, variant: 'neutral', size: 20, glyph: 'ui-extra-icon-repeat-dark', iconSize: 32, col: true, label: t('play.restart'), onClick: o.onRestart, depth: D });
  const [hx, hy, hw, hh] = L.hint;
  c.hint = button(scene, { x: hx + hw / 2, y: hy + hh / 2, w: hw, h: hh, variant: 'secondary', shape: 'square', size: 24, icon: 'hint_bulb', iconSize: 68, col: true, label: t('play.hint'), onClick: o.onHint, depth: D });
  c.hint.icon.setPosition(0, -26); c.hint.label.setPosition(0, 32);
  c.hintGlow = scene.add.image(0, -26, 'glow64').setTint(0xFFF0A0).setBlendMode(Phaser.BlendModes.ADD).setScale(1.6).setAlpha(0.6);
  c.hint.addAt(c.hintGlow, 2);
  const [bx, by, bs] = L.hintBadge;
  c.hintBadge = badge(scene, bx + bs / 2 - 4, by + bs / 2 + 4, getHintCount(), bs).setDepth(D + 2);
  c.setUndo = (left) => {
    c.undo.setLabel(t('play.undo', { n: `${left}/${CONFIG.undoPerStageCount}` }));
    c.undo.setDisabled(left <= 0);
    c.undo.icon.setTexture(left <= 0 ? 'icon_undo_dim' : 'icon_undo');
  };
  c.setHints = (n, animate) => {
    c.hintBadge.setCount(n, animate, t('play.hintCount', { n }));
    c.hint.icon.setTint(n > 0 ? 0xffffff : hexGrey());
    if (n > 0) { c.hint.icon.clearTint(); c.hintGlow.setVisible(true); if (!c.hintGlowTween) c.hintGlowTween = scene.tweens.add({ targets: c.hintGlow, alpha: { from: 0.5, to: 1 }, duration: THEME.motionMs.hintBulbGlow, yoyo: true, repeat: -1, ease: THEME.easing.hintBulbGlow }); }
    else { c.hint.icon.setTint(hexGrey()); c.hintGlow.setVisible(false); if (c.hintGlowTween) { c.hintGlowTween.remove(); c.hintGlowTween = null; } }
  };
  c.setUndo(o.undoLeft);
  c.setHints(getHintCount(), false);
  const off = onWalletChange(() => c.setHints(getHintCount(), true));
  scene.events.once('shutdown', off);
  return c;
}
const hexGrey = () => parseInt(THEME.tint.hintEmpty.slice(1), 16);
