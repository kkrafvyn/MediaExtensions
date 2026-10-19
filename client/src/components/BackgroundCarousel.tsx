import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export type CarouselSlide = {
  /** JPEG or fallback URL */
  src: string;
  /** Optional WebP for lighter backgrounds */
  srcWebp?: string;
  alt: string;
};

type Props = {
  slides: CarouselSlide[];
  intervalMs?: number;
  className?: string;
  /** Fixed full-viewport app background */
  fixed?: boolean;
  showDots?: boolean;
};

export function BackgroundCarousel({
  slides,
  intervalMs = 7000,
  className = "",
  fixed = false,
  showDots = true,
}: Props) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (slides.length <= 1 || paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [slides.length, intervalMs, paused]);

  if (!slides.length) return null;

  const dots = showDots && slides.length > 1 ? (
    <div className={`bg-carousel-dots${fixed ? " bg-carousel-dots-fixed" : ""}`} role="tablist" aria-label="Background slides">
      {slides.map((slide, i) => (
        <button
          key={slide.src}
          type="button"
          className={`bg-carousel-dot${i === index ? " is-active" : ""}`}
          aria-label={`Show slide ${i + 1}: ${slide.alt}`}
          aria-selected={i === index}
          onClick={() => setIndex(i)}
        />
      ))}
    </div>
  ) : null;

  return (
    <>
      <div
        className={`bg-carousel${fixed ? " bg-carousel-fixed" : ""} ${className}`.trim()}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div className="bg-carousel-stage" aria-hidden="true">
          {slides.map((slide, i) => (
            <div
              key={slide.src}
              className={`bg-carousel-slide${i === index ? " is-active" : ""}`}
              style={{
                backgroundImage: slide.srcWebp
                  ? `image-set(url("${slide.srcWebp}") type("image/webp"), url("${slide.src}") type("image/jpeg"))`
                  : `url(${slide.src})`,
              }}
            />
          ))}
          <div className="bg-carousel-veil" />
        </div>
      </div>
      {fixed && dots ? createPortal(dots, document.body) : dots}
    </>
  );
}

export const APP_CAROUSEL: CarouselSlide[] = [
  {
    src: "/images/carousel/carousel-camera.jpg",
    srcWebp: "/images/carousel/carousel-camera.webp",
    alt: "Professional camera gear",
  },
  {
    src: "/images/carousel/carousel-editing.jpg",
    srcWebp: "/images/carousel/carousel-editing.webp",
    alt: "Color grading workstation",
  },
  {
    src: "/images/carousel/carousel-gear.jpg",
    srcWebp: "/images/carousel/carousel-gear.webp",
    alt: "Creator production kit",
  },
  {
    src: "/images/carousel/carousel-repair.jpg",
    srcWebp: "/images/carousel/carousel-repair.webp",
    alt: "Device repair studio",
  },
];
