interface HostShareModalProps {
  open: boolean;
  code: string | null;
  onClose: () => void;
}

export function HostShareModal({ open, code, onClose }: HostShareModalProps) {
  if (!open || !code) {
    return null;
  }

  const handleCopyCode = () => {
    if (!code) return;
    try {
      void navigator.clipboard?.writeText(code);
    } catch {
      // silent clipboard failure
    }
  };

  return (
    <div className="fixed inset-0 z-[85] flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-sm rounded-3xl border-4 border-black bg-white p-6 shadow-[8px_8px_0_rgba(0,0,0,0.9)]">
        <h2 className="text-2xl font-black uppercase tracking-wide text-black">Session Ready</h2>
        <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-neutral-600">
          Share this shelter code with your squad to let them join.
        </p>

        <div className="mt-5 rounded-2xl border-2 border-black bg-neutral-100 px-4 py-6 text-center">
          <span className="text-sm font-semibold uppercase tracking-wide text-neutral-600">
            Shelter Code
          </span>
          <div className="mt-2 text-3xl font-black uppercase tracking-[0.3em] text-black">
            {code}
          </div>
        </div>

        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={handleCopyCode}
            className="flex-1 rounded-xl border-2 border-black px-4 py-2 text-sm font-bold uppercase tracking-wide text-black transition hover:bg-black hover:text-white"
          >
            Copy Code
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border-2 border-black bg-red-600 px-4 py-2 text-sm font-bold uppercase tracking-wide text-black transition hover:-translate-y-0.5 hover:shadow-[4px_4px_0_rgba(0,0,0,0.9)]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
