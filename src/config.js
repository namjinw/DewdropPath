// 밸런스/표시 값은 여기에 모은다. plan.json(version 7)의 config 값을 그대로 옮긴 것이다. 피드백 때 숫자만 바꾼다.
// tools/gen-config.mjs 가 만든다 (직접 고치지 않는다). import 문이 없는 단순 모듈로 유지한다. (runner/validate-game.mjs 가 Node 에서 읽는다)
const params = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');
// 테스트 모드는 로컬 주소(localhost, 127.0.0.1)에서만 켜진다. 운영 주소에서는 ?test=1 을 붙여도 무시한다.
const isLocalHost = typeof location !== 'undefined' && (location.hostname === 'localhost' || location.hostname === '127.0.0.1');

// 테스트 모드(?test=1): 자동 점검/캡처 도구가 쓰는 디버그 훅(window.__game, ?stage=N, ?hour=H, ?duration=N, debugTargets)을 켠다.
// 일반 접속(운영 주소 포함)에서는 모두 꺼져 있다. 이 게임은 랭킹/서버가 없어 점수 제출은 원래 없다.
export const TEST = isLocalHost && params.has('test');

// 테스트 모드에서만 ?test=1&seed=S 로 난수 시드를 고정한다. (연출 파티클/주민 난수. 스테이지는 고정 설계라 판 자체는 항상 같다)
export const SEED = TEST ? params.get('seed') : null;

// 테스트 모드에서만 ?test=1&stage=B-N(예: 3-12) 또는 숫자 id(1~170)로 "플레이"가 시작하는 스테이지를 지정한다. (리뷰·캡처용, 잠금 무시)
// stage 가 없고 seed 가 숫자면 seed 로 스테이지를 고른다(1~170). 같은 seed 는 같은 스테이지를 만든다. (runner/playtest.mjs --seeds)
const seedNum = Number(SEED);
const stageParam = TEST ? params.get('stage') : null;
function parseStageParam() {
  if (!stageParam) return 0;
  const m = /^(\d)-(\d{1,2})$/.exec(stageParam);
  if (m) return (Number(m[1]) - 1) * 34 + Number(m[2]);
  return Math.max(0, Math.min(170, Number(stageParam) || 0));
}
export const TEST_STAGE = TEST ? (parseStageParam() || (Number.isFinite(seedNum) && seedNum > 0 ? ((Math.floor(seedNum) - 1) % 170) + 1 : 0)) : 0;

// 테스트 모드에서만 ?test=1&duration=N 으로 한 판을 N초 뒤 강제로 끝낸다. (퍼즐에는 제한 시간이 없어서, 아무 입력이 없는 자동 점검이 결과 화면에 닿게 하는 용도)
export const TEST_DURATION = TEST ? (Number(params.get('duration')) || 0) : 0;

// 테스트 모드에서만 ?test=1&start=<씬 키>[&branch=N&tab=N&from=<씬 키>] 로 그 화면에서 바로 시작한다. (리뷰·캡처용)
export const TEST_START = TEST ? params.get('start') : null;
export const TEST_ARGS = TEST ? { branch: Number(params.get('branch')) || undefined, tab: params.get('tab') !== null ? Number(params.get('tab')) : undefined, from: params.get('from') || undefined, stage: TEST_STAGE || undefined } : {};

// 테스트 모드에서만 ?test=1&hour=H[&min=M][&timeScale=S] 로 정원의 한국 시각을 덮어쓴다 (plan 3-10, R45). 범위 밖 값은 무시한다.
const hourParam = TEST && params.has('hour') ? Number(params.get('hour')) : NaN;
const minParam = TEST && params.has('min') ? Number(params.get('min')) : 0;
export const TEST_CLOCK = (Number.isInteger(hourParam) && hourParam >= 0 && hourParam <= 23)
  ? { hour: hourParam, min: (Number.isInteger(minParam) && minParam >= 0 && minParam <= 59) ? minParam : 0, timeScale: Number(params.get('timeScale')) > 0 ? Number(params.get('timeScale')) : 0 }
  : null;

export const CONFIG = {
  "width": 540,
  "height": 960,
  "gridColCount": 6,
  "gridRowCount": 6,
  "cellSizePx": 80,
  "slideSpeedCellsPerS": 14,
  "slideMinDurationMs": 120,
  "swipeThresholdPx": 30,
  "inputLockAfterMoveMs": 60,
  "undoPerStageCount": 2,
  "undoRefillOnRestart": false,
  "starTwoExtraMoveCount": 2,
  "branchCount": 5,
  "branchStageCount": 34,
  "stageCount": 170,
  "branchMaxStarCount": 102,
  "maxStarCount": 510,
  "branchUnlockStarCount": 51,
  "stageOpenAheadCount": 2,
  "iceCrackedAfterPassCount": 1,
  "frogStepPerMoveCount": 1,
  "teleportPairMaxCount": 2,
  "chainBloomMinCount": 3,
  "flowerMaxCount": 8,
  "rockMinCount": 3,
  "rockMaxCount": 9,
  "treeMaxCount": 4,
  "dirtMaxCount": 3,
  "iceMaxCount": 4,
  "arrowMaxCount": 4,
  "mushroomMaxCount": 3,
  "potMaxCount": 2,
  "acornMaxCount": 2,
  "frogMaxCount": 2,
  "movableMaxCount": 3,
  "specialElementMaxCount": 7,
  "frogPatrolMinCount": 2,
  "frogPatrolMaxCount": 4,
  "slideLoopGuardStepCount": 64,
  "jumpArcMs": 220,
  "bloomTweenMs": 400,
  "interstitialEveryStageCount": 0,
  "targetStageTimeMinSec": 30,
  "targetStageTimeMaxSec": 180,
  "stageTimePerMoveSec": 8,
  "stageTimePerFlowerSec": 3,
  "autoSaveDebounceMs": 200,
  "solverMaxDepthCount": 18,
  "solverVerifyNodeLimitCount": 2000000,
  "stageMaxWaysCount": 4,
  "stageGenTimeBudgetSec": 120,
  "stageGenGoalToleranceCount": 1,
  "stageGenGoalToleranceRelaxedCount": 2,
  "stageGenMaxFailedCount": 5,
  "chainStagesPerBranchMinCount": 6,
  "hintFreeStartCount": 3,
  "hintPriceCoinCount": 40,
  "hintMaxStockCount": 99,
  "hintDisplaySec": 4,
  "hintRewindStepMs": 150,
  "hintRewindMaxTotalMs": 1200,
  "hintRewindExtraCostCount": 0,
  "hintRewoundNoticeSec": 2.5,
  "coinPerStarCount": 5,
  "coinFirstClearBonusCount": 10,
  "coinReplayPerNewStarCount": 5,
  "coinMaxBalanceCount": 99999,
  "tutorialCardMaxSec": 6,
  "tutorialCardWidthPx": 480,
  "tutorialCardMaxCharCount": 20,
  "passLevelCount": 15,
  "passStarsPerLevelCount": 6,
  "passHintOverflowCoinCount": 40,
  "passTrack": [
    "decor:A",
    "coins:30",
    "hints:2",
    "decor:B",
    "friend",
    "coins:40",
    "hints:2",
    "plot:+2",
    "decor:C",
    "coins:50",
    "hints:2",
    "building",
    "coins:60",
    "coins:70",
    "skin"
  ],
  "gardenPlotStartTileCount": 8,
  "gardenPlotExpandTileCount": 2,
  "gardenPlotMaxTileCount": 18,
  "gardenTileWidthPx": 64,
  "gardenTileHeightPx": 32,
  "gardenZoomNearRatio": 1,
  "gardenZoomFarRatio": 0.6,
  "gardenDragThresholdPx": 8,
  "gardenPanMarginPx": 120,
  "gardenItemMaxStackCount": 20,
  "gardenFriendMaxCount": 5,
  "gardenWanderIdleMinMs": 2000,
  "gardenWanderIdleMaxMs": 5000,
  "gardenWanderStepMs": 600,
  "gardenLowPerfResidentCount": 2,
  "shopGroundPriceCoinCount": 40,
  "shopDecorPriceCoinCount": 70,
  "shopBuildingPriceCoinCount": 160,
  "shopThemePriceCoinCount": 250,
  "shopSkinPriceCoinCount": 150,
  "dewBreathScaleRatio": 1.04,
  "dewBreathMs": 1600,
  "dewBlinkMinMs": 2500,
  "dewBlinkMaxMs": 5000,
  "dewBlinkMs": 120,
  "dewSlideStretchRatio": 1.18,
  "dewSlideSquashRatio": 0.88,
  "dewEyeShiftPx": 3,
  "dewEyeSizePx": 7,
  "dewEyeGapPx": 18,
  "dewMouthPx": 8,
  "dewClearHopCount": 2,
  "dewClearMs": 800,
  "dewBlockedFaceMs": 400,
  "dewBloomSmileMs": 300,
  "slideSoundMinMs": 250,
  "slideSoundMaxMs": 600,
  "slideSoundPitchJitterPct": 3,
  "slideSoundVolumeRatio": 0.5,
  "slideSoundFollows": "branch",
  "homeMenuShowProgress": false,
  "branchSwipeThresholdPx": 60,
  "stageTileSizePx": 88,
  "stageTileColumnsCount": 5,
  "saveKey": "dewdrop-path.v5",
  "stageCellCodes": {
    ".": "풀",
    "#": "바위",
    "T": "나무",
    "d": "흙 덩어리",
    "o": "꽃봉오리",
    "i": "얇은 얼음(깨지면 물웅덩이)",
    "a": "꽃잎 쌍 a",
    "b": "꽃잎 쌍 b",
    "^": "바람개비 위",
    ">": "바람개비 오른쪽",
    "v": "바람개비 아래",
    "<": "바람개비 왼쪽",
    "m": "통통 버섯",
    "P": "화분",
    "c": "도토리",
    "D": "이슬방울 시작(풀)",
    "frogs": "별도 목록 {path:[[r,c],...], start}"
  },
  "elementRoles": {
    "rock": "작동=부딪혀 멈춤 또는 뛰어넘음. 조건: U 또는 T2(풀). 둘 다 실패하면 생성기가 지움",
    "tree": "작동=부딪혀 멈춤. 조건: U 또는 T2(풀). 스테이지 나무 중 1개 이상 T2(바위) 통과",
    "dirt": "작동=부딪혀 멈춤(무너짐). 조건: T1 그리고 T2(바위)",
    "ice": "작동=깨짐. 조건: T1 그리고 T2(풀). 스테이지 단위로 모범 풀이에 물웅덩이 사용(부딪혀 멈춤 또는 뛰어넘음) 1회 이상",
    "petal": "작동=순간이동. 조건: 쌍마다 T1",
    "arrow": "작동=방향이 실제로 바뀜. 조건: T1",
    "mushroom": "작동=점프. 조건: T1",
    "pot": "작동=밀려서 움직임. 조건: T1",
    "acorn": "작동=이슬방울이 부딪혀 멈춤. 조건: T2(제거) 그리고 U",
    "frog": "작동=이슬방울이 부딪혀 멈춤 또는 이슬방울 때문에 제자리. 조건: T2(제거) 그리고 U",
    "hiddenInteraction": "숨은 상호작용 H1~H12: 도입 스테이지의 solutions[0]에 그 이벤트가 1회 이상(U). 도입 스테이지보다 앞 스테이지에는 그 두 요소가 함께 놓이지 않고(H6, H7은 앞 스테이지의 어떤 solutions에도 그 이벤트가 없음)"
  },
  "branchGuide": [
    {
      "branchId": "b1",
      "nameKey": "branch.name1",
      "mood": "연두·하늘 아침 햇살",
      "slideSound": "slide1 젖은 풀 위 사르륵",
      "newA": "ice@6",
      "newB": "dirt@12",
      "previous": "",
      "segments": [
        {
          "stages": "1-5",
          "elements": "바위·꽃만, v4 1~5 배치(역할 없는 바위 제거), 꽃 1,2,2,3,4 / 목표 1,2,3,4,6 고정",
          "flowerMinCount": 1,
          "flowerMaxCount": 4,
          "goalMinCount": 1,
          "goalMaxCount": 6
        },
        {
          "stages": "6-11",
          "elements": "ice 1~3 (6은 ice 1개만)",
          "flowerMinCount": 3,
          "flowerMaxCount": 5,
          "goalMinCount": 5,
          "goalMaxCount": 9
        },
        {
          "stages": "12-16",
          "elements": "dirt 1~2 (12는 dirt 1개만)",
          "flowerMinCount": 2,
          "flowerMaxCount": 5,
          "goalMinCount": 4,
          "goalMaxCount": 8
        },
        {
          "stages": "17-27",
          "elements": "ice 1~3 + dirt 1~2",
          "flowerMinCount": 3,
          "flowerMaxCount": 6,
          "goalMinCount": 6,
          "goalMaxCount": 10
        },
        {
          "stages": "28-33",
          "elements": "ice 2~4 + dirt 1~3",
          "flowerMinCount": 4,
          "flowerMaxCount": 7,
          "goalMinCount": 9,
          "goalMaxCount": 12
        },
        {
          "stages": "34",
          "elements": "ice 3~4 + dirt 2~3 (마무리)",
          "flowerMinCount": 6,
          "flowerMaxCount": 7,
          "goalMinCount": 12,
          "goalMaxCount": 12
        }
      ],
      "breatherFollowRule": "구간 d의 숨 고르기(로컬 17+3=20, 17+8=25)를 하한으로 둔 뒤 바로 다음 스테이지(21, 26)는 곡선값-1(하한 미만 금지)"
    },
    {
      "branchId": "b2",
      "nameKey": "branch.name2",
      "mood": "살구·보라 노을",
      "slideSound": "slide2 비단 같은 꽃잎 스침",
      "newA": "arrow@1",
      "newB": "petal@12",
      "previous": "ice,dirt",
      "segments": [
        {
          "stages": "1-5",
          "elements": "arrow 1~2 (1은 arrow 1개만)",
          "flowerMinCount": 2,
          "flowerMaxCount": 4,
          "goalMinCount": 4,
          "goalMaxCount": 7
        },
        {
          "stages": "6-11",
          "elements": "arrow 1~3 + 이전 1종",
          "flowerMinCount": 3,
          "flowerMaxCount": 5,
          "goalMinCount": 6,
          "goalMaxCount": 10
        },
        {
          "stages": "12-16",
          "elements": "petal 1쌍 + arrow 0~1 (12는 petal 1쌍만)",
          "flowerMinCount": 2,
          "flowerMaxCount": 5,
          "goalMinCount": 5,
          "goalMaxCount": 8
        },
        {
          "stages": "17-27",
          "elements": "arrow 1~3 + petal 1~2쌍 + 이전 0~1종",
          "flowerMinCount": 3,
          "flowerMaxCount": 6,
          "goalMinCount": 7,
          "goalMaxCount": 11
        },
        {
          "stages": "28-33",
          "elements": "arrow 2~4 + petal 1~2쌍 + 이전 1~2종",
          "flowerMinCount": 4,
          "flowerMaxCount": 7,
          "goalMinCount": 10,
          "goalMaxCount": 13
        },
        {
          "stages": "34",
          "elements": "arrow 3~4 + petal 2쌍 + 이전 1종 (마무리)",
          "flowerMinCount": 7,
          "flowerMaxCount": 7,
          "goalMinCount": 13,
          "goalMaxCount": 13
        }
      ],
      "breatherFollowRule": "구간 d의 숨 고르기(로컬 17+3=20, 17+8=25)를 하한으로 둔 뒤 바로 다음 스테이지(21, 26)는 곡선값-1(하한 미만 금지)"
    },
    {
      "branchId": "b3",
      "nameKey": "branch.name3",
      "mood": "청록·갈색 숲 그늘",
      "slideSound": "slide3 이끼 위 먹먹한 미끄러짐",
      "newA": "mushroom@1",
      "newB": "tree@12",
      "previous": "ice,dirt,arrow,petal",
      "segments": [
        {
          "stages": "1-5",
          "elements": "mushroom 1~2 (1은 mushroom 1개만)",
          "flowerMinCount": 2,
          "flowerMaxCount": 4,
          "goalMinCount": 4,
          "goalMaxCount": 8
        },
        {
          "stages": "6-11",
          "elements": "mushroom 1~2 + 이전 1종",
          "flowerMinCount": 3,
          "flowerMaxCount": 5,
          "goalMinCount": 6,
          "goalMaxCount": 10
        },
        {
          "stages": "12-16",
          "elements": "tree 1~3 + mushroom 1~2 (12는 tree 1 + mushroom 1)",
          "flowerMinCount": 2,
          "flowerMaxCount": 5,
          "goalMinCount": 5,
          "goalMaxCount": 9
        },
        {
          "stages": "17-27",
          "elements": "mushroom 1~3 + tree 1~3 + 이전 0~1종",
          "flowerMinCount": 3,
          "flowerMaxCount": 6,
          "goalMinCount": 8,
          "goalMaxCount": 12
        },
        {
          "stages": "28-33",
          "elements": "mushroom 2~3 + tree 1~4 + 이전 1~2종",
          "flowerMinCount": 4,
          "flowerMaxCount": 7,
          "goalMinCount": 10,
          "goalMaxCount": 13
        },
        {
          "stages": "34",
          "elements": "mushroom 3 + tree 2~4 + 이전 2종 (마무리)",
          "flowerMinCount": 7,
          "flowerMaxCount": 8,
          "goalMinCount": 14,
          "goalMaxCount": 14
        }
      ],
      "breatherFollowRule": "구간 d의 숨 고르기(로컬 17+3=20, 17+8=25)를 하한으로 둔 뒤 바로 다음 스테이지(21, 26)는 곡선값-1(하한 미만 금지)"
    },
    {
      "branchId": "b4",
      "nameKey": "branch.name4",
      "mood": "물빛·연녹 연못",
      "slideSound": "slide4 물 위 매끄러운 미끄러짐",
      "newA": "pot@1",
      "newB": "frog@12",
      "previous": "ice,dirt,arrow,petal,mushroom",
      "segments": [
        {
          "stages": "1-5",
          "elements": "pot 1 (1은 pot만)",
          "flowerMinCount": 2,
          "flowerMaxCount": 4,
          "goalMinCount": 5,
          "goalMaxCount": 8
        },
        {
          "stages": "6-11",
          "elements": "pot 1~2 + 이전 1종. 고정 배정: 4-6 arrow(H1), 4-7 petal(H2), 4-8 mushroom(H3, 나무 0~2), 4-9 ice(H4), 4-10 dirt(H5), 4-11은 순환 규칙",
          "flowerMinCount": 3,
          "flowerMaxCount": 5,
          "goalMinCount": 7,
          "goalMaxCount": 11
        },
        {
          "stages": "12-16",
          "elements": "frog 1 순찰 2~3 (12는 frog 1 순찰 2)",
          "flowerMinCount": 2,
          "flowerMaxCount": 5,
          "goalMinCount": 5,
          "goalMaxCount": 9
        },
        {
          "stages": "17-27",
          "elements": "pot 1~2 + frog 1 + 이전 0~1종",
          "flowerMinCount": 3,
          "flowerMaxCount": 6,
          "goalMinCount": 8,
          "goalMaxCount": 12
        },
        {
          "stages": "28-33",
          "elements": "pot 1~2 + frog 1~2 + 이전 1~2종 (움직이는 것 3 이하)",
          "flowerMinCount": 4,
          "flowerMaxCount": 7,
          "goalMinCount": 11,
          "goalMaxCount": 14
        },
        {
          "stages": "34",
          "elements": "pot 2 + frog 1 + 이전 2종 (마무리)",
          "flowerMinCount": 7,
          "flowerMaxCount": 8,
          "goalMinCount": 14,
          "goalMaxCount": 14
        }
      ],
      "fixedPrevious": {
        "6": "arrow",
        "7": "petal",
        "8": "mushroom",
        "9": "ice",
        "10": "dirt"
      },
      "interactionIntros": {
        "6": "H1",
        "7": "H2",
        "8": "H3",
        "9": "H4",
        "10": "H5"
      },
      "afterLoweredStages": {
        "11": "곡선값 11 - 1 = 10 (4-6~4-10 상호작용 도입 7,7,7,7,8 다음)"
      },
      "breatherFollowRule": "구간 d의 숨 고르기(로컬 17+3=20, 17+8=25)를 하한으로 둔 뒤 바로 다음 스테이지(21, 26)는 곡선값-1(하한 미만 금지)"
    },
    {
      "branchId": "b5",
      "nameKey": "branch.name5",
      "mood": "금빛·남색 해 질 녘에서 밤",
      "slideSound": "slide5 바람 섞인 휘익",
      "newA": "acorn@1",
      "newB": "review@12",
      "previous": "ice,dirt,arrow,petal,mushroom,pot,frog",
      "segments": [
        {
          "stages": "1-5",
          "elements": "acorn 1 (5-1은 acorn만, 5-2는 H6 줄서기 도입, 5-3은 H7 도토리만 이동 도입)",
          "flowerMinCount": 2,
          "flowerMaxCount": 4,
          "goalMinCount": 5,
          "goalMaxCount": 9
        },
        {
          "stages": "6-11",
          "elements": "acorn 1~2 + 이전 1종. 고정 배정: 5-6 arrow(H8), 5-7 petal(H9), 5-8 mushroom(H10, 나무 0~2), 5-9 ice(H11), 5-10 dirt(H12), 5-11은 순환 규칙",
          "flowerMinCount": 3,
          "flowerMaxCount": 5,
          "goalMinCount": 7,
          "goalMaxCount": 11
        },
        {
          "stages": "12-16",
          "elements": "총복습: acorn 없이 이전 2종",
          "flowerMinCount": 4,
          "flowerMaxCount": 6,
          "goalMinCount": 8,
          "goalMaxCount": 12
        },
        {
          "stages": "17-27",
          "elements": "acorn 1~2 + 이전 1~2종",
          "flowerMinCount": 4,
          "flowerMaxCount": 7,
          "goalMinCount": 10,
          "goalMaxCount": 14
        },
        {
          "stages": "28-33",
          "elements": "acorn 1~2 + 이전 2종",
          "flowerMinCount": 5,
          "flowerMaxCount": 8,
          "goalMinCount": 12,
          "goalMaxCount": 15
        },
        {
          "stages": "34",
          "elements": "acorn 2 + 이전 3종 (마무리)",
          "flowerMinCount": 8,
          "flowerMaxCount": 8,
          "goalMinCount": 15,
          "goalMaxCount": 15
        }
      ],
      "fixedPrevious": {
        "6": "arrow",
        "7": "petal",
        "8": "mushroom",
        "9": "ice",
        "10": "dirt"
      },
      "interactionIntros": {
        "2": "H6",
        "3": "H7",
        "6": "H8",
        "7": "H9",
        "8": "H10",
        "9": "H11",
        "10": "H12"
      },
      "afterLoweredStages": {
        "4": "곡선값 8 - 1 = 7 (5-2, 5-3 상호작용 도입 5,5 다음)",
        "11": "곡선값 11 - 1 = 10 (5-6~5-10 상호작용 도입 7,7,7,7,8 다음)"
      },
      "breatherFollowRule": "구간 d의 숨 고르기(로컬 17+3=20, 17+8=25)를 하한으로 둔 뒤 바로 다음 스테이지(21, 26)는 곡선값-1(하한 미만 금지)"
    }
  ],
  "gardenItems": [
    {
      "id": "b1_moss_bench",
      "branchId": "b1",
      "source": "pass:1",
      "kind": "decor",
      "size": "1x1"
    },
    {
      "id": "b1_wind_chime",
      "branchId": "b1",
      "source": "pass:4",
      "kind": "decor",
      "size": "1x1"
    },
    {
      "id": "b1_sprout_bed",
      "branchId": "b1",
      "source": "pass:9",
      "kind": "decor",
      "size": "1x1"
    },
    {
      "id": "b1_gardener_hut",
      "branchId": "b1",
      "source": "pass:12",
      "kind": "building",
      "size": "2x2"
    },
    {
      "id": "b1_grass_path",
      "branchId": "b1",
      "source": "shop",
      "kind": "ground",
      "size": "1x1",
      "priceCoinCount": 40
    },
    {
      "id": "b1_wood_fence",
      "branchId": "b1",
      "source": "shop",
      "kind": "decor",
      "size": "1x1",
      "priceCoinCount": 70
    },
    {
      "id": "b1_small_well",
      "branchId": "b1",
      "source": "shop",
      "kind": "decor",
      "size": "1x1",
      "priceCoinCount": 70
    },
    {
      "id": "b1_veggie_patch",
      "branchId": "b1",
      "source": "shop",
      "kind": "building",
      "size": "2x2",
      "priceCoinCount": 160
    },
    {
      "id": "b2_petal_lamp",
      "branchId": "b2",
      "source": "pass:1",
      "kind": "decor",
      "size": "1x1"
    },
    {
      "id": "b2_flower_arch",
      "branchId": "b2",
      "source": "pass:4",
      "kind": "decor",
      "size": "1x1"
    },
    {
      "id": "b2_sunset_bench",
      "branchId": "b2",
      "source": "pass:9",
      "kind": "decor",
      "size": "1x1"
    },
    {
      "id": "b2_flower_shop",
      "branchId": "b2",
      "source": "pass:12",
      "kind": "building",
      "size": "2x2"
    },
    {
      "id": "b2_petal_path",
      "branchId": "b2",
      "source": "shop",
      "kind": "ground",
      "size": "1x1",
      "priceCoinCount": 40
    },
    {
      "id": "b2_ribbon_pole",
      "branchId": "b2",
      "source": "shop",
      "kind": "decor",
      "size": "1x1",
      "priceCoinCount": 70
    },
    {
      "id": "b2_flower_cart",
      "branchId": "b2",
      "source": "shop",
      "kind": "decor",
      "size": "1x1",
      "priceCoinCount": 70
    },
    {
      "id": "b2_windmill",
      "branchId": "b2",
      "source": "shop",
      "kind": "building",
      "size": "2x2",
      "priceCoinCount": 160
    },
    {
      "id": "b3_mushroom_lamp",
      "branchId": "b3",
      "source": "pass:1",
      "kind": "decor",
      "size": "1x1"
    },
    {
      "id": "b3_log_stool",
      "branchId": "b3",
      "source": "pass:4",
      "kind": "decor",
      "size": "1x1"
    },
    {
      "id": "b3_firefly_jar",
      "branchId": "b3",
      "source": "pass:9",
      "kind": "decor",
      "size": "1x1"
    },
    {
      "id": "b3_mushroom_house",
      "branchId": "b3",
      "source": "pass:12",
      "kind": "building",
      "size": "2x2"
    },
    {
      "id": "b3_moss_floor",
      "branchId": "b3",
      "source": "shop",
      "kind": "ground",
      "size": "1x1",
      "priceCoinCount": 40
    },
    {
      "id": "b3_tree_stump",
      "branchId": "b3",
      "source": "shop",
      "kind": "decor",
      "size": "1x1",
      "priceCoinCount": 70
    },
    {
      "id": "b3_toadstool_ring",
      "branchId": "b3",
      "source": "shop",
      "kind": "decor",
      "size": "1x1",
      "priceCoinCount": 70
    },
    {
      "id": "b3_tree_swing",
      "branchId": "b3",
      "source": "shop",
      "kind": "building",
      "size": "2x2",
      "priceCoinCount": 160
    },
    {
      "id": "b4_stone_lantern",
      "branchId": "b4",
      "source": "pass:1",
      "kind": "decor",
      "size": "1x1"
    },
    {
      "id": "b4_frog_statue",
      "branchId": "b4",
      "source": "pass:4",
      "kind": "decor",
      "size": "1x1"
    },
    {
      "id": "b4_lily_pot",
      "branchId": "b4",
      "source": "pass:9",
      "kind": "decor",
      "size": "1x1"
    },
    {
      "id": "b4_pavilion",
      "branchId": "b4",
      "source": "pass:12",
      "kind": "building",
      "size": "2x2"
    },
    {
      "id": "b4_stepping_stone",
      "branchId": "b4",
      "source": "shop",
      "kind": "ground",
      "size": "1x1",
      "priceCoinCount": 40
    },
    {
      "id": "b4_small_bridge",
      "branchId": "b4",
      "source": "shop",
      "kind": "decor",
      "size": "1x1",
      "priceCoinCount": 70
    },
    {
      "id": "b4_reed_bunch",
      "branchId": "b4",
      "source": "shop",
      "kind": "decor",
      "size": "1x1",
      "priceCoinCount": 70
    },
    {
      "id": "b4_water_mill",
      "branchId": "b4",
      "source": "shop",
      "kind": "building",
      "size": "2x2",
      "priceCoinCount": 160
    },
    {
      "id": "b5_pinwheel",
      "branchId": "b5",
      "source": "pass:1",
      "kind": "decor",
      "size": "1x1"
    },
    {
      "id": "b5_acorn_pile",
      "branchId": "b5",
      "source": "pass:4",
      "kind": "decor",
      "size": "1x1"
    },
    {
      "id": "b5_scarecrow",
      "branchId": "b5",
      "source": "pass:9",
      "kind": "decor",
      "size": "1x1"
    },
    {
      "id": "b5_wind_tower",
      "branchId": "b5",
      "source": "pass:12",
      "kind": "building",
      "size": "2x2"
    },
    {
      "id": "b5_leaf_floor",
      "branchId": "b5",
      "source": "shop",
      "kind": "ground",
      "size": "1x1",
      "priceCoinCount": 40
    },
    {
      "id": "b5_kite_pole",
      "branchId": "b5",
      "source": "shop",
      "kind": "decor",
      "size": "1x1",
      "priceCoinCount": 70
    },
    {
      "id": "b5_hay_bale",
      "branchId": "b5",
      "source": "shop",
      "kind": "decor",
      "size": "1x1",
      "priceCoinCount": 70
    },
    {
      "id": "b5_squirrel_house",
      "branchId": "b5",
      "source": "shop",
      "kind": "building",
      "size": "2x2",
      "priceCoinCount": 160
    }
  ],
  "friends": [
    "friend_daisy@1",
    "friend_tulip@2",
    "friend_bellflower@3",
    "friend_waterlily@4",
    "friend_sunflower@5"
  ],
  "skins": [
    "skin_default",
    "skin_sprout_hat@pass1",
    "skin_petal_ribbon@pass2",
    "skin_mushroom_cap@pass3",
    "skin_lily_umbrella@pass4",
    "skin_acorn_cap@pass5",
    "skin_peach@shop1",
    "skin_mint@shop2",
    "skin_sunset@shop3",
    "skin_starlight@shop4",
    "skin_rainbow@shop5"
  ],
  "themes": [
    "theme_default(챕터 따라감)",
    "theme_blossom@1",
    "theme_starnight@2",
    "theme_snowflake@3",
    "theme_candy@4",
    "theme_rainbowcloud@5"
  ],
  "undoResetOn": "stageClear(그 스테이지를 클리어했을 때만 2로 초기화)",
  "interactionIntroGoalOffsetCount": 2,
  "interactionCardMaxSec": 6,
  "cardsPerStageStartMaxCount": 2,
  "interactionMarkMs": 600,
  "orderInversionCheckExtraDepthCount": 2,
  "dSegmentSkillThemesEnabled": false,
  "hiddenInteractions": [
    {
      "id": "H1",
      "key": "potArrow",
      "with": "pot+arrow",
      "introStage": "4-6",
      "event": "밀린 화분이 바람개비 잎 칸을 지나가거나 그 위에 멈춤(방향 안 바뀜)",
      "cardKey": "tutorial.potArrow",
      "cardText": "화분은 잎에서 안 꺾여요"
    },
    {
      "id": "H2",
      "key": "potPetal",
      "with": "pot+petal",
      "introStage": "4-7",
      "event": "밀린 화분이 꽃잎 칸을 지나가거나 그 위에 멈춤(순간이동 없음)",
      "cardKey": "tutorial.potPetal",
      "cardText": "화분은 꽃잎으로 안 날아가요"
    },
    {
      "id": "H3",
      "key": "potMushroom",
      "with": "pot+mushroom",
      "introStage": "4-8",
      "event": "밀린 화분이 버섯 칸을 지나가거나 그 위에 멈춤(점프 없음)",
      "cardKey": "tutorial.potMushroom",
      "cardText": "화분은 버섯에서 안 뛰어요"
    },
    {
      "id": "H4",
      "key": "potIce",
      "with": "pot+ice",
      "introStage": "4-9",
      "event": "밀린 화분이 얇은 얼음 칸을 지나감(얼음 그대로)",
      "cardKey": "tutorial.potIce",
      "cardText": "화분은 얼음을 안 깨요"
    },
    {
      "id": "H5",
      "key": "potDirt",
      "with": "pot+dirt",
      "introStage": "4-10",
      "event": "밀린 화분이 흙 덩어리 앞에서 멈춤(흙 그대로)",
      "cardKey": "tutorial.potDirt",
      "cardText": "흙은 이슬만 무너뜨려요"
    },
    {
      "id": "H6",
      "key": "acornQueue",
      "with": "acorn",
      "introStage": "5-2",
      "event": "한 입력에서 이슬방울과 도토리가 진행 방향 같은 줄에 있고, 뒤에 있는 것이 앞의 것의 새 위치 바로 뒤에 멈춤(앞에서부터 처리, R26)",
      "cardKey": "tutorial.acornQueue",
      "cardText": "앞에 있는 것부터 미끄러져요"
    },
    {
      "id": "H7",
      "key": "acornOnlyMove",
      "with": "acorn",
      "introStage": "5-3",
      "event": "이슬방울은 못 움직이고 도토리만 움직인 성공 이동(이동 +1)",
      "cardKey": "tutorial.acornOnlyMove",
      "cardText": "도토리만 움직여도 1수예요"
    },
    {
      "id": "H8",
      "key": "acornArrow",
      "with": "acorn+arrow",
      "introStage": "5-6",
      "event": "도토리가 바람개비 잎 칸을 지나가거나 그 위에 멈춤",
      "cardKey": "tutorial.acornArrow",
      "cardText": "도토리는 잎에서 안 꺾여요"
    },
    {
      "id": "H9",
      "key": "acornPetal",
      "with": "acorn+petal",
      "introStage": "5-7",
      "event": "도토리가 꽃잎 칸을 지나가거나 그 위에 멈춤",
      "cardKey": "tutorial.acornPetal",
      "cardText": "도토리는 꽃잎으로 안 날아가요"
    },
    {
      "id": "H10",
      "key": "acornMushroom",
      "with": "acorn+mushroom",
      "introStage": "5-8",
      "event": "도토리가 버섯 칸을 지나가거나 그 위에 멈춤",
      "cardKey": "tutorial.acornMushroom",
      "cardText": "도토리는 버섯에서 안 뛰어요"
    },
    {
      "id": "H11",
      "key": "acornIce",
      "with": "acorn+ice",
      "introStage": "5-9",
      "event": "도토리가 얇은 얼음 칸을 지나감(얼음 그대로)",
      "cardKey": "tutorial.acornIce",
      "cardText": "도토리는 얼음을 안 깨요"
    },
    {
      "id": "H12",
      "key": "acornDirt",
      "with": "acorn+dirt",
      "introStage": "5-10",
      "event": "도토리가 흙 덩어리 앞에서 멈춤(흙 그대로)",
      "cardKey": "tutorial.acornDirt",
      "cardText": "흙은 도토리로 안 무너져요"
    }
  ],
  "undoSaveField": "undoLeft",
  "undoCarryNoticeSec": 1.5,
  "undoTextPlaceholders": {
    "play.undoCarry": "ko: 남은 되돌리기 {n}회 · 클리어하면 다시 2회 / en: Undos left: {n} · Clear to refill to 2",
    "stage.undoLeft": "ko: {n} (배지 숫자) / en: {n}",
    "stage.undoLeftHelp": "ko: 되돌리기 배지: 클리어하면 다시 2회 / en: Undo badge: clear the stage to refill to 2",
    "play.undoEmpty": "ko: 되돌리기를 다 썼어요 · 클리어하면 다시 2회 / en: No undos left · Clear to refill to 2",
    "note": "모두 자리표시이며 스토리 단계가 확정한다"
  },
  "afterLoweredGoalOffsetCount": 1,
  "interactionCardAfterMarkDelayMs": 600,
  "dewBodySizePx": 64,
  "dewEyeHeightPx": 9,
  "dewCheekWidthPx": 8,
  "dewCheekHeightPx": 5,
  "dewBrowLengthPx": 8,
  "dewWorryBrowAngleDeg": 20,
  "dewFaceFollowRatio": 0.5,
  "dewStopSquashMs": 120,
  "dewJumpHeightPx": 28,
  "dewJumpMs": 220,
  "dewClearHopHeightPx": 24,
  "dewGardenHopHeightPx": 10,
  "flowerBloomStepMs": 100,
  "flowerBloomPopRatio": 1.2,
  "buildDurationMs": 3000,
  "buildShakeAngleDeg": 1.5,
  "buildShakePeriodMs": 160,
  "buildDustIntervalMs": 150,
  "buildDustLifeMs": 600,
  "buildFadeMs": 300,
  "buildHopPx": 12,
  "buildHopMs": 350,
  "buildSparkleCount": 8,
  "buildSparkleLifeMs": 500,
  "buildTockIntervalMs": 400,
  "buildTapToastSec": 1.2,
  "gardenClockUtcOffsetS": 32400,
  "gardenDawnStartMinuteCount": 300,
  "gardenDayStartMinuteCount": 420,
  "gardenDuskStartMinuteCount": 1020,
  "gardenNightStartMinuteCount": 1140,
  "gardenSkyFadeMs": 3000,
  "gardenBuildingFadeMs": 1500,
  "gardenBuildingFadeStaggerMs": 100,
  "gardenBuildingFadeStaggerMaxMs": 600,
  "gardenClockPollMs": 1000,
  "gardenReturnFadeMs": 300,
  "gardenClock": {
    "zone": "Asia/Seoul",
    "method": "floor(((Date.now()+32400000) mod 86400000)/60000)",
    "periods": [
      {
        "id": "dawn",
        "sky": [
          "#ffd9c4",
          "#a9c9ee"
        ],
        "buildingImage": "day+tint",
        "groundTint": "0xffe4d0",
        "lampGlowAlphaRatio": 0.2,
        "fromMinuteCount": 300,
        "toMinuteCount": 419
      },
      {
        "id": "day",
        "sky": [
          "#8fd3ff",
          "#e9f9d9"
        ],
        "buildingImage": "day",
        "groundTint": "0xffffff",
        "lampGlowAlphaRatio": 0,
        "fromMinuteCount": 420,
        "toMinuteCount": 1019
      },
      {
        "id": "dusk",
        "sky": [
          "#ff9f7a",
          "#6a4f9c"
        ],
        "buildingImage": "day+tint",
        "groundTint": "0xffc89a",
        "lampGlowAlphaRatio": 0.25,
        "fromMinuteCount": 1020,
        "toMinuteCount": 1139
      },
      {
        "id": "night",
        "sky": [
          "#12183a",
          "#2a3b6c"
        ],
        "buildingImage": "night",
        "groundTint": "0x8c96d0",
        "lampGlowAlphaRatio": 0.5,
        "fromMinuteCount": 1140,
        "toMinuteCount": 299
      }
    ],
    "testQuery": "?test=1&hour=22[&min=30][&timeScale=600]",
    "testIgnoredWithoutTest": true,
    "playScreenAffected": false
  },
  "smokeIntervalMs": 700,
  "smokeLifeMs": 2000,
  "smokeRisePx": 28,
  "smokeMaxPerChimneyCount": 3,
  "bladeSpinDegPerS": 60,
  "wheelSpinDegPerS": 30,
  "vaneSwingDeg": 25,
  "vaneSwingMs": 3000,
  "flagSwayDeg": 8,
  "flagSwayMs": 1400,
  "windowFlickerMinMs": 1200,
  "windowFlickerMaxMs": 3200,
  "windowDimChancePct": 17,
  "windowLightSizePx": 10,
  "skyStarCount": 24,
  "skyCloudCount": 3,
  "perf": {
    "buildingAnimMaxMobileCount": 6,
    "buildingAnimMaxLowPerfCount": 3,
    "buildingAnimMaxDesktopCount": 10,
    "decorAnimMaxMobileCount": 8,
    "decorAnimMaxLowPerfCount": 4,
    "decorAnimMaxDesktopCount": 25,
    "particleMaxMobileCount": 40,
    "particleMaxLowPerfCount": 20,
    "particleMaxDesktopCount": 80,
    "boardParticleMaxMobileCount": 60,
    "boardParticleMaxLowPerfCount": 30,
    "boardParticleMaxDesktopCount": 100,
    "offscreenMarginPx": 80,
    "visibilityCheckMs": 200,
    "zoomParticlesOffRatio": 0.6,
    "buildingTotalMaxCount": 10,
    "lowPerfFrameMs": 33,
    "lowPerfSustainSec": 3
  },
  "elementImageTotalCount": 117,
  "elementVisuals": {
    "board": [
      {
        "g": "캐릭터",
        "id": "dew_body",
        "name": "이슬 몸통",
        "images": "`dew_body`(정면, 얼굴 없음, 이미 있음), `dew_body_left`(왼쪽 옆모습, 얼굴 없음, 새로 추가, 256px) 2장. 오른쪽은 `dew_body_left`를 scaleX -1로 반전, 위(뒷모습)·아래 이동은 `dew_body` 재사용",
        "idle": "숨쉬기 1.0<->1.04 (3-8)",
        "react": "방향별 몸통 교체(즉시, 80ms 눌림) + 늘어남/찌그러짐/튀어오름 트윈(3-8). 얼굴은 코드(3-8)",
        "cond": "S1·S3·S4·S6에서 항상",
        "ms": "3-8 표",
        "cap": "화면당 1(정원은 주민 포함 최대 7)"
      },
      {
        "g": "칸",
        "id": "grass_tile",
        "name": "풀 칸(바닥)",
        "images": "`grass_a`, `grass_b` 2장(체크무늬)",
        "idle": "정적",
        "react": "힌트 칸 강조는 코드 글로우(alpha 0.4 <-> 0.8)",
        "cond": "모든 칸 바닥",
        "ms": "글로우 800ms 주기",
        "cap": "36칸 정적"
      },
      {
        "g": "칸",
        "id": "rock",
        "name": "바위",
        "images": "`rock` 1장",
        "idle": "정적",
        "react": "이슬이 부딪혀 멈추면 scale 1.0->0.97->1.0, 먼지 입자 2개",
        "cond": "부딪힘 시작 -> 120ms 끝",
        "ms": "120ms",
        "cap": "바위 9개 정적"
      },
      {
        "g": "칸",
        "id": "tree",
        "name": "나무",
        "images": "`tree` 1장",
        "idle": "잎 흔들림 rotation +-1.5도, 3200ms 주기(기준점은 뿌리)",
        "react": "부딪히면 +-4도 2번 200ms, 잎 입자 2개",
        "cond": "부딪힘 시작 -> 200ms 끝",
        "ms": "200ms",
        "cap": "나무 최대 4개"
      },
      {
        "g": "칸",
        "id": "dirt",
        "name": "흙 덩어리",
        "images": "`dirt`(마른), `dirt_wet`(젖음) 2장",
        "idle": "정적",
        "react": "부딪히면 `dirt_wet`으로 크로스페이드 120ms. 마무리 때 scale 1->0 250ms와 흙가루 입자 6개(F28), 아래 풀 칸이 드러남",
        "cond": "부딪힘 -> 마무리 단계 끝",
        "ms": "120ms + 250ms",
        "cap": "흙 최대 3개"
      },
      {
        "g": "칸",
        "id": "flower",
        "name": "꽃봉오리/개화",
        "images": "`flower_0_bud`, `flower_1_wake`, `flower_2_half`, `flower_3_bloom` 4장(상태 4, 순서 고정)",
        "idle": "봉오리: scale 1.0<->1.03, 2400ms 주기, 칸마다 위상 무작위. 활짝: rotation +-2도, 3000ms 주기",
        "react": "이슬이 들어가는 순간 0->1(0ms)->2(100ms)->3(200ms) 순서로 이미지 교체(키프레임, 단계마다 scale 1.1->1.0 100ms), 3단계에서 1.0->1.2->1.0 pop 200ms, 꽃잎 입자 6개(F2). 되돌리기는 150ms 안에 3->0으로 되돌림(F13)",
        "cond": "이슬 칸 진입 -> 400ms 끝",
        "ms": "400ms (flowerBloomStepMs 100 x 단계)",
        "cap": "꽃 최대 8송이"
      },
      {
        "g": "칸",
        "id": "ice",
        "name": "얇은 얼음",
        "images": "`ice`(온전), `ice_crack`(금) 2장",
        "idle": "정적, 반짝임 입자 1개가 3000ms마다 지나감",
        "react": "이슬이 밟으면 `ice_crack`으로 교체 80ms. 마무리 때 깨짐: 조각 입자 5개와 scale 1->0 200ms, 같은 자리에 `puddle` 페이드인 200ms(F10)",
        "cond": "밟음 -> 마무리 끝",
        "ms": "80ms + 200ms",
        "cap": "얼음 최대 4개"
      },
      {
        "g": "칸",
        "id": "puddle",
        "name": "물웅덩이",
        "images": "`puddle` 1장",
        "idle": "파문 링 1개(코드 원): scale 0.6->1.0, alpha 0.5->0, 2200ms 주기",
        "react": "이슬이 부딪히면 즉시 파문 1개 300ms",
        "cond": "얼음이 깨진 뒤 계속",
        "ms": "300ms",
        "cap": "동시 파문 4개"
      },
      {
        "g": "칸",
        "id": "petal_portal",
        "name": "꽃잎 쌍",
        "images": "`petal_portal` 1장(두 칸에 색조 2가지: 분홍, 보라)",
        "idle": "소용돌이 회전 40도/초",
        "react": "이슬이 들어가면 scale 1.0->1.25->1.0 160ms, 꽃잎 입자 4개(F11). 화분·도토리가 지나가면 반응 없음",
        "cond": "이슬 진입 -> 160ms 끝",
        "ms": "160ms",
        "cap": "꽃잎 최대 2쌍(4칸)"
      },
      {
        "g": "칸",
        "id": "arrow_leaf",
        "name": "바람개비 잎",
        "images": "`arrow_leaf` 1장(방향은 rotation 0/90/180/270)",
        "idle": "rotation +-3도, 2400ms 주기",
        "react": "이슬이 들어가면 +-12도 흔들림 200ms, 잎 입자 2개(F29). 물건이 지나가면 반응 없음",
        "cond": "이슬 진입 -> 200ms 끝",
        "ms": "200ms",
        "cap": "잎 최대 4개"
      },
      {
        "g": "칸",
        "id": "mushroom",
        "name": "통통 버섯",
        "images": "`mushroom` 1장",
        "idle": "scaleY 1.0<->1.04, 2200ms 주기",
        "react": "이슬이 들어가면 scaleY 0.8 100ms -> 1.15 -> 1.0 220ms(F30). 물건이 지나가면 반응 없음",
        "cond": "이슬 진입 -> 320ms 끝",
        "ms": "320ms",
        "cap": "버섯 최대 3개"
      },
      {
        "g": "칸",
        "id": "pot",
        "name": "화분",
        "images": "`pot` 1장",
        "idle": "정적",
        "react": "밀려 미끄러질 때 14칸/초, 바닥 먼지 입자 3개(F31). 멈추면 scale 1.0->0.94->1.0 100ms. 밀리지 않으면 x 3px 떨림 120ms",
        "cond": "이슬이 부딪힘 -> 멈춤 100ms 끝",
        "ms": "가변 + 100ms",
        "cap": "화분 최대 2개(움직이는 것 합계 3)"
      },
      {
        "g": "칸",
        "id": "acorn",
        "name": "도토리",
        "images": "`acorn` 1장",
        "idle": "정적",
        "react": "미끄러질 때 칸당 회전 120도(칸 이동과 동기), 멈추면 squash 80ms(F32)",
        "cond": "입력마다 이슬과 같은 시각에 출발 -> 멈춤 80ms 끝",
        "ms": "가변 + 80ms",
        "cap": "도토리 최대 2개"
      },
      {
        "g": "칸",
        "id": "frog",
        "name": "개구리",
        "images": "`frog` 1장(정지 이미지, 방향은 scaleX +-1)",
        "idle": "scaleY 1.0<->1.05, 1600ms 주기(목 숨쉬기)",
        "react": "순찰 1칸 이동 = 220ms 포물선 hop(높이 14px)과 착지 squash 80ms(F12). 이슬 때문에 제자리면 x 2px 떨림 120ms",
        "cond": "마무리 단계 개구리 순서 -> 220ms 끝",
        "ms": "220ms",
        "cap": "개구리 최대 2마리"
      },
      {
        "g": "UI",
        "id": "star",
        "name": "별(HUD, 결과, 칸)",
        "images": "`star_empty`, `star_full` 2장",
        "idle": "정적",
        "react": "획득: scale 0->1.3->1.0 300ms, 별 사이 간격 300ms(F7). 별 3 불가: `star_full`->`star_empty` 페이드 200ms(F9)",
        "cond": "결과 시작 -> 900ms 끝",
        "ms": "300ms x 3",
        "cap": "결과 3개"
      },
      {
        "g": "UI",
        "id": "coin",
        "name": "코인",
        "images": "`coin` 1장",
        "idle": "4000ms마다 반짝임 입자 1개 400ms",
        "react": "획득: scaleX 1->0->1 두 번 500ms 회전, HUD로 포물선 이동 500ms, 숫자 증가 400ms(F20)",
        "cond": "지급 -> 900ms 끝",
        "ms": "500ms + 400ms",
        "cap": "날아가는 코인 동시 5개"
      },
      {
        "g": "UI",
        "id": "hint_bulb",
        "name": "힌트 전구",
        "images": "`hint_bulb` 1장(0개면 tint 0x888888)",
        "idle": "힌트가 1개 이상이면 glow alpha 0.6<->1.0, 1600ms 주기",
        "react": "누르면 glow 300ms 번쩍임 후 F21(점선 4초)",
        "cond": "탭 -> 4초 끝",
        "ms": "300ms",
        "cap": "1개"
      },
      {
        "g": "UI",
        "id": "icon_btns",
        "name": "되돌리기/재시작/일시정지 아이콘",
        "images": "`icon_undo`, `icon_restart`, `icon_pause` 3장",
        "idle": "정적",
        "react": "누르면 scale 0.92 80ms(F17). 되돌리기 0이면 tint 회색, 탭 시 x 6px 두 번 떨림(F14)",
        "cond": "탭 -> 80ms 끝",
        "ms": "80ms",
        "cap": "3개"
      },
      {
        "g": "UI",
        "id": "lock",
        "name": "자물쇠",
        "images": "`lock` 1장",
        "idle": "정적",
        "react": "해금: rotation +-8도 200ms 후 scale 1->0과 반짝임 입자 4개 150ms(F15)",
        "cond": "해금 이벤트 -> 350ms 끝",
        "ms": "350ms",
        "cap": "타일 수만큼 정적"
      },
      {
        "g": "UI",
        "id": "crown",
        "name": "왕관(x-34 타일)",
        "images": "`crown` 1장",
        "idle": "3000ms마다 반짝임 입자 1개 400ms",
        "react": "정적",
        "cond": "마무리 스테이지 타일",
        "ms": "400ms",
        "cap": "챕터당 1개"
      },
      {
        "g": "UI",
        "id": "badge_perfect",
        "name": "퍼펙트 배지",
        "images": "`badge_perfect` 1장",
        "idle": "금빛 테두리 alpha 0.5<->1.0, 3000ms 주기",
        "react": "scale 0->1.3->1.0 400ms(F33)",
        "cond": "결과 별 3 뒤 -> 400ms 끝",
        "ms": "400ms",
        "cap": "1개"
      },
      {
        "g": "UI",
        "id": "reward_chest",
        "name": "패스 보상 상자",
        "images": "`reward_closed`, `reward_open` 2장",
        "idle": "받을 수 있으면 scale 1.0<->1.06, 1000ms 주기(F35)",
        "react": "받기: x 4px 떨림 2번 200ms -> `reward_open` 교체 -> 보상 아이콘이 커지며 날아감 500ms(F16)",
        "cond": "받기 탭 -> 700ms 끝",
        "ms": "700ms",
        "cap": "15줄 중 받을 수 있는 줄만 대기 움직임"
      }
    ],
    "skins": [
      {
        "g": "스킨",
        "id": "skin_peach",
        "name": "복숭아 이슬(색)",
        "images": "이미지 없음, 몸 tint 0xffc7a8",
        "idle": "3-8 대기와 동일",
        "react": "적용 시 몸 tint 400ms 크로스페이드(F42)",
        "cond": "적용 -> 400ms",
        "ms": "400ms",
        "cap": "-"
      },
      {
        "g": "스킨",
        "id": "skin_mint",
        "name": "민트 이슬(색)",
        "images": "이미지 없음, tint 0xb5f0d6",
        "idle": "동일",
        "react": "동일",
        "cond": "동일",
        "ms": "400ms",
        "cap": "-"
      },
      {
        "g": "스킨",
        "id": "skin_sunset",
        "name": "노을 이슬(색)",
        "images": "이미지 없음, tint 0xffb07c",
        "idle": "동일",
        "react": "동일",
        "cond": "동일",
        "ms": "400ms",
        "cap": "-"
      },
      {
        "g": "스킨",
        "id": "skin_starlight",
        "name": "별빛 이슬(색)",
        "images": "이미지 없음, tint 0x9fb4ff",
        "idle": "동일",
        "react": "동일",
        "cond": "동일",
        "ms": "400ms",
        "cap": "-"
      },
      {
        "g": "스킨",
        "id": "skin_rainbow",
        "name": "무지개 이슬(색)",
        "images": "이미지 없음, tint가 6000ms 주기로 색상환 순환(코드)",
        "idle": "tint 순환 6000ms",
        "react": "동일",
        "cond": "적용 중 계속",
        "ms": "6000ms",
        "cap": "이슬 1명"
      },
      {
        "g": "스킨",
        "id": "skin_sprout_hat",
        "name": "새싹 모자(머리)",
        "images": "`skin_sprout_hat` 1장",
        "idle": "rotation +-4도, 2400ms 주기",
        "react": "몸 hop 때 60ms 늦게 따라와 오버슈트 +-8도 240ms",
        "cond": "적용 중 계속",
        "ms": "240ms",
        "cap": "1개"
      },
      {
        "g": "스킨",
        "id": "skin_petal_ribbon",
        "name": "꽃잎 리본(머리)",
        "images": "`skin_petal_ribbon` 1장",
        "idle": "rotation +-8도, 1800ms 주기(펄럭임)",
        "react": "동일",
        "cond": "동일",
        "ms": "240ms",
        "cap": "1개"
      },
      {
        "g": "스킨",
        "id": "skin_mushroom_cap",
        "name": "버섯 모자(머리)",
        "images": "`skin_mushroom_cap` 1장",
        "idle": "rotation +-3도, 2600ms 주기",
        "react": "동일",
        "cond": "동일",
        "ms": "240ms",
        "cap": "1개"
      },
      {
        "g": "스킨",
        "id": "skin_lily_umbrella",
        "name": "연잎 우산(머리)",
        "images": "`skin_lily_umbrella` 1장",
        "idle": "rotation +-5도, 2200ms 주기",
        "react": "동일",
        "cond": "동일",
        "ms": "240ms",
        "cap": "1개"
      },
      {
        "g": "스킨",
        "id": "skin_acorn_cap",
        "name": "도토리 모자(머리)",
        "images": "`skin_acorn_cap` 1장",
        "idle": "rotation +-3도, 2800ms 주기",
        "react": "동일",
        "cond": "동일",
        "ms": "240ms",
        "cap": "1개"
      }
    ],
    "friends": [
      {
        "g": "꽃 친구",
        "id": "friend_daisy",
        "name": "데이지",
        "images": "`friend_daisy` 1장(정지 이미지)",
        "idle": "scale 1.0<->1.03, 1800ms 주기(위상 무작위)",
        "react": "이동: 600ms 포물선 깡총(높이 12px)과 착지 squash 100ms(R37). 탭: 높이 20px 점프 300ms와 하트 입자 3개(F40)",
        "cond": "정원에서 보유 시 계속",
        "ms": "600ms / 300ms",
        "cap": "친구 최대 5(저사양 이동 2), 밤 몸 tint 0xc8d0f0"
      },
      {
        "g": "꽃 친구",
        "id": "friend_tulip",
        "name": "튤립",
        "images": "`friend_tulip` 1장(정지 이미지)",
        "idle": "scale 1.0<->1.03, 1800ms 주기(위상 무작위)",
        "react": "이동: 600ms 포물선 깡총(높이 12px)과 착지 squash 100ms(R37). 탭: 높이 20px 점프 300ms와 하트 입자 3개(F40)",
        "cond": "정원에서 보유 시 계속",
        "ms": "600ms / 300ms",
        "cap": "친구 최대 5(저사양 이동 2), 밤 몸 tint 0xc8d0f0"
      },
      {
        "g": "꽃 친구",
        "id": "friend_bellflower",
        "name": "초롱꽃",
        "images": "`friend_bellflower` 1장(정지 이미지)",
        "idle": "scale 1.0<->1.03, 1800ms 주기(위상 무작위)",
        "react": "이동: 600ms 포물선 깡총(높이 12px)과 착지 squash 100ms(R37). 탭: 높이 20px 점프 300ms와 하트 입자 3개(F40)",
        "cond": "정원에서 보유 시 계속",
        "ms": "600ms / 300ms",
        "cap": "친구 최대 5(저사양 이동 2), 밤 몸 tint 0xc8d0f0"
      },
      {
        "g": "꽃 친구",
        "id": "friend_waterlily",
        "name": "수련",
        "images": "`friend_waterlily` 1장(정지 이미지)",
        "idle": "scale 1.0<->1.03, 1800ms 주기(위상 무작위)",
        "react": "이동: 600ms 포물선 깡총(높이 12px)과 착지 squash 100ms(R37). 탭: 높이 20px 점프 300ms와 하트 입자 3개(F40)",
        "cond": "정원에서 보유 시 계속",
        "ms": "600ms / 300ms",
        "cap": "친구 최대 5(저사양 이동 2), 밤 몸 tint 0xc8d0f0"
      },
      {
        "g": "꽃 친구",
        "id": "friend_sunflower",
        "name": "해바라기",
        "images": "`friend_sunflower` 1장(정지 이미지)",
        "idle": "scale 1.0<->1.03, 1800ms 주기(위상 무작위)",
        "react": "이동: 600ms 포물선 깡총(높이 12px)과 착지 squash 100ms(R37). 탭: 높이 20px 점프 300ms와 하트 입자 3개(F40)",
        "cond": "정원에서 보유 시 계속",
        "ms": "600ms / 300ms",
        "cap": "친구 최대 5(저사양 이동 2), 밤 몸 tint 0xc8d0f0"
      }
    ],
    "grounds": [
      {
        "g": "정원 바닥",
        "id": "b1_grass_path",
        "name": "잔디 디딤길",
        "images": "`b1_grass_path` 1장(상태 없음)",
        "idle": "정적",
        "react": "배치: 150ms squash(F37)",
        "cond": "-",
        "ms": "-",
        "cap": "-",
        "night": "밤 tint 0x8c96d0(3000ms), 빛 없음"
      },
      {
        "g": "정원 바닥",
        "id": "b2_petal_path",
        "name": "꽃잎 길",
        "images": "`b2_petal_path` 1장(상태 없음)",
        "idle": "정적",
        "react": "배치: 150ms squash(F37)",
        "cond": "-",
        "ms": "-",
        "cap": "-",
        "night": "밤 tint 0x8c96d0(3000ms), 빛 없음"
      },
      {
        "g": "정원 바닥",
        "id": "b3_moss_floor",
        "name": "이끼 바닥",
        "images": "`b3_moss_floor` 1장(상태 없음)",
        "idle": "정적",
        "react": "배치: 150ms squash(F37)",
        "cond": "-",
        "ms": "-",
        "cap": "-",
        "night": "밤 tint 0x8c96d0(3000ms), 빛 없음"
      },
      {
        "g": "정원 바닥",
        "id": "b4_stepping_stone",
        "name": "디딤돌",
        "images": "`b4_stepping_stone` 1장(상태 없음)",
        "idle": "정적",
        "react": "배치: 150ms squash(F37)",
        "cond": "-",
        "ms": "-",
        "cap": "-",
        "night": "밤 tint 0x8c96d0(3000ms), 빛 없음"
      },
      {
        "g": "정원 바닥",
        "id": "b5_leaf_floor",
        "name": "낙엽 바닥",
        "images": "`b5_leaf_floor` 1장(상태 없음)",
        "idle": "정적",
        "react": "배치: 150ms squash(F37)",
        "cond": "-",
        "ms": "-",
        "cap": "-",
        "night": "밤 tint 0x8c96d0(3000ms), 빛 없음"
      }
    ],
    "decors": [
      {
        "g": "정원 장식",
        "id": "b1_moss_bench",
        "name": "이끼 돌 의자",
        "images": "`b1_moss_bench` 1장(상태 없음)",
        "idle": "정적",
        "react": "배치: 150ms squash와 풀잎 입자 4개(F37)",
        "cond": "카메라 화면 안에 있을 때",
        "ms": "-",
        "cap": "-",
        "night": "밤 tint 0x8c96d0(3000ms), 빛 없음"
      },
      {
        "g": "정원 장식",
        "id": "b1_wind_chime",
        "name": "이슬 풍경",
        "images": "`b1_wind_chime` 1장(상태 없음)",
        "idle": "rotation +-5도, 2400ms 주기(윗부분 기준점)",
        "react": "배치: 150ms squash와 풀잎 입자 4개(F37)",
        "cond": "카메라 화면 안에 있을 때",
        "ms": "주기는 대기 칸",
        "cap": "장식 대기 상한 포함",
        "night": "밤 tint 0x8c96d0(3000ms), 빛 없음"
      },
      {
        "g": "정원 장식",
        "id": "b1_sprout_bed",
        "name": "새싹 화단",
        "images": "`b1_sprout_bed` 1장(상태 없음)",
        "idle": "skewX +-3도, 3000ms 주기",
        "react": "배치: 150ms squash와 풀잎 입자 4개(F37)",
        "cond": "카메라 화면 안에 있을 때",
        "ms": "주기는 대기 칸",
        "cap": "장식 대기 상한 포함",
        "night": "밤 tint 0x8c96d0(3000ms), 빛 없음"
      },
      {
        "g": "정원 장식",
        "id": "b1_wood_fence",
        "name": "나무 울타리",
        "images": "`b1_wood_fence` 1장(상태 없음)",
        "idle": "정적",
        "react": "배치: 150ms squash와 풀잎 입자 4개(F37)",
        "cond": "카메라 화면 안에 있을 때",
        "ms": "-",
        "cap": "-",
        "night": "밤 tint 0x8c96d0(3000ms), 빛 없음"
      },
      {
        "g": "정원 장식",
        "id": "b1_small_well",
        "name": "작은 우물",
        "images": "`b1_small_well` 1장(상태 없음)",
        "idle": "정적",
        "react": "배치: 150ms squash와 풀잎 입자 4개(F37)",
        "cond": "카메라 화면 안에 있을 때",
        "ms": "-",
        "cap": "-",
        "night": "밤 tint 0x8c96d0(3000ms), 빛 없음"
      },
      {
        "g": "정원 장식",
        "id": "b2_petal_lamp",
        "name": "꽃잎 가로등",
        "images": "`b2_petal_lamp` 1장(상태 없음)",
        "idle": "정적",
        "react": "배치: 150ms squash와 풀잎 입자 4개(F37)",
        "cond": "카메라 화면 안에 있을 때",
        "ms": "-",
        "cap": "-",
        "night": "밤 tint 0x8c96d0 + 빛 번짐(`glow` 코드 원 반지름 48px, 밤 alpha 0.5 + 0.1 깜빡임 2000ms, 해 질 녘 0.25, 새벽 0.2)"
      },
      {
        "g": "정원 장식",
        "id": "b2_flower_arch",
        "name": "꽃 아치",
        "images": "`b2_flower_arch` 1장(상태 없음)",
        "idle": "정적",
        "react": "배치: 150ms squash와 풀잎 입자 4개(F37)",
        "cond": "카메라 화면 안에 있을 때",
        "ms": "-",
        "cap": "-",
        "night": "밤 tint 0x8c96d0(3000ms), 빛 없음"
      },
      {
        "g": "정원 장식",
        "id": "b2_sunset_bench",
        "name": "노을 벤치",
        "images": "`b2_sunset_bench` 1장(상태 없음)",
        "idle": "정적",
        "react": "배치: 150ms squash와 풀잎 입자 4개(F37)",
        "cond": "카메라 화면 안에 있을 때",
        "ms": "-",
        "cap": "-",
        "night": "밤 tint 0x8c96d0(3000ms), 빛 없음"
      },
      {
        "g": "정원 장식",
        "id": "b2_ribbon_pole",
        "name": "리본 기둥",
        "images": "`b2_ribbon_pole` 1장(상태 없음)",
        "idle": "전체 스프라이트 rotation +-6도, 1800ms 주기(윗부분 기준점)",
        "react": "배치: 150ms squash와 풀잎 입자 4개(F37)",
        "cond": "카메라 화면 안에 있을 때",
        "ms": "주기는 대기 칸",
        "cap": "장식 대기 상한 포함",
        "night": "밤 tint 0x8c96d0(3000ms), 빛 없음"
      },
      {
        "g": "정원 장식",
        "id": "b2_flower_cart",
        "name": "꽃 수레",
        "images": "`b2_flower_cart` 1장(상태 없음)",
        "idle": "정적",
        "react": "배치: 150ms squash와 풀잎 입자 4개(F37)",
        "cond": "카메라 화면 안에 있을 때",
        "ms": "-",
        "cap": "-",
        "night": "밤 tint 0x8c96d0(3000ms), 빛 없음"
      },
      {
        "g": "정원 장식",
        "id": "b3_mushroom_lamp",
        "name": "버섯 등불",
        "images": "`b3_mushroom_lamp` 1장(상태 없음)",
        "idle": "정적",
        "react": "배치: 150ms squash와 풀잎 입자 4개(F37)",
        "cond": "카메라 화면 안에 있을 때",
        "ms": "-",
        "cap": "-",
        "night": "밤 tint 0x8c96d0 + 빛 번짐(`glow` 코드 원 반지름 48px, 밤 alpha 0.5 + 0.1 깜빡임 2000ms, 해 질 녘 0.25, 새벽 0.2)"
      },
      {
        "g": "정원 장식",
        "id": "b3_log_stool",
        "name": "통나무 의자",
        "images": "`b3_log_stool` 1장(상태 없음)",
        "idle": "정적",
        "react": "배치: 150ms squash와 풀잎 입자 4개(F37)",
        "cond": "카메라 화면 안에 있을 때",
        "ms": "-",
        "cap": "-",
        "night": "밤 tint 0x8c96d0(3000ms), 빛 없음"
      },
      {
        "g": "정원 장식",
        "id": "b3_firefly_jar",
        "name": "반딧불 병",
        "images": "`b3_firefly_jar` 1장(상태 없음)",
        "idle": "낮 정적. 밤에만 빛 입자 3개가 병 안에서 위아래 8px, 2400ms 주기",
        "react": "배치: 150ms squash와 풀잎 입자 4개(F37)",
        "cond": "카메라 화면 안에 있을 때",
        "ms": "주기는 대기 칸",
        "cap": "장식 대기 상한 포함(밤)",
        "night": "밤 tint 0x8c96d0 + 빛 번짐(`glow` 코드 원 반지름 48px, 밤 alpha 0.5 + 0.1 깜빡임 2000ms, 해 질 녘 0.25, 새벽 0.2)"
      },
      {
        "g": "정원 장식",
        "id": "b3_tree_stump",
        "name": "나무 그루터기",
        "images": "`b3_tree_stump` 1장(상태 없음)",
        "idle": "정적",
        "react": "배치: 150ms squash와 풀잎 입자 4개(F37)",
        "cond": "카메라 화면 안에 있을 때",
        "ms": "-",
        "cap": "-",
        "night": "밤 tint 0x8c96d0(3000ms), 빛 없음"
      },
      {
        "g": "정원 장식",
        "id": "b3_toadstool_ring",
        "name": "버섯 고리",
        "images": "`b3_toadstool_ring` 1장(상태 없음)",
        "idle": "정적",
        "react": "배치: 150ms squash와 풀잎 입자 4개(F37)",
        "cond": "카메라 화면 안에 있을 때",
        "ms": "-",
        "cap": "-",
        "night": "밤 tint 0x8c96d0(3000ms), 빛 없음"
      },
      {
        "g": "정원 장식",
        "id": "b4_stone_lantern",
        "name": "돌 등롱",
        "images": "`b4_stone_lantern` 1장(상태 없음)",
        "idle": "정적",
        "react": "배치: 150ms squash와 풀잎 입자 4개(F37)",
        "cond": "카메라 화면 안에 있을 때",
        "ms": "-",
        "cap": "-",
        "night": "밤 tint 0x8c96d0 + 빛 번짐(`glow` 코드 원 반지름 48px, 밤 alpha 0.5 + 0.1 깜빡임 2000ms, 해 질 녘 0.25, 새벽 0.2)"
      },
      {
        "g": "정원 장식",
        "id": "b4_frog_statue",
        "name": "개구리 조각상",
        "images": "`b4_frog_statue` 1장(상태 없음)",
        "idle": "정적",
        "react": "배치: 150ms squash와 풀잎 입자 4개(F37)",
        "cond": "카메라 화면 안에 있을 때",
        "ms": "-",
        "cap": "-",
        "night": "밤 tint 0x8c96d0(3000ms), 빛 없음"
      },
      {
        "g": "정원 장식",
        "id": "b4_lily_pot",
        "name": "수련 화분",
        "images": "`b4_lily_pot` 1장(상태 없음)",
        "idle": "scale 1.0<->1.03, 3000ms 주기",
        "react": "배치: 150ms squash와 풀잎 입자 4개(F37)",
        "cond": "카메라 화면 안에 있을 때",
        "ms": "주기는 대기 칸",
        "cap": "장식 대기 상한 포함",
        "night": "밤 tint 0x8c96d0(3000ms), 빛 없음"
      },
      {
        "g": "정원 장식",
        "id": "b4_small_bridge",
        "name": "작은 다리",
        "images": "`b4_small_bridge` 1장(상태 없음)",
        "idle": "정적",
        "react": "배치: 150ms squash와 풀잎 입자 4개(F37)",
        "cond": "카메라 화면 안에 있을 때",
        "ms": "-",
        "cap": "-",
        "night": "밤 tint 0x8c96d0(3000ms), 빛 없음"
      },
      {
        "g": "정원 장식",
        "id": "b4_reed_bunch",
        "name": "갈대 다발",
        "images": "`b4_reed_bunch` 1장(상태 없음)",
        "idle": "skewX +-4도, 2600ms 주기",
        "react": "배치: 150ms squash와 풀잎 입자 4개(F37)",
        "cond": "카메라 화면 안에 있을 때",
        "ms": "주기는 대기 칸",
        "cap": "장식 대기 상한 포함",
        "night": "밤 tint 0x8c96d0(3000ms), 빛 없음"
      },
      {
        "g": "정원 장식",
        "id": "b5_pinwheel",
        "name": "바람개비",
        "images": "`b5_pinwheel`(기둥) + `b5_pinwheel_head`(날개 겹침 레이어) 2장",
        "idle": "날개 레이어 회전 90도/초",
        "react": "배치: 150ms squash와 풀잎 입자 4개(F37)",
        "cond": "카메라 화면 안에 있을 때",
        "ms": "주기는 대기 칸",
        "cap": "장식 대기 상한 포함",
        "night": "밤 tint 0x8c96d0(3000ms), 빛 없음"
      },
      {
        "g": "정원 장식",
        "id": "b5_acorn_pile",
        "name": "도토리 더미",
        "images": "`b5_acorn_pile` 1장(상태 없음)",
        "idle": "정적",
        "react": "배치: 150ms squash와 풀잎 입자 4개(F37)",
        "cond": "카메라 화면 안에 있을 때",
        "ms": "-",
        "cap": "-",
        "night": "밤 tint 0x8c96d0(3000ms), 빛 없음"
      },
      {
        "g": "정원 장식",
        "id": "b5_scarecrow",
        "name": "허수아비",
        "images": "`b5_scarecrow` 1장(상태 없음)",
        "idle": "rotation +-3도, 3000ms 주기(발 기준점)",
        "react": "배치: 150ms squash와 풀잎 입자 4개(F37)",
        "cond": "카메라 화면 안에 있을 때",
        "ms": "주기는 대기 칸",
        "cap": "장식 대기 상한 포함",
        "night": "밤 tint 0x8c96d0(3000ms), 빛 없음"
      },
      {
        "g": "정원 장식",
        "id": "b5_kite_pole",
        "name": "연 기둥",
        "images": "`b5_kite_pole` 1장(상태 없음)",
        "idle": "rotation +-4도, 2000ms 주기(발 기준점)",
        "react": "배치: 150ms squash와 풀잎 입자 4개(F37)",
        "cond": "카메라 화면 안에 있을 때",
        "ms": "주기는 대기 칸",
        "cap": "장식 대기 상한 포함",
        "night": "밤 tint 0x8c96d0(3000ms), 빛 없음"
      },
      {
        "g": "정원 장식",
        "id": "b5_hay_bale",
        "name": "건초 더미",
        "images": "`b5_hay_bale` 1장(상태 없음)",
        "idle": "정적",
        "react": "배치: 150ms squash와 풀잎 입자 4개(F37)",
        "cond": "카메라 화면 안에 있을 때",
        "ms": "-",
        "cap": "-",
        "night": "밤 tint 0x8c96d0(3000ms), 빛 없음"
      }
    ],
    "buildings": [
      {
        "g": "정원 건물",
        "id": "b1_gardener_hut",
        "name": "정원사 오두막",
        "images": "`b1_gardener_hut_build`, `b1_gardener_hut_day`, `b1_gardener_hut_night` 3장",
        "idle": "굴뚝 연기: 700ms마다 입자 1개(수명 2000ms, 위로 28px, 오른쪽 6px 흐름, scale 0.4->1.0, alpha 0.5->0), 굴뚝당 동시 3개",
        "react": "건설: 3-11 공통 시퀀스(건설 중 이미지 3000ms -> 현재 시간대 이미지로 300ms 크로스페이드)",
        "cond": "보관함에서 놓을 때 건설 시작 -> 3000ms 후 완공",
        "ms": "3000ms + 350ms",
        "cap": "건물 애니메이션 상한 포함",
        "night": "밤 19~05시 밤 이미지, 05~19시 낮 이미지(새벽·해 질 녘은 낮 이미지 + tint). 창문 빛 2곳"
      },
      {
        "g": "정원 건물",
        "id": "b1_veggie_patch",
        "name": "텃밭",
        "images": "`b1_veggie_patch_build`, `b1_veggie_patch_day`, `b1_veggie_patch_night` 3장",
        "idle": "살랑 숨쉬기 scaleY 1.0<->1.015, 3000ms 주기",
        "react": "건설: 3-11 공통 시퀀스(건설 중 이미지 3000ms -> 현재 시간대 이미지로 300ms 크로스페이드)",
        "cond": "보관함에서 놓을 때 건설 시작 -> 3000ms 후 완공",
        "ms": "3000ms + 350ms",
        "cap": "건물 애니메이션 상한 포함",
        "night": "밤 19~05시 밤 이미지, 05~19시 낮 이미지(새벽·해 질 녘은 낮 이미지 + tint). 창문 빛 1곳(등불)"
      },
      {
        "g": "정원 건물",
        "id": "b2_flower_shop",
        "name": "꽃 가게",
        "images": "`b2_flower_shop_build`, `b2_flower_shop_day`, `b2_flower_shop_night` 3장 + `fx_flag` 깃발 겹침 레이어(공용 1장)",
        "idle": "깃발 rotation +-8도, 1400ms 주기(깃대 기준점)",
        "react": "건설: 3-11 공통 시퀀스(건설 중 이미지 3000ms -> 현재 시간대 이미지로 300ms 크로스페이드)",
        "cond": "보관함에서 놓을 때 건설 시작 -> 3000ms 후 완공",
        "ms": "3000ms + 350ms",
        "cap": "건물 애니메이션 상한 포함",
        "night": "밤 19~05시 밤 이미지, 05~19시 낮 이미지(새벽·해 질 녘은 낮 이미지 + tint). 창문 빛 2곳"
      },
      {
        "g": "정원 건물",
        "id": "b2_windmill",
        "name": "풍차",
        "images": "`b2_windmill_build`, `b2_windmill_day`, `b2_windmill_night` 3장 + `b2_windmill_blades` 날개 겹침 레이어 1장",
        "idle": "날개 회전 60도/초",
        "react": "건설: 3-11 공통 시퀀스(건설 중 이미지 3000ms -> 현재 시간대 이미지로 300ms 크로스페이드)",
        "cond": "보관함에서 놓을 때 건설 시작 -> 3000ms 후 완공",
        "ms": "3000ms + 350ms",
        "cap": "건물 애니메이션 상한 포함",
        "night": "밤 19~05시 밤 이미지, 05~19시 낮 이미지(새벽·해 질 녘은 낮 이미지 + tint). 창문 빛 1곳"
      },
      {
        "g": "정원 건물",
        "id": "b3_mushroom_house",
        "name": "버섯 집",
        "images": "`b3_mushroom_house_build`, `b3_mushroom_house_day`, `b3_mushroom_house_night` 3장",
        "idle": "굴뚝 연기(오두막과 같은 값)",
        "react": "건설: 3-11 공통 시퀀스(건설 중 이미지 3000ms -> 현재 시간대 이미지로 300ms 크로스페이드)",
        "cond": "보관함에서 놓을 때 건설 시작 -> 3000ms 후 완공",
        "ms": "3000ms + 350ms",
        "cap": "건물 애니메이션 상한 포함",
        "night": "밤 19~05시 밤 이미지, 05~19시 낮 이미지(새벽·해 질 녘은 낮 이미지 + tint). 창문 빛 2곳"
      },
      {
        "g": "정원 건물",
        "id": "b3_tree_swing",
        "name": "나무 그네",
        "images": "`b3_tree_swing_build`, `b3_tree_swing_day`, `b3_tree_swing_night` 3장",
        "idle": "그네 전체 rotation +-2도, 2600ms 주기(윗부분 기준점)",
        "react": "건설: 3-11 공통 시퀀스(건설 중 이미지 3000ms -> 현재 시간대 이미지로 300ms 크로스페이드)",
        "cond": "보관함에서 놓을 때 건설 시작 -> 3000ms 후 완공",
        "ms": "3000ms + 350ms",
        "cap": "건물 애니메이션 상한 포함",
        "night": "밤 19~05시 밤 이미지, 05~19시 낮 이미지(새벽·해 질 녘은 낮 이미지 + tint). 창문 빛 1곳(등불)"
      },
      {
        "g": "정원 건물",
        "id": "b4_pavilion",
        "name": "정자",
        "images": "`b4_pavilion_build`, `b4_pavilion_day`, `b4_pavilion_night` 3장 + `fx_flag`(공용 깃발 레이어)",
        "idle": "깃발 rotation +-8도, 1400ms 주기",
        "react": "건설: 3-11 공통 시퀀스(건설 중 이미지 3000ms -> 현재 시간대 이미지로 300ms 크로스페이드)",
        "cond": "보관함에서 놓을 때 건설 시작 -> 3000ms 후 완공",
        "ms": "3000ms + 350ms",
        "cap": "건물 애니메이션 상한 포함",
        "night": "밤 19~05시 밤 이미지, 05~19시 낮 이미지(새벽·해 질 녘은 낮 이미지 + tint). 창문 빛 2곳(등불)"
      },
      {
        "g": "정원 건물",
        "id": "b4_water_mill",
        "name": "물레방아",
        "images": "`b4_water_mill_build`, `b4_water_mill_day`, `b4_water_mill_night` 3장 + `b4_water_mill_wheel` 바퀴 겹침 레이어 1장",
        "idle": "바퀴 회전 30도/초",
        "react": "건설: 3-11 공통 시퀀스(건설 중 이미지 3000ms -> 현재 시간대 이미지로 300ms 크로스페이드)",
        "cond": "보관함에서 놓을 때 건설 시작 -> 3000ms 후 완공",
        "ms": "3000ms + 350ms",
        "cap": "건물 애니메이션 상한 포함",
        "night": "밤 19~05시 밤 이미지, 05~19시 낮 이미지(새벽·해 질 녘은 낮 이미지 + tint). 창문 빛 1곳"
      },
      {
        "g": "정원 건물",
        "id": "b5_wind_tower",
        "name": "풍향 탑",
        "images": "`b5_wind_tower_build`, `b5_wind_tower_day`, `b5_wind_tower_night` 3장 + `b5_wind_tower_vane` 풍향계 겹침 레이어 1장",
        "idle": "풍향계 rotation +-25도, 3000ms 주기",
        "react": "건설: 3-11 공통 시퀀스(건설 중 이미지 3000ms -> 현재 시간대 이미지로 300ms 크로스페이드)",
        "cond": "보관함에서 놓을 때 건설 시작 -> 3000ms 후 완공",
        "ms": "3000ms + 350ms",
        "cap": "건물 애니메이션 상한 포함",
        "night": "밤 19~05시 밤 이미지, 05~19시 낮 이미지(새벽·해 질 녘은 낮 이미지 + tint). 창문 빛 1곳"
      },
      {
        "g": "정원 건물",
        "id": "b5_squirrel_house",
        "name": "다람쥐 나무집",
        "images": "`b5_squirrel_house_build`, `b5_squirrel_house_day`, `b5_squirrel_house_night` 3장",
        "idle": "굴뚝 연기(오두막과 같은 값)",
        "react": "건설: 3-11 공통 시퀀스(건설 중 이미지 3000ms -> 현재 시간대 이미지로 300ms 크로스페이드)",
        "cond": "보관함에서 놓을 때 건설 시작 -> 3000ms 후 완공",
        "ms": "3000ms + 350ms",
        "cap": "건물 애니메이션 상한 포함",
        "night": "밤 19~05시 밤 이미지, 05~19시 낮 이미지(새벽·해 질 녘은 낮 이미지 + tint). 창문 빛 2곳"
      }
    ],
    "themes": [
      {
        "g": "보드 테마",
        "id": "theme_default",
        "name": "기본(챕터 따라감)",
        "images": "`fx_dew_mote` 1장(작은 빛방울)",
        "idle": "빛방울 위로 12px/초, 수명 4000ms, 동시 8개",
        "react": "적용 시 배경 400ms 크로스페이드(F42)",
        "cond": "플레이·메뉴 화면",
        "ms": "400ms",
        "cap": "입자 8(저사양 4)"
      },
      {
        "g": "보드 테마",
        "id": "theme_blossom",
        "name": "벚꽃 봄",
        "images": "`fx_blossom` 1장(꽃잎)",
        "idle": "아래로 24px/초, 좌우 +-10px 흔들림 2000ms 주기, 회전 60도/초, 동시 12개",
        "react": "동일",
        "cond": "동일",
        "ms": "400ms",
        "cap": "12(저사양 6)"
      },
      {
        "g": "보드 테마",
        "id": "theme_starnight",
        "name": "별빛 밤",
        "images": "`fx_star_twinkle` 1장",
        "idle": "제자리 alpha 0.3<->1.0, 1500~3000ms 주기, 동시 12개",
        "react": "동일",
        "cond": "동일",
        "ms": "400ms",
        "cap": "12(저사양 6)"
      },
      {
        "g": "보드 테마",
        "id": "theme_snowflake",
        "name": "눈꽃 겨울",
        "images": "`fx_snow` 1장",
        "idle": "아래로 30px/초, 좌우 +-8px 흔들림, 동시 14개",
        "react": "동일",
        "cond": "동일",
        "ms": "400ms",
        "cap": "14(저사양 7)"
      },
      {
        "g": "보드 테마",
        "id": "theme_candy",
        "name": "사탕 정원",
        "images": "`fx_sprinkle` 1장",
        "idle": "아래로 20px/초, 회전 90도/초, 동시 10개",
        "react": "동일",
        "cond": "동일",
        "ms": "400ms",
        "cap": "10(저사양 5)"
      },
      {
        "g": "보드 테마",
        "id": "theme_rainbowcloud",
        "name": "무지개 구름",
        "images": "`fx_cloud_puff` 1장",
        "idle": "오른쪽으로 10px/초, scale 0.8<->1.0, 동시 6개",
        "react": "동일",
        "cond": "동일",
        "ms": "400ms",
        "cap": "6(저사양 3)"
      }
    ],
    "sky": [
      {
        "g": "정원 하늘",
        "id": "sky_gradient",
        "name": "하늘 그라데이션",
        "images": "이미지 없음(코드 그라데이션 4세트)",
        "idle": "정적",
        "react": "시간대가 바뀌면 3000ms 크로스페이드",
        "cond": "정원 화면 뒤",
        "ms": "3000ms",
        "cap": "1",
        "night": "4세트가 시간대별 색(3-10)"
      },
      {
        "g": "정원 하늘",
        "id": "sun_moon",
        "name": "해/달",
        "images": "`sun`, `moon` 2장",
        "idle": "해: 새벽 왼쪽 낮은 곳, 낮 위쪽, 해 질 녘 오른쪽 낮은 곳. 달: 밤 위쪽",
        "react": "시간대 전환 시 위치/alpha 3000ms 트윈",
        "cond": "정원 화면",
        "ms": "3000ms",
        "cap": "1",
        "night": "밤에는 달만 보임"
      },
      {
        "g": "정원 하늘",
        "id": "cloud",
        "name": "구름",
        "images": "`cloud` 1장(3개 배치)",
        "idle": "오른쪽으로 8px/초 흐름, 화면 밖으로 나가면 왼쪽에서 재등장",
        "react": "밤 alpha 0.25 + tint 0x6a78b0, 새벽·해 질 녘은 건물과 같은 tint",
        "cond": "정원 화면",
        "ms": "3000ms",
        "cap": "3",
        "night": "alpha 0.25 + tint 0x6a78b0"
      },
      {
        "g": "정원 하늘",
        "id": "star_dots",
        "name": "밤 별",
        "images": "이미지 없음(코드 점 24개)",
        "idle": "alpha 0.4<->1.0, 1500~3000ms 주기",
        "react": "밤에만 3000ms 페이드인",
        "cond": "밤 19~05시(해 질 녘 후반 18~19시에 8개 먼저)",
        "ms": "3000ms",
        "cap": "24(저사양 12)",
        "night": "밤에만"
      }
    ]
  },
  "elementVisualsFallbackOrder": {
    "note": "에셋 우선순위(규칙 변경이 아니라 예산 부족 시 대체 순서): 판 위 요소(3-12-1 칸 요소와 UI)와 170스테이지 검증이 먼저다. 에셋 3MB 예산이 모자라면 (1) 건물 `_night` 10장 -> (2) 겹침 레이어 5장(풍차 날개, 물레방아 바퀴, 풍향계, 공용 깃발, 바람개비 날개) -> (3) 1x1 장식의 대기 움직임 순으로 줄이고, 줄인 것은 `_day` + 밤 tint의 정적 표현으로 대체한다(건물은 `_night` 없이 `_day`에 밤 tint 0x8c96d0와 창문 빛 코드 원만, 겹침 레이어가 없으면 그 건물 전체 스프라이트의 작은 흔들림 또는 정적, 장식은 정적). R44~R47의 수치는 그대로이고, 대체는 에셋 리뷰와 사람 확인 뒤에만 한다.",
    "priority": [
      "board elements and 170-stage validation first"
    ],
    "fallbackOrder": [
      "building _night x10 -> _day + night tint",
      "overlay layers x5 -> static or whole-sprite sway",
      "1x1 decor idle motion -> static"
    ],
    "ruleChange": false,
    "budgetMegabyteCount": 3
  },
  "gardenNightHintSec": 2.5,
  "gardenNightHintDelayMs": 400,
  "gardenNightHintFadeMs": 150,
  "nightHint": {
    "textKey": "garden.nightHint",
    "ko": "밤에는 창문에 불이 켜져요",
    "en": "Windows light up at night",
    "saveField": "gardenNightHintSeen",
    "saveDefault": false,
    "skipIfFirstBuildIsNight": true,
    "markSeenAtShow": true
  },
  "dewTurnSquashMs": 80,
  "dewRapidTurnWindowMs": 250,
  "dewRapidTurnCount": 3,
  "dewSideEyeGapPx": 10,
  "dewSideEyeShiftPx": 6,
  "dewBodyLeftSizePx": 256,
  "dewDirection": {
    "bodyImages": [
      "dew_body",
      "dew_body_left"
    ],
    "rightMirrorsLeft": true,
    "map": {
      "left": {
        "body": "dew_body_left",
        "face": "side",
        "scaleXRatio": 1
      },
      "right": {
        "body": "dew_body_left",
        "face": "side",
        "scaleXRatio": -1
      },
      "down": {
        "body": "dew_body",
        "face": "front"
      },
      "up": {
        "body": "dew_body",
        "face": "hidden"
      },
      "stop": {
        "body": "dew_body",
        "face": "front"
      }
    },
    "swapTiming": "slide start frame, immediate, no crossfade, 80ms squash tween",
    "swapOnStop": "immediate at squash start",
    "sideFaceProposal": {
      "eyeGapPx": 10,
      "eyeShiftPx": 6,
      "eyeSizePx": "6x9",
      "mouthShiftPx": 4,
      "mouthWidthPx": 6,
      "confirmedBy": "design",
      "cheekCount": 1
    },
    "rapidTurn": {
      "windowMs": 250,
      "apply": "last direction only",
      "minCount": 3
    }
  }
};
