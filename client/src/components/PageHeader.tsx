import type { ReactNode } from "react";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  lede?: string;
  children?: ReactNode;
};

export function PageHeader({ eyebrow, title, lede, children }: PageHeaderProps) {
  return (
    <header className="page-header-block" style={{ marginBottom: "1.5rem" }}>
      {eyebrow && <p className="eyebrow page-eyebrow">{eyebrow}</p>}
      <h1 style={{ marginBottom: lede ? "0.5rem" : 0 }}>{title}</h1>
      {lede && <p className="lede">{lede}</p>}
      {children}
    </header>
  );
}
