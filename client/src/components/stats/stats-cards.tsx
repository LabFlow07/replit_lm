import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";

export default function StatsCards() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['/api/dashboard/stats'],
  });

  const statsCards = [
    {
      title: 'Licenze Attive',
      value: stats?.activeLicenses || 0,
      change: '+12% questo mese',
      icon: 'fas fa-key',
      color: 'text-secondary',
      bgColor: 'bg-secondary bg-opacity-10'
    },
    {
      title: 'Licenze Demo',
      value: stats?.demoLicenses || 0,
      change: `${stats?.demoLicenses || 0} scadono oggi`,
      icon: 'fas fa-clock',
      color: 'text-accent',
      bgColor: 'bg-accent bg-opacity-10'
    },
    {
      title: 'Clienti Totali',
      value: stats?.totalClients || 0,
      change: '+8% questo mese',
      icon: 'fas fa-users',
      color: 'text-primary',
      bgColor: 'bg-primary bg-opacity-10'
    },
    {
      title: 'Fatturato Mensile',
      value: `€${stats?.monthlyRevenue?.toLocaleString() || '0'}`,
      change: '+18% vs scorso mese',
      icon: 'fas fa-euro-sign',
      color: 'text-secondary',
      bgColor: 'bg-secondary bg-opacity-10'
    }
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-20 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statsCards.map((card, index) => (
        <Card key={index} className="shadow-sm border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{card.title}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{card.value}</p>
                <p className={`text-sm mt-1 ${card.color}`}>
                  {card.title !== 'Licenze Demo' && (
                    <i className="fas fa-arrow-up text-xs mr-1"></i>
                  )}
                  <span>{card.change}</span>
                </p>
              </div>
              <div className={`w-12 h-12 ${card.bgColor} rounded-lg flex items-center justify-center`}>
                <i className={`${card.icon} ${card.color} text-xl`}></i>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
