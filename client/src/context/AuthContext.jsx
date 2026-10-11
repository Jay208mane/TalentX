import { createContext, useState, useEffect, useMemo } from "react";
import api from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem("talentx_user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => {
    return localStorage.getItem("talentx_token") || null;
  });

  const [loading] = useState(false);

  useEffect(() => {
    if (!token) return;

    let isMounted = true;
    api
      .get("/auth/me")
      .then((res) => {
        if (isMounted && res.data?.user) {
          setUser(res.data.user);
          localStorage.setItem("talentx_user", JSON.stringify(res.data.user));
        }
      })
      .catch((err) => {
        if (isMounted && (err.response?.status === 401 || err.response?.status === 403)) {
          localStorage.removeItem("talentx_token");
          localStorage.removeItem("talentx_user");
          setToken(null);
          setUser(null);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [token]);

  const login = (newToken, newUser) => {
    localStorage.setItem("talentx_token", newToken);
    localStorage.setItem("talentx_user", JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem("talentx_token");
    localStorage.removeItem("talentx_user");
    setToken(null);
    setUser(null);
  };

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      isAuthenticated: Boolean(token && user),
      role: user?.role || null,
      login,
      logout,
    }),
    [user, token, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthContext;
