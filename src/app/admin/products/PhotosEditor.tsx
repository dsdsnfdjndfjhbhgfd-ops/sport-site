"use client";

import { useState } from "react";
import { uploadImage } from "@/app/actions/admin";

const MAX_SIDE = 1600;

/** Уменьшает большие фото в браузере: так загрузка быстрее и база не раздувается. */
async function shrink(file: File): Promise<File> {
  if (file.type === "image/svg+xml") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.85));
    if (!blob || blob.type !== "image/webp" || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".webp", { type: "image/webp" });
  } catch {
    return file;
  }
}

interface Props {
  initial: string[];
  onBusyChange: (busy: boolean) => void;
}

export function PhotosEditor({ initial, onBusyChange }: Props) {
  const [urls, setUrls] = useState(initial);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [link, setLink] = useState("");

  async function addFiles(files: File[]) {
    if (!files.length) return;
    setError("");
    onBusyChange(true);
    const failed: string[] = [];
    for (const [i, file] of files.entries()) {
      setProgress(`Загружаем фото ${i + 1} из ${files.length}…`);
      const body = new FormData();
      body.append("file", await shrink(file));
      const result = await uploadImage(body).catch(() => ({ error: "не удалось загрузить", url: undefined }));
      if (result.url) setUrls((prev) => [...prev, result.url!]);
      else failed.push(`${file.name}: ${result.error}`);
    }
    setProgress("");
    if (failed.length) setError(failed.join("; "));
    onBusyChange(false);
  }

  function move(from: number, to: number) {
    setUrls((prev) => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  }

  return (
    <div className="field">
      <label>Фото товара</label>
      <div className="photos">
        {urls.map((url, i) => (
          <div key={url + i} className="photo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={`Фото ${i + 1}`} />
            {i === 0 && <span className="photo-main">Главное</span>}
            <div className="photo-actions">
              <button type="button" disabled={i === 0} onClick={() => move(i, i - 1)} aria-label="Сдвинуть левее">
                ←
              </button>
              <button
                type="button"
                disabled={i === urls.length - 1}
                onClick={() => move(i, i + 1)}
                aria-label="Сдвинуть правее"
              >
                →
              </button>
              <button type="button" onClick={() => setUrls(urls.filter((_, j) => j !== i))} aria-label="Убрать фото">
                ✕
              </button>
            </div>
            <input type="hidden" name="images" value={url} />
          </div>
        ))}
        <label className="photo-add">
          <span>+ Добавить фото</span>
          <small>можно несколько сразу</small>
          <input
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/svg+xml"
            onChange={(e) => {
              addFiles(Array.from(e.target.files ?? []));
              e.target.value = "";
            }}
          />
        </label>
      </div>
      {progress && <span className="muted" style={{ fontSize: 14 }}>{progress}</span>}
      {error && <div className="error" style={{ marginTop: 8 }}>{error}</div>}
      <div className="photo-link">
        <input
          className="input"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="…или вставьте ссылку на фото: https://…"
          aria-label="Ссылка на фото"
        />
        <button
          type="button"
          className="btn btn-sm btn-outline"
          disabled={!link.trim()}
          onClick={() => {
            setUrls([...urls, link.trim()]);
            setLink("");
          }}
        >
          Добавить
        </button>
      </div>
      <span className="muted" style={{ fontSize: 14 }}>
        Первое фото — главное: его видно в каталоге и корзине. Порядок меняется стрелками.
      </span>
    </div>
  );
}
