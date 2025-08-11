
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

const getNavigationItems = (userRole: string, activeLicensesCount: number) => {
  const baseItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'fas fa-chart-dashboard', route: '/dashboard' },
    { id: 'licenses', label: 'Licenze', icon: 'fas fa-key', badge: activeLicensesCount > 0 ? activeLicensesCount.toString() : undefined, route: '/licenses' },
    { id: 'software-registrations', label: 'QlmRegister', icon: 'fas fa-desktop', route: '/software-registrations' },
    { id: 'companies', label: 'Aziende', icon: 'fas fa-building', route: '/companies' },
    { id: 'clients', label: 'Clienti', icon: 'fas fa-users', route: '/clients' },
    { id: 'products', label: 'Prodotti', icon: 'fas fa-box', route: '/products' },
    { id: 'transactions', label: 'Transazioni', icon: 'fas fa-chart-line', route: '/transactions' },
  ];

  // User management with role-based permissions
  if (userRole === 'superadmin' || userRole === 'admin') {
    baseItems.push({ id: 'users', label: 'Gestione Utenti', icon: 'fas fa-user-cog', route: '/users' });
  }

  // Only superadmin can access settings and logs
  if (userRole === 'superadmin') {
    baseItems.push(
      { id: 'settings', label: 'Impostazioni', icon: 'fas fa-cog', separator: true, route: '/settings' },
      { id: 'logs', label: 'Log Attività', icon: 'fas fa-file-alt', route: '/logs' }
    );
  }

  return baseItems;
};

export function AppSidebar() {
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuth();

  // Get active licenses count based on user profile
  const { data: activeLicensesCount = 0 } = useQuery({
    queryKey: ['/api/licenses/active/count'],
    enabled: !!user,
    queryFn: async () => {
      const token = localStorage.getItem('qlm_token');
      const response = await fetch('/api/licenses/active/count', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch active licenses count');
      const data = await response.json();
      return data.count;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const navigationItems = getNavigationItems(user?.role || 'superadmin', activeLicensesCount);

  // Determine active item based on current route
  const getActiveItem = () => {
    const currentPath = location;
    const activeNavItem = navigationItems.find(item => item.route === currentPath);
    return activeNavItem ? activeNavItem.id : 'dashboard';
  };

  const activeItem = getActiveItem();

  const handleLogout = () => {
    logout();
  };

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center space-x-3 px-2 py-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center overflow-hidden">
                <img 
                  src="/cmh-logo.png" 
                  alt="CMH Logo" 
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    const target = e.currentTarget as HTMLImageElement;
                    target.style.display = 'none';
                    const fallback = target.parentElement?.querySelector('.logo-fallback') as HTMLElement;
                    if (fallback) fallback.style.display = 'flex';
                  }}
                />
                <div 
                  className="logo-fallback text-white font-bold text-xs w-full h-full items-center justify-center"
                  style={{ display: 'none' }}
                >
                  CMH
                </div>
              </div>
              <div className="group-data-[collapsible=icon]:hidden">
                <h1 className="text-lg font-bold text-gray-900">QLM Platform</h1>
                <p className="text-xs text-gray-500">License Manager</p>
              </div>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {/* Company Info for non-superadmin users */}
        {user?.role !== 'superadmin' && user?.company && (
          <SidebarGroup>
            <div className="px-2 py-2 group-data-[collapsible=icon]:hidden">
              <div className="text-xs text-gray-600 mb-1">Azienda</div>
              <div className="font-medium text-gray-900 text-sm">{user.company.name}</div>
              <div className="text-xs text-gray-500 capitalize">{user.role}</div>
            </div>
          </SidebarGroup>
        )}

        <SidebarGroup>
          <SidebarMenu>
            {navigationItems.map((item) => (
              <SidebarMenuItem key={item.id}>
                <SidebarMenuButton
                  isActive={activeItem === item.id}
                  onClick={() => setLocation(item.route)}
                  className="w-full"
                >
                  <i className={`${item.icon} text-sm`}></i>
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="ml-auto bg-secondary text-white text-xs px-2 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center space-x-3 px-2 py-2">
              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                <i className="fas fa-user text-gray-600 text-sm"></i>
              </div>
              <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user?.name}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {user?.company?.name || 'QLM Platform'}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <i className="fas fa-sign-out-alt text-sm"></i>
              </Button>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

export default function SidebarWrapper({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <main className="flex-1 overflow-hidden">
          <div className="p-4">
            <SidebarTrigger className="mb-4" />
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
