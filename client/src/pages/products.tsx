import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/layout/sidebar";
import TopBar from "@/components/layout/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ProductsPage() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && !user) {
      setLocation('/login');
    }
  }, [user, loading, setLocation]);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['/api/products'],
    enabled: !!user,
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
            <Button className="bg-primary hover:bg-blue-700">
              <i className="fas fa-plus mr-2"></i>
              Nuovo Prodotto
            </Button>
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
                        <Button variant="outline" size="sm">
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
                <Button className="bg-primary hover:bg-blue-700">
                  <i className="fas fa-plus mr-2"></i>
                  Crea Primo Prodotto
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}