import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import type { KotoLayerGroup } from "@/types/kotoLayers";

export interface MapLayerToggleItem {
  id: number;
  label: string;
  icon: ReactNode;
  checked: boolean;
  onChange: () => void;
}

export interface MapLayerGroupSection {
  group: KotoLayerGroup;
  title: string;
  isOpen: boolean;
  layers: MapLayerToggleItem[];
  onToggleGroup: () => void;
}

interface MapLayerPanelProps {
  showLayerControl: boolean;
  onPanelToggle: (desiredState?: boolean) => void;
  titleLabel: string;
  clearAllLabel: string;
  clearAllDisabled: boolean;
  onClearAll: () => void;
  groupedLayers: MapLayerGroupSection[];
}

export function MapLayerPanel({
  showLayerControl,
  onPanelToggle,
  titleLabel,
  clearAllLabel,
  clearAllDisabled,
  onClearAll,
  groupedLayers,
}: MapLayerPanelProps) {
  return (
    <>
      <AnimatePresence>
        {showLayerControl && (
          <>
            <motion.button
              type="button"
              aria-label={titleLabel}
              className="absolute inset-0 z-[29] bg-transparent"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => onPanelToggle(false)}
            />
            <motion.div
              className="absolute top-16 left-4 z-[30] w-[300px] max-w-[90vw] min-w-[220px] space-y-3 rounded-lg border border-neutral-400 bg-background p-4 shadow-lg"
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              style={{
                width: "300px",
                minWidth: "220px",
                maxWidth: "90vw",
                marginTop: "15px",
                maxHeight: "min(80vh, 320px)",
                overflowY: "auto",
              }}
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-l font-semibold uppercase text-black">
                  {titleLabel}
                </span>
                <button
                  type="button"
                  onClick={onClearAll}
                  disabled={clearAllDisabled}
                  className="rounded border border-black bg-background px-3 py-1 text-xs font-semibold uppercase text-black transition-colors hover:bg-neutral-100 disabled:cursor-not-allowed disabled:border-neutral-400 disabled:bg-neutral-200 disabled:text-neutral-500"
                >
                  {clearAllLabel}
                </button>
              </div>

              <div className="space-y-2">
                {groupedLayers.map((grouped) => (
                  <div
                    key={grouped.group}
                    className="rounded-md bg-white"
                  >
                    <button
                      type="button"
                      onClick={grouped.onToggleGroup}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-semibold text-black"
                    >
                      <span>{grouped.title}</span>
                      <span className="font-bold text-black leading-none">
                        {grouped.isOpen ? "-" : "+"}
                      </span>
                    </button>
                    <AnimatePresence initial={false}>
                      {grouped.isOpen && (
                        <motion.div
                          key={`${grouped.group}-content`}
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          transition={{ duration: 0.15 }}
                          className="space-y-1 border-t border-neutral-200 px-2 py-2"
                        >
                          {grouped.layers.map((layer) => (
                            <LayerToggle
                              key={layer.id}
                              label={layer.label}
                              icon={layer.icon}
                              checked={layer.checked}
                              onChange={layer.onChange}
                            />
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function LayerToggle({
  label,
  icon,
  checked,
  onChange,
}: {
  label: string;
  icon: ReactNode;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex items-center gap-3 cursor-pointer rounded px-2 py-1 transition-colors hover:bg-neutral-100">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 accent-black border border-black"
      />
      {icon}
      <span className="text-sm text-black">{label}</span>
    </label>
  );
}
