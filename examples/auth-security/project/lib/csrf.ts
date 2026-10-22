export function isCrossSiteRequest(request: Request) {
  const site = request.headers.get("sec-fetch-site");

  if (site) {
    return site !== "same-origin";
  }

  // Eski tarayıcı: Origin başlığına bak
  const origin = request.headers.get("origin");
  return origin !== null && origin !== new URL(request.url).origin;
}
