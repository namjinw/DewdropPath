// S8 shop (R20, R21, R38, R39, F23, F24, F42): 탭 4개(힌트, 정원, 테마, 스킨). 코인은 별과 클리어로만 얻는다(결제 없음).
// 정원 품목 이미지는 이 화면에 처음 들어올 때 나눠 불러온다(첫 로딩 목표 유지).
import { THEME } from '../theme.js';
import { CONFIG } from '../config.js';
import { t } from '../i18n/index.js';
import { Backdrop } from '../ui/bg.js';
import { DewRig } from '../ui/dew.js';
import { ClipView } from '../ui/clipview.js';
import { button, panel, text, image, chip, toast, badge, coinPop, go, fadeIn, DEPTH, nudge, hex } from '../ui/kit.js';
import { topBar } from '../ui/common.js';
import { ITEM_LIST, ITEMS, THEMES, SKINS, SKIN_BY_ID, THEME_BY_ID, isBuilding, itemTexture } from '../catalog.js';
import { ensureImages, sceneAlive, itemImages } from '../assets.js';
import { bakeGardenTexture, bake, ART_SCALE } from '../art.js';
import * as save from '../save.js';
import * as wallet from '../wallet.js';
import { isBranchUnlocked } from '../progress.js';
import { sfx } from '../audio.js';

const L = THEME.layout.shop;
const M = THEME.motionMs;
const P = THEME.palette;
const TABS = ['shop.tabHint', 'shop.tabGarden', 'shop.tabTheme', 'shop.tabSkin'];

export default class ShopScene extends Phaser.Scene {
  constructor() { super('Shop'); }

  init(data) {
    this.from = (data && data.from) || 'Menu';
    this.fromBranch = (data && data.branch) || undefined;
    this.tab = data && data.tab !== undefined ? data.tab : (this.from === 'Garden' ? 1 : 0);
  }

  create() {
    fadeIn(this);
    this.testHooks = {};
    new Backdrop(this, { zone: 1 });
    this.bar = topBar(this, { back: () => this.goBack(), title: t('shop.title') });
    this.tabs = TABS.map((k, i) => button(this, {
      x: L.tabs.x + i * L.tabs.step + L.tabs.w / 2, y: L.tabs.y + L.tabs.h / 2, w: L.tabs.w, h: L.tabs.h, variant: i === this.tab ? 'secondary' : 'neutral', size: 18, label: t(k),
      onClick: () => { if (i !== this.tab) go(this, 'Shop', { from: this.from, branch: this.fromBranch, tab: i }); }, depth: DEPTH.hud
    }));
    this.content = [];
    if (this.tab === 0) this.buildHintTab();
    else this.buildGridTab();
    this.input.keyboard.on('keydown-ESC', () => this.goBack());
  }

  goBack() {
    if (this.from === 'StageSelect' || this.from === 'Result') go(this, 'StageSelect', { branch: this.fromBranch || 1 });
    else if (this.from === 'Garden') go(this, 'Garden', {});
    else go(this, 'Menu');
  }

  // ---- 힌트 탭 ----
  buildHintTab() {
    const D = DEPTH.objects;
    const [px, py, pw, ph] = L.hintCard;
    panel(this, px, py, pw, ph).setDepth(D);
    const glow = this.add.image(270, 276, 'glow64').setTint(0xFFF6B0).setBlendMode(Phaser.BlendModes.ADD).setScale(3.4).setAlpha(0.85).setDepth(D + 1);
    this.tweens.add({ targets: glow, alpha: { from: 0.6, to: 1 }, duration: M.hintBulbGlow, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.bulb = image(this, 'hint_bulb', 140, 270, 270).setDepth(D + 2);
    this.hintOwned = text(this, 270, 372, '', { size: 30, color: P.text }).setDepth(D + 2);
    chip(this, 270, 424, t('shop.price', { n: CONFIG.hintPriceCoinCount }), { kind: 'gold', size: 22, icon: 'coin', iconSize: 28, h: 44 }).setDepth(D + 2);
    this.buyBtn = button(this, { x: 270, y: 514, w: 360, h: 96, variant: 'primary', size: 30, label: t('shop.buyHint'), icon: 'hint_bulb', iconSize: 40, onClick: () => this.buyHint(), onDisabledClick: () => { sfx.coinShort(); toast(this, wallet.isHintStockFull() ? t('shop.maxOwned') : t('shop.notEnough'), { kind: 'warn', y: 640 }); }, depth: D + 2 });
    this.status = text(this, 270, 578, '', { size: 20, color: P.dangerText, maxW: 460 }).setDepth(D + 2);
    const [ex, ey, ew, eh] = L.earnCard;
    panel(this, ex, ey, ew, eh).setDepth(D);
    image(this, 'star_full', 40, 215, ey + 56).setDepth(D + 2);
    this.add.image(270, ey + 56, 'ui-extra-icon-play-dark').setDisplaySize(18, 20).setTint(hex(THEME.tint.inkFill.color)).setTintMode(Phaser.TintModes.FILL).setDepth(D + 2);
    image(this, 'coin', 40, 325, ey + 56).setDepth(D + 2);
    text(this, 270, ey + 108, t('shop.earnHelp'), { size: 20, color: P.text, maxW: 440 }).setDepth(D + 2);
    this.refreshHint();
    const off = wallet.onWalletChange(() => this.refreshHint());
    this.events.once('shutdown', off);
  }

  refreshHint() {
    this.hintOwned.setText(t('shop.hintOwned', { n: wallet.getHintCount() }));
    const can = wallet.canBuyHint();
    this.buyBtn.setDisabled(!can);
    this.status.setText(wallet.isHintStockFull() ? t('shop.maxOwned') : wallet.getBalance() < CONFIG.hintPriceCoinCount ? t('shop.notEnough') : '');
  }

  buyHint() {
    if (!wallet.buyHint()) return;
    sfx.buySuccess();
    const from = this.bulb;
    const fly = image(this, 'hint_bulb', 60, 270, 514).setDepth(DEPTH.popup);
    this.tweens.add({ targets: fly, x: 270, y: 300, scale: fly.scaleX * 0.5, alpha: 0.2, duration: M.buyFly, ease: THEME.easing.buyFly, onComplete: () => fly.destroy() });
    this.tweens.add({ targets: this.hintOwned, scale: { from: 1.25, to: 1 }, duration: M.buyCountPop, ease: THEME.easing.buyCountPop });
    coinPop(this, 470, 100, `-${CONFIG.hintPriceCoinCount}`);
    toast(this, t('shop.hintBought'), { kind: 'normal', y: 640 });
  }

  // ---- 정원 / 테마 / 스킨 탭: 카드 목록 ----
  buildGridTab() {
    this.view = new ClipView(this, { x: 0, y: 172, w: 540, h: 788, axis: 'y' });
    this.cardLayer = this.add.container(0, 0);
    this.view.add(this.cardLayer);
    if (this.tab === 1) {
      const keys = ITEM_LIST.filter((i) => i.source === 'shop').flatMap((i) => itemImages(i.id));
      const loading = text(this, 270, 480, t('common.loading'), { size: 24, color: P.textDim }).setDepth(DEPTH.hud);
      ensureImages(this, keys, () => { loading.destroy(); if (sceneAlive(this)) this.buildCards(); });
    } else this.buildCards();
    this.view.enableDrag(232);
  }

  cards() {
    if (this.tab === 1) return ITEM_LIST.filter((i) => i.source === 'shop').map((i) => ({ kind: 'item', id: i.id, branch: i.branch }));
    if (this.tab === 2) return THEMES.map((th) => ({ kind: 'theme', id: th.id, branch: th.branch }));
    return SKINS.map((s) => ({ kind: 'skin', id: s.id, branch: s.branch, source: s.source }));
  }

  buildCards() {
    this.cardLayer.removeAll(true);
    const list = this.cards();
    list.forEach((c, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = L.itemGrid[col][0];
      const y = 180 + row * 232;
      this.cardLayer.add(this.makeCard(c, x, y));
    });
    const rows = Math.ceil(list.length / 2);
    this.view.setContentSize(180 - 172 + rows * 232 + 40);
  }

  makeCard(c, x, y) {
    const sc = this;
    const cont = this.add.container(x, y);
    cont.add(panel(this, 0, 0, 232, 220, { flat: true }));
    const lockedBranch = c.branch > 0 && !isBranchUnlocked(c.branch);
    const art = this.add.container(116, 68);
    cont.add(art);
    let nameKey;
    let foot;
    let ownedTag = 0;
    if (c.kind === 'item') {
      const it = ITEMS[c.id];
      nameKey = it.nameKey;
      this.itemArt(art, it);
      const owned = wallet.ownedCount(c.id);
      ownedTag = owned > 0 && !isBuilding(c.id) ? owned : 0;
      foot = lockedBranch ? { type: 'locked' } : isBuilding(c.id) && owned >= 1 ? { type: 'owned', n: owned } : !isBuilding(c.id) && owned >= CONFIG.gardenItemMaxStackCount ? { type: 'max' } : { type: 'buy', price: it.price, ok: wallet.getBalance() >= it.price, act: () => this.doBuy(() => wallet.buyItem(c.id), it.price) };
    } else if (c.kind === 'theme') {
      const th = THEME_BY_ID[c.id];
      nameKey = th.nameKey;
      this.themeArt(art, c.id);
      const owned = save.ownsTheme(c.id);
      foot = lockedBranch ? { type: 'locked' } : !owned ? { type: 'buy', price: th.price, ok: wallet.getBalance() >= th.price, act: () => this.doBuy(() => wallet.buyTheme(c.id), th.price) } : save.appliedTheme() === c.id ? { type: 'applied' } : { type: 'apply', act: () => { save.applyTheme(c.id); sfx.applyStyle(); this.scene.restart({ from: this.from, branch: this.fromBranch, tab: this.tab }); } };
    } else {
      const sk = SKIN_BY_ID[c.id];
      nameKey = sk.nameKey;
      this.skinArt(art, sk);
      const owned = save.ownsSkin(c.id);
      foot = sk.source === 'pass' && !owned ? { type: 'pass' } : lockedBranch && !owned ? { type: 'locked' } : !owned ? { type: 'buy', price: sk.price, ok: wallet.getBalance() >= sk.price, act: () => this.doBuy(() => wallet.buySkin(c.id), sk.price) } : save.appliedSkin() === c.id ? { type: 'applied' } : { type: 'apply', act: () => { save.applySkin(c.id); sfx.applyStyle(); this.scene.restart({ from: this.from, branch: this.fromBranch, tab: this.tab }); } };
    }
    if (foot.type === 'locked') art.setAlpha(0.55);
    cont.add(text(this, 116, 136, t(nameKey), { size: 20, color: P.ink, maxW: 216, minSize: 14 }));
    if (ownedTag) cont.add(text(this, 220, 14, t('shop.owned', { n: ownedTag }), { size: 16, color: P.textDim, origin: 1, originY: 0.5 }));
    const fy = 180;
    if (foot.type === 'buy') {
      cont.add(button(this, { x: 116, y: fy, w: 164, h: 54, variant: 'primary', size: 18, label: `${t('shop.buyItem')} ${foot.price}`, icon: 'coin', iconSize: 24, disabled: !foot.ok, onClick: foot.act, onDisabledClick: () => { sfx.coinShort(); toast(this, t('shop.notEnough'), { kind: 'warn', y: 640 }); } }));
    } else if (foot.type === 'owned') {
      cont.add(text(this, 116, fy, t('shop.owned', { n: foot.n }), { size: 18, color: P.textDim }));
      cont.add(image(this, 'ui-blue-icon-checkmark@pastel', 24, 44, fy));
    } else if (foot.type === 'max') {
      cont.add(text(this, 116, fy, t('shop.stackMax'), { size: 16, color: P.dangerText, wrap: 210, maxW: 214, minSize: 12 }));
    } else if (foot.type === 'locked') {
      cont.add(image(this, 'lock', 24, 36, fy));
      cont.add(text(this, 124, fy, t('shop.unlockByBranch', { b: c.branch }), { size: 17, color: P.textDim, maxW: 170, minSize: 12 }));
    } else if (foot.type === 'pass') {
      cont.add(text(this, 116, fy, t('shop.passOnly'), { size: 17, color: P.textDim }));
    } else if (foot.type === 'apply') {
      cont.add(button(this, { x: 116, y: fy, w: 144, h: 54, variant: 'secondary', size: 18, label: t('shop.apply'), onClick: foot.act }));
    } else if (foot.type === 'applied') {
      cont.add(chip(this, 116, fy, t('shop.applied'), { kind: 'mint', size: 18, icon: 'ui-blue-icon-checkmark@pastel', iconSize: 22, h: 42 }));
    }
    return cont;
  }

  doBuy(fn, price) {
    if (!fn()) { sfx.coinShort(); return; }
    sfx.buySuccess();
    coinPop(this, 470, 100, `-${price}`);
    toast(this, t('shop.bought'), { kind: 'normal', y: 160 });
    const keep = this.view ? this.view.scroll : 0;
    this.buildCards();
    this.view.setScroll(keep);
  }

  // 정원 품목 그림: 바닥은 floorLime, 건물/장식은 objectDay 굽기
  itemArt(art, it) {
    const key = itemTexture(it.id);
    if (!this.textures.exists(key)) return;
    const baked = bakeGardenTexture(this, key, it.kind === 'ground' ? 'floor' : 'day');
    const im = this.add.image(0, 0, baked);
    im.setScale(118 / Math.max(im.width, im.height));
    art.add(im);
  }

  // 테마 미리보기 180x100: 하늘 그라데이션 + 칸 2개 + 개화 꽃 + 입자
  themeArt(art, id) {
    const key = `theme_prev_${id}`;
    const th = THEME.themes[id];
    if (!this.textures.exists(key)) {
      const z = THEME.zones[1];
      const sky = Array.isArray(th.sky) ? th.sky : z.sky;
      const grass = this.textures.get('grass_a@pastel').getSourceImage();
      const flower = this.textures.get('flower_3_bloom').getSourceImage();
      const fx = { theme_blossom: 'fx_blossom', theme_starnight: 'fx_star_twinkle', theme_snowflake: 'fx_snow', theme_candy: 'fx_sprinkle0', theme_rainbowcloud: 'fx_cloud_puff', theme_default: 'fx_dew_mote' }[id];
      bake(this, key, 180, 100, (ctx) => {
        ctx.save();
        ctx.beginPath(); ctx.roundRect ? ctx.roundRect(0, 0, 180, 100, 14) : ctx.rect(0, 0, 180, 100); ctx.clip();
        const g = ctx.createLinearGradient(0, 0, 0, 100); g.addColorStop(0, sky[0]); g.addColorStop(0.55, sky[1]); g.addColorStop(1, sky[2] || sky[1]);
        ctx.fillStyle = g; ctx.fillRect(0, 0, 180, 100);
        ctx.drawImage(grass, 20, 54, 70, 46); ctx.drawImage(grass, 90, 54, 70, 46);
        ctx.fillStyle = id === 'theme_default' ? 'rgba(255,255,255,0)' : 'rgba(255,255,255,.0)';
        ctx.drawImage(flower, 76, 16, 44, 54);
        const src = this.textures.get(fx).getSourceImage();
        [[22, 14], [140, 26], [100, 8], [58, 36]].forEach(([x, y]) => ctx.drawImage(src, x, y, 14, 14));
        ctx.restore();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(1.5, 1.5, 177, 97, 13) : ctx.rect(1.5, 1.5, 177, 97); ctx.stroke();
      });
    }
    art.add(this.add.image(0, 4, key).setScale(1 / ART_SCALE).setScale(1 / ART_SCALE));
  }

  // 스킨 미리보기: 이슬 캐릭터 100px (머리 장식 또는 색조)
  skinArt(art, sk) {
    const rig = new DewRig(this, { x: 0, y: 40, box: THEME.dew.imageBoxPx.shopCard, skin: sk.id, shadow: true });
    rig.setExpr('smile').startBreath();
    art.add(rig.root);
  }
}
