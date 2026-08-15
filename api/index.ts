import type { IncomingMessage, ServerResponse } from "node:http";
import app from "../server/app.js";

type VercelReq = IncomingMessage & {
  query?: Record<string, unknown>;
  originalUrl?: string;
};

function header(req: IncomingMessage, name: string) {
  const value = req.headers[name];
  return (Array.isArray(value) ? value[0] : value) || "";
}

export function restoreUrl(req: VercelReq) {
  const forwarded = header(req, "x-forwarded-uri");
  if (forwarded.startsWith("/api")) return forwarded;

  const url = req.url || "/";
  if (url.startsWith("/api/") || url === "/api") return url;

  const queryIndex = url.indexOf("?");
  const search = queryIndex >= 0 ? url.slice(queryIndex) : "";
  const path = req.query?.path;
  const segments = Array.isArray(path)
    ? path.map(String)
    : typeof path === "string" && path.length > 0
      ? [path]
      : [];

  if (segments.length > 0) {
    const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
    params.delete("path");
    const rest = params.toString();
    return `/api/${segments.join("/")}${rest ? `?${rest}` : ""}`;
  }

  const invoke = header(req, "x-invoke-path");
  if (invoke.startsWith("/api/") || invoke === "/api") {
    return `${invoke}${invoke.includes("?") ? "" : search}`;
  }

  const pathname = queryIndex >= 0 ? url.slice(0, queryIndex) : url;
  if (pathname === "/" || pathname === "") return `/api${search}`;
  return pathname.startsWith("/api") ? url : `/api${pathname}${search}`;
}

export default function handler(req: VercelReq, res: ServerResponse) {
  const url = restoreUrl(req);
  req.url = url;
  req.originalUrl = url;
  return app(req as never, res as never);
}
