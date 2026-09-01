import { useEffect, useState } from "react";

type ToastState = { message: string; visible: boolean; id: number };

let pushToast: ((message: string) => void) | null = null;

export function toast(message: string) {
  pushToast?.(message);
}

export function ToastHost() {
  const [state, setState] = useState<ToastState>({ message: "", visible: false, id: 0 });

  useEffect(() => {
    let timer: number;
    pushToast = (message: string) => {
      window.clearTimeout(timer);
      setState({ message, visible: true, id: Date.now() });
      timer = window.setTimeout(() => setState((s) => ({ ...s, visible: false })), 2600);
    };
    return () => {
      pushToast = null;
      window.clearTimeout(timer);
    };
  }, []);

  if (!state.visible) return null;

  return (
    <div
      role="status"
      style={{
        position: "fixed",
        bottom: "2rem",
        right: "2rem",
        zIndex: 200,
        background: "var(--ink)",
        color: "#fff",
        padding: "0.85rem 1.4rem",
        borderRadius: "var(--radius-full)",
        boxShadow: "0 12px 35px rgba(0, 0, 0, 0.25)",
        border: "1px solid rgba(255, 255, 255, 0.15)",
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        fontSize: "0.92rem",
        fontWeight: 600,
        animation: "rise 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        maxWidth: "min(90vw, 420px)",
      }}
    >
      <span
        style={{
          width: "1.5rem",
          height: "1.5rem",
          borderRadius: "50%",
          background: "var(--emerald)",
          color: "white",
          display: "grid",
          placeItems: "center",
          fontSize: "0.8rem",
          fontWeight: 800,
          flexShrink: 0,
        }}
      >
        ✓
      </span>
      <span>{state.message}</span>
    </div>
  );
}
