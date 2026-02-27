import { AnimatePresence, motion } from "motion/react";
import { Layers } from "lucide-react";
import type { ReactNode } from "react";
import type { KotoLayerGroup, KotoLayerSwatchType } from "@/types/kotoLayers";

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

export interface MapLayerLegendItem {
  key: string;
  label: string;
  swatchColor: string;
  swatchType: KotoLayerSwatchType;
}

export interface MapLayerLegendSection {
  id: number;
  items: MapLayerLegendItem[];
}

interface MapLayerPanelProps {
  showLayerControl: boolean;
  onPanelToggle: (desiredState?: boolean) => void;
  titleLabel: string;
  clearAllLabel: string;
  clearAllDisabled: boolean;
  onClearAll: () => void;
  groupedLayers: MapLayerGroupSection[];
  legendSections: MapLayerLegendSection[];
  legendTitle: string;
  legendButtonLabel: string;
  legendCloseAriaLabel: string;
  userLocationLabel: string;
  legendNote: string;
}

export function MapLayerPanel({
  showLayerControl,
  onPanelToggle,
  titleLabel,
  clearAllLabel,
  clearAllDisabled,
  onClearAll,
  groupedLayers,
  legendSections,
  legendTitle,
  legendButtonLabel,
  legendCloseAriaLabel,
  userLocationLabel,
  legendNote,
}: MapLayerPanelProps) {
  return (
    <>
      <motion.button
        onClick={() => onPanelToggle()}
        className="absolute top-4 left-4 z-10 rounded-full border border-neutral-900 bg-background p-3 text-neutral-900 shadow-sm transition-colors hover:bg-neutral-100 cursor-pointer"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <Layers className="w-6 h-6 text-black" />
      </motion.button>

      <AnimatePresence>
        {showLayerControl && (
          <>
            <motion.button
              type="button"
              aria-label={titleLabel}
              className="absolute inset-0 z-[9] bg-transparent"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => onPanelToggle(false)}
            />
            <motion.div
              className="absolute top-16 left-4 z-10 w-[300px] max-w-[90vw] min-w-[220px] space-y-3 rounded-lg border border-black bg-background p-4 shadow-lg"
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              style={{
                width: "300px",
                minWidth: "220px",
                maxWidth: "90vw",
                marginTop: "10px",
                maxHeight: "min(80vh, 320px)",
                overflowY: "auto",
              }}
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-semibold uppercase text-black">
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
                      <span className="text-lg leading-none">
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

      <AnimatePresence>
        {showLayerControl ? (
          <motion.div
            className="absolute bottom-20 left-4 z-10 max-h-[60vh] space-y-2 overflow-y-auto rounded-lg border border-black bg-background p-3 shadow-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold uppercase text-black">{legendTitle}</span>
              <button
                onClick={() => onPanelToggle(false)}
                className="text-black transition-colors hover:text-red-600"
                aria-label={legendCloseAriaLabel}
              >
                ✕
              </button>
            </div>
            <div className="my-2 flex items-center gap-2 text-xs text-black">
              <div className="h-3 w-3 rounded-full bg-black" />
              <span>{userLocationLabel}</span>
            </div>
            <div className="my-2 border-t border-black"></div>

            {legendSections.map((section, sectionIndex) => (
              <div key={section.id}>
                {section.items.map((item) => {
                  const swatchClasses =
                    item.swatchType === "symbol" || item.swatchType === "line"
                      ? "rounded-full"
                      : "rounded";

                  return (
                    <div
                      key={item.key}
                      className="mb-2 flex items-center gap-2 text-xs text-black"
                    >
                      <div
                        className={`h-3 w-3 ${swatchClasses}`}
                        style={{ backgroundColor: item.swatchColor }}
                      />
                      <span>{item.label}</span>
                    </div>
                  );
                })}
                {sectionIndex < legendSections.length - 1 && (
                  <div className="my-2 border-t border-neutral-300"></div>
                )}
              </div>
            ))}

            <div className="mt-3 text-xs text-black/70">
              {legendNote}
            </div>
          </motion.div>
        ) : (
          <motion.button
            onClick={() => onPanelToggle(true)}
            className="absolute bottom-20 left-4 z-10 rounded-full border border-black bg-background px-4 py-2 text-sm font-semibold uppercase text-black shadow-sm transition-colors hover:bg-neutral-100"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            {legendButtonLabel}
          </motion.button>
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
