import type { ReactNode } from "react";
import { Link } from "react-router-dom";

type EmptyStateProps = {
  title: string;
  description?: string;
  actionLabel?: string;
  actionTo?: string;
  children?: ReactNode;
};

export function EmptyState({ title, description, actionLabel, actionTo, children }: EmptyStateProps) {
  return (
    <div className="empty-state panel stack" style={{ textAlign: "center", padding: "2rem 1.5rem" }}>
      <h2 style={{ margin: 0, fontSize: "1.2rem" }}>{title}</h2>
      {description && <p className="meta" style={{ margin: 0 }}>{description}</p>}
      {children}
      {actionLabel && actionTo && (
        <Link to={actionTo} className="btn btn-primary" style={{ alignSelf: "center" }}>
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
