import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";

export default function AlertPanel() {
  const { data: licenses = [] } = useQuery({
    queryKey: ['/api/licenses'],
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['/api/clients'],
  });

  // Calculate real-time alerts
  const expiringToday = (licenses as any[]).filter(l => {
    if (!l.expires_at && !l.expiryDate) return false;
    const expiryDate = new Date(l.expires_at || l.expiryDate);
    const today = new Date();
    return expiryDate.toDateString() === today.toDateString();
  }).length;

  const expiredLicenses = (licenses as any[]).filter(l => {
    if (!l.expires_at && !l.expiryDate) return false;
    const expiryDate = new Date(l.expires_at || l.expiryDate);
    return expiryDate < new Date() && l.status !== 'scaduta';
  }).length;

  const pendingClients = (clients as any[]).filter(c => c.status === 'in_attesa').length;

  const todayActivations = (licenses as any[]).filter(l => {
    if (!l.activation_date && !l.activationDate) return false;
    const activationDate = new Date(l.activation_date || l.activationDate);
    const today = new Date();
    return activationDate.toDateString() === today.toDateString();
  }).length;

  const alerts = [
    {
      type: 'warning',
      title: `${expiringToday} licenze demo scadono oggi`,
      description: 'Verificare rinnovi in sospeso',
      icon: 'fas fa-exclamation-triangle',
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      show: expiringToday > 0
    },
    {
      type: 'error',
      title: `${expiredLicenses} licenze scadute`,
      description: 'Contattare clienti per rinnovo',
      icon: 'fas fa-times-circle',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      show: expiredLicenses > 0
    },
    {
      type: 'info',
      title: `${pendingClients} nuovi clienti in attesa`,
      description: 'Verifica documenti necessaria',
      icon: 'fas fa-info-circle',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      show: pendingClients > 0
    }
  ].filter(alert => alert.show);

  const quickStats = [
    { label: 'Attivazioni oggi', value: todayActivations.toString() },
    { label: 'Conversioni demo', value: '0', color: 'text-green-600' },
    { label: 'Rinnovi in scadenza', value: expiringToday.toString(), color: 'text-amber-600' },
    { label: 'Licenze attive', value: (licenses as any[]).filter(l => l.status === 'attiva').length.toString() }
  ];

  return (
    <div className="space-y-6">
      {/* Alert Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">
            Avvisi Importanti
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-3">
            {alerts.length > 0 ? (
              alerts.map((alert, index) => (
                <div 
                  key={index}
                  className={`flex items-start space-x-3 p-3 ${alert.bgColor} rounded-lg`}
                >
                  <i className={`${alert.icon} ${alert.color} mt-0.5`}></i>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{alert.title}</p>
                    <p className="text-xs text-gray-600 mt-1">{alert.description}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex items-center justify-center p-6 text-gray-500">
                <div className="text-center">
                  <i className="fas fa-check-circle text-green-500 text-2xl mb-2"></i>
                  <p className="text-sm">Nessun avviso importante</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">
            Statistiche Veloci
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-4">
            {quickStats.map((stat, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{stat.label}</span>
                <span className={`text-sm font-semibold ${stat.color || 'text-gray-900'}`}>
                  {stat.value}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
