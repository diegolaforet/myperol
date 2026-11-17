const PRICE_REQUEST_ENDPOINT = "/.netlify/functions/price-request";

export type PriceRequestPayload = Record<string, string>;

export class PriceRequestError extends Error {
  constructor(public readonly translationKey: "request_missing" | "request_error" | "privacy_required_error" | "request_rate_limited") {
    super(translationKey);
    this.name = "PriceRequestError";
  }
}

export async function sendPriceRequest(payload: PriceRequestPayload) {
  const response = await fetch(PRICE_REQUEST_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (response.ok) return;
  // Netlify can reject the request before the function runs, with a non-JSON body.
  if (response.status === 429) throw new PriceRequestError("request_rate_limited");

  const result = await response.json().catch(() => ({}));
  throw new PriceRequestError(result.code === "PRIVACY_REQUIRED" ? "privacy_required_error"
    : result.code === "MISSING_FIELDS" ? "request_missing" : "request_error");
}

export function getRequestErrorTranslation(error: unknown) {
  return error instanceof PriceRequestError ? error.translationKey : "request_error";
}
