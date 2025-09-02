import axios from "axios";

const runtimeGlobal = typeof window !== "undefined" && window.__API_BASE__;

const baseURL = import.meta.env.VITE_API_BASE || runtimeGlobal || "/api";
//const baseURL = "http://localhost:8000";
console.log("API Base URL:", baseURL);
export const apiClient = axios.create({
  baseURL,
  withCredentials: false,
});

export function setAuthToken(token) {
  if (token) {
    apiClient.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete apiClient.defaults.headers.common["Authorization"];
  }
}

export default apiClient;
