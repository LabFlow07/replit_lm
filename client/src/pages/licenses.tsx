
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/layout/sidebar";
import TopBar from "@/components/layout/topbar";
import LicenseTable from "@/components/license/license-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import ActivationForm from "@/components/license/activation-form";
import ExpiringLicensesList from "@/components/license/expiring-licenses-list";

export default function LicensesPage() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [isNewLicenseModalOpen, setIsNewLicenseModalOpen] = useState(false);

  // Always call useQuery hooks - they will be disabled when user is not available
  const { data: clients = [] } = useQuery({
    queryKey: ['/api/clients'],
    enabled: !!user,
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/clients', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch clients');
      return response.json();
    }
  });

  const { data: products = [] } = useQuery({
    queryKey: ['/api/products'],
    enabled: !!user,
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/products', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch products');
      return response.json();
    }
  });

  useEffect(() => {
    if (!loading && !user) {
      setLocation('/login');
    }
  }, [user, loading, setLocation]);

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
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestione Licenze</h1>
              <p className="text-gray-600">Visualizza e gestisci tutte le licenze del sistema</p>
            </div>
            <Button 
              className="bg-primary hover:bg-blue-700"
              onClick={() => setIsNewLicenseModalOpen(true)}
            >
              <i className="fas fa-plus mr-2"></i>
              Nuova Licenza
            </Button>
          </div>

          {/* Filters Section */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle>Filtri Licenze</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4">
                <Input
                  placeholder="Cerca per chiave licenza, cliente o prodotto..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1"
                />

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="md:w-48">
                    <SelectValue placeholder="Stato" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutti gli stati</SelectItem>
                    <SelectItem value="attiva">Attiva</SelectItem>
                    <SelectItem value="trial">Trial</SelectItem>
                    <SelectItem value="demo">Demo</SelectItem>
                    <SelectItem value="scaduta">Scaduta</SelectItem>
                    <SelectItem value="sospesa">Sospesa</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="md:w-48">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutti i tipi</SelectItem>
                    <SelectItem value="permanent">Permanente</SelectItem>
                    <SelectItem value="trial">Trial</SelectItem>
                    <SelectItem value="subscription">Abbonamento</SelectItem>
                  </SelectContent>
                </Select>

                <Button 
                  variant="outline"
                  onClick={() => {
                    setSearchTerm("");
                    setStatusFilter("all");
                    setTypeFilter("all");
                  }}
                >
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-6">
            {/* Licenze in scadenza */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <i className="fas fa-clock text-orange-500"></i>
                  Licenze in Scadenza
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ExpiringLicensesList />
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <LicenseTable />
              </div>

              <div>
                <ActivationForm />
              </div>
            </div>
          </div>
        </div>

        {/* New License Modal */}
        <Dialog open={isNewLicenseModalOpen} onOpenChange={setIsNewLicenseModalOpen}>
          <DialogContent className="sm:max-w-[600px] max-h-screen overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nuova Licenza</DialogTitle>
            </DialogHeader>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.target as HTMLFormElement);

              try {
                const token = localStorage.getItem('token');
                const response = await fetch('/api/licenses', {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    clientId: formData.get('clientId'),
                    productId: formData.get('productId'),
                    licenseType: formData.get('licenseType'),
                    maxUsers: parseInt(formData.get('maxUsers') as string) || 1,
                    maxDevices: parseInt(formData.get('maxDevices') as string) || 1,
                    price: parseFloat(formData.get('price') as string) || 0,
                    discount: parseFloat(formData.get('discount') as string) || 0,
                    status: 'in_attesa_convalida',
                    activeModules: ['core']
                  })
                });

                if (response.ok) {
                  setIsNewLicenseModalOpen(false);
                  window.location.reload();
                } else {
                  console.error('Failed to create license');
                }
              } catch (error) {
                console.error('Error creating license:', error);
              }
            }}>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-license-client">Cliente *</Label>
                    <Select name="clientId" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((client: any) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name} - {client.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="new-license-product">Prodotto *</Label>
                    <Select name="productId" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona prodotto" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((product: any) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name} - {product.version}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-license-type">Tipo Licenza *</Label>
                    <Select name="licenseType" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="permanente">Permanente</SelectItem>
                        <SelectItem value="trial">Trial</SelectItem>
                        <SelectItem value="abbonamento_mensile">Abbonamento Mensile</SelectItem>
                        <SelectItem value="abbonamento_annuale">Abbonamento Annuale</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="new-license-price">Prezzo €</Label>
                    <Input
                      id="new-license-price"
                      name="price"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-license-users">Max Utenti</Label>
                    <Input
                      id="new-license-users"
                      name="maxUsers"
                      type="number"
                      defaultValue="1"
                      min="1"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="new-license-devices">Max Dispositivi</Label>
                    <Input
                      id="new-license-devices"
                      name="maxDevices"
                      type="number"
                      defaultValue="1"
                      min="1"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="new-license-discount">Sconto %</Label>
                    <Input
                      id="new-license-discount"
                      name="discount"
                      type="number"
                      step="0.01"
                      defaultValue="0"
                      min="0"
                      max="100"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button 
                    type="button"
                    variant="outline" 
                    onClick={() => setIsNewLicenseModalOpen(false)}
                  >
                    Annulla
                  </Button>
                  <Button type="submit" className="bg-primary hover:bg-blue-700">
                    <i className="fas fa-save mr-2"></i>
                    Crea Licenza
                  </Button>
                </div>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
