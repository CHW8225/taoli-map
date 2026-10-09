export function buildAmapUpstream(
  segments: string[],
  searchParams: URLSearchParams,
  securityCode: string
): URL {
  if (segments.length === 0 || segments.some((segment) => !segment || segment === "." || segment === "..")) {
    throw new Error("非法高德代理路径");
  }

  const path = segments.join("/");
  const host = path.startsWith("v4/map/styles") ? "https://webapi.amap.com" : "https://restapi.amap.com";
  const upstream = new URL(`/${segments.map(encodeURIComponent).join("/")}`, host);
  searchParams.forEach((value, key) => upstream.searchParams.append(key, value));
  upstream.searchParams.set("jscode", securityCode);
  return upstream;
}
