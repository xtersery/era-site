// Builds the hero-on-stone review board (self-contained HTML, captures embedded as JPEG).
//   node e2e/spike-hero-stone.capture.mjs   (dev server up)  →  node e2e/spike-hero-stone.board.mjs
import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';

const CAP = 'spikes/hero-stone/__captures__';
const OUT = 'docs/spikes/boards/hero-stone.html';

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage();
const jpeg = async (file, maxW = 1600, q = 0.84) =>
  page.evaluate(
    async ({ src, maxW, q }) => {
      const img = await new Promise((r) => {
        const i = new Image();
        i.onload = () => r(i);
        i.src = src;
      });
      const s = Math.min(1, maxW / img.naturalWidth);
      const c = document.createElement('canvas');
      c.width = Math.round(img.naturalWidth * s);
      c.height = Math.round(img.naturalHeight * s);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      return c.toDataURL('image/jpeg', q);
    },
    { src: 'data:image/png;base64,' + readFileSync(file).toString('base64'), maxW, q },
  );
const img = async (name, alt, maxW) =>
  `<img src="${await jpeg(`${CAP}/${name}.png`, maxW)}" alt="${alt}" loading="lazy">`;
const fig = (cls, title, path, inner, caption) =>
  `<figure class="fig ${cls}"><div class="fig__head"><h2>${title}</h2><span class="mono path">${path}</span></div>${inner}<figcaption>${caption}</figcaption></figure>`;

const perf = JSON.parse(readFileSync(`${CAP}/perf.json`, 'utf8'));
const html = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Hero on Onyx</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Prata&family=Inter:wght@400;500&family=JetBrains+Mono&display=swap">
<style>
  :root { --bg:#08140f; --text:#eae6dc; --muted:#98a39c; --gold:#cfaf72; --line:#1c2a24; --serif:'Prata',Georgia,serif; --sans:'Inter','Helvetica Neue',Arial,sans-serif; --mono:'JetBrains Mono',Menlo,monospace; --gutter:clamp(16px,4vw,56px); }
  html { color-scheme: dark; }
  body { background:var(--bg); color:var(--text); font-family:var(--sans); font-size:15px; line-height:1.6; margin:0; padding-inline:var(--gutter); padding-block:0 96px; -webkit-font-smoothing:antialiased; }
  * { box-sizing:border-box; }
  .wrap { max-width:1500px; margin-inline:auto; }
  h1,h2 { font-family:var(--serif); font-weight:400; margin:0; text-wrap:balance; }
  p { margin:0; } .mono { font-family:var(--mono); font-size:11.5px; } .muted { color:var(--muted); }
  .head { padding-block:56px 32px; border-bottom:1px solid var(--line); display:grid; gap:24px; }
  .head h1 { font-size:clamp(36px,5vw,64px); line-height:.98; letter-spacing:-.02em; } .head h1 em { font-style:normal; color:var(--gold); }
  .verdict { display:grid; gap:12px 32px; } @media (min-width:900px) { .verdict { grid-template-columns:1.1fr 1fr; align-items:start; } }
  .verdict ul { margin:0; padding-left:18px; color:var(--muted); } .verdict li b { color:var(--text); font-weight:500; }
  .grid { display:grid; grid-template-columns:1fr; gap:48px; padding-block:40px; }
  @media (min-width:1100px) { .grid { grid-template-columns:1fr 1fr; } .fig--wide { grid-column:1/-1; } }
  .fig { margin:0; display:flex; flex-direction:column; gap:12px; min-width:0; }
  .fig__head { display:flex; flex-wrap:wrap; justify-content:space-between; align-items:baseline; gap:8px 24px; border-top:1px solid var(--line); padding-top:12px; }
  .fig h2 { font-size:22px; } .path { color:var(--muted); user-select:all; }
  .fig img { width:100%; height:auto; display:block; outline:1px solid var(--line); background:#000; max-width:100%; }
  .fig--phone img { max-width:420px; } .fig--tablet img { max-width:560px; }
  figcaption { color:var(--muted); max-width:78ch; font-size:14.5px; } figcaption b { color:var(--text); font-weight:500; }
  .layers { display:grid; grid-template-columns:1fr 1fr; gap:16px; } @media (max-width:700px) { .layers { grid-template-columns:1fr; } }
  .layers figure { margin:0; display:grid; gap:6px; } .layers figcaption { font-size:13px; }
  .details { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; } @media (max-width:900px) { .details { grid-template-columns:1fr; } }
  table { width:100%; border-collapse:collapse; font-family:var(--mono); font-size:12px; font-variant-numeric:tabular-nums; }
  th,td { text-align:left; padding:8px 12px 8px 0; border-top:1px solid var(--line); vertical-align:top; } th { color:var(--muted); font-weight:400; }
  .tables { display:grid; gap:32px; padding-block:24px 0; } @media (min-width:1100px) { .tables { grid-template-columns:1.4fr 1fr; } }
  .tables h2 { font-size:22px; margin-bottom:12px; }
  .note { border-left:2px solid var(--gold); padding-left:14px; color:var(--muted); max-width:72ch; }
  .judge { display:grid; gap:0 24px; grid-template-columns:1fr; } @media (min-width:800px) { .judge { grid-template-columns:1fr 1fr; } }
  .judge div { border-top:1px solid var(--line); padding:8px 0; display:grid; grid-template-columns:12em 1fr; gap:12px; font-size:14px; }
  .judge b { font-weight:500; } .pass { color:var(--gold); font-family:var(--mono); font-size:11.5px; } .open { color:#7fb0a4; font-family:var(--mono); font-size:11.5px; }
  .wide-scroll { overflow-x:auto; }
  section { padding-block:24px; }
  section > h2 { font-size:26px; margin-bottom:16px; }
</style></head><body><div class="wrap">
<header class="head">
  <p class="mono muted">ЭРА · 00 Главная → 01 Манифест · проход · проход 11 · 2026-09-15</p>
  <h1>Скролл входит в эмблему: стекло становится <em>минеральной мембраной</em>, камень открывает глубину — и приходит манифест</h1>
  <div class="verdict">
    <p>Hero закреплён на три экрана (GSAP ScrollTrigger, pin + scrub 0,8). Один полноэкранный шейдер (R3F, GLSL) ведёт кадр по прогрессу скролла: 0–0,42 — камера входит в эмблему (зум 1 → 3,6× вокруг её центра; интерфейс уходит за первые 10 %; канвас перенимает картину у DOM, пока зум ≈ 1, без стыка); 0,24–0,94 — мембрана: fbm-поле смещает изображение (≤ 5 % кадра), внутри кольца стекло зеленеет, полоса света идёт по мембране вместе со скроллом, и полированный оникс открывает глубинный камень — землю манифеста — зерно за зерном по тому же полю; 0,50–1 — приземление: земля манифеста садится с 1,45× к 1×, поле стихает. 0,80–1 — слова манифеста приходят вайпами слева (clip-path), подписи — тихо. При p = 1 кадр шейдера равен DOM-манифесту пиксель в пиксель; дальше — жёсткий срез в следующую комнату. Текст — по manifest-ref: «01 — Манифест», четыре строки Prata в верхнем регистре (графит / тауп), абзац, три слова на тёмном камне справа.</p>
    <ul>
      <li><b>Вердикт: PASS по брифу</b> — ScrollTrigger, плавное движение камеры, WebGL-искажение, без резкой смены секций; ${perf.median} fps медиана / ${perf.p10} fps p10 при скрабе (Chrome, этот Mac).</li>
      <li><b>Три состояния:</b> фильм (WebGL + motion) · reduced-motion и без WebGL — манифест как тихая комната после hero, без pin.</li>
      <li><b>Отступления от правил, по референсу:</b> заголовок манифеста в верхнем регистре; копия манифеста — из референса, помечена placeholder (формально pending).</li>
      <li><b>СТОП</b> — жду визуального одобрения; амплитуда мембраны и длина прохода — ручки для настройки.</li>
    </ul>
  </div>
</header>

<section>
  <h2>Проход, кадр за кадром · 1440 × 900</h2>
  <div class="layers">
    ${(await Promise.all([['000','0 % — hero в покое'],['008','8 % — интерфейс уходит; канвас перенял картину'],['020','20 % — камера входит в эмблему'],['032','32 % — буквы растворяются в мембране'],['045','45 % — мембрана: минеральные клетки, зелёное стекло, свет'],['058','58 % — глубинный камень проступает сквозь поле'],['070','70 % — земля манифеста села'],['082','82 % — слова приходят вайпами'],['092','92 %'],['100','100 % — 01 Манифест']].map(async ([n, cap]) => `<figure>${await img(`passage-1440-${n}`, cap, 900)}<figcaption class="muted">${cap}</figcaption></figure>`))).join('')}
  </div>
</section>

<div class="grid">
  ${fig('fig--wide', 'Финал · манифест', `${CAP}/passage-1440-100.png`, await img('passage-1440-100', '01 Манифест: сплит светлого оникса и тёмного камня', 1600), '<b>Сплит.</b> Слева — свет и просвечивающий оникс, посередине стеклянная лента, справа — тёмный природный камень (manifest-bg.png как есть). Четыре строки Prata: графит / тауп / тауп / графит; абзац; три слова справа.')}
  ${fig('', 'После прохода', `${CAP}/passage-1440-after.png`, await img('passage-1440-after', 'Срез в следующую комнату', 1280), 'Pin отпущен — следующая комната приходит жёстким срезом, как везде на сайте.')}
  ${fig('', 'Hero в покое', `${CAP}/desktop-1440.png`, await img('desktop-1440', 'Hero', 1280), 'До скролла — проход 10 без изменений.')}
</div>

<section>
  <h2>Телефон · 390 × 844</h2>
  <div class="details">
    ${(await Promise.all([['000','0 %'],['032','32 %'],['058','58 %'],['082','82 %'],['100','100 %'],['after','после']].map(async ([n, cap]) => `<figure class="fig"><img src="${await jpeg(`${CAP}/passage-390-${n}.png`, 600)}" alt="Проход на телефоне, ${cap}" loading="lazy"><figcaption>${cap}</figcaption></figure>`))).join('')}
  </div>
</section>

<div class="tables">
  <div>
    <h2>Что построено</h2>
    <div class="wide-scroll"><table>
      <tr><th>Часть</th><th>Чем сделана</th><th>Файл</th></tr>
      <tr><td>скролл</td><td>GSAP ScrollTrigger: pin hero, end +300 %, scrub 0,8; timeline 0..1 = прогресс; onUpdate → uniform</td><td>HeroStoneSpike.tsx</td></tr>
      <tr><td>шейдер</td><td>полноэкранный quad, ShaderMaterial; simplex fbm (4 октавы) × 3; cover-семплинг трёх текстур; фазы approach / membrane / reveal / land</td><td>passage/passage.frag · passage/PassageScene.tsx</td></tr>
      <tr><td>стык DOM → канвас</td><td>канвас проявляется на p 0,02–0,11 при зуме ≈ 1; эмблема измеряется из DOM (центр, размер) → uEmblem</td><td>HeroStoneSpike.tsx</td></tr>
      <tr><td>манифест</td><td>DOM-слой в закреплённой сцене; строки — clip-path вайпы, подписи — autoAlpha; при p = 1 совпадает с manifest-bg</td><td>Manifesto.tsx · hero-stone.css</td></tr>
      <tr><td>фолбэк</td><td>reduced-motion / без WebGL: манифест — статичная комната после hero (.mf-room)</td><td>HeroStoneSpike.tsx</td></tr>
      <tr><td>ассеты</td><td>manifest-bg.png → 2400 / 1200 px, только ресайз</td><td>scripts/hero-stone-assets.py · assets/manifest-bg*.jpg</td></tr>
    </table></div>
    <p class="note" style="margin-top:16px">Артефакт 5,6 MB (three.js + drei + все плиты инлайн — только для ревью; в продакшене код-сплит и внешние ассеты).</p>
  </div>
  <div>
    <h2>Суд по брифу</h2>
    <div class="judge">
      <div><b>GSAP ScrollTrigger</b><span class="pass">PASS — pin + scrub, одна timeline</span></div>
      <div><b>движение камеры</b><span class="pass">PASS — зум в эмблему, приземление 1,45 → 1; easeInOut</span></div>
      <div><b>WebGL-искажение</b><span class="pass">PASS — fbm-мембрана, зелёное стекло, свет, зернистое проявление</span></div>
      <div><b>без резкой смены</b><span class="pass">PASS — DOM → канвас при зуме ≈ 1; при p = 1 кадр = DOM</span></div>
      <div><b>сплит-финал</b><span class="pass">PASS — manifest-bg как есть</span></div>
      <div><b>текст по референсу</b><span class="pass">PASS — label, 4 строки, абзац, три слова</span></div>
      <div><b>Cartier × Aesop × Apple</b><span class="open">СУД ЗА ВАМИ — ритм и амплитуда настраиваются</span></div>
      <div><b>телефон</b><span class="pass">PASS — тот же фильм; GPU не измерен на устройстве</span></div>
    </div>
  </div>
</div>

<section>
  <h2>Как посмотреть</h2>
  <p class="muted"><span class="mono">npm run dev</span> → <span class="mono">http://localhost:5173/spikes/hero-stone/</span> · кадры прохода: <span class="mono">node e2e/spike-hero-stone.passage.mjs [w h]</span> · доска: <span class="mono">node e2e/spike-hero-stone.board.mjs</span>.</p>
</section>
</div></body></html>`;

writeFileSync(OUT, html);
console.log(OUT, Math.round(html.length / 1024), 'KB');
await browser.close();
