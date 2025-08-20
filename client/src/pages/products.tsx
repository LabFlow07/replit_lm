
import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useSidebar } from "@/contexts/SidebarContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// License type mapping
const licenseTypeLabels: { [key: string]: string } = {
  'permanente': 'Permanente',
  'trial': 'Trial',
  'abbonamento': 'Abbonamento',
  'abbonamento_mensile': 'Mensile',
  'abbonamento_annuale': 'Annuale'
};

const licenseTypeColors: { [key: string]: string } = {
  'permanente': 'bg-green-100 text-green-800',
  'trial': 'bg-yellow-100 text-yellow-800',
  'abbonamento': 'bg-blue-100 text-blue-800',
  'abbonamento_mensile': 'bg-blue-100 text-blue-800',
  'abbonamento_annuale': 'bg-purple-100 text-purple-800'
};

export default function ProductsPage() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const { contentMargin } = useSidebar();
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

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['/api/products'],
    enabled: !!user,
    refetchOnWindowFocus: false,
    staleTime: 0,
    queryFn: async () => {
      const token = localStorage.getItem('token');
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

  const createProductMutation = useMutation({
    mutationFn: async (productData: typeof newProduct) => {
      const token = localStorage.getItem('token');
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
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create product');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      setIsCreateModalOpen(false);
      setNewProduct({
        name: '',
        version: '',
        description: '',
        supportedLicenseTypes: []
      });
      toast({
        title: "Prodotto creato",
        description: "Il prodotto è stato creato con successo.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Errore nella creazione del prodotto",
        variant: "destructive",
      });
    }
  });

  const updateProductMutation = useMutation({
    mutationFn: async ({ id, productData }: { id: string, productData: typeof editProduct }) => {
      const token = localStorage.getItem('token');
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
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update product');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      setIsEditModalOpen(false);
      setSelectedProduct(null);
      toast({
        title: "Prodotto aggiornato",
        description: "Il prodotto è stato aggiornato con successo.",
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

  // Filter products based on search and license type
  const filteredProducts = products.filter((product: any) => {
    const matchesSearch = searchTerm === "" || 
      product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.version?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesLicenseType = licenseTypeFilter === "all" || 
      (product.supportedLicenseTypes && product.supportedLicenseTypes.includes(licenseTypeFilter));

    return matchesSearch && matchesLicenseType;
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createProductMutation.mutate(newProduct);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedProduct) {
      updateProductMutation.mutate({ 
        id: selectedProduct.id, 
        productData: editProduct 
      });
    }
  };

  const handleLicenseTypeChange = (licenseType: string, checked: boolean, isEdit: boolean = false) => {
    if (isEdit) {
      setEditProduct(prev => ({
        ...prev,
        supportedLicenseTypes: checked 
          ? [...prev.supportedLicenseTypes, licenseType]
          : prev.supportedLicenseTypes.filter(type => type !== licenseType)
      }));
    } else {
      setNewProduct(prev => ({
        ...prev,
        supportedLicenseTypes: checked 
          ? [...prev.supportedLicenseTypes, licenseType]
          : prev.supportedLicenseTypes.filter(type => type !== licenseType)
      }));
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Caricamento...</div>;
  }

  if (!user) {
    setLocation('/login');
    return null;
  }

  return (
    <div className={`p-6 ${contentMargin}`}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestione Prodotti</h1>
          <p className="text-gray-600">Gestisci i prodotti software e le loro configurazioni</p>
        </div>
        
        {(user.role === 'superadmin' || user.role === 'admin') && (
          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-blue-700">
                <i className="fas fa-plus mr-2"></i>
                Nuovo Prodotto
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Crea Nuovo Prodotto</DialogTitle>
                <DialogDescription>
                  Inserisci i dettagli del nuovo prodotto software
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Nome Prodotto *</Label>
                  <Input
                    id="name"
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                    placeholder="es. AutoCAD Professional"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="version">Versione *</Label>
                  <Input
                    id="version"
                    value={newProduct.version}
                    onChange={(e) => setNewProduct({ ...newProduct, version: e.target.value })}
                    placeholder="es. 2024.1"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="description">Descrizione</Label>
                  <Textarea
                    id="description"
                    value={newProduct.description}
                    onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                    placeholder="Descrizione del prodotto..."
                    rows={3}
                  />
                </div>
                
                <div>
                  <Label>Tipi di Licenza Supportati *</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {Object.entries(licenseTypeLabels).map(([value, label]) => (
                      <div key={value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`new-${value}`}
                          checked={newProduct.supportedLicenseTypes.includes(value)}
                          onCheckedChange={(checked) => handleLicenseTypeChange(value, checked as boolean)}
                        />
                        <Label htmlFor={`new-${value}`} className="text-sm">{label}</Label>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="flex justify-end space-x-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                    Annulla
                  </Button>
                  <Button type="submit" disabled={createProductMutation.isPending}>
                    {createProductMutation.isPending ? 'Creazione...' : 'Crea Prodotto'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Search and Filter Section */}
      <Card className="mb-6">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <CardTitle>Prodotti ({filteredProducts.length} di {products.length})</CardTitle>
            
            <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
              <Input
                placeholder="Cerca per nome, versione o descrizione..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="md:w-80"
              />
              
              <Select value={licenseTypeFilter} onValueChange={setLicenseTypeFilter}>
                <SelectTrigger className="md:w-48">
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

      {/* Products Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="font-semibold">Prodotto</TableHead>
                  <TableHead className="font-semibold">Versione</TableHead>
                  <TableHead className="font-semibold">Descrizione</TableHead>
                  <TableHead className="font-semibold">Tipi Licenza</TableHead>
                  <TableHead className="font-semibold text-center">Licenze</TableHead>
                  <TableHead className="font-semibold">Clienti</TableHead>
                  <TableHead className="font-semibold">Data Creazione</TableHead>
                  <TableHead className="font-semibold text-center">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                      <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                      <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse w-2/3"></div></TableCell>
                      <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse w-1/2"></div></TableCell>
                      <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse w-1/3"></div></TableCell>
                      <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse w-1/2"></div></TableCell>
                      <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse w-1/3"></div></TableCell>
                      <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse w-1/2"></div></TableCell>
                    </TableRow>
                  ))
                ) : filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12">
                      {products.length === 0 ? (
                        <div>
                          <p className="text-gray-500 mb-4">Nessun prodotto trovato</p>
                          <p className="text-sm text-gray-400">Crea il primo prodotto per iniziare</p>
                        </div>
                      ) : (
                        <div>
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
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((product: any) => {
                    const licenseCount = getProductLicenseCount(product.id);
                    const clients = getProductClients(product.id);
                    
                    return (
                      <TableRow key={product.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-primary bg-opacity-10 rounded-lg flex items-center justify-center">
                              <i className="fas fa-cube text-primary text-sm"></i>
                            </div>
                            <span className="font-semibold">{product.name}</span>
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <Badge variant="outline" className="font-mono">
                            {product.version}
                          </Badge>
                        </TableCell>
                        
                        <TableCell className="max-w-xs">
                          <div className="truncate" title={product.description || ''}>
                            {product.description || (
                              <span className="text-gray-400 italic">Nessuna descrizione</span>
                            )}
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {product.supportedLicenseTypes?.map((type: string) => (
                              <Badge 
                                key={type} 
                                className={`text-xs ${licenseTypeColors[type] || 'bg-gray-100 text-gray-800'}`}
                              >
                                {licenseTypeLabels[type] || type}
                              </Badge>
                            )) || (
                              <span className="text-gray-400 italic text-sm">Nessun tipo</span>
                            )}
                          </div>
                        </TableCell>
                        
                        <TableCell className="text-center">
                          <Badge variant={licenseCount > 0 ? "default" : "secondary"}>
                            {licenseCount}
                          </Badge>
                        </TableCell>
                        
                        <TableCell>
                          <div className="max-w-xs">
                            {clients.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {clients.slice(0, 2).map((client, idx) => (
                                  <Badge key={idx} variant="outline" className="text-xs">
                                    {client}
                                  </Badge>
                                ))}
                                {clients.length > 2 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{clients.length - 2}
                                  </Badge>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-400 italic text-sm">Nessun cliente</span>
                            )}
                          </div>
                        </TableCell>
                        
                        <TableCell className="text-sm text-gray-500">
                          {new Date(product.createdAt).toLocaleDateString('it-IT')}
                        </TableCell>
                        
                        <TableCell>
                          <div className="flex justify-center space-x-1">
                            {(user.role === 'superadmin' || user.role === 'admin') && (
                              <>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
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
                                  className="text-blue-600 hover:text-blue-800"
                                >
                                  <i className="fas fa-edit text-sm"></i>
                                </Button>
                                
                                {user.role === 'superadmin' && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className="text-red-600 hover:text-red-800"
                                    onClick={async () => {
                                      if (confirm(`Sei sicuro di voler eliminare il prodotto "${product.name}"?`)) {
                                        try {
                                          const token = localStorage.getItem('token');
                                          const response = await fetch(`/api/products/${product.id}`, {
                                            method: 'DELETE',
                                            headers: {
                                              'Authorization': `Bearer ${token}`
                                            }
                                          });
                                          
                                          if (response.ok) {
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
                                    <i className="fas fa-trash text-sm"></i>
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Product Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Modifica Prodotto</DialogTitle>
            <DialogDescription>
              Modifica i dettagli del prodotto selezionato
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Nome Prodotto *</Label>
              <Input
                id="edit-name"
                value={editProduct.name}
                onChange={(e) => setEditProduct({ ...editProduct, name: e.target.value })}
                placeholder="es. AutoCAD Professional"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="edit-version">Versione *</Label>
              <Input
                id="edit-version"
                value={editProduct.version}
                onChange={(e) => setEditProduct({ ...editProduct, version: e.target.value })}
                placeholder="es. 2024.1"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="edit-description">Descrizione</Label>
              <Textarea
                id="edit-description"
                value={editProduct.description}
                onChange={(e) => setEditProduct({ ...editProduct, description: e.target.value })}
                placeholder="Descrizione del prodotto..."
                rows={3}
              />
            </div>
            
            <div>
              <Label>Tipi di Licenza Supportati *</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {Object.entries(licenseTypeLabels).map(([value, label]) => (
                  <div key={value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`edit-${value}`}
                      checked={editProduct.supportedLicenseTypes.includes(value)}
                      onCheckedChange={(checked) => handleLicenseTypeChange(value, checked as boolean, true)}
                    />
                    <Label htmlFor={`edit-${value}`} className="text-sm">{label}</Label>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
                Annulla
              </Button>
              <Button type="submit" disabled={updateProductMutation.isPending}>
                {updateProductMutation.isPending ? 'Aggiornamento...' : 'Aggiorna Prodotto'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
