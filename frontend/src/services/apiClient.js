import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

const API_BASE_URL = "https:/kareemsnagpur.com/alrahman/api/v1";
const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";
const USER_KEY = "user";

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

const getStoredTokens = async () => {
  const [accessToken, refreshToken] = await Promise.all([
    AsyncStorage.getItem(ACCESS_TOKEN_KEY),
    AsyncStorage.getItem(REFRESH_TOKEN_KEY),
  ]);
  return { accessToken, refreshToken };
};

const persistSession = async (session) => {
  const writes = [];
  if (session?.access_token) {
    writes.push(AsyncStorage.setItem(ACCESS_TOKEN_KEY, session.access_token));
  }
  if (session?.refresh_token) {
    writes.push(AsyncStorage.setItem(REFRESH_TOKEN_KEY, session.refresh_token));
  }
  await Promise.all(writes);
};

const clearSession = async () => {
  await Promise.all([
    AsyncStorage.removeItem(ACCESS_TOKEN_KEY),
    AsyncStorage.removeItem(REFRESH_TOKEN_KEY),
    AsyncStorage.removeItem(USER_KEY),
  ]);
};

const isUnauthorizedError = (error) => {
  const status = error?.response?.status;
  return status === 401 || status === 403;
};

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshInFlightPromise = null;

const refreshAccessToken = async () => {
  if (!refreshInFlightPromise) {
    refreshInFlightPromise = (async () => {
      const { refreshToken } = await getStoredTokens();
      if (!refreshToken) return null;

      const response = await api.post("/auth/refresh", { refreshToken });
      const payload = response.data?.data;
      if (payload?.session) {
        await persistSession(payload.session);
      }
      if (payload?.user) {
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(payload.user));
      }
      return payload?.session || null;
    })();
  }

  try {
    return await refreshInFlightPromise;
  } finally {
    refreshInFlightPromise = null;
  }
};

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
      await clearSession();
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
    if (payload?.session) {
      await persistSession(payload.session);
    }
    if (payload?.user) {
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(payload.user));
    }
    return payload;
  },
  async refresh(refreshToken) {
    const response = await api.post("/auth/refresh", { refreshToken });
    const payload = response.data?.data;
    if (payload?.session) {
      await persistSession(payload.session);
    }
    if (payload?.user) {
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(payload.user));
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
  async restoreSession() {
    const userJson = await AsyncStorage.getItem(USER_KEY);
    if (!userJson) return null;

    let user;
    try {
      user = JSON.parse(userJson);
    } catch (error) {
      await clearSession();
      return null;
    }

    try {
      await this.me();
      return user;
    } catch (error) {
      if (isUnauthorizedError(error)) {
        await clearSession();
        return null;
      }

      return user;
    }
  },
};

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
  remove(id) {
    return api.delete(`/items/${id}`).then((r) => r.data?.success);
  },
};
