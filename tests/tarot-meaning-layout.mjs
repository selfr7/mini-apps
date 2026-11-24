// 牌意阅读布局：图鉴与抽牌两条入口，移动端/短屏嵌入与桌面。
// 运行：node tests/tarot-meaning-layout.mjs
import { spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import http from 'node:http';
import net from 'node:net';
import process from 'node:process';

const ROOT = new URL('..', import.meta.url).pathname;
const SHOT_DIR = process.env.SHOT_DIR || join(tmpdir(), 'tarot-meaning-shots');
mkdirSync(SHOT_DIR, { recursive: true });

const failures = [];
function check(cond, msg) {
  if (cond) {
    console.log('  ok  ' + msg);
  } else {
    failures.push(msg);
    console.error('  FAIL ' + msg);
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function freePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.once('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const port = srv.address().port;
      srv.close(() => resolve(port));
    });
  });
}

function httpGetJson(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (err) { reject(err); }
      });
    });
    req.on('error', reject);
  });
}

class CDP {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    this.listeners = new Map();
    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const pending = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) pending.reject(new Error(msg.error.message || JSON.stringify(msg.error)));
        else pending.resolve(msg.result || {});
      } else if (msg.method) {
        const set = this.listeners.get(msg.method);
        if (set) set.forEach((fn) => fn(msg.params || {}));
      }
    });
  }
  on(method, fn) {
    if (!this.listeners.has(method)) this.listeners.set(method, new Set());
    this.listeners.get(method).add(fn);
    return () => this.listeners.get(method).delete(fn);
  }
  send(method, params = {}, timeout = 20000) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error('timeout ' + method));
      }, timeout);
      this.pending.set(id, {
        resolve: (v) => { clearTimeout(timer); resolve(v); },
        reject: (e) => { clearTimeout(timer); reject(e); },
      });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  async eval(expression) {
    const result = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (result.exceptionDetails) {
      const d = result.exceptionDetails;
      throw new Error(d.exception && d.exception.description ? d.exception.description : (d.text || 'eval failed'));
    }
    return result.result ? result.result.value : undefined;
  }
}

async function launchChrome(port, userDir) {
  const chrome = spawn('google-chrome', [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--remote-debugging-port=' + port,
    '--user-data-dir=' + userDir,
    'about:blank',
  ], { stdio: 'ignore' });
  let version;
  for (let i = 0; i < 40; i++) {
    try {
      version = await httpGetJson('http://127.0.0.1:' + port + '/json/version');
      break;
    } catch (err) {
      await sleep(150);
    }
  }
  if (!version) throw new Error('chrome devtools did not start');
  return { chrome, version };
}

async function connectPage(port) {
  let pages;
  for (let i = 0; i < 20; i++) {
    pages = await httpGetJson('http://127.0.0.1:' + port + '/json/list');
    const page = pages.find((p) => p.type === 'page');
    if (page) return page;
    await sleep(100);
  }
  throw new Error('no page target');
}

async function navigate(cdp, url) {
  await cdp.send('Page.enable');
  const loaded = new Promise((resolve) => {
    const off = cdp.on('Page.loadEventFired', () => { off(); resolve(); });
  });
  await cdp.send('Page.navigate', { url });
  await Promise.race([
    loaded,
    sleep(20000).then(() => { throw new Error('page load timeout'); }),
  ]);
  await cdp.eval('document.readyState');
}

async function click(cdp, selector) {
  const ok = await cdp.eval(`(() => {
    const el = document.querySelector(${JSON.stringify(selector)});
    if (!el) return false;
    el.click();
    return true;
  })()`);
  if (!ok) throw new Error('missing element ' + selector);
}

async function shot(cdp, name) {
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
  const file = join(SHOT_DIR, name);
  writeFileSync(file, Buffer.from(data, 'base64'));
  console.log('  shot ' + file);
  return file;
}

const METRICS_JS = `(() => {
  const body = document.getElementById('meaningBody');
  const wrap = document.getElementById('meaningCardWrap');
  const back = document.getElementById('btnMeaningBack');
  const art = document.getElementById('btnToggleArtwork');
  const ori = document.getElementById('meaningOrientation');
  const label = document.querySelector('#meaningBody .meaning-label');
  const br = body.getBoundingClientRect();
  const backR = back.getBoundingClientRect();
  const labelR = label ? label.getBoundingClientRect() : null;
  const img = document.getElementById('meaningImg');
  return {
    title: document.getElementById('meaningTitle').textContent,
    sub: document.getElementById('meaningSub').textContent,
    ori: ori.textContent,
    oriVisible: ori.getBoundingClientRect().height > 0 && getComputedStyle(ori).visibility !== 'hidden',
    art: art.textContent,
    artLabel: art.getAttribute('aria-label'),
    pressed: art.getAttribute('aria-pressed'),
    back: back.textContent,
    bodyH: Math.round(body.clientHeight),
    bodyBottom: Math.round(br.bottom),
    bodyScroll: body.scrollHeight,
    wrapH: Math.round(wrap.getBoundingClientRect().height),
    wrapDisplay: getComputedStyle(wrap).display,
    cardH: Math.round((document.getElementById('meaningCard') || wrap).getBoundingClientRect().height),
    backBottom: Math.round(backR.bottom),
    backTop: Math.round(backR.top),
    actions: Array.from(document.querySelectorAll('#view-meaning .stage-actions .btn')).filter((el) => getComputedStyle(el).display !== 'none').map((el) => {
      const r = el.getBoundingClientRect();
      return { text: el.textContent.trim(), top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height) };
    }),
    vh: window.innerHeight,
    vw: window.innerWidth,
    imgReversed: img.classList.contains('reversed'),
    artworkOn: document.getElementById('view-meaning').classList.contains('artwork-visible'),
    reading: document.body.classList.contains('reading-meaning'),
    meaningActive: document.getElementById('view-meaning').classList.contains('active'),
    pager: getComputedStyle(document.getElementById('meaningPager')).display,
    next: getComputedStyle(document.getElementById('btnMeaningNext')).display,
    note: getComputedStyle(document.getElementById('btnMeaningNote')).display,
    textHasKeyword: body.textContent.indexOf('关键词') >= 0,
    textHasStart: body.textContent.indexOf('新的开始') >= 0,
    textHasReversed: body.textContent.indexOf('逆位解读') >= 0,
    labelVisible: !!(labelR && labelR.top >= br.top - 2 && labelR.top < br.bottom - 4),
    activeView: Array.from(document.querySelectorAll('.view.active')).map((v) => v.id).join(','),
  };
})()`;

async function metrics(cdp) {
  return cdp.eval(METRICS_JS);
}

function assertActionsInView(m, label) {
  check(m.actions.length > 0, label + ' 有底部操作按钮');
  m.actions.forEach((btn) => {
    check(btn.h >= 24 && btn.top >= 0 && btn.bottom <= m.vh + 2,
      label + ' 按钮在视口内「' + btn.text + '」 top=' + btn.top + ' bottom=' + btn.bottom + ' vh=' + m.vh);
  });
}

function assertReadingHidden(m, label) {
  check(m.meaningActive, label + ' 牌意页处于激活');
  check(m.reading, label + ' 阅读态锁定视口');
  check(m.wrapDisplay === 'none' && m.wrapH === 0, label + ' 默认隐藏牌面 (display=' + m.wrapDisplay + ', h=' + m.wrapH + ')');
  check(!m.artworkOn && m.pressed === 'false' && m.art === '显示牌面', label + ' 按钮为显示牌面');
  check(m.artLabel === '显示牌面图片', label + ' 按钮无障碍名称正确');
  check(m.oriVisible && m.ori.indexOf('正位') >= 0, label + ' 正位信息可见: ' + m.ori);
  check(m.title.length > 0 && m.sub.length > 0, label + ' 牌名与副标题保留: ' + m.title + ' / ' + m.sub);
  check(m.textHasKeyword, label + ' 解读正文包含关键词');
  check(m.labelVisible, label + ' 解读首行在阅读框内可见');
  check(m.bodyH >= 120, label + ' 阅读框获得高度 ' + m.bodyH + 'px');
  const gap = m.actions.length ? m.actions[0].top - m.bodyBottom : 999;
  check(gap >= -2 && gap <= 40, label + ' 阅读框延伸到操作区上方 gap=' + gap);
  check(m.bodyScroll > m.bodyH + 40, label + ' 长文在阅读框内滚动 (' + m.bodyScroll + '>' + m.bodyH + ')');
  assertActionsInView(m, label);
}

async function openEncyclopediaFool(cdp) {
  await click(cdp, '#btnOpenLibrary');
  await cdp.eval(`(() => {
    const grid = document.getElementById('libraryGrid');
    if (!grid || !grid.children.length) throw new Error('library empty');
  })()`);
  await click(cdp, '.lib-card-item');
  await sleep(50);
}

async function encyclopediaFlow(cdp, shotPrefix) {
  await openEncyclopediaFool(cdp);
  let m = await metrics(cdp);
  console.log('  metrics hidden', JSON.stringify({ bodyH: m.bodyH, vh: m.vh, title: m.title, back: m.back }));
  check(m.title.indexOf('愚者') >= 0, shotPrefix + ' 标题是愚者');
  check(m.sub.indexOf('The Fool') >= 0 && m.sub.indexOf('大阿卡纳') >= 0, shotPrefix + ' 副标题保留英文与牌组');
  check(m.back.indexOf('返回牌意图鉴') >= 0, shotPrefix + ' 返回图鉴');
  check(m.pager === 'none' && m.next === 'none' && m.note === 'none', shotPrefix + ' 图鉴不显示抽牌翻页/记录');
  check(m.textHasStart, shotPrefix + ' 正位关键词「新的开始」');
  assertReadingHidden(m, shotPrefix);
  await shot(cdp, shotPrefix + '-hidden.png');

  const hiddenH = m.bodyH;
  await click(cdp, '#btnToggleArtwork');
  await sleep(30);
  m = await metrics(cdp);
  console.log('  metrics shown', JSON.stringify({ bodyH: m.bodyH, wrapH: m.wrapH, cardH: m.cardH }));
  check(m.wrapDisplay === 'flex' && m.cardH >= 96, shotPrefix + ' 展开后牌面可见 h=' + m.cardH);
  check(m.vh < 760 || m.cardH >= 220, shotPrefix + ' 较高视口保持完整牌面 h=' + m.cardH);
  check(m.artworkOn && m.pressed === 'true' && m.art === '隐藏牌面', shotPrefix + ' 按钮变为隐藏牌面');
  check(m.bodyH < hiddenH, shotPrefix + ' 展开牌面后阅读框让出高度 ' + hiddenH + '→' + m.bodyH);
  check(m.bodyH >= 72 || m.bodyH <= 2, shotPrefix + ' 展开后阅读框要么可读要么收起 h=' + m.bodyH);
  check(m.title.indexOf('愚者') >= 0 && m.ori.indexOf('正位') >= 0, shotPrefix + ' 展开牌面后牌名与正位仍在');
  assertActionsInView(m, shotPrefix + ' 展开牌面后');
  await shot(cdp, shotPrefix + '-shown.png');

  await click(cdp, '#meaningOrientation');
  await sleep(30);
  m = await metrics(cdp);
  check(m.ori.indexOf('逆位') >= 0 && m.title.indexOf('逆位') >= 0, shotPrefix + ' 切换为逆位: ' + m.title);
  check(m.imgReversed, shotPrefix + ' 逆位牌面旋转');
  check(m.artworkOn && m.wrapDisplay === 'flex', shotPrefix + ' 页内切换正逆位保留已展开的牌面');
  check(m.textHasReversed, shotPrefix + ' 逆位解读正文出现');
  check(m.sub.indexOf('The Fool') >= 0, shotPrefix + ' 逆位后副标题仍在');
  await shot(cdp, shotPrefix + '-reversed.png');

  await click(cdp, '#btnToggleArtwork');
  await sleep(30);
  m = await metrics(cdp);
  check(m.wrapDisplay === 'none' && m.bodyH >= hiddenH - 30, shotPrefix + ' 收起牌面后阅读框恢复 ' + m.bodyH);
  check(m.ori.indexOf('逆位') >= 0, shotPrefix + ' 收起牌面后仍保持逆位');

  await click(cdp, '#meaningOrientation');
  await sleep(30);
  m = await metrics(cdp);
  check(m.ori.indexOf('正位') >= 0 && !m.artworkOn && m.wrapH === 0, shotPrefix + ' 再切回正位且牌面保持隐藏');

  await click(cdp, '#btnMeaningBack');
  await sleep(30);
  const backState = await cdp.eval(`({
    lib: document.getElementById('view-library').classList.contains('active'),
    reading: document.body.classList.contains('reading-meaning'),
    items: document.querySelectorAll('.lib-card-item').length
  })`);
  check(backState.lib && !backState.reading && backState.items === 78, shotPrefix + ' 返回图鉴且 78 张牌仍在');
}

async function drawFlow(cdp, shotPrefix) {
  await click(cdp, '#cardBox');
  await click(cdp, '#btnStartShuffle');
  await sleep(250);
  const shuffling = await cdp.eval(`(() => {
    const card = document.querySelector('#view-shuffle .shuffle-card');
    const style = card ? getComputedStyle(card) : null;
    return {
      active: document.getElementById('view-shuffle').classList.contains('active'),
      cards: document.querySelectorAll('#view-shuffle .shuffle-card').length,
      anim: style ? style.animationName : '',
    };
  })()`);
  check(shuffling.active && shuffling.cards === 3 && shuffling.anim.indexOf('shuffling') >= 0,
    shotPrefix + ' 洗牌动画仍在 (cards=' + shuffling.cards + ', anim=' + shuffling.anim + ')');

  let drawReady = false;
  for (let i = 0; i < 20; i++) {
    await sleep(400);
    drawReady = await cdp.eval(`document.getElementById('view-draw').classList.contains('active') && document.querySelectorAll('.fan-card').length === 30`);
    if (drawReady) break;
  }
  check(drawReady, shotPrefix + ' 洗牌结束后进入弧形抽牌');
  const fan = await cdp.eval(`(() => {
    const cards = Array.from(document.querySelectorAll('.fan-card'));
    return {
      n: cards.length,
      rotated: cards.filter((el) => /rotate\\(/.test(el.style.transform)).length,
    };
  })()`);
  check(fan.n === 30 && fan.rotated === 30, shotPrefix + ' 扇形牌堆 30 张且带旋转');

  await click(cdp, '.fan-card');
  await sleep(50);
  const picked = await cdp.eval(`({
    slots: document.querySelectorAll('.slot-frame.ready').length,
    back: !!document.querySelector('.slot-back')
  })`);
  check(picked.slots === 1 && picked.back, shotPrefix + ' 点选后出现待翻牌位');
  await click(cdp, '.slot-back');
  await sleep(80);
  const flipping = await cdp.eval(`(() => {
    const flipper = document.querySelector('.slot-flipper');
    const frame = document.querySelector('.slot-frame.flipping, .slot-frame.flipped');
    const style = flipper ? getComputedStyle(flipper) : null;
    return {
      flipper: !!flipper,
      frame: frame ? frame.className : '',
      transition: style ? style.transitionProperty : '',
      go: getComputedStyle(document.getElementById('btnGoMeaning')).display,
    };
  })()`);
  check(flipping.flipper && flipping.frame.indexOf('flipping') >= 0, shotPrefix + ' 翻牌结构仍在: ' + flipping.frame);
  check(flipping.transition.indexOf('transform') >= 0, shotPrefix + ' 翻牌过渡仍作用于 transform');
  check(flipping.go === 'block', shotPrefix + ' 翻开后出现查看牌意');
  await sleep(800);
  const flipped = await cdp.eval(`!!document.querySelector('.slot-frame.flipped .slot-flipper')`);
  check(flipped, shotPrefix + ' 翻牌动画落到 flipped');

  await click(cdp, '#btnGoMeaning');
  await sleep(50);
  let m = await metrics(cdp);
  console.log('  draw metrics', JSON.stringify({ title: m.title, bodyH: m.bodyH, vh: m.vh, back: m.back, ori: m.ori }));
  check(m.back === '返回牌面', shotPrefix + ' 抽牌入口返回文案是返回牌面');
  check(m.sub.indexOf('今日指引') >= 0, shotPrefix + ' 单牌阵位次保留');
  check(m.next === 'block' && m.note === 'block', shotPrefix + ' 抽牌阅读保留下一张与记录感受');
  check(m.pager === 'none', shotPrefix + ' 单牌阵不显示翻页器');
  assertReadingHidden(m, shotPrefix);
  const drawnTitle = m.title;
  await shot(cdp, shotPrefix + '-hidden.png');

  await click(cdp, '#btnToggleArtwork');
  await sleep(30);
  m = await metrics(cdp);
  check(m.cardH >= 96 && m.art === '隐藏牌面', shotPrefix + ' 抽牌阅读可展开牌面 h=' + m.cardH);
  check(m.bodyH >= 72 || m.bodyH <= 2, shotPrefix + ' 展开后阅读框要么可读要么收起 h=' + m.bodyH);
  check(m.title === drawnTitle, shotPrefix + ' 展开牌面不改变所抽的牌');
  assertActionsInView(m, shotPrefix + ' 展开牌面后');
  await shot(cdp, shotPrefix + '-shown.png');

  await click(cdp, '#meaningOrientation');
  await sleep(30);
  m = await metrics(cdp);
  check(m.ori.indexOf('逆位') >= 0 && m.title.indexOf('逆位') >= 0, shotPrefix + ' 未开启逆位时仍可临时查看逆位');
  check(m.artworkOn, shotPrefix + ' 抽牌页内切换朝向保留牌面展开');
  check(m.imgReversed, shotPrefix + ' 抽牌逆位图片旋转');

  await click(cdp, '#btnMeaningBack');
  await sleep(30);
  const restored = await cdp.eval(`({
    draw: document.getElementById('view-draw').classList.contains('active'),
    go: getComputedStyle(document.getElementById('btnGoMeaning')).display,
    note: getComputedStyle(document.getElementById('btnDrawNote')).display,
    finish: getComputedStyle(document.getElementById('btnDrawFinish')).display,
    reading: document.body.classList.contains('reading-meaning'),
    opened: !!document.querySelector('.slot-frame.flipped, .slot-frame.opened, .slot-flipper'),
  })`);
  check(restored.draw && !restored.reading, shotPrefix + ' 返回抽牌页');
  check(restored.go === 'block' && restored.note === 'block' && restored.finish === 'block', shotPrefix + ' 抽牌结果与三个操作仍在');
  check(restored.opened, shotPrefix + ' 已翻开的牌仍留在牌位');

  await click(cdp, '#btnGoMeaning');
  await sleep(30);
  m = await metrics(cdp);
  check(!m.artworkOn && m.wrapH === 0 && m.title.indexOf('逆位') >= 0, shotPrefix + ' 再次进入默认隐藏牌面，并保留已切换的逆位');
}

async function runViewport(cdp, name, width, height, mobile, url, withDraw) {
  console.log('\n== ' + name + ' ' + width + 'x' + height + ' ==');
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: !!mobile,
  });
  await navigate(cdp, url);
  await encyclopediaFlow(cdp, name + '-encyclopedia');
  if (withDraw) {
    await navigate(cdp, url);
    await drawFlow(cdp, name + '-draw');
  }
}

async function main() {
  const httpPort = await freePort();
  const debugPort = await freePort();
  const userDir = mkdtempSync(join(tmpdir(), 'tarot-chrome-'));
  const server = spawn('python3', ['-m', 'http.server', String(httpPort), '--bind', '127.0.0.1'], {
    cwd: ROOT,
    stdio: 'ignore',
  });
  let chrome;
  try {
    await sleep(200);
    const launched = await launchChrome(debugPort, userDir);
    chrome = launched.chrome;
    const page = await connectPage(debugPort);
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      ws.addEventListener('open', resolve);
      ws.addEventListener('error', () => reject(new Error('websocket failed')));
    });
    const cdp = new CDP(ws);
    const url = 'http://127.0.0.1:' + httpPort + '/tarot/index.html';
    await runViewport(cdp, 'mobile', 390, 640, true, url, true);
    await runViewport(cdp, 'embedded', 390, 560, true, url, true);
    await runViewport(cdp, 'desktop', 1280, 800, false, url, true);
    ws.close();
  } finally {
    if (chrome) chrome.kill('SIGKILL');
    server.kill('SIGKILL');
    try { rmSync(userDir, { recursive: true, force: true, maxRetries: 3 }); }
    catch (err) { console.error('cleanup skipped: ' + err.message); }
  }

  console.log('\nshots: ' + SHOT_DIR);
  if (failures.length) {
    console.error('\n' + failures.length + ' failed');
    failures.forEach((f) => console.error(' - ' + f));
    process.exit(1);
  }
  console.log('\nall checks passed');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
