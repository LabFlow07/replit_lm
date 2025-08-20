
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { LicenseWithDetails } from "@/types";

interface DeviceRegistration {
  id: string;
  partitaIva: string;
  nomeSoftware: string;
  versione: string;
  ragioneSociale: string;
  uidDispositivo: string;
  sistemaOperativo: string;
  computerKey: string;
  status: string;
  primaRegistrazione: string;
  ultimaAttivita: string;
}

interface DeviceKeysSectionProps {
  licenseId: string;
}

function DeviceKeysSection({ licenseId }: DeviceKeysSectionProps) {
  const { data: registrations = [], isLoading } = useQuery({
    queryKey: ['/api/software/registrazioni', { licenseId }],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/software/registrazioni', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch registrations');
      }
      const data = await response.json();
      // Filtra solo le registrazioni con questa licenza e che hanno computer_key
      return data.filter((reg: DeviceRegistration) => 
        reg.licenzaAssegnata === licenseId && 
        reg.computerKey && 
        reg.computerKey.trim() !== ''
      );
    }
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
        <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
      </div>
    );
  }

  if (registrations.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
        <div className="flex items-center">
          <i className="fas fa-exclamation-triangle text-yellow-600 mr-2"></i>
          <div>
            <p className="text-sm font-medium text-yellow-800">Nessun Dispositivo Autorizzato</p>
            <p className="text-xs text-yellow-700 mt-1">
              Non ci sono dispositivi con Computer Key assegnata per questa licenza.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="bg-green-50 border border-green-200 p-3 rounded-lg mb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <i className="fas fa-shield-alt text-green-600 mr-2"></i>
            <span className="text-sm font-medium text-green-800">
              {registrations.length} Dispositivo{registrations.length !== 1 ? 'i' : ''} Autorizzato{registrations.length !== 1 ? 'i' : ''}
            </span>
          </div>
          <Badge variant="secondary" className="text-xs">
            Attivi
          </Badge>
        </div>
      </div>

      <div className="space-y-3 max-h-60 overflow-y-auto">
        {registrations.map((registration: DeviceRegistration, index: number) => (
          <div key={registration.id} className="bg-white border border-gray-200 rounded-lg p-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <i className="fas fa-desktop text-blue-500 text-sm"></i>
                  <span className="font-medium text-sm text-gray-900">
                    Dispositivo #{index + 1}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {registration.status === 'classificato' ? 'Attivo' : registration.status}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 text-xs text-gray-600 mb-2">
                  <div>
                    <span className="font-medium">Azienda:</span> {registration.ragioneSociale}
                  </div>
                  <div>
                    <span className="font-medium">Software:</span> {registration.nomeSoftware} v{registration.versione}
                  </div>
                  <div>
                    <span className="font-medium">Sistema:</span> {registration.sistemaOperativo || 'N/A'}
                  </div>
                  <div>
                    <span className="font-medium">Registrato:</span> {new Date(registration.primaRegistrazione).toLocaleDateString('it-IT')}
                  </div>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded p-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-700">Computer Key:</span>
                    <button 
                      onClick={() => navigator.clipboard.writeText(registration.computerKey)}
                      className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
                      title="Copia Computer Key"
                    >
                      <i className="fas fa-copy mr-1"></i>
                      Copia
                    </button>
                  </div>
                  <p className="text-xs font-mono text-gray-900 mt-1 break-all bg-white px-2 py-1 rounded border">
                    {registration.computerKey}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg mt-3">
        <div className="flex items-start">
          <i className="fas fa-info-circle text-blue-600 mt-0.5 mr-2 flex-shrink-0"></i>
          <p className="text-sm text-blue-800">
            <strong>Gestione Dispositivi:</strong> Le Computer Key vengono assegnate tramite la sezione 
            "Qlm Register" durante la classificazione delle registrazioni software.
          </p>
        </div>
      </div>
    </div>
  );
}

interface LicenseModalProps {
  license: LicenseWithDetails | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: () => void;
  isEditMode?: boolean;
  canEdit?: boolean;
}

export default function LicenseModal({ license, isOpen, onClose, onEdit, isEditMode, canEdit = false }: LicenseModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedLicense, setEditedLicense] = useState<Partial<LicenseWithDetails>>({});
  const queryClient = useQueryClient();

  useEffect(() => {
    if (license && isOpen) {
      setEditedLicense({
        maxUsers: license.maxUsers,
        maxDevices: license.maxDevices,
        price: license.price,
        discount: license.discount,
        status: license.status,
        licenseType: license.licenseType,
        renewalEnabled: license.renewalEnabled || false,
        renewalPeriod: license.renewalPeriod
      });
      setIsEditing(false);
    }
  }, [license, isOpen]);

  const handleSave = async () => {
    if (!license || !editedLicense) return;

    try {
      const token = localStorage.getItem('token');
      
      // Prepara i dati per l'aggiornamento
      const updateData = {
        ...editedLicense,
        // Assicurati che i valori numerici siano corretti
        maxUsers: parseInt(editedLicense.maxUsers?.toString() || '1'),
        maxDevices: parseInt(editedLicense.maxDevices?.toString() || '1'),
        price: parseFloat(editedLicense.price?.toString() || '0'),
        discount: parseFloat(editedLicense.discount?.toString() || '0')
      };

      const response = await fetch(`/api/licenses/${license.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });

      if (response.ok) {
        queryClient.invalidateQueries({ queryKey: ['/api/licenses'] });
        setIsEditing(false);
        alert('Licenza aggiornata con successo!');
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(`Errore nell'aggiornamento: ${errorData.message || 'Errore sconosciuto'}`);
      }
    } catch (error) {
      console.error('Error updating license:', error);
      alert('Errore nell\'aggiornamento della licenza');
    }
  };

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
      <DialogContent className="sm:max-w-5xl max-h-[95vh] overflow-y-auto">
        <DialogHeader className="pb-3">
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <i className={`fas ${isEditing ? 'fa-edit text-green-600' : 'fa-key text-blue-600'}`}></i>
              {isEditing ? 'Modifica Licenza' : 'Dettagli Licenza'}
            </div>
            {getStatusBadge(license.status)}
          </DialogTitle>
          <DialogDescription className="text-sm">
            {isEditing ? 'Modifica i parametri della licenza' : 'Informazioni complete sulla licenza selezionata'}
          </DialogDescription>
        </DialogHeader>

        {/* Chiave di Attivazione */}
        <div className="bg-gray-50 p-3 rounded-lg text-center mb-4">
          <Label className="text-xs font-medium text-gray-700">Chiave di Attivazione</Label>
          <p className="text-lg font-mono font-semibold text-gray-900 mt-1 tracking-wider">
            {license.activationKey}
          </p>
        </div>

        {/* Layout compatto a griglia */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
          {/* Cliente */}
          <div className="bg-white border rounded-lg p-3">
            <h3 className="text-sm font-semibold text-gray-900 mb-2 pb-1 border-b">Cliente</h3>
            <div className="space-y-1">
              <div className="flex justify-between items-start">
                <span className="text-xs text-gray-600">Nome:</span>
                <span className="text-xs font-medium text-gray-900 text-right">{license.client?.name || license.clientName || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-xs text-gray-600">Email:</span>
                <span className="text-xs text-gray-900 text-right">{license.client?.email || license.clientEmail || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-xs text-gray-600">Azienda:</span>
                <span className="text-xs font-medium text-gray-900 text-right">{license.company?.name || license.companyName || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Prodotto */}
          <div className="bg-white border rounded-lg p-3">
            <h3 className="text-sm font-semibold text-gray-900 mb-2 pb-1 border-b">Prodotto</h3>
            <div className="space-y-1">
              <div className="flex justify-between items-start">
                <span className="text-xs text-gray-600">Software:</span>
                <span className="text-xs font-medium text-gray-900 text-right">
                  {license.product?.name} {license.product?.version}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600">Tipologia:</span>
                {isEditing ? (
                  <Select 
                    value={editedLicense.licenseType || license.licenseType} 
                    onValueChange={(value) => setEditedLicense({...editedLicense, licenseType: value})}
                  >
                    <SelectTrigger className="h-6 text-xs w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="permanente">Permanente</SelectItem>
                      <SelectItem value="trial">Trial</SelectItem>
                      <SelectItem value="abbonamento_mensile">Mensile</SelectItem>
                      <SelectItem value="abbonamento_annuale">Annuale</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <span className="text-xs text-gray-900 text-right">
                    {getLicenseTypeLabel(license.licenseType)}
                  </span>
                )}
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600">Prezzo:</span>
                {isEditing ? (
                  <div className="flex flex-col gap-1">
                    <div className="flex gap-1 items-center">
                      <Input
                        type="number"
                        step="1"
                        value={editedLicense.price || license.price || 0}
                        onChange={(e) => setEditedLicense({...editedLicense, price: e.target.value === '' ? 0 : parseFloat(e.target.value)})}
                        className="h-6 text-xs w-16"
                        placeholder="0"
                        min="0"
                      />
                      <span className="text-xs text-gray-600">cr</span>
                    </div>
                    <div className="flex gap-1 items-center">
                      <Input
                        type="number"
                        step="0.01"
                        value={editedLicense.discount || license.discount || 0}
                        onChange={(e) => setEditedLicense({...editedLicense, discount: e.target.value === '' ? 0 : parseFloat(e.target.value)})}
                        className="h-6 text-xs w-16"
                        placeholder="0"
                        max="100"
                        min="0"
                      />
                      <span className="text-xs text-gray-600">%</span>
                    </div>
                  </div>
                ) : (
                  <span className="text-xs font-medium text-gray-900 text-right">
                    {Math.round(parseFloat((license.price || 0).toString()))} crediti
                    {license.discount && parseFloat((license.discount || 0).toString()) > 0 && (
                      <span className="text-green-600 ml-1">
                        (-{parseFloat((license.discount || 0).toString()).toFixed(1)}%)
                      </span>
                    )}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Limiti & Date */}
          <div className="bg-white border rounded-lg p-3">
            <h3 className="text-sm font-semibold text-gray-900 mb-2 pb-1 border-b">Limiti & Date</h3>
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600">Utenti:</span>
                {isEditing ? (
                  <Input
                    type="number"
                    value={editedLicense.maxUsers || 1}
                    onChange={(e) => setEditedLicense({...editedLicense, maxUsers: parseInt(e.target.value) || 1})}
                    className="h-6 text-xs w-16"
                    min="1"
                  />
                ) : (
                  <span className="text-xs font-medium text-gray-900">{license.maxUsers || 1}</span>
                )}
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600">Dispositivi:</span>
                {isEditing ? (
                  <Input
                    type="number"
                    value={editedLicense.maxDevices || 1}
                    onChange={(e) => setEditedLicense({...editedLicense, maxDevices: parseInt(e.target.value) || 1})}
                    className="h-6 text-xs w-16"
                    min="1"
                  />
                ) : (
                  <span className="text-xs font-medium text-gray-900">{license.maxDevices || 1}</span>
                )}
              </div>
              <Separator className="my-1" />
              <div className="flex justify-between items-start">
                <span className="text-xs text-gray-600">Creata il:</span>
                <span className="text-xs text-gray-900 text-right">
                  {license.createdAt 
                    ? new Date(license.createdAt).toLocaleDateString('it-IT')
                    : 'N/A'
                  }
                </span>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-xs text-gray-600">Attivata il:</span>
                <span className="text-xs text-gray-900 text-right">
                  {license.activationDate 
                    ? new Date(license.activationDate).toLocaleDateString('it-IT')
                    : 'Non attivata'
                  }
                </span>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-xs text-gray-600">Scade il:</span>
                <span className={`text-xs font-medium text-right ${
                  license.expiryDate ? (
                    new Date(license.expiryDate) < new Date() ? 'text-red-600' :
                    new Date(license.expiryDate) < new Date(Date.now() + 30*24*60*60*1000) ? 'text-orange-600' :
                    'text-green-600'
                  ) : 'text-gray-900'
                }`}>
                  {license.expiryDate 
                    ? new Date(license.expiryDate).toLocaleDateString('it-IT')
                    : (license.licenseType === 'permanente' ? 'Permanente' : 'N/A')
                  }
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600">Rinnovo Auto:</span>
                {isEditing ? (
                  <div className="space-y-1">
                    <label className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={editedLicense.renewalEnabled || false}
                        onChange={(e) => setEditedLicense({...editedLicense, renewalEnabled: e.target.checked})}
                        className="h-3 w-3 text-blue-600 rounded border-gray-300"
                      />
                      <span className="text-xs text-gray-900">Attivo</span>
                    </label>
                    {editedLicense.renewalEnabled && (
                      <Select
                        value={editedLicense.renewalPeriod || ''}
                        onValueChange={(value) => setEditedLicense({...editedLicense, renewalPeriod: value})}
                      >
                        <SelectTrigger className="h-6 text-xs w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="monthly">Mensile</SelectItem>
                          <SelectItem value="yearly">Annuale</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-gray-900 text-right">
                    {license.renewalEnabled ? (
                      <span className="flex items-center text-green-600">
                        <i className="fas fa-check-circle mr-1"></i>
                        {license.renewalPeriod === 'monthly' ? 'Mensile' : license.renewalPeriod === 'yearly' ? 'Annuale' : 'Attivo'}
                      </span>
                    ) : (
                      <span className="flex items-center text-red-600">
                        <i className="fas fa-times-circle mr-1"></i>
                        Disattivo
                      </span>
                    )}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Moduli Attivi - Compatto */}
        <div className="bg-white border rounded-lg p-3 mb-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Moduli Attivi</h3>
            <div className="flex flex-wrap gap-1">
              {license.activeModules && license.activeModules.length > 0 ? (
                license.activeModules.map((module: string, index: number) => (
                  <Badge key={index} variant="outline" className="capitalize text-xs h-5">
                    {module}
                  </Badge>
                ))
              ) : (
                <Badge variant="secondary" className="text-xs h-5">
                  Nessun modulo attivo
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Dispositivi Autorizzati - Compatto */}
        <div className="bg-white border rounded-lg p-3 mb-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-2 pb-1 border-b">Dispositivi Autorizzati</h3>
          <DeviceKeysSection licenseId={license.id} />
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-2 pt-3 border-t">
          <Button variant="outline" onClick={onClose} size="sm">
            Chiudi
          </Button>
          {canEdit && !isEditing && (
            <Button onClick={() => setIsEditing(true)} className="bg-primary hover:bg-blue-700" size="sm">
              <i className="fas fa-edit mr-1"></i>
              Modifica
            </Button>
          )}
          {isEditing && (
            <>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setIsEditing(false);
                  setEditedLicense({
                    maxUsers: license.maxUsers,
                    maxDevices: license.maxDevices,
                    price: license.price,
                    discount: license.discount,
                    status: license.status,
                    licenseType: license.licenseType,
                    renewalEnabled: license.renewalEnabled || false,
                    renewalPeriod: license.renewalPeriod
                  });
                }}
              >
                Annulla
              </Button>
              <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700" size="sm">
                <i className="fas fa-save mr-1"></i>
                Salva
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
