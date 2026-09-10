import React, { createContext, useContext, useState, useEffect } from "react";
import { api } from "../services/api";
import { rum } from "../telemetry/rum";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("aura_user");
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem("aura_token") || null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  useEffect(() => {
    if (user) {
      localStorage.setItem("aura_user", JSON.stringify(user));
      rum.init({ userId: user.id || user.email });
    } else {
      localStorage.removeItem("aura_user");
    }
  }, [user]);

  useEffect(() => {
    if (token) {
      localStorage.setItem("aura_token", token);
    } else {
      localStorage.removeItem("aura_token");
    }
  }, [token]);

  const login = async (emailOrUsername, password) => {
    const data = await api.login(emailOrUsername, password);
    setUser(data.user);
    setToken(data.token);
    setIsAuthModalOpen(false);
    rum.trackInteraction("user_login", "auth_modal", { email: emailOrUsername });
    return data;
  };

  const register = async (userData) => {
    const data = await api.register(userData);
    setUser(data.user);
    setToken(data.token);
    setIsAuthModalOpen(false);
    rum.trackInteraction("user_register", "auth_modal", { email: userData.email });
    return data;
  };

  const logout = () => {
    rum.trackInteraction("user_logout", "navbar");
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isAuthModalOpen,
        setIsAuthModalOpen,
        login,
        register,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
