// S5 settings: 효과음, 음악, 언어, 기록 삭제(확인 팝업), 저장 불가 안내, 뒤로.
import { THEME } from '../theme.js';
import { t, toggleLang } from '../i18n/index.js';
import { Backdrop } from '../ui/bg.js';
import { button, panel, text, popup, toast, chip, go, fadeIn, DEPTH, nudge } from '../ui/kit.js';
import { topBar } from '../ui/common.js';
import { isSfxOn, isMusicOn, setSfxOn, setMusicOn, resetProgress, isSaveAvailable } from '../save.js';
import { syncMusic, sfx } from '../audio.js';

export default class SettingsScene extends Phaser.Scene {
  constructor() { super('Settings'); }

  create() {
    fadeIn(this);
    this.testHooks = {};
    new Backdrop(this, { zone: 1, clouds: [[30, 120, 100], [400, 860, 96]] });
    topBar(this, { back: 'Menu', title: t('menu.settings'), coins: false });
    panel(this, 40, 130, 460, 500).setDepth(DEPTH.objects);
    const D = DEPTH.hud;
    const toggle = (y, key, iconName, getter, setter, after) => {
      const mk = () => {
        const on = getter();
        const b = button(this, {
          x: 270, y, w: 400, h: 84, variant: on ? 'primary' : 'neutral', label: t(key), code: iconName, iconSize: 34, align: 'left',
          rightIcon: on ? 'ui-blue-icon-checkmark@pastel' : 'ui-grey-icon-cross', rightSize: on ? 34 : 28, depth: D,
          onClick: () => { setter(!getter()); if (after) after(); b.destroy(); mk(); }
        });
        return b;
      };
      return mk();
    };
    toggle(196, 'settings.sfx', 'sfx', isSfxOn, setSfxOn, () => { sfx.click(); });
    toggle(286, 'settings.music', 'music', isMusicOn, setMusicOn, () => syncMusic(this));
    button(this, { x: 270, y: 376, w: 400, h: 84, variant: 'secondary', label: t('settings.language'), code: 'globe', iconSize: 34, depth: D, onClick: () => { toggleLang(); this.scene.restart(); } });
    button(this, { x: 270, y: 466, w: 400, h: 84, variant: 'secondary', label: t('settings.privacy'), code: 'book', iconSize: 34, align: 'left', depth: D, onClick: () => this.openPrivacy() });
    button(this, { x: 270, y: 556, w: 400, h: 84, variant: 'danger', label: t('settings.reset'), code: 'trash', iconSize: 32, depth: D, onClick: () => this.confirmReset() });
    if (!isSaveAvailable()) chip(this, 270, 668, t('common.saveUnavailable'), { kind: 'rose', size: 18, maxW: 460, h: 44 }).setDepth(D);
    this.input.keyboard.on('keydown-ESC', () => this.__backButton && this.__backButton.trigger());
  }

  // 새 탭으로 연다 (진행은 이미 저장되어 있다). noopener 로 열면 window.open 은 항상 null 을 돌려주므로 링크 클릭으로 연다
  openPrivacy() {
    try {
      const a = document.createElement('a');
      a.href = 'privacy.html';
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) { /* 무시 */ }
  }

  confirmReset() {
    const pop = popup(this, 440, 330, { y: 465 });
    const D = DEPTH.popup;
    pop.add(text(this, 270, 345, t('settings.reset'), { size: 30, color: THEME.palette.text }));
    pop.add(text(this, 270, 440, t('settings.resetConfirm'), { size: 20, wrap: 368, color: THEME.palette.text, lineSpacing: 6 }));
    pop.add(button(this, { x: 170, y: 558, w: 180, h: 76, variant: 'danger', label: t('settings.resetYes'), code: 'trash', iconSize: 28, size: 20, depth: D + 2, onClick: () => { pop.close(); resetProgress(); toast(this, t('settings.resetDone'), { y: 160, kind: 'info' }); this.time.delayedCall(900, () => this.scene.restart()); } }));
    pop.add(button(this, { x: 370, y: 558, w: 180, h: 76, variant: 'secondary', label: t('settings.resetNo'), size: 20, depth: D + 2, onClick: () => pop.close() }));
  }
}
