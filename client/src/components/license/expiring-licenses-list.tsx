import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

interface ExpiringLicense {
  id: string;
  activationKey: string;
  expiryDate: string;
  licenseType: string;
  client: {
    name: string;
    email: string;
    company_id?: string;
    companyId?: string;
  };
  product: {
    name: string;
    version: string;
  };
}

export default function ExpiringLicensesList() {
  const { user } = useAuth();

  const { data: expiringLicenses = [], isLoading } = useQuery({
    queryKey: ['/api/licenses/expiring'],
    enabled: !!user,
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/licenses/expiring', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch expiring licenses');
      const data = await response.json();
      
      console.log(`Expiring licenses API returned ${data.length} licenses for user ${user?.username}`);
      return data;
    },
    refetchInterval: 5 * 60 * 1000, // Aggiorna ogni 5 minuti
  });

  const getDaysUntilExpiry = (expiryDate: string) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getExpiryBadge = (expiryDate: string) => {
    const days = getDaysUntilExpiry(expiryDate);

    if (days < 0) {
      return <Badge variant="destructive">Scaduta</Badge>;
    } else if (days <= 7) {
      return <Badge variant="destructive">Scade in {days} giorni</Badge>;
    } else if (days <= 30) {
      return <Badge variant="secondary">Scade in {days} giorni</Badge>;
    } else {
      return <Badge variant="outline">Scade in {days} giorni</Badge>;
    }
  };

  const getLicenseTypeBadge = (licenseType: string) => {
    const typeMap = {
      'abbonamento_mensile': { label: 'Mensile', color: 'bg-blue-100 text-blue-800' },
      'abbonamento_annuale': { label: 'Annuale', color: 'bg-green-100 text-green-800' },
      'permanente': { label: 'Permanente', color: 'bg-gray-100 text-gray-800' },
      'trial': { label: 'Trial', color: 'bg-yellow-100 text-yellow-800' }
    };

    const type = typeMap[licenseType as keyof typeof typeMap] || { label: licenseType, color: 'bg-gray-100 text-gray-800' };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${type.color}`}>
        {type.label}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Since the server already filters licenses by company hierarchy for admin users,
  // we trust the server response like in the main licenses page
  console.log(`Expiring licenses: User ${user?.username} (${user?.role}) has ${expiringLicenses.length} expiring licenses from server`);

  if (expiringLicenses.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <i className="fas fa-check text-green-600 text-xl"></i>
        </div>
        <p className="text-gray-500">Nessuna licenza in scadenza nei prossimi 30 giorni</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex gap-4 overflow-x-auto pb-4" style={{ scrollbarWidth: 'thin' }}>
        {expiringLicenses.slice(0, 10).map((license: ExpiringLicense) => (
          <div key={license.id} className="flex-none w-80 p-4 border rounded-lg hover:bg-gray-50 bg-white shadow-sm">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm text-gray-900">{license.client.name}</span>
                {getLicenseTypeBadge(license.licenseType)}
              </div>
              
              <div className="space-y-1">
                <div className="text-sm font-medium text-gray-700">
                  {license.product.name} {license.product.version}
                </div>
                <div className="text-xs text-gray-500 font-mono">
                  {license.activationKey}
                </div>
              </div>
              
              <div className="flex items-center justify-between pt-2 border-t">
                <div>
                  <div className="text-xs text-gray-500">Scadenza</div>
                  <div className="text-sm font-medium text-gray-900">
                    {new Date(license.expiryDate).toLocaleDateString('it-IT')}
                  </div>
                </div>
                {getExpiryBadge(license.expiryDate)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {expiringLicenses.length > 10 && (
        <div className="text-center pt-3">
          <Button variant="outline" size="sm">
            Visualizza tutte ({expiringLicenses.length})
          </Button>
        </div>
      )}
    </div>
  );
}