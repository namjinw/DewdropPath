// 광고 호출 모듈 (R15). 광고는 캔버스 바깥(#ad-slot)에만 두고, 결과 화면에서만 보인다. 플레이 중에는 보이지 않고 전면 광고는 쓰지 않는다.
// 결과 화면에 들어갈 때만 #ad-slot 이 공간을 차지하고(캔버스는 그 위에 맞춰 줄어든다), 나가면 다시 숨겨 캔버스가 화면을 채운다.
// 실제 광고(Google AdSense)는 ADS 를 채우면 켜진다. 비어 있으면 광고도 빈 자리도 만들지 않는다(자리표시자는 테스트 모드에서만 보인다).
import { TEST } from './config.js';

// 사람이 AdSense 승인 뒤에 채운다. client: 'ca-pub-숫자', slot: 광고 단위 숫자 id. 형식이 맞지 않으면 광고를 켜지 않는다.
export const ADS = { client: '', slot: '' };
// 같은 방문에서 광고 요청 사이 최소 간격. 결과 화면을 자주 열어도 자동 새로고침처럼 광고를 계속 요청하지 않는다.
const MIN_REQUEST_GAP_MS = 60000;
const SCRIPT_BASE = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';

const slot = () => document.querySelector('#ad-slot[data-slot="bottom"]');
const configured = () => /^ca-pub-\d{10,20}$/.test(ADS.client) && /^\d{6,20}$/.test(ADS.slot);

let script = 'idle'; // idle | loading | ready | failed (차단기 등으로 못 불러오면 failed 이고 자리도 숨긴다)
let lastRequestAt = 0;
let game = null;

// 광고 영역이 보이거나 사라지면 캔버스를 남은 공간에 다시 맞춘다 (FIT)
function refresh(g) {
  const go = () => { try { if (g && g.scale) g.scale.refresh(); window.dispatchEvent(new Event('resize')); } catch (e) { /* 무시 */ } };
  go();
  setTimeout(go, 60);
  setTimeout(go, 300);
}

function loadScript() {
  if (script !== 'idle') return;
  script = 'loading';
  try {
    const s = document.createElement('script');
    s.async = true;
    s.crossOrigin = 'anonymous';
    s.src = `${SCRIPT_BASE}?client=${ADS.client}`;
    s.onload = () => { script = 'ready'; };
    s.onerror = () => { script = 'failed'; hideAd(game); };
    document.head.appendChild(s);
  } catch (e) { script = 'failed'; }
}

// 광고 칸 안에 광고 단위를 새로 만들고 요청한다 (이미 채워진 단위에 다시 요청하면 오류가 난다)
function request(el) {
  const now = Date.now();
  if (el.querySelector('ins.adsbygoogle') && now - lastRequestAt < MIN_REQUEST_GAP_MS) return;
  try {
    const ins = document.createElement('ins');
    ins.className = 'adsbygoogle';
    ins.style.cssText = 'display:inline-block;width:320px;height:50px';
    ins.setAttribute('data-ad-client', ADS.client);
    ins.setAttribute('data-ad-slot', ADS.slot);
    const box = el.querySelector('.ad-box');
    box.classList.add('live');
    box.textContent = '';
    box.appendChild(ins);
    (window.adsbygoogle = window.adsbygoogle || []).push({});
    lastRequestAt = now;
  } catch (e) { /* 광고 실패로 게임이 멈추지 않는다 */ }
}

export function showAd(g) {
  game = g || game;
  const el = slot();
  if (!el) return;
  if (!TEST) {
    if (!configured() || script === 'failed') return;
    loadScript();
    request(el);
  }
  el.dataset.shown = String(Date.now());
  el.style.display = 'flex';
  refresh(game);
}

export function hideAd(g) {
  game = g || game;
  const el = slot();
  if (el && el.style.display !== 'none') { el.style.display = 'none'; refresh(game); }
}

// 결과 화면이 열릴 때 호출한다.
export function onRoundEnd(g) {
  showAd(g);
}
