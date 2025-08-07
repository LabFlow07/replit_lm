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
  computerKey?: string; // Assuming API returns this
}

interface Client {
  id: string;
  name: string;
  email: string;
  status: string;
}

interface License {
  id: string;
  activationKey: string;
  client: Client;
  product: { name: string };
  status: string;
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
    enabled: true
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
      return response.json();
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

  // Classify registration mutation
  const classifyMutation = useMutation({
    mutationFn: async (data: any) => {
      const requestBody = {
        clienteAssegnato: data.clienteAssegnato === 'none' ? null : data.clienteAssegnato,
        licenzaAssegnata: (data.licenzaAssegnata === 'none' || !data.licenzaAssegnata) ? null : data.licenzaAssegnata,
        prodottoAssegnato: data.prodottoAssegnato === 'none' ? null : data.prodottoAssegnato,
        note: data.note
      };

      const response = await fetch(`/api/software/registrazioni/${selectedRegistration?.id}/classifica`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('qlm_token')}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error('Failed to classify registration');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/software/registrazioni'] });
      setIsClassifyDialogOpen(false);
      setSelectedRegistration(null);
      reset();
    }
  });

  const onClassifySubmit = (data: any) => {
    classifyMutation.mutate(data);
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      'non_assegnato': { variant: 'destructive', label: 'Non Assegnato' },
      'classificato': { variant: 'default', label: 'Classificato' },
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
    if (registrationToClassify) {
      setValue('clienteAssegnato', registrationToClassify.clienteAssegnato || 'none');
      setValue('prodottoAssegnato', registrationToClassify.prodottoAssegnato || 'none');
      setValue('licenzaAssegnata', registrationToClassify.licenzaAssegnata || 'none');
      setValue('note', registrationToClassify.note || '');
    }
    setIsClassifyDialogOpen(true);
  };

  const handleEdit = (registration: SoftwareRegistration) => {
    setSelectedRegistration(registration);
    setValue('clienteAssegnato', registration.clienteAssegnato || 'none');
    setValue('prodottoAssegnato', registration.prodottoAssegnato || 'none');
    setValue('licenzaAssegnata', registration.licenzaAssegnata || 'none');
    setValue('note', registration.note || '');
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
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="heading-registrations">
            Registrazioni Software
          </h1>
          <p className="text-muted-foreground">
            Gestisci le registrazioni automatiche dei software installati presso i clienti
          </p>
        </div>
        <Link href="/">
          <Button variant="outline">
            Torna alla Home
          </Button>
        </Link>
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
              <Settings className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Licenziate</p>
                <p className="text-2xl font-bold text-blue-600" data-testid="text-licensed">
                  {filteredRegistrations.filter((r: SoftwareRegistration) => r.status === 'licenziato').length}
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
                    <th className="text-left p-3 font-medium text-sm border-r min-w-[180px]">Cliente</th>
                    <th className="text-left p-3 font-medium text-sm border-r min-w-[200px]">Software/Prodotto</th>
                    <th className="text-left p-3 font-medium text-sm border-r min-w-[100px]">Versione</th>
                    <th className="text-left p-3 font-medium text-sm border-r min-w-[80px]">Stato</th>
                    <th className="text-left p-3 font-medium text-sm border-r min-w-[130px]">Data Registrazione</th>
                    <th className="text-left p-3 font-medium text-sm border-r min-w-[130px]">Ultimo Accesso</th>
                    <th className="text-left p-3 font-medium text-sm min-w-[150px]">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRegistrations.map((registration: SoftwareRegistration, index: number) => (
                    <tr key={registration.id} className={`border-b hover:bg-muted/30 ${index % 2 === 0 ? 'bg-white' : 'bg-muted/10'}`}>
                      {/* Cliente */}
                      <td className="p-3 border-r">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-blue-500" />
                          <div>
                            <div className="font-medium text-sm text-gray-900">
                              {registration.clientName || registration.ragioneSociale || 'Non assegnato'}
                            </div>
                            {registration.clientName && registration.ragioneSociale && registration.clientName !== registration.ragioneSociale && (
                              <div className="text-xs text-muted-foreground">
                                Azienda: {registration.ragioneSociale}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Software/Prodotto */}
                      <td className="p-3 border-r">
                        <div className="flex items-center gap-2">
                          <Monitor className="h-4 w-4 text-green-500" />
                          <div>
                            <div className="font-medium text-sm text-gray-900">
                              {registration.productName || registration.nomeSoftware || registration.softwareName}
                            </div>
                            {registration.productName && registration.nomeSoftware && registration.productName !== registration.nomeSoftware && (
                              <div className="text-xs text-muted-foreground">
                                Software rilevato: {registration.nomeSoftware}
                              </div>
                            )}
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
                            {registration.productVersion || registration.versione || registration.version}
                          </Badge>
                          {registration.productVersion && registration.versione && registration.productVersion !== registration.versione && (
                            <Badge variant="secondary" className="text-xs font-mono">
                              Rilevata: {registration.versione}
                            </Badge>
                          )}
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
                          {registration.status === 'non_assegnato' && user.role === 'superadmin' && (
                            <Button
                              size="sm"
                              onClick={() => handleClassify(registration.id)}
                              className="bg-green-600 hover:bg-green-700 h-8 px-3 text-xs"
                              title="Classifica registrazione"
                            >
                              <i className="fas fa-check text-xs"></i>
                            </Button>
                          )}

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(registration)}
                            className="h-8 w-8 p-0"
                            title="Modifica registrazione"
                          >
                            <i className="fas fa-edit text-xs"></i>
                          </Button>

                          {user.role === 'superadmin' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(registration.id)}
                              className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                              title="Elimina registrazione"
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Classifica Registrazione Software</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onClassifySubmit)} className="space-y-4">
            <div>
              <Label htmlFor="clienteAssegnato">Cliente</Label>
              <Select onValueChange={(value) => setValue('clienteAssegnato', value)} defaultValue={selectedRegistration?.clienteAssegnato || 'none'}>
                <SelectTrigger data-testid="select-assign-client">
                  <SelectValue placeholder="Seleziona cliente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nessun Cliente</SelectItem>
                  {clients.filter((client: Client) => client.id).map((client: Client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name} - {client.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="prodottoAssegnato">Software/Prodotto</Label>
              <Select onValueChange={(value) => setValue('prodottoAssegnato', value)} defaultValue={selectedRegistration?.prodottoAssegnato || 'none'}>
                <SelectTrigger data-testid="select-assign-product">
                  <SelectValue placeholder="Seleziona software" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nessun Software</SelectItem>
                  {products.filter((product: Product) => product.id).map((product: Product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} v{product.version}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="licenzaAssegnata">Licenza (opzionale)</Label>
              <Select onValueChange={(value) => setValue('licenzaAssegnata', value)} defaultValue={selectedRegistration?.licenzaAssegnata || 'none'}>
                <SelectTrigger data-testid="select-assign-license">
                  <SelectValue placeholder="Seleziona licenza" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nessuna Licenza</SelectItem>
                  {licenses
                    .filter((license: License) => license.id && license.status === 'attiva' && license.client.id === watch('clienteAssegnato'))
                    .map((license: License) => (
                      <SelectItem key={license.id} value={license.id}>
                        {license.activationKey} - {license.product.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="note">Note</Label>
              <Textarea
                {...register('note')}
                placeholder="Aggiungi note sulla classificazione..."
                data-testid="textarea-classification-notes"
                defaultValue={selectedRegistration?.note || ''}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsClassifyDialogOpen(false)}
                data-testid="button-cancel-classify"
              >
                Annulla
              </Button>
              <Button
                type="submit"
                disabled={classifyMutation.isPending}
                data-testid="button-confirm-classify"
              >
                {classifyMutation.isPending ? 'Classificando...' : 'Classifica'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}