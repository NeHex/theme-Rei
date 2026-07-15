export function requirePositiveIntegerParam(value: string | undefined, label: string) {
  const normalized = String(value ?? "").trim();
  if (!/^\d+$/.test(normalized)) {
    throw createError({
      statusCode: 422,
      statusMessage: `Invalid ${label} id`,
    });
  }

  const parsed = Number(normalized);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw createError({
      statusCode: 422,
      statusMessage: `Invalid ${label} id`,
    });
  }

  return parsed;
}
