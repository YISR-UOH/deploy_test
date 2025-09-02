import React, { createContext, useState, useEffect } from "react";
import { useContext } from "react";
import { UserContext } from "./UserContext.jsx";

export const ThemeContext = createContext({
  theme: "light",
  toggleTheme: () => {},
});

export const ThemeProvider = ({ children }) => {
  const { user, setUser } = useContext(UserContext);
  const [theme, setTheme] = useState(() => {
    const stored =
      user && user.authenticated
        ? user.themePreference
        : localStorage.getItem("theme");
    return stored ? stored : "light";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    if (user && user.authenticated) {
      document.documentElement.setAttribute("data-theme", user.themePreference);
    }
    localStorage.setItem("theme", theme);
  }, [theme, user.themePreference]);

  const toggleTheme = () => {
    // Calcular y aplicar nuevo tema
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    // Actualizar preferencia en el objeto user (y propagar si es necesario)
    if (user && user.themePreference === theme) {
      setUser({ ...user, themePreference: nextTheme });
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
