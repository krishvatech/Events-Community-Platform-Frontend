"use client";

// src/components/public/articles/ArticleImage.jsx
// An article's featured image, or a branded placeholder when the article has none (many legacy
// WordPress posts) or the image cannot be loaded, so a card never shows a broken image.
import { useEffect, useRef, useState } from "react";

export default function ArticleImage({ article, section, className = "", sizes, eager = false }) {
  const [failed, setFailed] = useState(false);
  const img = useRef(null);
  // An image that failed before hydration never fires onError for React: check once mounted.
  useEffect(() => {
    if (img.current?.complete && img.current.naturalWidth === 0) setFailed(true);
  }, []);
  if (article.featured_image && !failed) {
    return (
      <img
        ref={img}
        src={article.featured_image}
        alt=""
        sizes={sizes}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        onError={() => setFailed(true)}
        className={`block bg-imaa-cool object-cover ${className}`}
      />
    );
  }
  // Decorative (the title next to it names the article).
  return (
    <div aria-hidden="true" data-image-placeholder="" className={`flex items-center justify-center bg-imaa-navy ${className}`}>
      <span className="px-4 text-center font-serif text-lg font-bold leading-snug text-white/85">{section.label}</span>
    </div>
  );
}
