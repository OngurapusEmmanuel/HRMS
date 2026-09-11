// Every API route returns errors as either a plain string, or zod's
// `.flatten()` shape: `{ formErrors: string[], fieldErrors: Record<string, string[]> }`.
// The widespread call-site pattern `body.error?.formErrors?.[0] ?? body.error`
// breaks whenever a validation error lands in `fieldErrors` instead of
// `formErrors` (the common case for a single-field constraint, e.g. a
// negative salary) — `formErrors` is `[]`, `[0]` is `undefined`, so it falls
// through to the raw `body.error` OBJECT, which then gets handed to
// `<Alert>{error}</Alert>` and crashes the render (React can't render a
// plain object as a child). This centralizes the correct extraction so every
// form gets a real message instead of a crash.
export function extractErrorMessage(body: unknown, fallback = "Something went wrong"): string {
  if (!body || typeof body !== "object") return fallback;
  const error = (body as { error?: unknown }).error;

  if (typeof error === "string") return error;

  if (error && typeof error === "object") {
    const { formErrors, fieldErrors } = error as { formErrors?: string[]; fieldErrors?: Record<string, string[]> };
    if (formErrors?.[0]) return formErrors[0];
    if (fieldErrors) {
      const firstField = Object.values(fieldErrors).find((messages) => messages?.length);
      if (firstField?.[0]) return firstField[0];
    }
  }

  return fallback;
}
