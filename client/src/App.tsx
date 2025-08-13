import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "./hooks/use-auth";
import { SidebarProvider } from "./contexts/SidebarContext";
import Dashboard from "@/pages/dashboard";
import Login from "@/pages/login";
import NotFound from "@/pages/not-found";
import LicensesPage from "@/pages/licenses";
import ClientsPage from "@/pages/clients";
import CompaniesPage from "@/pages/companies";
import ProductsPage from "@/pages/products";
import TransactionsPage from "@/pages/transactions";
import SettingsPage from "@/pages/settings";
import LogsPage from "@/pages/logs";
import SoftwareRegistrationsPage from "@/pages/software-registrations";
import UsersPage from "@/pages/users";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/licenses" component={LicensesPage} />
      <Route path="/clients" component={ClientsPage} />
      <Route path="/companies" component={CompaniesPage} />
      <Route path="/products" component={ProductsPage} />
      <Route path="/transactions" component={TransactionsPage} />
      <Route path="/software-registrations" component={SoftwareRegistrationsPage} />
      <Route path="/users" component={UsersPage} />
      <Route path="/settings" component={SettingsPage} />
      <Route path="/logs" component={LogsPage} />
      <Route path="/login" component={Login} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <SidebarProvider>
            <Toaster />
            <Router />
          </SidebarProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;