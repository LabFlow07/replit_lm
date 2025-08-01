import { useEffect, useState } from "react";
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
      
      <main className="flex-1 ml-64 bg-surface">
        <TopBar />
        
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestione Prodotti</h1>
              <p className="text-gray-600">Visualizza e gestisci tutti i prodotti software</p>
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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-24 bg-gray-200 rounded"></div>
                  </CardContent>
                </Card>
              ))
            ) : (
              products.map((product: any) => (
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
                    
                    <div className="space-y-2">
                      <div className="text-sm">
                        <span className="font-medium text-gray-700">Tipi licenza supportati:</span>
                      </div>
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
                    
                    <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center">
                      <span className="text-xs text-gray-500">
                        Creato il {new Date(product.createdAt).toLocaleDateString('it-IT')}
                      </span>
                      <div className="flex space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setSelectedProduct(product);
                            setIsEditModalOpen(true);
                          }}
                        >
                          <i className="fas fa-edit mr-1"></i>
                          Modifica
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
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
                  defaultValue={selectedProduct?.name || ''}
                  placeholder="es. QLM Professional"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-version">Versione *</Label>
                <Input
                  id="edit-version"
                  defaultValue={selectedProduct?.version || ''}
                  placeholder="es. 2024.1"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-description">Descrizione</Label>
                <Input
                  id="edit-description"
                  defaultValue={selectedProduct?.description || ''}
                  placeholder="Descrivi il prodotto..."
                />
              </div>
              
              <div className="space-y-2">
                <Label>Tipi di licenza supportati</Label>
                <div className="flex flex-wrap gap-2">
                  {['permanente', 'trial', 'abbonamento'].map((type) => (
                    <div key={type} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`edit-${type}`}
                        defaultChecked={selectedProduct?.supportedLicenseTypes?.includes(type)}
                        className="rounded border-gray-300"
                      />
                      <Label htmlFor={`edit-${type}`} className="text-sm capitalize">
                        {type}
                      </Label>
                    </div>
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
                <Button className="bg-primary hover:bg-blue-700">
                  <i className="fas fa-save mr-2"></i>
                  Aggiorna Prodotto
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}