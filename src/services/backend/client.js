import { BACKEND, backendConfigured } from "../../config/backend";

// Thin fetch wrappers for Supabase: PostgREST for public reads, edge
// functions for anything that writes. No SDK — the site only needs these two.

export class BackendError extends Error {
  constructor(message, { status, details } = {}) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

function assertConfigured() {
  if (!backendConfigured) {
    throw new BackendError("The marketplace backend isn’t configured (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).");
  }
}

const baseHeaders = () => ({ apikey: BACKEND.anonKey, Authorization: `Bearer ${BACKEND.anonKey}` });

// GET /rest/v1/<table>?<query>
export async function select(table, query = {}) {
  assertConfigured();
  const params = new URLSearchParams({ select: "*", ...query });
  const response = await fetch(`${BACKEND.url}/rest/v1/${table}?${params}`, { headers: baseHeaders() });
  if (!response.ok) throw new BackendError(`Couldn’t load ${table} (${response.status})`, { status: response.status });
  return response.json();
}

// POST /functions/v1/<name> with an optional wallet session.
export async function callFunction(name, body, session) {
  assertConfigured();
  const response = await fetch(`${BACKEND.url}/functions/v1/${name}`, {
    method: "POST",
    headers: {
      ...baseHeaders(),
      "Content-Type": "application/json",
      ...(session ? { "x-fuchey-session": session } : {}),
    },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new BackendError(data.error ?? `Request failed (${response.status})`, {
      status: response.status,
      details: data.details,
    });
  }
  return data;
}
