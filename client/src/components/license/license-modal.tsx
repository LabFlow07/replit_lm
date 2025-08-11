
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <i className={`fas ${isEditMode ? 'fa-edit text-green-600' : 'fa-key text-blue-600'}`}></i>
              {isEditMode ? 'Modifica Licenza' : 'Dettagli Licenza'}
            </div>
            {getStatusBadge(license.status)}
          </DialogTitle>
          <DialogDescription className="text-sm">
            Informazioni complete sulla licenza selezionata
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Chiave di Attivazione */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-center">
              <Label className="text-sm font-medium text-gray-700">Chiave di Attivazione</Label>
              <p className="text-xl font-mono font-semibold text-gray-900 mt-1 tracking-wider">
                {license.activationKey}
              </p>
            </div>
          </div>

          {/* Griglia principale con 3 colonne */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Cliente */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-1">Cliente</h3>
              
              <div className="space-y-2">
                <div>
                  <p className="text-sm font-medium text-gray-700">Nome</p>
                  <p className="text-sm text-gray-900 font-semibold">{license.client?.name || license.clientName || 'N/A'}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-700">Email</p>
                  <p className="text-sm text-gray-900">{license.client?.email || license.clientEmail || 'N/A'}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-700">Azienda</p>
                  <p className="text-sm text-gray-900 font-semibold">{license.company?.name || license.companyName || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Prodotto */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-1">Prodotto</h3>
              
              <div className="space-y-2">
                <div>
                  <p className="text-sm font-medium text-gray-700">Software</p>
                  <p className="text-sm text-gray-900 font-semibold">
                    {license.product?.name} {license.product?.version}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-700">Tipologia</p>
                  <p className="text-sm text-gray-900">
                    {getLicenseTypeLabel(license.licenseType)}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-700">Prezzo</p>
                  <p className="text-sm text-gray-900 font-semibold">
                    €{parseFloat(license.price?.toString() || '0').toFixed(2)}
                    {license.discount && parseFloat(license.discount.toString()) > 0 && (
                      <span className="text-green-600 ml-1 text-xs">
                        (-{license.discount}%)
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Date e Limiti */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-1">Limiti & Date</h3>
              
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Utenti</p>
                    <p className="text-sm text-gray-900 font-semibold">{license.maxUsers || 1}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Dispositivi</p>
                    <p className="text-sm text-gray-900 font-semibold">{license.maxDevices || 1}</p>
                  </div>
                </div>

                <Separator className="my-2" />

                <div>
                  <p className="text-sm font-medium text-gray-700">Creata il</p>
                  <p className="text-sm text-gray-900">
                    {license.createdAt 
                      ? new Date(license.createdAt).toLocaleDateString('it-IT')
                      : 'N/A'
                    }
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-700">Attivata il</p>
                  <p className="text-sm text-gray-900">
                    {license.activationDate 
                      ? new Date(license.activationDate).toLocaleDateString('it-IT')
                      : 'Non attivata'
                    }
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-700">Scade il</p>
                  <p className="text-sm text-gray-900 font-semibold">
                    {license.expiryDate 
                      ? new Date(license.expiryDate).toLocaleDateString('it-IT')
                      : 'Permanente'
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Moduli Attivi */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-900">Moduli Attivi</h3>
              <div className="flex flex-wrap gap-1">
                {license.activeModules && license.activeModules.length > 0 ? (
                  license.activeModules.map((module: string, index: number) => (
                    <Badge key={index} variant="outline" className="capitalize text-xs">
                      {module}
                    </Badge>
                  ))
                ) : (
                  <Badge variant="secondary" className="text-xs">
                    Nessun modulo attivo
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Info Dispositivi */}
          <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
            <div className="flex items-start">
              <i className="fas fa-info-circle text-blue-600 mt-0.5 mr-2 flex-shrink-0"></i>
              <p className="text-sm text-blue-800">
                <strong>Dispositivi Autorizzati:</strong> Le chiavi computer sono gestite individualmente 
                per ogni dispositivo nella sezione "Registrazioni Software".
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 pt-4 border-t mt-4">
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
