import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import Sidebar from "@/components/layout/sidebar";
import TopBar from "@/components/layout/topbar";
import LicenseTable from "@/components/license/license-table";
import ActivationForm from "@/components/license/activation-form";

export default function LicensesPage() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && !user) {
      setLocation('/login');
    }
  }, [user, loading, setLocation]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen flex bg-surface">
      <Sidebar />
      
      <main className="flex-1 ml-64 bg-surface">
        <TopBar />
        
        <div className="p-6 space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestione Licenze</h1>
            <p className="text-gray-600">Visualizza e gestisci tutte le licenze del sistema</p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <LicenseTable />
            </div>
            
            <div>
              <ActivationForm />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}