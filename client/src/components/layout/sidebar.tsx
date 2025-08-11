import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Menu, X } from "lucide-react";
import { useSidebar } from "@/contexts/SidebarContext";

const getNavigationItems = (userRole: string, activeLicensesCount: number) => {
  const baseItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'fas fa-chart-dashboard', route: '/dashboard' },
    { id: 'licenses', label: 'Licenze', icon: 'fas fa-key', badge: activeLicensesCount > 0 ? activeLicensesCount.toString() : undefined, route: '/licenses' },
    { id: 'software-registrations', label: 'QLMRegister', icon: 'fas fa-desktop', route: '/software-registrations' },
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

export default function Sidebar() {
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const [activeRole, setActiveRole] = useState(user?.role || 'superadmin');
  const { isCollapsed, setIsCollapsed, sidebarWidth } = useSidebar();

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

  const handleRoleChange = (role: string) => {
    setActiveRole(role);
    // TODO: Update user permissions based on role
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <aside className={`${sidebarWidth} bg-white shadow-lg border-r border-gray-200 fixed h-full overflow-y-auto transition-all duration-300 ease-in-out`}>
      {/* Header */}
      <div className={`${isCollapsed ? 'p-3' : 'p-6'} border-b border-gray-200`}>
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          {!isCollapsed && (
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center overflow-hidden">
                <img 
                  src="/cmh-logo.png" 
                  alt="CMH Logo" 
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    console.log('Logo load error, falling back to text');
                    const target = e.currentTarget as HTMLImageElement;
                    target.style.display = 'none';
                    const fallback = target.parentElement?.querySelector('.logo-fallback') as HTMLElement;
                    if (fallback) fallback.style.display = 'flex';
                  }}
                />
                <div 
                  className="logo-fallback text-white font-bold text-sm w-full h-full items-center justify-center"
                  style={{ display: 'none' }}
                >
                  CMH
                </div>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">QLM Platform</h1>
                <p className="text-sm text-gray-500">License Manager</p>
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2"
            data-testid="button-toggle-sidebar"
          >
            {isCollapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Company Info for non-superadmin users */}
      {!isCollapsed && user?.role !== 'superadmin' && user?.company && (
        <div className="p-4 border-b border-gray-200">
          <div className="text-sm text-gray-600 mb-1">Azienda</div>
          <div className="font-medium text-gray-900">{user.company.name}</div>
          <div className="text-xs text-gray-500 capitalize">{user.role}</div>
        </div>
      )}

      {/* Navigation Menu */}
      <nav className={`${isCollapsed ? 'p-2' : 'p-4'} space-y-2`}>
        {navigationItems.map((item) => (
          <div key={item.id}>
            {!isCollapsed && item.separator && <div className="pt-4 border-t border-gray-200" />}
            <button
              onClick={() => setLocation(item.route)}
              className={`flex items-center ${isCollapsed ? 'justify-center px-2' : 'space-x-3 px-3'} py-2 rounded-lg w-full text-left transition-colors ${
                activeItem === item.id
                  ? 'bg-primary text-white'
                  : 'hover:bg-gray-100 text-gray-700'
              }`}
              title={isCollapsed ? item.label : ''}
            >
              <i className={`${item.icon} text-sm`}></i>
              {!isCollapsed && (
                <>
                  <span className="font-medium flex-1">{item.label}</span>
                  {item.badge && (
                    <span className="bg-secondary text-white text-xs px-2 py-1 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </button>
          </div>
        ))}
      </nav>

      {/* User Profile */}
      <div className={`absolute bottom-0 left-0 right-0 ${isCollapsed ? 'p-2' : 'p-4'} border-t border-gray-200 bg-white`}>
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'}`}>
          <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
            <i className="fas fa-user text-gray-600 text-sm"></i>
          </div>
          {!isCollapsed && (
            <>
              <div className="flex-1 min-w-0">
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
            </>
          )}
          {isCollapsed && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-gray-400 hover:text-gray-600 p-1 absolute top-2 right-2"
              title="Logout"
            >
              <i className="fas fa-sign-out-alt text-xs"></i>
            </Button>
          )}
        </div>
      </div>
    </aside>
  );
}