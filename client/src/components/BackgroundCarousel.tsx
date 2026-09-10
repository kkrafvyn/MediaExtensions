import { useEffect, useState } from "react";

export type CarouselSlide = {
  src: string;
  alt: string;
};

type Props = {
  slides: CarouselSlide[];
  intervalMs?: number;
  className?: string;
};

export function BackgroundCarousel({ slides, intervalMs = 5500, className = "" }: Props) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (slides.length <= 1 || paused) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [slides.length, intervalMs, paused]);

  if (!slides.length) return null;

  return (
    <div
      className={`bg-carousel ${className}`.trim()}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="bg-carousel-stage" aria-hidden="true">
        {slides.map((slide, i) => (
          <div
            key={slide.src}
            className={`bg-carousel-slide${i === index ? " is-active" : ""}`}
            style={{ backgroundImage: `url(${slide.src})` }}
            role="img"
            aria-label={slide.alt}
          />
        ))}
        <div className="bg-carousel-veil" />
      </div>
      {slides.length > 1 && (
        <div className="bg-carousel-dots" role="tablist" aria-label="Background slides">
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
      )}
    </div>
  );
}

export const HOME_CAROUSEL: CarouselSlide[] = [
  { src: "/images/carousel/carousel-camera.jpg", alt: "Professional camera gear" },
  { src: "/images/carousel/carousel-editing.jpg", alt: "Color grading workstation" },
  { src: "/images/carousel/carousel-gear.jpg", alt: "Creator production kit" },
  { src: "/images/carousel/carousel-repair.jpg", alt: "Device repair studio" },
];

export const SHOP_CAROUSEL: CarouselSlide[] = [
  { src: "/images/carousel/carousel-gear.jpg", alt: "Creator production kit" },
  { src: "/images/carousel/carousel-camera.jpg", alt: "Professional camera gear" },
  { src: "/images/carousel/carousel-editing.jpg", alt: "Editing workstation" },
];

export const REPAIR_CAROUSEL: CarouselSlide[] = [
  { src: "/images/carousel/carousel-repair.jpg", alt: "Device repair workbench" },
  { src: "/images/carousel/carousel-camera.jpg", alt: "Camera equipment" },
  { src: "/images/carousel/carousel-gear.jpg", alt: "Production accessories" },
];
