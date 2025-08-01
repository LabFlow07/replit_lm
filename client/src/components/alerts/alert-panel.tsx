import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AlertPanel() {
  const alerts = [
    {
      type: 'warning',
      title: '34 licenze demo scadono oggi',
      description: 'Verificare rinnovi in sospeso',
      icon: 'fas fa-exclamation-triangle',
      color: 'text-accent',
      bgColor: 'bg-accent bg-opacity-10'
    },
    {
      type: 'error',
      title: '12 licenze scadute',
      description: 'Contattare clienti per rinnovo',
      icon: 'fas fa-times-circle',
      color: 'text-error',
      bgColor: 'bg-error bg-opacity-10'
    },
    {
      type: 'info',
      title: '5 nuovi clienti in attesa',
      description: 'Verifica documenti necessaria',
      icon: 'fas fa-info-circle',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    }
  ];

  const quickStats = [
    { label: 'Attivazioni oggi', value: '23' },
    { label: 'Conversioni demo', value: '8', color: 'text-secondary' },
    { label: 'Rinnovi in scadenza', value: '47', color: 'text-accent' },
    { label: 'Fatturato giornaliero', value: '€1,250' }
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
            {alerts.map((alert, index) => (
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
            ))}
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
