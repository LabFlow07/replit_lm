import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ExpiringLicense {
  id: string;
  activationKey: string;
  expiryDate: string;
  licenseType: string;
  client: {
    name: string;
    email: string;
  };
  product: {
    name: string;
    version: string;
  };
}

export default function ExpiringLicensesList() {
  const { data: expiringLicenses = [], isLoading } = useQuery({
    queryKey: ['/api/licenses/expiring'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/licenses/expiring', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch expiring licenses');
      return response.json();
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
    <div className="space-y-3">
      {expiringLicenses.slice(0, 10).map((license: ExpiringLicense) => (
        <div key={license.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-sm">{license.client.name}</span>
              {getLicenseTypeBadge(license.licenseType)}
            </div>
            <div className="text-xs text-gray-600">
              {license.product.name} {license.product.version}
            </div>
            <div className="text-xs text-gray-500">
              {license.activationKey}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-xs text-gray-500">Scadenza</div>
              <div className="text-sm font-medium">
                {new Date(license.expiryDate).toLocaleDateString('it-IT')}
              </div>
            </div>
            {getExpiryBadge(license.expiryDate)}
          </div>
        </div>
      ))}

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