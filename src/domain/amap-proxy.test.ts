import { describe, expect, it } from "vitest";

import { buildAmapUpstream } from "./amap-proxy";

describe("buildAmapUpstream", () => {
  it("keeps the security code server-side while forwarding query parameters", () => {
    const upstream = buildAmapUpstream(["v3", "place", "text"], new URLSearchParams("keywords=杨凌"), "secret-code");

    expect(upstream.origin).toBe("https://restapi.amap.com");
    expect(upstream.pathname).toBe("/v3/place/text");
    expect(upstream.searchParams.get("keywords")).toBe("杨凌");
    expect(upstream.searchParams.get("jscode")).toBe("secret-code");
  });

  it("routes custom map styles to the web API host", () => {
    const upstream = buildAmapUpstream(["v4", "map", "styles"], new URLSearchParams(), "secret-code");
    expect(upstream.origin).toBe("https://webapi.amap.com");
  });

  it("rejects traversal segments", () => {
    expect(() => buildAmapUpstream(["v3", "..", "maps"], new URLSearchParams(), "secret-code")).toThrow(
      "非法高德代理路径"
    );
  });
});
