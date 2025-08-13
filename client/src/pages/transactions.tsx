
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
  client_name?: string;
  client_email?: string;
  license_key?: string;
  type: string;
  amount: number;
  discount: number;
  finalAmount?: number;
  final_amount?: number;
  paymentMethod?: string;
  status: string;
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
  const { data: transactions = [], isLoading: transactionsLoading, error: transactionsError } = useQuery({
    queryKey: ['/api/transactions'],
    queryFn: () => apiRequest('GET', '/api/transactions'),
    enabled: !!user,
  });

  const { data: companies = [] } = useQuery({
    queryKey: ['/api/companies'],
    queryFn: () => apiRequest('GET', '/api/companies'),
    enabled: !!user,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['/api/clients'],
    queryFn: () => apiRequest('GET', '/api/clients'),
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

  // Helper functions
  const getStatusBadge = (status: string) => {
    const statusConfig: { [key: string]: { variant: any; label: string } } = {
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

  const handleMarkAsPaid = (transaction: Transaction) => {
    updateStatusMutation.mutate({
      id: transaction.id,
      status: 'manual_paid',
      paymentMethod: 'manual'
    });
  };

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
      const client = clients.find((c: Client) => c.id === transaction.clientId);
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
    ? clients
    : clients.filter((c: Client) => c.companyId === selectedCompany || c.company_id === selectedCompany);

  // Calculate statistics
  const totalRevenue = filteredTransactions.reduce((sum: number, t: Transaction) => {
    const finalAmount = t.final_amount || t.finalAmount || ((t.amount || 0) - (t.discount || 0));
    return sum + Number(finalAmount);
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
                      {companies.map((company: Company) => (
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
                      <SelectItem value="completed">Completato</SelectItem>
                      <SelectItem value="manual_paid">Pagato Manualmente</SelectItem>
                      <SelectItem value="pending">In Attesa</SelectItem>
                      <SelectItem value="in_sospeso">In Sospeso</SelectItem>
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
                        const finalAmount = transaction.final_amount || transaction.finalAmount || 
                                          ((transaction.amount || 0) - (transaction.discount || 0));
                        
                        return (
                          <TableRow key={transaction.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{transaction.client_name || 'N/A'}</div>
                                <div className="text-sm text-gray-500">{transaction.client_email || ''}</div>
                              </div>
                            </TableCell>
                            <TableCell className="capitalize">{transaction.type}</TableCell>
                            <TableCell>€{transaction.amount?.toFixed(2) || '0.00'}</TableCell>
                            <TableCell>€{transaction.discount?.toFixed(2) || '0.00'}</TableCell>
                            <TableCell className="font-medium">€{Number(finalAmount).toFixed(2)}</TableCell>
                            <TableCell>{getStatusBadge(transaction.status)}</TableCell>
                            <TableCell>{new Date(transaction.createdAt).toLocaleDateString('it-IT')}</TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                {(transaction.status === 'pending' || transaction.status === 'in_sospeso') && (
                                  <Button
                                    size="sm"
                                    onClick={() => setSelectedTransaction(transaction)}
                                    data-testid={`button-mark-paid-${transaction.id}`}
                                  >
                                    Marca come Pagato
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

          {/* Mark as Paid Dialog */}
          <Dialog open={!!selectedTransaction} onOpenChange={() => setSelectedTransaction(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Conferma Pagamento</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p>
                  Sei sicuro di voler contrassegnare questa transazione come pagata manualmente?
                </p>
                {selectedTransaction && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div><strong>Cliente:</strong> {selectedTransaction.client_name || 'N/A'}</div>
                    <div><strong>Importo:</strong> €{Number(selectedTransaction.final_amount || selectedTransaction.finalAmount || 0).toFixed(2)}</div>
                    <div><strong>Tipo:</strong> {selectedTransaction.type}</div>
                  </div>
                )}
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setSelectedTransaction(null)}>
                    Annulla
                  </Button>
                  <Button
                    onClick={() => selectedTransaction && handleMarkAsPaid(selectedTransaction)}
                    disabled={updateStatusMutation.isPending}
                    data-testid="button-confirm-mark-paid"
                  >
                    {updateStatusMutation.isPending ? 'Salvando...' : 'Conferma Pagamento'}
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
