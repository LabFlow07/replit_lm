import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/layout/sidebar";
import TopBar from "@/components/layout/topbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import ActivationForm from "@/components/license/activation-form";
import ExpiringLicensesList from "@/components/license/expiring-licenses-list";
import { Search, Key, Plus, Filter, Calendar, CheckCircle, AlertTriangle, Clock, Settings } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

interface License {
  id: string;
  activationKey: string;
  licenseType: string;
  maxUsers: number;
  maxDevices: number;
  price: string;
  status: string;
  activationDate: string;
  expiryDate: string;
  computerKey: string;
  client: { name: string; company_id?: string; companyId?: string };
  product: { name: string };
}

export default function LicensesPage() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [isNewLicenseModalOpen, setIsNewLicenseModalOpen] = useState(false);
  const [editingLicense, setEditingLicense] = useState<License | null>(null);

  // Always call useQuery hooks - they will be disabled when user is not available
  const { data: clients = [] } = useQuery({
    queryKey: ['/api/clients'],
    enabled: !!user,
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/clients', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch clients');
      return response.json();
    }
  });

  const { data: products = [] } = useQuery({
    queryKey: ['/api/products'],
    enabled: !!user,
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/products', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch products');
      return response.json();
    }
  });

  const { data: companies = [] } = useQuery({
    queryKey: ['/api/companies'],
    enabled: !!user,
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/companies', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch companies');
      return response.json();
    }
  });

  const { data: licenses = [] } = useQuery({
    queryKey: ['/api/licenses'],
    enabled: !!user,
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/licenses', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();

      console.log(`Licenses API returned ${data.length} licenses for user ${user?.username}`);
      return data;
    }
  });

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

  // Since the server already filters licenses by company hierarchy for admin users,
  // we don't need complex client-side filtering. Just trust the server response.
  console.log(`Licenses page: User ${user?.username} (${user?.role}) has ${licenses.length} licenses from server`);

  const filteredLicenses = licenses.filter((license: License) => {
    const searchTermLower = searchTerm.toLowerCase();
    const clientName = license.client?.name?.toLowerCase() || '';
    const productName = license.product?.name?.toLowerCase() || '';

    const searchMatch =
      clientName.includes(searchTermLower) ||
      productName.includes(searchTermLower) ||
      license.activationKey?.toLowerCase().includes(searchTermLower);

    const statusMatch = statusFilter === "all" || license.status === statusFilter;
    const typeMatch = typeFilter === "all" || license.licenseType === typeFilter;

    return searchMatch && statusMatch && typeMatch;
  });

  const handleEditLicense = (license: License) => {
    setEditingLicense(license);
  };

  const handleActivateLicense = (license: License) => {
    // Logic to activate license
    alert(`Activating license: ${license.id}`);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const isExpired = (expiryDate: string) => {
    return new Date(expiryDate) < new Date();
  };

  const isExpiringSoon = (expiryDate: string) => {
    const expiry = new Date(expiryDate);
    const today = new Date();
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 30 && diffDays > 0;
  };

  return (
    <div className="min-h-screen flex bg-surface">
      <Sidebar />

      <main className="flex-1 ml-64 bg-surface">
        <TopBar />

        <div className="p-4 md:p-6 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Gestione Licenze</h1>
              <p className="text-gray-600">Visualizza e gestisci tutte le licenze del sistema</p>
            </div>
            <Button 
              className="bg-primary hover:bg-blue-700 w-full sm:w-auto"
              onClick={() => setIsNewLicenseModalOpen(true)}
            >
              <i className="fas fa-plus mr-2"></i>
              Nuova Licenza
            </Button>
          </div>

          {/* Main Content Grid */}
          <div className="space-y-6">
            {/* Licenze in scadenza */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <i className="fas fa-clock text-orange-500"></i>
                  Licenze in Scadenza
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ExpiringLicensesList />
              </CardContent>
            </Card>

            {/* Activation Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <i className="fas fa-key text-blue-500"></i>
                  Attivazione Licenza
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ActivationForm />
              </CardContent>
            </Card>

            {/* Licenses Grid */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  <h2 className="text-xl font-semibold">Elenco Licenze</h2>
                  <Badge variant="outline" className="ml-2">
                    {filteredLicenses.length} licenze
                  </Badge>
                </div>
              </div>

              {/* Grid Layout */}
              {filteredLicenses.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Key className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Nessuna licenza trovata</h3>
                    <p className="text-muted-foreground">
                      Non ci sono licenze che corrispondono ai criteri di ricerca.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredLicenses.map((license: License) => (
                    <Card key={license.id} className="hover:shadow-lg transition-shadow duration-200">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <CardTitle className="text-lg leading-tight">
                              {license.product?.name || 'Prodotto sconosciuto'}
                            </CardTitle>
                            <CardDescription className="text-sm">
                              {license.client?.name || 'Cliente sconosciuto'}
                            </CardDescription>
                          </div>
                          <Badge 
                            variant={
                              license.status === 'attiva' ? 'default' :
                              license.status === 'scaduta' ? 'destructive' :
                              license.status === 'sospesa' ? 'secondary' :
                              'outline'
                            }
                            className="shrink-0"
                          >
                            {license.status === 'attiva' ? 'Attiva' :
                             license.status === 'scaduta' ? 'Scaduta' :
                             license.status === 'sospesa' ? 'Sospesa' :
                             license.status === 'in_attesa_convalida' ? 'In Attesa' :
                             license.status}
                          </Badge>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-4">
                        {/* License Key */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Key className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Chiave Licenza</span>
                          </div>
                          <div className="bg-muted p-2 rounded text-sm font-mono">
                            {license.activationKey}
                          </div>
                        </div>

                        {/* License Type and Price */}
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Tipo:</span>
                            <div className="font-medium capitalize">
                              {license.licenseType === 'permanente' ? 'Permanente' :
                               license.licenseType === 'abbonamento' ? 'Abbonamento' :
                               license.licenseType === 'trial' ? 'Trial' :
                               license.licenseType}
                            </div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Prezzo:</span>
                            <div className="font-medium">
                              {formatCurrency(parseFloat(license.price || '0'))}
                            </div>
                          </div>
                        </div>

                        {/* Limits */}
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Max Utenti:</span>
                            <div className="font-medium">{license.maxUsers || 'Illimitati'}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Max Dispositivi:</span>
                            <div className="font-medium">{license.maxDevices || 'Illimitati'}</div>
                          </div>
                        </div>

                        {/* Dates */}
                        {(license.activationDate || license.expiryDate) && (
                          <div className="space-y-2 text-sm">
                            {license.activationDate && (
                              <div>
                                <span className="text-muted-foreground">Attivazione:</span>
                                <div className="font-medium">
                                  {format(new Date(license.activationDate), 'dd/MM/yyyy', { locale: it })}
                                </div>
                              </div>
                            )}
                            {license.expiryDate && (
                              <div>
                                <span className="text-muted-foreground">Scadenza:</span>
                                <div className={`font-medium ${
                                  isExpiringSoon(license.expiryDate) ? 'text-orange-600' :
                                  isExpired(license.expiryDate) ? 'text-red-600' : ''
                                }`}>
                                  {format(new Date(license.expiryDate), 'dd/MM/yyyy', { locale: it })}
                                  {isExpiringSoon(license.expiryDate) && !isExpired(license.expiryDate) && (
                                    <span className="ml-1 text-xs">(In scadenza)</span>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Computer Key */}
                        {license.computerKey && (
                          <div className="space-y-1 text-sm">
                            <span className="text-muted-foreground">Computer Key:</span>
                            <div className="font-mono text-xs bg-muted p-1 rounded">
                              {license.computerKey}
                            </div>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2 pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditLicense(license)}
                            className="flex-1"
                          >
                            <Settings className="h-4 w-4 mr-1" />
                            Modifica
                          </Button>
                          {license.status === 'in_attesa_convalida' && (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleActivateLicense(license)}
                              className="flex-1"
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Attiva
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* New License Modal */}
        <Dialog open={isNewLicenseModalOpen} onOpenChange={setIsNewLicenseModalOpen}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nuova Licenza</DialogTitle>
            </DialogHeader>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.target as HTMLFormElement);

              try {
                const token = localStorage.getItem('token');
                const response = await fetch('/api/licenses', {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    clientId: formData.get('clientId'),
                    productId: formData.get('productId'),
                    licenseType: formData.get('licenseType'),
                    maxUsers: parseInt(formData.get('maxUsers') as string) || 1,
                    maxDevices: parseInt(formData.get('maxDevices') as string) || 1,
                    price: parseFloat(formData.get('price') as string) || 0,
                    discount: parseFloat(formData.get('discount') as string) || 0,
                    status: 'in_attesa_convalida',
                    activeModules: ['core']
                  })
                });

                if (response.ok) {
                  setIsNewLicenseModalOpen(false);
                  window.location.reload();
                } else {
                  console.error('Failed to create license');
                }
              } catch (error) {
                console.error('Error creating license:', error);
              }
            }}>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-license-client">Cliente *</Label>
                    <Select name="clientId" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((client: any) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name} - {client.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="new-license-product">Prodotto *</Label>
                    <Select name="productId" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona prodotto" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((product: any) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name} - {product.version}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-license-type">Tipo Licenza *</Label>
                    <Select name="licenseType" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="permanente">Permanente</SelectItem>
                        <SelectItem value="trial">Trial</SelectItem>
                        <SelectItem value="abbonamento_mensile">Abbonamento Mensile</SelectItem>
                        <SelectItem value="abbonamento_annuale">Abbonamento Annuale</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="new-license-price">Prezzo €</Label>
                    <Input
                      id="new-license-price"
                      name="price"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-license-users">Max Utenti</Label>
                    <Input
                      id="new-license-users"
                      name="maxUsers"
                      type="number"
                      defaultValue="1"
                      min="1"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="new-license-devices">Max Dispositivi</Label>
                    <Input
                      id="new-license-devices"
                      name="maxDevices"
                      type="number"
                      defaultValue="1"
                      min="1"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="new-license-discount">Sconto %</Label>
                    <Input
                      id="new-license-discount"
                      name="discount"
                      type="number"
                      step="0.01"
                      defaultValue="0"
                      min="0"
                      max="100"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2 pt-4">
                  <Button 
                    type="button"
                    variant="outline" 
                    onClick={() => setIsNewLicenseModalOpen(false)}
                    className="w-full sm:w-auto"
                  >
                    Annulla
                  </Button>
                  <Button type="submit" className="bg-primary hover:bg-blue-700 w-full sm:w-auto">
                    <i className="fas fa-save mr-2"></i>
                    Crea Licenza
                  </Button>
                </div>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}