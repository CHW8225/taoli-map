import { buildAmapUpstream } from "../../../../domain/amap-proxy";

interface RouteContext {
  params: Promise<{ path: string[] }>;
}

export async function GET(request: Request, context: RouteContext) {
  const securityCode = process.env.AMAP_SECURITY_CODE;
  if (!securityCode) {
    return Response.json({ error: "AMAP_SECURITY_CODE未配置" }, { status: 503 });
  }

  try {
    const { path } = await context.params;
    const incoming = new URL(request.url);
    const upstream = buildAmapUpstream(path, incoming.searchParams, securityCode);
    const response = await fetch(upstream, { cache: "no-store" });
    return new Response(response.body, {
      status: response.status,
      headers: {
        "content-type": response.headers.get("content-type") ?? "application/json; charset=utf-8",
        "cache-control": "private, max-age=0, must-revalidate"
      }
    });
  } catch {
    return Response.json({ error: "非法高德代理请求" }, { status: 400 });
  }
}

