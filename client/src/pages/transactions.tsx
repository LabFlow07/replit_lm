
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Sidebar from '../components/layout/sidebar';
import TopBar from '../components/layout/topbar';
import { useSidebar } from '../contexts/SidebarContext';
import { useAuth } from '../hooks/use-auth';
import { apiRequest } from '../lib/api';
import { useToast } from '../hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Label } from '../components/ui/label';

interface Transaction {
  id: string;
  licenseId: string;
  clientId: string;
  companyId?: string;
  client_name?: string;
  client_email?: string;
  company_name?: string;
  license_key?: string;
  type: string;
  amount: number;
  discount: number;
  finalAmount?: number;
  final_amount?: number;
  paymentMethod?: string;
  status: string; // in_attesa, contanti, bonifico, carta_di_credito, dall_agente, dal_rivenditore, gratis, altro
  paymentLink?: string;
  paymentDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface Company {
  id: string;
  name: string;
  type: string;
  parentId?: string;
  parent_id?: string;
}

interface Client {
  id: string;
  name: string;
  email: string;
  companyId?: string;
  company_id?: string;
}

export function TransactionsPage() {
  const { collapsed } = useSidebar();
  const contentMargin = collapsed ? 'ml-16' : 'ml-64';
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State variables - ensure these are always called in the same order
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [selectedClient, setSelectedClient] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  // Always call all hooks before any conditional returns
  const { data: transactionsData, isLoading: transactionsLoading, error: transactionsError } = useQuery({
    queryKey: ['/api/transactions'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/transactions');
      return response.json();
    },
    enabled: !!user
  });

  const { data: companies = [] } = useQuery({
    queryKey: ['/api/companies'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/companies');
      return response.json();
    },
    enabled: !!user,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['/api/clients'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/clients');
      return response.json();
    },
    enabled: !!user,
  });

  // Update transaction status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async (data: { id: string; status: string; paymentMethod?: string }) => {
      return apiRequest('PATCH', `/api/transactions/${data.id}/status`, {
        status: data.status,
        paymentMethod: data.paymentMethod
      });
    },
    onSuccess: () => {
      toast({
        title: "Stato aggiornato",
        description: "Lo stato del pagamento è stato aggiornato con successo.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      setSelectedTransaction(null);
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Errore durante l'aggiornamento dello stato.",
        variant: "destructive",
      });
    }
  });

  // Generate payment link mutation
  const generateLinkMutation = useMutation({
    mutationFn: async (transactionId: string) => {
      return apiRequest('POST', `/api/transactions/${transactionId}/payment-link`);
    },
    onSuccess: (data) => {
      toast({
        title: "Link generato",
        description: "Link di pagamento generato con successo.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Errore durante la generazione del link.",
        variant: "destructive",
      });
    }
  });

  // Now handle conditional returns after all hooks are called
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

  if (transactionsError) {
    console.error('Error loading transactions:', transactionsError);
  }

  // Debug logging (minimal)
  if (transactionsError) {
    console.log('Transactions error:', transactionsError);
  }

  // Helper functions
  const getStatusBadge = (status: string) => {
    const statusConfig: { [key: string]: { variant: any; label: string } } = {
      'in_attesa': { variant: 'secondary', label: 'In Attesa' },
      'contanti': { variant: 'default', label: 'Contanti' },
      'bonifico': { variant: 'default', label: 'Bonifico' },
      'carta_di_credito': { variant: 'default', label: 'Carta di Credito' },
      'dall_agente': { variant: 'default', label: 'Dall\'Agente' },
      'dal_rivenditore': { variant: 'default', label: 'Dal Rivenditore' },
      'gratis': { variant: 'outline', label: 'Gratis' },
      'altro': { variant: 'secondary', label: 'Altro' },
      // Legacy statuses for backwards compatibility
      'completed': { variant: 'default', label: 'Completato' },
      'manual_paid': { variant: 'default', label: 'Pagato Manualmente' },
      'pending': { variant: 'secondary', label: 'In Attesa' },
      'in_sospeso': { variant: 'secondary', label: 'In Sospeso' },
      'failed': { variant: 'destructive', label: 'Fallito' },
      'cancelled': { variant: 'outline', label: 'Annullato' }
    };

    const config = statusConfig[status] || { variant: 'outline', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const generateReport = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "ID,Cliente,Tipo,Importo,Sconto,Importo Finale,Metodo Pagamento,Stato,Data Creazione\n"
      + filteredTransactions.map(t => 
          `${t.id},${t.client_name || 'N/A'},${t.type},${t.amount},${t.discount || 0},${t.final_amount || t.finalAmount || 0},${t.paymentMethod || 'N/A'},${t.status},${new Date(t.createdAt).toLocaleDateString()}`
        ).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `transazioni_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Simplified payment status update - no extra state needed

  // Ensure all data is always arrays - handle case where API returns empty object due to auth issues
  const transactions = Array.isArray(transactionsData) ? transactionsData : [];
  const safeClients = Array.isArray(clients) ? clients : [];
  const safeCompanies = Array.isArray(companies) ? companies : [];

  // Debug logging for transactions
  console.log('Transactions received from API:', transactions.length, transactions.map(t => ({
    id: t.id,
    amount: t.amount,
    discount: t.discount,
    final_amount: t.final_amount,
    client_name: t.client_name,
    license_key: t.license_key
  })));

  // Filter transactions based on selections
  const filteredTransactions = transactions.filter((transaction: Transaction) => {
    // First, check if transaction has required data to avoid rendering errors
    if (!transaction || !transaction.id) {
      return false;
    }

    if (statusFilter !== 'all' && transaction.status !== statusFilter) {
      return false;
    }
    
    if (selectedCompany !== 'all') {
      // Find client for this transaction
      const client = safeClients.find((c: Client) => c.id === transaction.clientId);
      if (!client) return false;
      
      const clientCompanyId = client.companyId || client.company_id;
      if (clientCompanyId !== selectedCompany) return false;
    }
    
    if (selectedClient !== 'all' && transaction.clientId !== selectedClient) {
      return false;
    }
    
    return true;
  });

  // Filter clients based on selected company
  const filteredClients = selectedCompany === 'all'
    ? safeClients
    : safeClients.filter((c: Client) => c.companyId === selectedCompany || c.company_id === selectedCompany);

  // Calculate statistics - always use final_amount from database
  const totalRevenue = filteredTransactions.reduce((sum: number, t: Transaction) => {
    const finalAmount = parseFloat(t.final_amount || t.finalAmount || '0');
    console.log('Revenue calculation for transaction:', t.id, 'final_amount:', finalAmount);
    return sum + finalAmount;
  }, 0);
  
  const completedTransactions = filteredTransactions.filter((t: Transaction) => 
    t.status === 'completed' || t.status === 'manual_paid'
  );
  
  const pendingTransactions = filteredTransactions.filter((t: Transaction) => 
    t.status === 'pending' || t.status === 'in_sospeso'
  );
  
  const failedTransactions = filteredTransactions.filter((t: Transaction) => 
    t.status === 'failed'
  );

  return (
    <div className="min-h-screen flex bg-surface">
      <Sidebar />

      <main className={`flex-1 ${contentMargin} bg-surface transition-all duration-300 ease-in-out`}>
        <TopBar />

        <div className="p-6 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestione Transazioni</h1>
              <p className="text-gray-600">Visualizza e monitora tutte le transazioni del sistema</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={generateReport} variant="outline" data-testid="button-generate-report">
                <i className="fas fa-download mr-2"></i>
                Genera Report
              </Button>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ricavi Totali</CardTitle>
                <i className="fas fa-euro-sign h-4 w-4 text-muted-foreground"></i>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">€{totalRevenue.toFixed(2)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pagamenti Completati</CardTitle>
                <i className="fas fa-check-circle h-4 w-4 text-muted-foreground"></i>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{completedTransactions.length}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">In Attesa</CardTitle>
                <i className="fas fa-clock h-4 w-4 text-muted-foreground"></i>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pendingTransactions.length}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Falliti</CardTitle>
                <i className="fas fa-exclamation-triangle h-4 w-4 text-muted-foreground"></i>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{failedTransactions.length}</div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Filtri</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company-filter">Azienda</Label>
                  <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                    <SelectTrigger data-testid="select-company-filter">
                      <SelectValue placeholder="Tutte le aziende" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tutte le aziende</SelectItem>
                      {safeCompanies.map((company: Company) => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="client-filter">Cliente</Label>
                  <Select value={selectedClient} onValueChange={setSelectedClient}>
                    <SelectTrigger data-testid="select-client-filter">
                      <SelectValue placeholder="Tutti i clienti" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tutti i clienti</SelectItem>
                      {filteredClients.map((client: Client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status-filter">Stato</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger data-testid="select-status-filter">
                      <SelectValue placeholder="Tutti gli stati" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tutti gli stati</SelectItem>
                      <SelectItem value="in_attesa">In Attesa</SelectItem>
                      <SelectItem value="contanti">Contanti</SelectItem>
                      <SelectItem value="bonifico">Bonifico</SelectItem>
                      <SelectItem value="carta_di_credito">Carta di Credito</SelectItem>
                      <SelectItem value="dall_agente">Dall'Agente</SelectItem>
                      <SelectItem value="dal_rivenditore">Dal Rivenditore</SelectItem>
                      <SelectItem value="gratis">Gratis</SelectItem>
                      <SelectItem value="altro">Altro</SelectItem>
                      <SelectItem value="failed">Fallito</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>&nbsp;</Label>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setSelectedCompany('all');
                      setSelectedClient('all');
                      setStatusFilter('all');
                    }}
                    className="w-full"
                  >
                    Pulisci Filtri
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Transactions Table */}
          <Card>
            <CardHeader>
              <CardTitle>Transazioni ({filteredTransactions.length})</CardTitle>
              <CardDescription>
                Lista di tutte le transazioni del sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              {transactionsLoading ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : transactionsError ? (
                <div className="text-center py-8">
                  <p className="text-red-500">Errore nel caricamento delle transazioni: {transactionsError.message}</p>
                  <Button 
                    variant="outline" 
                    onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/transactions'] })}
                    className="mt-2"
                  >
                    Riprova
                  </Button>
                </div>
              ) : filteredTransactions.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">Nessuna transazione trovata con i filtri selezionati</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Azienda</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Importo</TableHead>
                        <TableHead>Sconto</TableHead>
                        <TableHead>Totale</TableHead>
                        <TableHead>Stato</TableHead>
                        <TableHead>Data Creazione</TableHead>
                        <TableHead>Azioni</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTransactions.map((transaction) => {
                        // Always use final_amount from database, never recalculate
                        const amount = parseFloat(transaction.amount || '0');
                        const discount = parseFloat(transaction.discount || '0');
                        const finalAmount = parseFloat(transaction.final_amount || transaction.finalAmount || '0');
                        
                        console.log('Transaction display:', {
                          id: transaction.id,
                          amount: amount,
                          discount: discount,
                          finalAmount: finalAmount,
                          status: transaction.status,
                          client: transaction.client_name
                        });
                        
                        return (
                          <TableRow key={transaction.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{transaction.client_name || 'N/A'}</div>
                                <div className="text-sm text-gray-500">{transaction.client_email || ''}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="font-medium text-sm">{transaction.company_name || 'N/A'}</div>
                            </TableCell>
                            <TableCell className="capitalize">{transaction.type}</TableCell>
                            <TableCell>€{amount.toFixed(2)}</TableCell>
                            <TableCell>€{discount.toFixed(2)}</TableCell>
                            <TableCell className="font-medium">€{finalAmount.toFixed(2)}</TableCell>
                            <TableCell>{getStatusBadge(transaction.status)}</TableCell>
                            <TableCell>{new Date(transaction.createdAt).toLocaleDateString('it-IT')}</TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                {(transaction.status === 'pending' || transaction.status === 'in_sospeso' || transaction.status === 'in_attesa') && (
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      console.log('Opening transaction dialog for:', transaction.id, 'status:', transaction.status);
                                      setSelectedTransaction(transaction);
                                    }}
                                    data-testid={`button-update-status-${transaction.id}`}
                                  >
                                    Aggiorna Stato
                                  </Button>
                                )}
                                {/* Always show button for admins/superadmins to modify any transaction */}
                                {(user?.role === 'superadmin' || user?.role === 'admin') && 
                                 !(transaction.status === 'pending' || transaction.status === 'in_sospeso' || transaction.status === 'in_attesa') && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      console.log('Opening transaction dialog for:', transaction.id, 'status:', transaction.status);
                                      setSelectedTransaction(transaction);
                                    }}
                                    data-testid={`button-modify-status-${transaction.id}`}
                                  >
                                    Modifica Stato
                                  </Button>
                                )}
                                {transaction.paymentLink && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => window.open(transaction.paymentLink, '_blank')}
                                  >
                                    Link Pagamento
                                  </Button>
                                )}
                                {!transaction.paymentLink && transaction.status === 'pending' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => generateLinkMutation.mutate(transaction.id)}
                                    disabled={generateLinkMutation.isPending}
                                  >
                                    Genera Link
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Transaction Details Dialog */}
          <Dialog open={!!selectedTransaction} onOpenChange={() => setSelectedTransaction(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Dettagli Transazione</DialogTitle>
                <p className="text-sm text-muted-foreground">Visualizza e modifica i dettagli della transazione selezionata</p>
              </DialogHeader>
              <div className="space-y-4">
                {selectedTransaction && (
                  <>
                    <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                      <div><strong>Cliente:</strong> {selectedTransaction.client_name || 'N/A'}</div>
                      <div><strong>Email:</strong> {selectedTransaction.client_email || 'N/A'}</div>
                      <div><strong>Azienda:</strong> {selectedTransaction.company_name || 'N/A'}</div>
                      <div><strong>Licenza:</strong> {selectedTransaction.license_key || 'N/A'}</div>
                      <div><strong>Importo:</strong> €{parseFloat(selectedTransaction.amount || '0').toFixed(2)}</div>
                      <div><strong>Sconto:</strong> €{parseFloat(selectedTransaction.discount || '0').toFixed(2)}</div>
                      <div><strong>Importo Finale:</strong> €{parseFloat(selectedTransaction.final_amount || selectedTransaction.finalAmount || '0').toFixed(2)}</div>
                      <div><strong>Tipo:</strong> {selectedTransaction.type}</div>
                      <div><strong>Metodo Pagamento:</strong> {selectedTransaction.paymentMethod || 'N/A'}</div>
                      <div><strong>Stato Attuale:</strong> {getStatusBadge(selectedTransaction.status)}</div>
                      <div><strong>Data Creazione:</strong> {new Date(selectedTransaction.createdAt).toLocaleString('it-IT')}</div>
                      {selectedTransaction.paymentDate && (
                        <div><strong>Data Pagamento:</strong> {new Date(selectedTransaction.paymentDate).toLocaleString('it-IT')}</div>
                      )}
                      {selectedTransaction.notes && (
                        <div><strong>Note:</strong> {selectedTransaction.notes}</div>
                      )}
                    </div>

                    {/* Payment Status Update Section */}
                    {(user?.role === 'superadmin' || user?.role === 'admin') && (
                      <div className="border-t pt-4 space-y-4">
                        <h4 className="font-medium text-lg">Aggiorna Stato Pagamento</h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="payment-status">Nuovo Stato</Label>
                            <Select
                              value={selectedTransaction.status}
                              onValueChange={(value) => {
                                setSelectedTransaction({
                                  ...selectedTransaction,
                                  status: value
                                });
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="in_attesa">In Attesa</SelectItem>
                                <SelectItem value="contanti">Contanti</SelectItem>
                                <SelectItem value="bonifico">Bonifico</SelectItem>
                                <SelectItem value="carta_di_credito">Carta di Credito</SelectItem>
                                <SelectItem value="dall_agente">Dall'Agente</SelectItem>
                                <SelectItem value="dal_rivenditore">Dal Rivenditore</SelectItem>
                                <SelectItem value="gratis">Gratis</SelectItem>
                                <SelectItem value="altro">Altro</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="payment-method">Metodo Pagamento (Opzionale)</Label>
                            <Select
                              value={selectedTransaction.paymentMethod || 'nessuno'}
                              onValueChange={(value) => {
                                setSelectedTransaction({
                                  ...selectedTransaction,
                                  paymentMethod: value === 'nessuno' ? null : value
                                });
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Seleziona metodo" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="nessuno">Nessuno</SelectItem>
                                <SelectItem value="contanti">Contanti</SelectItem>
                                <SelectItem value="bonifico">Bonifico Bancario</SelectItem>
                                <SelectItem value="carta_di_credito">Carta di Credito</SelectItem>
                                <SelectItem value="paypal">PayPal</SelectItem>
                                <SelectItem value="stripe">Stripe</SelectItem>
                                <SelectItem value="assegno">Assegno</SelectItem>
                                <SelectItem value="altro">Altro</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Save Button */}
                        <div className="flex justify-start">
                          <Button
                            onClick={() => {
                              console.log('Saving payment status:', selectedTransaction.status, 'method:', selectedTransaction.paymentMethod);
                              updateStatusMutation.mutate({
                                id: selectedTransaction.id,
                                status: selectedTransaction.status,
                                paymentMethod: selectedTransaction.paymentMethod
                              });
                            }}
                            disabled={updateStatusMutation.isPending}
                            className="bg-primary hover:bg-primary/90"
                          >
                            {updateStatusMutation.isPending ? 'Salvando...' : 'Salva Modifiche'}
                          </Button>
                        </div>

                        {/* Quick Actions */}
                        <div className="flex gap-2 flex-wrap">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateStatusMutation.mutate({
                              id: selectedTransaction.id,
                              status: 'contanti',
                              paymentMethod: 'contanti'
                            })}
                            disabled={updateStatusMutation.isPending}
                          >
                            Segna come Pagato (Contanti)
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateStatusMutation.mutate({
                              id: selectedTransaction.id,
                              status: 'bonifico',
                              paymentMethod: 'bonifico'
                            })}
                            disabled={updateStatusMutation.isPending}
                          >
                            Segna come Pagato (Bonifico)
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateStatusMutation.mutate({
                              id: selectedTransaction.id,
                              status: 'gratis',
                              paymentMethod: 'gratis'
                            })}
                            disabled={updateStatusMutation.isPending}
                          >
                            Segna come Gratis
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
                
                <div className="flex justify-end gap-2 border-t pt-4">
                  {selectedTransaction && !selectedTransaction.paymentLink && 
                   (selectedTransaction.status === 'in_attesa' || selectedTransaction.status === 'pending') && 
                   (user?.role === 'superadmin' || user?.role === 'admin') && (
                    <Button
                      variant="outline"
                      onClick={() => generateLinkMutation.mutate(selectedTransaction.id)}
                      disabled={generateLinkMutation.isPending}
                    >
                      Genera Link Pagamento
                    </Button>
                  )}
                  <Button onClick={() => setSelectedTransaction(null)}>
                    Chiudi
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </main>
    </div>
  );
}

export default TransactionsPage;
