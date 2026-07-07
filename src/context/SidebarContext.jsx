// src/context/SidebarContext.jsx

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const SidebarContext = createContext(null);

export function SidebarProvider({ children }) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const openSidebar = useCallback(() => {
    setMobileSidebarOpen(true);
  }, []);

  const closeSidebar = useCallback(() => {
    setMobileSidebarOpen(false);
  }, []);

  const toggleSidebar = useCallback(() => {
    setMobileSidebarOpen((prev) => !prev);
  }, []);

  useEffect(() => {
    function handleEscape(event) {
      if (event.key === "Escape") {
        closeSidebar();
      }
    }

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [closeSidebar]);

  useEffect(() => {
    if (mobileSidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileSidebarOpen]);

  const value = useMemo(
    () => ({
      mobileSidebarOpen,
      openSidebar,
      closeSidebar,
      toggleSidebar,
    }),
    [mobileSidebarOpen, openSidebar, closeSidebar, toggleSidebar]
  );

  return (
    <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);

  if (!context) {
    return {
      mobileSidebarOpen: false,
      openSidebar: () => {},
      closeSidebar: () => {},
      toggleSidebar: () => {},
    };
  }

  return context;
}