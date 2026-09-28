// Test stand-in for the TipTap editor (ProseMirror needs real layout APIs).
import React from "react";

export default function FakeRichTextEditor({ value, onChange, disabled, labelledBy }) {
  return (
    <textarea
      data-testid="visual-editor"
      aria-labelledby={labelledBy}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
