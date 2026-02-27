import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchSessionSnapshot, finishMultiplayerRace } from "./multiplayerSessionService";

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
};

const deferred = <T,>(): Deferred<T> => {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

describe("multiplayerSessionService snapshot race controls", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("forwards AbortSignal so stale snapshot requests can be cancelled", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ session: { id: "session-1", host_id: "host-1" }, players: [] }),
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const controller = new AbortController();
    await fetchSessionSnapshot("session-1", "token-1", controller.signal);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, requestOptions] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(requestOptions.signal).toBe(controller.signal);
    expect(requestOptions.method).toBe("GET");
  });

  it("keeps newer snapshot request active while older one aborts deterministically", async () => {
    const stale = deferred<Response>();
    const fresh = deferred<Response>();
    let callNumber = 0;

    globalThis.fetch = vi.fn((_: string, options?: RequestInit) => {
      callNumber += 1;
      const current = callNumber === 1 ? stale : fresh;
      const signal = options?.signal;
      if (signal) {
        const abort = () => {
          current.reject(new DOMException("Aborted", "AbortError"));
        };
        if (signal.aborted) {
          abort();
        } else {
          signal.addEventListener("abort", abort, { once: true });
        }
      }
      return current.promise;
    }) as unknown as typeof fetch;

    const staleController = new AbortController();
    const freshController = new AbortController();

    const stalePromise = fetchSessionSnapshot("session-1", "token-1", staleController.signal);
    const freshPromise = fetchSessionSnapshot("session-1", "token-1", freshController.signal);

    staleController.abort();

    fresh.resolve({
      ok: true,
      status: 200,
      json: async () => ({
        session: { id: "session-1", host_id: "host-1" },
        players: [{ id: "player-new", user_id: "new-user" }],
      }),
    } as Response);

    await expect(stalePromise).rejects.toMatchObject({ name: "AbortError" });
    await expect(freshPromise).resolves.toMatchObject({
      players: [{ id: "player-new", user_id: "new-user" }],
    });
  });

  it("sends winner metadata when finishing a multiplayer race", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        session: {
          id: "session-1",
          host_id: "host-1",
          shelter_code: "ABCD",
          state: "finished",
          max_players: 4,
          expires_at: "2026-02-27T00:00:00.000Z",
          started_at: "2026-02-27T00:00:00.000Z",
          ended_at: "2026-02-27T00:10:00.000Z",
          created_at: "2026-02-27T00:00:00.000Z",
        },
      }),
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await finishMultiplayerRace("session-1", "token-1", {
      winnerUserId: "user-99",
      winnerDisplayName: "Player 99",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, requestOptions] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/sessions/session-1/finish");
    expect(requestOptions.method).toBe("POST");
    expect(requestOptions.headers).toMatchObject({
      Authorization: "Bearer token-1",
      "Content-Type": "application/json",
    });
    expect(JSON.parse(requestOptions.body as string)).toEqual({
      winnerUserId: "user-99",
      winnerDisplayName: "Player 99",
    });
  });
});
