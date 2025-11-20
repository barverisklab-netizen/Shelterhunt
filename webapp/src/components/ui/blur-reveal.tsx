import { useState } from "react";
import { cn } from "./utils";

interface BlurRevealProps extends React.HTMLAttributes<HTMLSpanElement> {
  /**
   * Allow callers to toggle the blur effect (kept for easy rollback of the experiment).
   */
  isEnabled?: boolean;
  /**
   * Override the blur strength while concealed.
   */
  blurClassName?: string;
  /**
   * Pixel value used for inline blur fallback.
   */
  blurAmount?: string;
  /**
   * Optional extra class applied when the value is revealed.
   */
  revealClassName?: string;
}

/**
 * BlurReveal keeps its children blurred until the user intentionally interacts
 * via hover, touch, or keyboard focus. Once the pointer/focus leaves it returns
 * to the blurred state. Designed as a lightweight, easily removable helper.
 */
export function BlurReveal({
  children,
  className,
  isEnabled = true,
  blurClassName = "blur-md",
  blurAmount = "12px",
  revealClassName,
  ...props
}: BlurRevealProps) {
  const [isHovering, setIsHovering] = useState(false);
  const [isPressing, setIsPressing] = useState(false);
  const [hasFocus, setHasFocus] = useState(false);

  const isInteractive = isEnabled && (isHovering || isPressing || hasFocus);

  if (!isEnabled) {
    return (
      <span className={className} {...props}>
        {children}
      </span>
    );
  }

  return (
    <span
      tabIndex={0}
      role="button"
      aria-pressed={isInteractive}
      className={cn(
        "inline-flex cursor-pointer select-none items-center transition",
        className
      )}
      onPointerEnter={() => setIsHovering(true)}
      onPointerLeave={() => {
        setIsHovering(false);
        setIsPressing(false);
      }}
      onPointerDown={() => setIsPressing(true)}
      onPointerUp={() => setIsPressing(false)}
      onPointerCancel={() => setIsPressing(false)}
      onFocus={() => setHasFocus(true)}
      onBlur={() => setHasFocus(false)}
      {...props}
    >
      <span
        className={cn(
          "filter transition-[filter] duration-200 ease-out",
          isInteractive ? "blur-0" : blurClassName,
          isInteractive ? revealClassName : undefined
        )}
        style={{ filter: isInteractive ? "blur(0px)" : `blur(${blurAmount})` }}
      >
        {children}
      </span>
    </span>
  );
}
