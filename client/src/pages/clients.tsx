import { useEffect, useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/layout/sidebar";
import TopBar from "@/components/layout/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ClientsPage() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [companyFilter, setCompanyFilter] = useState("all");

  useEffect(() => {
    if (!loading && !user) {
      setLocation('/login');
    }
  }, [user, loading, setLocation]);

  // Fetch clients
  const { data: clients = [] } = useQuery({
    queryKey: ['/api/clients', user?.companyId],
    enabled: !!user,
    queryFn: async () => {
      const token = localStorage.getItem('qlm_token');
      console.log('Fetching clients for user:', user?.username, 'Role:', user?.role, 'Company ID:', user?.companyId);

      const response = await fetch('/api/clients', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      console.log('Raw clients data received:', data.length, 'clients');

      // Server already filters clients correctly for admin users by company hierarchy
      // No need for additional client-side filtering
      console.log(`Clients API returned ${data.length} clients for user ${user?.username} (${user?.role})`);
      return data;
    }
  });

  const { data: companies = [] } = useQuery({
    queryKey: ['/api/companies'],
    enabled: !!user,
    queryFn: async () => {
      const token = localStorage.getItem('qlm_token');
      const response = await fetch('/api/companies', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return response.json();
    },
  });

  const { data: licenses = [] } = useQuery({
    queryKey: ['/api/licenses'],
    enabled: !!user,
  });

  // Function to get company name by ID
  const getCompanyName = (companyId: string) => {
    const company = companies.find((c: any) => c.id === companyId);
    return company ? company.name : 'N/A';
  };

  // Function to get client licenses count
  const getClientLicensesCount = (clientId: string) => {
    return licenses.filter((license: any) => license.clientId === clientId).length;
  };

  // Function to get client's licensed products
  const getClientProducts = (clientId: string) => {
    const clientLicenses = licenses.filter((license: any) => license.clientId === clientId);
    const products = clientLicenses.map((license: any) => license.product?.name).filter(Boolean);
    return [...new Set(products)]; // Remove duplicates
  };

    // Function to get accessible companies for admin (simulated hierarchy)
    const getAccessibleCompanies = () => {
        if (!user?.companyId || !companies) return [];
        
        // Build company hierarchy - include user's company and all its subcompanies
        const hierarchy: any[] = [];
        const userCompany = companies.find((c: any) => c.id === user.companyId);
        
        if (userCompany) {
            hierarchy.push(userCompany);
            
            // Find all subcompanies recursively
            const findSubcompanies = (parentId: string) => {
                const subcompanies = companies.filter((c: any) => 
                    (c.parent_id === parentId || c.parentId === parentId)
                );
                subcompanies.forEach((sub: any) => {
                    hierarchy.push(sub);
                    findSubcompanies(sub.id);
                });
            };
            
            findSubcompanies(user.companyId);
        }
        
        console.log(`getAccessibleCompanies for admin ${user.username}:`, hierarchy.map(c => ({id: c.id, name: c.name})));
        return hierarchy;
    };

  // Filtered clients
  const filteredClients = useMemo(() => {
    return clients.filter((client: any) => {
      const matchesSearch = client.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           client.email?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "all" || client.status === statusFilter;
      const matchesCompany = companyFilter === "all" || 
                            (client.company_id || client.companyId) === companyFilter;

      return matchesSearch && matchesStatus && matchesCompany;
    });
  }, [clients, searchTerm, statusFilter, companyFilter]);

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

  const getStatusBadge = (status: string) => {
    const variants = {
      'convalidato': 'default',
      'in_attesa': 'outline',
      'sospeso': 'destructive'
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'}>
        {status === 'convalidato' ? 'Convalidato' : 
         status === 'in_attesa' ? 'In Attesa' : 
         status === 'sospeso' ? 'Sospeso' : status}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen flex bg-surface">
      <Sidebar />

      <main className="flex-1 ml-64 bg-surface">
        <TopBar />

        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestione Clienti</h1>
              <p className="text-gray-600">Visualizza e gestisci tutti i clienti del sistema</p>
            </div>
            <Button 
              className="bg-primary hover:bg-blue-700"
              onClick={() => setIsNewModalOpen(true)}
            >
              <i className="fas fa-plus mr-2"></i>
              Nuovo Cliente
            </Button>
          </div>

          {/* Search and Filter Section */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                <CardTitle>Elenco Clienti ({filteredClients.length} di {clients.length})</CardTitle>

                <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
                  <Input
                    placeholder="Cerca per nome o email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="md:w-64"
                  />

                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="md:w-40">
                      <SelectValue placeholder="Stato" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tutti gli stati</SelectItem>
                      <SelectItem value="convalidato">Convalidato</SelectItem>
                      <SelectItem value="in_attesa">In Attesa</SelectItem>
                      <SelectItem value="sospeso">Sospeso</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={companyFilter} onValueChange={setCompanyFilter}>
                    <SelectTrigger className="md:w-48">
                      <SelectValue placeholder="Azienda" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tutte le aziende</SelectItem>
                      {companies.map((company: any) => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center h-48">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Azienda</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stato</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Licenze</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prodotti</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Azioni</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredClients.map((client: any, index: number) => {
                        console.log(`Rendering client ${index + 1}:`, client);
                        const clientProducts = getClientProducts(client.id);
                        const licensesCount = getClientLicensesCount(client.id);

                        return (
                          <tr key={client.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {client.name || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {client.email || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <div className="flex items-center">
                                <i className="fas fa-building text-gray-400 mr-2"></i>
                                <button
                                  onClick={() => setLocation('/companies')}
                                  className="text-blue-600 hover:text-blue-800 hover:underline"
                                >
                                  {getCompanyName(client.company_id || client.companyId)}
                                </button>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {getStatusBadge(client.status || 'unknown')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <div className="flex items-center">
                                <i className="fas fa-key text-blue-500 mr-2"></i>
                                <button
                                  onClick={() => setLocation('/licenses')}
                                  className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                                >
                                  {licensesCount}
                                </button>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500 max-w-xs">
                              {clientProducts.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {clientProducts.slice(0, 2).map((product, idx) => (
                                    <button
                                      key={idx}
                                      onClick={() => setLocation('/products')}
                                      className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full hover:bg-blue-200 transition-colors"
                                    >
                                      {product}
                                    </button>
                                  ))}
                                  {clientProducts.length > 2 && (
                                    <button
                                      onClick={() => setLocation('/products')}
                                      className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full hover:bg-gray-200 transition-colors"
                                    >
                                      +{clientProducts.length - 2}
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <span className="text-gray-400 italic">Nessun prodotto</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <Button variant="ghost" size="sm" className="mr-2">
                                <i className="fas fa-eye"></i>
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => {
                                  setSelectedClient(client);
                                  setIsEditModalOpen(true);
                                }}
                              >
                                <i className="fas fa-edit"></i>
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {filteredClients.length === 0 && clients.length > 0 && (
                    <div className="text-center py-12">
                      <p className="text-gray-500">Nessun cliente trovato con i filtri selezionati</p>
                      <Button 
                        variant="outline"
                        onClick={() => {
                          setSearchTerm("");
                          setStatusFilter("all");
                          setCompanyFilter("all");
                        }}
                        className="mt-2"
                      >
                        Rimuovi filtri
                      </Button>
                    </div>
                  )}

                  {clients.length === 0 && (
                    <div className="text-center py-12">
                      <p className="text-gray-500">Nessun cliente trovato</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* New Client Modal */}
        <Dialog open={isNewModalOpen} onOpenChange={setIsNewModalOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Nuovo Cliente</DialogTitle>
            </DialogHeader>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.target as HTMLFormElement);

              try {
                const token = localStorage.getItem('qlm_token');
                const clientData = {
                  name: formData.get('name') as string,
                  email: formData.get('email') as string,
                  companyId: formData.get('companyId') as string,
                  status: 'convalidato',
                  isMultiSite: formData.get('multiSite') === 'on',
                  isMultiUser: formData.get('multiUser') === 'on',
                  contactInfo: {
                    phone: formData.get('phone') as string || '',
                    company: formData.get('company') as string || ''
                  }
                };

                console.log('Creating client with data:', clientData);

                const response = await fetch('/api/clienti/registrazione', {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify(clientData)
                });

                if (response.ok) {
                  const result = await response.json();
                  console.log('Client created successfully:', result);
                  setIsNewModalOpen(false);
                  // Refresh clients list
                  window.location.reload();
                } else {
                  const error = await response.json();
                  console.error('Failed to create client:', error);
                  alert(`Errore nella creazione del cliente: ${error.message || 'Errore sconosciuto'}`);
                }
              } catch (error) {
                console.error('Error creating client:', error);
                alert('Errore di connessione durante la creazione del cliente');
              }
            }}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-client-name">Nome Cliente *</Label>
                  <Input
                    id="new-client-name"
                    name="name"
                    required
                    placeholder="Nome completo del cliente"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-client-email">Email *</Label>
                  <Input
                    id="new-client-email"
                    name="email"
                    type="email"
                    required
                    placeholder="email@esempio.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-client-company-select">Azienda *</Label>
                  <Select name="companyId" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona azienda" />
                    </SelectTrigger>
                    <SelectContent>
                      {companies.map((company: any) => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-client-phone">Telefono</Label>
                  <Input
                    id="new-client-phone"
                    name="phone"
                    placeholder="+39 123 456 7890"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-client-company">Nome Azienda Cliente</Label>
                  <Input
                    id="new-client-company"
                    name="company"
                    placeholder="Nome dell'azienda del cliente"
                  />
                </div>

                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="new-multi-site"
                      name="multiSite"
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor="new-multi-site" className="text-sm">
                      Multi-Sede
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="new-multi-user"
                      name="multiUser"
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor="new-multi-user" className="text-sm">
                      Multi-Utente
                    </Label>
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button 
                    type="button"
                    variant="outline" 
                    onClick={() => setIsNewModalOpen(false)}
                  >
                    Annulla
                  </Button>
                  <Button type="submit" className="bg-primary hover:bg-blue-700">
                    <i className="fas fa-save mr-2"></i>
                    Crea Cliente
                  </Button>
                </div>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Modal */}
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Modifica Cliente</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-client-name">Nome Cliente *</Label>
                <Input
                  id="edit-client-name"
                  defaultValue={selectedClient?.name || ''}
                  placeholder="Nome completo del cliente"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-client-email">Email *</Label>
                <Input
                  id="edit-client-email"
                  type="email"
                  defaultValue={selectedClient?.email || ''}
                  placeholder="email@esempio.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-client-status">Stato</Label>
                <Select defaultValue={selectedClient?.status || 'in_attesa'}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in_attesa">In Attesa</SelectItem>
                    <SelectItem value="convalidato">Convalidato</SelectItem>
                    <SelectItem value="sospeso">Sospeso</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="edit-multi-site"
                    defaultChecked={selectedClient?.isMultiSite}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="edit-multi-site" className="text-sm">
                    Multi-Sede
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="edit-multi-user"
                    defaultChecked={selectedClient?.isMultiUser}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="edit-multi-user" className="text-sm">
                    Multi-Utente
                  </Label>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setIsEditModalOpen(false)}
                >
                  Annulla
                </Button>
                <Button className="bg-primary hover:bg-blue-700">
                  <i className="fas fa-save mr-2"></i>
                  Aggiorna Cliente
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}