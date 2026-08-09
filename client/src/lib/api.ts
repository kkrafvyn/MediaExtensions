const API_BASE = import.meta.env.VITE_API_URL ?? "";

export async function api<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: "include",
    headers,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error ?? "Request failed");
  }
  return data as T;
}

export async function apiUpload<T = unknown>(path: string, formData: FormData): Promise<T> {
  return api<T>(path, { method: "POST", body: formData });
}

export function formatGhs(pesewas: number): string {
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
  }).format(pesewas / 100);
}
