const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";

export const TOKEN_STORAGE_KEY = "bitcovex_token";
export const USER_STORAGE_KEY = "bitcovex_user";

function isBrowser() {
  return typeof window !== "undefined";
}

function normalizeEndpoint(endpoint = "") {
  if (/^https?:\/\//i.test(endpoint)) return endpoint;
  return `${API_BASE}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
}

async function parseResponse(response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch (error) {
    return {
      status: response.ok ? "success" : "error",
      message: {
        error: [
          "Server returned a non-JSON response. Please check backend logs.",
        ],
      },
      raw: text,
    };
  }
}

export function getToken() {
  if (!isBrowser()) return null;
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setToken(token) {
  if (!isBrowser()) return;
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function removeToken() {
  if (!isBrowser()) return;
  localStorage.removeItem(TOKEN_STORAGE_KEY);
}

export function getStoredUser() {
  if (!isBrowser()) return null;

  const raw = localStorage.getItem(USER_STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch (error) {
    localStorage.removeItem(USER_STORAGE_KEY);
    return null;
  }
}

export function setStoredUser(user) {
  if (!isBrowser()) return;
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
}

export function removeStoredUser() {
  if (!isBrowser()) return;
  localStorage.removeItem(USER_STORAGE_KEY);
}

export async function api(endpoint, options = {}) {
  const token = options.token ?? getToken();
  const url = normalizeEndpoint(endpoint);
  const isFormData = options.body instanceof FormData;
  const timeoutMs = options.timeout ?? 12000; // 12s default timeout

  const headers = {
    Accept: "application/json",
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
      body:
        options.body && !isFormData && typeof options.body !== "string"
          ? JSON.stringify(options.body)
          : options.body,
    });

    clearTimeout(timeoutId);
    const data = await parseResponse(response);

    return {
      ok: response.ok,
      statusCode: response.status,
      ...(data || {}),
    };
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      return { ok: false, statusCode: 0, status: "error", message: { error: ["Request timed out. Please try again."] } };
    }
    return { ok: false, statusCode: 0, status: "error", message: { error: ["Network error. Please check your connection."] } };
  }
}

export function getFirstMessage(result, fallback = "Something went wrong") {
  if (!result) return fallback;

  const buckets = [result.message?.error, result.message?.success];
  for (const bucket of buckets) {
    if (Array.isArray(bucket) && bucket.length) return bucket[0];
  }

  if (typeof result.message === "string") return result.message;
  return fallback;
}
