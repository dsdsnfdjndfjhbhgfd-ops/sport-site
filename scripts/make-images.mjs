// Генерирует демо-картинки товаров (SVG) в public/products
import { writeFileSync, mkdirSync } from "fs";

const shapes = {
  tee: (c, a) => `<path d="M140 70 L200 50 Q250 85 300 50 L360 70 L430 140 L380 195 L350 170 L350 440 L150 440 L150 170 L120 195 L70 140 Z" fill="${c}"/>
    <path d="M200 50 Q250 85 300 50 L292 46 Q250 72 208 46 Z" fill="${a}"/>
    <path d="M118 188 L378 188" stroke="${a}" stroke-width="3" opacity=".7"/>
    <circle cx="300" cy="130" r="11" fill="none" stroke="${a}" stroke-width="3"/>`,
  jacket: (c, a) => `<path d="M150 70 L210 50 L250 90 L290 50 L350 70 L420 160 L420 420 L370 420 L360 200 L350 440 L150 440 L140 200 L130 420 L80 420 L80 160 Z" fill="${c}"/>
    <path d="M248.5 90 L251.5 90 L251.5 440 L248.5 440 Z" fill="${a}"/>
    <path d="M210 50 L250 90 L290 50" fill="none" stroke="${a}" stroke-width="4"/>
    <path d="M80 395 L130 395 M370 395 L420 395" stroke="${a}" stroke-width="4"/>`,
  shorts: (c, a) => `<path d="M130 120 L370 120 L400 380 L270 390 L250 230 L230 390 L100 380 Z" fill="${c}"/>
    <path d="M130 120 L370 120 L372 142 L128 142 Z" fill="${a}" opacity=".85"/>
    <path d="M370 170 L390 360" stroke="${a}" stroke-width="4"/>`,
  pants: (c, a) => `<path d="M170 60 L330 60 L345 450 L275 450 L250 170 L225 450 L155 450 Z" fill="${c}"/>
    <path d="M170 60 L330 60 L331 80 L169 80 Z" fill="${a}" opacity=".85"/>
    <path d="M336 100 L344 430" stroke="${a}" stroke-width="4"/>
    <path d="M157 430 L223 430 M277 430 L343 430" stroke="${a}" stroke-width="5" opacity=".7"/>`,
  boot: (c, a) => `<path d="M90 300 Q100 200 170 180 L260 170 Q300 230 380 250 Q440 265 430 320 L430 345 L80 345 Z" fill="${c}"/>
    <path d="M80 345 L430 345 L430 362 L80 362 Z" fill="#0e1f1a" opacity=".85"/>
    <path d="M170 270 Q260 250 340 238" fill="none" stroke="${a}" stroke-width="6" stroke-linecap="round"/>
    <path d="M200 196 L232 230 M222 190 L254 224 M244 186 L272 216" stroke="${a}" stroke-width="3" opacity=".7"/>
    <g fill="#0e1f1a" opacity=".85"><rect x="112" y="362" width="14" height="16"/><rect x="190" y="362" width="14" height="16"/><rect x="320" y="362" width="14" height="16"/><rect x="392" y="362" width="14" height="16"/></g>`,
  ball: (c, a) => `<circle cx="250" cy="250" r="170" fill="${c}"/>
    <path d="M250 185 L312 230 L288 302 L212 302 L188 230 Z" fill="${a}"/>
    <path d="M250 80 L250 185 M312 230 L408 200 M288 302 L345 388 M212 302 L155 388 M188 230 L92 200" stroke="${a}" stroke-width="5"/>`,
  bag: (c, a) => `<rect x="90" y="180" width="320" height="200" rx="28" fill="${c}"/>
    <path d="M185 180 Q185 115 250 115 Q315 115 315 180" fill="none" stroke="${a}" stroke-width="12"/>
    <path d="M90 240 L410 240" stroke="${a}" stroke-width="3" opacity=".8"/>
    <rect x="232" y="262" width="36" height="22" rx="3" fill="none" stroke="${a}" stroke-width="3"/>`,
};

// оттенки: поле, графит, оксблад, ночной синий, мел, латунь
const items = [
  ["tee-red", "tee", "#8e2b24", "#ecebe5"],
  ["tee-black", "tee", "#24282b", "#a88b57"],
  ["tee-blue", "tee", "#1f2c44", "#ecebe5"],
  ["tee-white", "tee", "#f4f3ef", "#17322a"],
  ["jacket-black", "jacket", "#24282b", "#a88b57"],
  ["jacket-navy", "jacket", "#1f2c44", "#ecebe5"],
  ["shorts-black", "shorts", "#24282b", "#ecebe5"],
  ["shorts-red", "shorts", "#8e2b24", "#ecebe5"],
  ["pants-black", "pants", "#17322a", "#a88b57"],
  ["pants-gray", "pants", "#6e716d", "#ecebe5"],
  ["boot-white", "boot", "#f4f3ef", "#17322a"],
  ["boot-black", "boot", "#24282b", "#a88b57"],
  ["ball-white", "ball", "#f7f6f2", "#17322a"],
  ["bag-black", "bag", "#17322a", "#a88b57"],
];

// мягкий свет сверху слева и тень на «полу» — вместо плоской заливки
const defs = `<defs>
  <linearGradient id="light" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#fff" stop-opacity=".16"/>
    <stop offset=".55" stop-color="#fff" stop-opacity="0"/>
    <stop offset="1" stop-color="#000" stop-opacity=".18"/>
  </linearGradient>
  <radialGradient id="floor"><stop offset="0" stop-color="#0e1f1a" stop-opacity=".22"/><stop offset="1" stop-color="#0e1f1a" stop-opacity="0"/></radialGradient>
</defs>`;

mkdirSync("public/products", { recursive: true });
for (const [name, shape, c, a] of items) {
  const body = shapes[shape](c, a);
  const silhouette = body.split("\n")[0].replace(/fill="[^"]*"/, 'fill="url(#light)"');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500">${defs}
  <ellipse cx="250" cy="468" rx="190" ry="16" fill="url(#floor)"/>
  ${body}
  ${silhouette}
</svg>\n`;
  writeFileSync(`public/products/${name}.svg`, svg);
  // второе фото для галереи — крупный план верхней части
  writeFileSync(`public/products/${name}-detail.svg`, svg.replace('viewBox="0 0 500 500"', 'viewBox="110 40 280 280"'));
}
console.log(`Создано ${items.length * 2} изображений`);
