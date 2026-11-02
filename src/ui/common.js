// 여러 화면이 같이 쓰는 위쪽 막대: 뒤로 버튼, 제목, 코인 알약 (theme.layout.topBar)
import { THEME } from '../theme.js';
import { button, headingText, coinPill, go } from './kit.js';
import { getBalance, onWalletChange } from '../wallet.js';
import { t } from '../i18n/index.js';

const TB = THEME.layout.topBar;

// o: back(돌아갈 씬 키 또는 함수), backData, title(문자열), coins(true 면 코인 알약)
export function topBar(scene, o = {}) {
  const out = {};
  if (o.back !== undefined) {
    const [bx, by, bw, bh] = TB.back;
    out.back = button(scene, {
      x: bx + bw / 2, y: by + bh / 2, w: bw, h: bh, variant: 'neutral', label: t('common.back'), code: 'back', iconSize: 26,
      onClick: () => { if (typeof o.back === 'function') o.back(); else go(scene, o.back, o.backData); }, depth: THEME.depth.hud
    });
    scene.__backButton = out.back;
  }
  if (o.title) out.title = headingText(scene, 270, 52, o.title, { size: 36, maxW: 240, minSize: 24 }).setDepth(THEME.depth.hud);
  if (o.coins !== false) {
    const [cx, cy, cw, ch] = TB.coins;
    out.coins = coinPill(scene, cx, cy, cw, ch, getBalance()).setDepth(THEME.depth.hud);
    const off = onWalletChange(() => out.coins.setValue(getBalance()));
    scene.events.once('shutdown', off);
  }
  return out;
}
