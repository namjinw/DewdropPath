// 시작 실패 안내. 게임이 시작하지 못했을 때 빈 화면 대신 이유와 다음 행동을 보여 준다.
// ES5 문법으로 쓴다: 모듈을 지원하지 않는 오래된 브라우저에서도 이 파일은 실행되어야 한다.
// 흐름: 게임이 메뉴로 넘어가기 직전(BootScene.create)에 ready() 를 부르면 그 뒤의 오류는 안내하지 않는다(게임을 멈추지 않는다).
// ready() 전의 오류만 시작 실패로 본다. 우리 사이트의 파일에서 난 오류만 세어, 브라우저 확장 프로그램의 오류로 잘못 띄우지 않는다.
(function () {
  var ready = false;
  var shown = false;
  var ko = /^ko/i.test(navigator.language || '');
  var TEXT = ko
    ? {
      title: '게임을 시작하지 못했어요',
      unsupported: '이 브라우저에서는 게임을 실행할 수 없어요. 최신 버전의 Chrome, Safari, Edge, Firefox로 열어 주세요.',
      error: '일시적인 문제일 수 있어요. 새로고침해도 안 되면 브라우저를 최신 버전으로 업데이트하거나 다른 브라우저로 열어 주세요.',
      reload: '새로고침'
    }
    : {
      title: 'The game could not start',
      unsupported: 'This browser cannot run the game. Please open it in the latest Chrome, Safari, Edge or Firefox.',
      error: 'This may be temporary. If reloading does not help, update your browser or try a different one.',
      reload: 'Reload'
    };

  function el(tag, css, text) {
    var e = document.createElement(tag);
    if (css) e.style.cssText = css;
    if (text) e.textContent = text;
    return e;
  }

  // kind: 'unsupported' | 'load' | 'error'. detail 은 문의할 때 알려 줄 수 있게 작게 보여 준다(글자만 넣는다)
  function show(kind, detail) {
    if (ready || shown) return;
    shown = true;
    try {
      var wrap = el('div', 'position:fixed;left:0;top:0;right:0;bottom:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:24px;box-sizing:border-box;background:#233F33;color:#FFFFFF;font-family:Jua,sans-serif;text-align:center');
      wrap.id = 'start-error';
      wrap.setAttribute('role', 'alert');
      var box = el('div', 'max-width:420px');
      box.appendChild(el('div', 'font-size:28px;margin-bottom:14px', TEXT.title));
      box.appendChild(el('div', 'font-size:18px;line-height:1.5;color:#E4F5E4', kind === 'unsupported' ? TEXT.unsupported : TEXT.error));
      var btn = el('button', 'margin-top:22px;padding:12px 28px;font:20px Jua,sans-serif;color:#2B4A3B;background:#A3E8C6;border:0;border-radius:14px;cursor:pointer', TEXT.reload);
      btn.type = 'button';
      btn.onclick = function () { location.reload(); };
      box.appendChild(btn);
      if (detail) box.appendChild(el('div', 'margin-top:18px;font:12px sans-serif;color:#9FB8A8;word-break:break-all', kind + ': ' + String(detail).slice(0, 120)));
      wrap.appendChild(box);
      (document.body || document.documentElement).appendChild(wrap);
    } catch (e) { /* 안내를 못 띄워도 더 할 수 있는 일이 없다 */ }
  }

  var own = function (url) { return !!url && String(url).indexOf(location.origin) === 0; };

  // 우리 스크립트(lib/, src/)를 못 불러온 경우는 error 이벤트가 window 가 아니라 요소에서 난다 -> 캡처 단계에서 잡는다
  window.addEventListener('error', function (e) {
    if (ready) return;
    var t = e.target;
    if (t && t !== window && t.tagName) {
      if (t.tagName === 'SCRIPT' && own(t.src) && /\/(lib|src)\//.test(t.src)) show('load', t.src.replace(location.origin, ''));
      return;
    }
    if (/ResizeObserver/.test(e.message || '')) return; // 무해한 브라우저 경고
    if (own(e.filename)) show('error', e.message);
  }, true);

  window.addEventListener('unhandledrejection', function (e) {
    if (ready) return;
    var r = e.reason;
    var stack = r && r.stack ? String(r.stack) : '';
    if (stack.indexOf(location.origin) >= 0) show('error', r.message || String(r));
  });

  window.__dewGuard = {
    ready: function () { ready = true; },
    fail: show
  };
})();
