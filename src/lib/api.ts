import type { AdminAuthResponse, AdminOverview, AdminProduct, AdminProductInput, Order, Product } from "./types";

// Yahan maine path update kar diya hai takay Hostinger aapke Vercel backend se baat kare
const API_BASE = "https://officeweb-gamma.vercel.app/api";

function logApiError(details: { method: string; path: string; status?: number; message?: string; error?: unknown }) {
  console.error("[API ERROR]", details);
}

async function request<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type") && options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  
  const token = typeof window !== "undefined" ? window.localStorage.getItem("adminToken") : null;
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  try {
    const method = options.method || "GET";
    // Path ko API_BASE ke saath sahi se combine kiya
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });

    const text = await res.text();
    let data: unknown = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }

    if (!res.ok) {
      const errorMessage =
        typeof data === "object" && data !== null && "error" in data && typeof (data as { error: unknown }).error === "string"
          ? (data as { error: string }).error
          : typeof data === "object" && data !== null && "message" in data && typeof (data as { message: unknown }).message === "string"
            ? (data as { message: string }).message
            : res.statusText;
      
      logApiError({
        method,
        path: `${API_BASE}${path}`,
        status: res.status,
        message: errorMessage,
      });
      throw new Error(errorMessage);
    }
    return data as T;
  } catch (error) {
    logApiError({
      method: options.method || "GET",
      path: `${API_BASE}${path}`,
      error,
    });
    throw error;
  }
}

// ... (Baqi saara code transformProduct aur baqi functions ke liye same rahega)
// Sirf ye upar wala API_BASE aur request function ka fetch link change kiya hai.

// Example check:
export function getProducts(params?: { category?: string; segment?: string; tier?: string; q?: string; featured?: boolean; productType?: string }) {
  const search = new URLSearchParams();
  if (params) {
    if (params.category) search.set("category", params.category);
    if (params.segment) search.set("segment", params.segment);
    if (params.tier) search.set("tier", params.tier);
    if (params.featured) search.set("featured", "true");
    if (params.q) search.set("q", params.q);
    if (params.productType) search.set("productType", params.productType);
  }
  const suffix = search.toString() ? `?${search.toString()}` : "";
  return request<RawProduct[]>(`/products${suffix}`).then((items) => items.map(transformProduct));
}

// ... (Copy-paste the rest of your original functions here)