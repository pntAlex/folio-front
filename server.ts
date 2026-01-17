import { join, normalize, resolve } from "path";
import { injectUmamiConfig, resolveUmamiConfig } from "./umami";

const port = Number(Bun.env.PORT ?? 3000);
const root = resolve(Bun.env.STATIC_ROOT ?? ".");
const fallbackDocument = Bun.env.FALLBACK_HTML ?? "index.html";
const notFoundDocument = Bun.env.NOT_FOUND_HTML ?? "404.html";
const runtimeEnv = (Bun.env.NODE_ENV ?? "production").toLowerCase();
const umamiConfig = resolveUmamiConfig(Bun.env);
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

const respondNotFound = async (request: Request) => {
  const headers = new Headers();
  headers.set("Cache-Control", "no-cache");
  headers.set("Vary", "Accept-Encoding");
  securityHeaders(headers);

  const notFoundPath = join(root, notFoundDocument);
  const notFoundFile = Bun.file(notFoundPath);

  if (await notFoundFile.exists()) {
    const fileHeaders = new Headers(headers);
    if (notFoundFile.type) {
      fileHeaders.set("Content-Type", notFoundFile.type);
    }

    if (request.method === "HEAD") {
      return new Response(null, { status: 404, headers: fileHeaders });
    }

    return new Response(notFoundFile, { status: 404, headers: fileHeaders });
  }

  if (request.method === "HEAD") {
    return new Response(null, { status: 404, headers });
  }

  return new Response("Not Found", { status: 404, headers });
};

const buildFileResponse = async (
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

  const isHtml =
    filePath.toLowerCase().endsWith(".html") || mimeType?.includes("text/html");
  if (request.method === "HEAD" || !isHtml) {
    if (request.method === "HEAD") {
      return new Response(null, { status: 200, headers });
    }

    return new Response(file, { headers });
  }

  const html = await file.text();
  const hydratedHtml = injectUmamiConfig(html, umamiConfig);

  return new Response(hydratedHtml, { headers });
};

const serveStatic = async (request: Request) => {
  const url = new URL(request.url);
  const trimmedPath = url.pathname.replace(/\/+$/, "") || "/";

  const redirects: Record<string, string> = {
    "/about": "/a-propos",
    "/about/": "/a-propos",
    "/projets/rocket-school": "/projets/ecole-rocket",
    "/projets/rocket-school/": "/projets/ecole-rocket",
    "/projets/selfear": "/projets/artiste-selfear",
    "/projets/selfear/": "/projets/artiste-selfear",
    "/projets/whelkom": "/projets/agence-whelkom",
    "/projets/whelkom/": "/projets/agence-whelkom",
  };

  const redirectTarget = redirects[trimmedPath];
  if (redirectTarget) {
    const location = `${redirectTarget}${url.search}`;
    return new Response(null, {
      status: 308,
      headers: { Location: location },
    });
  }

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
