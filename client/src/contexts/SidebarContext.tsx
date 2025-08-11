import { createContext, useContext, useState, ReactNode } from 'react';

interface SidebarContextType {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  sidebarWidth: string;
  contentMargin: string;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export const SidebarProvider = ({ children }: { children: ReactNode }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const sidebarWidth = isCollapsed ? 'w-16' : 'w-64';
  const contentMargin = isCollapsed ? 'ml-16' : 'ml-64';

  return (
    <SidebarContext.Provider value={{
      isCollapsed,
      setIsCollapsed,
      sidebarWidth,
      contentMargin
    }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
};