import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import LicenseModal from "./license-modal";
import type { LicenseWithDetails } from "@/types";

export default function LicenseTable() {
  const [filter, setFilter] = useState("all");
  const [selectedLicense, setSelectedLicense] = useState<LicenseWithDetails | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: licenses = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/licenses'],
  });

  const getStatusBadge = (status: string) => {
    const variants = {
      'attiva': 'default',
      'demo': 'secondary',
      'scaduta': 'destructive',
      'in_attesa_convalida': 'outline',
      'sospesa': 'destructive'
    } as const;

    const labels = {
      'attiva': 'Attiva',
      'demo': 'Demo',
      'scaduta': 'Scaduta',
      'in_attesa_convalida': 'In Attesa',
      'sospesa': 'Sospesa'
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'}>
        {labels[status as keyof typeof labels] || status}
      </Badge>
    );
  };

  const handleViewLicense = (license: LicenseWithDetails) => {
    setSelectedLicense(license);
    setIsModalOpen(true);
  };

  const handleRefresh = () => {
    refetch();
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-gray-900">
              Licenze Recenti
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutte</SelectItem>
                  <SelectItem value="active">Attive</SelectItem>
                  <SelectItem value="demo">Demo</SelectItem>
                  <SelectItem value="expired">Scadute</SelectItem>
                  <SelectItem value="pending">In Attesa</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="ghost" size="sm" onClick={handleRefresh}>
                <i className="fas fa-refresh text-sm"></i>
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Licenza
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Prodotto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stato
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Scadenza
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Azioni
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {licenses.map((license: LicenseWithDetails) => (
                  <tr key={license.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {license.activationKey}
                      </div>
                      <div className="text-sm text-gray-500">
                        {license.computerKey || 'Non attivata'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {license.client.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {license.client.email}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {license.product.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {license.product.version}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(license.status || 'pending')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {license.expiryDate 
                        ? new Date(license.expiryDate).toLocaleDateString('it-IT')
                        : '-'
                      }
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewLicense(license)}
                        className="text-primary hover:text-blue-700 mr-3"
                      >
                        <i className="fas fa-eye"></i>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <i className="fas fa-edit"></i>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {licenses.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">Nessuna licenza trovata</p>
            </div>
          )}
          
          <div className="px-6 py-3 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-700">
                Mostrando <span className="font-medium">1-{licenses.length}</span> di{' '}
                <span className="font-medium">{licenses.length}</span> licenze
              </p>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" disabled>
                  Precedente
                </Button>
                <Button variant="outline" size="sm" className="bg-primary text-white">
                  1
                </Button>
                <Button variant="outline" size="sm" disabled>
                  Successivo
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <LicenseModal
        license={selectedLicense}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
