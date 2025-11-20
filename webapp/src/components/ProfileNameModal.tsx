import { useEffect, useRef, useState } from "react";

interface ProfileNameModalProps {
  open: boolean;
  initialValue: string;
  onSubmit: (value: string) => void;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  placeholder?: string;
  submitLabel?: string;
  label?: string;
  variant?: "modal" | "screen";
  submitting?: boolean;
  error?: string | null;
}

export function ProfileNameModal({
  open,
  initialValue,
  onSubmit,
  onClose,
  title = "Introduce Yourself",
  subtitle = "Set your callsign before entering multiplayer.",
  placeholder = "e.g. Sky Scout",
  submitLabel = "Save Name",
  label = "Display Name",
  variant = "modal",
  submitting = false,
  error = null,
}: ProfileNameModalProps) {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setValue(initialValue);
    requestAnimationFrame(() => {
      try {
        inputRef.current?.focus();
      } catch {
        // ignore focus issues that can be caused by extensions
      }
    });
  }, [open, initialValue]);

  if (!open) {
    return null;
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) {
      return;
    }
    onSubmit(trimmed);
  };

  const content = (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-sm rounded-3xl border-4 border-black bg-white p-6 shadow-[8px_8px_0_rgba(0,0,0,0.9)]"
    >
      <h2 className="text-2xl font-black uppercase tracking-wide text-black">
        {title}
      </h2>
      <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-neutral-600">
        {subtitle}
      </p>

      <div className="mt-4">
        <label className="text-xs font-bold uppercase tracking-wide text-black">
          {label}
        </label>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          maxLength={32}
          placeholder={placeholder}
          className="mt-2 w-full rounded-xl border-2 border-black px-4 py-2 text-sm font-semibold uppercase tracking-wide text-black outline-none focus:ring-2 focus:ring-red-500"
          disabled={submitting}
        />
      </div>

      {error && (
        <div className="mt-3 rounded-xl px-3 py-2 text-xs font-semibold uppercase tracking-widest text-red-400">
          {error}
        </div>
      )}

      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          className="flex-1 rounded-xl border-2 border-black px-4 py-2 text-sm font-bold uppercase tracking-wide text-black transition hover:bg-black hover:text-white disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!value.trim() || submitting}
          className="flex-1 rounded-xl border-2 border-black bg-red-600 px-4 py-2 text-sm font-bold uppercase tracking-wide text-black transition hover:-translate-y-0.5 hover:shadow-[4px_4px_0_rgba(0,0,0,0.9)] disabled:opacity-50"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );

  if (variant === "screen") {
    return (
      <div className="min-h-screen bg-background relative overflow-hidden flex items-center justify-center p-6">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-16 left-10 h-32 w-32 rounded-full bg-red-500 opacity-70 blur-3xl" />
          <div className="absolute bottom-10 right-10 h-40 w-40 rounded-full bg-black opacity-60 blur-3xl" />
        </div>
        <div className="relative z-10 w-full max-w-lg flex flex-col items-center gap-6">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 px-4">
      {content}
    </div>
  );
}
