
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Route, Switch } from 'wouter';
import { AuthProvider, useAuth } from '@/hooks/use-auth';
import { Toaster } from '@/components/ui/toaster';
import Sidebar from '@/components/layout/sidebar';
import Dashboard from '@/pages/dashboard';
import Licenses from '@/pages/licenses';
import SoftwareRegistrations from '@/pages/software-registrations';
import Companies from '@/pages/companies';
import Clients from '@/pages/clients';
import Products from '@/pages/products';
import Transactions from '@/pages/transactions';
import Users from '@/pages/users';
import Settings from '@/pages/settings';
import Logs from '@/pages/logs';
import Login from '@/pages/login';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-hidden">
        <div className="h-full overflow-auto">
          <div className="p-6">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}

function AppRoutes() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/" nest>
        <ProtectedRoute>
          <Switch>
            <Route path="/dashboard" component={Dashboard} />
            <Route path="/licenses" component={Licenses} />
            <Route path="/software-registrations" component={SoftwareRegistrations} />
            <Route path="/companies" component={Companies} />
            <Route path="/clients" component={Clients} />
            <Route path="/products" component={Products} />
            <Route path="/transactions" component={Transactions} />
            <Route path="/users" component={Users} />
            <Route path="/settings" component={Settings} />
            <Route path="/logs" component={Logs} />
            <Route path="/" component={Dashboard} />
            <Route component={NotFound} />
          </Switch>
        </ProtectedRoute>
      </Route>
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <div className="min-h-screen bg-gray-50">
          <AppRoutes />
          <Toaster />
        </div>
      </AuthProvider>
    </QueryClientProvider>
  );
}
