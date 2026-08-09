import { useEffect, useState } from "react";

type ToastState = { message: string; visible: boolean };

let pushToast: ((message: string) => void) | null = null;

export function toast(message: string) {
  pushToast?.(message);
}

export function ToastHost() {
  const [state, setState] = useState<ToastState>({ message: "", visible: false });

  useEffect(() => {
    pushToast = (message: string) => {
      setState({ message, visible: true });
      window.setTimeout(() => setState((s) => ({ ...s, visible: false })), 2200);
    };
    return () => {
      pushToast = null;
    };
  }, []);

  return (
    <div className={`toast ${state.visible ? "toast-show" : ""}`} role="status">
      {state.message}
    </div>
  );
}
