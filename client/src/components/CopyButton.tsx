import { toast } from "./Toast";

type CopyButtonProps = {
  text: string;
  label?: string;
  className?: string;
};

export function CopyButton({ text, label = "Copy", className = "btn btn-light btn-sm" }: CopyButtonProps) {
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          toast("Copied to clipboard");
        } catch {
          toast("Could not copy");
        }
      }}
    >
      {label}
    </button>
  );
}
