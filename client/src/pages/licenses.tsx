import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Sidebar from "@/components/layout/sidebar";
import { useSidebar } from "@/contexts/SidebarContext";
import TopBar from "@/components/layout/topbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import ExpiringLicensesList from "@/components/license/expiring-licenses-list";
import LicenseModal from "@/components/license/license-modal";
import { Search, Key, Plus, Filter, Calendar, CheckCircle, AlertTriangle, Clock, Settings, Edit2, Eye, X, RefreshCw, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Textarea } from "@/components/ui/textarea";

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
  product: { name: string; version?: string };
  notes?: string;
  renewalEnabled?: boolean;
  renewalPeriod?: string;
  discount?: string;
}

// Define types for client and product for clarity
interface Client {
  id: string;
  name: string;
  email: string;
  companyId?: string;
  isMultiSite: boolean;
  isMultiUser: boolean;
  contactInfo: {
    phone: string;
    company: string;
  };
}

interface Product {
  id: string;
  name: string;
  version?: string;
  description?: string;
  supportedLicenseTypes: string[];
}

interface LicenseWithDetails extends License {
  client: Client;
  product: Product;
}

// Componente per la ricerca clienti con autocompletamento
interface ClientSearchInputProps {
  clients: Client[];
  companies: any[];
  onClientSelect: (clientId: string) => void;
}

function ClientSearchInput({ clients, companies, onClientSelect }: ClientSearchInputProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // Safe arrays
  const safeCompanies = Array.isArray(companies) ? companies : [];
  
  // Funzione per ottenere il nome dell'azienda
  const getCompanyName = (companyId: string) => {
    const company = safeCompanies.find((c: any) => c.id === companyId);
    return company ? company.name : 'N/A';
  };

  // Filtra i clienti in base al termine di ricerca
  const safeClients = Array.isArray(clients) ? clients : [];
  const filteredClients = safeClients.filter((client: Client) => {
    const searchLower = searchTerm.toLowerCase();
    const clientMatch = client.name?.toLowerCase().includes(searchLower) || 
                       client.email?.toLowerCase().includes(searchLower);
    const companyName = getCompanyName(client.companyId || client.company_id || '');
    const companyMatch = companyName.toLowerCase().includes(searchLower);
    
    return clientMatch || companyMatch;
  }).sort((a, b) => {
    // Ordina prima per azienda, poi per nome cliente
    const companyA = getCompanyName(a.companyId || a.company_id || '');
    const companyB = getCompanyName(b.companyId || b.company_id || '');
    
    if (companyA !== companyB) {
      return companyA.localeCompare(companyB);
    }
    return (a.name || '').localeCompare(b.name || '');
  });

  const handleClientSelect = (client: Client) => {
    setSelectedClient(client);
    setSearchTerm(`${client.name} - ${getCompanyName(client.companyId || client.company_id || '')}`);
    setIsOpen(false);
    onClientSelect(client.id);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setIsOpen(true);
    if (!e.target.value) {
      setSelectedClient(null);
      onClientSelect('');
    }
  };

  return (
    <div className="relative client-search-container">
      <Input
        type="text"
        value={searchTerm}
        onChange={handleInputChange}
        onFocus={() => setIsOpen(true)}
        placeholder="Cerca cliente o azienda..."
        className="w-full"
        autoComplete="off"
      />
      
      {isOpen && searchTerm && filteredClients.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto client-search-dropdown">
          {filteredClients.slice(0, 20).map((client: Client) => {
            const companyName = getCompanyName(client.companyId || client.company_id || '');
            return (
              <div
                key={client.id}
                onClick={() => handleClientSelect(client)}
                className="px-3 py-2 cursor-pointer hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
              >
                <div className="flex flex-col">
                  <div className="font-medium text-sm text-gray-900">
                    {client.name}
                  </div>
                  <div className="text-xs text-gray-600">
                    {client.email}
                  </div>
                  <div className="text-xs text-blue-600 font-medium">
                    <i className="fas fa-building mr-1"></i>
                    {companyName}
                  </div>
                </div>
              </div>
            );
          })}
          
          {filteredClients.length > 20 && (
            <div className="px-3 py-2 text-xs text-gray-500 text-center bg-gray-50">
              Visualizzati primi 20 risultati. Affina la ricerca per vedere di più.
            </div>
          )}
        </div>
      )}
      
      {isOpen && searchTerm && filteredClients.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg client-search-dropdown">
          <div className="px-3 py-2 text-sm text-gray-500 text-center">
            Nessun cliente trovato
          </div>
        </div>
      )}
    </div>
  );
}


export default function LicensesPage() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { contentMargin } = useSidebar();

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [isNewLicenseModalOpen, setIsNewLicenseModalOpen] = useState(false);
  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);
  const [isNewProductModalOpen, setIsNewProductModalOpen] = useState(false);
  const [editingLicense, setEditingLicense] = useState<License | null>(null);
  const [isLicenseModalOpen, setIsLicenseModalOpen] = useState(false);

  // Gestisce il click esterno per chiudere i dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.client-search-container')) {
        // Chiudi tutti i dropdown aperti
        const dropdowns = document.querySelectorAll('.client-search-dropdown');
        dropdowns.forEach(dropdown => {
          (dropdown as HTMLElement).style.display = 'none';
        });
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // New client form state
  const [newClient, setNewClient] = useState({
    name: '',
    email: '',
    companyId: '',
    isMultiSite: false,
    isMultiUser: true,
    contactInfo: {
      phone: '',
      company: ''
    }
  });

  // New product form state
  const [newProduct, setNewProduct] = useState({
    name: '',
    version: '',
    description: '',
    supportedLicenseTypes: ['permanente'] as string[]
  });

  // Helper function for product license type toggle
  const handleLicenseTypeToggle = (type: string) => {
    setNewProduct(prev => ({
      ...prev,
      supportedLicenseTypes: prev.supportedLicenseTypes.includes(type)
        ? prev.supportedLicenseTypes.filter(t => t !== type)
        : [...prev.supportedLicenseTypes, type]
    }));
  };


  // Always call useQuery hooks - they will be disabled when user is not available
  const { data: clients = [] } = useQuery<Client[]>({
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

  const { data: products = [] } = useQuery<Product[]>({
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

  const { data: licenses = [] } = useQuery<License[]>({
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

  // Safe arrays for main component
  const safeLicensesMain = Array.isArray(licenses) ? licenses : [];
  const safeClientsMain = Array.isArray(clients) ? clients : [];
  const safeCompaniesMain = Array.isArray(companies) ? companies : [];
  
  const filteredLicenses = safeLicensesMain.filter((license: License) => {
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
  }).sort((a: License, b: License) => {
    // Priorità di ordinamento: 1. In attesa, 2. Sospese, 3. Attive, 4. Altre
    const statusOrder = {
      'in_attesa_convalida': 1,
      'sospesa': 2, 
      'attiva': 3,
      'demo': 4,
      'trial': 4,
      'scaduta': 5
    };
    
    const aOrder = statusOrder[a.status as keyof typeof statusOrder] || 6;
    const bOrder = statusOrder[b.status as keyof typeof statusOrder] || 6;
    
    // Prima ordina per priorità stato
    if (aOrder !== bOrder) {
      return aOrder - bOrder;
    }
    
    // Poi per data di creazione (più recenti prima)
    return new Date(b.activationDate || '').getTime() - new Date(a.activationDate || '').getTime();
  });

  const handleEditLicense = (license: License) => {
    setEditingLicense(license);
    setIsLicenseModalOpen(true);
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

      <main className={`flex-1 ${contentMargin} bg-surface transition-all duration-300 ease-in-out`}>
        <TopBar />

        <div className="p-3 md:p-4 space-y-4">
          {/* Header Compatto */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-1">Gestione Licenze</h1>
              <p className="text-sm text-gray-600">Visualizza e gestisci tutte le licenze del sistema</p>
            </div>
            <div className="flex gap-2">
              {user.role === 'superadmin' && (
                <>
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      try {
                        const token = localStorage.getItem('qlm_token');
                        const response = await fetch('/api/licenses/fix-expiry-dates', {
                          method: 'POST',
                          headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                          }
                        });
                        const result = await response.json();
                        alert(result.message);
                        queryClient.invalidateQueries({ queryKey: ['/api/licenses'] });
                      } catch (error) {
                        alert('Errore nel fix delle date di scadenza');
                      }
                    }}
                    className="text-xs"
                  >
                    <Calendar className="h-3 w-3 mr-1" />
                    Fix Date Scadenza
                  </Button>
                  
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      try {
                        const token = localStorage.getItem('qlm_token');
                        const response = await fetch('/api/licenses/process-renewals', {
                          method: 'POST',
                          headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                          }
                        });
                        const result = await response.json();
                        alert(result.message);
                        queryClient.invalidateQueries({ queryKey: ['/api/licenses'] });
                      } catch (error) {
                        alert('Errore nel processamento dei rinnovi');
                      }
                    }}
                    className="text-xs"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Processa Rinnovi
                  </Button>
                </>
              )}

              <Button 
                className="bg-primary hover:bg-blue-700"
                onClick={() => setIsNewLicenseModalOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Nuova Licenza
              </Button>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="space-y-4">




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

              {/* Filtri Compatti */}
            <Card className="mb-4">
              <CardContent className="p-3">
                <div className="flex flex-col md:flex-row gap-3">
                  <div className="flex-1">
                    <Input
                      placeholder="Cerca per chiave, cliente, prodotto..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full h-9"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-40 h-9">
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
                      <SelectTrigger className="w-40 h-9">
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
                      size="sm"
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
                          <th className="text-left p-2 font-medium text-xs border-r">Chiave Licenza</th>
                          <th className="text-left p-2 font-medium text-xs border-r">Prodotto</th>
                          <th className="text-left p-2 font-medium text-xs border-r">Cliente</th>
                          <th className="text-left p-2 font-medium text-xs border-r">Tipo</th>
                          <th className="text-left p-2 font-medium text-xs border-r">Stato</th>
                          <th className="text-left p-2 font-medium text-xs border-r">Utenti/Dispositivi</th>
                          <th className="text-left p-2 font-medium text-xs border-r">Prezzo</th>
                          <th className="text-left p-2 font-medium text-xs border-r">Attivazione</th>
                          <th className="text-left p-2 font-medium text-xs border-r">Scadenza</th>
                          <th className="text-left p-2 font-medium text-xs">Azioni</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredLicenses.map((license: License, index: number) => (
                          <tr key={license.id} className={`border-b hover:bg-muted/30 ${index % 2 === 0 ? 'bg-white' : 'bg-muted/10'}`}>
                            <td className="p-2 border-r">
                              <div className="font-mono text-xs">
                                {license.activationKey}
                              </div>
                              {(() => {
                                // Trova l'azienda del cliente
                                const client = safeClientsMain.find((c: Client) => c.id === license.client?.id);
                                const companyId = client?.companyId || client?.company_id;
                                const company = safeCompaniesMain.find((comp: any) => comp.id === companyId);
                                
                                if (company) {
                                  return (
                                    <div className="text-xs text-gray-600 mt-0.5">
                                      <i className="fas fa-building mr-1"></i>
                                      {company.name}
                                    </div>
                                  );
                                }
                                return null;
                              })()}
                              {license.computerKey && (
                                <div className="text-xs text-muted-foreground font-mono mt-0.5">
                                  {license.computerKey}
                                </div>
                              )}
                              {license.notes && license.notes.includes('registrazione software') && (
                                <div className="text-xs text-blue-600 mt-0.5">
                                  <i className="fas fa-desktop mr-1"></i>
                                  Da registrazione SW
                                </div>
                              )}
                            </td>

                            <td className="p-2 border-r">
                              <div className="font-medium text-xs">
                                {license.product?.name || 'N/A'}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                v{license.product?.version || ''}
                              </div>
                            </td>

                            <td className="p-2 border-r">
                              <div className="font-medium text-xs">
                                {license.client?.name || 'N/A'}
                              </div>
                            </td>

                            <td className="p-2 border-r">
                              <Badge variant="outline" className="text-xs px-1 py-0">
                                {license.licenseType === 'permanente' ? 'Permanente' :
                                 license.licenseType === 'abbonamento_mensile' ? 'Mensile' :
                                 license.licenseType === 'abbonamento_annuale' ? 'Annuale' :
                                 license.licenseType === 'trial' ? 'Trial' :
                                 license.licenseType}
                              </Badge>
                            </td>

                            <td className="p-2 border-r">
                              <Badge 
                                variant={
                                  license.status === 'attiva' ? 'default' :
                                  license.status === 'scaduta' ? 'destructive' :
                                  license.status === 'sospesa' ? 'secondary' :
                                  license.status === 'in_attesa_convalida' ? 'outline' :
                                  'outline'
                                }
                                className="text-xs px-1 py-0"
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

                            <td className="p-2 border-r text-xs">
                              <div>{license.maxUsers || '∞'} utenti</div>
                              <div className="text-xs text-muted-foreground">
                                {license.maxDevices || '∞'} dispositivi
                              </div>
                            </td>

                            <td className="p-2 border-r text-xs font-medium">
                              {formatCurrency(parseFloat(license.price || '0'))}
                            </td>

                            <td className="p-2 border-r text-xs">
                              {license.activationDate ? 
                                format(new Date(license.activationDate), 'dd/MM/yyyy', { locale: it }) : 
                                '-'
                              }
                            </td>

                            <td className="p-2 border-r text-xs">
                              {license.expiryDate ? (
                                <div className={`${
                                  isExpired(license.expiryDate) ? 'text-red-600 font-bold' :
                                  isExpiringSoon(license.expiryDate) ? 'text-orange-600 font-medium' :
                                  'text-green-600'
                                }`}>
                                  {format(new Date(license.expiryDate), 'dd/MM/yyyy', { locale: it })}
                                  <div className="text-xs text-muted-foreground">
                                    {(() => {
                                      const expiry = new Date(license.expiryDate);
                                      const today = new Date();
                                      const diffTime = expiry.getTime() - today.getTime();
                                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                      
                                      if (diffDays < 0) return `Scaduta da ${Math.abs(diffDays)} giorni`;
                                      if (diffDays === 0) return 'Scade oggi';
                                      if (diffDays <= 30) return `Scade in ${diffDays} giorni`;
                                      return `${diffDays} giorni rimanenti`;
                                    })()}
                                  </div>
                                </div>
                              ) : (
                                license.licenseType === 'permanente' ? (
                                  <Badge variant="secondary" className="text-xs">
                                    Permanente
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground">Data non impostata</span>
                                )
                              )}
                            </td>

                            <td className="p-2">
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditLicense(license)}
                                  className="h-8 w-8 p-0"
                                  title={user.role === 'superadmin' ? "Visualizza/Modifica licenza" : "Visualizza dettagli licenza"}
                                >
                                  <i className="fas fa-pencil-alt text-xs"></i>
                                </Button>
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
                    clientId: formData.get('clientId'),
                    productId: formData.get('productId'),
                    licenseType: formData.get('licenseType'),
                    maxUsers: parseInt(formData.get('maxUsers') as string) || 1,
                    maxDevices: parseInt(formData.get('maxDevices') as string) || 1,
                    price: parseFloat(formData.get('price') as string) || 0,
                    discount: parseFloat(formData.get('discount') as string) || 0,
                    renewalEnabled: formData.get('renewalEnabled') === 'on',
                    renewalPeriod: formData.get('renewalPeriod') || null,
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

              {/* Prima Riga: Cliente e Prodotto */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <Label htmlFor="clientId" className="text-sm font-medium">Cliente *</Label>
                  <ClientSearchInput 
                    clients={clients} 
                    companies={companies}
                    onClientSelect={(clientId) => {
                      const hiddenInput = document.querySelector('input[name="clientId"]') as HTMLInputElement;
                      if (hiddenInput) hiddenInput.value = clientId;
                    }}
                  />
                  <input type="hidden" name="clientId" required />
                </div>

                <div>
                  <Label htmlFor="productId" className="text-sm font-medium">Prodotto *</Label>
                  <Select name="productId" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona prodotto" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product: Product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name} {product.version && `v${product.version}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Seconda Riga: Tipo Licenza, Prezzo, Max Utenti, Max Dispositivi, Sconto */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div>
                  <Label htmlFor="licenseType" className="text-sm font-medium">Tipo Licenza *</Label>
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

                <div>
                  <Label htmlFor="price" className="text-sm font-medium">Prezzo €</Label>
                  <Input
                    id="new-license-price"
                    name="price"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <Label htmlFor="maxUsers" className="text-sm font-medium">Max Utenti</Label>
                  <Input
                    id="new-license-users"
                    name="maxUsers"
                    type="number"
                    defaultValue="1"
                    min="1"
                  />
                </div>

                <div>
                  <Label htmlFor="maxDevices" className="text-sm font-medium">Max Dispositivi</Label>
                  <Input
                    id="new-license-devices"
                    name="maxDevices"
                    type="number"
                    defaultValue="1"
                    min="1"
                  />
                </div>

                <div>
                  <Label htmlFor="discount" className="text-sm font-medium">Sconto %</Label>
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

              {/* Rinnovo Automatico */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="renewal-enabled"
                    name="renewalEnabled"
                    className="h-4 w-4 text-blue-600 rounded border-gray-300"
                  />
                  <Label htmlFor="renewal-enabled" className="text-sm font-medium">Attiva rinnovo automatico</Label>
                </div>
                <div className="pl-6">
                  <Label htmlFor="renewal-period" className="text-sm font-medium">Periodo di rinnovo</Label>
                  <Select name="renewalPeriod">
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona periodo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Mensile</SelectItem>
                      <SelectItem value="yearly">Annuale</SelectItem>
                    </SelectContent>
                  </Select>
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
                      Genera automaticamente la chiave di attivazione o inseriscila manualmente. 
                      I dispositivi verranno autorizzati separatamente tramite le registrazioni software.
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

                      <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                        <p className="text-sm text-blue-800">
                          <i className="fas fa-info-circle mr-2"></i>
                          <strong>Nota:</strong> Le chiavi computer sono ora gestite a livello di dispositivo. 
                          Usa la sezione "Registrazioni Software" per autorizzare dispositivi specifici.
                        </p>
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

        {/* New Client Modal */}
        <Dialog open={isNewClientModalOpen} onOpenChange={setIsNewClientModalOpen}>
          <DialogContent className="w-[95vw] max-w-[600px] max-h-[95vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <i className="fas fa-user-plus text-green-500"></i>
                Nuovo Cliente
              </DialogTitle>
              <DialogDescription>Inserisci i dati del nuovo cliente.</DialogDescription>
            </DialogHeader>
            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                const token = localStorage.getItem('qlm_token');
                const response = await fetch('/api/clients', {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify(newClient)
                });

                if (response.ok) {
                  const createdClient = await response.json();
                  setIsNewClientModalOpen(false);
                  queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
                  alert(`Cliente "${createdClient.name}" creato con successo!`);
                  // Reset form state
                  setNewClient({
                    name: '',
                    email: '',
                    companyId: '',
                    isMultiSite: false,
                    isMultiUser: true,
                    contactInfo: { phone: '', company: '' }
                  });
                  // Re-open the new license modal
                  setIsNewLicenseModalOpen(true);
                } else {
                  const errorData = await response.json().catch(() => ({}));
                  alert(`Errore nella creazione del cliente: ${errorData.message || 'Errore sconosciuto'}`);
                }
              } catch (error) {
                console.error('Error creating client:', error);
                alert('Errore nella creazione del cliente');
              }
            }}>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="client-name">Nome Cliente *</Label>
                    <Input
                      id="client-name"
                      value={newClient.name}
                      onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="client-email">Email Cliente *</Label>
                    <Input
                      id="client-email"
                      type="email"
                      value={newClient.email}
                      onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="client-company">Azienda Cliente</Label>
                    <Select
                      name="companyId"
                      value={newClient.companyId}
                      onValueChange={(value) => setNewClient({ ...newClient, companyId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona azienda" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Nessuna Azienda</SelectItem>
                        {safeCompaniesMain.map((company: any) => (
                          <SelectItem key={company.id} value={company.id}>
                            {company.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="client-phone">Telefono</Label>
                    <Input
                      id="client-phone"
                      value={newClient.contactInfo.phone}
                      onChange={(e) => setNewClient({ ...newClient, contactInfo: { ...newClient.contactInfo, phone: e.target.value } })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="client-company-contact">Nome Azienda Contatto</Label>
                    <Input
                      id="client-company-contact"
                      value={newClient.contactInfo.company}
                      onChange={(e) => setNewClient({ ...newClient, contactInfo: { ...newClient.contactInfo, company: e.target.value } })}
                    />
                  </div>
                  <div className="flex items-center space-x-2 pt-6">
                    <input
                      id="client-multi-site"
                      type="checkbox"
                      checked={newClient.isMultiSite}
                      onChange={(e) => setNewClient({ ...newClient, isMultiSite: e.target.checked })}
                      className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                    />
                    <label htmlFor="client-multi-site" className="text-sm font-medium text-gray-700">
                      Multi-Site
                    </label>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    id="client-multi-user"
                    type="checkbox"
                    checked={newClient.isMultiUser}
                    onChange={(e) => setNewClient({ ...newClient, isMultiUser: e.target.checked })}
                    className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                  />
                  <label htmlFor="client-multi-user" className="text-sm font-medium text-gray-700">
                    Multi-User
                  </label>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setIsNewClientModalOpen(false)}>
                  Annulla
                </Button>
                <Button type="submit" className="bg-primary hover:bg-green-700">
                  Crea Cliente
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* New Product Modal */}
        <Dialog open={isNewProductModalOpen} onOpenChange={setIsNewProductModalOpen}>
          <DialogContent className="w-[95vw] max-w-[600px] max-h-[95vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <i className="fas fa-box-open text-purple-500"></i>
                Nuovo Prodotto
              </DialogTitle>
              <DialogDescription>Inserisci i dati del nuovo prodotto.</DialogDescription>
            </DialogHeader>
            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                const token = localStorage.getItem('qlm_token');
                const response = await fetch('/api/products', {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify(newProduct)
                });

                if (response.ok) {
                  const createdProduct = await response.json();
                  setIsNewProductModalOpen(false);
                  queryClient.invalidateQueries({ queryKey: ['/api/products'] });
                  alert(`Prodotto "${createdProduct.name}" creato con successo!`);
                  // Reset form state
                  setNewProduct({
                    name: '',
                    version: '',
                    description: '',
                    supportedLicenseTypes: ['permanente']
                  });
                  // Re-open the new license modal
                  setIsNewLicenseModalOpen(true);
                } else {
                  const errorData = await response.json().catch(() => ({}));
                  alert(`Errore nella creazione del prodotto: ${errorData.message || 'Errore sconosciuto'}`);
                }
              } catch (error) {
                console.error('Error creating product:', error);
                alert('Errore nella creazione del prodotto');
              }
            }}>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="product-name">Nome Prodotto *</Label>
                    <Input
                      id="product-name"
                      value={newProduct.name}
                      onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="product-version">Versione</Label>
                    <Input
                      id="product-version"
                      value={newProduct.version}
                      onChange={(e) => setNewProduct({ ...newProduct, version: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="product-description">Descrizione</Label>
                  <Textarea
                    id="product-description"
                    value={newProduct.description}
                    onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tipi di Licenza Supportati *</Label>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant={newProduct.supportedLicenseTypes.includes('permanente') ? 'default' : 'outline'}
                      onClick={() => handleLicenseTypeToggle('permanente')}
                      className="h-8 px-3 text-sm"
                    >
                      Permanente
                    </Button>
                    <Button
                      type="button"
                      variant={newProduct.supportedLicenseTypes.includes('trial') ? 'default' : 'outline'}
                      onClick={() => handleLicenseTypeToggle('trial')}
                      className="h-8 px-3 text-sm"
                    >
                      Trial
                    </Button>
                    <Button
                      type="button"
                      variant={newProduct.supportedLicenseTypes.includes('abbonamento_mensile') ? 'default' : 'outline'}
                      onClick={() => handleLicenseTypeToggle('abbonamento_mensile')}
                      className="h-8 px-3 text-sm"
                    >
                      Mensile
                    </Button>
                    <Button
                      type="button"
                      variant={newProduct.supportedLicenseTypes.includes('abbonamento_annuale') ? 'default' : 'outline'}
                      onClick={() => handleLicenseTypeToggle('abbonamento_annuale')}
                      className="h-8 px-3 text-sm"
                    >
                      Annuale
                    </Button>
                  </div>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setIsNewProductModalOpen(false)}>
                  Annulla
                </Button>
                <Button type="submit" className="bg-primary hover:bg-purple-700">
                  Crea Prodotto
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* License Details Modal */}
        <LicenseModal
          license={editingLicense}
          isOpen={isLicenseModalOpen}
          onClose={() => {
            setIsLicenseModalOpen(false);
            setEditingLicense(null);
          }}
          isEditMode={false}
          canEdit={user.role === 'superadmin'}
        />

      </main>
    </div>
  );
}