import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import Sidebar from "@/components/layout/sidebar";
import TopBar from "@/components/layout/topbar";
import { useSidebar } from "@/contexts/SidebarContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export default function SettingsPage() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const { contentMargin } = useSidebar();

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
      
      <main className={`flex-1 ${contentMargin} bg-surface transition-all duration-300 ease-in-out`}>
        <TopBar />
        
        <div className="p-6 space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Impostazioni Sistema</h1>
            <p className="text-gray-600">Configura le impostazioni generali della piattaforma QLM</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Configurazione Database</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="db-host">Host Database</Label>
                  <Input id="db-host" value="87.106.247.35" readOnly className="bg-gray-50" />
                </div>
                <div>
                  <Label htmlFor="db-name">Nome Database</Label>
                  <Input id="db-name" value="replit_license" readOnly className="bg-gray-50" />
                </div>
                <div>
                  <Label htmlFor="db-user">Utente Database</Label>
                  <Input id="db-user" value="ext_replit" readOnly className="bg-gray-50" />
                </div>
                <Button variant="outline" className="w-full">
                  <i className="fas fa-database mr-2"></i>
                  Testa Connessione
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Impostazioni Email</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="smtp-server">Server SMTP</Label>
                  <Input id="smtp-server" placeholder="smtp.gmail.com" />
                </div>
                <div>
                  <Label htmlFor="smtp-port">Porta SMTP</Label>
                  <Input id="smtp-port" placeholder="587" type="number" />
                </div>
                <div>
                  <Label htmlFor="email-from">Email Mittente</Label>
                  <Input id="email-from" placeholder="noreply@qlm.com" type="email" />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch id="email-enabled" />
                  <Label htmlFor="email-enabled">Abilita notifiche email</Label>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Licenze e Attivazione</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="trial-days">Giorni Trial Default</Label>
                  <Input id="trial-days" placeholder="30" type="number" />
                </div>
                <div>
                  <Label htmlFor="max-activations">Max Attivazioni per Licenza</Label>
                  <Input id="max-activations" placeholder="5" type="number" />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch id="offline-activation" />
                  <Label htmlFor="offline-activation">Consenti attivazione offline</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch id="auto-renewal" />
                  <Label htmlFor="auto-renewal">Rinnovo automatico licenze</Label>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Sicurezza e Accesso</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="session-timeout">Timeout Sessione (minuti)</Label>
                  <Input id="session-timeout" placeholder="1440" type="number" />
                </div>
                <div>
                  <Label htmlFor="max-login-attempts">Max Tentativi Login</Label>
                  <Input id="max-login-attempts" placeholder="5" type="number" />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch id="two-factor" />
                  <Label htmlFor="two-factor">Autenticazione a due fattori</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch id="log-access" defaultChecked />
                  <Label htmlFor="log-access">Log accessi utenti</Label>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Azioni Sistema</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button variant="outline" className="h-16">
                  <div className="text-center">
                    <i className="fas fa-broom text-lg mb-1"></i>
                    <div className="text-sm">Pulizia Log</div>
                  </div>
                </Button>
                
                <Button variant="outline" className="h-16">
                  <div className="text-center">
                    <i className="fas fa-download text-lg mb-1"></i>
                    <div className="text-sm">Backup Database</div>
                  </div>
                </Button>
                
                <Button variant="outline" className="h-16">
                  <div className="text-center">
                    <i className="fas fa-chart-bar text-lg mb-1"></i>
                    <div className="text-sm">Report Sistema</div>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end space-x-4">
            <Button variant="outline">
              Annulla
            </Button>
            <Button className="bg-primary hover:bg-blue-700">
              <i className="fas fa-save mr-2"></i>
              Salva Impostazioni
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}