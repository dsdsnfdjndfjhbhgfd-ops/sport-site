// Генерирует демо-картинки товаров (SVG) в public/products
import { writeFileSync, mkdirSync } from "fs";

const shapes = {
  tee: (c, a) => `<path d="M140 70 L200 50 Q250 85 300 50 L360 70 L430 140 L380 195 L350 170 L350 440 L150 440 L150 170 L120 195 L70 140 Z" fill="${c}"/>
    <path d="M200 50 Q250 85 300 50 L292 46 Q250 72 208 46 Z" fill="${a}"/>
    <path d="M150 300 L350 220 L350 250 L150 330 Z" fill="${a}" opacity=".9"/>`,
  jacket: (c, a) => `<path d="M150 70 L210 50 L250 90 L290 50 L350 70 L420 160 L420 420 L370 420 L360 200 L350 440 L150 440 L140 200 L130 420 L80 420 L80 160 Z" fill="${c}"/>
    <path d="M247 90 L253 90 L253 440 L247 440 Z" fill="${a}"/>
    <path d="M80 300 L130 300 L130 320 L80 320 Z M370 300 L420 300 L420 320 L370 320 Z" fill="${a}"/>`,
  shorts: (c, a) => `<path d="M130 120 L370 120 L400 380 L270 390 L250 230 L230 390 L100 380 Z" fill="${c}"/>
    <path d="M130 120 L370 120 L372 145 L128 145 Z" fill="${a}"/>
    <path d="M110 330 L380 330 L385 360 L106 360 Z" fill="${a}" opacity=".8"/>`,
  pants: (c, a) => `<path d="M170 60 L330 60 L345 450 L275 450 L250 170 L225 450 L155 450 Z" fill="${c}"/>
    <path d="M170 60 L330 60 L331 82 L169 82 Z" fill="${a}"/>
    <path d="M160 90 L168 90 L160 440 L152 440 Z M332 90 L340 90 L348 440 L340 440 Z" fill="${a}"/>`,
  boot: (c, a) => `<path d="M90 300 Q100 200 170 180 L260 170 Q300 230 380 250 Q440 265 430 320 L430 345 L80 345 Z" fill="${c}"/>
    <path d="M80 345 L430 345 L430 370 L80 370 Z" fill="#222"/>
    <path d="M150 300 L330 230 L345 250 L160 320 Z" fill="${a}"/>
    <g fill="#222"><circle cx="120" cy="385" r="9"/><circle cx="200" cy="385" r="9"/><circle cx="330" cy="385" r="9"/><circle cx="400" cy="385" r="9"/></g>`,
  ball: (c, a) => `<circle cx="250" cy="250" r="170" fill="${c}"/>
    <path d="M250 175 L320 225 L295 305 L205 305 L180 225 Z" fill="${a}"/>
    <path d="M250 80 L250 175 M320 225 L410 195 M295 305 L350 385 M205 305 L150 385 M180 225 L90 195" stroke="${a}" stroke-width="10"/>`,
  bag: (c, a) => `<rect x="90" y="180" width="320" height="200" rx="40" fill="${c}"/>
    <path d="M180 180 Q180 110 250 110 Q320 110 320 180" fill="none" stroke="${a}" stroke-width="18"/>
    <rect x="90" y="270" width="320" height="22" fill="${a}"/>`,
};

const items = [
  ["tee-red", "tee", "#d7141a", "#ffffff"],
  ["tee-black", "tee", "#1b1b1b", "#e30613"],
  ["tee-blue", "tee", "#1d4fb8", "#ffd400"],
  ["tee-white", "tee", "#f2f2f2", "#1b1b1b"],
  ["jacket-black", "jacket", "#1b1b1b", "#e30613"],
  ["jacket-navy", "jacket", "#14234b", "#ffffff"],
  ["shorts-black", "shorts", "#1b1b1b", "#ffffff"],
  ["shorts-red", "shorts", "#d7141a", "#111111"],
  ["pants-black", "pants", "#1b1b1b", "#ffffff"],
  ["pants-gray", "pants", "#6b6b6b", "#111111"],
  ["boot-white", "boot", "#f2f2f2", "#e30613"],
  ["boot-black", "boot", "#1b1b1b", "#ffd400"],
  ["ball-white", "ball", "#f7f7f7", "#1b1b1b"],
  ["bag-black", "bag", "#1b1b1b", "#e30613"],
];

mkdirSync("public/products", { recursive: true });
for (const [name, shape, c, a] of items) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500">${shapes[shape](c, a)}</svg>\n`;
  writeFileSync(`public/products/${name}.svg`, svg);
}
console.log(`Создано ${items.length} изображений`);
