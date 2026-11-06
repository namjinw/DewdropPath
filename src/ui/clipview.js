// 스크롤 목록용 잘림 영역: 보조 카메라의 뷰포트로 영역 밖을 깔끔하게 자른다 (필터 마스크 대신).
// 사용: const view = new ClipView(scene, { x, y, w, h, axis: 'y' }); view.add(obj); view.setScroll(px);
// 이 영역에 넣은 오브젝트는 보조 카메라만 그리고, 그 밖의 모든 오브젝트는 보조 카메라가 그리지 않는다.
export class ClipView {
  constructor(scene, rect) {
    this.scene = scene;
    this.rect = rect;
    this.axis = rect.axis || 'y';
    this.cam = scene.cameras.add(rect.x, rect.y, rect.w, rect.h);
    if (!scene.__hasClip) {
      scene.__hasClip = true;
      scene.events.once('shutdown', () => { scene.__hasClip = false; scene.__overlay = null; });
    }
    if (scene.__overlay) { const list = scene.cameras.cameras; const i = list.indexOf(scene.__overlay); if (i >= 0) { list.splice(i, 1); list.push(scene.__overlay); } }
    this.layer = scene.add.layer();
    scene.cameras.main.ignore(this.layer);
    this.scroll = 0;
    this.max = 0;
    this.pending = [];
    this.cam.ignore(scene.children.list.filter((o) => o !== this.layer));
    this.onAdd = (obj) => { if (obj !== this.layer) this.pending.push(obj); };
    this.flush = () => {
      if (!this.pending.length) return;
      for (const o of this.pending) {
        if (!o.scene || o === this.layer) continue;
        let root = o;
        while (root.parentContainer) root = root.parentContainer;
        if (root.displayList === this.layer) continue;
        this.cam.ignore(o);
      }
      this.pending.length = 0;
    };
    scene.events.on('addedtoscene', this.onAdd);
    scene.events.on('update', this.flush);
    scene.events.once('shutdown', () => { scene.events.off('addedtoscene', this.onAdd); scene.events.off('update', this.flush); });
    this.setScroll(0);
  }
  // 이 영역에 오브젝트를 넣는다. 보조 카메라가 이미 무시하도록 표시된 오브젝트라면 다시 그리게 한다
  add(obj) {
    this.layer.add(obj);
    this.unignore(obj);
    return obj;
  }
  unignore(obj) {
    obj.cameraFilter &= ~this.cam.id;
    if (obj.list) obj.list.forEach((c) => this.unignore(c));
  }
  contains(px, py) {
    const r = this.rect;
    return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
  }
  // 콘텐츠 전체 길이로 스크롤 한도를 정한다
  setContentSize(len) {
    this.max = Math.max(0, len - (this.axis === 'y' ? this.rect.h : this.rect.w));
    this.setScroll(this.scroll);
  }
  setScroll(s) {
    this.scroll = Math.max(0, Math.min(this.max, s));
    if (this.axis === 'y') this.cam.setScroll(this.rect.x, this.rect.y + this.scroll);
    else this.cam.setScroll(this.rect.x + this.scroll, this.rect.y);
    if (this.onScroll) this.onScroll(this.scroll);
    return this.scroll;
  }
  // 가장 가까운 칸 높이 배수로 부드럽게 맞춘다
  snapTo(step) {
    const target = Math.max(0, Math.min(this.max, Math.round(this.scroll / step) * step));
    this.scene.tweens.killTweensOf(this);
    const p = { v: this.scroll };
    this.scene.tweens.add({ targets: p, v: target, duration: 140, ease: 'Sine.easeOut', onUpdate: () => this.setScroll(p.v) });
  }
  // 끌어서 스크롤: 시작 위치와 이동 임계값을 넘기면 dragged 가 true. 탭과 구분하는 데 쓴다.
  enableDrag(snap) {
    const sc = this.scene;
    this.dragged = false;
    this.drag = null;
    sc.input.on('pointerdown', (p) => { this.dragged = false; this.drag = this.contains(p.x, p.y) ? { x: p.x, y: p.y, s: this.scroll } : null; });
    sc.input.on('pointermove', (p) => {
      if (!this.drag || !p.isDown) return;
      const d = this.axis === 'y' ? p.y - this.drag.y : p.x - this.drag.x;
      if (Math.abs(d) > 8) this.dragged = true;
      if (this.dragged) this.setScroll(this.drag.s - d);
    });
    sc.input.on('pointerup', () => {
      const was = this.drag && this.dragged;
      this.drag = null;
      if (was && snap) this.snapTo(snap);
    });
    sc.input.on('wheel', (p, over, dx, dy) => { if (this.contains(p.x, p.y)) this.setScroll(this.scroll + (this.axis === 'y' ? dy : dx) * 0.6); });
  }
}

// ---- 겹침 카메라 ----
// 보조 카메라(목록 영역)는 메인 카메라보다 늦게 그려져서, 메인 카메라의 팝업/토스트가 목록 영역 뒤로 가려진다.
// 목록이 있는 장면에서는 마지막에 그리는 전체 화면 카메라가 팝업과 토스트만 그린다. 목록이 없는 장면에서는 아무 일도 하지 않는다.
const descendants = (obj, fn) => { fn(obj); if (obj.list) obj.list.forEach((c) => descendants(c, fn)); };

function overlayCam(scene) {
  if (scene.__overlay) return scene.__overlay;
  const cam = scene.cameras.add(0, 0, scene.scale.gameSize.width, scene.scale.gameSize.height);
  scene.__overlay = cam;
  cam.ignore(scene.children.list.filter((o) => !o.__overlay));
  const onAdd = (obj) => { if (!obj.__overlay) cam.ignore(obj); };
  scene.events.on('addedtoscene', onAdd);
  scene.events.once('shutdown', () => scene.events.off('addedtoscene', onAdd));
  return cam;
}

// obj(과 그 자식 전부)를 겹침 카메라가 그리게 한다. 메인 카메라와 목록 카메라는 그리지 않는다
export function toOverlay(scene, obj) {
  if (!scene.__hasClip || !obj) return obj;
  const cam = overlayCam(scene);
  descendants(obj, (o) => {
    o.__overlay = true;
    o.cameraFilter &= ~cam.id;
  });
  scene.cameras.main.ignore(obj);
  for (const c of scene.cameras.cameras) if (c !== cam && c !== scene.cameras.main) c.ignore(obj);
  return obj;
}
