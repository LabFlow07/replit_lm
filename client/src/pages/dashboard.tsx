import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/layout/sidebar";
import TopBar from "@/components/layout/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import AlertPanel from "@/components/alerts/alert-panel";

export default function Dashboard() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && !user) {
      setLocation('/login');
    }
  }, [user, loading, setLocation]);

  // Fetch dashboard statistics
  const { data: stats = {}, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/dashboard/stats'],
    enabled: !!user,
  });

  // Fetch recent activity data
  const { data: companies = [] } = useQuery({
    queryKey: ['/api/companies'],
    enabled: !!user,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['/api/clients'],
    enabled: !!user,
  });

  const { data: products = [] } = useQuery({
    queryKey: ['/api/products'],
    enabled: !!user,
  });

  const { data: licenses = [] } = useQuery({
    queryKey: ['/api/licenses'],
    enabled: !!user,
  });

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

  // Calculate enhanced statistics
  const activeCompanies = (companies as any[]).filter(c => c.status === 'active').length;
  const validatedClients = (clients as any[]).filter(c => c.status === 'convalidato').length;
  const pendingClients = (clients as any[]).filter(c => c.status === 'in_attesa').length;
  const recentLicenses = (licenses as any[]).filter(l => {
    const createdDate = new Date(l.createdAt || l.created_at);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return createdDate >= thirtyDaysAgo;
  }).length;

  const expiringLicenses = (licenses as any[]).filter(l => {
    if (!l.expiryDate && !l.expiry_date) return false;
    const expiryDate = new Date(l.expiryDate || l.expiry_date);
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    return expiryDate <= thirtyDaysFromNow && expiryDate > new Date();
  }).length;

  return (
    <div className="min-h-screen flex bg-surface">
      <Sidebar />
      
      <main className="flex-1 ml-64 bg-surface">
        <TopBar />
        
        <div className="p-6 space-y-6">
          {/* Welcome Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-lg p-6 text-white">
            <h1 className="text-2xl font-bold mb-2">
              Benvenuto, {user.name}
            </h1>
            <p className="text-blue-100">
              Panoramica generale del sistema di gestione licenze
            </p>
          </div>

          {/* Primary Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Licenze Totali</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {statsLoading ? '...' : stats.totalLicenses || (licenses as any[]).length}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <i className="fas fa-key text-blue-600 text-xl"></i>
                  </div>
                </div>
                <div className="mt-4 flex items-center text-sm">
                  <i className="fas fa-arrow-up text-green-500 mr-1"></i>
                  <span className="text-green-600 font-medium">+{recentLicenses}</span>
                  <span className="text-gray-500 ml-1">negli ultimi 30 giorni</span>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Licenze Attive</p>
                    <p className="text-3xl font-bold text-green-700">
                      {statsLoading ? '...' : stats.activeLicenses || (licenses as any[]).filter(l => l.status === 'attiva').length}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <i className="fas fa-check-circle text-green-600 text-xl"></i>
                  </div>
                </div>
                <div className="mt-4 flex items-center text-sm">
                  <i className="fas fa-exclamation-triangle text-orange-500 mr-1"></i>
                  <span className="text-orange-600 font-medium">{expiringLicenses}</span>
                  <span className="text-gray-500 ml-1">in scadenza (30gg)</span>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Clienti Attivi</p>
                    <p className="text-3xl font-bold text-indigo-700">
                      {validatedClients}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <i className="fas fa-users text-indigo-600 text-xl"></i>
                  </div>
                </div>
                <div className="mt-4 flex items-center text-sm">
                  <i className="fas fa-clock text-yellow-500 mr-1"></i>
                  <span className="text-yellow-600 font-medium">{pendingClients}</span>
                  <span className="text-gray-500 ml-1">in attesa validazione</span>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Aziende Partner</p>
                    <p className="text-3xl font-bold text-purple-700">
                      {activeCompanies}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <i className="fas fa-building text-purple-600 text-xl"></i>
                  </div>
                </div>
                <div className="mt-4 flex items-center text-sm">
                  <i className="fas fa-store text-blue-500 mr-1"></i>
                  <span className="text-blue-600 font-medium">
                    {(companies as any[]).filter(c => c.type === 'rivenditore').length}
                  </span>
                  <span className="text-gray-500 ml-1">rivenditori</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Analytics Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* License Status Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <i className="fas fa-chart-pie text-blue-600 mr-2"></i>
                  Stato Licenze
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { status: 'attiva', label: 'Attive', color: 'bg-green-500', count: (licenses as any[]).filter(l => l.status === 'attiva').length },
                    { status: 'demo', label: 'Demo/Trial', color: 'bg-blue-500', count: (licenses as any[]).filter(l => l.status === 'demo').length },
                    { status: 'scaduta', label: 'Scadute', color: 'bg-red-500', count: (licenses as any[]).filter(l => l.status === 'scaduta').length },
                    { status: 'in_attesa_convalida', label: 'In Attesa', color: 'bg-yellow-500', count: (licenses as any[]).filter(l => l.status === 'in_attesa_convalida').length },
                    { status: 'sospesa', label: 'Sospese', color: 'bg-gray-500', count: (licenses as any[]).filter(l => l.status === 'sospesa').length }
                  ].map(item => (
                    <div key={item.status} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className={`w-3 h-3 rounded-full ${item.color} mr-3`}></div>
                        <span className="text-sm text-gray-700">{item.label}</span>
                      </div>
                      <Badge variant="outline">{item.count}</Badge>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t">
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => setLocation('/licenses')}
                  >
                    <i className="fas fa-external-link-alt mr-2"></i>
                    Vedi Tutte le Licenze
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Company Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <i className="fas fa-sitemap text-green-600 mr-2"></i>
                  Distribuzione Aziende
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { type: 'rivenditore', label: 'Rivenditori', icon: 'fa-store', count: (companies as any[]).filter(c => c.type === 'rivenditore').length },
                    { type: 'sottoazienda', label: 'Sotto-aziende', icon: 'fa-sitemap', count: (companies as any[]).filter(c => c.type === 'sottoazienda').length },
                    { type: 'agente', label: 'Agenti', icon: 'fa-user-tie', count: (companies as any[]).filter(c => c.type === 'agente').length },
                    { type: 'cliente', label: 'Clienti Corporate', icon: 'fa-user', count: (companies as any[]).filter(c => c.type === 'cliente').length }
                  ].map(item => (
                    <div key={item.type} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <i className={`fas ${item.icon} text-blue-600 mr-3`}></i>
                        <span className="text-sm text-gray-700">{item.label}</span>
                      </div>
                      <Badge variant="outline">{item.count}</Badge>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t">
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => setLocation('/companies')}
                  >
                    <i className="fas fa-external-link-alt mr-2"></i>
                    Gestisci Aziende
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions & Alerts */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <i className="fas fa-bolt text-yellow-600 mr-2"></i>
                    Azioni Rapide
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button 
                    className="w-full justify-start" 
                    variant="outline"
                    onClick={() => setLocation('/clients')}
                  >
                    <i className="fas fa-user-plus mr-2"></i>
                    Nuovo Cliente
                  </Button>
                  
                  <Button 
                    className="w-full justify-start" 
                    variant="outline"
                    onClick={() => setLocation('/products')}
                  >
                    <i className="fas fa-box mr-2"></i>
                    Gestisci Prodotti
                  </Button>
                  
                  <Button 
                    className="w-full justify-start" 
                    variant="outline"
                    onClick={() => setLocation('/companies')}
                  >
                    <i className="fas fa-building mr-2"></i>
                    Nuova Azienda
                  </Button>
                  
                  <Button 
                    className="w-full justify-start" 
                    variant="outline"
                    onClick={() => setLocation('/transactions')}
                  >
                    <i className="fas fa-chart-line mr-2"></i>
                    Report Vendite
                  </Button>
                </CardContent>
              </Card>

              <AlertPanel />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
