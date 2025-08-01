import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

export default function TopBar() {
  const { user } = useAuth();

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Benvenuto, {user?.name}
          </h2>
          <span className="text-sm text-gray-500">
            {user?.role === 'superadmin' ? 'Superadmin' :
             user?.role === 'rivenditore' ? 'Rivenditore' :
             user?.role === 'agente' ? 'Agente' : 'Cliente'}
          </span>
        </div>
        
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" className="text-gray-600">
            <i className="fas fa-bell"></i>
          </Button>
          
          <Button variant="ghost" size="sm" className="text-gray-600">
            <i className="fas fa-question-circle"></i>
          </Button>
          
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-medium">
              {user?.name?.charAt(0).toUpperCase()}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}