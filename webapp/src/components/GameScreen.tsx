import { motion, AnimatePresence } from 'motion/react';
import { Clock, Lightbulb, MapPin, Ruler, X} from 'lucide-react';
import { MapView } from './MapView';
import { QuestionDrawer } from './QuestionDrawer';
import { GameplayPanel } from './GameplayPanel';
import { GuessConfirmScreen } from './GuessConfirmScreen';
import { ShelterVictoryScreen } from './ShelterVictoryScreen';
import { ShelterPenaltyScreen } from './ShelterPenaltyScreen';
import { POI, Question, Clue, QuestionAttribute } from "@/types/game";
import { defaultCityContext } from '../data/cityContext';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from "sonner@2.0.3";
import { useI18n } from "@/i18n";
import type { Shelter } from "@/services/shelterDataService";
import { ENABLE_WRONG_GUESS_PENALTY, LIGHTNING_RADIUS_KM, PROXIMITY_RADIUS_KM } from "@/config/runtime";
import { haversineDistanceKm } from "@/utils/lightningSelection";
import { hasShelterWithinRadius, matchShelterWithinRadius } from "@/services/proximityIndex";


const PROXIMITY_DISABLED_FOR_TESTING =
  import.meta.env?.VITE_ENABLE_PROXIMITY === "false";
const PROXIMITY_ENABLED = !PROXIMITY_DISABLED_FOR_TESTING;
const QUESTION_COOLDOWN_MS = 120_000;
const GAMEPLAY_SNAPSHOT_KEY = "shelterhunt.gameplaySnapshot.v1";
const GAMEPLAY_SNAPSHOT_VERSION = 1;
const RESUME_GRACE_MS = 10 * 60 * 1000;

export type WrongGuessStage = 'first' | 'second' | 'third';

interface GameplaySnapshot {
  version: number;
  savedAt: number;
  resumeId: string;
  data: {
    clues: Clue[];
    visitedPOIs: string[];
    filteredPois: POI[] | null;
    filterSource: "correct" | "wrong" | null;
    penaltyStage: WrongGuessStage | null;
    wrongGuessCount: number;
    solvedQuestions: string[];
    solvedNearbyAmenityKeys: string[];
    questionCooldowns: Record<string, number>;
    outcome: "none" | "win" | "lose" | "penalty";
    externalWinnerName?: string;
    selectedShelterId: string | null;
  };
}

interface GameScreenProps {
  pois: POI[];
  questionAttributes: QuestionAttribute[];
  shelters: Shelter[];
  playerLocation: { lat: number; lng: number };
  timeRemaining: number;
  secretShelter?: { id: string; name: string } | null;
  shelterOptions: { id: string; name: string }[];
  isTimerCritical: boolean;
  isTimerEnabled: boolean;
  onApplyPenalty: () => WrongGuessStage;
  onEndGame: () => void;
  onLocationChange?: (location: { lat: number; lng: number }) => void;
  onSecretShelterChange?: (info: { id: string; name: string }) => void;
  onShelterOptionsChange?: (options: { id: string; name: string }[]) => void;
  currentPlayerName?: string;
  currentPlayerId?: string;
  onMultiplayerWin?: (info: { winnerName: string; winnerUserId?: string }) => void;
  remoteOutcome?: { result: "win" | "lose"; winnerName?: string } | null;
  gameMode?: "lightning" | "citywide" | null;
  lightningCenter?: { lat: number; lng: number } | null;
  lightningRadiusKm?: number;
  resumeId?: string;
}

export function GameScreen({
  pois,
  questionAttributes,
  shelters,
  playerLocation,
  timeRemaining,
  secretShelter,
  shelterOptions,
  isTimerCritical,
  isTimerEnabled,
  onApplyPenalty,
  onEndGame,
  onLocationChange,
  onSecretShelterChange,
  onShelterOptionsChange,
  currentPlayerName,
  currentPlayerId,
  onMultiplayerWin,
  remoteOutcome,
  gameMode = null,
  lightningCenter = null,
  lightningRadiusKm,
  resumeId,
}: GameScreenProps) {
  const { t } = useI18n();
  const proximityEnabled = PROXIMITY_ENABLED;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [cluesOpen, setCluesOpen] = useState(false);
  const [clues, setClues] = useState<Clue[]>([]);
  const [visitedPOIs, setVisitedPOIs] = useState<string[]>([]);
  const [nearbyPOI, setNearbyPOI] = useState<POI | null>(null);
  const previousNearbyPOIRef = useRef<POI | null>(null);
  const [selectedShelterId, setSelectedShelterId] = useState<string | null>(null);
  const [confirmGuessOpen, setConfirmGuessOpen] = useState(false);
  const [outcome, setOutcome] = useState<'none' | 'win' | 'lose' | 'penalty'>('none');
  const [measureTrigger, setMeasureTrigger] = useState(0);
  const [isMeasureActive, setIsMeasureActive] = useState(false);
  const [filteredPois, setFilteredPois] = useState<POI[] | null>(null);
  const [filterSource, setFilterSource] = useState<"correct" | "wrong" | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [penaltyStage, setPenaltyStage] = useState<WrongGuessStage | null>(null); // retained for compatibility
  const [wrongGuessCount, setWrongGuessCount] = useState(0);
  const [solvedQuestions, setSolvedQuestions] = useState<string[]>([]);
  const [externalWinnerName, setExternalWinnerName] = useState<string | undefined>(undefined);
  const [activePanel, setActivePanel] = useState<"layers" | "questions" | "gameplay" | null>(
    null,
  );
  const [layerPanelCloseSignal, setLayerPanelCloseSignal] = useState(0);
  const [nearbyAmenityCounts, setNearbyAmenityCounts] = useState<Record<string, number>>({});
  const [nearbyAmenityCategories, setNearbyAmenityCategories] = useState<string[]>([]);
  const [solvedNearbyAmenityKeys, setSolvedNearbyAmenityKeys] = useState<string[]>([]);
  const [nearbyShelterName, setNearbyShelterName] = useState<string | null>(null);
  const [, setCooldownTick] = useState(0);
  const [questionCooldowns, setQuestionCooldowns] = useState<Record<string, number>>({});
  const staleLocationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastGeoStatusRef = useRef<string>("unknown");
  const hasLoggedProximityRef = useRef(false);
  const [amenityQueryTrigger, setAmenityQueryTrigger] = useState(0);
  const lastAmenityQueryLocationRef = useRef<{ lat: number; lng: number } | null>(null);
  const secretShelterLogRef = useRef<string | null>(null);
  const secretShelterId = secretShelter?.id ?? null;
  const secretShelterName = secretShelter?.name ?? null;
  const DESIGNATED_CATEGORY = "designated ec";
  const normalizeValue = (value: unknown) =>
    typeof value === "number" ? String(value) : String(value ?? "").trim().toLowerCase();

  const lastLocationRequestRef = useRef<number>(0);
  const lastHighAccuracyRequestRef = useRef<number>(0);
  const restoredGameplayRef = useRef(false);
  const hasAnnouncedTestingModeRef = useRef(false);
  const requestLatestLocation = useCallback(() => {
    if (PROXIMITY_DISABLED_FOR_TESTING) return;
    if (typeof navigator === "undefined" || !navigator.geolocation || !onLocationChange) return;
    const now = Date.now();
    if (now - lastLocationRequestRef.current < 4000) return;
    lastLocationRequestRef.current = now;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        lastGeoStatusRef.current = "ok";
        onLocationChange({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      (err) => {
        lastGeoStatusRef.current = `error:${err.code ?? "unknown"}`;
        console.warn("[Geo] Unable to refresh location", err);
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 },
    );
  }, [onLocationChange]);

  const requestHighAccuracyLocation = useCallback(
    () =>
      new Promise<{ lat: number; lng: number } | null>((resolve) => {
        if (PROXIMITY_DISABLED_FOR_TESTING) {
          resolve(null);
          return;
        }
        if (typeof navigator === "undefined" || !navigator.geolocation) {
          resolve(null);
          return;
        }
        const now = Date.now();
        if (now - lastHighAccuracyRequestRef.current < 4000) {
          resolve(null);
          return;
        }
        lastHighAccuracyRequestRef.current = now;
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            lastGeoStatusRef.current = "ok";
            lastLocationRequestRef.current = Date.now();
            const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            onLocationChange?.(next);
            resolve(next);
          },
          (err) => {
            lastGeoStatusRef.current = `error:${err.code ?? "unknown"}`;
            console.warn("[Geo] High-accuracy refresh failed", err);
            resolve(null);
          },
          { enableHighAccuracy: true, maximumAge: 0, timeout: 8000 },
        );
      }),
    [onLocationChange],
  );

  const saveGameplaySnapshot = useCallback(() => {
    if (typeof window === "undefined") return;
    if (!resumeId) return;
    const snapshot: GameplaySnapshot = {
      version: GAMEPLAY_SNAPSHOT_VERSION,
      savedAt: Date.now(),
      resumeId,
      data: {
        clues,
        visitedPOIs,
        filteredPois,
        filterSource,
        penaltyStage,
        wrongGuessCount,
        solvedQuestions,
        solvedNearbyAmenityKeys,
        questionCooldowns,
        outcome,
        externalWinnerName,
        selectedShelterId,
      },
    };
    try {
      localStorage.setItem(GAMEPLAY_SNAPSHOT_KEY, JSON.stringify(snapshot));
    } catch (error) {
      console.warn("[Resume] Failed to save gameplay snapshot", error);
    }
  }, [
    clues,
    externalWinnerName,
    filterSource,
    filteredPois,
    outcome,
    penaltyStage,
    questionCooldowns,
    resumeId,
    selectedShelterId,
    solvedNearbyAmenityKeys,
    solvedQuestions,
    visitedPOIs,
    wrongGuessCount,
  ]);

  useEffect(() => {
    if (secretShelterName && secretShelterLogRef.current !== secretShelterName) {
      secretShelterLogRef.current = secretShelterName;
      console.info("[SecretShelter] Target updated", {
        id: secretShelterId,
        name: secretShelterName,
      });
    }
  }, [secretShelterId, secretShelterName]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!resumeId || restoredGameplayRef.current) return;
    const raw = localStorage.getItem(GAMEPLAY_SNAPSHOT_KEY);
    if (!raw) return;
    try {
      const snapshot = JSON.parse(raw) as GameplaySnapshot;
      if (snapshot.version !== GAMEPLAY_SNAPSHOT_VERSION) return;
      if (snapshot.resumeId !== resumeId) return;
      if (Date.now() - snapshot.savedAt > RESUME_GRACE_MS) return;
      const data = snapshot.data ?? {};
      setClues(Array.isArray(data.clues) ? data.clues : []);
      setVisitedPOIs(Array.isArray(data.visitedPOIs) ? data.visitedPOIs : []);
      setFilteredPois(Array.isArray(data.filteredPois) ? data.filteredPois : null);
      setFilterSource(data.filterSource ?? null);
      setPenaltyStage(data.penaltyStage ?? null);
      setWrongGuessCount(typeof data.wrongGuessCount === "number" ? data.wrongGuessCount : 0);
      setSolvedQuestions(Array.isArray(data.solvedQuestions) ? data.solvedQuestions : []);
      setSolvedNearbyAmenityKeys(
        Array.isArray(data.solvedNearbyAmenityKeys) ? data.solvedNearbyAmenityKeys : [],
      );
      setQuestionCooldowns(
        data.questionCooldowns && typeof data.questionCooldowns === "object"
          ? data.questionCooldowns
          : {},
      );
      const restoredOutcome =
        data.outcome === "win" ||
        data.outcome === "lose" ||
        data.outcome === "penalty" ||
        data.outcome === "none"
          ? data.outcome
          : "none";
      setOutcome(restoredOutcome);
      setExternalWinnerName(data.externalWinnerName);
      setSelectedShelterId(data.selectedShelterId ?? null);
      restoredGameplayRef.current = true;
    } catch (error) {
      console.warn("[Resume] Failed to parse gameplay snapshot", error);
    }
  }, [resumeId]);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        saveGameplaySnapshot();
      }
    };

    const handlePageHide = () => {
      saveGameplaySnapshot();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [saveGameplaySnapshot]);

  const closeLayerPanel = useCallback(() => {
    setLayerPanelCloseSignal((prev) => prev + 1);
  }, []);

  // Check if player is near a shelter (using geojson index, within proximity radius)
  const checkNearbyPOI = useCallback(async ({ forceLog = false }: { forceLog?: boolean } = {}) => {
    try {
      const result = await hasShelterWithinRadius(playerLocation, PROXIMITY_RADIUS_KM);
      let closest: POI | null = null;
      let closestDistanceKm = Number.POSITIVE_INFINITY;

      if (result.found && result.nearest) {
        closest = {
          id: `shelter-proximity-${result.nearest.lat}-${result.nearest.lng}`,
          name: result.nearest.category || "Nearby shelter",
          lat: result.nearest.lat,
          lng: result.nearest.lng,
          type: "shelter",
        };
        closestDistanceKm = haversineDistanceKm(playerLocation, {
          lat: result.nearest.lat,
          lng: result.nearest.lng,
        });
      }

      const previous = previousNearbyPOIRef.current;
      const changed = (previous?.id || null) !== (closest?.id || null);
      if (changed || forceLog || !hasLoggedProximityRef.current) {
        if (closest) {
          console.info("[Proximity] Nearby shelter detected", {
            id: closest.id,
            name: closest.name,
            distanceMeters: Math.round(closestDistanceKm * 1000),
            radiusKm: PROXIMITY_RADIUS_KM,
          });
        } else {
          console.info("[Proximity] No shelter within radius", {
            radiusKm: PROXIMITY_RADIUS_KM,
          });
        }
        previousNearbyPOIRef.current = closest;
        hasLoggedProximityRef.current = true;
      }

      setNearbyPOI(closest);
      setNearbyShelterName(closest?.name ?? null);
      if (closest && !visitedPOIs.includes(closest.id)) {
        setVisitedPOIs((prev) => [...prev, closest!.id]);
      }
    } catch (error) {
      console.warn("[Proximity] Failed to check nearby shelter", error);
    }
  }, [playerLocation.lat, playerLocation.lng, visitedPOIs]);

  const pollNearbyShelter = useCallback(() => {
    if (PROXIMITY_DISABLED_FOR_TESTING) return;
    requestLatestLocation();
    void checkNearbyPOI({ forceLog: true });
  }, [checkNearbyPOI, requestLatestLocation]);

  const pollProximityAndAmenities = useCallback(() => {
    pollNearbyShelter();
    if (PROXIMITY_DISABLED_FOR_TESTING) return;
    setAmenityQueryTrigger((prev) => prev + 1);
  }, [pollNearbyShelter]);

  const activatePanel = useCallback(
    (panel: "layers" | "questions" | "gameplay" | null) => {
      if (panel !== "layers") {
        closeLayerPanel();
      }

      if (panel === "questions") {
        pollProximityAndAmenities();
      }

      if (panel === "gameplay") {
        pollNearbyShelter();
      }

      setDrawerOpen(panel === "questions");
      setCluesOpen(panel === "gameplay");
      setActivePanel(panel);
    },
    [closeLayerPanel, pollNearbyShelter, pollProximityAndAmenities],
  );

  useEffect(() => {
    if (isMeasureActive && activePanel === "questions") {
      activatePanel(null);
    }
  }, [activatePanel, activePanel, isMeasureActive]);

  useEffect(() => {
    void checkNearbyPOI();
  }, [checkNearbyPOI]);

  // Align proximity gating with amenities: refresh proximity when opening questions or moving
  useEffect(() => {
    if (drawerOpen) {
      void checkNearbyPOI({ forceLog: true });
    }
  }, [drawerOpen, playerLocation.lat, playerLocation.lng, checkNearbyPOI]);

  useEffect(() => {
    if (!remoteOutcome) return;
    console.log("[GameScreen] remoteOutcome received", remoteOutcome);
    setOutcome(remoteOutcome.result);
    setExternalWinnerName(remoteOutcome.winnerName);
  }, [remoteOutcome]);

  useEffect(() => {
    console.info("[GameScreen] Player location updated", playerLocation);
    if (staleLocationTimerRef.current) {
      clearTimeout(staleLocationTimerRef.current);
    }
    staleLocationTimerRef.current = setTimeout(() => {
      console.info("[NearbyAmenity] Location stale, clearing amenity counts");
      setNearbyAmenityCounts({});
      setNearbyAmenityCategories([]);
    }, 15000);
  }, [playerLocation.lat, playerLocation.lng]);

  // Re-run amenity query if location changes while questions panel is open
  useEffect(() => {
    if (!drawerOpen) return;
    const prev = lastAmenityQueryLocationRef.current;
    if (!prev || prev.lat !== playerLocation.lat || prev.lng !== playerLocation.lng) {
      setAmenityQueryTrigger((n) => n + 1);
      lastAmenityQueryLocationRef.current = { lat: playerLocation.lat, lng: playerLocation.lng };
    }
  }, [drawerOpen, playerLocation.lat, playerLocation.lng]);

  useEffect(() => {
    // logging trimmed per request
  }, [playerLocation.lat, playerLocation.lng, nearbyAmenityCounts]);

  useEffect(() => {
    if (PROXIMITY_DISABLED_FOR_TESTING) return;
    const intervalId = window.setInterval(() => {
      setQuestionCooldowns((prev) => {
        const now = Date.now();
        let changed = false;
        const next: Record<string, number> = {};
        Object.entries(prev).forEach(([id, expiresAt]) => {
          if (expiresAt > now) {
            next[id] = expiresAt;
          } else {
            changed = true;
          }
        });
        return changed ? next : prev;
      });
      setCooldownTick((tick) => (tick + 1) % Number.MAX_SAFE_INTEGER);
    }, 1000);
    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const startQuestionCooldown = useCallback((questionId: string) => {
    if (PROXIMITY_DISABLED_FOR_TESTING) return;
    setQuestionCooldowns((prev) => ({
      ...prev,
      [questionId]: Date.now() + QUESTION_COOLDOWN_MS,
    }));
  }, []);

  const lockedQuestionIds = Object.keys(questionCooldowns);

  const attributeCategoryMap: Record<string, Question["category"]> = {
    floodDepth: "location",
    stormSurgeDepth: "location",
    floodDuration: "location",
    inlandWatersDepth: "location",
    facilityType: "facility",
    shelterCapacity: "capacity",
    waterStation250m: "nearby",
    hospital250m: "nearby",
    aed250m: "nearby",
    emergencySupplyStorage250m: "nearby",
    communityCenter250m: "nearby",
    trainStation250m: "nearby",
    shrineTemple250m: "nearby",
    floodgate250m: "nearby",
    bridge250m: "nearby",
  };

  const buildQuestionTexts = (attribute: QuestionAttribute) => {
    const baseLabel = attribute.label;
    const defaultQuestion = (() => {
      if (attribute.kind === "number") {
        if (attribute.id.endsWith("250m")) {
          return `Are there {param} ${baseLabel}?`;
        }
        return `Is the ${baseLabel} {param}?`;
      }
      return `Is the ${baseLabel} {param}?`;
    })();
    const defaultClue = attribute.id.endsWith("250m")
      ? `There are {param} ${baseLabel}`
      : `The ${baseLabel} is {param}`;

    const questionText = t(`questions.dynamic.${attribute.id}.question`, {
      fallback: defaultQuestion,
    });
    const clueTemplate = t(`questions.dynamic.${attribute.id}.clue`, {
      fallback: defaultClue,
    });

    return { questionText, clueTemplate };
  };

  const normalizeName = (value?: string | null) =>
    (value ?? '').trim().toLowerCase();
  const secretShelterRecord = secretShelter
    ? shelters.find(
        (shelter) =>
          shelter.shareCode === secretShelter.id ||
          shelter.code === secretShelter.id ||
          normalizeName(shelter.nameEn ?? shelter.nameJp ?? shelter.externalId ?? shelter.id) ===
            normalizeName(secretShelter.name),
      )
    : undefined;
  const attributeValueLookup: Record<string, (shelter: Shelter) => string | number | null> = {
    floodDepth: (shelter) => shelter.floodDepth,
    stormSurgeDepth: (shelter) => shelter.stormSurgeDepth,
    floodDuration: (shelter) => shelter.floodDuration,
    inlandWatersDepth: (shelter) => shelter.inlandWatersDepth,
    facilityType: (shelter) => shelter.facilityType,
    shelterCapacity: (shelter) => shelter.shelterCapacity,
    waterStation250m: (shelter) => shelter.waterStation250m,
    hospital250m: (shelter) => shelter.hospital250m,
    aed250m: (shelter) => shelter.aed250m,
    emergencySupplyStorage250m: (shelter) => shelter.emergencySupplyStorage250m,
    communityCenter250m: (shelter) => shelter.communityCenter250m,
    trainStation250m: (shelter) => shelter.trainStation250m,
    shrineTemple250m: (shelter) => shelter.shrineTemple250m,
    floodgate250m: (shelter) => shelter.floodgate250m,
    bridge250m: (shelter) => shelter.bridge250m,
  };

  const buildPoiFromShelter = useCallback(
    (shelter: Shelter): POI | null => {
      const lat = Number(shelter.latitude);
      const lng = Number(shelter.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

      const nameEn = shelter.nameEn ?? null;
      const nameJp = shelter.nameJp ?? null;
      const fallbackName = nameEn || nameJp || shelter.externalId || shelter.code;
      if (!fallbackName) return null;

      const properties: Record<string, string | number | null> = {
        "Landmark Name (EN)": nameEn ?? fallbackName,
        "Landmark Name (JP)": nameJp ?? fallbackName,
        Category: shelter.category ?? "",
        "Category (JP)": shelter.categoryJp ?? shelter.category ?? "",
        Shelter_Capacity:
          shelter.shelterCapacity != null ? Number(shelter.shelterCapacity) : null,
        "Address (EN)": shelter.addressEn ?? shelter.address ?? null,
        "Address (JP)": shelter.addressJp ?? shelter.address ?? null,
      };

      return {
        id: shelter.shareCode || shelter.code || shelter.id,
        name: fallbackName,
        nameEn,
        nameJp,
        lat,
        lng,
        type: "shelter",
        properties,
      };
    },
    [],
  );

  const handleApplyWrongClueFilter = () => {
    if (filterSource !== "correct" || !filteredPois) {
      toast.info(
        t("gameplay.filterUnavailable", {
          fallback: "Filter a correct clue first to remove wrong clues.",
        }),
      );
      return;
    }

    const wrongClues = clues.filter(
      (clue) => !clue.answer && clue.questionId && clue.paramValue != null,
    );
    if (!wrongClues.length) {
      toast.info(
        t("gameplay.filterUnavailable", {
          fallback: "No wrong clues available to filter.",
        }),
      );
      return;
    }

    const designatedShelters = shelters.filter(
      (shelter) =>
        typeof shelter.category === "string" &&
        shelter.category.toLowerCase() === DESIGNATED_CATEGORY,
    );

    const baseShelters = designatedShelters.filter((shelter) => {
      const sid = shelter.shareCode || shelter.code || shelter.id;
      return filteredPois.some((poi) => poi.id === sid);
    });

    const refinedShelters = baseShelters.filter((shelter) => {
      for (const clue of wrongClues) {
        const extractor = attributeValueLookup[clue.questionId as string];
        if (!extractor) continue;
        const value = extractor(shelter as any);
        if (normalizeValue(value) === normalizeValue(clue.paramValue)) {
          return false;
        }
      }
      return true;
    });

    if (!refinedShelters.length) {
      toast.error(
        t("gameplay.filterNoMatches", {
          fallback: "No shelters remain after removing wrong clues.",
        }),
      );
      return;
    }

    const refinedPois = refinedShelters
      .map((shelter) => buildPoiFromShelter(shelter))
      .filter((poi): poi is POI => Boolean(poi));

    setFilteredPois(refinedPois);
    toast.success(
      t("gameplay.filteredWrongClues", {
        fallback: "Removed shelters matching wrong clues.",
      }),
    );
  };

  const getSecretAnswer = (attributeId: string): string | number | null => {
    if (!secretShelterRecord) return null;
    const extractor = attributeValueLookup[attributeId];
    if (!extractor) return null;
    return extractor(secretShelterRecord);
  };

  const NEARBY_AMENITY_IDS = new Set([
    "waterStation250m",
    "hospital250m",
    "aed250m",
    "emergencySupplyStorage250m",
    "communityCenter250m",
    "trainStation250m",
    "shrineTemple250m",
    "floodgate250m",
    "bridge250m",
  ]);

  const baseQuestions: (Question & { clueTemplate?: string })[] = questionAttributes
    .filter((attribute) => !solvedQuestions.includes(attribute.id))
    .filter((attribute) => {
      const value = getSecretAnswer(attribute.id);
      return value !== null && value !== undefined;
    })
    .filter((attribute) => !NEARBY_AMENITY_IDS.has(attribute.id))
    .map((attribute) => {
      const { questionText, clueTemplate } = buildQuestionTexts(attribute);
      return {
        id: attribute.id,
        text: questionText,
        clueTemplate,
        category: attributeCategoryMap[attribute.id] ?? "location",
        paramType: attribute.kind === "number" ? "number" : "select",
        options: attribute.kind === "select" ? attribute.options : undefined,
      };
    });

  const nearbyAmenityQuestion: Question = {
    id: "nearbyAmenity",
    text: t("questions.dynamic.nearbyAmenity.question", {
      fallback: "Are there nearby amenities within 250m?",
    }),
    category: "nearby",
    paramType: "select",
    options: [],
  };

  const hasNearbyAmenities =
    PROXIMITY_DISABLED_FOR_TESTING ||
    Object.values(nearbyAmenityCounts).some((count) => (count ?? 0) > 0);

  const questions: (Question & { clueTemplate?: string })[] = hasNearbyAmenities
    ? [...baseQuestions, nearbyAmenityQuestion]
    : [...baseQuestions];

  // Simulate player movement (for demo)
  const simulateMove = useCallback(
    (poi: POI) => {
      const next = { lat: poi.lat, lng: poi.lng };
      onLocationChange?.(next);
      // checkNearbyPOI will run via the location change effect; this is just extra insurance.
      void checkNearbyPOI();
    },
    [checkNearbyPOI, onLocationChange],
  );

  const handleAskQuestion = (questionId: string, param: string | number) => {
    const question = questions.find((q) => q.id === questionId);
    const expected = getSecretAnswer(questionId);

    if (!question || expected === null || expected === undefined) {
      toast.error(
        t("game.toasts.submitError", {
          fallback: "Unable to check this clue right now.",
        }),
      );
      return;
    }

    const normalizeVal = (value: string | number | null | undefined) => {
      if (typeof value === "number") return value;
      return value ? value.toString().trim().toLowerCase() : "";
    };

    let isCorrect = false;
    const minCountIds = new Set([
      "waterStation250m",
      "hospital250m",
      "aed250m",
      "emergencySupplyStorage250m",
      "communityCenter250m",
      "trainStation250m",
      "shrineTemple250m",
      "floodgate250m",
      "bridge250m",
      "shelterCapacity",
    ]);
    const isMinCountQuestion = minCountIds.has(questionId);

    if (question.paramType === "number") {
      const numericGuess = Number(param);
      const numericExpected = Number(expected);
      isCorrect =
        Number.isFinite(numericGuess) &&
        Number.isFinite(numericExpected) &&
        (isMinCountQuestion ? numericGuess <= numericExpected : numericGuess === numericExpected);
    } else {
      isCorrect = normalizeVal(param) === normalizeVal(expected);
    }

    const clueTemplate =
      (question as Question & { clueTemplate?: string }).clueTemplate || question.text;
    const clueValue =
      isMinCountQuestion && typeof expected !== "undefined" && expected !== null
        ? expected
        : param ?? expected;
    const clueText = clueTemplate.replace("{param}", `${clueValue ?? ""}`);
    const categoryLabel =
      defaultCityContext.questionCategories.find((cat) => cat.id === question.category)
        ?.name ?? question.category;

    const newClue: Clue = {
      id: `clue-${Date.now()}`,
      text: clueText,
      answer: isCorrect,
      category: categoryLabel,
      categoryId: question.category,
      questionId: question.id,
      paramValue: clueValue,
      timestamp: Date.now(),
    };

    if (isCorrect) {
      setClues((prev) => [...prev, newClue]);
      setSolvedQuestions((prev) => (prev.includes(questionId) ? prev : [...prev, questionId]));
      toast.success(
        t("questions.correct", {
          fallback: "Correct clue unlocked!",
        }),
      );
    } else {
      setClues((prev) => [...prev, newClue]);
      toast.error(
        t("questions.incorrect", {
          fallback: "That clue was incorrect. Try another guess.",
        }),
      );
    }
    startQuestionCooldown(questionId);
  };
  const selectedShelterOption = selectedShelterId
    ? shelterOptions.find((option) => option.id === selectedShelterId) ?? null
    : null;

  const buildShelterMatchContext = useCallback(
    (option: { id: string; name: string; lat?: number; lng?: number } | null | undefined) => {
      const altIds = new Set<string>();
      const altNames = new Set<string>();
      let coords: { lat: number; lng: number } | null = null;

      if (!option) {
        return { coords, altIds: [] as string[], altNames: [] as string[] };
      }

      if (option.id) altIds.add(option.id);
      if (option.name) altNames.add(option.name);
      if (Number.isFinite(option.lat) && Number.isFinite(option.lng)) {
        coords = { lat: option.lat as number, lng: option.lng as number };
      }

      const matchFromShelters = shelters.find(
        (shelter) =>
          shelter.id === option.id ||
          shelter.code === option.id ||
          shelter.shareCode === option.id ||
          normalizeName(shelter.nameEn ?? shelter.nameJp ?? shelter.externalId ?? shelter.id) ===
            normalizeName(option.name),
      );
      if (matchFromShelters) {
        if (Number.isFinite(matchFromShelters.latitude) && Number.isFinite(matchFromShelters.longitude)) {
          coords = coords ?? {
            lat: Number(matchFromShelters.latitude),
            lng: Number(matchFromShelters.longitude),
          };
        }
        [matchFromShelters.shareCode, matchFromShelters.code, matchFromShelters.id, matchFromShelters.externalId]
          .filter(Boolean)
          .forEach((id) => altIds.add(id as string));
        [matchFromShelters.nameEn, matchFromShelters.nameJp]
          .filter(Boolean)
          .forEach((name) => altNames.add(name as string));
      }

      const matchFromPois = pois.find(
        (poi) =>
          poi.id === option.id ||
          normalizeName(poi.name) === normalizeName(option.name),
      );
      if (matchFromPois) {
        if (Number.isFinite(matchFromPois.lat) && Number.isFinite(matchFromPois.lng)) {
          coords = coords ?? { lat: matchFromPois.lat, lng: matchFromPois.lng };
        }
        if (matchFromPois.name) {
          altNames.add(matchFromPois.name);
        }
      }

      return {
        coords,
        altIds: Array.from(altIds).filter(Boolean),
        altNames: Array.from(altNames).filter(Boolean),
      };
    },
    [normalizeName, pois, shelters],
  );

  useEffect(() => {
    if (!PROXIMITY_DISABLED_FOR_TESTING) return;
    if (hasAnnouncedTestingModeRef.current) return;
    toast.info(
      t("game.testingModeActive", { fallback: "Testing mode active." }),
    );
    hasAnnouncedTestingModeRef.current = true;
  }, [t]);

  const timerContainerClasses = [
    "flex items-center gap-2 px-4 py-2 border rounded-full",
    isTimerEnabled && isTimerCritical
      ? "bg-red-500/50 border-red-400/30 text-red-900 animate-pulse"
      : "bg-neutral-100 border-neutral-900 text-red-900"
  ].join(" ");
  const timerTextClasses = isTimerEnabled && isTimerCritical
    ? "tabular-nums font-bold text-black"
    : "tabular-nums font-bold text-black";
  const formattedTimer = `${Math.floor(timeRemaining / 60)}:${(timeRemaining % 60)
    .toString()
    .padStart(2, "0")}`;
  const isGuessDisabled = !secretShelter || shelterOptions.length === 0;

  const handleGuessRequest = async () => {
    if (isGuessDisabled) {
      return;
    }

    if (!selectedShelterOption) {
      toast.warning(
        t("game.toasts.selectShelterFirst", {
          fallback: "Select a shelter before submitting a guess.",
        }),
      );
      return;
    }

    if (!secretShelter) {
      toast.error(
        t("game.toasts.shelterPreparing", {
          fallback: "The secret shelter is still being prepared. Try again in a moment.",
        }),
      );
      return;
    }

    if (!PROXIMITY_DISABLED_FOR_TESTING) {
      const { altIds, altNames } = buildShelterMatchContext(selectedShelterOption);
      if (!altIds.length && !altNames.length) {
        toast.error(
          t("game.toasts.shelterCoordsMissing", {
            fallback: "Unable to locate that shelter. Try another option.",
          }),
        );
        return;
      }

      try {
        const freshLocation = await requestHighAccuracyLocation();
        const locationForCheck = freshLocation ?? playerLocation;
        const proximity = await matchShelterWithinRadius(
          locationForCheck,
          PROXIMITY_RADIUS_KM,
          {
            id: selectedShelterOption.id,
            name: selectedShelterOption.name,
            altIds,
            altNames,
          },
        );

        if (!proximity.match) {
          toast.error(
            t("game.toasts.tooFarForGuess", {
              fallback: "Move within 250m of the shelter to submit a guess.",
            }),
          );
          return;
        }
      } catch (error) {
        console.warn("[Guess] Proximity validation failed", error);
        toast.error(
          t("game.toasts.tooFarForGuess", {
            fallback: "Move within 250m of the shelter to submit a guess.",
          }),
        );
        return;
      }
    }

    setConfirmGuessOpen(true);
  };

  const handleAskNearbyAmenity = ({
    amenityKey,
    count,
  }: {
    amenityKey: string;
    count: number;
  }) => {
    if (solvedNearbyAmenityKeys.includes(amenityKey)) {
      toast.error(
        t("questions.nearbyAmenity.unavailable", {
          fallback: "No amenities of this type within 250m. Move closer.",
        }),
      );
      return;
    }
    const available = nearbyAmenityCounts[amenityKey] ?? 0;
    if (proximityEnabled && available === 0) {
      toast.error(
        t("questions.nearbyAmenity.unavailable", {
          fallback: "No amenities of this type within 250m. Move closer.",
        }),
      );
      return;
    }
    const expected = getSecretAnswer(amenityKey);
    if (expected === null || expected === undefined) {
      toast.error(
        t("questions.nearbyAmenity.unavailable", {
          fallback: "No amenities of this type within 250m. Move closer.",
        }),
      );
      return;
    }
    const expectedNumber = Number(expected);
    const isCorrect = Number.isFinite(expectedNumber) && expectedNumber === count;
    const amenityLabel = t(`questions.dynamic.nearbyAmenity.types.${amenityKey}`, {
      fallback: amenityKey,
    });
    const clueText =
      t(`questions.dynamic.${amenityKey}.clue`, {
        replacements: { param: count },
        fallback: "",
      }) ||
      t("questions.dynamic.nearbyAmenity.clue", {
        replacements: { param: count, amenity: amenityLabel },
        fallback: `There are exactly ${count} ${amenityLabel} within 250m`,
      });

    const newClue: Clue = {
      id: `clue-${Date.now()}`,
      text: clueText,
      answer: isCorrect,
      category: t("questions.categories.nearby.name", { fallback: "Nearby Amenities" }),
      categoryId: "nearby",
      questionId: amenityKey,
      paramValue: count,
      timestamp: Date.now(),
    };

    setClues((prev) => [...prev, newClue]);
    if (isCorrect) {
      setSolvedQuestions((prev) =>
        prev.includes("nearbyAmenity") ? prev : [...prev, "nearbyAmenity"],
      );
      setSolvedNearbyAmenityKeys((prev) =>
        prev.includes(amenityKey) ? prev : [...prev, amenityKey],
      );
      toast.success(
        t("questions.correct", { fallback: "Correct clue unlocked!" }),
      );
    } else {
      toast.error(
        t("questions.incorrect", { fallback: "That clue was incorrect. Try another guess." }),
      );
    }
    startQuestionCooldown("nearbyAmenity");
  };

  const resolveGuess = () => {
    setConfirmGuessOpen(false);

    if (!selectedShelterOption || !secretShelter) {
      toast.error(
        t("game.toasts.submitError", {
          fallback: "Unable to submit your guess right now. Please try again.",
        }),
      );
      return;
    }

    const matches =
      selectedShelterOption.id === secretShelter.id ||
      normalizeName(selectedShelterOption.name) ===
        normalizeName(secretShelter.name);

    activatePanel(null);
    setSelectedShelterId(null);

    if (matches) {
      toast.success(
        t("game.toasts.correctShelter", {
          fallback: "You found the correct shelter!",
        }),
      );
      setPenaltyStage(null);
      setWrongGuessCount(0);
      setOutcome('win');
      if (outcome !== "win") {
        setExternalWinnerName(undefined);
      }
      onMultiplayerWin?.({
        winnerName:
          currentPlayerName ||
          t("app.defaults.navigator", { fallback: "Navigator" }),
        winnerUserId: currentPlayerId,
      });
    } else {
      if (ENABLE_WRONG_GUESS_PENALTY) {
        const stage = onApplyPenalty ? onApplyPenalty() : "third";
        setPenaltyStage(stage);

        if (stage === "third") {
          toast.error(
            t("game.toasts.finalGuess", { fallback: "That was your final guess. Game over." }),
          );
          setOutcome("lose");
          return;
        }

        toast.error(
          stage === "first"
            ? t("game.toasts.penaltyFirst", { fallback: "Wrong guess! 2 guesses remaining." })
            : t("game.toasts.penaltySecond", { fallback: "Wrong guess! 1 guess remaining." }),
        );
        setOutcome("penalty");
      } else {
        const nextCount = wrongGuessCount + 1;
        setWrongGuessCount(nextCount);
        const stage: WrongGuessStage =
          nextCount === 1 ? "first" : nextCount === 2 ? "second" : "third";
        setPenaltyStage(stage);

        if (stage === "third") {
          toast.error(
            t("game.toasts.finalGuess", { fallback: "That was your final guess. Game over." }),
          );
          setOutcome("lose");
          return;
        }

        toast.error(
          stage === "first"
            ? t("game.toasts.penaltyFirst", { fallback: "Wrong guess! 2 guesses remaining." })
            : t("game.toasts.penaltySecond", { fallback: "Wrong guess! 1 guess remaining." }),
        );
        setOutcome("none");
      }
    }
  };

  const handlePenaltyContinue = () => {
    setOutcome('none');
    setPenaltyStage(null);
  };

  const handleStartMeasure = () => {
    activatePanel(null);
    setMeasureTrigger((prev) => prev + 1);
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-neutral-950">
      {/* Top Bar */}
      <motion.div
        className="bg-background text-neutral-900 p-4 border-b border-neutral-400"
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
          <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowExitConfirm(true)}
              className="rounded border-4 border-black bg-red-500 p-4 text-black shadow-sm transition-colors hover:bg-red-600"
              title={t("game.exitTitle")}
            >
              <X className="w-15 h-15" />
            </button>
            <div className="flex flex-col">
              <h1 className="text-xl font-bold text-black">
                {t("common.appName", { fallback: "Map n' Seek" })}
              </h1>
              <span className="text-sm font-semibold text-black/70">
                {t("game.secretShelterName", { fallback: "Solve clues to reveal the shelter" })}
              </span>
            </div>
          </div>

          {isTimerEnabled ? (
            <div className={timerContainerClasses}>
              <Clock className={`w-4 h-4 ${isTimerCritical ? 'text-red-600' : 'text-black'}`} />
              <span className={timerTextClasses}>{formattedTimer}</span>
            </div>
          ) : null}
        </div>
      </motion.div>

      {/* Map Container */}
      <div className="flex-1 relative z-0">
        <MapView
          pois={filteredPois ?? pois}
          playerLocation={playerLocation}
          visitedPOIs={visitedPOIs}
          gameEnded={outcome === 'win' || outcome === 'lose'}
          onPOIClick={simulateMove}
        onSecretShelterChange={onSecretShelterChange}
        onShelterOptionsChange={onShelterOptionsChange}
        measureTrigger={measureTrigger}
        onMeasurementActiveChange={setIsMeasureActive}
        isFiltered={Boolean(filteredPois)}
        gameMode={gameMode}
        lightningCenter={lightningCenter}
        lightningRadiusKm={lightningRadiusKm ?? LIGHTNING_RADIUS_KM}
        onAmenitiesWithinRadius={(info) => {
          setNearbyAmenityCounts(info.counts ?? {});
          setNearbyAmenityCategories(info.matchedCategories ?? []);
        }}
        amenityQueryTrigger={amenityQueryTrigger}
          onLayerPanelToggle={(open) => {
            if (open) {
              activatePanel("layers");
            } else if (activePanel === "layers") {
              activatePanel(null);
            }
          }}
          layerPanelCloseSignal={layerPanelCloseSignal}
        />

        {/* Floating Action Buttons */}
        <div className="absolute top-4 right-4 flex flex-col gap-3 items-end">
          <motion.button
            type="button"
            onClick={() => activatePanel("gameplay")}
            className="relative flex items-center justify-center bg-background p-4 border border-neutral-900 shadow-md hover:scale-105 transition-transform rounded-full"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            aria-label={t("gameplay.missionControl")}
            title={t("gameplay.missionControl")}
          >
            <Lightbulb className="w-6 h-6 text-black" />
            {clues.length > 0 && (
              <div className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border border-neutral-900 bg-background text-xs font-bold text-neutral-900">
                {clues.length}
              </div>
            )}
          </motion.button>

          <motion.button
            type="button"
            onClick={() => {
              if (!isMeasureActive) {
                handleStartMeasure();
              }
            }}
            disabled={isMeasureActive}
            className={`relative flex items-center justify-center rounded-full border border-neutral-900 p-4 shadow-md transition-transform ${
              isMeasureActive
                ? "bg-neutral-900 text-white cursor-not-allowed opacity-80 border-white/20"
                : "bg-background text-black hover:scale-105"
            }`}
            whileHover={isMeasureActive ? undefined : { scale: 1.05 }}
            whileTap={isMeasureActive ? undefined : { scale: 0.95 }}
            aria-label={t("map.measure.title", { fallback: "Measure Radius" })}
            title={t("map.measure.title", { fallback: "Measure Radius" })}
          >
            <Ruler className="w-5 h-5" />
          </motion.button>
        </div>

      </div>
  
      {/* Question Drawer */}
      {!isMeasureActive && (
        <QuestionDrawer
          questions={questions}
          availableCategories={defaultCityContext.questionCategories}
          isOpen={drawerOpen}
          onToggle={() => {
            const next = !drawerOpen;
            if (next) {
              activatePanel("questions");
            } else if (activePanel === "questions") {
              activatePanel(null);
            }
          }}
        onAskQuestion={handleAskQuestion}
        nearbyPOI={PROXIMITY_DISABLED_FOR_TESTING ? "testing-override" : nearbyPOI?.id || null}
        nearbyShelterName={nearbyShelterName}
        lockedQuestions={lockedQuestionIds}
        onAskNearbyAmenity={handleAskNearbyAmenity}
        nearbyAmenityCounts={nearbyAmenityCounts}
        nearbyAmenityCategories={nearbyAmenityCategories}
        solvedNearbyAmenityKeys={solvedNearbyAmenityKeys}
        proximityEnabled={proximityEnabled}
        questionCooldowns={questionCooldowns}
      />
    )}

      {/* Gameplay Panel */}
      <GameplayPanel
        isOpen={cluesOpen}
        clues={clues}
        onClose={() => activatePanel(null)}
        shelterOptions={shelterOptions}
        selectedShelterId={selectedShelterId}
        onShelterSelect={setSelectedShelterId}
        onGuessRequest={handleGuessRequest}
        isGuessDisabled={isGuessDisabled}
        onPollProximity={pollNearbyShelter}
        onFilterByClue={(clue) => {
          console.log("[ClueFilter] show in map clicked", clue);
          const id = clue.questionId;
          if (!id || clue.paramValue == null) {
            console.warn("[ClueFilter] Missing questionId or paramValue", { id, clue });
            toast.error(
              t("gameplay.filterUnavailable", {
                fallback: "Unable to filter map for this clue.",
              }),
            );
            return;
          }

          const extractor = attributeValueLookup[id];
          if (!extractor) {
            console.warn("[ClueFilter] No extractor for question", { id });
            toast.error(
              t("gameplay.filterUnavailable", {
                fallback: "Unable to filter map for this clue.",
              }),
            );
            return;
          }

          const target = normalizeValue(clue.paramValue);
          console.log("[ClueFilter] Target value", { target });

          const designatedShelters = shelters.filter(
            (shelter) =>
              typeof shelter.category === "string" &&
              shelter.category.toLowerCase() === DESIGNATED_CATEGORY,
          );

          const baseShelters =
            filteredPois && filteredPois.length
              ? designatedShelters.filter((shelter) => {
                  const sid = shelter.shareCode || shelter.code || shelter.id;
                  return filteredPois.some((poi) => poi.id === sid);
                })
              : designatedShelters;

          const matches = baseShelters
            .filter((shelter) => {
              const value = extractor(shelter as any);
              const match = normalizeValue(value) === target;
              if (match) {
                console.log("[ClueFilter] Shelter match", {
                  id: shelter.id,
                  code: shelter.code,
                  shareCode: shelter.shareCode,
                  name: shelter.nameEn || shelter.nameJp,
                  value,
                });
              }
              return match;
            })
            .map((shelter) => buildPoiFromShelter(shelter))
            .filter((poi): poi is POI => Boolean(poi));

          if (!matches.length) {
            console.warn("[ClueFilter] No matches for clue", { clue, target });
            toast.error(
              t("gameplay.filterNoMatches", {
                fallback: "No shelters match this clue.",
              }),
            );
            return;
          }

          console.log("[ClueFilter] Applying map filter", { matches: matches.length });
          setFilteredPois(matches);
          setFilterSource(clue.answer ? "correct" : "wrong");
          activatePanel(null);
        }}
        onClearMapFilter={() => {
          setFilteredPois(null);
          setFilterSource(null);
        }}
        isMapFilterActive={Boolean(filteredPois)}
        onApplyWrongClueFilter={handleApplyWrongClueFilter}
        canApplyWrongClueFilter={Boolean(
          filteredPois && filterSource === "correct" && clues.some((clue) => !clue.answer),
        )}
      />

      <AnimatePresence>
        {confirmGuessOpen && selectedShelterOption && (
          <GuessConfirmScreen
            key="guess-confirm"
            shelterName={selectedShelterOption.name}
            onConfirm={resolveGuess}
            onCancel={() => setConfirmGuessOpen(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {outcome === 'win' && (
          <ShelterVictoryScreen
            key="victory"
            shelterName={secretShelter?.name}
            clueCount={clues.length}
            onPlayAgain={onEndGame}
            result="win"
          />
        )}
        {outcome === 'lose' && (
          <ShelterVictoryScreen
            key="defeat"
            shelterName={secretShelter?.name}
            clueCount={clues.length}
            onPlayAgain={onEndGame}
            result="lose"
            winnerName={externalWinnerName}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {outcome === 'penalty' && penaltyStage && (
          <ShelterPenaltyScreen
            key="penalty"
            stage={penaltyStage}
            onContinue={handlePenaltyContinue}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showExitConfirm && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full max-w-sm rounded-lg border-2 border-black bg-background p-6 text-black shadow-xl text-center"
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
            >
              <h2 className="text-lg font-bold text-black uppercase mb-2">
                {t("game.exitConfirmTitle", { fallback: "Leave the game?" })}
              </h2>
              <p className="text-sm text-black mb-4">
                {t("game.exitConfirmBody", {
                  fallback: "Your progress will be lost.",
                })}
              </p>
              <div className="flex justify-center gap-3">
                <button
                  className="rounded border border-black px-4 py-2 text-sm font-semibold uppercase tracking-wide hover:bg-neutral-100"
                  onClick={() => setShowExitConfirm(false)}
                >
                  {t("common.cancel", { fallback: "Cancel" })}
                </button>
                <button
                  className="rounded border border-black bg-red-500 px-4 py-2 text-sm font-bold text-black uppercase tracking-wide text-black shadow-sm hover:bg-red-600"
                  onClick={() => {
                    setShowExitConfirm(false);
                    onEndGame();
                  }}
                >
                  {t("game.exitConfirmLeave", { fallback: "Exit" })}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
