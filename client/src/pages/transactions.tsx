import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import Sidebar from "@/components/layout/sidebar";
import { useSidebar } from "@/contexts/SidebarContext";
import TopBar from "@/components/layout/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Trash2 } from "lucide-react";

interface Transaction {
  id: string;
  licenseId: string;
  clientId: string;
  type: string;
  amount: number;
  discount: number;
  finalAmount: number;
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
  parentId: string;
}

interface Client {
  id: string;
  name: string;
  email: string;
  companyId: string;
  company_id: string;
}

export default function TransactionsPage() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const { contentMargin } = useSidebar();
  const { toast } = useToast();
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [selectedClient, setSelectedClient] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      setLocation('/login');
    }
  }, [user, loading, setLocation]);

  // Fetch transactions with filters
  const { data: transactions = [], isLoading: transactionsLoading } = useQuery({
    queryKey: ['/api/transactions', selectedCompany, selectedClient, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCompany !== 'all') params.append('companyId', selectedCompany);
      if (selectedClient !== 'all') params.append('clientId', selectedClient);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      
      const response = await fetch(`/api/transactions?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('qlm_token')}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch transactions');
      }
      return response.json();
    },
    enabled: !!user
  });

  // Fetch companies for filtering
  const { data: companies = [] } = useQuery({
    queryKey: ['/api/companies'],
    queryFn: async () => {
      const response = await fetch('/api/companies', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('qlm_token')}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch companies');
      }
      return response.json();
    },
    enabled: !!user
  });

  // Fetch clients for filtering
  const { data: clients = [] } = useQuery({
    queryKey: ['/api/clients'],
    queryFn: async () => {
      const response = await fetch('/api/clients', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('qlm_token')}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch clients');
      }
      return response.json();
    },
    enabled: !!user
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
      
      // Copy link to clipboard
      if (data.paymentLink) {
        navigator.clipboard.writeText(data.paymentLink);
        toast({
          title: "Link copiato",
          description: "Il link di pagamento è stato copiato negli appunti.",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Errore durante la generazione del link.",
        variant: "destructive",
      });
    }
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-100 text-green-800">Completato</Badge>;
      case 'manual_paid':
        return <Badge variant="default" className="bg-blue-100 text-blue-800">Pagato Manualmente</Badge>;
      case 'pending':
        return <Badge variant="destructive">In Attesa</Badge>;
      case 'failed':
        return <Badge variant="destructive">Fallito</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'attivazione':
        return <Badge variant="default">Attivazione</Badge>;
      case 'rinnovo':
        return <Badge variant="secondary">Rinnovo</Badge>;
      case 'posticipato':
        return <Badge variant="outline">Posticipato</Badge>;
      default:
        return <Badge variant="secondary">{type}</Badge>;
    }
  };

  const generateReport = () => {
    // Create a simple CSV report
    const headers = ['Data', 'Cliente', 'Tipo', 'Importo', 'Sconto', 'Totale', 'Stato', 'Metodo Pagamento'];
    const csvData = transactions.map((t: Transaction) => {
      const client = clients.find((c: Client) => c.id === t.clientId);
      return [
        t.createdAt ? format(new Date(t.createdAt), 'dd/MM/yyyy', { locale: it }) : 'N/A',
        client?.name || 'N/A',
        t.type,
        `€${t.amount}`,
        `€${t.discount || 0}`,
        `€${t.finalAmount}`,
        t.status,
        t.paymentMethod || 'N/A'
      ].join(',');
    });

    const csv = [headers.join(','), ...csvData].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report-transazioni-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast({
      title: "Report generato",
      description: "Il report delle transazioni è stato scaricato.",
    });
  };

  // Delete transaction mutation
  const deleteTransactionMutation = useMutation({
    mutationFn: async (transactionId: string) => {
      return apiRequest('DELETE', `/api/transactions/${transactionId}`);
    },
    onSuccess: () => {
      toast({
        title: "Transazione eliminata",
        description: "La transazione è stata eliminata con successo.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Errore durante l'eliminazione della transazione.",
        variant: "destructive",
      });
    }
  });



  const handleDeleteTransaction = (id: string) => {
    deleteTransactionMutation.mutate(id);
  };

  // Filter clients based on selected company
  const filteredClients = selectedCompany === 'all' 
    ? clients 
    : clients.filter((c: Client) => c.companyId === selectedCompany || c.company_id === selectedCompany);

  // Calculate statistics
  const totalRevenue = transactions.reduce((sum: number, t: Transaction) => sum + Number(t.finalAmount || 0), 0);
  const completedTransactions = transactions.filter((t: Transaction) => t.status === 'completed' || t.status === 'manual_paid');
  const pendingTransactions = transactions.filter((t: Transaction) => t.status === 'pending');
  const failedTransactions = transactions.filter((t: Transaction) => t.status === 'failed');

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
                      <SelectItem value="pending">In Attesa</SelectItem>
                      <SelectItem value="completed">Completato</SelectItem>
                      <SelectItem value="manual_paid">Pagato Manualmente</SelectItem>
                      <SelectItem value="failed">Fallito</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>&nbsp;</Label>
                  <Button 
                    onClick={() => {
                      setSelectedCompany('all');
                      setSelectedClient('all');
                      setStatusFilter('all');
                    }}
                    variant="outline"
                    className="w-full"
                    data-testid="button-reset-filters"
                  >
                    Reset Filtri
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Fatturato Totale</p>
                    <p className="text-2xl font-bold text-gray-900">€{totalRevenue.toFixed(2)}</p>
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
                    <p className="text-sm font-medium text-gray-600">Completate</p>
                    <p className="text-2xl font-bold text-gray-900">{completedTransactions.length}</p>
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
                    <p className="text-2xl font-bold text-gray-900">{pendingTransactions.length}</p>
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
                    <p className="text-2xl font-bold text-gray-900">{failedTransactions.length}</p>
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
              <p className="text-sm text-muted-foreground">
                {transactions.length} transazion{transactions.length !== 1 ? 'i' : 'e'} trovate
              </p>
            </CardHeader>
            <CardContent>
              {transactionsLoading ? (
                <div className="flex items-center justify-center p-8">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-label="Loading"/>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Importo</TableHead>
                      <TableHead>Sconto</TableHead>
                      <TableHead>Totale</TableHead>
                      <TableHead>Stato</TableHead>
                      <TableHead>Azioni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((transaction: Transaction) => {
                      const client = clients.find((c: Client) => c.id === transaction.clientId);
                      return (
                        <TableRow key={transaction.id}>
                          <TableCell data-testid={`text-date-${transaction.id}`}>
                            {transaction.createdAt ? format(new Date(transaction.createdAt), 'dd/MM/yyyy HH:mm', { locale: it }) : 'N/A'}
                          </TableCell>
                          <TableCell data-testid={`text-client-${transaction.id}`}>
                            {client?.name || 'N/A'}
                          </TableCell>
                          <TableCell data-testid={`badge-type-${transaction.id}`}>
                            {getTypeBadge(transaction.type)}
                          </TableCell>
                          <TableCell data-testid={`text-amount-${transaction.id}`}>
                            €{Number(transaction.amount).toFixed(2)}
                          </TableCell>
                          <TableCell data-testid={`text-discount-${transaction.id}`}>
                            €{Number(transaction.discount || 0).toFixed(2)}
                          </TableCell>
                          <TableCell data-testid={`text-final-amount-${transaction.id}`}>
                            <span className="font-medium">
                              €{Number(transaction.finalAmount).toFixed(2)}
                            </span>
                          </TableCell>
                          <TableCell data-testid={`badge-status-${transaction.id}`}>
                            {getStatusBadge(transaction.status)}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              {transaction.status === 'pending' && (user.role === 'superadmin' || user.role === 'admin') && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => generateLinkMutation.mutate(transaction.id)}
                                    disabled={generateLinkMutation.isPending}
                                    data-testid={`button-generate-link-${transaction.id}`}
                                  >
                                    <i className="fas fa-link mr-1"></i>
                                    Link
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setSelectedTransaction(transaction)}
                                    data-testid={`button-mark-paid-${transaction.id}`}
                                  >
                                    <i className="fas fa-check mr-1"></i>
                                    Pagato
                                  </Button>
                                </>
                              )}
                              {transaction.paymentLink && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    navigator.clipboard.writeText(transaction.paymentLink!);
                                    toast({
                                      title: "Link copiato",
                                      description: "Link di pagamento copiato negli appunti.",
                                    });
                                  }}
                                  data-testid={`button-copy-link-${transaction.id}`}
                                >
                                  <i className="fas fa-copy mr-1"></i>
                                </Button>
                              )}
                              {user.role === 'superadmin' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteTransaction(transaction.id)}
                                  className="text-red-600 hover:text-red-800"
                                  title="Cancella transazione"
                                  data-testid={`button-delete-${transaction.id}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Mark as Paid Dialog */}
          <Dialog open={!!selectedTransaction} onOpenChange={() => setSelectedTransaction(null)}>
            <DialogContent data-testid="dialog-mark-paid">
              <DialogHeader>
                <DialogTitle>Segna come Pagato</DialogTitle>
                <DialogDescription>
                  Conferma il pagamento manuale per questa transazione
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="payment-method">Metodo di Pagamento</Label>
                  <Select defaultValue="bonifico" onValueChange={(value) => {
                    if (selectedTransaction) {
                      setSelectedTransaction({ ...selectedTransaction, paymentMethod: value });
                    }
                  }}>
                    <SelectTrigger data-testid="select-payment-method">
                      <SelectValue placeholder="Seleziona metodo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bonifico">Bonifico Bancario</SelectItem>
                      <SelectItem value="contanti">Contanti</SelectItem>
                      <SelectItem value="assegno">Assegno</SelectItem>
                      <SelectItem value="carta">Carta di Credito</SelectItem>
                      <SelectItem value="altro">Altro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setSelectedTransaction(null)}
                    variant="outline"
                    className="flex-1"
                    data-testid="button-cancel-mark-paid"
                  >
                    Annulla
                  </Button>
                  <Button
                    onClick={() => {
                      if (selectedTransaction) {
                        updateStatusMutation.mutate({
                          id: selectedTransaction.id,
                          status: 'manual_paid',
                          paymentMethod: selectedTransaction.paymentMethod || 'bonifico'
                        });
                      }
                    }}
                    disabled={updateStatusMutation.isPending}
                    className="flex-1"
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