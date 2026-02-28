import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

const API_BASE_URL = "https://kareemsnagpur.com/alrahman/api/v1";
const ACCESS_TOKEN_KEY = "access_token";

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const backendAuth = {
  async login(usernameOrMobile, password) {
    const response = await api.post("/auth/login", {
      usernameOrMobile,
      password,
    });
    const payload = response.data?.data;
    if (payload?.session?.access_token) {
      await AsyncStorage.setItem(
        ACCESS_TOKEN_KEY,
        payload.session.access_token,
      );
    }
    return payload;
  },
  async me() {
    const response = await api.get("/auth/me");
    return response.data?.data;
  },
  async logout() {
    await AsyncStorage.removeItem(ACCESS_TOKEN_KEY);
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
