import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { apiRequest } from "@/lib/queryClient";
import { Search, Monitor, User, MapPin, Calendar, Activity, Settings } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import Sidebar from '@/components/layout/sidebar';

// Mock user for role checking, replace with actual auth context in a real app
const user = {
  role: 'superadmin' // or 'admin', 'user', etc.
};

interface SoftwareRegistration {
  id: string;
  nomeSoftware: string;
  versione: string;
  ragioneSociale: string;
  partitaIva?: string;
  totaleOrdini: number;
  totaleVenduto: number;
  sistemaOperativo?: string;
  indirizzoIp?: string;
  computerKey?: string;
  installationPath?: string;
  status: 'non_assegnato' | 'classificato' | 'licenziato';
  clienteAssegnato?: string;
  licenzaAssegnata?: string;
  prodottoAssegnato?: string; // Added to match the dialog
  note?: string;
  primaRegistrazione: string;
  ultimaAttivita: string;
  createdAt: string;
  updatedAt: string;
  // These fields are likely mapped or renamed from API response
  softwareName?: string; // Assuming API returns this
  version?: string; // Assuming API returns this
  clientName?: string; // Assuming API returns this
  clientId?: string; // Assuming API returns this
  registrationDate?: string; // Assuming API returns this
  lastSeen?: string; // Assuming API returns this
  computerKey?: string;
}

interface Client {
  id: string;
  name: string;
  email: string;
  status: string;
  company_id?: string;
  company_id?: string;
}

interface License {
  id: string;
  activationKey: string;
  client?: { id: string; name?: string; email?: string; }; // Updated to match typical API responses
  company?: { id: string; name?: string; }; // Added company field for display
  product: { name: string, version?: string, id: string }; // Added product id and version for completeness
  status: string;
  licenseType?: string; // Added for potential display
  maxDevices?: number; // Added for display
  expiryDate?: string; // Added for display
  clientName?: string; // Added fallback if client object is not present
  companyName?: string; // Added fallback if company object is not present
}

interface Product {
  id: string;
  name: string;
  version: string;
  description?: string;
}

export default function SoftwareRegistrations() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedRegistration, setSelectedRegistration] = useState<SoftwareRegistration | null>(null);
  const [isClassifyDialogOpen, setIsClassifyDialogOpen] = useState(false);

  const { register, handleSubmit, reset, setValue, watch } = useForm();

  // Fetch software registrations
  const { data: registrations = [], isLoading } = useQuery({
    queryKey: ['/api/software/registrazioni', { status: statusFilter, nomeSoftware: searchTerm }],
    queryFn: async () => {
      const params = new URLSearchParams({
        ...(statusFilter && statusFilter !== 'all' && { status: statusFilter }),
        ...(searchTerm && { nomeSoftware: searchTerm })
      });
      const token = localStorage.getItem('qlm_token');
      const response = await fetch(`/api/software/registrazioni?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch registrations');
      }
      // Assuming the API returns fields that match the SoftwareRegistration interface,
      // potentially needing mapping if API field names differ.
      // For example, if API returns 'softwareName' instead of 'nomeSoftware'.
      const data = await response.json();
      // Simple mapping example, adjust based on actual API response
      return data.map((reg: any) => ({
        ...reg,
        nomeSoftware: reg.nomeSoftware || reg.softwareName, // Use nomeSoftware or fallback to softwareName
        versione: reg.versione || reg.version,
        ragioneSociale: reg.ragioneSociale || reg.clientName,
        computerKey: reg.computerKey,
        primaRegistrazione: reg.primaRegistrazione || reg.registrationDate,
        ultimaAttivita: reg.ultimaAttivita || reg.lastSeen,
        clienteAssegnato: reg.clienteAssegnato,
        prodottoAssegnato: reg.prodottoAssegnato,
        licenzaAssegnata: reg.licenzaAssegnata,
        note: reg.note,
        clientId: reg.clienteAssegnato // Assuming clientId is the same as clienteAssegnato for display
      }));
    }
  });

  // Fetch clients for classification
  const { data: clients = [] } = useQuery({
    queryKey: ['/api/clients'],
    queryFn: async () => {
      const token = localStorage.getItem('qlm_token');
      const response = await fetch('/api/clients', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch clients');
      }
      return response.json();
    },
    enabled: isClassifyDialogOpen
  });

  // Fetch licenses for classification
  const { data: licenses = [] } = useQuery({
    queryKey: ['/api/licenses'],
    queryFn: async () => {
      const token = localStorage.getItem('qlm_token');
      const response = await fetch('/api/licenses', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch licenses');
      }
      // Ensure each license has a product object with id and name
      const data = await response.json();
      return data.map((license: any) => ({
        ...license,
        // Map company and client fields for easier access
        client: license.client || (license.clientId ? { id: license.clientId, name: license.clientName } : undefined),
        company: license.company || (license.companyId ? { id: license.companyId, name: license.companyName } : undefined),
        product: license.product || { id: license.productId, name: license.productName, version: license.productVersion }
      }));
    },
    enabled: true
  });

  // Fetch products for classification
  const { data: products = [] } = useQuery({
    queryKey: ['/api/products'],
    queryFn: async () => {
      const token = localStorage.getItem('qlm_token');
      const response = await fetch('/api/products', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }
      return response.json();
    },
    enabled: true
  });

  // Fetch companies for classification
  const { data: companies = [] } = useQuery({
    queryKey: ['/api/companies'],
    queryFn: async () => {
      const token = localStorage.getItem('qlm_token');
      const response = await fetch('/api/companies', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch companies');
      }
      return response.json();
    },
    enabled: true
  });

  // Classify registration mutation
  const classifyMutation = useMutation({
    mutationFn: async (data: any) => {
      // Auto-determina la licenza se cliente e prodotto sono selezionati
      let finalLicenseId = data.licenzaAssegnata;

      if (data.clienteAssegnato && data.clienteAssegnato !== 'none' &&
          data.prodottoAssegnato && data.prodottoAssegnato !== 'none') {

        // Filtra le licenze del cliente (incluse quelle non attive per consentire l'attivazione)
        const clientLicenses = licenses.filter((license: License) =>
          license.client?.id === data.clienteAssegnato &&
          (license.product?.id === data.prodottoAssegnato ||
           license.product?.name === data.prodottoAssegnato) &&
          (license.status === 'attiva' || license.status === 'in_attesa_convalida' || license.status === 'sospesa')
        );

        // Se c'è una sola licenza, la usa automaticamente
        if (clientLicenses.length === 1) {
          finalLicenseId = clientLicenses[0].id;
        } else if (clientLicenses.length > 1 && !finalLicenseId) {
          // Se ci sono multiple licenze ma nessuna è stata selezionata, usa la prima
          finalLicenseId = clientLicenses[0].id;
        }
      }

      const requestBody = {
        aziendaAssegnata: data.aziendaAssegnata === 'none' ? null : data.aziendaAssegnata,
        clienteAssegnato: data.clienteAssegnato === 'none' ? null : data.clienteAssegnato,
        licenzaAssegnata: (finalLicenseId === 'none' || !finalLicenseId) ? null : finalLicenseId,
        prodottoAssegnato: data.prodottoAssegnato === 'none' ? null : data.prodottoAssegnato,
        note: data.note,
        authorizeDevice: data.authorizeDevice || false
      };

      console.log('Classifying registration with data:', requestBody);

      const response = await fetch(`/api/software/registrazioni/${selectedRegistration?.id}/classifica`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('qlm_token')}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to classify registration');
      }

      return response.json();
    },
    onSuccess: (data) => {
      console.log('Classification successful:', data);
      queryClient.invalidateQueries({ queryKey: ['/api/software/registrazioni'] });
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      queryClient.invalidateQueries({ queryKey: ['/api/licenses'] });
      setIsClassifyDialogOpen(false);
      setSelectedRegistration(null);
      reset();
    },
    onError: (error) => {
      console.error('Classification error:', error);
      alert(`Errore nella classificazione: ${error.message}`);
    }
  });

  const onClassifySubmit = (data: any) => {
    classifyMutation.mutate(data);
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      'non_assegnato': { variant: 'destructive', label: 'Non Assegnato' },
      'classificato': { variant: 'default', label: 'Classificato' },
      'in_attesa_computer_key': { variant: 'outline', label: 'In Attesa Computer Key' },
      'licenziato': { variant: 'secondary', label: 'Licenziato' }
    };

    const statusInfo = statusMap[status as keyof typeof statusMap] || { variant: 'outline', label: status };

    return (
      <Badge variant={statusInfo.variant as any} data-testid={`badge-status-${status}`}>
        {statusInfo.label}
      </Badge>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const filteredRegistrations = Array.isArray(registrations) ? registrations.filter((registration: SoftwareRegistration) => {
    const matchesSearch = !searchTerm ||
      (registration.nomeSoftware && registration.nomeSoftware.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (registration.ragioneSociale && registration.ragioneSociale.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = !statusFilter || statusFilter === 'all' || registration.status === statusFilter;

    return matchesSearch && matchesStatus;
  }) : [];

  const handleClassify = (id: string) => {
    const registrationToClassify = registrations.find((r: SoftwareRegistration) => r.id === id);
    setSelectedRegistration(registrationToClassify || null);

    // Reset form first
    reset();

    if (registrationToClassify) {
      // Find the client to get the company if already assigned
      const client = clients.find(c => c.id === registrationToClassify.clienteAssegnato);
      const companyId = client?.company_id || client?.companyId || 'none';

      setTimeout(() => {
        setValue('aziendaAssegnata', companyId);
        setValue('clienteAssegnato', registrationToClassify.clienteAssegnato || 'none');
        setValue('prodottoAssegnato', registrationToClassify.prodottoAssegnato || 'none');
        setValue('licenzaAssegnata', registrationToClassify.licenzaAssegnata || 'none');
        setValue('note', registrationToClassify.note || '');
      }, 100);
    }
    setIsClassifyDialogOpen(true);
  };

  const handleEdit = (registration: SoftwareRegistration) => {
    setSelectedRegistration(registration);

    // Find the client to get the company
    const client = clients.find(c => c.id === registration.clienteAssegnato);
    const companyId = client?.company_id || client?.companyId || 'none';

    console.log('Edit registration:', registration);
    console.log('Found client:', client);
    console.log('Company ID:', companyId);
    console.log('Computer Key:', registration.computerKey);

    // Reset form first
    reset();

    // Use setTimeout to ensure the form is reset before setting new values
    setTimeout(() => {
      setValue('aziendaAssegnata', companyId);
      setValue('clienteAssegnato', registration.clienteAssegnato || 'none');
      setValue('prodottoAssegnato', registration.prodottoAssegnato || 'none');
      setValue('licenzaAssegnata', registration.licenzaAssegnata || 'none');
      setValue('note', registration.note || '');
      // Set authorization checkbox based on computer key presence
      setValue('authorizeDevice', !!registration.computerKey);
    }, 100);

    setIsClassifyDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Sei sicuro di voler eliminare questa registrazione?')) {
      try {
        const token = localStorage.getItem('qlm_token');
        const response = await fetch(`/api/software/registrazioni/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          queryClient.invalidateQueries({ queryKey: ['/api/software/registrazioni'] });
          alert('Registrazione eliminata con successo!');
        } else {
          alert('Errore nell\'eliminazione della registrazione');
        }
      } catch (error) {
        console.error('Error deleting registration:', error);
        alert('Errore nell\'eliminazione della registrazione');
      }
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 ml-64 overflow-auto">
        <div className="container mx-auto p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight" data-testid="heading-registrations">
                QLMRegister
              </h1>
              <p className="text-muted-foreground">
                Gestisci le registrazioni automatiche dei software installati presso i clienti
              </p>
            </div>
          </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Filtri di Ricerca
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="search">Ricerca Software/Azienda</Label>
              <Input
                id="search"
                placeholder="Cerca per nome software o ragione sociale..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="input-search"
              />
            </div>
            <div className="md:w-48">
              <Label htmlFor="status-filter">Stato</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger data-testid="select-status-filter">
                  <SelectValue placeholder="Tutti gli stati" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti gli stati</SelectItem>
                  <SelectItem value="non_assegnato">Non Assegnato</SelectItem>
                  <SelectItem value="in_attesa_computer_key">In Attesa Computer Key</SelectItem>
                  <SelectItem value="classificato">Classificato</SelectItem>
                  <SelectItem value="licenziato">Licenziato</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Monitor className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Totale Registrazioni</p>
                <p className="text-2xl font-bold" data-testid="text-total-registrations">
                  {filteredRegistrations.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">Non Assegnate</p>
                <p className="text-2xl font-bold text-orange-600" data-testid="text-unassigned">
                  {filteredRegistrations.filter((r: SoftwareRegistration) => r.status === 'non_assegnato').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Classificate</p>
                <p className="text-2xl font-bold text-green-600" data-testid="text-classified">
                  {filteredRegistrations.filter((r: SoftwareRegistration) => r.status === 'classificato').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground">In Attesa Computer Key</p>
                <p className="text-2xl font-bold text-yellow-600" data-testid="text-waiting-key">
                  {filteredRegistrations.filter((r: SoftwareRegistration) => r.status === 'in_attesa_computer_key').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Excel-style Table */}
      {filteredRegistrations.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Monitor className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nessuna registrazione trovata</h3>
            <p className="text-muted-foreground">
              Non ci sono registrazioni software che corrispondono ai criteri di ricerca.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse excel-table">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium text-sm border-r min-w-[180px]">Azienda/Cliente</th>
                    <th className="text-left p-3 font-medium text-sm border-r min-w-[200px]">Software/Prodotto</th>
                    <th className="text-left p-3 font-medium text-sm border-r min-w-[100px]">Versione</th>
                    <th className="text-left p-3 font-medium text-sm border-r min-w-[100px]">Ordini</th>
                    <th className="text-left p-3 font-medium text-sm border-r min-w-[100px]">Venduto</th>
                    <th className="text-left p-3 font-medium text-sm border-r min-w-[80px]">Stato</th>
                    <th className="text-left p-3 font-medium text-sm border-r min-w-[130px]">Data Registrazione</th>
                    <th className="text-left p-3 font-medium text-sm border-r min-w-[130px]">Ultimo Accesso</th>
                    <th className="text-left p-3 font-medium text-sm min-w-[150px]">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRegistrations.map((registration: SoftwareRegistration, index: number) => (
                    <tr key={registration.id} className={`border-b hover:bg-muted/30 ${index % 2 === 0 ? 'bg-white' : 'bg-muted/10'}`}>
                      {/* Azienda/Cliente */}
                      <td className="p-3 border-r">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-blue-500" />
                          <div>
                            <div className="font-medium text-sm text-gray-900">
                              {registration.ragioneSociale || 'Non specificato'}
                            </div>
                            {registration.licenzaAssegnata && (() => {
                              const assignedLicense = licenses.find(l => l.id === registration.licenzaAssegnata);
                              if (assignedLicense) {
                                const clientCompany = companies.find(c => c.id === assignedLicense.client?.company_id || c.id === assignedLicense.client?.companyId);
                                return (
                                  <div className="text-xs text-muted-foreground space-y-1">
                                    <div>Cliente: {assignedLicense.client?.name || 'Non specificato'}</div>
                                    <div>Azienda: {clientCompany?.name || 'Non specificata'}</div>
                                  </div>
                                );
                              }
                              return <div className="text-xs text-muted-foreground">Cliente: Non assegnato</div>;
                            })() || <div className="text-xs text-muted-foreground">Cliente: Non assegnato</div>}
                          </div>
                        </div>
                      </td>

                      {/* Software/Prodotto */}
                      <td className="p-3 border-r">
                        <div className="flex items-center gap-2">
                          <Monitor className="h-4 w-4 text-green-500" />
                          <div>
                            <div className="font-medium text-sm text-gray-900">
                              {registration.nomeSoftware || registration.softwareName || 'Non specificato'}
                            </div>
                            {registration.licenzaAssegnata && (() => {
                              const assignedLicense = licenses.find(l => l.id === registration.licenzaAssegnata);
                              if (assignedLicense && assignedLicense.product) {
                                return (
                                  <div className="text-xs text-muted-foreground">
                                    Prodotto: {assignedLicense.product.name || 'Non specificato'}
                                  </div>
                                );
                              }
                              return <div className="text-xs text-muted-foreground">Prodotto: Non assegnato</div>;
                            })() || <div className="text-xs text-muted-foreground">Prodotto: Non assegnato</div>}
                            {registration.note && (
                              <div className="text-xs text-muted-foreground truncate max-w-[150px]" title={registration.note}>
                                Note: {registration.note}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Versione */}
                      <td className="p-3 border-r">
                        <div className="flex flex-col gap-1">
                          <Badge variant="outline" className="text-xs font-mono">
                            {registration.productVersion || registration.versione || registration.version || 'N/A'}
                          </Badge>
                          {registration.productVersion && registration.versione && registration.productVersion !== registration.versione && (
                            <Badge variant="secondary" className="text-xs font-mono">
                              Rilevata: {registration.versione}
                            </Badge>
                          )}
                          {registration.computerKey && (
                            <div className="mt-1 p-1 bg-green-50 border border-green-200 rounded text-xs">
                              <div className="font-mono text-green-800 text-xs" title={registration.computerKey}>
                                {registration.computerKey.substring(0, 10)}...
                              </div>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Totale Ordini */}
                      <td className="p-3 border-r text-center">
                        <div className="font-medium text-sm">
                          {registration.totaleOrdini || 0}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          ordini
                        </div>
                      </td>

                      {/* Totale Venduto */}
                      <td className="p-3 border-r text-right">
                        <div className="font-medium text-sm text-green-600">
                          {formatCurrency(registration.totaleVenduto || 0)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          venduto
                        </div>
                      </td>

                      {/* Stato */}
                      <td className="p-3 border-r">
                        {getStatusBadge(registration.status)}
                      </td>

                      {/* Data Registrazione */}
                      <td className="p-3 border-r text-sm">
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {format(new Date(registration.primaRegistrazione || registration.registrationDate), 'dd/MM/yyyy', { locale: it })} {/* Display registration date */}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(registration.primaRegistrazione || registration.registrationDate), 'HH:mm', { locale: it })}
                          </span>
                        </div>
                      </td>

                      {/* Ultimo Accesso */}
                      <td className="p-3 border-r text-sm">
                        {registration.ultimaAttivita || registration.lastSeen ? (
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {format(new Date(registration.ultimaAttivita || registration.lastSeen), 'dd/MM/yyyy', { locale: it })} {/* Display last activity date */}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(registration.ultimaAttivita || registration.lastSeen), 'HH:mm', { locale: it })}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic">Mai</span>
                        )}
                      </td>

                      {/* Azioni */}
                      <td className="p-3">
                        <div className="flex gap-1">
                          <Button
                            variant={registration.status === 'non_assegnato' || registration.status === 'in_attesa_computer_key' ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleEdit(registration)}
                            className={`h-8 w-8 p-0 ${registration.status === 'non_assegnato' ? 'bg-green-600 hover:bg-green-700' : registration.status === 'in_attesa_computer_key' ? 'bg-yellow-600 hover:bg-yellow-700' : ''}`}
                            title={
                              registration.status === 'non_assegnato' ? "Classifica registrazione" : 
                              registration.status === 'in_attesa_computer_key' ? "Assegna Computer Key" :
                              "Visualizza registrazione"
                            }
                          >
                            <i className={`fas ${
                              registration.status === 'non_assegnato' ? 'fa-check' : 
                              registration.status === 'in_attesa_computer_key' ? 'fa-key' :
                              'fa-eye'
                            } text-xs`}></i>
                          </Button>

                          {user.role === 'superadmin' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                if (confirm('Sei sicuro di voler eliminare questa registrazione? Questa azione non può essere annullata.')) {
                                  try {
                                    const token = localStorage.getItem('qlm_token');
                                    const response = await fetch(`/api/software/registrazioni/${registration.id}`, {
                                      method: 'DELETE',
                                      headers: {
                                        'Authorization': `Bearer ${token}`,
                                        'Content-Type': 'application/json'
                                      }
                                    });

                                    if (response.ok) {
                                      queryClient.invalidateQueries({ queryKey: ['/api/software/registrazioni'] });
                                      alert('Registrazione eliminata con successo!');
                                    } else {
                                      const errorData = await response.json().catch(() => ({}));
                                      alert(`Errore nell'eliminazione: ${errorData.message || 'Errore sconosciuto'}`);
                                    }
                                  } catch (error) {
                                    console.error('Error deleting registration:', error);
                                    alert('Errore nell\'eliminazione della registrazione');
                                  }
                                }
                              }}
                              disabled={registration.status === 'classificato' && registration.licenzaAssegnata}
                              className={`h-8 w-8 p-0 ${
                                registration.status === 'classificato' && registration.licenzaAssegnata
                                  ? 'text-gray-400 cursor-not-allowed'
                                  : 'text-red-600'
                              }`}
                              title={
                                registration.status === 'classificato' && registration.licenzaAssegnata
                                  ? "Prima rimuovi l'assegnazione della licenza"
                                  : "Elimina registrazione"
                              }
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

      {/* Classify Registration Dialog */}
      <Dialog open={isClassifyDialogOpen} onOpenChange={setIsClassifyDialogOpen}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              {selectedRegistration?.status === 'classificato' ? 'Gestione Computer Key' : 
               selectedRegistration?.status === 'in_attesa_computer_key' ? 'Genera Computer Key' :
               'Classifica Registrazione Software'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onClassifySubmit)} className="space-y-4">
            {/* Modal semplificata per generazione Computer Key */}
            {(selectedRegistration?.status === 'in_attesa_computer_key' || 
              (selectedRegistration?.status === 'classificato' && !selectedRegistration?.computerKey)) && (
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 mb-3">
                    <i className="fas fa-info-circle text-blue-600"></i>
                    <span className="font-medium text-blue-800">Registrazione Classificata</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-700">
                    <div>
                      <strong>Azienda:</strong> {selectedRegistration.ragioneSociale}
                    </div>
                    <div>
                      <strong>Software:</strong> {selectedRegistration.nomeSoftware}
                    </div>
                    <div>
                      <strong>Versione:</strong> {selectedRegistration.versione}
                    </div>
                    <div>
                      <strong>Stato:</strong> Licenza assegnata
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="flex items-center gap-2 mb-2">
                    <i className="fas fa-key text-yellow-600"></i>
                    <span className="font-medium text-yellow-800">Autorizzazione Dispositivo Richiesta</span>
                  </div>
                  <p className="text-sm text-yellow-700">
                    Questa registrazione ha una licenza assegnata ma il dispositivo non è ancora autorizzato. 
                    Genera una Computer Key per autorizzare questo specifico dispositivo.
                  </p>
                </div>
              </div>
            )}

            {/* Mostra i dropdown solo se la registrazione non è già classificata */}
            {selectedRegistration?.status === 'non_assegnato' && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="aziendaAssegnata">Azienda</Label>
                    <Select value={watch('aziendaAssegnata') || 'none'} onValueChange={(value) => {
                      setValue('aziendaAssegnata', value);
                      // Reset dependent fields when company changes only if it's a new selection
                      if (value !== watch('aziendaAssegnata')) {
                        setValue('clienteAssegnato', 'none');
                        setValue('licenzaAssegnata', 'none');
                        setValue('prodottoAssegnato', 'none');
                      }
                    }}>
                      <SelectTrigger data-testid="select-assign-company">
                        <SelectValue placeholder="Seleziona azienda" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nessuna Azienda</SelectItem>
                        {companies.map((company: any) => (
                          <SelectItem key={company.id} value={company.id}>
                            {company.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="clienteAssegnato">Cliente</Label>
                    {(() => {
                      const selectedCompanyId = watch('aziendaAssegnata');

                      if (!selectedCompanyId || selectedCompanyId === 'none') {
                        return (
                          <div className="p-3 bg-gray-50 rounded-md border text-center">
                            <p className="text-sm text-gray-500">Seleziona prima un'azienda</p>
                          </div>
                        );
                      }

                      // Filtra i clienti per l'azienda selezionata
                      const companyClients = clients.filter((client: Client) => 
                        client.company_id === selectedCompanyId
                      );

                      if (companyClients.length === 0) {
                        return (
                          <div className="p-3 bg-yellow-50 rounded-md border border-yellow-200">
                            <p className="text-sm text-yellow-700">
                              <i className="fas fa-exclamation-triangle mr-2"></i>
                              Nessun cliente trovato per questa azienda
                            </p>
                          </div>
                        );
                      }

                      return (
                        <Select value={watch('clienteAssegnato') || 'none'} onValueChange={(value) => {
                          setValue('clienteAssegnato', value);
                          // Reset dependent fields when client changes only if it's a new selection
                          if (value !== watch('clienteAssegnato')) {
                            setValue('licenzaAssegnata', 'none');
                            setValue('prodottoAssegnato', 'none');
                          }
                        }}>
                          <SelectTrigger data-testid="select-assign-client">
                            <SelectValue placeholder="Seleziona cliente" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Nessun Cliente</SelectItem>
                            {companyClients.map((client: Client) => (
                              <SelectItem key={client.id} value={client.id}>
                                {client.name} - {client.email}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      );
                    })()}
                  </div>
                </div>

                <div>
                  <Label htmlFor="licenzaAssegnata">Licenza</Label>
                  {(() => {
                    const selectedClientId = watch('clienteAssegnato');

                    if (!selectedClientId || selectedClientId === 'none') {
                      return (
                        <div className="p-3 bg-gray-50 rounded-md border text-center">
                          <p className="text-sm text-gray-500">Seleziona prima un cliente</p>
                        </div>
                      );
                    }

                    // Trova le licenze del cliente selezionato (includi tutte le licenze valide, non solo quelle attive)
                    const clientLicenses = licenses.filter((license: License) => {
                      return license.client?.id === selectedClientId && 
                             (license.status === 'attiva' || 
                              license.status === 'in_attesa_convalida' || 
                              license.status === 'sospesa');
                    });

                    if (clientLicenses.length === 0) {
                      return (
                        <div className="p-3 bg-yellow-50 rounded-md border border-yellow-200">
                          <p className="text-sm text-yellow-700">
                            <i className="fas fa-exclamation-triangle mr-2"></i>
                            Questo cliente non ha licenze disponibili per l'assegnazione
                          </p>
                        </div>
                      );
                    }

                    return (
                      <Select value={watch('licenzaAssegnata') || 'none'} onValueChange={(value) => {
                        setValue('licenzaAssegnata', value);
                        // Reset product field when license changes only if it's a new selection
                        if (value !== watch('licenzaAssegnata')) {
                          setValue('prodottoAssegnato', 'none');
                        }
                      }}>
                        <SelectTrigger data-testid="select-assign-license">
                          <SelectValue placeholder="Seleziona licenza" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nessuna Licenza</SelectItem>
                          {clientLicenses.map((license: License) => (
                            <SelectItem key={license.id} value={license.id}>
                              <div className="flex flex-col">
                                <span className="font-medium">{license.activationKey}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-500">{license.licenseType} - {license.product?.name}</span>
                                  {license.status !== 'attiva' && (
                                    <span className="text-xs bg-yellow-100 text-yellow-800 px-1 rounded">
                                      {license.status === 'in_attesa_convalida' ? 'In Attesa' : 
                                       license.status === 'sospesa' ? 'Sospesa' : license.status}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    );
                  })()}
                </div>

                <div>
                  <Label htmlFor="prodottoAssegnato">Software/Prodotto</Label>
                  {(() => {
                    const selectedLicenseId = watch('licenzaAssegnata');

                    if (!selectedLicenseId || selectedLicenseId === 'none') {
                      return (
                        <div className="p-3 bg-gray-50 rounded-md border text-center">
                          <p className="text-sm text-gray-500">Seleziona prima una licenza</p>
                        </div>
                      );
                    }

                    // Trova il prodotto della licenza selezionata
                    const selectedLicense = licenses.find((license: License) => license.id === selectedLicenseId);

                    if (!selectedLicense || !selectedLicense.product) {
                      return (
                        <div className="p-3 bg-yellow-50 rounded-md border border-yellow-200">
                          <p className="text-sm text-yellow-700">
                            <i className="fas fa-exclamation-triangle mr-2"></i>
                            Prodotto non trovato per questa licenza
                          </p>
                        </div>
                      );
                    }

                    // Auto-seleziona il prodotto della licenza
                    if (watch('prodottoAssegnato') !== selectedLicense.product.id) {
                      setValue('prodottoAssegnato', selectedLicense.product.id);
                    }

                    return (
                      <div className="p-3 bg-green-50 rounded-md border border-green-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-green-800">
                              <i className="fas fa-link mr-2"></i>
                              Prodotto collegato automaticamente
                            </p>
                            <p className="text-xs text-green-600 mt-1">
                              {selectedLicense.product.name} v{selectedLicense.product.version}
                            </p>
                          </div>
                          <i className="fas fa-check-circle text-green-500"></i>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </>
            )}

            {/* Mostra dettagli licenza se già classificata */}
            {selectedRegistration?.status === 'classificato' && selectedRegistration?.licenzaAssegnata && (() => {
              const selectedLicense = licenses.find((l: License) => l.id === selectedRegistration.licenzaAssegnata);
              if (!selectedLicense) return null;

              return (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 mb-3">
                    <i className="fas fa-info-circle text-blue-600"></i>
                    <span className="font-medium text-blue-800">Dettagli Licenza Selezionata</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-700">
                    <div>
                      <strong>Cliente:</strong> {selectedLicense.client?.name || selectedLicense.clientName || 'Non specificato'}
                    </div>
                    <div>
                      <strong>Azienda:</strong> {selectedLicense.company?.name || selectedLicense.companyName || 'Non specificata'}
                    </div>
                    <div>
                      <strong>Tipo:</strong> {selectedLicense.licenseType}
                    </div>
                    <div>
                      <strong>Stato:</strong> {selectedLicense.status}
                    </div>
                    <div>
                      <strong>Max Dispositivi:</strong> {selectedLicense.maxDevices}
                    </div>
                    <div>
                      <strong>Prodotto:</strong> {selectedLicense.product?.name} {selectedLicense.product?.version}
                    </div>
                    {selectedLicense.expiryDate && (
                      <div>
                        <strong>Scadenza:</strong> {new Date(selectedLicense.expiryDate).toLocaleDateString('it-IT')}
                      </div>
                    )}
                    <div>
                      <strong>Chiave:</strong> 
                      <span className="font-mono text-xs bg-white px-2 py-1 rounded border ml-2">
                        {selectedLicense.activationKey}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}

            <div>
              <Label htmlFor="note">Note</Label>
              <Textarea
                {...register('note')}
                placeholder="Aggiungi note sulla classificazione..."
                data-testid="textarea-classification-notes"
                className="min-h-[80px]"
                defaultValue={selectedRegistration?.note || ''}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="authorizeDevice"
                  {...register('authorizeDevice')}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
                  data-testid="checkbox-authorize-device"
                />
                <div className="flex-1">
                  <Label htmlFor="authorizeDevice" className="font-medium">
                    Autorizza Dispositivo (Computer Key)
                  </Label>
                  <p className="text-xs text-gray-500 mt-1">
                    Genera una chiave computer per autorizzare questo dispositivo specifico.
                  </p>
                </div>
              </div>

              {selectedRegistration?.computerKey && (
                <div className="ml-7 p-3 bg-green-50 border border-green-200 rounded-md">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-green-800">
                        <i className="fas fa-key mr-2"></i>
                        Computer Key Assegnata
                      </p>
                      <p className="text-xs font-mono text-green-600 mt-2 bg-white px-2 py-1 rounded border break-all">
                        {selectedRegistration.computerKey}
                      </p>
                      <p className="text-xs text-green-600 mt-2">
                        Dispositivo già autorizzato. La licenza funzionerà solo su questo dispositivo.
                      </p>
                    </div>
                    <i className="fas fa-check-circle text-green-500 flex-shrink-0 mt-1"></i>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col-reverse md:flex-row justify-between items-start md:items-center gap-3 pt-4 border-t">
              <div>
                {selectedRegistration?.status === 'classificato' && selectedRegistration?.licenzaAssegnata && (
                  <Button 
                    type="button" 
                    variant="destructive" 
                    size="sm"
                    onClick={() => {
                      if (confirm('Sei sicuro di voler rimuovere l\'assegnazione della licenza? Questa operazione resetterà la registrazione a "Non Assegnato".')) {
                        const removeAssignmentData = {
                          aziendaAssegnata: null,
                          clienteAssegnato: null,
                          licenzaAssegnata: null,
                          prodottoAssegnato: null,
                          note: selectedRegistration.note,
                          authorizeDevice: false
                        };
                        classifyMutation.mutate(removeAssignmentData);
                      }
                    }}
                    disabled={classifyMutation.isPending}
                  >
                    <i className="fas fa-unlink mr-2"></i>
                    Rimuovi Assegnazione
                  </Button>
                )}
              </div>
              <div className="flex space-x-2 w-full md:w-auto">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsClassifyDialogOpen(false)}
                  className="flex-1 md:flex-none"
                >
                  Annulla
                </Button>
                <Button 
                  type="submit" 
                  disabled={classifyMutation.isPending}
                  className="flex-1 md:flex-none"
                >
                  {classifyMutation.isPending ? 'Salvando...' : 'Salva'}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>
        </div>
      </div>
    </div>
  );
};