import { createContext, useContext, useMemo, useState } from "react";

const SidebarContext = createContext(null);

export function SidebarProvider({ children }) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const value = useMemo(
    () => ({
      mobileSidebarOpen,
      openSidebar: () => setMobileSidebarOpen(true),
      closeSidebar: () => setMobileSidebarOpen(false),
      toggleSidebar: () => setMobileSidebarOpen((prev) => !prev),
    }),
    [mobileSidebarOpen]
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