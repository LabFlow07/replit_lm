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
  note?: string;
  primaRegistrazione: string;
  ultimaAttivita: string;
  createdAt: string;
  updatedAt: string;
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

export default function SoftwareRegistrations() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selectedRegistration, setSelectedRegistration] = useState<SoftwareRegistration | null>(null);
  const [isClassifyDialogOpen, setIsClassifyDialogOpen] = useState(false);

  const { register, handleSubmit, reset, setValue, watch } = useForm();

  // Fetch software registrations
  const { data: registrations = [], isLoading } = useQuery({
    queryKey: ['/api/software/registrazioni', { status: statusFilter, nomeSoftware: searchTerm }],
    queryFn: async () => {
      const params = new URLSearchParams({
        ...(statusFilter && { status: statusFilter }),
        ...(searchTerm && { nomeSoftware: searchTerm })
      });
      const response = await fetch(`/api/software/registrazioni?${params}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch registrations');
      }
      return response.json();
    }
  });

  // Fetch clients for classification
  const { data: clients = [] } = useQuery({
    queryKey: ['/api/clients'],
    queryFn: async () => {
      const response = await fetch('/api/clients', {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch clients');
      }
      return response.json();
    }
  });

  // Fetch licenses for classification
  const { data: licenses = [] } = useQuery({
    queryKey: ['/api/licenses'],
    queryFn: async () => {
      const response = await fetch('/api/licenses', {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch licenses');
      }
      return response.json();
    }
  });

  // Classify registration mutation
  const classifyMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('PATCH', `/api/software/registrazioni/${selectedRegistration?.id}/classifica`, data);
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
      registration.nomeSoftware.toLowerCase().includes(searchTerm.toLowerCase()) ||
      registration.ragioneSociale.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = !statusFilter || statusFilter === 'all' || registration.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  }) : [];

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

      {/* Registrations List */}
      <div className="space-y-4">
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
          filteredRegistrations.map((registration: SoftwareRegistration) => (
            <Card key={registration.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold" data-testid={`text-software-name-${registration.id}`}>
                        {registration.nomeSoftware} v{registration.versione}
                      </h3>
                      {getStatusBadge(registration.status)}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{registration.ragioneSociale}</span>
                        {registration.partitaIva && (
                          <span className="text-muted-foreground">
                            (P.IVA: {registration.partitaIva})
                          </span>
                        )}
                      </div>
                      
                      {registration.sistemaOperativo && (
                        <div className="flex items-center gap-2">
                          <Monitor className="h-4 w-4 text-muted-foreground" />
                          <span>{registration.sistemaOperativo}</span>
                        </div>
                      )}
                      
                      {registration.indirizzoIp && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span>{registration.indirizzoIp}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {format(new Date(registration.primaRegistrazione), 'dd/MM/yyyy HH:mm', { locale: it })}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {format(new Date(registration.ultimaAttivita), 'dd/MM/yyyy HH:mm', { locale: it })}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {registration.totaleOrdini} ordini - {formatCurrency(registration.totaleVenduto)}
                        </span>
                      </div>
                    </div>

                    {registration.note && (
                      <div className="text-sm text-muted-foreground">
                        <strong>Note:</strong> {registration.note}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    {registration.status === 'non_assegnato' && (
                      <Button
                        onClick={() => {
                          setSelectedRegistration(registration);
                          setIsClassifyDialogOpen(true);
                        }}
                        size="sm"
                        data-testid={`button-classify-${registration.id}`}
                      >
                        Classifica
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Classify Registration Dialog */}
      <Dialog open={isClassifyDialogOpen} onOpenChange={setIsClassifyDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Classifica Registrazione Software</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit(onClassifySubmit)} className="space-y-4">
            <div>
              <Label htmlFor="clienteAssegnato">Cliente</Label>
              <Select onValueChange={(value) => setValue('clienteAssegnato', value)}>
                <SelectTrigger data-testid="select-assign-client">
                  <SelectValue placeholder="Seleziona cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client: Client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name} ({client.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="licenzaAssegnata">Licenza (opzionale)</Label>
              <Select onValueChange={(value) => setValue('licenzaAssegnata', value)}>
                <SelectTrigger data-testid="select-assign-license">
                  <SelectValue placeholder="Seleziona licenza" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nessuna licenza</SelectItem>
                  {licenses.map((license: License) => (
                    <SelectItem key={license.id} value={license.id}>
                      {license.activationKey} - {license.client?.name} ({license.product?.name})
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