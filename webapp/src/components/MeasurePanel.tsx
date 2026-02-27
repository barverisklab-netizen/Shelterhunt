import { AnimatePresence, motion } from "motion/react";
import { ChevronUp, Ruler } from "lucide-react";
import type { MeasureState } from "@/features/measurement/hooks/useMeasurementTool";

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

  const canToggle = measureState.status !== "idle";

  return (
    <motion.div
      className="fixed bottom-0 left-0 right-0 z-40 bg-background border-t-4 border-black"
      initial={{ y: "100%" }}
      animate={{ y: isPanelCollapsed ? "calc(100% - 72px)" : 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
    >
      <button
        type="button"
        onClick={() => (canToggle ? onToggleCollapse() : null)}
        className={`w-full py-4 flex flex-col items-center gap-2 transition-colors ${
          canToggle ? "cursor-pointer hover:bg-black/5" : "cursor-default"
        }`}
      >
        <div className="w-12 h-1 bg-background" />
        <div className="flex items-center gap-2 text-black">
          <Ruler className="h-5 w-5" />
          <span className="text-lg font-bold uppercase">{headerTitle}</span>
          {canToggle && (
            <motion.div
              animate={{ rotate: isPanelCollapsed ? 0 : 180 }}
              transition={{ duration: 0.2 }}
              className="text-black"
            >
              <ChevronUp className="h-5 w-5 text-black" />
            </motion.div>
          )}
        </div>
        <div className="text-xs text-black/70">{headerSubtitle}</div>
      </button>

      <AnimatePresence>
        {!isPanelCollapsed && (
          <motion.div
            key="measurement-panel-details"
            className="max-h-[60vh] w-full max-w-[400px] overflow-y-auto px-4 py-4 text-black space-y-3 mx-auto"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            {measureState.status === "placing" && (
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end pt-2">
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
                <p className="text-xs text-black/60">
                  {t("map.measure.layerCountsNote", {
                    fallback:
                      "Counts reflect only the currently active layers you have toggled on.",
                  })}
                </p>
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
                <div className="grid w-full gap-2 pb-1 items-start justify-items-start sm:inline-grid sm:w-fit sm:max-w-[400px] sm:grid-cols-3">
                  <button
                    type="button"
                    onClick={onMovePoint}
                    className="w-fit max-w-[200px] rounded border border-black px-3 py-2 text-xs font-semibold uppercase tracking-wide hover:bg-neutral-100"
                  >
                    {t("map.measure.popup.move", { fallback: "Move center" })}
                  </button>
                  <button
                    type="button"
                    onClick={onDeleteMeasurement}
                    className="w-fit max-w-[200px] rounded border border-black bg-red-500/20 px-3 py-2 text-xs font-bold uppercase tracking-wide text-black hover:bg-neutral-100 active:bg-neutral-200"
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
