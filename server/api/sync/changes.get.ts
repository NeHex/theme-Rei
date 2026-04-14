import { backendFetch, logBackendFallback } from "../../utils/backendFetch";

type SyncChangeItem = Record<string, unknown>;
type SyncChangesPayload = {
  data?: SyncChangeItem[];
  items?: SyncChangeItem[];
  changes?: SyncChangeItem[];
  has_more?: boolean;
  hasMore?: boolean;
  next_since?: number;
  nextSince?: number;
};

const DEFAULT_LIMIT = 200;
const MAX_LIMIT = 500;

function pickFirstQueryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function toInt(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return parsed;
}

function normalizeSince(value: string | undefined) {
  return Math.max(0, toInt(value, 0));
}

function normalizeLimit(value: string | undefined) {
  const parsed = toInt(value, DEFAULT_LIMIT);
  return Math.max(1, Math.min(MAX_LIMIT, parsed));
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const since = normalizeSince(pickFirstQueryValue(query.since as string | string[] | undefined));
  const limit = normalizeLimit(pickFirstQueryValue(query.limit as string | string[] | undefined));

  try {
    return await backendFetch<SyncChangesPayload>("/api/sync/changes", {
      method: "GET",
      query: { since, limit },
    });
  } catch (error) {
    logBackendFallback("sync-changes-api", error);
    return {
      data: [] as SyncChangeItem[],
      has_more: false,
      next_since: since,
    } satisfies SyncChangesPayload;
  }
});
