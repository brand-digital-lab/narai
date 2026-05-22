const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");

const PORT = Number(process.env.PORT || 4173);
const HOST = process.env.HOST || "0.0.0.0";
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const DATA_FILE = path.join(DATA_DIR, "entries.json");

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);

    if (url.pathname === "/api/entries") {
      await handleEntriesApi(request, response);
      return;
    }

    await serveStatic(url.pathname, response);
  } catch (error) {
    response.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
    response.end(JSON.stringify({ error: "Server error", detail: error.message }));
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Riverside dashboard is running on port ${PORT}`);
});

async function handleEntriesApi(request, response) {
  if (request.method === "GET") {
    const entries = await readEntries();
    sendJson(response, 200, entries);
    return;
  }

  if (request.method === "PUT") {
    const body = await readBody(request);
    const entries = JSON.parse(body || "[]");
    if (!Array.isArray(entries)) {
      sendJson(response, 400, { error: "Entries must be an array" });
      return;
    }

    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(DATA_FILE, JSON.stringify(entries, null, 2));
    sendJson(response, 200, { ok: true });
    return;
  }

  sendJson(response, 405, { error: "Method not allowed" });
}

async function readEntries() {
  try {
    const text = await fs.readFile(DATA_FILE, "utf8");
    const entries = JSON.parse(text);
    return Array.isArray(entries) ? entries : [];
  } catch (error) {
    if (error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        request.destroy();
        reject(new Error("Request body too large"));
      }
    });
    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

async function serveStatic(requestPath, response) {
  const cleanPath = requestPath === "/" ? "/index.html" : requestPath;
  const filePath = path.join(ROOT, path.normalize(cleanPath));

  if (!filePath.startsWith(ROOT) || filePath.includes(`${path.sep}data${path.sep}`)) {
    response.writeHead(404);
    response.end("Not found");
    return;
  }

  const ext = path.extname(filePath);
  const content = await fs.readFile(filePath);
  response.writeHead(200, { "Content-Type": contentTypes[ext] || "application/octet-stream" });
  response.end(content);
}

function sendJson(response, status, payload) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}
