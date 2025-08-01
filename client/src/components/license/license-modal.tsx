import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type { LicenseWithDetails } from "@/types";

interface LicenseModalProps {
  license: LicenseWithDetails | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function LicenseModal({ license, isOpen, onClose }: LicenseModalProps) {
  if (!license) return null;

  const getStatusBadge = (status: string) => {
    const variants = {
      'attiva': 'default',
      'demo': 'secondary',
      'scaduta': 'destructive',
      'in_attesa_convalida': 'outline',
      'sospesa': 'destructive'
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'}>
        {status}
      </Badge>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-screen overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-gray-900">
            Dettagli Licenza
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-gray-700">
                Activation Key
              </Label>
              <p className="mt-1 text-sm text-gray-900 font-mono bg-gray-50 p-2 rounded">
                {license.activationKey}
              </p>
            </div>
            
            <div>
              <Label className="text-sm font-medium text-gray-700">
                Computer Key
              </Label>
              <p className="mt-1 text-sm text-gray-900 font-mono bg-gray-50 p-2 rounded">
                {license.computerKey || 'Non attivata'}
              </p>
            </div>
            
            <div>
              <Label className="text-sm font-medium text-gray-700">
                Cliente
              </Label>
              <p className="mt-1 text-sm text-gray-900">
                {license.client.name}
              </p>
            </div>
            
            <div>
              <Label className="text-sm font-medium text-gray-700">
                Prodotto
              </Label>
              <p className="mt-1 text-sm text-gray-900">
                {license.product.name} {license.product.version}
              </p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-gray-700">
                Stato
              </Label>
              <div className="mt-1">
                {getStatusBadge(license.status || 'pending')}
              </div>
            </div>
            
            <div>
              <Label className="text-sm font-medium text-gray-700">
                Data Attivazione
              </Label>
              <p className="mt-1 text-sm text-gray-900">
                {license.activationDate 
                  ? new Date(license.activationDate).toLocaleDateString('it-IT')
                  : 'Non attivata'
                }
              </p>
            </div>
            
            <div>
              <Label className="text-sm font-medium text-gray-700">
                Data Scadenza
              </Label>
              <p className="mt-1 text-sm text-gray-900">
                {license.expiryDate 
                  ? new Date(license.expiryDate).toLocaleDateString('it-IT')
                  : 'Permanente'
                }
              </p>
            </div>
            
            <div>
              <Label className="text-sm font-medium text-gray-700">
                Moduli Attivi
              </Label>
              <div className="mt-1 flex flex-wrap gap-1">
                {license.activeModules && license.activeModules.length > 0 ? (
                  license.activeModules.map((module: string, index: number) => (
                    <Badge key={index} variant="outline">
                      {module}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-gray-500">Nessun modulo attivo</span>
                )}
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Chiudi
          </Button>
          <Button className="bg-primary hover:bg-blue-700">
            Modifica
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
