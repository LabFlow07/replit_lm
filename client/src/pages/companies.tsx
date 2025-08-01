import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/api";
import Sidebar from "@/components/layout/sidebar";
import TopBar from "@/components/layout/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function CompaniesPage() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedCompany, setSelectedCompany] = useState<any>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      setLocation('/login');
    }
  }, [user, loading, setLocation]);

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
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    },
  });

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

  const getCompanyHierarchy = () => {
    const parentCompanies = companies.filter((c: any) => !c.parentId);
    const childCompanies = companies.filter((c: any) => c.parentId);
    
    return parentCompanies.map((parent: any) => ({
      ...parent,
      children: childCompanies.filter((child: any) => child.parentId === parent.id)
    }));
  };

  const hierarchy = getCompanyHierarchy();

  const getTypeBadge = (type: string) => {
    const variants = {
      'azienda': 'default',
      'rivenditore': 'secondary',
      'distributore': 'outline'
    } as const;

    return (
      <Badge variant={variants[type as keyof typeof variants] || 'outline'}>
        {type === 'azienda' ? 'Azienda' : 
         type === 'rivenditore' ? 'Rivenditore' : 
         type === 'distributore' ? 'Distributore' : type}
      </Badge>
    );
  };

  const createCompanyMutation = useMutation({
    mutationFn: async (companyData: any) => {
      const response = await apiRequest('POST', '/api/companies', companyData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/companies'] });
      setIsCreateDialogOpen(false);
    },
  });

  const updateCompanyMutation = useMutation({
    mutationFn: async ({ id, ...companyData }: any) => {
      const response = await apiRequest('PUT', `/api/companies/${id}`, companyData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/companies'] });
      setSelectedCompany(null);
    },
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    
    const companyData = {
      name: formData.get('company-name') as string,
      type: formData.get('company-type') as string,
      parentId: formData.get('parent-company') === 'none' ? null : formData.get('parent-company') as string,
      contactInfo: {
        email: formData.get('company-email') as string,
        phone: formData.get('company-phone') as string,
        address: formData.get('company-address') as string,
      }
    };

    if (selectedCompany) {
      updateCompanyMutation.mutate({ id: selectedCompany.id, ...companyData });
    } else {
      createCompanyMutation.mutate(companyData);
    }
  };

  const CompanyForm = ({ company, isEdit = false }: { company?: any, isEdit?: boolean }) => (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="company-name">Nome Azienda</Label>
        <Input 
          id="company-name" 
          name="company-name"
          defaultValue={company?.name} 
          placeholder="Inserisci nome azienda" 
          required
        />
      </div>

      <div>
        <Label htmlFor="company-type">Tipo Azienda</Label>
        <Select name="company-type" defaultValue={company?.type || 'azienda'}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="azienda">Azienda</SelectItem>
            <SelectItem value="rivenditore">Rivenditore</SelectItem>
            <SelectItem value="distributore">Distributore</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="parent-company">Azienda Madre (opzionale)</Label>
        <Select name="parent-company" defaultValue={company?.parentId || 'none'}>
          <SelectTrigger>
            <SelectValue placeholder="Seleziona azienda madre" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Nessuna (Azienda principale)</SelectItem>
            {companies
              .filter((c: any) => c.id !== company?.id)
              .map((c: any) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="company-email">Email Aziendale</Label>
        <Input 
          id="company-email" 
          name="company-email"
          type="email"
          defaultValue={company?.contactInfo?.email} 
          placeholder="email@azienda.com" 
        />
      </div>

      <div>
        <Label htmlFor="company-phone">Telefono</Label>
        <Input 
          id="company-phone" 
          name="company-phone"
          defaultValue={company?.contactInfo?.phone} 
          placeholder="+39 123 456 7890" 
        />
      </div>

      <div>
        <Label htmlFor="company-address">Indirizzo</Label>
        <Input 
          id="company-address" 
          name="company-address"
          defaultValue={company?.contactInfo?.address} 
          placeholder="Via, Città, CAP" 
        />
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button 
          type="button" 
          variant="outline" 
          onClick={() => {
            setIsCreateDialogOpen(false);
            setSelectedCompany(null);
          }}
        >
          Annulla
        </Button>
        <Button 
          type="submit" 
          className="bg-primary hover:bg-blue-700"
          disabled={createCompanyMutation.isPending || updateCompanyMutation.isPending}
        >
          <i className="fas fa-save mr-2"></i>
          {isEdit ? 'Aggiorna' : 'Crea'} Azienda
        </Button>
      </div>
    </form>
  );

  return (
    <div className="min-h-screen flex bg-surface">
      <Sidebar />
      
      <main className="flex-1 ml-64 bg-surface">
        <TopBar />
        
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestione Aziende</h1>
              <p className="text-gray-600">Gestisci la struttura gerarchica delle aziende e sotto-aziende</p>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-blue-700">
                  <i className="fas fa-plus mr-2"></i>
                  Nuova Azienda
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Crea Nuova Azienda</DialogTitle>
                </DialogHeader>
                <CompanyForm />
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Struttura Aziendale</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {isLoading ? (
                    <div className="flex items-center justify-center h-48">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : (
                    <div className="p-6">
                      {hierarchy.length === 0 ? (
                        <div className="text-center py-12">
                          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <i className="fas fa-building text-gray-400 text-2xl"></i>
                          </div>
                          <h3 className="text-lg font-medium text-gray-900 mb-2">Nessuna azienda trovata</h3>
                          <p className="text-gray-500 mb-4">Inizia creando la tua prima azienda</p>
                          <Button 
                            className="bg-primary hover:bg-blue-700"
                            onClick={() => setIsCreateDialogOpen(true)}
                          >
                            <i className="fas fa-plus mr-2"></i>
                            Crea Prima Azienda
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {hierarchy.map((parentCompany: any) => (
                            <div key={parentCompany.id} className="border rounded-lg p-4">
                              <div 
                                className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-2 rounded"
                                onClick={() => setSelectedCompany(parentCompany)}
                              >
                                <div className="flex items-center space-x-3">
                                  <div className="w-10 h-10 bg-primary bg-opacity-10 rounded-lg flex items-center justify-center">
                                    <i className="fas fa-building text-primary"></i>
                                  </div>
                                  <div>
                                    <h4 className="font-semibold text-gray-900">{parentCompany.name}</h4>
                                    <p className="text-sm text-gray-500">{parentCompany.email}</p>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  {getTypeBadge(parentCompany.type)}
                                  <Button variant="ghost" size="sm">
                                    <i className="fas fa-chevron-right"></i>
                                  </Button>
                                </div>
                              </div>

                              {parentCompany.children.length > 0 && (
                                <div className="ml-6 mt-3 pl-4 border-l-2 border-gray-200 space-y-2">
                                  {parentCompany.children.map((childCompany: any) => (
                                    <div 
                                      key={childCompany.id}
                                      className="flex items-center justify-between p-2 hover:bg-gray-50 rounded cursor-pointer"
                                      onClick={() => setSelectedCompany(childCompany)}
                                    >
                                      <div className="flex items-center space-x-3">
                                        <div className="w-8 h-8 bg-secondary bg-opacity-10 rounded-lg flex items-center justify-center">
                                          <i className="fas fa-building text-secondary text-sm"></i>
                                        </div>
                                        <div>
                                          <p className="font-medium text-gray-900">{childCompany.name}</p>
                                          <p className="text-xs text-gray-500">{childCompany.email}</p>
                                        </div>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        {getTypeBadge(childCompany.type)}
                                        <Button variant="ghost" size="sm">
                                          <i className="fas fa-chevron-right"></i>
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div>
              {selectedCompany ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Dettagli Azienda</span>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedCompany(null)}>
                        <i className="fas fa-times"></i>
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h3 className="font-semibold text-lg text-gray-900">{selectedCompany.name}</h3>
                      {getTypeBadge(selectedCompany.type)}
                    </div>

                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Email</p>
                        <p className="text-sm text-gray-900">{selectedCompany.email || 'Non specificata'}</p>
                      </div>

                      <div>
                        <p className="text-sm font-medium text-gray-600">Telefono</p>
                        <p className="text-sm text-gray-900">{selectedCompany.phone || 'Non specificato'}</p>
                      </div>

                      <div>
                        <p className="text-sm font-medium text-gray-600">Indirizzo</p>
                        <p className="text-sm text-gray-900">{selectedCompany.address || 'Non specificato'}</p>
                      </div>

                      {selectedCompany.parentCompanyId && (
                        <div>
                          <p className="text-sm font-medium text-gray-600">Azienda Madre</p>
                          <p className="text-sm text-gray-900">
                            {companies.find((c: any) => c.id === selectedCompany.parentCompanyId)?.name || 'N/A'}
                          </p>
                        </div>
                      )}

                      <div>
                        <p className="text-sm font-medium text-gray-600">Data Creazione</p>
                        <p className="text-sm text-gray-900">
                          {new Date(selectedCompany.createdAt).toLocaleDateString('it-IT')}
                        </p>
                      </div>
                    </div>

                    <div className="pt-4 space-y-2">
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => setIsEditDialogOpen(true)}
                      >
                        <i className="fas fa-edit mr-2"></i>
                        Modifica Azienda
                      </Button>
                      <Button variant="outline" className="w-full">
                        <i className="fas fa-users mr-2"></i>
                        Gestisci Utenti
                      </Button>
                      <Button variant="outline" className="w-full">
                        <i className="fas fa-key mr-2"></i>
                        Visualizza Licenze
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-6 text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <i className="fas fa-building text-gray-400 text-2xl"></i>
                    </div>
                    <p className="text-gray-500">Seleziona un'azienda per visualizzare i dettagli</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Edit Dialog */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Modifica Azienda</DialogTitle>
              </DialogHeader>
              <CompanyForm company={selectedCompany} isEdit={true} />
            </DialogContent>
          </Dialog>
        </div>
      </main>
    </div>
  );
}