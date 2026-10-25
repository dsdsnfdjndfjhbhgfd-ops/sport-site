"use client";

import { useState } from "react";

export function ProductGallery({ images, name }: { images: string[]; name: string }) {
  const [current, setCurrent] = useState(0);
  return (
    <div className="gallery">
      <div className="product-img">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={images[current]} alt={name} />
      </div>
      {images.length > 1 && (
        <div className="gallery-thumbs">
          {images.map((url, i) => (
            <button
              key={url + i}
              type="button"
              className={i === current ? "gallery-thumb active" : "gallery-thumb"}
              data-src={url}
              aria-label={`Фото ${i + 1} из ${images.length}`}
              aria-pressed={i === current}
              onClick={() => setCurrent(i)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
