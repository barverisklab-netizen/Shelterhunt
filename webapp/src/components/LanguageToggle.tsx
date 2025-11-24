import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Languages } from "lucide-react";
import { localeOptions, useI18n } from "@/i18n";
import { motion, AnimatePresence } from "motion/react";

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
      localeOptions.map((opt: { value: string }) => ({
        ...opt,
        label: t(`common.language.${opt.value}`),
      })),
    [t],
  );

  useEffect(() => {
    const handleClickAway = (event: MouseEvent) => {
      if (!open) return;
      if (!containerRef.current) return;
      if (!(event.target instanceof Node)) return;

      if (!containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickAway);
    return () => {
      document.removeEventListener("mousedown", handleClickAway);
    };
  }, [open]);

  const baseClasses = inline
    ? "relative pointer-events-auto"
    : "fixed top-4 right-4 pointer-events-auto";

  const content = (
    <div
      className={`${baseClasses} ${className ?? ""}`}
      ref={containerRef}
      style={!inline ? { zIndex: 2147483647 } : undefined}
    >
      <motion.div
        layout
        initial={false}
        className="bg-background backdrop-blur border-2 border-black shadow-lg overflow-hidden pointer-events-auto"
        style={{ borderRadius: 20 }}
        transition={{ type: "spring", stiffness: 120, damping: 15, mass: 1.2 }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {open ? (
            <motion.div
              key="options"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ 
                type: "spring", 
                stiffness: 120, 
                damping: 15,
                mass: 1.2
              }}
              className="p-2 flex flex-col gap-1 min-w-[140px]"
            >
              {options.map((option: { value: string; label: string }) => (
                <button
                  key={option.value}
                  onClick={() => {
                    setLocale(option.value);
                    setOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs font-bold uppercase rounded-lg transition-colors cursor-pointer ${
                    option.value === locale
                      ? "bg-black text-black-40"
                      : "hover:bg-neutral-100 text-black"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </motion.div>
          ) : (
            <motion.button
              key="toggle"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              transition={{ 
                type: "spring", 
                stiffness: 120, 
                damping: 15,
                mass: 1.2
              }}
              onClick={() => setOpen(true)}
              className="p-3 flex items-center justify-center hover:bg-neutral-100 transition-colors cursor-pointer"
            >
              <Languages className="h-5 w-5 text-black pointer-events-none" />
            </motion.button>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );

  if (inline) {
    return content;
  }

  return createPortal(content, document.body);
}
