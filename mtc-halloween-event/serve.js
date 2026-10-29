// High-performance static server with Gzip compression, byte-range streaming,
// in-memory caching, ETags, and long-lived cache headers for high concurrency:
// `node serve.js` -> http://localhost:5173
const http = require("http");
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const root = __dirname;
const port = Number(process.env.PORT) || 5173;

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".ogg": "video/ogg",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".woff": "font/woff",
  ".woff2": "font/woff2"
};

const COMPRESSIBLE = new Set([".html", ".css", ".js", ".json", ".svg"]);
const MEMORY_CACHE = new Map(); // cache files < 2MB: { mtime, buffer, etag }
const MAX_MEM_FILE_SIZE = 2 * 1024 * 1024; // 2MB

function getCacheControl(ext) {
  if (ext === ".html") {
    // HTML checks freshness with ETag via 304, zero latency
    return "public, max-age=0, must-revalidate";
  }
  if (ext === ".js" || ext === ".css") {
    // Scripts and styles cached with background revalidation
    return "public, max-age=86400, stale-while-revalidate=604800";
  }
  if (ext === ".mp4" || ext === ".webm" || ext === ".mp3" || ext === ".wav") {
    // Media assets cached aggressively
    return "public, max-age=604800, immutable";
  }
  // Images, fonts, icons
  return "public, max-age=604800, stale-while-revalidate=86400";
}

const server = http.createServer((req, res) => {
  // CORS & Security headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("X-Content-Type-Options", "nosniff");

  const rawUrl = req.url.split("?")[0];
  const urlPath = decodeURIComponent(rawUrl === "/" ? "/index.html" : rawUrl);
  const file = path.normalize(path.join(root, urlPath));

  if (!file.startsWith(root)) {
    res.writeHead(403);
    return res.end("Forbidden");
  }

  fs.stat(file, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      return res.end("Not found");
    }

    const ext = path.extname(file).toLowerCase();
    const contentType = types[ext] || "application/octet-stream";
    const cacheControl = getCacheControl(ext);
    const etag = `W/"${stats.size.toString(16)}-${Math.floor(stats.mtimeMs).toString(16)}"`;

    // Conditional GET: 304 Not Modified
    const ifNoneMatch = req.headers["if-none-match"];
    const ifModifiedSince = req.headers["if-modified-since"];
    if (ifNoneMatch === etag || (ifModifiedSince && new Date(ifModifiedSince) >= stats.mtime)) {
      res.writeHead(304, {
        "ETag": etag,
        "Cache-Control": cacheControl,
        "Last-Modified": stats.mtime.toUTCString()
      });
      return res.end();
    }

    // Media Byte-Range requests (.mp4, .webm, .mp3, .wav)
    const range = req.headers.range;
    const isMedia = ext === ".mp4" || ext === ".webm" || ext === ".mp3" || ext === ".wav";

    if (range && isMedia) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stats.size - 1;

      if (start >= stats.size || end >= stats.size || start > end) {
        res.writeHead(416, { "Content-Range": `bytes */${stats.size}` });
        return res.end();
      }

      const chunkSize = (end - start) + 1;
      const stream = fs.createReadStream(file, { start, end });
      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${stats.size}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunkSize,
        "Content-Type": contentType,
        "Cache-Control": cacheControl,
        "ETag": etag,
        "Last-Modified": stats.mtime.toUTCString()
      });
      return stream.pipe(res);
    }

    // Text & Code assets: check for GZIP compression support
    const acceptEncoding = req.headers["accept-encoding"] || "";
    const shouldGzip = COMPRESSIBLE.has(ext) && acceptEncoding.includes("gzip");

    // In-Memory Caching for files under 2MB
    if (stats.size <= MAX_MEM_FILE_SIZE) {
      const cached = MEMORY_CACHE.get(file);
      if (cached && cached.mtime === stats.mtimeMs) {
        return sendBuffer(res, cached.buffer, contentType, cacheControl, etag, stats.mtime, shouldGzip);
      }

      fs.readFile(file, (readErr, data) => {
        if (readErr) {
          res.writeHead(500);
          return res.end("Error reading file");
        }
        MEMORY_CACHE.set(file, { mtime: stats.mtimeMs, buffer: data });
        sendBuffer(res, data, contentType, cacheControl, etag, stats.mtime, shouldGzip);
      });
      return;
    }

    // Larger files (e.g. videos / large audio) served as streaming responses
    const headers = {
      "Content-Length": stats.size,
      "Accept-Ranges": "bytes",
      "Content-Type": contentType,
      "Cache-Control": cacheControl,
      "ETag": etag,
      "Last-Modified": stats.mtime.toUTCString()
    };
    res.writeHead(200, headers);
    fs.createReadStream(file).pipe(res);
  });
});

function sendBuffer(res, buffer, contentType, cacheControl, etag, mtime, shouldGzip) {
  if (shouldGzip) {
    zlib.gzip(buffer, (gzErr, compressed) => {
      if (gzErr) {
        res.writeHead(200, {
          "Content-Length": buffer.length,
          "Content-Type": contentType,
          "Cache-Control": cacheControl,
          "ETag": etag,
          "Last-Modified": mtime.toUTCString()
        });
        return res.end(buffer);
      }
      res.writeHead(200, {
        "Content-Length": compressed.length,
        "Content-Encoding": "gzip",
        "Vary": "Accept-Encoding",
        "Content-Type": contentType,
        "Cache-Control": cacheControl,
        "ETag": etag,
        "Last-Modified": mtime.toUTCString()
      });
      res.end(compressed);
    });
  } else {
    res.writeHead(200, {
      "Content-Length": buffer.length,
      "Content-Type": contentType,
      "Cache-Control": cacheControl,
      "ETag": etag,
      "Last-Modified": mtime.toUTCString()
    });
    res.end(buffer);
  }
}

// Keep-Alive connection pooling for handling high concurrency smoothly
server.keepAliveTimeout = 65000;
server.headersTimeout = 70000;

server.listen(port, () => console.log(`Wheel of Curses (Optimized CDN/Fast-Serve) running on http://localhost:${port}`));
