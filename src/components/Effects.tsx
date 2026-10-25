"use client";

import { useEffect } from "react";

const TILT = ".card-img, .cat-tile, .product-img";
const RIPPLE = ".btn, .size, .gallery-thumb, .qty button, .photo-add, .admin-link";

/**
 * Эффекты для всего сайта через делегирование событий, чтобы не превращать
 * серверные компоненты в клиентские: 3D-наклон карточек за курсором,
 * «волна» от точки нажатия на кнопках и параллакс разметки поля на главной.
 */
export function Effects() {
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    let tilted: HTMLElement | null = null;

    function resetTilt(el: HTMLElement) {
      el.style.removeProperty("--rx");
      el.style.removeProperty("--ry");
      el.classList.remove("is-tilting");
    }

    function onMove(e: PointerEvent) {
      const target = e.target as Element | null;
      const el = target?.closest<HTMLElement>(TILT) ?? null;
      if (tilted && tilted !== el) resetTilt(tilted);
      tilted = el;
      if (el) {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width; // 0…1
        const y = (e.clientY - r.top) / r.height;
        el.classList.add("is-tilting");
        el.style.setProperty("--rx", `${(0.5 - y) * 10}deg`);
        el.style.setProperty("--ry", `${(x - 0.5) * 12}deg`);
        el.style.setProperty("--gx", `${x * 100}%`);
        el.style.setProperty("--gy", `${y * 100}%`);
      }
      const hero = target?.closest<HTMLElement>(".hero");
      if (hero) {
        const r = hero.getBoundingClientRect();
        hero.style.setProperty("--hx", ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
        hero.style.setProperty("--hy", ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
      }
    }

    function onLeave() {
      if (tilted) resetTilt(tilted);
      tilted = null;
    }

    function onDown(e: PointerEvent) {
      const el = (e.target as Element | null)?.closest<HTMLElement>(RIPPLE);
      if (!el || (el as HTMLButtonElement).disabled) return;
      const r = el.getBoundingClientRect();
      const size = Math.max(r.width, r.height) * 2;
      const wave = document.createElement("span");
      wave.className = "ripple";
      wave.style.width = wave.style.height = `${size}px`;
      wave.style.left = `${e.clientX - r.left - size / 2}px`;
      wave.style.top = `${e.clientY - r.top - size / 2}px`;
      el.appendChild(wave);
      wave.addEventListener("animationend", () => wave.remove());
      // если анимации выключены, animationend не придёт
      setTimeout(() => wave.remove(), 800);
    }

    document.addEventListener("pointerdown", onDown);
    if (!reduced && finePointer) {
      document.addEventListener("pointermove", onMove, { passive: true });
      document.addEventListener("pointerleave", onLeave);
    }
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return null;
}
