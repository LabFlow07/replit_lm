import { useEffect, useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Sidebar from "@/components/layout/sidebar";
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
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCreateAgentOpen, setIsCreateAgentOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!loading && !user) {
      setLocation('/login');
    }
  }, [user, loading, setLocation]);

  // Fetch companies
  const { data: companies = [], isLoading } = useQuery({
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

  // Helper functions
  const getCompanyClientCount = (companyId: string) => {
    return (clients as any[]).filter((client: any) => 
      (client.company_id || client.companyId) === companyId
    ).length;
  };

  const getCompanyAgentCount = (companyId: string) => {
    return (agents as any[]).filter((agent: any) => agent.companyId === companyId).length;
  };

  const getCompanyHierarchy = () => {
    const companyMap = new Map();
    const rootCompanies: any[] = [];

    // Create company map
    companies.forEach((company: any) => {
      companyMap.set(company.id, { ...company, children: [] });
    });

    // Build hierarchy
    companies.forEach((company: any) => {
      if (company.parent_id || company.parentId) {
        const parent = companyMap.get(company.parent_id || company.parentId);
        if (parent) {
          parent.children.push(companyMap.get(company.id));
        } else {
          rootCompanies.push(companyMap.get(company.id));
        }
      } else {
        rootCompanies.push(companyMap.get(company.id));
      }
    });

    return rootCompanies;
  };

  // Filtered companies
  const filteredHierarchy = useMemo(() => {
    const hierarchy = getCompanyHierarchy();
    
    if (!searchTerm && typeFilter === "all") {
      return hierarchy;
    }

    const filterCompany = (company: any): any => {
      const matchesSearch = !searchTerm || 
        company.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        company.contactInfo?.email?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = typeFilter === "all" || company.type === typeFilter;
      
      const filteredChildren = company.children.map(filterCompany).filter(Boolean);
      
      if (matchesSearch && matchesType) {
        return { ...company, children: filteredChildren };
      } else if (filteredChildren.length > 0) {
        return { ...company, children: filteredChildren };
      }
      
      return null;
    };

    return hierarchy.map(filterCompany).filter(Boolean);
  }, [companies, clients, searchTerm, typeFilter]);

  const toggleExpand = (companyId: string) => {
    const newExpanded = new Set(expandedCompanies);
    if (newExpanded.has(companyId)) {
      newExpanded.delete(companyId);
    } else {
      newExpanded.add(companyId);
    }
    setExpandedCompanies(newExpanded);
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
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedCompany(company);
                      setIsCreateAgentOpen(true);
                    }}
                    title="Aggiungi Agente"
                  >
                    <i className="fas fa-user-plus text-blue-600"></i>
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedCompany(company);
                      setIsEditDialogOpen(true);
                    }}
                    title="Modifica Azienda"
                  >
                    <i className="fas fa-edit text-gray-600"></i>
                  </Button>
                </div>
              </div>
            </div>

            {/* Company Details - shown when expanded */}
            {isExpanded && (clientCount > 0 || agentCount > 0) && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {clientCount > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-700 mb-2">Clienti ({clientCount})</h4>
                      <div className="space-y-1">
                        {(clients as any[])
                          .filter((client: any) => (client.company_id || client.companyId) === company.id)
                          .slice(0, 3)
                          .map((client: any) => (
                            <div key={client.id} className="flex items-center text-sm text-gray-600">
                              <i className="fas fa-user text-green-500 mr-2"></i>
                              <span>{client.name}</span>
                              <Badge variant="outline" className="ml-2 text-xs">
                                {client.status}
                              </Badge>
                            </div>
                          ))}
                        {clientCount > 3 && (
                          <div className="text-sm text-gray-500">
                            ...e altri {clientCount - 3} clienti
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {agentCount > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-700 mb-2">Agenti ({agentCount})</h4>
                      <div className="space-y-1">
                        {(agents as any[])
                          .filter((agent: any) => agent.companyId === company.id)
                          .slice(0, 3)
                          .map((agent: any) => (
                            <div key={agent.id} className="flex items-center text-sm text-gray-600">
                              <i className="fas fa-user-tie text-blue-500 mr-2"></i>
                              <span>{agent.name}</span>
                              <span className="ml-2 text-xs text-gray-400">({agent.role})</span>
                            </div>
                          ))}
                        {agentCount > 3 && (
                          <div className="text-sm text-gray-500">
                            ...e altri {agentCount - 3} agenti
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
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
      
      <main className="flex-1 ml-64 bg-surface">
        <TopBar />
        
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestione Aziende</h1>
              <p className="text-gray-600">Visualizza la struttura gerarchica delle aziende con agenti e clienti</p>
            </div>
            
            <Button 
              onClick={() => setIsCreateDialogOpen(true)}
              className="bg-primary hover:bg-blue-700"
            >
              <i className="fas fa-plus mr-2"></i>
              Nuova Azienda
            </Button>
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
                  <p className="text-gray-500 mb-4">
                    {companies.length === 0 ? "Inizia creando la tua prima azienda" : "Nessun risultato con i filtri selezionati"}
                  </p>
                  <Button onClick={() => setIsCreateDialogOpen(true)}>
                    <i className="fas fa-plus mr-2"></i>
                    Crea Prima Azienda
                  </Button>
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

      {/* Create Agent Dialog */}
      <Dialog open={isCreateAgentOpen} onOpenChange={setIsCreateAgentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Nuovo Agente per {selectedCompany?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-600">
              Funzionalità di creazione agenti in sviluppo. 
              Gli agenti sono rappresentanti commerciali collegati all'azienda.
            </p>
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setIsCreateAgentOpen(false)}>
                Chiudi
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}