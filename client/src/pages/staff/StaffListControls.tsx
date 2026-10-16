type StaffListControlsProps = {
  q: string;
  onQChange: (value: string) => void;
  page: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
  exportHref?: string;
  exportPaymentsHref?: string;
  onSearch: () => void;
};

export function StaffListControls({
  q,
  onQChange,
  page,
  total,
  limit,
  onPageChange,
  exportHref,
  exportPaymentsHref,
  onSearch,
}: StaffListControlsProps) {
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="staff-filter-row" style={{ alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
      <input
        type="search"
        placeholder="Search…"
        value={q}
        onChange={(e) => onQChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSearch();
        }}
        style={{ minWidth: "12rem", flex: "1 1 200px" }}
      />
      <button type="button" className="btn btn-light btn-sm" onClick={onSearch}>
        Search
      </button>
      {exportHref ? (
        <a className="btn btn-light btn-sm" href={exportHref}>
          Export CSV
        </a>
      ) : null}
      {exportPaymentsHref ? (
        <a className="btn btn-light btn-sm" href={exportPaymentsHref}>
          Export payments
        </a>
      ) : null}
      <span className="meta" style={{ marginLeft: "auto" }}>
        Page {page} of {totalPages} · {total} total
      </span>
      <button
        type="button"
        className="btn btn-light btn-sm"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        Previous
      </button>
      <button
        type="button"
        className="btn btn-light btn-sm"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        Next
      </button>
    </div>
  );
}
