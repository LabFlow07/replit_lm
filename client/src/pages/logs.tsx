import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import Sidebar from "@/components/layout/sidebar";
import TopBar from "@/components/layout/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function LogsPage() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

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

  // Mock data for demo
  const logs = [
    {
      id: '1',
      userId: user.id,
      userName: user.name,
      action: 'LOGIN',
      resource: '/api/auth/login',
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      createdAt: new Date().toISOString(),
      level: 'info'
    },
    {
      id: '2',
      userId: user.id,
      userName: user.name,
      action: 'VIEW_LICENSES',
      resource: '/api/licenses',
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      createdAt: new Date(Date.now() - 300000).toISOString(),
      level: 'info'
    },
    {
      id: '3',
      userId: 'system',
      userName: 'Sistema',
      action: 'LICENSE_ACTIVATION',
      resource: '/api/licenze/attiva',
      ipAddress: '87.106.247.35',
      userAgent: 'QLM Client v2.0',
      createdAt: new Date(Date.now() - 600000).toISOString(),
      level: 'success'
    },
    {
      id: '4',
      userId: 'unknown',
      userName: 'Utente Sconosciuto',
      action: 'FAILED_LOGIN',
      resource: '/api/auth/login',
      ipAddress: '203.0.113.42',
      userAgent: 'Mozilla/5.0',
      createdAt: new Date(Date.now() - 900000).toISOString(),
      level: 'warning'
    }
  ];

  const getLevelBadge = (level: string) => {
    const variants = {
      'success': 'default',
      'info': 'secondary',
      'warning': 'outline',
      'error': 'destructive'
    } as const;

    const colors = {
      'success': 'text-green-600',
      'info': 'text-blue-600',
      'warning': 'text-yellow-600',
      'error': 'text-red-600'
    } as const;

    return (
      <Badge variant={variants[level as keyof typeof variants] || 'outline'}>
        <i className={`fas fa-circle text-xs mr-1 ${colors[level as keyof typeof colors]}`}></i>
        {level.toUpperCase()}
      </Badge>
    );
  };

  const getActionIcon = (action: string) => {
    const icons = {
      'LOGIN': 'fas fa-sign-in-alt text-green-600',
      'LOGOUT': 'fas fa-sign-out-alt text-gray-600',
      'VIEW_LICENSES': 'fas fa-eye text-blue-600',
      'LICENSE_ACTIVATION': 'fas fa-key text-primary',
      'FAILED_LOGIN': 'fas fa-times text-red-600',
      'CREATE_LICENSE': 'fas fa-plus text-green-600',
      'DELETE_LICENSE': 'fas fa-trash text-red-600'
    } as const;

    return icons[action as keyof typeof icons] || 'fas fa-info-circle text-gray-600';
  };

  return (
    <div className="min-h-screen flex bg-surface">
      <Sidebar />
      
      <main className="flex-1 bg-surface">
        <TopBar />
        
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900 mb-1">Log Attività</h1>
              <p className="text-sm text-gray-600">Monitora tutte le attività e gli accessi del sistema</p>
            </div>
            <div className="flex items-center space-x-4">
              <Select defaultValue="all">
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="success">Successo</SelectItem>
                  <SelectItem value="warning">Avviso</SelectItem>
                  <SelectItem value="error">Errore</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline">
                <i className="fas fa-download mr-2"></i>
                Esporta
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Eventi Oggi</p>
                    <p className="text-xl font-bold text-gray-900">127</p>
                  </div>
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <i className="fas fa-chart-line text-blue-600"></i>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Accessi</p>
                    <p className="text-xl font-bold text-gray-900">43</p>
                  </div>
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <i className="fas fa-sign-in-alt text-green-600"></i>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Avvisi</p>
                    <p className="text-xl font-bold text-gray-900">8</p>
                  </div>
                  <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <i className="fas fa-exclamation-triangle text-yellow-600"></i>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Errori</p>
                    <p className="text-2xl font-bold text-gray-900">2</p>
                  </div>
                  <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                    <i className="fas fa-times-circle text-red-600"></i>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Registro Eventi Recenti</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Livello</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Azione</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Utente</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Risorsa</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data/Ora</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getLevelBadge(log.level)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <i className={`${getActionIcon(log.action)} text-sm`}></i>
                            <span className="text-sm font-medium text-gray-900">{log.action}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {log.userName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                          {log.resource}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                          {log.ipAddress}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(log.createdAt).toLocaleString('it-IT')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}