
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";

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

export default function Sidebar() {
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Check if device is mobile
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 768) {
        setIsCollapsed(true);
      }
    };
    
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

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
    refetchInterval: 30000,
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

  const toggleMobileMenu = () => {
    if (isMobile) {
      setIsMobileMenuOpen(!isMobileMenuOpen);
    } else {
      setIsCollapsed(!isCollapsed);
    }
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isMobile && isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Desktop Sidebar */}
      <div className={`
        ${isMobile 
          ? `fixed left-0 top-0 z-50 transform transition-transform duration-300 ${
              isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
            } w-64 bg-white border-r border-gray-200 h-screen flex flex-col`
          : `${isCollapsed ? 'w-16' : 'w-64'} bg-white border-r border-gray-200 h-screen flex flex-col transition-all duration-300`
        }
      `}>
        {/* Header */}
        <div className="flex items-center justify-between p-4">
          {(!isCollapsed || isMobile) && (
            <div className="flex items-center space-x-3">
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
              <div>
                <h1 className="text-lg font-bold text-gray-900">QLM Platform</h1>
                <p className="text-xs text-gray-500">License Manager</p>
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleMobileMenu}
            className="p-1"
            data-testid="button-toggle-sidebar"
          >
            {isMobile && isMobileMenuOpen ? (
              <X className="h-4 w-4" />
            ) : (
              <Menu className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Company Info for non-superadmin users */}
        {(!isCollapsed || isMobile) && user?.role !== 'superadmin' && user?.company && (
          <div className="px-4 py-2 border-b border-gray-100">
            <div className="text-xs text-gray-600 mb-1">Azienda</div>
            <div className="font-medium text-gray-900 text-sm">{user.company.name}</div>
            <div className="text-xs text-gray-500 capitalize">{user.role}</div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-2 py-4 space-y-1">
          {navigationItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setLocation(item.route)}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                activeItem === item.id
                  ? 'bg-primary text-white'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
              title={isCollapsed && !isMobile ? item.label : undefined}
              data-testid={`nav-${item.id}`}
            >
              <i className={`${item.icon} ${isCollapsed && !isMobile ? 'text-base' : 'text-sm mr-3'}`}></i>
              {(!isCollapsed || isMobile) && (
                <>
                  <span className="flex-1">{item.label}</span>
                  {item.badge && (
                    <span className="ml-2 bg-secondary text-white text-xs px-2 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
              <i className="fas fa-user text-gray-600 text-sm"></i>
            </div>
            {(!isCollapsed || isMobile) && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user?.name}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {user?.company?.name || 'QLM Platform'}
                </p>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-gray-400 hover:text-gray-600 p-1"
              title="Logout"
              data-testid="button-logout"
            >
              <i className="fas fa-sign-out-alt text-sm"></i>
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Button - Fixed position for easy access */}
      {isMobile && !isMobileMenuOpen && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsMobileMenuOpen(true)}
          className="fixed top-4 left-4 z-30 bg-white shadow-md"
          data-testid="button-open-mobile-menu"
        >
          <Menu className="h-4 w-4" />
        </Button>
      )}
    </>
  );
}
