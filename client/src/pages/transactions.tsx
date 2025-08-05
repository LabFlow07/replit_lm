import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import Sidebar from "@/components/layout/sidebar";
import TopBar from "@/components/layout/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

export default function TransactionsPage() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

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

  // Mock data for demo
  const transactions = [
    {
      id: '1',
      type: 'attivazione',
      amount: 1500,
      paymentMethod: 'Carta di Credito',
      status: 'completed',
      createdAt: new Date().toISOString(),
      licenseKey: 'LIC-2024-ACTIVE-001'
    },
    {
      id: '2',
      type: 'rinnovo',
      amount: 750,
      paymentMethod: 'Bonifico',
      status: 'pending',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      licenseKey: 'LIC-2024-RENEW-002'
    }
  ];

  const getStatusBadge = (status: string) => {
    const variants = {
      'completed': 'default',
      'pending': 'outline',
      'failed': 'destructive'
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'}>
        {status === 'completed' ? 'Completata' : 
         status === 'pending' ? 'In Sospeso' : 
         status === 'failed' ? 'Fallita' : status}
      </Badge>
    );
  };

  const handleDeleteTransaction = (id: string) => {
    console.log(`Deleting transaction: ${id}`);
    // In a real app, you would call an API here to delete the transaction
    // For now, we'll just log it and potentially remove it from the mock data if needed for state management
  };

  return (
    <div className="min-h-screen flex bg-surface">
      <Sidebar />

      <main className="flex-1 ml-64 bg-surface">
        <TopBar />

        <div className="p-6 space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestione Transazioni</h1>
            <p className="text-gray-600">Visualizza e monitora tutte le transazioni del sistema</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Fatturato Totale</p>
                    <p className="text-2xl font-bold text-gray-900">€2.250</p>
                  </div>
                  <div className="w-10 h-10 bg-secondary bg-opacity-10 rounded-lg flex items-center justify-center">
                    <i className="fas fa-euro-sign text-secondary"></i>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Transazioni Oggi</p>
                    <p className="text-2xl font-bold text-gray-900">12</p>
                  </div>
                  <div className="w-10 h-10 bg-primary bg-opacity-10 rounded-lg flex items-center justify-center">
                    <i className="fas fa-chart-line text-primary"></i>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">In Sospeso</p>
                    <p className="text-2xl font-bold text-gray-900">3</p>
                  </div>
                  <div className="w-10 h-10 bg-accent bg-opacity-10 rounded-lg flex items-center justify-center">
                    <i className="fas fa-clock text-accent"></i>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Fallite</p>
                    <p className="text-2xl font-bold text-gray-900">1</p>
                  </div>
                  <div className="w-10 h-10 bg-error bg-opacity-10 rounded-lg flex items-center justify-center">
                    <i className="fas fa-times text-error"></i>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Elenco Transazioni</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Licenza</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Importo</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Metodo</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stato</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                      {user.role === 'superadmin' && (
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Azioni</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {transactions.map((transaction) => (
                      <tr key={transaction.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          #{transaction.id.padStart(6, '0')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {transaction.type}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                          {transaction.licenseKey}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                          €{transaction.amount.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {transaction.paymentMethod}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(transaction.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(transaction.createdAt).toLocaleDateString('it-IT')}
                        </td>
                        {user.role === 'superadmin' && (
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteTransaction(transaction.id)}
                              className="text-red-600 hover:text-red-800"
                              title="Cancella transazione"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}