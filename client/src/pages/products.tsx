import { useEffect, useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Sidebar from "@/components/layout/sidebar";
import TopBar from "@/components/layout/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

export default function ProductsPage() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [newProduct, setNewProduct] = useState({
    name: '',
    version: '',
    description: '',
    supportedLicenseTypes: [] as string[]
  });
  const [editProduct, setEditProduct] = useState({
    name: '',
    version: '',
    description: '',
    supportedLicenseTypes: [] as string[]
  });
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [licenseTypeFilter, setLicenseTypeFilter] = useState("all");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!loading && !user) {
      setLocation('/login');
    }
  }, [user, loading, setLocation]);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['/api/products'],
    enabled: !!user,
    refetchOnWindowFocus: false,
    staleTime: 0,
    queryFn: async () => {
      const token = localStorage.getItem('qlm_token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch('/api/products', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Products data received:', data);
      return data;
    }
  });

  const { data: licenses = [] } = useQuery({
    queryKey: ['/api/licenses'],
    enabled: !!user,
  });

  // Function to get license count for a product
  const getProductLicenseCount = (productId: string) => {
    return (licenses as any[]).filter((license: any) => license.productId === productId).length;
  };

  // Function to get clients for a product
  const getProductClients = (productId: string) => {
    const productLicenses = (licenses as any[]).filter((license: any) => license.productId === productId);
    const clients = productLicenses.map((license: any) => license.client?.name).filter(Boolean);
    return Array.from(new Set(clients)); // Remove duplicates
  };

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter((product: any) => {
      const matchesSearch = product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           product.version?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           product.description?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesLicenseType = licenseTypeFilter === "all" || 
                                 product.supportedLicenseTypes?.includes(licenseTypeFilter);
      
      return matchesSearch && matchesLicenseType;
    });
  }, [products, searchTerm, licenseTypeFilter]);

  const createProductMutation = useMutation({
    mutationFn: async (productData: typeof newProduct) => {
      const token = localStorage.getItem('qlm_token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(productData)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      setIsCreateModalOpen(false);
      setNewProduct({ name: '', version: '', description: '', supportedLicenseTypes: [] });
      toast({
        title: "Successo",
        description: "Prodotto creato con successo!",
      });
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Errore nella creazione del prodotto",
        variant: "destructive",
      });
    }
  });

  const updateProductMutation = useMutation({
    mutationFn: async ({ id, productData }: { id: string, productData: typeof editProduct }) => {
      const token = localStorage.getItem('qlm_token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`/api/products/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(productData)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      setIsEditModalOpen(false);
      setSelectedProduct(null);
      toast({
        title: "Successo",
        description: "Prodotto aggiornato con successo!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Errore nell'aggiornamento del prodotto",
        variant: "destructive",
      });
    }
  });

  const handleCreateProduct = () => {
    if (!newProduct.name || !newProduct.version) {
      toast({
        title: "Errore",
        description: "Nome e versione sono obbligatori",
        variant: "destructive",
      });
      return;
    }
    createProductMutation.mutate(newProduct);
  };

  const handleLicenseTypeToggle = (type: string) => {
    setNewProduct(prev => ({
      ...prev,
      supportedLicenseTypes: prev.supportedLicenseTypes.includes(type)
        ? prev.supportedLicenseTypes.filter(t => t !== type)
        : [...prev.supportedLicenseTypes, type]
    }));
  };

  const handleEditLicenseTypeToggle = (type: string) => {
    setEditProduct(prev => ({
      ...prev,
      supportedLicenseTypes: prev.supportedLicenseTypes.includes(type)
        ? prev.supportedLicenseTypes.filter(t => t !== type)
        : [...prev.supportedLicenseTypes, type]
    }));
  };

  const handleEditProduct = () => {
    if (!editProduct.name || !editProduct.version) {
      toast({
        title: "Errore",
        description: "Nome e versione sono obbligatori",
        variant: "destructive",
      });
      return;
    }
    if (!selectedProduct) return;
    
    updateProductMutation.mutate({ 
      id: selectedProduct.id, 
      productData: editProduct 
    });
  };

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

  return (
    <div className="min-h-screen flex bg-surface">
      <Sidebar />
      
      <main className="flex-1 bg-surface">
        <TopBar />
        
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Gestione Prodotti</h1>
              <p className="text-sm text-gray-600">Visualizza e gestisci tutti i prodotti software</p>
            </div>
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-blue-700">
                  <i className="fas fa-plus mr-2"></i>
                  Nuovo Prodotto
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Crea Nuovo Prodotto</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome Prodotto *</Label>
                    <Input
                      id="name"
                      value={newProduct.name}
                      onChange={(e) => setNewProduct(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="es. QLM Professional"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="version">Versione *</Label>
                    <Input
                      id="version"
                      value={newProduct.version}
                      onChange={(e) => setNewProduct(prev => ({ ...prev, version: e.target.value }))}
                      placeholder="es. 2024.1"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="description">Descrizione</Label>
                    <Textarea
                      id="description"
                      value={newProduct.description}
                      onChange={(e) => setNewProduct(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Descrizione del prodotto software..."
                      rows={3}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Tipi di Licenza Supportati</Label>
                    <div className="flex flex-wrap gap-2">
                      {['permanente', 'trial', 'abbonamento'].map((type) => (
                        <Badge
                          key={type}
                          variant={newProduct.supportedLicenseTypes.includes(type) ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => handleLicenseTypeToggle(type)}
                        >
                          {type}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-2 pt-4">
                    <Button 
                      variant="outline" 
                      onClick={() => setIsCreateModalOpen(false)}
                    >
                      Annulla
                    </Button>
                    <Button 
                      onClick={handleCreateProduct}
                      disabled={createProductMutation.isPending}
                    >
                      {createProductMutation.isPending ? 'Creazione...' : 'Crea Prodotto'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Search and Filter Section */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between">
                <CardTitle className="text-lg">Prodotti ({filteredProducts.length} di {products.length})</CardTitle>
                
                <div className="flex flex-col lg:flex-row gap-2 w-full lg:w-auto">
                  <Input
                    placeholder="Cerca per nome, versione o descrizione..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="lg:w-72 text-sm"
                  />
                  
                  <Select value={licenseTypeFilter} onValueChange={setLicenseTypeFilter}>
                    <SelectTrigger className="lg:w-44">
                      <SelectValue placeholder="Tipo licenza" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tutti i tipi</SelectItem>
                      <SelectItem value="permanente">Permanente</SelectItem>
                      <SelectItem value="trial">Trial</SelectItem>
                      <SelectItem value="abbonamento">Abbonamento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4">
                    <div className="h-20 bg-gray-200 rounded"></div>
                  </CardContent>
                </Card>
              ))
            ) : filteredProducts.length === 0 && products.length > 0 ? (
              <div className="col-span-full text-center py-12">
                <p className="text-gray-500 mb-4">Nessun prodotto trovato con i filtri selezionati</p>
                <Button 
                  variant="outline"
                  onClick={() => {
                    setSearchTerm("");
                    setLicenseTypeFilter("all");
                  }}
                >
                  Rimuovi filtri
                </Button>
              </div>
            ) : (
              filteredProducts.map((product: any) => {
                const licenseCount = getProductLicenseCount(product.id);
                const clients = getProductClients(product.id);
                
                return (
                <Card key={product.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="w-12 h-12 bg-primary bg-opacity-10 rounded-lg flex items-center justify-center">
                        <i className="fas fa-box text-primary text-xl"></i>
                      </div>
                      <Button variant="ghost" size="sm">
                        <i className="fas fa-ellipsis-v"></i>
                      </Button>
                    </div>
                    <CardTitle className="text-lg font-semibold text-gray-900">
                      {product.name}
                    </CardTitle>
                    <p className="text-sm text-gray-500">Versione {product.version}</p>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-4">
                      {product.description || 'Nessuna descrizione disponibile'}
                    </p>
                    
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-gray-700">Tipi licenza supportati:</div>
                        <div className="flex flex-wrap gap-1">
                          {product.supportedLicenseTypes?.map((type: string, index: number) => (
                            <span 
                              key={index}
                              className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                            >
                              {type}
                            </span>
                          )) || (
                            <span className="text-xs text-gray-500">Nessun tipo specificato</span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-4">
                          <button
                            onClick={() => setLocation('/licenses')}
                            className="flex items-center text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            <i className="fas fa-key mr-1"></i>
                            <span className="font-medium">{licenseCount}</span> licenze
                          </button>
                          
                          <button
                            onClick={() => setLocation('/clients')}
                            className="flex items-center text-green-600 hover:text-green-800 hover:underline"
                          >
                            <i className="fas fa-users mr-1"></i>
                            <span className="font-medium">{clients.length}</span> clienti
                          </button>
                        </div>
                      </div>
                      
                      {clients.length > 0 && (
                        <div className="space-y-1">
                          <div className="text-xs text-gray-500">Clienti:</div>
                          <div className="flex flex-wrap gap-1">
                            {clients.slice(0, 3).map((client, idx) => (
                              <span key={idx} className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                                {client}
                              </span>
                            ))}
                            {clients.length > 3 && (
                              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                                +{clients.length - 3}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center">
                      <span className="text-xs text-gray-500">
                        Creato il {new Date(product.createdAt).toLocaleDateString('it-IT')}
                      </span>
                      <div className="flex space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="mr-2"
                          onClick={() => {
                            setSelectedProduct(product);
                            setEditProduct({
                              name: product.name || '',
                              version: product.version || '',
                              description: product.description || '',
                              supportedLicenseTypes: product.supportedLicenseTypes || []
                            });
                            setIsEditModalOpen(true);
                          }}
                        >
                          <i className="fas fa-edit mr-1"></i>
                          Modifica
                        </Button>
                        {user?.role === 'superadmin' && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="text-red-600 hover:text-red-800"
                            onClick={async () => {
                              if (confirm(`Sei sicuro di voler eliminare il prodotto "${product.name}"? Questa azione non può essere annullata.`)) {
                                try {
                                  const response = await fetch(`/api/products/${product.id}`, {
                                    method: 'DELETE',
                                    headers: {
                                      'Authorization': `Bearer ${localStorage.getItem('qlm_token')}`
                                    }
                                  });

                                  if (response.ok) {
                                    // Refresh the page to show updated list
                                    window.location.reload();
                                  } else {
                                    const error = await response.json();
                                    alert(`Errore nell'eliminazione: ${error.message}`);
                                  }
                                } catch (error) {
                                  console.error('Error deleting product:', error);
                                  alert('Errore di connessione durante l\'eliminazione del prodotto');
                                }
                              }
                            }}
                          >
                            <i className="fas fa-trash mr-1"></i>
                            Elimina
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
                );
              })
            )}
          </div>

          {!isLoading && products.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <i className="fas fa-box text-gray-400 text-2xl"></i>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nessun prodotto trovato</h3>
                <p className="text-gray-500 mb-4">Inizia creando il tuo primo prodotto software</p>
                <Button 
                  className="bg-primary hover:bg-blue-700"
                  onClick={() => setIsCreateModalOpen(true)}
                >
                  <i className="fas fa-plus mr-2"></i>
                  Crea Primo Prodotto
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Edit Modal */}
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Modifica Prodotto</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Nome Prodotto *</Label>
                <Input
                  id="edit-name"
                  value={editProduct.name}
                  onChange={(e) => setEditProduct(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="es. QLM Professional"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-version">Versione *</Label>
                <Input
                  id="edit-version"
                  value={editProduct.version}
                  onChange={(e) => setEditProduct(prev => ({ ...prev, version: e.target.value }))}
                  placeholder="es. 2024.1"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-description">Descrizione</Label>
                <Textarea
                  id="edit-description"
                  value={editProduct.description}
                  onChange={(e) => setEditProduct(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descrizione del prodotto software..."
                  rows={3}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Tipi di Licenza Supportati</Label>
                <div className="flex flex-wrap gap-2">
                  {['permanente', 'trial', 'abbonamento'].map((type) => (
                    <Badge
                      key={type}
                      variant={editProduct.supportedLicenseTypes.includes(type) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => handleEditLicenseTypeToggle(type)}
                    >
                      {type}
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setIsEditModalOpen(false)}
                >
                  Annulla
                </Button>
                <Button 
                  className="bg-primary hover:bg-blue-700"
                  onClick={handleEditProduct}
                  disabled={updateProductMutation.isPending}
                >
                  <i className="fas fa-save mr-2"></i>
                  {updateProductMutation.isPending ? 'Aggiornamento...' : 'Aggiorna Prodotto'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}