import { AnimatePresence, motion } from "motion/react";
import { ChevronDown } from "lucide-react";

type MeasureStatus = "idle" | "placing" | "active";

type MeasureState = {
  status: MeasureStatus;
  radius: number;
  count: number;
  featureNames: string[];
  layerCounts: Record<string, number>;
};

type TranslateFn = (
  key: string,
  options?: { fallback?: string; replacements?: Record<string, string | number> },
) => string;

interface MeasurePanelProps {
  measureState: MeasureState;
  isPanelCollapsed: boolean;
  onToggleCollapse: () => void;
  onMovePoint: () => void;
  onDeleteMeasurement: () => void;
  onCancelPlacement: () => void;
  t: TranslateFn;
}

export function MeasurePanel({
  measureState,
  isPanelCollapsed,
  onToggleCollapse,
  onMovePoint,
  onDeleteMeasurement,
  onCancelPlacement,
  t,
}: MeasurePanelProps) {
  const headerTitle =
    measureState.status === "active"
      ? t("map.measure.featuresTitle", {
          replacements: { radius: measureState.radius },
          fallback: `Features within ${measureState.radius}m`,
        })
      : t("map.measure.title", { fallback: "Measure Radius" });

  const headerSubtitle =
    measureState.status === "active"
      ? t("map.measure.featuresSubtitle", {
          replacements: { count: measureState.count },
          fallback: `${measureState.count} feature${measureState.count === 1 ? "" : "s"} total`,
        })
      : t("map.measure.startSubtitle", { fallback: "Drop a center point to begin" });

  const sortedLayerCounts = Object.entries(measureState.layerCounts)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);

  const canToggle = measureState.status === "active" && measureState.featureNames.length > 0;

  return (
    <motion.div
      className="absolute bottom-4 left-1/2 z-30 w-[92vw] max-w-sm -translate-x-1/2 rounded-lg bg-background p-4 shadow-xl"
      initial={{ opacity: 0, y: 20, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.96 }}
    >
      <button
        type="button"
        onClick={() => {
          if (canToggle) {
            onToggleCollapse();
          }
        }}
        className={`w-full rounded px-4 py-3 text-left transition-colors ${
          canToggle ? "cursor-pointer" : "cursor-default"
        }`}
      >
        <div className="flex items-center justify-between gap-3 pb-1">
          <div className="space-y-1">
            <div className="text-sm font-bold uppercase text-black leading-tight">
              {headerTitle}
            </div>
            <div className="text-xs text-black/70 pb-1.5">{headerSubtitle}</div>
          </div>
          {canToggle && (
            <motion.div animate={{ rotate: isPanelCollapsed ? 180 : 0 }} transition={{ duration: 0.2 }} className="text-black">
              <ChevronDown className="h-4 w-4 text-black" />
            </motion.div>
          )}
        </div>
      </button>

      <AnimatePresence>
        {!isPanelCollapsed && (
          <motion.div
            key="measurement-panel-details"
            className="mt-4 space-y-3 text-black"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
          >
            {measureState.status === "placing" && (
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={onCancelPlacement}
                  className="w-full sm:w-auto rounded border border-black px-3 py-2 text-xs font-semibold uppercase tracking-wide hover:bg-neutral-100"
                >
                  {t("common.cancel", { fallback: "Cancel" })}
                </button>
              </div>
            )}

            {measureState.status === "active" && (
              <>
                {measureState.featureNames.length === 0 && (
                  <p className="text-xs text-black/50 italic">
                    {t("map.measure.noFeatures", {
                      fallback: "No visible point-layer features in this radius.",
                    })}
                  </p>
                )}
                {sortedLayerCounts.length > 0 && (
                  <div className="overflow-hidden rounded border border-black/20 text-xs text-black/80">
                    {sortedLayerCounts.map(([label, count], index) => (
                      <div
                        key={label}
                        className={`grid grid-cols-2 px-3 py-2 ${
                          index > 0 ? "border-t border-black/10" : ""
                        }`}
                      >
                        <span className="font-semibold">{label}</span>
                        <span className="text-right">
                          {t("map.measure.table.countValue", {
                            replacements: { count },
                            fallback: `${count} feature${count === 1 ? "" : "s"}`,
                          })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="grid gap-2 pb-1 sm:grid-cols-3">
                  <button
                    type="button"
                    onClick={onMovePoint}
                    className="rounded border border-black px-3 py-2 text-xs font-semibold uppercase tracking-wide hover:bg-neutral-100"
                  >
                    {t("map.measure.popup.move", { fallback: "Move center" })}
                  </button>
                  <button
                    type="button"
                    onClick={onDeleteMeasurement}
                    className="rounded border border-black bg-red-500/20 px-3 py-2 text-xs font-bold uppercase tracking-wide text-black hover:bg-red-600 hover:text-white active:bg-red-600 active:text-white"
                  >
                    {t("map.measure.popup.delete", { fallback: "Delete" })}
                  </button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
