import { useEffect, useState } from "react";

type GhsInputProps = {
  pesewas: number;
  disabled?: boolean;
  onPesewasChange: (pesewas: number) => void;
  id?: string;
};

/** GHS text field — edits as decimal string, commits pesewas on blur. */
export function GhsInput({ pesewas, disabled, onPesewasChange, id }: GhsInputProps) {
  const [text, setText] = useState((pesewas / 100).toFixed(2));

  useEffect(() => {
    setText((pesewas / 100).toFixed(2));
  }, [pesewas]);

  return (
    <input
      id={id}
      type="text"
      inputMode="decimal"
      disabled={disabled}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        const parsed = Number.parseFloat(text.replace(/,/g, ""));
        if (Number.isFinite(parsed) && parsed >= 0) {
          onPesewasChange(Math.round(parsed * 100));
        } else {
          setText((pesewas / 100).toFixed(2));
        }
      }}
    />
  );
}
