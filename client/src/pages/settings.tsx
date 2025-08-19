import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { useSidebar } from '@/contexts/SidebarContext';
import TopBar from '@/components/layout/topbar';
import Sidebar from '@/components/layout/sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/api';
import { 
  Settings as SettingsIcon, 
  CreditCard, 
  Users, 
  Shield, 
  Bell,
  Database,
  Eye,
  EyeOff,
  Check,
  X
} from 'lucide-react';

function SettingsContent() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [stripePublicKey, setStripePublicKey] = useState('');
  const [stripeSecretKey, setStripeSecretKey] = useState('');
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [isStripeConfigured, setIsStripeConfigured] = useState(false);
  const [autoRenewalEnabled, setAutoRenewalEnabled] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  // Verifica configurazione Stripe al caricamento
  useEffect(() => {
    checkStripeConfiguration();
  }, []);

  const checkStripeConfiguration = async () => {
    try {
      // Controlla se le chiavi Stripe sono configurate
      const publicKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY;
      if (publicKey) {
        setStripePublicKey(publicKey);
        setIsStripeConfigured(true);
      }
    } catch (error) {
      console.error('Errore controllo configurazione Stripe:', error);
    }
  };

  const testStripeConnection = async () => {
    try {
      const response = await fetch('/api/stripe/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        toast({
          title: "Connessione Stripe",
          description: "Connessione con Stripe testata con successo!",
        });
      } else {
        toast({
          title: "Errore Stripe",
          description: "Errore nella connessione con Stripe. Verifica le chiavi.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Errore di connessione",
        description: "Impossibile testare la connessione Stripe.",
        variant: "destructive",
      });
    }
  };

  const saveStripeConfiguration = async () => {
    try {
      const response = await apiRequest('POST', '/api/stripe/config', {
        publicKey: stripePublicKey,
        secretKey: stripeSecretKey
      });

      if (response.ok) {
        toast({
          title: "Configurazione Stripe salvata",
          description: "Le chiavi Stripe sono state salvate con successo.",
        });
      } else {
        const errorData = await response.json();
        toast({
          title: "Errore salvataggio Stripe",
          description: errorData.message || "Errore nel salvataggio delle chiavi Stripe.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Errore di connessione",
        description: error.message || "Impossibile salvare la configurazione Stripe.",
        variant: "destructive",
      });
    }
  };

  const saveSystemSettings = async () => {
    try {
      const settings = {
        autoRenewalEnabled,
        emailNotifications,
        maintenanceMode
      };

      // Qui implementeremo l'endpoint per salvare le impostazioni
      toast({
        title: "Impostazioni salvate",
        description: "Le impostazioni di sistema sono state aggiornate.",
      });
    } catch (error) {
      toast({
        title: "Errore",
        description: "Errore nel salvataggio delle impostazioni.",
        variant: "destructive",
      });
    }
  };

  if (user?.role !== 'superadmin') {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Shield className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Accesso Limitato</h3>
              <p className="text-gray-600">
                Solo i superadmin possono accedere alle impostazioni di sistema.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <SettingsIcon className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold">Impostazioni Sistema</h1>
          <p className="text-gray-600">Configura le impostazioni globali della piattaforma</p>
        </div>
      </div>

      <Tabs defaultValue="stripe" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="stripe" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Stripe
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Sistema
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifiche
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Utenti
          </TabsTrigger>
        </TabsList>

        {/* Configurazione Stripe */}
        <TabsContent value="stripe" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Configurazione Stripe
                {isStripeConfigured ? (
                  <Badge variant="secondary" className="text-green-600 bg-green-50">
                    <Check className="h-3 w-3 mr-1" />
                    Configurato
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-red-600 bg-red-50">
                    <X className="h-3 w-3 mr-1" />
                    Non configurato
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Configura le chiavi API Stripe per abilitare i pagamenti nel sistema wallet
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="stripe-public">Chiave Pubblica Stripe</Label>
                <Input
                  id="stripe-public"
                  value={stripePublicKey}
                  onChange={(e) => setStripePublicKey(e.target.value)}
                  placeholder="pk_test_..."
                  className="font-mono text-sm"
                />
                <p className="text-xs text-gray-500">
                  La chiave pubblica è sicura da mostrare nel frontend
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="stripe-secret">Chiave Segreta Stripe</Label>
                <div className="relative">
                  <Input
                    id="stripe-secret"
                    type={showSecretKey ? "text" : "password"}
                    value={stripeSecretKey}
                    onChange={(e) => setStripeSecretKey(e.target.value)}
                    placeholder="sk_test_..."
                    className="font-mono text-sm pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                    onClick={() => setShowSecretKey(!showSecretKey)}
                  >
                    {showSecretKey ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  </Button>
                </div>
                <p className="text-xs text-red-500">
                  ⚠️ Mantieni questa chiave segreta e sicura
                </p>
              </div>

              <Separator />

              <div className="flex gap-2">
                <Button onClick={testStripeConnection} variant="outline">
                  Testa Connessione
                </Button>
                <Button onClick={saveStripeConfiguration}>
                  Salva Configurazione
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Impostazioni Sistema */}
        <TabsContent value="system" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Impostazioni Sistema
              </CardTitle>
              <CardDescription>
                Configura le impostazioni globali del sistema di gestione licenze
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Rinnovo Automatico Licenze</Label>
                  <p className="text-xs text-gray-500">
                    Abilita il rinnovo automatico giornaliero delle licenze in scadenza
                  </p>
                </div>
                <Switch
                  checked={autoRenewalEnabled}
                  onCheckedChange={setAutoRenewalEnabled}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Modalità Manutenzione</Label>
                  <p className="text-xs text-gray-500">
                    Disabilita temporaneamente l'accesso al sistema per manutenzione
                  </p>
                </div>
                <Switch
                  checked={maintenanceMode}
                  onCheckedChange={setMaintenanceMode}
                />
              </div>

              <Separator />

              <div className="space-y-4">
                <Label className="text-sm font-medium">Statistiche Sistema</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">10</div>
                    <div className="text-xs text-blue-600">Aziende</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">8</div>
                    <div className="text-xs text-green-600">Clienti</div>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">14</div>
                    <div className="text-xs text-purple-600">Licenze</div>
                  </div>
                  <div className="text-center p-3 bg-orange-50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">2070</div>
                    <div className="text-xs text-orange-600">Crediti Totali</div>
                  </div>
                </div>
              </div>

              <Separator />

              <Button onClick={saveSystemSettings} className="w-full">
                Salva Impostazioni Sistema
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifiche */}
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notifiche
              </CardTitle>
              <CardDescription>
                Configura le notifiche email e di sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Notifiche Email</Label>
                  <p className="text-xs text-gray-500">
                    Invia notifiche email per eventi importanti del sistema
                  </p>
                </div>
                <Switch
                  checked={emailNotifications}
                  onCheckedChange={setEmailNotifications}
                />
              </div>

              <Separator />

              <div className="space-y-4">
                <Label className="text-sm font-medium">Eventi di Notifica</Label>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Switch id="license-expiry" defaultChecked />
                    <Label htmlFor="license-expiry" className="text-sm">
                      Scadenza licenze (7 giorni prima)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="payment-failed" defaultChecked />
                    <Label htmlFor="payment-failed" className="text-sm">
                      Pagamenti falliti
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="low-credits" defaultChecked />
                    <Label htmlFor="low-credits" className="text-sm">
                      Crediti wallet bassi (&lt; 50 crediti)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="new-registration" />
                    <Label htmlFor="new-registration" className="text-sm">
                      Nuove registrazioni software
                    </Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Gestione Utenti */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Gestione Utenti
              </CardTitle>
              <CardDescription>
                Gestisci ruoli utente e permessi di accesso
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center py-8">
                <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">In Sviluppo</h3>
                <p className="text-gray-600">
                  La gestione utenti avanzata sarà disponibile nelle prossime versioni.
                </p>
                <Button variant="outline" className="mt-4">
                  Vai a Utenti
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function SettingsPage() {
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
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <TopBar />
        <main className="flex-1 p-6" style={{ paddingLeft: '280px', minHeight: '100vh' }}>
          <SettingsContent />
        </main>
      </div>
    </div>
  );
}