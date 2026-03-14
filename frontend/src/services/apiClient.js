import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

const API_BASE_URL = "https://kareemsnagpur.com/alrahman/api/v1";
const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";
const USER_KEY = "user";
const AUTH_BUNDLE_KEY = "auth_bundle";

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

const authApi = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

let authBundleCache = null;
let refreshInFlightPromise = null;

const parseJson = (value) => {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch (error) {
    return null;
  }
};

const setAuthBundleCache = (bundle) => {
  authBundleCache = bundle || null;
};

const normalizeSession = (session) => {
  if (!session?.access_token && !session?.refresh_token) return null;
  return {
    access_token: session?.access_token || null,
    refresh_token: session?.refresh_token || null,
  };
};

const getStoredAuthBundle = async () => {
  if (authBundleCache) return authBundleCache;

  const bundleJson = await AsyncStorage.getItem(AUTH_BUNDLE_KEY);
  const parsedBundle = parseJson(bundleJson);
  if (parsedBundle?.user || parsedBundle?.session) {
    const normalizedBundle = {
      user: parsedBundle.user || null,
      session: normalizeSession(parsedBundle.session),
    };
    setAuthBundleCache(normalizedBundle);
    return normalizedBundle;
  }

  // Migrate older installs that stored user and tokens separately.
  const [userJson, accessToken, refreshToken] = await Promise.all([
    AsyncStorage.getItem(USER_KEY),
    AsyncStorage.getItem(ACCESS_TOKEN_KEY),
    AsyncStorage.getItem(REFRESH_TOKEN_KEY),
  ]);
  const user = parseJson(userJson);
  const session = normalizeSession({
    access_token: accessToken || null,
    refresh_token: refreshToken || null,
  });

  if (!user && !session) return null;

  const migratedBundle = { user: user || null, session };
  await AsyncStorage.setItem(AUTH_BUNDLE_KEY, JSON.stringify(migratedBundle));
  setAuthBundleCache(migratedBundle);
  return migratedBundle;
};

const persistAuthBundle = async ({ session, user }) => {
  const currentBundle = (await getStoredAuthBundle()) || {
    user: null,
    session: null,
  };
  const nextBundle = {
    user: user ?? currentBundle.user ?? null,
    session: normalizeSession(session ?? currentBundle.session),
  };

  await AsyncStorage.setItem(AUTH_BUNDLE_KEY, JSON.stringify(nextBundle));
  setAuthBundleCache(nextBundle);
  return nextBundle;
};

const clearSession = async () => {
  await AsyncStorage.multiRemove([
    AUTH_BUNDLE_KEY,
    USER_KEY,
    ACCESS_TOKEN_KEY,
    REFRESH_TOKEN_KEY,
  ]);
  setAuthBundleCache(null);
};

const isUnauthorizedError = (error) => {
  const status = error?.response?.status;
  return status === 401 || status === 403;
};

const refreshAccessToken = async () => {
  if (!refreshInFlightPromise) {
    refreshInFlightPromise = (async () => {
      const bundle = await getStoredAuthBundle();
      const refreshToken = bundle?.session?.refresh_token;
      if (!refreshToken) return null;

      const response = await authApi.post("/auth/refresh", { refreshToken });
      const payload = response.data?.data;
      if (!payload?.session) return null;

      await persistAuthBundle({
        session: payload.session,
        user: payload?.user || bundle?.user || null,
      });
      return payload.session;
    })();
  }

  try {
    return await refreshInFlightPromise;
  } finally {
    refreshInFlightPromise = null;
  }
};

const ensureAccessToken = async () => {
  const bundle = await getStoredAuthBundle();
  const accessToken = bundle?.session?.access_token;
  if (accessToken) return accessToken;

  const session = await refreshAccessToken();
  return session?.access_token || null;
};

api.interceptors.request.use(async (config) => {
  const requestUrl = String(config?.url || "");
  const isAuthEndpoint =
    requestUrl.includes("/auth/login") || requestUrl.includes("/auth/refresh");
  if (isAuthEndpoint) return config;

  const token = await ensureAccessToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const originalRequest = error?.config || {};
    const requestUrl = String(originalRequest?.url || "");
    const isAuthEndpoint =
      requestUrl.includes("/auth/login") ||
      requestUrl.includes("/auth/refresh");

    if (status !== 401 || originalRequest._retry || isAuthEndpoint) {
      throw error;
    }

    try {
      originalRequest._retry = true;
      const session = await refreshAccessToken();
      if (!session?.access_token) {
        await clearSession();
        throw error;
      }

      originalRequest.headers = originalRequest.headers || {};
      originalRequest.headers.Authorization = `Bearer ${session.access_token}`;
      return api(originalRequest);
    } catch (refreshError) {
      if (isUnauthorizedError(refreshError)) {
        await clearSession();
      }
      throw refreshError;
    }
  },
);

export const backendAuth = {
  async login(usernameOrMobile, password) {
    const response = await api.post("/auth/login", {
      usernameOrMobile,
      password,
    });
    const payload = response.data?.data;
    if (payload?.session || payload?.user) {
      await persistAuthBundle({
        session: payload?.session || null,
        user: payload?.user || null,
      });
    }
    return payload;
  },
  async refresh(refreshToken) {
    const response = await authApi.post("/auth/refresh", { refreshToken });
    const payload = response.data?.data;
    if (payload?.session || payload?.user) {
      await persistAuthBundle({
        session: payload?.session || null,
        user: payload?.user || null,
      });
    }
    return payload;
  },
  async me() {
    const response = await api.get("/auth/me");
    return response.data?.data;
  },
  async logout() {
    await clearSession();
  },
  async getCachedUser() {
    const bundle = await getStoredAuthBundle();
    return bundle?.user || null;
  },
  async updateCachedUser(user) {
    const bundle = await getStoredAuthBundle();
    await persistAuthBundle({
      session: bundle?.session || null,
      user: user || null,
    });
  },
  async restoreSession() {
    const bundle = await getStoredAuthBundle();
    if (!bundle?.user) return null;

    try {
      const token = await ensureAccessToken();
      if (!token) {
        // A cached user without any recoverable session must be re-authenticated once.
        await clearSession();
        return null;
      }

      const user = await this.me();
      await persistAuthBundle({
        session:
          (await getStoredAuthBundle())?.session || bundle.session || null,
        user,
      });
      return user;
    } catch (error) {
      if (isUnauthorizedError(error)) {
        await clearSession();
        return null;
      }

      // Keep cached session on transient failures so users stay signed in.
      return bundle.user;
    }
  },
};

void getStoredAuthBundle();

export const backendUsers = {
  list(params = {}) {
    return api.get("/users", { params }).then((r) => r.data?.data);
  },
  create(payload) {
    return api.post("/users", payload).then((r) => r.data?.data);
  },
  update(id, payload) {
    return api.patch(`/users/${id}`, payload).then((r) => r.data?.data);
  },
  remove(id) {
    return api.delete(`/users/${id}`).then((r) => r.data?.success);
  },
  updateMyProfile(payload) {
    return api.patch("/users/me/profile", payload).then((r) => r.data?.data);
  },
};

export const backendPurchases = {
  list(params = {}) {
    return api.get("/purchases", { params }).then((r) => r.data?.data);
  },
  create(payload) {
    return api.post("/purchases", payload).then((r) => r.data?.data);
  },
  update(id, payload) {
    return api.patch(`/purchases/${id}`, payload).then((r) => r.data?.data);
  },
  remove(id) {
    return api.delete(`/purchases/${id}`).then((r) => r.data?.success);
  },
  updateVendorComment(id, comment) {
    return api
      .patch(`/purchases/${id}/vendor-comment`, { comment })
      .then((r) => r.data?.data);
  },
};

export const backendPayments = {
  list(params = {}) {
    return api.get("/payments", { params }).then((r) => r.data?.data);
  },
  createVendorTransaction(payload) {
    return api
      .post("/payments/vendor-transactions", payload)
      .then((r) => r.data?.data);
  },
  updateVendorTransactionComment(id, comment) {
    return api
      .patch(`/payments/vendor-transactions/${id}/vendor-comment`, { comment })
      .then((r) => r.data?.data);
  },
};

export const backendLedger = {
  getVendorLedger(vendorId, branchName) {
    return api
      .get(`/ledger/vendor/${vendorId}`, { params: { branchName } })
      .then((r) => r.data?.data);
  },
};

export const backendItems = {
  list(params = {}) {
    return api.get("/items", { params }).then((r) => r.data?.data);
  },
  create(payload) {
    return api.post("/items", payload).then((r) => r.data?.data);
  },
  update(id, payload) {
    return api.patch(`/items/${id}`, payload).then((r) => r.data?.data);
  },
  remove(id) {
    return api.delete(`/items/${id}`).then((r) => r.data?.success);
  },
};
