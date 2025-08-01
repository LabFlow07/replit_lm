import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function LicenseTable() {
  const { data: licenses = [], isLoading } = useQuery({
    queryKey: ['/api/licenses'],
    refetchOnWindowFocus: false,
    staleTime: 0,
    queryFn: async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch('/api/licenses', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Licenses data received:', data);
      return data;
    }
  });

  const getStatusBadge = (status: string) => {
    const variants = {
      'attiva': 'default',
      'scaduta': 'destructive',
      'trial': 'outline',
      'sospesa': 'secondary'
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'}>
        {status === 'attiva' ? 'Attiva' : 
         status === 'scaduta' ? 'Scaduta' : 
         status === 'trial' ? 'Trial' : 
         status === 'sospesa' ? 'Sospesa' : status}
      </Badge>
    );
  };

  const getTypeBadge = (type: string) => {
    const colors = {
      'permanent': 'bg-green-100 text-green-800',
      'trial': 'bg-blue-100 text-blue-800', 
      'subscription': 'bg-purple-100 text-purple-800'
    } as const;

    return (
      <span className={`px-2 py-1 text-xs rounded-full ${colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800'}`}>
        {type === 'permanent' ? 'Permanente' : 
         type === 'trial' ? 'Trial' : 
         type === 'subscription' ? 'Abbonamento' : type}
      </span>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Elenco Licenze</CardTitle>
          <Button className="bg-primary hover:bg-blue-700">
            <i className="fas fa-plus mr-2"></i>
            Nuova Licenza
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Chiave Licenza</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prodotto</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Azienda</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stato</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Scadenza</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Azioni</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {licenses.map((license: any) => (
                  <tr key={license.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                      {license.activationKey}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <i className="fas fa-box text-blue-500 mr-2"></i>
                        <div>
                          <div className="font-medium">{license.product?.name || 'N/A'}</div>
                          <div className="text-xs text-gray-500">{license.product?.version || ''}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <i className="fas fa-user text-green-500 mr-2"></i>
                        <div>
                          <div className="font-medium">{license.client?.name || 'N/A'}</div>
                          <div className="text-xs text-gray-500">{license.client?.email || ''}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <i className="fas fa-building text-gray-400 mr-2"></i>
                        {license.company?.name || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getTypeBadge(license.licenseType)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(license.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {license.expiryDate ? new Date(license.expiryDate).toLocaleDateString('it-IT') : 'Mai'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <Button variant="ghost" size="sm">
                          <i className="fas fa-eye"></i>
                        </Button>
                        <Button variant="ghost" size="sm">
                          <i className="fas fa-edit"></i>
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-600">
                          <i className="fas fa-ban"></i>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {licenses.length === 0 && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <i className="fas fa-key text-gray-400 text-2xl"></i>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nessuna licenza trovata</h3>
                <p className="text-gray-500 mb-4">Inizia creando la tua prima licenza</p>
                <Button className="bg-primary hover:bg-blue-700">
                  <i className="fas fa-plus mr-2"></i>
                  Crea Prima Licenza
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}