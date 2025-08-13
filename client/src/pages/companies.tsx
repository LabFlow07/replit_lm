import { useEffect, useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Sidebar from "@/components/layout/sidebar";
import { useSidebar } from "@/contexts/SidebarContext";
import TopBar from "@/components/layout/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";

export default function CompaniesPage() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(new Set());
  const [selectedCompany, setSelectedCompany] = useState<any>(null);
  const { contentMargin } = useSidebar();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCreateAgentOpen, setIsCreateAgentOpen] = useState(false);
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [isManageUsersOpen, setIsManageUsersOpen] = useState(false);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [formData, setFormData] = useState({
    name: '',
    type: 'rivenditore',
    parentId: '',
    status: 'active',
    contactInfo: { email: '', phone: '', address: '' }
  });
  const [agentFormData, setAgentFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'agente',
    territory: ''
  });
  const [userFormData, setUserFormData] = useState({
    username: '',
    name: '',
    email: '',
    password: '',
    role: 'cliente'
  });
  const [editUserFormData, setEditUserFormData] = useState({
    username: '',
    name: '',
    email: '',
    password: '',
    role: 'cliente',
    status: 'active'
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!loading && !user) {
      setLocation('/login');
    }
  }, [user, loading, setLocation]);

  // Fetch companies
  const { data: companies = [], isLoading, error } = useQuery({
    queryKey: ['/api/companies'],
    enabled: !!user,
    select: (data) => Array.isArray(data) ? data : [], // Ensure always array
    queryFn: async () => {
      const token = localStorage.getItem('qlm_token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch('/api/companies', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 401 || response.status === 403) {
        // Token scaduto o invalido, reindirizza al login
        localStorage.removeItem('qlm_token');
        setLocation('/login');
        throw new Error('Authentication failed');
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Companies data received:', data);
      return data;
    },
    retry: (failureCount, error: any) => {
      // Non riprovare se è un errore di autenticazione
      if (error?.message?.includes('Authentication failed')) {
        return false;
      }
      return failureCount < 3;
    }
  });

  // Safe companies array
  const safeCompanies = Array.isArray(companies) ? companies : [];

  // Fetch clients
  const { data: clients = [] } = useQuery({
    queryKey: ['/api/clients'],
    enabled: !!user,
  });

  // Fetch agents (placeholder for now)
  const { data: agents = [] } = useQuery({
    queryKey: ['/api/agents'],
    enabled: !!user,
    queryFn: async () => {
      // For now return empty array, will implement API later
      return [];
    },
  });

  // Fetch users for credential management
  const { data: users = [] } = useQuery({
    queryKey: ['/api/users'],
    enabled: !!user,
    queryFn: async () => {
      const token = localStorage.getItem('qlm_token');
      const response = await fetch('/api/users', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return response.json();
    }
  });

  // Helper functions
  const getCompanyClientCount = (companyId: string) => {
    const safeClients = Array.isArray(clients) ? clients : [];
    return safeClients.filter((client: any) => 
      (client.company_id || client.companyId) === companyId
    ).length;
  };

  const getCompanyAgentCount = (companyId: string) => {
    const safeAgents = Array.isArray(agents) ? agents : [];
    return safeAgents.filter((agent: any) => agent.companyId === companyId).length;
  };

  const getCompanyHierarchy = () => {
    const companyMap = new Map();
    const rootCompanies: any[] = [];

    // Create company map
    safeCompanies.forEach((company: any) => {
      companyMap.set(company.id, { ...company, children: [] });
    });

    // Build hierarchy
    safeCompanies.forEach((company: any) => {
      const parentId = company.parent_id || company.parentId;
      // Check if parentId is null, undefined, 0, '0', or empty string
      const isRoot = !parentId || parentId === '0' || parentId === 0 || parentId === '';

      if (!isRoot) {
        const parent = companyMap.get(parentId);
        if (parent) {
          parent.children.push(companyMap.get(company.id));
        } else {
          // Se il parent non è nella mappa (potrebbe non essere accessibile), 
          // aggiungi come root company
          rootCompanies.push(companyMap.get(company.id));
        }
      } else {
        rootCompanies.push(companyMap.get(company.id));
      }
    });

    return rootCompanies;
  };

  // Filter companies based on user permissions
  const getAccessibleCompanies = () => {
    if (!user) {
      console.log('No user found');
      return [];
    }

    console.log('User role:', user.role);
    console.log('User company ID:', user.companyId);
    console.log('Companies array length:', safeCompanies.length);

    // Superadmin vede tutto
    if (user.role === 'superadmin') {
      console.log('Superadmin: returning all companies');
      return safeCompanies;
    }

    // Admin vede la sua azienda e le sue sotto-aziende
    if (user.role === 'admin') {
      const userCompanyId = user.companyId;
      if (!userCompanyId) {
        console.log('Admin without company ID: returning empty array');
        return [];
      }

      // Trova l'azienda dell'admin e tutte le sue sotto-aziende (ricorsivamente)
      const getCompanyHierarchy = (companyId: string): string[] => {
        const result = [companyId];
        const children = safeCompanies.filter((c: any) => 
          c.parent_id === companyId || c.parentId === companyId
        );

        children.forEach(child => {
          result.push(...getCompanyHierarchy(child.id));
        });

        return result;
      };

      const accessibleIds = getCompanyHierarchy(userCompanyId);
      const filtered = safeCompanies.filter((company: any) => 
        accessibleIds.includes(company.id)
      );

      console.log(`Admin: user company ${userCompanyId}, hierarchy IDs:`, accessibleIds);
      console.log(`Admin: filtered ${filtered.length} companies from ${safeCompanies.length}`);
      return filtered;
    }

    // Altri ruoli vedono tutte le aziende per ora
    console.log('Other role: returning all companies');
    return safeCompanies;
  };

  // Filtered companies with permission check
  const filteredHierarchy = useMemo(() => {
    console.log('filteredHierarchy: User role:', user?.role);
    console.log('filteredHierarchy: All companies count:', safeCompanies.length);

    if (!safeCompanies || safeCompanies.length === 0) {
      console.log('No companies available');
      return [];
    }

    const accessibleCompanies = getAccessibleCompanies();
    console.log('filteredHierarchy: Accessible companies count:', accessibleCompanies.length);

    // Create hierarchy from accessible companies only
    const companyMap = new Map();
    const rootCompanies: any[] = [];

    // Create company map
    accessibleCompanies.forEach((company: any) => {
      companyMap.set(company.id, { ...company, children: [] });
    });

    // Build hierarchy
    accessibleCompanies.forEach((company: any) => {
      const parentId = company.parent_id || company.parentId;
      const isRoot = !parentId || parentId === '0' || parentId === 0 || parentId === '';

      if (!isRoot) {
        const parent = companyMap.get(parentId);
        if (parent) {
          parent.children.push(companyMap.get(company.id));
        } else {
          // Se il parent non è accessibile, mostra come root
          rootCompanies.push(companyMap.get(company.id));
        }
      } else {
        rootCompanies.push(companyMap.get(company.id));
      }
    });

    if (!searchTerm && typeFilter === "all") {
      return rootCompanies;
    }

    const filterCompany = (company: any): any => {
      if (!company) return null;

      const matchesSearch = !searchTerm || 
        company.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (company.contact_info && JSON.parse(company.contact_info).email?.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesType = typeFilter === "all" || company.type === typeFilter;

      const filteredChildren = company.children?.map(filterCompany).filter(Boolean) || [];

      if (matchesSearch && matchesType) {
        return { ...company, children: filteredChildren };
      } else if (filteredChildren.length > 0) {
        return { ...company, children: filteredChildren };
      }

      return null;
    };

    return rootCompanies.map(filterCompany).filter(Boolean);
  }, [companies, searchTerm, typeFilter, user]);

  // Mutations for CRUD operations
  const createCompanyMutation = useMutation({
    mutationFn: async (data: any) => {
      const token = localStorage.getItem('qlm_token');
      const response = await fetch('/api/companies', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to create company');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/companies'] });
      setIsCreateDialogOpen(false);
      setFormData({ name: '', type: 'rivenditore', parentId: '', status: 'active', contactInfo: { email: '', phone: '', address: '' } });
      toast({ title: "Azienda creata con successo" });
    }
  });

  const updateCompanyMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: any }) => {
      const token = localStorage.getItem('qlm_token');
      const response = await fetch(`/api/companies/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to update company');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/companies'] });
      setIsEditDialogOpen(false);
      toast({ title: "Azienda aggiornata con successo" });
    }
  });

  const createAgentMutation = useMutation({
    mutationFn: async (data: any) => {
      const token = localStorage.getItem('qlm_token');
      const response = await fetch('/api/agents', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ...data, companyId: selectedCompany?.id })
      });
      if (!response.ok) throw new Error('Failed to create agent');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/agents'] });
      queryClient.invalidateQueries({ queryKey: ['/api/companies'] });
      setIsCreateAgentOpen(false);
      setAgentFormData({ name: '', email: '', phone: '', role: 'agente', territory: '' });
      toast({ title: "Agente creato con successo" });
    }
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: any) => {
      const token = localStorage.getItem('qlm_token');
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ...data, companyId: selectedCompany?.id })
      });
      if (!response.ok) throw new Error('Failed to create user');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/companies'] });
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      setIsCreateUserOpen(false);
      setUserFormData({ username: '', name: '', email: '', password: '', role: 'cliente' });
      toast({ title: "Utente creato con successo" });
    }
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: any }) => {
      const token = localStorage.getItem('qlm_token');
      const response = await fetch(`/api/users/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to update user');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setIsEditUserOpen(false);
      toast({ title: "Credenziali utente aggiornate con successo" });
    }
  });

  const toggleExpand = (companyId: string) => {
    const newExpanded = new Set(expandedCompanies);
    if (newExpanded.has(companyId)) {
      newExpanded.delete(companyId);
    } else {
      newExpanded.add(companyId);
    }
    setExpandedCompanies(newExpanded);
  };

  const handleEditCompany = (company: any) => {
    setSelectedCompany(company);
    setFormData({
      name: company.name || '',
      type: company.type || 'rivenditore',
      parentId: company.parent_id || company.parentId || '',
      status: company.status || 'active',
      contactInfo: company.contact_info || company.contactInfo || { email: '', phone: '', address: '' }
    });
    setIsEditDialogOpen(true);
  };

  const handleSubmitCompany = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditDialogOpen && selectedCompany) {
      updateCompanyMutation.mutate({ id: selectedCompany.id, data: formData });
    } else {
      createCompanyMutation.mutate(formData);
    }
  };

  const handleSubmitAgent = (e: React.FormEvent) => {
    e.preventDefault();
    createAgentMutation.mutate(agentFormData);
  };

  const handleSubmitUser = (e: React.FormEvent) => {
    e.preventDefault();
    createUserMutation.mutate(userFormData);
  };

  const handleEditUser = (user: any) => {
    setSelectedUser(user);
    setEditUserFormData({
      username: user.username || '',
      name: user.name || '',
      email: user.email || '',
      password: '', // Leave empty for security
      role: user.role || 'cliente',
      status: user.status || 'active'
    });
    setIsEditUserOpen(true);
  };

  const handleSubmitEditUser = (e: React.FormEvent) => {
    e.preventDefault();
    const updateData = { ...editUserFormData };
    // Only include password if it's provided
    if (!updateData.password) {
      delete updateData.password;
    }
    updateUserMutation.mutate({ id: selectedUser.id, data: updateData });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'rivenditore': return 'fas fa-store';
      case 'sottoazienda': return 'fas fa-sitemap';
      case 'agente': return 'fas fa-user-tie';
      case 'cliente': return 'fas fa-user';
      default: return 'fas fa-building';
    }
  };

  const CompanyNode = ({ company, level = 0 }: { company: any, level?: number }) => {
    const hasChildren = company.children && company.children.length > 0;
    const isExpanded = expandedCompanies.has(company.id);
    const clientCount = getCompanyClientCount(company.id);
    const agentCount = getCompanyAgentCount(company.id);

    return (
      <div className={`${level > 0 ? 'ml-6 border-l-2 border-gray-200 pl-4' : ''}`}>
        <Card className="mb-3 hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 flex-1">
                {hasChildren && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleExpand(company.id)}
                    className="p-1 h-6 w-6"
                  >
                    <i className={`fas ${isExpanded ? 'fa-chevron-down' : 'fa-chevron-right'} text-xs`}></i>
                  </Button>
                )}

                <div className="flex items-center space-x-2">
                  <i className={`${getTypeIcon(company.type)} text-blue-600`}></i>
                  <div>
                    <h3 className="font-semibold text-gray-900">{company.name}</h3>
                    <p className="text-sm text-gray-500 capitalize">{company.type}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Badge className={getStatusColor(company.status || 'active')}>
                  {company.status || 'Attiva'}
                </Badge>

                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <button
                    onClick={() => setLocation('/clients')}
                    className="flex items-center hover:text-green-600 hover:underline"
                  >
                    <i className="fas fa-users mr-1"></i>
                    {clientCount} clienti
                  </button>

                  <span className="text-gray-300">|</span>

                  <span className="flex items-center">
                    <i className="fas fa-user-tie mr-1"></i>
                    {agentCount} agenti
                  </span>
                </div>

                <div className="flex space-x-1">
                  {(user?.role === 'superadmin' || user?.role === 'admin' || user?.role === 'rivenditore' || 
                    (user?.role === 'agente' && company.id === user?.companyId)) && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedCompany(company);
                          setIsManageUsersOpen(true);
                        }}
                        title="Gestisci Credenziali"
                      >
                        <i className="fas fa-key text-purple-600"></i>
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedCompany(company);
                          setIsCreateUserOpen(true);
                        }}
                        title="Nuovo Utente"
                      >
                        <i className="fas fa-user-plus text-green-600"></i>
                      </Button>
                    </>
                  )}

                  {(user?.role === 'superadmin' || user?.role === 'admin' || user?.role === 'rivenditore' || 
                    (user?.role === 'agente' && company.id === user?.companyId)) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedCompany(company);
                        setIsCreateAgentOpen(true);
                      }}
                      title="Nuovo Agente"
                    >
                      <i className="fas fa-user-tie text-blue-600"></i>
                    </Button>
                  )}

                  {(user?.role === 'superadmin' || user?.role === 'admin' || user?.role === 'rivenditore' || 
                    (user?.role === 'agente' && company.id === user?.companyId)) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditCompany(company)}
                      title="Modifica Azienda"
                    >
                      <i className="fas fa-edit text-gray-600"></i>
                    </Button>
                  )}

                  {user?.role === 'superadmin' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        if (confirm(`Sei sicuro di voler eliminare l'azienda "${company.name}"? Questa azione non può essere annullata.`)) {
                          try {
                            const response = await fetch(`/api/companies/${company.id}`, {
                              method: 'DELETE',
                              headers: {
                                'Authorization': `Bearer ${localStorage.getItem('qlm_token')}`
                              }
                            });

                            if (response.ok) {
                              queryClient.invalidateQueries({ queryKey: ['/api/companies'] });
                              toast({ title: "Azienda eliminata con successo" });
                            } else {
                              const error = await response.json();
                              toast({ 
                                title: "Errore nell'eliminazione", 
                                description: error.message,
                                variant: "destructive"
                              });
                            }
                          } catch (error) {
                            console.error('Error deleting company:', error);
                            toast({ 
                              title: "Errore di connessione", 
                              description: "Errore durante l'eliminazione dell'azienda",
                              variant: "destructive" 
                            });
                          }
                        }
                      }}
                      title="Elimina Azienda"
                      className="text-red-600 hover:text-red-800"
                    >
                      <i className="fas fa-trash"></i>
                    </Button>
                  )}
                </div>
              </div>
            </div>

            
          </CardContent>
        </Card>

        {/* Render children */}
        {hasChildren && isExpanded && (
          <div className="space-y-2">
            {company.children.map((child: any) => (
              <CompanyNode key={child.id} company={child} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen flex bg-surface">
      <Sidebar />

      <main className={`flex-1 ${contentMargin} bg-surface transition-all duration-300 ease-in-out`}>
        <TopBar />

        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestione Aziende</h1>
              <p className="text-gray-600">
                {user?.role === 'superadmin' ? 'Visualizza la struttura gerarchica completa delle aziende' :
                 user?.role === 'admin' ? 'Gestisci la tua azienda e le sotto-aziende associate' :
                 user?.role === 'rivenditore' ? 'Gestisci la tua rete di sotto-aziende e agenti' :
                 'Visualizza i dettagli della tua azienda'}
              </p>
            </div>

            {(user?.role === 'superadmin' || user?.role === 'admin' || user?.role === 'rivenditore') && (
              <Button 
                onClick={() => setIsCreateDialogOpen(true)}
                className="bg-primary hover:bg-blue-700"
              >
                <i className="fas fa-plus mr-2"></i>
                Nuova Azienda
              </Button>
            )}
          </div>

          {/* Filters */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle>Filtri e Ricerca</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4">
                <Input
                  placeholder="Cerca aziende per nome..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1"
                />

                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="md:w-48">
                    <SelectValue placeholder="Tipo azienda" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutti i tipi</SelectItem>
                    <SelectItem value="rivenditore">Rivenditore</SelectItem>
                    <SelectItem value="sottoazienda">Sotto-azienda</SelectItem>
                    <SelectItem value="agente">Agente</SelectItem>
                    <SelectItem value="cliente">Cliente</SelectItem>
                  </SelectContent>
                </Select>

                <Button 
                  variant="outline"
                  onClick={() => {
                    setSearchTerm("");
                    setTypeFilter("all");
                  }}
                >
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Company Tree */}
          <div className="space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-48">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filteredHierarchy.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="fas fa-building text-gray-400 text-2xl"></i>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Nessuna azienda trovata</h3>
                  <p className="text-gray-500">
                    {safeCompanies.length === 0 ? "Non ci sono aziende disponibili" : "Nessun risultato con i filtri selezionati"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredHierarchy.map((company: any) => (
                  <CompanyNode key={company.id} company={company} />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Create/Edit Company Dialog */}
      <Dialog open={isCreateDialogOpen || isEditDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsCreateDialogOpen(false);
          setIsEditDialogOpen(false);
          setFormData({ name: '', type: 'rivenditore', parentId: '', status: 'active', contactInfo: { email: '', phone: '', address: '' } });
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isEditDialogOpen ? `Modifica ${selectedCompany?.name}` : 'Nuova Azienda'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitCompany} className="space-y-4">
            <div>
              <Label htmlFor="name">Nome Azienda</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="type">Tipo</Label>
              <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rivenditore">Rivenditore</SelectItem>
                  <SelectItem value="sottoazienda">Sotto-azienda</SelectItem>
                  <SelectItem value="agente">Agente</SelectItem>
                  <SelectItem value="cliente">Cliente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="parentId">Azienda Madre (opzionale)</Label>
              <Select 
                value={formData.parentId || "none"} 
                onValueChange={(value) => setFormData({ ...formData, parentId: value === "none" ? "" : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona azienda madre" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nessuna (azienda principale)</SelectItem>
                  {(companies as any[]).map((company: any) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.contactInfo.email}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  contactInfo: { ...formData.contactInfo, email: e.target.value }
                })}
              />
            </div>

            <div>
              <Label htmlFor="phone">Telefono</Label>
              <Input
                id="phone"
                value={formData.contactInfo.phone}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  contactInfo: { ...formData.contactInfo, phone: e.target.value }
                })}
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setIsCreateDialogOpen(false);
                  setIsEditDialogOpen(false);
                }}
              >
                Annulla
              </Button>
              <Button type="submit" disabled={createCompanyMutation.isPending || updateCompanyMutation.isPending}>
                {createCompanyMutation.isPending || updateCompanyMutation.isPending ? 'Salvando...' : 
                 isEditDialogOpen ? 'Aggiorna' : 'Crea'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Agent Dialog */}
      <Dialog open={isCreateAgentOpen} onOpenChange={setIsCreateAgentOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Nuovo Agente per {selectedCompany?.name}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitAgent} className="space-y-4">
            <div>
              <Label htmlFor="agentName">Nome Completo</Label>
              <Input
                id="agentName"
                value={agentFormData.name}
                onChange={(e) => setAgentFormData({ ...agentFormData, name: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="agentEmail">Email</Label>
              <Input
                id="agentEmail"
                type="email"
                value={agentFormData.email}
                onChange={(e) => setAgentFormData({ ...agentFormData, email: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="agentPhone">Telefono</Label>
              <Input
                id="agentPhone"
                value={agentFormData.phone}
                onChange={(e) => setAgentFormData({ ...agentFormData, phone: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="agentRole">Ruolo</Label>
              <Select value={agentFormData.role} onValueChange={(value) => setAgentFormData({ ...agentFormData, role: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="agente">Agente</SelectItem>
                  <SelectItem value="responsabile_vendite">Responsabile Vendite</SelectItem>
                  <SelectItem value="account_manager">Account Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="territory">Territorio (opzionale)</Label>
              <Input
                id="territory"
                value={agentFormData.territory}
                onChange={(e) => setAgentFormData({ ...agentFormData, territory: e.target.value })}
                placeholder="es. Nord Italia, Lombardia, etc."
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsCreateAgentOpen(false)}>
                Annulla
              </Button>
              <Button type="submit" disabled={createAgentMutation.isPending}>
                {createAgentMutation.isPending ? 'Creando...' : 'Crea Agente'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Manage Users Dialog */}
      <Dialog open={isManageUsersOpen} onOpenChange={setIsManageUsersOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Gestione Credenziali - {selectedCompany?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-sm text-gray-600 mb-4">
              Gestisci le credenziali di accesso degli utenti dell'azienda. 
              Puoi modificare username, password e ruoli.
            </div>

            {/* Users Table */}
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b">
                <h3 className="font-medium text-gray-900">Utenti Azienda</h3>
              </div>
              <div className="divide-y">
                {(users as any[])
                  .filter((user: any) => user.company === selectedCompany?.id)
                  .map((user: any) => (
                    <div key={user.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{user.name}</h4>
                            <p className="text-sm text-gray-600">@{user.username}</p>
                            <p className="text-sm text-gray-500">{user.email}</p>
                          </div>
                          <div className="text-center">
                            <Badge className={user.role === 'superadmin' ? 'bg-red-100 text-red-800' :
                                           user.role === 'rivenditore' ? 'bg-blue-100 text-blue-800' :
                                           user.role === 'agente' ? 'bg-green-100 text-green-800' :
                                           'bg-gray-100 text-gray-800'}>
                              {user.role}
                            </Badge>
                          </div>
                          <div className="text-center">
                            <Badge variant={user.status === 'active' ? 'default' : 'destructive'}>
                              {user.status || 'active'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditUser(user)}
                        >
                          <i className="fas fa-edit mr-2"></i>
                          Modifica
                        </Button>
                      </div>
                    </div>
                  ))}

                {(users as any[]).filter((user: any) => user.company === selectedCompany?.id).length === 0 && (
                  <div className="p-8 text-center text-gray-500">
                    <i className="fas fa-users text-2xl mb-2"></i>
                    <p>Nessun utente trovato per questa azienda</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button variant="outline" onClick={() => setIsManageUsersOpen(false)}>
                Chiudi
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit User Credentials Dialog */}
      <Dialog open={isEditUserOpen} onOpenChange={setIsEditUserOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Modifica Credenziali - {selectedUser?.name}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitEditUser} className="space-y-4">
            <div>
              <Label htmlFor="editUsername">Username</Label>
              <Input
                id="editUsername"
                value={editUserFormData.username}
                onChange={(e) => setEditUserFormData({ ...editUserFormData, username: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="editName">Nome Completo</Label>
              <Input
                id="editName"
                value={editUserFormData.name}
                onChange={(e) => setEditUserFormData({ ...editUserFormData, name: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="editEmail">Email</Label>
              <Input
                id="editEmail"
                type="email"
                value={editUserFormData.email}
                onChange={(e) => setEditUserFormData({ ...editUserFormData, email: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="editPassword">Nuova Password (lascia vuoto per mantenere)</Label>
              <Input
                id="editPassword"
                type="password"
                value={editUserFormData.password}
                onChange={(e) => setEditUserFormData({ ...editUserFormData, password: e.target.value })}
                placeholder="Lascia vuoto per non modificare"
              />
            </div>

            <div>
              <Label htmlFor="editRole">Ruolo</Label>
              <Select value={editUserFormData.role} onValueChange={(value) => setEditUserFormData({ ...editUserFormData, role: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cliente">Cliente</SelectItem>
                  <SelectItem value="agente">Agente</SelectItem>
                  <SelectItem value="rivenditore">Rivenditore</SelectItem>
                  {user?.role === 'superadmin' && (
                    <SelectItem value="admin">Admin</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="editStatus">Stato</Label>
              <Select value={editUserFormData.status} onValueChange={(value) => setEditUserFormData({ ...editUserFormData, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Attivo</SelectItem>
                  <SelectItem value="inactive">Inattivo</SelectItem>
                  <SelectItem value="suspended">Sospeso</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsEditUserOpen(false)}>
                Annulla
              </Button>
              <Button type="submit" disabled={updateUserMutation.isPending}>
                {updateUserMutation.isPending ? 'Salvando...' : 'Salva Modifiche'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create User Dialog */}
      <Dialog open={isCreateUserOpen} onOpenChange={setIsCreateUserOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Nuovo Utente per {selectedCompany?.name}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitUser} className="space-y-4">
            <div>
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={userFormData.username}
                onChange={(e) => setUserFormData({ ...userFormData, username: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="userName">Nome Completo</Label>
              <Input
                id="userName"
                value={userFormData.name}
                onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="userEmail">Email</Label>
              <Input
                id="userEmail"
                type="email"
                value={userFormData.email}
                onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={userFormData.password}
                onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="userRole">Ruolo</Label>
              <Select value={userFormData.role} onValueChange={(value) => setUserFormData({ ...userFormData, role: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cliente">Cliente</SelectItem>
                  <SelectItem value="agente">Agente</SelectItem>
                  <SelectItem value="rivenditore">Rivenditore</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsCreateUserOpen(false)}>
                Annulla
              </Button>
              <Button type="submit" disabled={createUserMutation.isPending}>
                {createUserMutation.isPending ? 'Creando...' : 'Crea Utente'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}