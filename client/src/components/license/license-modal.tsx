import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type { LicenseWithDetails } from "@/types";

interface LicenseModalProps {
  license: LicenseWithDetails | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: () => void;
  isEditMode: boolean;
}

export default function LicenseModal({ license, isOpen, onClose, onEdit, isEditMode }: LicenseModalProps) {
  if (!license) return null;

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
    };

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'}>
        {labels[status as keyof typeof labels] || status}
      </Badge>
    );
  };

  const getLicenseTypeLabel = (type: string) => {
    const labels = {
      'permanente': 'Permanente',
      'trial': 'Trial',
      'abbonamento_mensile': 'Abbonamento Mensile',
      'abbonamento_annuale': 'Abbonamento Annuale'
    };
    return labels[type as keyof typeof labels] || type;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-screen overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <i className={`fas ${isEditMode ? 'fa-edit text-green-600' : 'fa-key text-blue-600'}`}></i>
            {isEditMode ? 'Modifica Licenza' : 'Dettagli Licenza'}
          </DialogTitle>
          <DialogDescription>
            {isEditMode ? 'Modifica le informazioni della licenza' : 'Informazioni complete sulla licenza selezionata'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Intestazione con chiave licenza */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium text-gray-700">Chiave di Attivazione</Label>
                <p className="text-lg font-mono font-semibold text-gray-900 mt-1">
                  {license.activationKey}
                </p>
              </div>
              <div className="text-right">
                {getStatusBadge(license.status)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Informazioni Cliente */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Cliente</h3>

              <div>
                <Label className="text-sm font-medium text-gray-700">Nome</Label>
                <p className="mt-1 text-sm text-gray-900">{license.client?.name || 'N/A'}</p>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700">Email</Label>
                <p className="mt-1 text-sm text-gray-900">{license.client?.email || 'N/A'}</p>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700">Azienda</Label>
                <p className="mt-1 text-sm text-gray-900">{license.company?.name || 'N/A'}</p>
              </div>
            </div>

            {/* Informazioni Prodotto */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Prodotto</h3>

              <div>
                <Label className="text-sm font-medium text-gray-700">Nome Prodotto</Label>
                <p className="mt-1 text-sm text-gray-900">
                  {license.product?.name} {license.product?.version}
                </p>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700">Tipo Licenza</Label>
                <p className="mt-1 text-sm text-gray-900">
                  {getLicenseTypeLabel(license.licenseType)}
                </p>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700">Prezzo</Label>
                <p className="mt-1 text-sm text-gray-900">
                  €{parseFloat(license.price?.toString() || '0').toFixed(2)}
                  {license.discount && parseFloat(license.discount.toString()) > 0 && (
                    <span className="text-green-600 ml-2">
                      (-{license.discount}%)
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Dettagli Tecnici */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Dettagli Tecnici</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-700">Max Utenti</Label>
                <p className="mt-1 text-sm text-gray-900">{license.maxUsers || 1}</p>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700">Max Dispositivi</Label>
                <p className="mt-1 text-sm text-gray-900">{license.maxDevices || 1}</p>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
              <p className="text-sm text-blue-800">
                <i className="fas fa-info-circle mr-2"></i>
                <strong>Dispositivi Autorizzati:</strong> Le chiavi computer sono ora gestite individualmente 
                per ogni dispositivo nella sezione "Registrazioni Software".
              </p>
            </div>
          </div>

          {/* Date */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Date</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-700">Data Creazione</Label>
                <p className="mt-1 text-sm text-gray-900">
                  {license.createdAt 
                    ? new Date(license.createdAt).toLocaleDateString('it-IT')
                    : 'N/A'
                  }
                </p>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700">Data Attivazione</Label>
                <p className="mt-1 text-sm text-gray-900">
                  {license.activationDate 
                    ? new Date(license.activationDate).toLocaleDateString('it-IT')
                    : 'Non attivata'
                  }
                </p>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700">Data Scadenza</Label>
                <p className="mt-1 text-sm text-gray-900">
                  {license.expiryDate 
                    ? new Date(license.expiryDate).toLocaleDateString('it-IT')
                    : 'Permanente'
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Moduli Attivi */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Moduli Attivi</h3>
            <div className="flex flex-wrap gap-2">
              {license.activeModules && license.activeModules.length > 0 ? (
                license.activeModules.map((module: string, index: number) => (
                  <Badge key={index} variant="outline" className="capitalize">
                    {module}
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-gray-500">Nessun modulo attivo</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Chiudi
          </Button>
          {onEdit && (
            <Button onClick={onEdit} className="bg-primary hover:bg-blue-700">
              <i className="fas fa-edit mr-2"></i>
              Modifica
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}