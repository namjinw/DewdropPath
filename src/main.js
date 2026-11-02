import { CONFIG, TEST } from './config.js';
import { setFilters } from './ui/kit.js';
import { initAudio, setPaused } from './audio.js';
import { monitor } from './perf.js';
import { flushNow } from './save.js';
import BootScene from './scenes/BootScene.js';
import MenuScene from './scenes/MenuScene.js';
import StageSelectScene from './scenes/StageSelectScene.js';
import PlayScene from './scenes/PlayScene.js';
import ResultScene from './scenes/ResultScene.js';
import SettingsScene from './scenes/SettingsScene.js';
import GardenScene from './scenes/GardenScene.js';
import CreditsScene from './scenes/CreditsScene.js';
import ShopScene from './scenes/ShopScene.js';
import PassScene from './scenes/PassScene.js';
import EndingScene from './scenes/EndingScene.js';

// 글꼴(Jua 서브셋)을 먼저 기다린다. 실패하거나 늦으면 시스템 글꼴로 대체하고 그대로 시작한다.
async function loadFont() {
  try {
    await Promise.race([
      document.fonts.load('26px Jua', '가A1'),
      new Promise((r) => setTimeout(r, 1500))
    ]);
  } catch (e) { /* 시스템 글꼴 사용 */ }
}

await loadFont();

const game = new Phaser.Game({
  type: Phaser.AUTO,
  backgroundColor: '#CDEBC5',
  banner: false,
  scale: {
    parent: 'game',
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: CONFIG.width,
    height: CONFIG.height
  },
  input: { activePointers: 2 },
  // 프레임이 느린 기기에서도 게임 시간이 실제 시간과 같이 흐르게 델타 평활화를 끈다 (연출 시간과 입력 잠금이 어긋나지 않게)
  fps: { smoothStep: false },
  // 배치당 텍스처 1개: 여러 텍스처를 한 배치에 묶을 때 회전한 오브젝트가 일부 잘려 보이는 렌더링 문제를 피한다.
  render: { maxTextures: 1 },
  scene: [BootScene, MenuScene, StageSelectScene, PlayScene, ResultScene, SettingsScene, GardenScene, CreditsScene, ShopScene, PassScene, EndingScene]
});

initAudio(game);
// WebGL 이 아니면 필터(그림자, 글로우)를 쓰지 않는다.
game.events.once('ready', () => { if (game.renderer.type !== Phaser.WEBGL) setFilters(false); monitor(game); });
// 탭이 가려지면 소리를 멈추고 즉시 저장한다. 돌아오면 이어서 튼다.
document.addEventListener('visibilitychange', () => { setPaused(document.hidden); if (document.hidden) flushNow(); });

if (TEST) window.__game = game; // 자동 점검용 (?test=1 일 때만 노출)
