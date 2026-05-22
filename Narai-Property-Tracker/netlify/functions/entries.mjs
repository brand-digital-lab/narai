import { getStore } from "@netlify/blobs";

const STORE_NAME = "riverside-dashboard";
const ENTRIES_KEY = "entries";

export default async (request) => {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  };

  if (request.method === "GET") {
    const store = getStore(STORE_NAME);
    const entries = (await store.get(ENTRIES_KEY, { type: "json" })) || [];
    return Response.json(Array.isArray(entries) ? entries : [], { headers });
  }

  if (request.method === "PUT") {
    const entries = await request.json();

    if (!Array.isArray(entries)) {
      return Response.json({ error: "Entries must be an array" }, { status: 400, headers });
    }

    const store = getStore(STORE_NAME);
    await store.setJSON(ENTRIES_KEY, entries);
    return Response.json({ ok: true }, { headers });
  }

  return Response.json({ error: "Method not allowed" }, { status: 405, headers });
};
