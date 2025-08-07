import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Sidebar from "@/components/layout/sidebar";
import TopBar from "@/components/layout/topbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
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
  const queryClient = useQueryClient();

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
      const token = localStorage.getItem('qlm_token');
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
      const token = localStorage.getItem('qlm_token');
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
      const token = localStorage.getItem('qlm_token');
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
      const token = localStorage.getItem('qlm_token');
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

  // Clear React Query cache when user changes to prevent stale data
  useEffect(() => {
    if (user?.id) {
      queryClient.invalidateQueries();
    }
  }, [user?.id]);

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

              {/* Filters */}
            <Card className="mb-6">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <Input
                      placeholder="Cerca per chiave, cliente, prodotto..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Tutti gli stati" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tutti gli stati</SelectItem>
                        <SelectItem value="attiva">Attiva</SelectItem>
                        <SelectItem value="demo">Demo</SelectItem>
                        <SelectItem value="trial">Trial</SelectItem>
                        <SelectItem value="scaduta">Scaduta</SelectItem>
                        <SelectItem value="sospesa">Sospesa</SelectItem>
                        <SelectItem value="in_attesa_convalida">In Attesa</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Tutti i tipi" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tutti i tipi</SelectItem>
                        <SelectItem value="permanente">Permanente</SelectItem>
                        <SelectItem value="trial">Trial</SelectItem>
                        <SelectItem value="abbonamento_mensile">Mensile</SelectItem>
                        <SelectItem value="abbonamento_annuale">Annuale</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button 
                      variant="outline"
                      onClick={() => {
                        setSearchTerm("");
                        setStatusFilter("all");
                        setTypeFilter("all");
                      }}
                    >
                      Reset
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Excel-like Table */}
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
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-left p-3 font-medium text-sm border-r">Chiave Licenza</th>
                          <th className="text-left p-3 font-medium text-sm border-r">Prodotto</th>
                          <th className="text-left p-3 font-medium text-sm border-r">Cliente</th>
                          <th className="text-left p-3 font-medium text-sm border-r">Tipo</th>
                          <th className="text-left p-3 font-medium text-sm border-r">Stato</th>
                          <th className="text-left p-3 font-medium text-sm border-r">Utenti/Dispositivi</th>
                          <th className="text-left p-3 font-medium text-sm border-r">Prezzo</th>
                          <th className="text-left p-3 font-medium text-sm border-r">Attivazione</th>
                          <th className="text-left p-3 font-medium text-sm border-r">Scadenza</th>
                          <th className="text-left p-3 font-medium text-sm">Azioni</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredLicenses.map((license: License, index: number) => (
                          <tr key={license.id} className={`border-b hover:bg-muted/30 ${index % 2 === 0 ? 'bg-white' : 'bg-muted/10'}`}>
                            <td className="p-3 border-r">
                              <div className="font-mono text-sm">
                                {license.activationKey}
                              </div>
                              {license.computerKey && (
                                <div className="text-xs text-muted-foreground font-mono">
                                  {license.computerKey}
                                </div>
                              )}
                              {license.notes && license.notes.includes('registrazione software') && (
                                <div className="text-xs text-blue-600 mt-1">
                                  <i className="fas fa-desktop mr-1"></i>
                                  Da registrazione SW
                                </div>
                              )}
                            </td>

                            <td className="p-3 border-r">
                              <div className="font-medium text-sm">
                                {license.product?.name || 'N/A'}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                v{license.product?.version || ''}
                              </div>
                            </td>

                            <td className="p-3 border-r">
                              <div className="font-medium text-sm">
                                {license.client?.name || 'N/A'}
                              </div>
                            </td>

                            <td className="p-3 border-r">
                              <Badge variant="outline" className="text-xs">
                                {license.licenseType === 'permanente' ? 'Permanente' :
                                 license.licenseType === 'abbonamento_mensile' ? 'Mensile' :
                                 license.licenseType === 'abbonamento_annuale' ? 'Annuale' :
                                 license.licenseType === 'trial' ? 'Trial' :
                                 license.licenseType}
                              </Badge>
                            </td>

                            <td className="p-3 border-r">
                              <Badge 
                                variant={
                                  license.status === 'attiva' ? 'default' :
                                  license.status === 'scaduta' ? 'destructive' :
                                  license.status === 'sospesa' ? 'secondary' :
                                  'outline'
                                }
                                className="text-xs"
                              >
                                {license.status === 'attiva' ? 'Attiva' :
                                 license.status === 'scaduta' ? 'Scaduta' :
                                 license.status === 'sospesa' ? 'Sospesa' :
                                 license.status === 'demo' ? 'Demo' :
                                 license.status === 'trial' ? 'Trial' :
                                 license.status === 'in_attesa_convalida' ? 'In Attesa' :
                                 license.status}
                              </Badge>
                            </td>

                            <td className="p-3 border-r text-sm">
                              <div>{license.maxUsers || '∞'} utenti</div>
                              <div className="text-xs text-muted-foreground">
                                {license.maxDevices || '∞'} dispositivi
                              </div>
                            </td>

                            <td className="p-3 border-r text-sm font-medium">
                              {formatCurrency(parseFloat(license.price || '0'))}
                            </td>

                            <td className="p-3 border-r text-sm">
                              {license.activationDate ? 
                                format(new Date(license.activationDate), 'dd/MM/yyyy', { locale: it }) : 
                                '-'
                              }
                            </td>

                            <td className="p-3 border-r text-sm">
                              {license.expiryDate ? (
                                <div className={
                                  isExpired(license.expiryDate) ? 'text-red-600 font-medium' :
                                  isExpiringSoon(license.expiryDate) ? 'text-orange-600 font-medium' :
                                  ''
                                }>
                                  {format(new Date(license.expiryDate), 'dd/MM/yyyy', { locale: it })}
                                  {isExpiringSoon(license.expiryDate) && !isExpired(license.expiryDate) && (
                                    <div className="text-xs text-orange-500">In scadenza</div>
                                  )}
                                  {isExpired(license.expiryDate) && (
                                    <div className="text-xs text-red-500">Scaduta</div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">Mai</span>
                              )}
                            </td>

                            <td className="p-3">
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditLicense(license)}
                                  className="h-8 w-8 p-0"
                                  title="Visualizza/Modifica licenza"
                                  disabled={license.notes && license.notes.includes('registrazione software') && user.role !== 'superadmin'}
                                >
                                  <Settings className="h-4 w-4" />
                                </Button>
                                {license.status === 'in_attesa_convalida' && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleActivateLicense(license)}
                                    className="h-8 w-8 p-0 text-green-600"
                                    title="Attiva licenza"
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                  </Button>
                                )}
                                {user.role === 'superadmin' && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={async () => {
                                      const isClassified = license.notes && license.notes.includes('registrazione software');
                                      const confirmMessage = isClassified 
                                        ? 'Questa è una licenza classificata da registrazione software. Sei sicuro di voler cancellare questa licenza? Questa azione non può essere annullata.'
                                        : 'Sei sicuro di voler cancellare questa licenza? Questa azione non può essere annullata.';
                                      
                                      if (confirm(confirmMessage)) {
                                        try {
                                          const token = localStorage.getItem('qlm_token');
                                          const response = await fetch(`/api/licenses/${license.id}`, {
                                            method: 'DELETE',
                                            headers: {
                                              'Authorization': `Bearer ${token}`,
                                              'Content-Type': 'application/json'
                                            }
                                          });

                                          if (response.ok) {
                                            // Invalida la cache e ricarica i dati
                                            queryClient.invalidateQueries({ queryKey: ['/api/licenses'] });
                                            // Ricarica anche la pagina per essere sicuri
                                            setTimeout(() => window.location.reload(), 500);
                                          } else {
                                            const errorData = await response.json().catch(() => ({}));
                                            alert(`Errore nella cancellazione: ${errorData.message || 'Errore sconosciuto'}`);
                                          }
                                        } catch (error) {
                                          console.error('Error deleting license:', error);
                                          alert('Errore nella cancellazione della licenza');
                                        }
                                      }
                                    }}
                                    className="h-8 w-8 p-0 text-red-600"
                                    title={license.notes && license.notes.includes('registrazione software') ? "Cancella licenza classificata (solo superadmin)" : "Cancella licenza"}
                                  >
                                    <i className="fas fa-trash text-xs"></i>
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
            </div>
          </div>
        </div>

        {/* New License Modal with Activation */}
        <Dialog open={isNewLicenseModalOpen} onOpenChange={setIsNewLicenseModalOpen}>
          <DialogContent className="w-[95vw] max-w-[800px] max-h-[95vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <i className="fas fa-plus text-blue-500"></i>
                Nuova Licenza
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.target as HTMLFormElement);

              try {
                const token = localStorage.getItem('qlm_token');
                const response = await fetch('/api/licenses', {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    clientId: formData.get('clientId') === 'none' ? null : formData.get('clientId'),
                    productId: formData.get('productId') === 'none' ? null : formData.get('productId'),
                    licenseType: formData.get('licenseType'),
                    maxUsers: parseInt(formData.get('maxUsers') as string) || 1,
                    maxDevices: parseInt(formData.get('maxDevices') as string) || 1,
                    price: parseFloat(formData.get('price') as string) || 0,
                    discount: parseFloat(formData.get('discount') as string) || 0,
                    activeModules: ['core'],
                    activationKey: formData.get('activationKey') || undefined,
                    computerKey: formData.get('computerKey') || undefined
                  })
                });

                if (response.ok) {
                  setIsNewLicenseModalOpen(false);
                  queryClient.invalidateQueries({ queryKey: ['/api/licenses'] });
                  alert('Licenza creata con successo!');
                  // Reset form
                  const form = e.target as HTMLFormElement;
                  form.reset();
                } else {
                  console.error('Failed to create license');
                  alert('Errore nella creazione della licenza');
                }
              } catch (error) {
                console.error('Error creating license:', error);
                alert('Errore nella creazione della licenza');
              }
            }}>
              <div className="space-y-6">
                {/* Informazioni Base Licenza */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                    <i className="fas fa-info-circle mr-2"></i>
                    Informazioni Base
                  </h3>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="new-license-client">Cliente (Opzionale)</Label>
                      <Select name="clientId">
                        <SelectTrigger>
                          <SelectValue placeholder="Nessun cliente assegnato" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nessun cliente</SelectItem>
                          {clients.map((client: any) => (
                            <SelectItem key={client.id} value={client.id}>
                              {client.name} - {client.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="new-license-product">Prodotto (Opzionale)</Label>
                      <Select name="productId">
                        <SelectTrigger>
                          <SelectValue placeholder="Nessun prodotto assegnato" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nessun prodotto</SelectItem>
                          {products.map((product: any) => (
                            <SelectItem key={product.id} value={product.id}>
                              {product.name} - {product.version}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                </div>

                {/* Sezione Attivazione */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                    <i className="fas fa-key mr-2"></i>
                    Attivazione Licenza (Opzionale)
                  </h3>
                  
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm text-blue-800 mb-3">
                      <i className="fas fa-info-circle mr-1"></i>
                      Puoi generare automaticamente le chiavi o inserirle manualmente per attivare immediatamente la licenza.
                    </p>
                    
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor="activation-key">Chiave di Attivazione</Label>
                        <div className="flex space-x-2">
                          <Input
                            id="activation-key"
                            name="activationKey"
                            placeholder="Genera o inserisci la chiave di attivazione"
                            className="font-mono text-sm flex-1"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              const key = `LIC-${Date.now().toString().slice(-8)}-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
                              const activationKeyInput = document.getElementById('activation-key') as HTMLInputElement;
                              if (activationKeyInput) activationKeyInput.value = key;
                            }}
                            size="sm"
                            className="px-3 shrink-0"
                            title="Genera chiave di attivazione"
                          >
                            <i className="fas fa-key text-xs"></i>
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="computer-key">Chiave Computer</Label>
                        <div className="flex space-x-2">
                          <Input
                            id="computer-key"
                            name="computerKey"
                            placeholder="Genera o inserisci la chiave computer"
                            className="font-mono text-sm flex-1"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              const key = `CK-${Date.now().toString().slice(-8)}-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
                              const computerKeyInput = document.getElementById('computer-key') as HTMLInputElement;
                              if (computerKeyInput) computerKeyInput.value = key;
                            }}
                            size="sm"
                            className="px-3 shrink-0"
                            title="Genera chiave computer"
                          >
                            <i className="fas fa-desktop text-xs"></i>
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="device-info">Info Dispositivo</Label>
                        <Input
                          id="device-info"
                          name="deviceInfo"
                          placeholder="Informazioni aggiuntive sul dispositivo (opzionale)"
                          className="text-sm"
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Attivazione Offline */}
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">
                      <i className="fas fa-download mr-1"></i>
                      Attivazione Offline
                    </h4>
                    <p className="text-xs text-gray-600 mb-3">
                      Se il cliente non ha connessione internet, può utilizzare l'attivazione offline.
                    </p>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      className="w-full text-xs"
                      onClick={() => alert('Funzionalità di attivazione offline sarà implementata')}
                    >
                      <i className="fas fa-download mr-2"></i>
                      Scarica File Offline
                    </Button>
                  </div>
                </div>

                {/* Pulsanti Azione */}
                <div className="flex flex-col md:flex-row justify-end space-y-3 md:space-y-0 md:space-x-3 pt-4 border-t">
                  <Button 
                    type="button"
                    variant="outline" 
                    onClick={() => {
                      setIsNewLicenseModalOpen(false);
                      // Reset form
                      const form = document.querySelector('form') as HTMLFormElement;
                      if (form) form.reset();
                    }}
                    className="w-full md:w-auto order-2 md:order-1"
                  >
                    <i className="fas fa-times mr-2"></i>
                    Annulla
                  </Button>
                  <Button type="submit" className="bg-primary hover:bg-blue-700 w-full md:w-auto order-1 md:order-2">
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