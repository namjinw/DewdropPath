// type="module" 을 지원하지 않는 브라우저에서만 실행된다 (index.html 의 nomodule 스크립트). 게임을 시작할 수 없다고 안내한다.
// ES5 문법으로 쓴다.
(function () {
  if (window.__dewGuard) window.__dewGuard.fail('unsupported');
})();
