import type { CSSProperties } from "react";

type BrandLogoProps = {
  size?: number | "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  textClassName?: string;
  badgeOnly?: boolean;
  className?: string;
  style?: CSSProperties;
  variant?: "glass" | "white" | "dark";
};

export function BrandLogo({
  size = "md",
  showText = true,
  textClassName = "",
  badgeOnly = false,
  className = "",
  style,
  variant = "glass",
}: BrandLogoProps) {
  const pixelSize = typeof size === "number" ? size : { sm: 32, md: 40, lg: 48, xl: 64 }[size];
  const brandStyle = {
    "--brand-size": `${pixelSize}px`,
    "--brand-type-size": pixelSize < 40 ? "0.9375rem" : "1rem",
    ...style,
  } as CSSProperties;

  return (
    <span className={`brand-logo-root brand-logo--${variant} ${className}`} style={brandStyle} role="img" aria-label="Media Extensions">
      <img className="brand-logo-mark" src="/brand/logo-mark.png" alt="" width={pixelSize} height={pixelSize} decoding="async" />
      {showText && !badgeOnly && (
        <span className={`brand-logo-text ${textClassName}`} aria-hidden="true">
          <span>Media</span>{" "}<span>Extensions</span>
        </span>
      )}
    </span>
  );
}

export function BrandShowcaseCard({ className = "", size = 140 }: { className?: string; size?: number }) {
  return <div className={`brand-showcase-card ${className}`}><BrandLogo size={size} badgeOnly /></div>;
}
