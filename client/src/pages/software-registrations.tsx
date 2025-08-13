
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/use-auth";
import { useSidebar } from "@/contexts/SidebarContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface DeviceRegistration {
  id: string;
  partitaIva: string;
  nomeSoftware: string;
  versione: string;
  modulo?: string;
  ragioneSociale: string;
  uidDispositivo: string;
  sistemaOperativo: string;
  computerKey: string;
  totaleOrdini: number;
  totaleVenduto: number;
  status: string;
  clienteAssegnato?: string;
  licenzaAssegnata?: string;
  prodottoAssegnato?: string;
  note?: string;
  primaRegistrazione: string;
  ultimaAttivita: string;
  createdAt: string;
  updatedAt: string;
  clientId?: string;
}

interface Client {
  id: string;
  name: string;
  email: string;
  company_id: string;
  companyId?: string;
  contactInfo?: any;
}

interface Company {
  id: string;
  name: string;
  partitaIva?: string;
}

interface Product {
  id: string;
  name: string;
  version?: string;
}

interface License {
  id: string;
  clientId: string;
  productId: string;
  clientName: string;
  productName: string;
  status: string;
}

export default function SoftwareRegistrationsPage() {
  const { user, loading } = useAuth();
  const { contentMargin } = useSidebar();
  const queryClient = useQueryClient();

  const [selectedRegistration, setSelectedRegistration] = useState<DeviceRegistration | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Fetch registrations
  const { data: registrations = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/software/registrazioni'],
    queryFn: async () => {
      const token = localStorage.getItem('qlm_token');
      const response = await fetch('/api/software/registrazioni', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch registrations');
      }
      return response.json();
    }
  });

  // Fetch companies
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
    }
  });

  // Fetch clients
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
    }
  });

  // Fetch products
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
    }
  });

  // Fetch licenses
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
    }
  });

  const handleEditRegistration = (registration: DeviceRegistration) => {
    console.log('Edit registration:', registration);
    setSelectedRegistration(registration);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setSelectedRegistration(null);
    setIsModalOpen(false);
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'attivo':
        return 'bg-green-100 text-green-800';
      case 'licenziato':
        return 'bg-blue-100 text-blue-800';
      case 'non_assegnato':
        return 'bg-gray-100 text-gray-800';
      case 'scaduto':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Filter registrations
  const filteredRegistrations = registrations.filter((reg: DeviceRegistration) => {
    const matchesSearch = 
      reg.ragioneSociale?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reg.nomeSoftware?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reg.partitaIva?.includes(searchTerm) ||
      reg.uidDispositivo?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || reg.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return <div>Caricamento...</div>;
  }

  return (
    <div className={`p-6 ${contentMargin}`}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Registrazioni Software</h1>
          <p className="text-gray-600">Gestisci le registrazioni dei dispositivi software</p>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <i className="fas fa-filter text-blue-500"></i>
              Filtri
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 md:flex-row md:items-end">
              <div className="flex-1">
                <Label htmlFor="search">Cerca</Label>
                <Input
                  id="search"
                  placeholder="Cerca per ragione sociale, software, P.IVA o dispositivo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="w-full md:w-48">
                <Label htmlFor="status">Stato</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona stato" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutti</SelectItem>
                    <SelectItem value="attivo">Attivo</SelectItem>
                    <SelectItem value="non_assegnato">Non Assegnato</SelectItem>
                    <SelectItem value="licenziato">Licenziato</SelectItem>
                    <SelectItem value="scaduto">Scaduto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Registrations List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <i className="fas fa-desktop text-green-500"></i>
              Registrazioni ({filteredRegistrations.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2 mt-2"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredRegistrations.map((registration) => (
                  <div 
                    key={registration.id}
                    className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => handleEditRegistration(registration)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-lg">{registration.ragioneSociale}</h3>
                          <Badge className={getStatusBadgeColor(registration.status)}>
                            {registration.status}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-sm text-gray-600">
                          <div>
                            <strong>Software:</strong> {registration.nomeSoftware} v{registration.versione}
                          </div>
                          <div>
                            <strong>P.IVA:</strong> {registration.partitaIva}
                          </div>
                          <div>
                            <strong>Dispositivo:</strong> {registration.uidDispositivo}
                          </div>
                          <div>
                            <strong>SO:</strong> {registration.sistemaOperativo}
                          </div>
                          <div>
                            <strong>Prima Registrazione:</strong> {new Date(registration.primaRegistrazione).toLocaleDateString()}
                          </div>
                          <div>
                            <strong>Ultima Attività:</strong> {new Date(registration.ultimaAttivita).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditRegistration(registration);
                        }}
                      >
                        <i className="fas fa-edit mr-1"></i>
                        Modifica
                      </Button>
                    </div>
                  </div>
                ))}

                {filteredRegistrations.length === 0 && (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <i className="fas fa-desktop text-gray-400 text-2xl"></i>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Nessuna registrazione trovata</h3>
                    <p className="text-gray-500">Le registrazioni software appariranno qui quando disponibili</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Classification Modal */}
      <ClassificationModal
        registration={selectedRegistration}
        isOpen={isModalOpen}
        onClose={closeModal}
        companies={companies}
        clients={clients}
        products={products}
        licenses={licenses}
        onRefresh={refetch}
      />
    </div>
  );
}

interface ClassificationModalProps {
  registration: DeviceRegistration | null;
  isOpen: boolean;
  onClose: () => void;
  companies: Company[];
  clients: Client[];
  products: Product[];
  licenses: License[];
  onRefresh: () => void;
}

function ClassificationModal({
  registration,
  isOpen,
  onClose,
  companies,
  clients,
  products,
  licenses,
  onRefresh
}: ClassificationModalProps) {
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [selectedLicenseId, setSelectedLicenseId] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [shouldGenerateComputerKey, setShouldGenerateComputerKey] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (registration && isOpen) {
      // Find client if already assigned
      const assignedClient = clients.find(c => c.id === registration.clientId);
      console.log('Found client:', assignedClient);
      
      if (assignedClient) {
        const companyId = assignedClient.company_id || assignedClient.companyId;
        console.log('Company ID:', companyId || 'none');
        setSelectedCompanyId(companyId || "");
        setSelectedClientId(assignedClient.id);
      } else {
        setSelectedCompanyId("");
        setSelectedClientId("");
      }
      
      setSelectedLicenseId(registration.licenzaAssegnata || "");
      setNotes(registration.note || "");
      console.log('Computer Key:', registration.computerKey || 'empty');
      setShouldGenerateComputerKey(!registration.computerKey || registration.computerKey.trim() === '');
    }
  }, [registration, isOpen, clients]);

  // Filter clients based on selected company
  const availableClients = selectedCompanyId 
    ? clients.filter(client => 
        (client.company_id || client.companyId) === selectedCompanyId
      )
    : clients;

  // Filter licenses based on selected client and available products
  const availableLicenses = selectedClientId
    ? licenses.filter(license => {
        console.log('Filtering licenses for client:', selectedClientId);
        console.log('All licenses:', licenses);
        
        const clientMatch = license.clientId === selectedClientId;
        const productMatch = registration?.prodottoAssegnato 
          ? license.productName === registration.prodottoAssegnato
          : true; // If no product assigned to registration, show all licenses for the client
        const statusValid = ['attiva', 'in_attesa_convalida'].includes(license.status);
        
        console.log('License check:', {
          licenseId: license.id,
          clientMatch,
          productMatch,
          statusValid,
          status: license.status
        });
        
        return clientMatch && productMatch && statusValid;
      })
    : [];

  console.log('Available licenses after filtering:', availableLicenses.length);

  const handleSubmit = async () => {
    if (!registration || !selectedClientId) return;

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('qlm_token');
      const response = await fetch(`/api/software/registrazioni/${registration.id}/classify`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          clientId: selectedClientId,
          licenseId: selectedLicenseId || null,
          notes,
          generateComputerKey: shouldGenerateComputerKey
        })
      });

      if (response.ok) {
        onRefresh();
        onClose();
      } else {
        console.error('Failed to classify registration');
      }
    } catch (error) {
      console.error('Error classifying registration:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateLicenseFromRegistration = async () => {
    if (!registration || !selectedClientId) return;

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('qlm_token');
      
      // Find the product for this registration
      const matchingProduct = products.find(p => p.name === registration.prodottoAssegnato);
      if (!matchingProduct) {
        console.error('Product not found for registration');
        return;
      }

      const response = await fetch('/api/licenses/from-registration', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          registrationId: registration.id,
          clientId: selectedClientId,
          productId: matchingProduct.id,
          licenseType: 'abbonamento',
          maxUsers: 1,
          maxDevices: 1,
          price: 0
        })
      });

      if (response.ok) {
        const newLicense = await response.json();
        setSelectedLicenseId(newLicense.id);
        onRefresh();
      } else {
        console.error('Failed to create license from registration');
      }
    } catch (error) {
      console.error('Error creating license from registration:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!registration) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Classifica Registrazione Software</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Registration Info */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">{registration.ragioneSociale}</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><strong>Software:</strong> {registration.nomeSoftware} v{registration.versione}</div>
              <div><strong>P.IVA:</strong> {registration.partitaIva}</div>
              <div><strong>Dispositivo:</strong> {registration.uidDispositivo}</div>
              <div><strong>SO:</strong> {registration.sistemaOperativo}</div>
            </div>
          </div>

          {/* Company Selection */}
          <div>
            <Label htmlFor="company">Azienda</Label>
            <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleziona prima una azienda" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Client Selection */}
          <div>
            <Label htmlFor="client">Cliente</Label>
            <Select 
              value={selectedClientId} 
              onValueChange={setSelectedClientId}
              disabled={!selectedCompanyId}
            >
              <SelectTrigger>
                <SelectValue placeholder={!selectedCompanyId ? "Seleziona prima una azienda" : "Seleziona un cliente"} />
              </SelectTrigger>
              <SelectContent>
                {availableClients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name} - {client.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* License Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="license">Licenza</Label>
              {selectedClientId && availableLicenses.length === 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCreateLicenseFromRegistration}
                  disabled={isSubmitting}
                >
                  <i className="fas fa-plus mr-1"></i>
                  Crea Licenza
                </Button>
              )}
            </div>
            <Select 
              value={selectedLicenseId} 
              onValueChange={setSelectedLicenseId}
              disabled={!selectedClientId || availableLicenses.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder={
                  !selectedClientId 
                    ? "Seleziona prima un cliente" 
                    : availableLicenses.length === 0 
                      ? "Nessuna licenza disponibile" 
                      : "Seleziona una licenza"
                } />
              </SelectTrigger>
              <SelectContent>
                {availableLicenses.map((license) => (
                  <SelectItem key={license.id} value={license.id}>
                    {license.productName} - {license.status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Note</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Percorso: C:\Program Files\QLM\Management"
              rows={3}
            />
          </div>

          {/* Computer Key Generation */}
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="generate-key"
              checked={shouldGenerateComputerKey}
              onCheckedChange={setShouldGenerateComputerKey}
            />
            <Label htmlFor="generate-key">Autorizza Dispositivo (Computer Key)</Label>
          </div>
          {shouldGenerateComputerKey && (
            <p className="text-sm text-gray-500">
              Genera una chiave computer per autorizzare questo dispositivo specifico
            </p>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Reset Filtri
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={!selectedClientId || isSubmitting}
            >
              {isSubmitting ? 'Salvando...' : 'Salva'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
