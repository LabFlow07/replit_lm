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

// Function to get Stripe configuration from database
const getStripeConfiguration = async () => {
  try {
    const response = await apiRequest('GET', '/api/stripe/config');
    const result = await response.json();
    
    if (result.success && result.configured && result.publicKey?.startsWith('pk_')) {
      console.log('✅ Using Stripe config from database');
      return result.publicKey;
    }
  } catch (error) {
    console.log('Database config not available, trying environment variables');
  }
  
  // Fallback to environment variables
  const envKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY;
  if (envKey?.startsWith('pk_')) {
    console.log('✅ Using Stripe config from environment');
    return envKey;
  }
  
  console.error('❌ No valid Stripe configuration found');
  return null;
};

// Initialize Stripe promise with dynamic configuration
let stripePromise: Promise<any> | null = null;

const getStripePromise = async () => {
  if (!stripePromise) {
    const publicKey = await getStripeConfiguration();
    stripePromise = publicKey ? loadStripe(publicKey) : Promise.resolve(null);
  }
  return stripePromise;
};

// Stripe Payment Form Component
function StripePaymentForm({ amount, companyId, onSuccess, onProcessingChange }: { 
  amount: number; 
  companyId: string; 
  onSuccess: () => void;
  onProcessingChange?: (processing: boolean) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      console.log('Stripe not ready:', { stripe: !!stripe, elements: !!elements });
      return;
    }

    setIsProcessing(true);
    onProcessingChange?.(true);
    console.log('Processing payment for amount:', amount);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/wallet?payment=success`,
        },
        redirect: 'if_required',
      });

      if (error) {
        console.error('Stripe payment error:', error);
        toast({
          title: "Pagamento fallito",
          description: error.message || "Errore durante il pagamento",
          variant: "destructive",
        });
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        console.log('Payment succeeded:', paymentIntent);
        
        // Confirm payment and update wallet balance on backend
        try {
          const confirmResponse = await apiRequest('POST', `/api/wallet/${companyId}/confirm-payment`, {
            paymentIntentId: paymentIntent.id
          });
          
          if (confirmResponse.ok) {
            const result = await confirmResponse.json();
            console.log('✅ Wallet balance updated:', result);
            toast({
              title: "Ricarica completata",
              description: `${amount} crediti aggiunti al wallet! Nuovo saldo: ${result.wallet.balance} crediti`,
            });
          } else {
            throw new Error('Errore conferma pagamento');
          }
        } catch (confirmError) {
          console.error('Payment confirmation error:', confirmError);
          toast({
            title: "Pagamento completato ma...",
            description: "Il pagamento è riuscito ma c'è stato un errore nell'aggiornamento del wallet. Contatta il supporto.",
            variant: "destructive",
          });
        }
        
        onSuccess();
      } else {
        console.log('Payment status:', paymentIntent?.status);
        toast({
          title: "Pagamento in elaborazione",
          description: "Il pagamento è in elaborazione, aggiorna la pagina tra qualche minuto",
        });
      }
    } catch (error) {
      console.error('Payment processing error:', error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante il pagamento",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      onProcessingChange?.(false);
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

  // Determine active company ID based on user role
  const activeCompanyId = userRole === 'superadmin' ? selectedCompanyId : userCompanyId;
  
  // Debug logging
  console.log('Wallet Debug:', {
    userRole,
    selectedCompanyId,
    userCompanyId,
    activeCompanyId,
    companiesCount: companies?.length
  });
  const { data: walletData, isLoading: walletLoading, refetch: refetchWallet } = useQuery({
    queryKey: ['/api/wallet', activeCompanyId],
    queryFn: () => {
      console.log('Fetching wallet for company:', activeCompanyId);
      return apiRequest('GET', `/api/wallet/${activeCompanyId}`).then(res => res.json());
    },
    enabled: !!user && !!activeCompanyId,
    retry: 1
  });

  // Refetch wallet when activeCompanyId changes
  useEffect(() => {
    if (activeCompanyId) {
      console.log('Active company changed to:', activeCompanyId);
      refetchWallet();
    }
  }, [activeCompanyId, refetchWallet]);

  // Extract wallet and transactions from response
  const wallet = walletData || {};
  const transactions = walletData?.transactions || [];
  
  // Debug logging for wallet data
  console.log('Wallet Data Debug:', {
    walletData,
    wallet,
    balance: wallet.balance,
    activeCompanyId,
    selectedCompanyId
  });

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
  const [isProcessing, setIsProcessing] = useState(false);
  const [dynamicStripePromise, setDynamicStripePromise] = useState<Promise<any> | null>(null);
  const [selectedTransactions, setSelectedTransactions] = useState<any[]>([]);
  const [showTransactionsModal, setShowTransactionsModal] = useState(false);
  const [selectedCompanyName, setSelectedCompanyName] = useState('');

  // Create payment intent mutation
  const createPaymentIntentMutation = useMutation({
    mutationFn: async (data: { companyId: string; amount: number }) => {
      const response = await apiRequest('POST', `/api/wallet/${data.companyId}/create-payment-intent`, { amount: data.amount });
      return response.json();
    },
    onSuccess: async (response: any) => {
      console.log('Payment intent created:', response);
      setClientSecret(response.clientSecret);
      setPaymentIntentId(response.paymentIntentId);
      
      // Load Stripe configuration dynamically when opening payment form
      const stripePromise = await getStripePromise();
      setDynamicStripePromise(stripePromise);
      
      setShowStripeForm(true);
    },
    onError: (error: any) => {
      console.error('Payment intent creation error:', error);
      toast({
        title: 'Errore creazione pagamento',
        description: error.message || 'Errore durante la creazione del pagamento',
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
    console.log('Payment completed successfully');
    setShowStripeForm(false);
    setClientSecret(null);
    setPaymentIntentId(null);
    setRechargeAmount('');
    // Refresh wallet data
    queryClient.invalidateQueries({ queryKey: ['/api/wallet'] });
    refetchWallet();
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

  const handleViewTransactions = async (companyId: string, companyName: string) => {
    try {
      console.log('🔍 handleViewTransactions called - Company:', companyName, 'ID:', companyId);
      
      const response = await apiRequest('GET', `/api/wallet-with-transactions/${companyId}`);
      console.log('📡 API response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('📊 Wallet data received from API:', data);
      
      // Le transazioni sono ora incluse direttamente nella risposta dell'endpoint wallet
      const transactions = data.transactions || [];
      // Check if response includes _debug info (new format)
      const debugInfo = data._debug;
      const transactionCount = debugInfo?.transactionCount ?? transactions.length;
      
      console.log(`📈 Transactions from API response: ${transactionCount}`);
      if (debugInfo) {
        console.log(`🔍 API Debug Info:`, debugInfo);
      }
      
      if (transactionCount === 0) {
        console.log(`❌ No transactions found for company: ${companyName}`);
        console.log(`💰 But wallet balance is: ${data.balance}`);
        console.log(`⚠️ This suggests the API endpoint is not including transactions in the response`);
      } else {
        console.log('✅ Sample transaction:', transactions[0]);
      }
      
      setSelectedTransactions(transactions);
      setSelectedCompanyName(companyName);
      setShowTransactionsModal(true);
      
      console.log('🔧 Modal should now be open with', transactions.length, 'transactions');
    } catch (error) {
      console.error('💥 Error fetching transactions:', error);
      toast({
        title: 'Errore',
        description: `Errore nel caricamento delle transazioni: ${error.message}`,
        variant: 'destructive'
      });
    }
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
            <Select value={selectedCompanyId} onValueChange={(value) => {
              console.log('Company selection changed to:', value);
              setSelectedCompanyId(value);
            }}>
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
      {activeCompanyId && walletData && wallet && wallet.balance !== undefined && (
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

      {/* Message when no company selected for superadmin */}
      {userRole === 'superadmin' && !selectedCompanyId && (
        <Card>
          <CardContent className="text-center py-8">
            <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Seleziona un'azienda</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Seleziona un'azienda dal menu sopra per visualizzare il saldo del wallet.
            </p>
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
                Aggiungi crediti al wallet aziendale tramite pagamento sicuro
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
              <Button 
                onClick={handleRecharge} 
                disabled={createPaymentIntentMutation.isPending || !rechargeAmount}
                className="w-full"
              >
                {createPaymentIntentMutation.isPending ? 'Creazione...' : 'Ricarica con Stripe'}
              </Button>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                💡 Pagamento sicuro tramite Stripe. 1 credito = 1 euro.
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

      {/* All Wallets Overview - Excel-style Grid */}
      {((userRole === 'superadmin' && allWallets.length > 0) || 
        (userRole === 'admin' && companies.length > 0)) && (
        <Card>
          <CardHeader>
            <CardTitle>Panoramica Tutti i Wallet</CardTitle>
            <CardDescription>
              Vista generale di tutti i wallet aziendali nel sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="excel-table w-full border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-200 dark:border-gray-700">
                    <th className="text-left p-3 font-semibold bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
                      Azienda
                    </th>
                    <th className="text-left p-3 font-semibold bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
                      Tipo
                    </th>
                    <th className="text-right p-3 font-semibold bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
                      Saldo Crediti
                    </th>
                    <th className="text-right p-3 font-semibold bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
                      Tot. Ricariche
                    </th>
                    <th className="text-right p-3 font-semibold bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
                      Tot. Spese
                    </th>
                    <th className="text-center p-3 font-semibold bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
                      Ultima Ricarica
                    </th>
                    <th className="text-center p-3 font-semibold bg-gray-50 dark:bg-gray-800">
                      Azioni
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(userRole === 'superadmin' ? allWallets : 
                    companies.map(company => ({
                      company,
                      wallet: allWallets.find(w => w.company.id === company.id)?.wallet || {
                        balance: 0,
                        totalRecharges: 0,
                        totalSpent: 0,
                        lastRechargeDate: null
                      }
                    }))
                  ).map((item: any, index: number) => (
                    <tr 
                      key={item.company.id}
                      className={`border-b border-gray-100 dark:border-gray-800 hover:bg-blue-50 dark:hover:bg-blue-950/30 cursor-pointer transition-colors ${
                        selectedCompanyId === item.company.id ? 'bg-blue-100 dark:bg-blue-900/40' : ''
                      }`}
                      onClick={() => setSelectedCompanyId(item.company.id)}
                      data-testid={`wallet-company-${item.company.id}`}
                    >
                      <td className="p-3 border-r border-gray-100 dark:border-gray-800">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                          <span className="font-medium">{item.company.name}</span>
                        </div>
                      </td>
                      <td className="p-3 border-r border-gray-100 dark:border-gray-800">
                        <Badge variant={
                          item.company.type === 'rivenditore' ? 'default' :
                          item.company.type === 'cliente' ? 'secondary' :
                          item.company.type === 'sottoazienda' ? 'outline' : 'secondary'
                        }>
                          {item.company.type}
                        </Badge>
                      </td>
                      <td className="p-3 border-r border-gray-100 dark:border-gray-800 text-right">
                        <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                          {(item.wallet.balance || 0).toFixed(2)}
                        </span>
                        <span className="text-sm text-gray-500 ml-1">crediti</span>
                      </td>
                      <td className="p-3 border-r border-gray-100 dark:border-gray-800 text-right">
                        <span className="text-green-600 dark:text-green-400 font-medium">
                          +{(item.wallet.totalRecharges || 0).toFixed(2)}
                        </span>
                      </td>
                      <td className="p-3 border-r border-gray-100 dark:border-gray-800 text-right">
                        <span className="text-red-600 dark:text-red-400 font-medium">
                          -{(item.wallet.totalSpent || 0).toFixed(2)}
                        </span>
                      </td>
                      <td className="p-3 border-r border-gray-100 dark:border-gray-800 text-center text-sm text-gray-600 dark:text-gray-400">
                        {item.wallet.lastRechargeDate ? 
                          format(new Date(item.wallet.lastRechargeDate), 'dd/MM/yyyy', { locale: it }) : 
                          'Mai'
                        }
                      </td>
                      <td className="p-3 text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewTransactions(item.company.id, item.company.name);
                          }}
                          className="text-xs"
                        >
                          Dettaglio
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {/* Summary row */}
              <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Totale Aziende</p>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {userRole === 'superadmin' ? allWallets.length : companies.length}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Crediti Totali Sistema</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {(userRole === 'superadmin' ? allWallets : 
                        companies.map(company => allWallets.find(w => w.company.id === company.id)?.wallet || { balance: 0 })
                      ).reduce((sum: number, item: any) => sum + (item.wallet?.balance || item.balance || 0), 0).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Ricariche Totali</p>
                    <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                      {(userRole === 'superadmin' ? allWallets : 
                        companies.map(company => allWallets.find(w => w.company.id === company.id)?.wallet || { totalRecharges: 0 })
                      ).reduce((sum: number, item: any) => sum + (item.wallet?.totalRecharges || item.totalRecharges || 0), 0).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No wallet message */}
      {!walletLoading && !wallet && activeCompanyId && userRole !== 'superadmin' && (
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
      <Dialog open={showStripeForm} onOpenChange={(open) => {
        // Prevent closing during payment processing
        if (!isProcessing) {
          setShowStripeForm(open);
          if (!open) {
            // Reset state when dialog is closed
            setClientSecret(null);
            setPaymentIntentId(null);
          }
        }
      }}>
        <DialogContent className="sm:max-w-[500px]" onPointerDownOutside={(e) => {
          // Prevent closing when clicking outside during payment processing
          if (isProcessing) {
            e.preventDefault();
          }
        }}>
          <DialogHeader>
            <DialogTitle>Ricarica Wallet con Stripe</DialogTitle>
            <DialogDescription>
              Completa il pagamento per ricaricare {rechargeAmount} crediti
            </DialogDescription>
          </DialogHeader>
          {clientSecret && dynamicStripePromise ? (
            <Elements stripe={dynamicStripePromise} options={{ 
              clientSecret,
              appearance: {
                theme: 'stripe',
                variables: {
                  colorPrimary: '#0570de',
                }
              }
            }}>
              <StripePaymentForm 
                amount={parseFloat(rechargeAmount) || 0} 
                companyId={activeCompanyId || ''} 
                onSuccess={handleStripePaymentSuccess}
                onProcessingChange={setIsProcessing}
              />
            </Elements>
          ) : dynamicStripePromise === null ? (
            <div className="p-6 text-center">
              <div className="text-red-600 mb-4">
                ⚠️ Configurazione Stripe non valida
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Le chiavi Stripe non sono configurate correttamente nel database.
                Vai nelle Impostazioni per configurarle.
              </p>
              <Button onClick={() => window.location.href = '/settings'} variant="outline">
                Vai alle Impostazioni
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-center p-6">
              <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
              <span className="ml-2">Caricamento modulo pagamento...</span>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Transactions Modal */}
      <Dialog open={showTransactionsModal} onOpenChange={setShowTransactionsModal}>
        <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Transazioni Wallet - {selectedCompanyName}</DialogTitle>
            <DialogDescription>
              Storico completo delle transazioni del wallet in ordine cronologico decrescente
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedTransactions.length > 0 ? (
              <div className="space-y-3">
                {selectedTransactions
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .map((transaction: any) => (
                  <div 
                    key={transaction.id} 
                    className="flex items-center justify-between p-4 border rounded-lg bg-gray-50 dark:bg-gray-800"
                  >
                    <div className="flex items-center gap-3">
                      {getTransactionIcon(transaction.type)}
                      <div>
                        <p className="font-medium">{transaction.description}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {format(new Date(transaction.createdAt), 'dd/MM/yyyy HH:mm', { locale: it })}
                        </p>
                        {transaction.type === 'ricarica' && transaction.stripePaymentIntentId && (
                          <p className="text-xs text-blue-600 dark:text-blue-400">
                            ID Pagamento Stripe: {transaction.stripePaymentIntentId}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={getTransactionBadgeVariant(transaction.type)} className="mb-1">
                        {transaction.type === 'spesa' || transaction.type === 'trasferimento_out' ? '-' : '+'}
                        {(transaction.amount || 0).toFixed(2)} crediti
                      </Badge>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Saldo dopo: {(transaction.balanceAfter || 0).toFixed(2)} crediti
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-gray-500 mb-4">
                  <ArrowUpDown className="h-12 w-12 mx-auto mb-2" />
                  <h3 className="text-lg font-semibold">Nessuna transazione</h3>
                  <p className="text-sm">Non ci sono ancora transazioni per questo wallet.</p>
                </div>
              </div>
            )}
          </div>
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