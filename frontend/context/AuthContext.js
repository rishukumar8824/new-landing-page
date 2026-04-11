import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  api,
  getFirstMessage,
  getStoredUser,
  getToken,
  removeStoredUser,
  removeToken,
  setStoredUser,
  setToken,
} from "../utils/api";

const AuthContext = createContext(null);

function toQueryString(params = {}) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    searchParams.set(key, String(value));
  });

  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setTokenState] = useState(null);
  const [loading, setLoading] = useState(true);

  const applySession = (nextToken, nextUser) => {
    setTokenState(nextToken || null);
    setUser(nextUser || null);

    if (nextToken) {
      setToken(nextToken);
    } else {
      removeToken();
    }

    if (nextUser) {
      setStoredUser(nextUser);
    } else {
      removeStoredUser();
    }
  };

  const refreshUser = async (overrideToken) => {
    const activeToken = overrideToken || getToken();
    if (!activeToken) return null;

    const response = await api("/user-info", { token: activeToken });
    if (response?.status === "success" && response?.data?.user) {
      applySession(activeToken, response.data.user);
      return response.data.user;
    }

    return null;
  };

  useEffect(() => {
    const boot = async () => {
      const existingToken = getToken();
      const existingUser = getStoredUser();

      if (!existingToken) {
        setLoading(false);
        return;
      }

      if (existingUser) {
        setUser(existingUser);
        setTokenState(existingToken);
        // Show page immediately with cached user, refresh in background
        setLoading(false);
        refreshUser(existingToken).catch(() => {});
        return;
      }

      setTokenState(existingToken);

      // Safety timeout — if API hangs, don't spin forever
      const safetyTimer = setTimeout(() => {
        setLoading(false);
      }, 10000);

      try {
        const refreshedUser = await refreshUser(existingToken);
        if (!refreshedUser) {
          applySession(null, null);
        }
      } catch (_) {
        applySession(null, null);
      } finally {
        clearTimeout(safetyTimer);
        setLoading(false);
      }
    };

    boot();
  }, []);

  const login = async ({ username, password }) => {
    const response = await api("/login", {
      method: "POST",
      body: { username, password },
    });

    if (response?.status === "success" && response?.data?.access_token) {
      applySession(response.data.access_token, response.data.user || null);
      await refreshUser(response.data.access_token);
      return { success: true, response };
    }

    return {
      success: false,
      response,
      message: getFirstMessage(response, "Login failed"),
    };
  };

  const register = async (payload) => {
    const response = await api("/register", {
      method: "POST",
      body: payload,
    });

    if (response?.status === "success" && response?.data?.access_token) {
      applySession(response.data.access_token, response.data.user || null);
      await refreshUser(response.data.access_token);
      return { success: true, response };
    }

    return {
      success: false,
      response,
      message: getFirstMessage(response, "Registration failed"),
    };
  };

  const logout = async () => {
    try {
      await api("/logout");
    } catch (error) {
      // Best-effort logout; local session still needs to be cleared.
    }
    applySession(null, null);
  };

  const fetchDashboard = async () => api("/dashboard");
  const fetchTradeHistory = async () => api("/trade-history");
  const fetchWalletList = async (type = "spot") => api(`/wallet/list/${type}`);
  const fetchWalletView = async (type, symbol) => api(`/wallet/${type}/${symbol}`);
  const fetchKycForm = async () => api("/kyc-form");
  const fetchAuthorization = async () => api("/authorization");
  const fetchDepositHistory = async (params = {}) => api(`/deposit/history${toQueryString(params)}`);
  const fetchWithdrawHistory = async (params = {}) => api(`/withdraw/history${toQueryString(params)}`);
  const fetchTransactions = async (params = {}) => api(`/transactions${toQueryString(params)}`);
  const fetchOpenOrders = async (params = {}) => api(`/order/open${toQueryString(params)}`);
  const fetchOrderHistory = async (params = {}) => api(`/order/history${toQueryString(params)}`);
  const submitWithdraw = async (payload) => api("/withdraw", { method: "POST", body: payload });
  const submitTransfer = async (payload) => api("/transfer", { method: "POST", body: payload });

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      isAuthenticated: Boolean(user && token),
      login,
      register,
      logout,
      refreshUser,
      fetchDashboard,
      fetchTradeHistory,
      fetchWalletList,
      fetchWalletView,
      fetchKycForm,
      fetchAuthorization,
      fetchDepositHistory,
      fetchWithdrawHistory,
      fetchTransactions,
      fetchOpenOrders,
      fetchOrderHistory,
      submitWithdraw,
      submitTransfer,
    }),
    [user, token, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
