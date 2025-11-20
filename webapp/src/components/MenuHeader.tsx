import { motion } from "motion/react";
import { MapPin } from "lucide-react";
import { cn } from "./ui/utils";

interface MenuHeaderProps {
  title: string;
  subtitle: string;
  versionLabel?: string;
  className?: string;
}

/**
 * Shared menu masthead used by onboarding/solo screens.
 * Preserves the Bauhaus animation / styling from the original implementation.
 */
export function MenuHeader({
  title,
  subtitle,
  versionLabel,
  className,
}: MenuHeaderProps) {
  return (
    <div className={cn("w-full max-w-md space-y-10 relative z-10", className)}>
      <div className="text-center space-y-6">
        <motion.div
          className="flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35, duration: 0.3, ease: "easeOut" }}
        >
          <motion.div
            className="relative w-32 h-32"
            initial={{ scale: 0, opacity: 0, y: -60, rotate: -8 }}
            animate={{ scale: 1, opacity: 1, y: 0, rotate: 0 }}
            transition={{
              delay: 0.35,
              type: "spring",
              stiffness: 280,
              damping: 22,
            }}
          >
            <motion.div
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
              initial={{ scale: 0, opacity: 0, rotate: -20 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{
                delay: 0.45,
                type: "spring",
                stiffness: 340,
                damping: 18,
              }}
            >
              <MapPin className="w-12 h-12 text-black" />
            </motion.div>
          </motion.div>
        </motion.div>

        <div className="space-y-4">
          <motion.h1
            className="text-4xl font-black uppercase tracking-tight leading-none"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            {title}
          </motion.h1>
          <motion.p
            className="text-base font-medium titlecase tracking-wider text-black"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            {subtitle}
          </motion.p>
          {versionLabel ? (
            <motion.span
              className="block text-xs font-medium tracking-[0.3em] uppercase text-neutral-500 text-center"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.05, duration: 0.5, ease: "easeOut" }}
            >
              {versionLabel}
            </motion.span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
