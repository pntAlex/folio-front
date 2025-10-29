import { join, normalize, resolve } from "path";

const port = Number(Bun.env.PORT ?? 3000);
const root = resolve(Bun.env.STATIC_ROOT ?? ".");
const fallbackDocument = Bun.env.FALLBACK_HTML ?? "index.html";
const runtimeEnv = (Bun.env.NODE_ENV ?? "production").toLowerCase();
const isDevelopment = runtimeEnv === "development" || runtimeEnv === "dev";

type StaticFile = ReturnType<typeof Bun.file>;

const securityHeaders = (headers: Headers) => {
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Permissions-Policy", "geolocation=()");
};

const longCacheExtensions = new Set([
  "css",
  "js",
  "mjs",
  "cjs",
  "png",
  "jpg",
  "jpeg",
  "gif",
  "svg",
  "webp",
  "ico",
  "woff",
  "woff2",
  "ttf",
  "eot",
  "otf",
]);

const sanitizePath = (pathname: string) => {
  const decoded = decodeURIComponent(pathname.split("?")[0] ?? "");
  if (!decoded || decoded === "/") return fallbackDocument;

  let relative = decoded.replace(/^\/+/, "").replace(/\/+$/, "");

  if (!relative) return fallbackDocument;

  const normalized = normalize(relative);

  if (!normalized || normalized === ".") return fallbackDocument;
  if (normalized.startsWith("..")) return null;

  return normalized;
};

const resolveCacheControl = (filePath: string) => {
  if (isDevelopment) {
    return "no-cache";
  }

  const extension = filePath.split(".").pop()?.toLowerCase();
  if (!extension) {
    return "public, max-age=60";
  }

  if (extension === "html") {
    return "no-cache";
  }

  if (longCacheExtensions.has(extension)) {
    return "public, max-age=31536000, immutable";
  }

  return "public, max-age=86400";
};

const respondNotFound = (request: Request) => {
  const headers = new Headers();
  headers.set("Cache-Control", "no-cache");
  headers.set("Vary", "Accept-Encoding");
  securityHeaders(headers);

  if (request.method === "HEAD") {
    return new Response(null, { status: 404, headers });
  }

  return new Response("Not Found", { status: 404, headers });
};

const buildFileResponse = (
  file: StaticFile,
  request: Request,
  filePath: string,
) => {
  const headers = new Headers();
  headers.set("Cache-Control", resolveCacheControl(filePath));
  headers.set("Vary", "Accept-Encoding");
  securityHeaders(headers);

  const mimeType = file.type;
  if (mimeType) {
    headers.set("Content-Type", mimeType);
  }

  const lastModified = Number(file.lastModified ?? 0);
  if (lastModified > 0) {
    headers.set("Last-Modified", new Date(lastModified).toUTCString());

    const ifModifiedSince = request.headers.get("if-modified-since");
    if (ifModifiedSince) {
      const since = Date.parse(ifModifiedSince);
      if (!Number.isNaN(since) && lastModified <= since) {
        return new Response(null, { status: 304, headers });
      }
    }
  }

  if (request.method === "HEAD") {
    return new Response(null, { status: 200, headers });
  }

  return new Response(file, { headers });
};

const serveStatic = async (request: Request) => {
  const url = new URL(request.url);
  const safePath = sanitizePath(url.pathname);

  if (!safePath) {
    return respondNotFound(request);
  }

  const tryPaths: string[] = [];

  if (safePath === fallbackDocument) {
    tryPaths.push(fallbackDocument);
  } else {
    tryPaths.push(safePath);

    if (!safePath.includes(".")) {
      tryPaths.push(`${safePath}.html`);
      tryPaths.push(join(safePath, fallbackDocument));
    }
  }

  for (const candidate of tryPaths) {
    const normalizedCandidate = candidate.replace(/^\/+/, "");
    const filePath = join(root, normalizedCandidate);
    const file = Bun.file(filePath);

    if (await file.exists()) {
      return buildFileResponse(file, request, filePath);
    }
  }

  if (!safePath.includes(".")) {
    const fallbackPath = join(root, fallbackDocument);
    const fallbackFile = Bun.file(fallbackPath);
    if (await fallbackFile.exists()) {
      return buildFileResponse(fallbackFile, request, fallbackPath);
    }
  }

  return respondNotFound(request);
};

Bun.serve({
  port,
  async fetch(request) {
    return serveStatic(request);
  },
});

console.log(`Site servi sur http://localhost:${port} (mode: ${isDevelopment ? "development" : "production"})`);
if (isDevelopment) {
  console.log("- Cache HTTP désactivé\n- Redémarrage automatique via bun --watch");
}
