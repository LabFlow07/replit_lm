import { useEffect, useState, useMemo } from "react";
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
import ActivationForm from "@/components/license/activation-form";

export default function LicensesPage() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

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
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestione Licenze</h1>
            <p className="text-gray-600">Visualizza e gestisci tutte le licenze del sistema</p>
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
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <LicenseTable />
            </div>
            
            <div>
              <ActivationForm />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}