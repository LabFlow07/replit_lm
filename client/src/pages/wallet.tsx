import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { useLocation } from 'wouter';
import Sidebar from '@/components/layout/sidebar';
import TopBar from '@/components/layout/topbar';
import { useSidebar } from '@/contexts/SidebarContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Wallet, CreditCard, ArrowUpDown, ArrowDown, ArrowUp, Euro, Users } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY!);

// Stripe Payment Form Component
function StripePaymentForm({ amount, companyId, onSuccess }: { 
  amount: number; 
  companyId: string; 
  onSuccess: () => void; 
}) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/wallet?payment=success`,
        },
        redirect: 'if_required',
      });

      if (error) {
        toast({
          title: "Pagamento fallito",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Pagamento completato",
          description: `Ricarica di ${amount} crediti completata con successo!`,
        });
        onSuccess();
      }
    } catch (error) {
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante il pagamento",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      <Button 
        type="submit" 
        disabled={!stripe || isProcessing}
        className="w-full"
      >
        {isProcessing ? 'Elaborazione...' : `Paga ${amount} €`}
      </Button>
    </form>
  );
}

function WalletContent() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [transferData, setTransferData] = useState({
    fromCompanyId: '',
    toCompanyId: '',
    amount: ''
  });

  // Get user data from auth context
  const userCompanyId = user?.companyId;
  const userRole = user?.role;

  // Fetch companies for admin/superadmin
  const { data: companies = [] } = useQuery({
    queryKey: ['/api/companies'],
    enabled: !!user && (userRole === 'superadmin' || userRole === 'admin'),
    retry: 1
  });

  // Fetch wallet for selected company or user's company
  const activeCompanyId = userRole === 'superadmin' ? selectedCompanyId : userCompanyId;
  const { data: walletData, isLoading: walletLoading } = useQuery({
    queryKey: ['/api/wallet', activeCompanyId],
    enabled: !!user && !!activeCompanyId,
    retry: 1
  });

  // Extract wallet and transactions from response
  const wallet = walletData?.wallet || {};
  const transactions = walletData?.transactions || [];

  // Fetch all wallets for superadmin
  const { data: allWallets = [] } = useQuery({
    queryKey: ['/api/wallets'],
    enabled: !!user && userRole === 'superadmin',
    retry: 1
  });

  // State for Stripe payment
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [showStripeForm, setShowStripeForm] = useState(false);

  // Create payment intent mutation
  const createPaymentIntentMutation = useMutation({
    mutationFn: (data: { companyId: string; amount: number }) =>
      apiRequest('POST', `/api/wallet/${data.companyId}/create-payment-intent`, { amount: data.amount }),
    onSuccess: (response: any) => {
      setClientSecret(response.clientSecret);
      setPaymentIntentId(response.paymentIntentId);
      setShowStripeForm(true);
    },
    onError: (error: any) => {
      toast({
        title: 'Errore creazione pagamento',
        description: error.message || 'Errore durante la creazione del pagamento',
        variant: 'destructive'
      });
    }
  });

  // Legacy recharge wallet mutation (for testing)
  const rechargeMutation = useMutation({
    mutationFn: (data: { companyId: string; amount: number }) =>
      apiRequest('POST', `/api/wallet/${data.companyId}/recharge`, { amount: data.amount }),
    onSuccess: () => {
      toast({ title: 'Ricarica completata', description: 'I crediti sono stati aggiunti al wallet' });
      queryClient.invalidateQueries({ queryKey: ['/api/wallet'] });
      setRechargeAmount('');
    },
    onError: (error: any) => {
      toast({
        title: 'Errore ricarica',
        description: error.message || 'Errore durante la ricarica del wallet',
        variant: 'destructive'
      });
    }
  });

  // Transfer credits mutation
  const transferMutation = useMutation({
    mutationFn: (data: { fromCompanyId: string; toCompanyId: string; amount: number }) =>
      apiRequest('POST', '/api/wallet/transfer', data),
    onSuccess: () => {
      toast({ title: 'Trasferimento completato', description: 'I crediti sono stati trasferiti con successo' });
      queryClient.invalidateQueries({ queryKey: ['/api/wallet'] });
      setTransferData({ fromCompanyId: '', toCompanyId: '', amount: '' });
    },
    onError: (error: any) => {
      toast({
        title: 'Errore trasferimento',
        description: error.message || 'Errore durante il trasferimento crediti',
        variant: 'destructive'
      });
    }
  });

  const handleRecharge = () => {
    const amount = parseFloat(rechargeAmount);
    if (!amount || amount <= 0) {
      toast({ title: 'Errore', description: 'Inserire un importo valido', variant: 'destructive' });
      return;
    }
    if (!activeCompanyId) {
      toast({ title: 'Errore', description: 'Selezionare un\'azienda', variant: 'destructive' });
      return;
    }
    // Use Stripe payment for real transactions
    createPaymentIntentMutation.mutate({ companyId: activeCompanyId, amount });
  };

  const handleStripePaymentSuccess = () => {
    setShowStripeForm(false);
    setClientSecret(null);
    setPaymentIntentId(null);
    setRechargeAmount('');
    queryClient.invalidateQueries({ queryKey: ['/api/wallet'] });
  };

  const handleTestRecharge = () => {
    const amount = parseFloat(rechargeAmount);
    if (!amount || amount <= 0) {
      toast({ title: 'Errore', description: 'Inserire un importo valido', variant: 'destructive' });
      return;
    }
    if (!activeCompanyId) {
      toast({ title: 'Errore', description: 'Selezionare un\'azienda', variant: 'destructive' });
      return;
    }
    // Use test/simulation for development
    rechargeMutation.mutate({ companyId: activeCompanyId, amount });
  };

  const handleTransfer = () => {
    const amount = parseFloat(transferData.amount);
    if (!amount || amount <= 0) {
      toast({ title: 'Errore', description: 'Inserire un importo valido', variant: 'destructive' });
      return;
    }
    if (!transferData.fromCompanyId || !transferData.toCompanyId) {
      toast({ title: 'Errore', description: 'Selezionare aziende di origine e destinazione', variant: 'destructive' });
      return;
    }
    transferMutation.mutate({
      fromCompanyId: transferData.fromCompanyId,
      toCompanyId: transferData.toCompanyId,
      amount
    });
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'ricarica': return <ArrowUp className="h-4 w-4 text-green-500" />;
      case 'spesa': return <ArrowDown className="h-4 w-4 text-red-500" />;
      case 'trasferimento_in': return <ArrowUp className="h-4 w-4 text-blue-500" />;
      case 'trasferimento_out': return <ArrowDown className="h-4 w-4 text-orange-500" />;
      default: return <ArrowUpDown className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTransactionBadgeVariant = (type: string) => {
    switch (type) {
      case 'ricarica': return 'default';
      case 'spesa': return 'destructive';
      case 'trasferimento_in': return 'secondary';
      case 'trasferimento_out': return 'outline';
      default: return 'secondary';
    }
  };

  // Filter companies for transfer (exclude parent companies from being destinations)
  const getTransferableCompanies = (isDestination: boolean) => {
    if (!companies) return [];
    if (userRole === 'admin' && userCompanyId) {
      // Admin can only transfer from their company to sub-companies
      if (isDestination) {
        // Show sub-companies only
        return companies.filter((c: any) => c.parent_id === userCompanyId);
      } else {
        // Show only their company as source
        return companies.filter((c: any) => c.id === userCompanyId);
      }
    }
    return companies;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">💳 Sistema Wallet Aziendale</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Gestisci crediti aziendali per rinnovi automatici delle licenze (1 credito = 1 euro)
          </p>
        </div>
      </div>

      {/* Company Selection for Superadmin */}
      {userRole === 'superadmin' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Seleziona Azienda
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleziona azienda per visualizzare il wallet" />
              </SelectTrigger>
              <SelectContent>
                {companies && Array.isArray(companies) && companies.map((company: any) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name} ({company.type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {/* Wallet Balance Card */}
      {wallet && (
        <Card className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-6 w-6" />
              Saldo Wallet Aziendale
            </CardTitle>
            <CardDescription className="text-blue-100">
              Crediti disponibili per rinnovi automatici
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold mb-4">
              {(wallet.balance || 0).toFixed(2)} crediti
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-blue-200">Totale Ricariche</p>
                <p className="font-semibold">{(wallet.totalRecharges || 0).toFixed(2)} crediti</p>
              </div>
              <div>
                <p className="text-blue-200">Totale Spese</p>
                <p className="font-semibold">{(wallet.totalSpent || 0).toFixed(2)} crediti</p>
              </div>
            </div>
            {wallet.lastRechargeDate && (
              <p className="text-blue-200 text-sm mt-2">
                Ultima ricarica: {format(new Date(wallet.lastRechargeDate), 'dd/MM/yyyy HH:mm', { locale: it })}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recharge Wallet */}
        {(userRole === 'admin' || userRole === 'superadmin') && activeCompanyId && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Ricarica Wallet
              </CardTitle>
              <CardDescription>
                Aggiungi crediti al wallet aziendale (preparazione per integrazione Stripe)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="recharge-amount">Importo (crediti)</Label>
                <Input
                  id="recharge-amount"
                  type="number"
                  min="1"
                  step="0.01"
                  value={rechargeAmount}
                  onChange={(e) => setRechargeAmount(e.target.value)}
                  placeholder="Es. 100.00"
                  data-testid="input-recharge-amount"
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={handleRecharge} 
                  disabled={createPaymentIntentMutation.isPending || !rechargeAmount}
                  className="flex-1"
                >
                  {createPaymentIntentMutation.isPending ? 'Creazione...' : 'Ricarica con Stripe'}
                </Button>
                <Button 
                  onClick={handleTestRecharge} 
                  disabled={rechargeMutation.isPending || !rechargeAmount}
                  variant="outline"
                  className="flex-1"
                  data-testid="button-test-recharge"
                >
                  {rechargeMutation.isPending ? 'Test...' : 'Ricarica Test'}
                </Button>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                💡 Usa "Ricarica con Stripe" per pagamenti reali o "Ricarica Test" per simulazioni.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Transfer Credits */}
        {(userRole === 'admin' || userRole === 'superadmin') && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowUpDown className="h-5 w-5" />
                Trasferisci Crediti
              </CardTitle>
              <CardDescription>
                Trasferisci crediti tra aziende madre e sotto-aziende
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="from-company">Azienda di origine</Label>
                <Select 
                  value={transferData.fromCompanyId} 
                  onValueChange={(value) => setTransferData({...transferData, fromCompanyId: value})}
                >
                  <SelectTrigger data-testid="select-from-company">
                    <SelectValue placeholder="Seleziona azienda origine" />
                  </SelectTrigger>
                  <SelectContent>
                    {getTransferableCompanies(false).map((company: any) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="to-company">Azienda di destinazione</Label>
                <Select 
                  value={transferData.toCompanyId} 
                  onValueChange={(value) => setTransferData({...transferData, toCompanyId: value})}
                >
                  <SelectTrigger data-testid="select-to-company">
                    <SelectValue placeholder="Seleziona azienda destinazione" />
                  </SelectTrigger>
                  <SelectContent>
                    {getTransferableCompanies(true).map((company: any) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="transfer-amount">Importo (crediti)</Label>
                <Input
                  id="transfer-amount"
                  type="number"
                  min="1"
                  step="0.01"
                  value={transferData.amount}
                  onChange={(e) => setTransferData({...transferData, amount: e.target.value})}
                  placeholder="Es. 50.00"
                  data-testid="input-transfer-amount"
                />
              </div>
              <Button 
                onClick={handleTransfer} 
                disabled={transferMutation.isPending || !transferData.amount}
                className="w-full"
                data-testid="button-transfer-credits"
              >
                {transferMutation.isPending ? 'Trasferimento...' : 'Trasferisci Crediti'}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Transaction History */}
      {transactions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Storico Transazioni Wallet</CardTitle>
            <CardDescription>
              Ultimi movimenti del wallet aziendale
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {transactions.map((transaction: any) => (
                <div 
                  key={transaction.id} 
                  className="flex items-center justify-between p-3 border rounded-lg"
                  data-testid={`transaction-${transaction.id}`}
                >
                  <div className="flex items-center gap-3">
                    {getTransactionIcon(transaction.type)}
                    <div>
                      <p className="font-medium">{transaction.description}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {format(new Date(transaction.createdAt), 'dd/MM/yyyy HH:mm', { locale: it })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={getTransactionBadgeVariant(transaction.type)}>
                      {transaction.type === 'spesa' || transaction.type === 'trasferimento_out' ? '-' : '+'}
                      {(transaction.amount || 0).toFixed(2)} crediti
                    </Badge>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Saldo: {(transaction.balanceAfter || 0).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Wallets Overview for Superadmin */}
      {userRole === 'superadmin' && allWallets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Panoramica Tutti i Wallet</CardTitle>
            <CardDescription>
              Vista generale di tutti i wallet aziendali nel sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {allWallets.map((item: any) => (
                <div 
                  key={item.company.id} 
                  className="p-4 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                  onClick={() => setSelectedCompanyId(item.company.id)}
                  data-testid={`wallet-company-${item.company.id}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">{item.company.name}</h3>
                    <Badge variant="outline">{item.company.type}</Badge>
                  </div>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {(item.wallet.balance || 0).toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">crediti disponibili</p>
                  <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                    <div>
                      <p className="text-gray-500">Ricariche</p>
                      <p className="font-medium">{(item.wallet.totalRecharges || 0).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Spese</p>
                      <p className="font-medium">{(item.wallet.totalSpent || 0).toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No wallet message */}
      {!walletLoading && !wallet && activeCompanyId && (
        <Card>
          <CardContent className="text-center py-8">
            <Wallet className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Wallet non trovato</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Il wallet per questa azienda verrà creato automaticamente alla prima operazione.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Stripe Payment Dialog */}
      <Dialog open={showStripeForm} onOpenChange={setShowStripeForm}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Ricarica Wallet con Stripe</DialogTitle>
            <DialogDescription>
              Completa il pagamento per ricaricare {rechargeAmount} crediti
            </DialogDescription>
          </DialogHeader>
          {clientSecret && (
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <StripePaymentForm 
                amount={parseFloat(rechargeAmount) || 0} 
                companyId={activeCompanyId || ''} 
                onSuccess={handleStripePaymentSuccess}
              />
            </Elements>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function WalletPage() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const { contentMargin } = useSidebar();

  useEffect(() => {
    if (!loading && !user) {
      setLocation('/login');
    }
  }, [user, loading, setLocation]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <TopBar />
        <main className="flex-1 p-6" style={{ paddingLeft: '280px', minHeight: '100vh' }}>
          <WalletContent />
        </main>
      </div>
    </div>
  );
}