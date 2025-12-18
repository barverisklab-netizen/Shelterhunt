import { motion, AnimatePresence } from "motion/react";
import {
  ChevronUp,
  Lock,
  Unlock,
  MapPin,
  Home,
  Users,
  Radar,
  ArrowLeft,
} from "lucide-react";
import { Button } from "./ui/button";
import { Question } from "@/types/game";
import { QuestionCategory } from "../data/cityContext";
import { useState } from "react";
import { useI18n } from "@/i18n";

interface QuestionDrawerProps {
  questions: Question[];
  availableCategories: QuestionCategory[];
  isOpen: boolean;
  onToggle: () => void;
  onAskQuestion: (questionId: string, param: string | number) => void;
  nearbyPOI: string | null;
  lockedQuestions: string[];
  questionCooldowns?: Record<string, number>;
  onAskNearbyAmenity?: (info: { amenityKey: string; count: number }) => void;
  nearbyAmenityCounts?: Record<string, number>;
  proximityEnabled?: boolean;
  nearbyAmenityCategories?: string[];
  solvedNearbyAmenityKeys?: string[];
  nearbyShelterName?: string | null;
}

const CATEGORY_ICONS = {
  location: MapPin,
  facility: Home,
  nearby: Radar,
  capacity: Users,
};

export function QuestionDrawer({
  questions,
  availableCategories = [],
  isOpen,
  onToggle,
  onAskQuestion,
  nearbyPOI,
  lockedQuestions,
  questionCooldowns = {},
  onAskNearbyAmenity,
  nearbyAmenityCounts = {},
  proximityEnabled = true,
  nearbyAmenityCategories = [],
  solvedNearbyAmenityKeys = [],
  nearbyShelterName = null,
}: QuestionDrawerProps) {
  const { t } = useI18n();
  const [selectedParams, setSelectedParams] = useState<
    Record<string, string | number>
  >({});
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [nearbyAmenitySelection, setNearbyAmenitySelection] = useState<{
    amenityKey: string | null;
    count: number | null;
  }>({ amenityKey: null, count: null });

  const AMENITY_OPTIONS: { key: string; label: string }[] = [
    { key: "waterStation250m", label: t("questions.dynamic.nearbyAmenity.types.waterStation250m", { fallback: "Water stations" }) },
    { key: "hospital250m", label: t("questions.dynamic.nearbyAmenity.types.hospital250m", { fallback: "Hospitals" }) },
    { key: "aed250m", label: t("questions.dynamic.nearbyAmenity.types.aed250m", { fallback: "AEDs" }) },
    { key: "emergencySupplyStorage250m", label: t("questions.dynamic.nearbyAmenity.types.emergencySupplyStorage250m", { fallback: "Emergency supply storage" }) },
    { key: "communityCenter250m", label: t("questions.dynamic.nearbyAmenity.types.communityCenter250m", { fallback: "Community centers" }) },
    { key: "trainStation250m", label: t("questions.dynamic.nearbyAmenity.types.trainStation250m", { fallback: "Train stations" }) },
    { key: "shrineTemple250m", label: t("questions.dynamic.nearbyAmenity.types.shrineTemple250m", { fallback: "Shrines/Temples" }) },
    { key: "floodgate250m", label: t("questions.dynamic.nearbyAmenity.types.floodgate250m", { fallback: "Flood gates" }) },
    { key: "bridge250m", label: t("questions.dynamic.nearbyAmenity.types.bridge250m", { fallback: "Bridges" }) },
  ];
  const AMENITY_COUNT_OPTIONS = Array.from({ length: 11 }, (_, index) => index);
  const currentTime = Date.now();

  const translateCategory = (category: QuestionCategory) => ({
    name: t(`questions.categories.${category.id}.name`, {
      fallback: category.name,
    }),
    description: t(`questions.categories.${category.id}.description`, {
      fallback: category.description,
    }),
  });

  const translateQuestionText = (question: Question) =>
    t(`questions.${question.id}.text`, { fallback: question.text });

  const translateQuestionOption = (questionId: string, option: string | number) => {
    if (typeof option === "number") return option;
    const optionKey = option.toString().replace(/\s+/g, "_").toLowerCase();
    return t(`questions.${questionId}.options.${optionKey}`, { fallback: option });
  };

  const isQuestionEligible = (question: Question) => {
    if (question.id === "nearbyAmenity") {
      return !lockedQuestions.includes(question.id);
    }
    const inRange = nearbyPOI !== null || question.category === "location";
    return inRange && !lockedQuestions.includes(question.id);
  };

  const filteredQuestions = selectedCategory
    ? questions.filter((q) => q.category === selectedCategory)
    : [];

  const inRange =
    !!nearbyPOI ||
    !!nearbyShelterName ||
    !proximityEnabled ||
    Object.values(nearbyAmenityCounts).some((c) => (c ?? 0) > 0) ||
    nearbyAmenityCategories.length > 0;

  return (
    <motion.div
      className="fixed bottom-0 left-0 right-0 z-40"
      initial={{ y: "100%" }}
      animate={{ y: isOpen ? 0 : "calc(100% - 60px)" }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      style={{
        backgroundColor: "#FFF", //FIXME: Use Bauhaus color variable
      }}
    >
      <div className="bg-background border-t-4 border-black">
        {/* Drawer Handle */}
        <button
          onClick={onToggle}
          className="w-full py-4 flex flex-col items-center gap-2 cursor-pointer hover:bg-black/5 transition-colors"
        >
          <div className="w-12 h-1 bg-background" />
          <div className="flex items-center gap-2 text-black">
            <MapPin className="w-5 h-5" />
            <span className="text-lg font-bold uppercase">{t("questions.ask")}</span>
            <motion.div
              animate={{ rotate: isOpen ? 180 : 0 }}
              transition={{ duration: 0.3 }}
            >
              <ChevronUp className="w-5 h-5" />
            </motion.div>
          </div>
        </button>

        {/* Drawer Content */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              className="max-h-[60vh] overflow-y-auto p-4 pb-8 bg-background"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Location Status */}
              <motion.div
                className={`mb-4 p-4 border-4 ${
                  inRange
                    ? "bg-background border-red-400/50"
                    : "bg-background border-red-400/50"
                }`}
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
              >
                <div className="flex items-center gap-3">
                  {inRange ? (
                    <>
                      <Unlock className="w-5 h-5 text-red-600" />
                      <div>
                        <div className="text-black font-bold uppercase">
                          {t("questions.inRange")}
                        </div>
                        <div className="text-sm text-black/70">
                          {nearbyShelterName
                            ? t("questions.nearbyAmenity.availableCategories", {
                                replacements: { categories: `Shelter${nearbyAmenityCategories.length ? ", " + nearbyAmenityCategories.join(", ") : ""}` },
                                fallback: `Available nearby: Shelter${nearbyAmenityCategories.length ? `, ${nearbyAmenityCategories.join(", ")}` : ""}`,
                              })
                            : nearbyAmenityCategories.length > 0
                              ? t("questions.nearbyAmenity.availableCategories", {
                                  replacements: { categories: nearbyAmenityCategories.join(", ") },
                                  fallback: `Available nearby: ${nearbyAmenityCategories.join(", ")}`,
                                })
                              : t("questions.inRangeCopy")}
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <Lock className="w-5 h-5 text-black" />
                      <div>
                        <div className="text-black font-bold uppercase">
                          {t("questions.outOfRange")}
                        </div>
                        <div className="text-sm text-black/70">
                          {t("questions.outOfRangeCopy")}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </motion.div>

              {/* Category Selection or Questions */}
              {!selectedCategory ? (
                // Show Categories
                <div className="space-y-3">
                  <h3 className="text-black font-bold text-lg mb-3 uppercase">
                    {t("questions.chooseCategory")}
                  </h3>
                  {availableCategories.map((category, index) => {
                    const IconComponent = CATEGORY_ICONS[category.id];
                    const questionsInCategory = questions.filter(
                      (q) => q.category === category.id,
                    );
                    const translatedCategory = translateCategory(category);
                    const isNearbyCategory = category.id === "nearby";
                    const requireProximity = category.id !== "location" && !isNearbyCategory;
                    const hasNearbyAmenityAccess =
                      isNearbyCategory &&
                      (!proximityEnabled ||
                        Object.values(nearbyAmenityCounts).some((c) => (c ?? 0) > 0) ||
                        nearbyAmenityCategories.length > 0);
                    const isDisabled =
                      (isNearbyCategory
                        ? !hasNearbyAmenityAccess
                        : requireProximity && !nearbyPOI) ||
                      questionsInCategory.length === 0;

                    return (
                      <motion.button
                        key={category.id}
                        onClick={() => setSelectedCategory(category.id)}
                        disabled={isDisabled}
                        className="w-full bg-background border-4 border-black p-4 text-left hover:bg-black/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <div className="flex items-start gap-4">
                          <div className="bg-black p-3">
                            <IconComponent className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex-1">
                            <div
                              className={`mb-1 font-bold uppercase ${
                                isDisabled ? "text-neutral-500" : "text-black"
                              }`}
                            >
                              {translatedCategory.name}
                            </div>
                            {isDisabled ? (
                              <div className="mt-1 flex items-start gap-3 rounded border border-neutral-300 bg-neutral-100 p-3 text-sm text-neutral-600">
                                <IconComponent className="w-5 h-5 text-neutral-500 mt-0.5" />
                                <span>
                                  {isNearbyCategory
                                    ? t("questions.nearbyAmenity.noneWithinRadius", {
                                        fallback: "No amenities within 250m yet.",
                                      })
                                    : t("questions.disabledProximityHint", {
                                        fallback:
                                          "Move around the city and questions will unlock when this asset type is within 250m of your location.",
                                      })}
                                </span>
                              </div>
                            ) : (
                              <>
                                <div className="mt-1 flex items-start gap-3 rounded border border-neutral-300 bg-neutral-100 p-3">
                                  <IconComponent className="w-5 h-5 text-black mt-0.5" />
                                  <div className="space-y-1">
                                    <div className="text-sm text-black/70">
                                      {translatedCategory.description}
                                    </div>
                                    <div className="text-xs text-black font-bold">
                                      {t("questions.availableCount", {
                                        replacements: {
                                          count: questionsInCategory.length,
                                          suffix: questionsInCategory.length !== 1 ? "s" : "",
                                        },
                                      })}
                                    </div>
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              ) : (
                // Show Questions in Selected Category
                <div className="space-y-3">
                  <div className="flex items-center gap-3 mb-4">
                    <button
                      onClick={() => {
                        setSelectedCategory(null);
                        setSelectedParams({});
                      }}
                      className="bg-background border-4 border-black p-2 hover:bg-black/5 transition-colors"
                    >
                      <ArrowLeft className="w-5 h-5 text-black" />
                    </button>
                    <h3 className="text-black font-bold text-lg uppercase">
                      {availableCategories.find((c) => c.id === selectedCategory)
                        ? translateCategory(
                            availableCategories.find((c) => c.id === selectedCategory)!,
                          ).name
                        : ""}
                    </h3>
                  </div>

                  {filteredQuestions.map((question, index) => {
                    const isEligible = isQuestionEligible(question);
                    const isLocked = lockedQuestions.includes(question.id);
                    const cooldownExpiresAt = questionCooldowns[question.id];
                    const secondsLeft =
                      isLocked && cooldownExpiresAt
                        ? Math.max(0, Math.ceil((cooldownExpiresAt - currentTime) / 1000))
                        : null;
                    const selectedParam = selectedParams[question.id];
                    const outOfRange =
                      nearbyPOI === null && question.category !== "location";

                    return (
                      <motion.div
                        key={question.id}
                        className={`bg-background border-4 border-black p-4 space-y-3 ${
                          isLocked ? "opacity-50" : ""
                        }`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        {/* Question Header */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="text-black">
                              {translateQuestionText(question).replace("{param}", "___")}
                            </div>
                          </div>
                          {isLocked && (
                            <Lock className="w-5 h-5 text-red-600 flex-shrink-0" />
                          )}
                        </div>

                        {/* Parameter Selection */}
                        {question.id === "nearbyAmenity" ? (
                          <div className="space-y-2">
                            <label className="text-xs font-semibold uppercase text-black/70">
                              {t("questions.nearbyAmenity.selectAmenity", {
                                fallback: "Amenity type",
                              })}
                            </label>
                            <select
                              className="w-full rounded border-2 border-black px-3 py-2"
                              value={nearbyAmenitySelection.amenityKey ?? ""}
                              onChange={(e) =>
                                setNearbyAmenitySelection((prev) => ({
                                  ...prev,
                                  amenityKey: e.target.value || null,
                                }))
                              }
                              disabled={isLocked}
                            >
                              <option value="" disabled>
                                {t("questions.nearbyAmenity.selectAmenity", {
                                  fallback: "Amenity type",
                                })}
                              </option>
                              {AMENITY_OPTIONS.map((opt) => {
                                const count = nearbyAmenityCounts[opt.key] ?? 0;
                                const disabled =
                                  (proximityEnabled && typeof count === "number" && count <= 0) ||
                                  solvedNearbyAmenityKeys.includes(opt.key);
                                return (
                                  <option key={opt.key} value={opt.key} disabled={disabled}>
                                    {opt.label}
                                  </option>
                                );
                              })}
                            </select>
                            <label className="text-xs font-semibold uppercase text-black/70">
                              {t("questions.nearbyAmenity.selectCount", {
                                fallback: "Exact count",
                              })}
                            </label>
                            <select
                              className="w-full rounded border-2 border-black px-3 py-2"
                              value={
                                nearbyAmenitySelection.count != null
                                  ? String(nearbyAmenitySelection.count)
                                  : ""
                              }
                              onChange={(e) =>
                                setNearbyAmenitySelection((prev) => ({
                                  ...prev,
                                  count: e.target.value === "" ? null : Number(e.target.value),
                                }))
                              }
                              disabled={isLocked}
                            >
                              <option value="" disabled>
                                {t("questions.nearbyAmenity.selectCount", {
                                  fallback: "Minimum count",
                                })}
                              </option>
                            {AMENITY_COUNT_OPTIONS.map((n) => (
                              <option key={n} value={n}>
                                {n}
                              </option>
                            ))}
                          </select>
                            {nearbyAmenitySelection.amenityKey &&
                              proximityEnabled &&
                              (nearbyAmenityCounts[nearbyAmenitySelection.amenityKey] ?? 0) <=
                                0 && (
                                <div className="text-xs text-red-600 font-semibold">
                                  {t("questions.nearbyAmenity.unavailable", {
                                    fallback: "No amenities of this type within 250m. Move closer.",
                                  })}
                                </div>
                              )}
                            <Button
                              className={"w-full border border-black bg-background text-black hover:bg-neutral-100 active:bg-neutral-200"}
                              onClick={() => {
                                if (
                                  onAskNearbyAmenity &&
                                  nearbyAmenitySelection.amenityKey &&
                                  nearbyAmenitySelection.count != null
                                ) {
                                  onAskNearbyAmenity({
                                    amenityKey: nearbyAmenitySelection.amenityKey,
                                    count: nearbyAmenitySelection.count,
                                  });
                                }
                              }}
                              variant="destructive"
                              disabled={
                                !nearbyAmenitySelection.amenityKey ||
                                nearbyAmenitySelection.count == null ||
                                isLocked
                              }
                            >
                              <Unlock className="w-4 h-4 mr-2" />
                              {t("questions.askNow")}
                            </Button>
                          </div>
                        ) : question.paramType === "number" && (!question.options || !question.options.length) ? (
                          <div className="flex flex-col gap-2">
                            {question.id === "shelterCapacity" && (
                              <span className="text-xs font-semibold uppercase text-black/70">
                                {t("questions.enterNumber", { fallback: "Enter a number" })} (must be greater than 0)
                              </span>
                            )}
                            <input
                              type="number"
                              inputMode="numeric"
                              min={question.id === "shelterCapacity" ? 1 : 0}
                              step={question.id === "shelterCapacity" ? 1 : 1}
                              className="w-full rounded border-2 border-black px-3 py-2"
                              placeholder={t("questions.enterNumber", { fallback: "Enter a number" })}
                              value={selectedParam ?? ""}
                              onChange={(event) => {
                                const rawValue = event.target.value;
                                if (rawValue === "") {
                                  setSelectedParams({ ...selectedParams, [question.id]: "" });
                                  return;
                                }

                                const numericValue = Number(rawValue);
                                const isCapacityQuestion = question.id === "shelterCapacity";
                                const isValidNumber =
                                  Number.isFinite(numericValue) &&
                                  (isCapacityQuestion ? numericValue > 0 : numericValue >= 0);

                                setSelectedParams({
                                  ...selectedParams,
                                  [question.id]: isValidNumber ? numericValue : "",
                                });
                              }}
                              disabled={!isEligible || isLocked}
                            />
                          </div>
                        ) : question.options ? (
                          <div className="flex flex-wrap gap-2">
                            {question.options.map((option) => (
                              <button
                                key={option}
                                onClick={() =>
                                  setSelectedParams({
                                    ...selectedParams,
                                    [question.id]: option,
                                  })
                                }
                                disabled={!isEligible || isLocked}
                                className={`px-4 py-2 border text-sm transition-all ${
                                  selectedParam === option
                                    ? "bg-neutral-800 text-white border-black" 
                                    : "bg-background text-black border-black hover:bg-black/5"
                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                              >
                                {translateQuestionOption(question.id, option)}
                              </button>
                            ))}
                          </div>
                        ) : null}

                        {/* Ask Button */}
                        {isEligible &&
                          selectedParam !== undefined &&
                          selectedParam !== null &&
                          selectedParam !== "" &&
                          !isLocked && (
                            <Button
                              className={"w-full border border-black bg-background text-black hover:bg-neutral-100 active:bg-neutral-200"}
                              onClick={() => onAskQuestion(question.id, selectedParam)}
                              variant="destructive"
                            >
                              <Unlock className="w-4 h-4 mr-2" />
                              {t("questions.askNow")}
                            </Button>
                          )}

                        {isLocked && (
                          <div className="text-xs text-center text-red-600 font-bold">
                            {t("questions.cooldown", {
                              replacements: { seconds: secondsLeft ?? 0 },
                              fallback: `Question available again in ${secondsLeft ?? 0}s`,
                            })}
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
