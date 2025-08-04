import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const getNavigationItems = (userRole: string) => {
  const baseItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'fas fa-chart-dashboard', route: '/dashboard' },
    { id: 'licenses', label: 'Licenze', icon: 'fas fa-key', badge: '245', route: '/licenses' },
    { id: 'clients', label: 'Clienti', icon: 'fas fa-users', route: '/clients' },
    { id: 'companies', label: 'Aziende', icon: 'fas fa-building', route: '/companies' },
    { id: 'products', label: 'Prodotti', icon: 'fas fa-box', route: '/products' },
    { id: 'transactions', label: 'Transazioni', icon: 'fas fa-chart-line', route: '/transactions' },
    { id: 'software-registrations', label: 'Registrazioni Software', icon: 'fas fa-desktop', route: '/software-registrations' },
  ];

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

  // Get active licenses count based on user profile
  const { data: activeLicensesCount = 0 } = useQuery({
    queryKey: ['/api/licenses/active/count'],
    enabled: !!user,
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/licenses/active/count', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch active licenses count');
      const data = await response.json();
      return data.count;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const navigationItems = getNavigationItems(user?.role || 'superadmin');

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
    <aside className="w-64 bg-white shadow-lg border-r border-gray-200 fixed h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded flex items-center justify-center">
            <img src="/cmh-logo.png" alt="CMH Logo" className="w-8 h-8 object-contain" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">QLM Platform</h1>
            <p className="text-sm text-gray-500">License Manager</p>
          </div>
        </div>
      </div>

      {/* Role Selector - Only for superadmin */}
      {user?.role === 'superadmin' && (
        <div className="p-4 border-b border-gray-200">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Ruolo Attivo
          </label>
          <Select value={activeRole} onValueChange={handleRoleChange}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="superadmin">Superadmin</SelectItem>
              <SelectItem value="rivenditore">Rivenditore</SelectItem>
              <SelectItem value="agente">Agente</SelectItem>
              <SelectItem value="cliente">Cliente</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Company Info for non-superadmin users */}
      {user?.role !== 'superadmin' && user?.company && (
        <div className="p-4 border-b border-gray-200">
          <div className="text-sm text-gray-600 mb-1">Azienda</div>
          <div className="font-medium text-gray-900">{user.company.name}</div>
          <div className="text-xs text-gray-500 capitalize">{user.role}</div>
        </div>
      )}

      {/* Navigation Menu */}
      <nav className="p-4 space-y-2">
        {navigationItems.map((item) => (
          <div key={item.id}>
            {item.separator && <div className="pt-4 border-t border-gray-200" />}
            <button
              onClick={() => setLocation(item.route)}
              className={`flex items-center space-x-3 px-3 py-2 rounded-lg w-full text-left transition-colors ${
                activeItem === item.id
                  ? 'bg-primary text-white'
                  : 'hover:bg-gray-100 text-gray-700'
              }`}
            >
              <i className={`${item.icon} text-sm`}></i>
              <span className="font-medium flex-1">{item.label}</span>
              {item.badge && (
                <span className="bg-secondary text-white text-xs px-2 py-1 rounded-full">
                  {item.badge}
                </span>
              )}
            </button>
          </div>
        ))}
      </nav>

      {/* User Profile */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-white">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
            <i className="fas fa-user text-gray-600 text-sm"></i>
          </div>
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
        </div>
      </div>
    </aside>
  );
}