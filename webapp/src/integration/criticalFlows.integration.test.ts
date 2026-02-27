import { afterEach, describe, expect, it, vi } from "vitest";

import {
  __resetProximityIndexForTests,
  __setProximityIndexRawSourcesForTests,
  countAmenitiesWithinRadius,
  hasShelterWithinRadius,
  matchShelterWithinRadius,
} from "../services/proximityIndex";
import {
  fetchSessionSnapshot,
  finishMultiplayerRace,
} from "../services/multiplayerSessionService";
import {
  listSheltersWithinRadius,
  selectLightningShelter,
} from "../utils/lightningSelection";
import { normalizeGameplaySnapshotData } from "../features/gameplay/services/gameplaySnapshot";
import {
  createQuestionCooldownExpiry,
  pruneExpiredQuestionCooldowns,
} from "../features/gameplay/hooks/useQuestionCooldowns";
import { deriveRemoteOutcomeFromRaceFinished } from "../features/session/services/raceOutcome";

const AMENITY_CATEGORIES: Record<string, string> = {
  "Water Station": "waterStation250m",
  Hospital: "hospital250m",
  AED: "aed250m",
};

type FixtureFeature = {
  lat: number;
  lng: number;
  category: string;
  id?: string;
  nameEn?: string;
  nameJp?: string;
};

const toRawCollection = (features: FixtureFeature[]) =>
  JSON.stringify({
    type: "FeatureCollection",
    features: features.map((feature, idx) => ({
      type: "Feature",
      id: feature.id ?? `${feature.category}-${idx}`,
      geometry: { type: "Point", coordinates: [feature.lng, feature.lat] },
      properties: {
        Category: feature.category,
        "Landmark Name (EN)": feature.nameEn ?? feature.category,
        "Landmark Name (JP)": feature.nameJp ?? feature.category,
      },
    })),
  });

afterEach(() => {
  __resetProximityIndexForTests();
  vi.restoreAllMocks();
});

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("RF-10 integration coverage for critical flows", () => {
  it("integrates proximity shelter detection with lightning shelter selection", async () => {
    __setProximityIndexRawSourcesForTests([
      toRawCollection([
        {
          lat: 35.69516,
          lng: 139.8212,
          category: "Designated Evacuation Center",
          nameEn: "Ariake Shelter",
        },
        {
          lat: 35.696,
          lng: 139.822,
          category: "Hospital",
          nameEn: "Ariake Hospital",
        },
      ]),
    ]);

    const center = { lat: 35.69516, lng: 139.8212 };
    const nearby = await hasShelterWithinRadius(center, 0.25);

    expect(nearby.found).toBe(true);
    expect(nearby.nearest?.nameEn).toBe("Ariake Shelter");

    const shelterPool = [
      {
        id: "ariake-shelter",
        name: "Ariake Shelter",
        lat: 35.69516,
        lng: 139.8212,
        type: "shelter" as const,
      },
      {
        id: "backup-shelter",
        name: "Backup Shelter",
        lat: 35.6955,
        lng: 139.8216,
        type: "shelter" as const,
      },
      {
        id: "out-of-radius",
        name: "Far Shelter",
        lat: 35.75,
        lng: 139.9,
        type: "shelter" as const,
      },
    ];

    const eligible = listSheltersWithinRadius(shelterPool, center, 0.25);
    expect(eligible.map((item) => item.id)).toEqual([
      "ariake-shelter",
      "backup-shelter",
    ]);

    const { secretShelter } = selectLightningShelter(
      shelterPool,
      center,
      0.25,
      () => 0,
    );

    const matched = await matchShelterWithinRadius(center, 0.25, {
      id: secretShelter.id,
      name: secretShelter.name,
      altNames: [secretShelter.name.toLowerCase()],
    });

    expect(matched.match).toBeTruthy();
    expect(matched.nearest?.distanceKm).toBeLessThanOrEqual(0.25);
  });

  it("integrates amenity counting with shelter proximity query", async () => {
    __setProximityIndexRawSourcesForTests([
      toRawCollection([
        {
          lat: 35.69516,
          lng: 139.8212,
          category: "Designated Evacuation Center",
          nameEn: "Ariake Shelter",
        },
        {
          lat: 35.69518,
          lng: 139.82121,
          category: "Water Station",
          nameEn: "Water A",
        },
        {
          lat: 35.69521,
          lng: 139.82124,
          category: "AED",
          nameEn: "AED A",
        },
      ]),
    ]);

    const center = { lat: 35.69516, lng: 139.8212 };

    const shelterResult = await hasShelterWithinRadius(center, 0.25);
    expect(shelterResult.found).toBe(true);

    const amenityResult = await countAmenitiesWithinRadius(
      center,
      0.25,
      AMENITY_CATEGORIES,
    );

    expect(amenityResult.counts.waterStation250m).toBe(1);
    expect(amenityResult.counts.aed250m).toBe(1);
    expect(amenityResult.matchedCategories.has("Water Station")).toBe(true);
    expect(amenityResult.unmatched["Designated Evacuation Center"]).toBe(1);
  });

  it("integrates multiplayer finish call with snapshot refresh call", async () => {
    const fetchMock = vi.fn(async (url: string, options?: RequestInit) => {
      if (url.includes("/finish")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            session: {
              id: "session-1",
              shelter_code: "ABCD",
              host_id: "host-1",
              state: "finished",
              max_players: 4,
              expires_at: "2026-02-27T00:00:00.000Z",
              started_at: "2026-02-27T00:00:00.000Z",
              ended_at: "2026-02-27T00:15:00.000Z",
              created_at: "2026-02-27T00:00:00.000Z",
            },
          }),
        } as Response;
      }

      if (url.includes("/sessions/session-1") && options?.method === "GET") {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            session: {
              id: "session-1",
              shelter_code: "ABCD",
              host_id: "host-1",
              state: "finished",
              max_players: 4,
              expires_at: "2026-02-27T00:00:00.000Z",
              started_at: "2026-02-27T00:00:00.000Z",
              ended_at: "2026-02-27T00:15:00.000Z",
              created_at: "2026-02-27T00:00:00.000Z",
            },
            players: [
              {
                id: "p-1",
                session_id: "session-1",
                user_id: "winner-1",
                display_name: "Winner",
                ready: true,
                joined_at: "2026-02-27T00:00:00.000Z",
                last_seen: "2026-02-27T00:15:00.000Z",
              },
            ],
          }),
        } as Response;
      }

      throw new Error(`Unexpected URL: ${url}`);
    });

    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await finishMultiplayerRace("session-1", "token-1", {
      winnerUserId: "winner-1",
      winnerDisplayName: "Winner",
    });

    const snapshot = await fetchSessionSnapshot("session-1", "token-1");

    expect(snapshot.session.state).toBe("finished");
    expect(snapshot.players).toHaveLength(1);
    expect(snapshot.players[0].user_id).toBe("winner-1");

    const finishCall = fetchMock.mock.calls.find(([url]) =>
      String(url).includes("/finish"),
    ) as [string, RequestInit] | undefined;
    expect(finishCall).toBeDefined();
    expect(JSON.parse((finishCall?.[1].body as string) ?? "{}")).toEqual({
      winnerUserId: "winner-1",
      winnerDisplayName: "Winner",
    });
  });

  it("normalizes gameplay snapshot payloads and enforces cooldown contract", () => {
    const now = Date.now();
    const normalized = normalizeGameplaySnapshotData({
      clues: [{ id: "c1", text: "clue", answer: true, category: "x", timestamp: now }],
      visitedPOIs: ["poi-1"],
      filteredPois: null,
      filterSource: "correct",
      penaltyStage: "second",
      wrongGuessCount: 2,
      solvedQuestions: ["q1"],
      solvedNearbyAmenityKeys: ["waterStation250m"],
      questionCooldowns: {
        active: createQuestionCooldownExpiry(now),
        expired: now - 1,
      },
      outcome: "win",
      selectedShelterId: "s1",
    });

    expect(normalized.filterSource).toBe("correct");
    expect(normalized.penaltyStage).toBe("second");
    expect(normalized.outcome).toBe("win");
    expect(normalized.selectedShelterId).toBe("s1");

    const pruned = pruneExpiredQuestionCooldowns(normalized.questionCooldowns, now);
    expect(pruned).toEqual({
      active: normalized.questionCooldowns.active,
    });
  });

  it("derives race-finished remote outcome payload shape consumed by GameScreen", () => {
    const fallback = "Another team reached the shelter.";

    const selfOutcome = deriveRemoteOutcomeFromRaceFinished(
      { winner: { user_id: "u-1", display_name: "Me" } },
      "u-1",
      fallback,
    );
    expect(selfOutcome).toEqual({
      result: "win",
      winnerName: "Me",
    });

    const otherOutcome = deriveRemoteOutcomeFromRaceFinished(
      { winner: { user_id: "u-2" } },
      "u-1",
      fallback,
    );
    expect(otherOutcome).toEqual({
      result: "lose",
      winnerName: fallback,
    });
  });
});
