import { Button } from "@/components/ui/button";
import { useState } from "react";

export default function TopBar() {
  const [pendingNotifications] = useState(3);

  const handleCreateLicense = () => {
    // TODO: Open license creation modal
    console.log('Create new license');
  };

  const handleToggleNotifications = () => {
    // TODO: Show/hide notifications dropdown
    console.log('Toggle notifications');
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Dashboard Licenze</h2>
          <p className="text-sm text-gray-600 mt-1">
            Gestione e monitoraggio delle licenze software
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Quick Actions */}
          <Button 
            onClick={handleCreateLicense}
            className="bg-primary text-white hover:bg-blue-700 transition-colors"
          >
            <i className="fas fa-plus text-sm mr-2"></i>
            Nuova Licenza
          </Button>
          
          {/* Notifications */}
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleNotifications}
              className="p-2 text-gray-400 hover:text-gray-600 relative"
            >
              <i className="fas fa-bell text-lg"></i>
              {pendingNotifications > 0 && (
                <span className="absolute -top-1 -right-1 bg-error text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                  {pendingNotifications}
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
