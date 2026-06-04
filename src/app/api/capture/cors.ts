const allowedOriginPatterns = [
  /^chrome-extension:\/\/[a-z]{32}$/i,
  /^http:\/\/localhost:\d+$/i,
  /^https:\/\/cervo\./i,
];

export function getCaptureCorsHeaders(origin: string | null): HeadersInit {
  if (!origin || !allowedOriginPatterns.some((pattern) => pattern.test(origin))) {
    return {};
  }

  return {
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Origin": origin,
    Vary: "Origin",
  };
}
