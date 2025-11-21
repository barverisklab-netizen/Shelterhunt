import { useEffect, useMemo, useRef, useState } from "react";
import { Languages, ChevronDown } from "lucide-react";
import { localeOptions, useI18n } from "@/i18n";

type LanguageToggleProps = {
  inline?: boolean;
  className?: string;
};

export function LanguageToggle({ inline = false, className }: LanguageToggleProps) {
  const { locale, setLocale, t } = useI18n();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const options = useMemo(
    () =>
      localeOptions.map((opt) => ({
        ...opt,
        label: t(`common.language.${opt.value}`),
      })),
    [t],
  );

  const currentLabel =
    options.find((opt) => opt.value === locale)?.label ?? locale.toUpperCase();

  useEffect(() => {
    const handleClickAway = (event: MouseEvent) => {
      if (!open) return;
      if (!containerRef.current) return;
      if (!(event.target instanceof Node)) return;

      if (!containerRef.current.contains(event.target)) {
        setOpen(false);
        console.log("[i18n] Language dropdown closed via outside click");
      }
    };

    document.addEventListener("mousedown", handleClickAway);
    return () => {
      document.removeEventListener("mousedown", handleClickAway);
    };
  }, [open]);

  const baseClasses = inline
    ? "pointer-events-auto relative"
    : "pointer-events-auto fixed right-4 top-4";

  const wrapperClass = [baseClasses, className ?? ""].filter(Boolean).join(" ");

  return (
    <div
      ref={containerRef}
      className={wrapperClass}
      style={
        inline
          ? { pointerEvents: "auto" }
          : { zIndex: 2147483647, touchAction: "manipulation", pointerEvents: "auto" }
      }
      onPointerDown={() => console.log("[i18n] toggle pointer down")}
    >
      <button
        type="button"
        onClick={() => {
          setOpen((prev) => {
            const next = !prev;
            console.log("[i18n] Language dropdown toggled", { next });
            return next;
          });
        }}
        aria-expanded={open}
        className="inline-flex items-center gap-2 rounded-lg border-2 border-black bg-white/95 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-black shadow-lg backdrop-blur transition hover:-translate-y-[1px] cursor-pointer"
      >
        <Languages className="h-4 w-4 text-black" aria-hidden />
        <span className="font-bold">{currentLabel}</span>
        <ChevronDown
          className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      {open ? (
        <div className="mt-2 w-44 rounded-lg border-2 border-black bg-background p-1 shadow-xl backdrop-blur">
          {options.map((option) => {
            const isActive = option.value === locale;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  console.log("[i18n] Language set", { value: option.value });
                  setLocale(option.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wide transition cursor-pointer rounded-lg first:rounded-t-lg last:rounded-b-lg ${
                  isActive
                    ? "bg-black text-neutral-500"
                    : "bg-transparent text-black hover:bg-neutral-100"
                }`}
                aria-pressed={isActive}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
