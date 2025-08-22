
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
  licenzaAssegnata?: string;
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
      return data.filter((reg: any) => 
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
        // Solo i campi modificabili in una licenza
        renewalEnabled: license.renewalEnabled || false,
        renewalPeriod: license.renewalPeriod,
        // NON includere: maxUsers, maxDevices, price, discount, licenseType, priceType
        // perché sono ereditati dal prodotto e non devono essere modificabili
      });
      setIsEditing(false);
    }
  }, [license, isOpen]);

  const handleSave = async () => {
    if (!license || !editedLicense) return;

    try {
      const token = localStorage.getItem('token');
      
      // Prepara i dati per l'aggiornamento - SOLO campi modificabili
      const updateData = {
        // Solo i campi che possono essere modificati in una licenza
        renewalEnabled: editedLicense.renewalEnabled || false,
        renewalPeriod: editedLicense.renewalPeriod,
        // NON includere: maxUsers, maxDevices, price, discount, licenseType, priceType
        // perché sono ereditati dal prodotto
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

        {/* Layout migliorato organizzato */}
        <div className="space-y-6">
          {/* Sezione Informazioni Generali - Layout orizzontale */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <i className="fas fa-info-circle text-blue-600 mr-2"></i>
              Informazioni Generali
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Cliente */}
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <div className="flex items-center mb-2">
                  <i className="fas fa-user text-blue-500 mr-2"></i>
                  <h4 className="font-medium text-gray-900">Cliente</h4>
                </div>
                <div className="space-y-2">
                  <div>
                    <span className="text-xs text-gray-500 uppercase tracking-wide">Nome</span>
                    <p className="text-sm font-medium text-gray-900">{license.client?.name || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 uppercase tracking-wide">Email</span>
                    <p className="text-sm text-gray-700">{license.client?.email || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 uppercase tracking-wide">Azienda</span>
                    <p className="text-sm font-medium text-gray-900">{license.company?.name || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Prodotto */}
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <div className="flex items-center mb-2">
                  <i className="fas fa-box text-green-500 mr-2"></i>
                  <h4 className="font-medium text-gray-900">Prodotto</h4>
                </div>
                <div className="space-y-2">
                  <div>
                    <span className="text-xs text-gray-500 uppercase tracking-wide">Software</span>
                    <p className="text-sm font-medium text-gray-900">
                      {license.product?.name} {license.product?.version}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 uppercase tracking-wide">Tipologia</span>
                    <p className="text-sm text-gray-700">
                      {getLicenseTypeLabel(license.licenseType)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Prezzo e Limiti */}
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <div className="flex items-center mb-2">
                  <i className="fas fa-tags text-purple-500 mr-2"></i>
                  <h4 className="font-medium text-gray-900">Prezzo & Limiti</h4>
                </div>
                <div className="space-y-2">
                  <div>
                    <span className="text-xs text-gray-500 uppercase tracking-wide">Prezzo</span>
                    <p className="text-sm font-medium text-gray-900">
                      {license.priceType === 'prezzo' 
                        ? `€${parseFloat((license.price || 0).toString()).toFixed(2)}` 
                        : `${Math.round(parseFloat((license.price || 0).toString()))} crediti`}
                      {license.discount && parseFloat((license.discount || 0).toString()) > 0 && (
                        <span className="text-green-600 ml-1 text-xs">
                          (-{parseFloat((license.discount || 0).toString()).toFixed(1)}%)
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-xs text-gray-500 uppercase tracking-wide">Utenti</span>
                      <p className="text-sm font-medium text-gray-900">{license.maxUsers || 1}</p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500 uppercase tracking-wide">Dispositivi</span>
                      <p className="text-sm font-medium text-gray-900">{license.maxDevices || 1}</p>
                    </div>
                  </div>
                </div>
                {/* Avviso per l'utente */}
                <div className="bg-blue-50 border border-blue-200 p-2 rounded-lg mt-3">
                  <div className="flex items-start">
                    <i className="fas fa-info-circle text-blue-600 mt-0.5 mr-2 flex-shrink-0"></i>
                    <p className="text-xs text-blue-800">
                      <strong>Configurazione Ereditata:</strong> Prezzo, sconto e limiti sono ereditati dal prodotto associato. 
                      Per modificarli, aggiorna la configurazione del prodotto nella sezione "Prodotti".
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sezione Date e Status */}
          <div className="bg-gradient-to-r from-green-50 to-teal-50 border border-green-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <i className="fas fa-calendar-alt text-green-600 mr-2"></i>
              Date e Status
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <div className="flex items-center mb-1">
                  <i className="fas fa-plus-circle text-blue-500 text-sm mr-2"></i>
                  <span className="text-xs text-gray-500 uppercase tracking-wide">Creata il</span>
                </div>
                <p className="text-sm font-medium text-gray-900">
                  {license.createdAt 
                    ? new Date(license.createdAt).toLocaleDateString('it-IT')
                    : 'N/A'
                  }
                </p>
              </div>

              <div className="bg-white rounded-lg p-3 shadow-sm">
                <div className="flex items-center mb-1">
                  <i className="fas fa-play-circle text-green-500 text-sm mr-2"></i>
                  <span className="text-xs text-gray-500 uppercase tracking-wide">Attivata il</span>
                </div>
                <p className="text-sm font-medium text-gray-900">
                  {license.activationDate 
                    ? new Date(license.activationDate).toLocaleDateString('it-IT')
                    : 'Non attivata'
                  }
                </p>
              </div>

              <div className="bg-white rounded-lg p-3 shadow-sm">
                <div className="flex items-center mb-1">
                  <i className="fas fa-stop-circle text-red-500 text-sm mr-2"></i>
                  <span className="text-xs text-gray-500 uppercase tracking-wide">Scade il</span>
                </div>
                <p className={`text-sm font-medium ${
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
                </p>
              </div>

              <div className="bg-white rounded-lg p-3 shadow-sm">
                <div className="flex items-center mb-1">
                  <i className="fas fa-sync-alt text-purple-500 text-sm mr-2"></i>
                  <span className="text-xs text-gray-500 uppercase tracking-wide">Rinnovo Auto</span>
                </div>
                {isEditing ? (
                  <div className="space-y-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={editedLicense.renewalEnabled || false}
                        onChange={(e) => setEditedLicense({...editedLicense, renewalEnabled: e.target.checked})}
                        className="h-4 w-4 text-blue-600 rounded border-gray-300"
                      />
                      <span className="text-sm text-gray-900">Attivo</span>
                    </label>
                    {editedLicense.renewalEnabled && (
                      <Select
                        value={editedLicense.renewalPeriod || ''}
                        onValueChange={(value) => setEditedLicense({...editedLicense, renewalPeriod: value})}
                      >
                        <SelectTrigger className="h-7 text-sm w-full">
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
                  <div className="flex items-center">
                    {license.renewalEnabled ? (
                      <span className="flex items-center text-green-600">
                        <i className="fas fa-check-circle mr-1"></i>
                        <span className="text-sm font-medium">
                          {license.renewalPeriod === 'monthly' ? 'Mensile' : license.renewalPeriod === 'yearly' ? 'Annuale' : 'Attivo'}
                        </span>
                      </span>
                    ) : (
                      <span className="flex items-center text-red-600">
                        <i className="fas fa-times-circle mr-1"></i>
                        <span className="text-sm font-medium">Disattivo</span>
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

        {/* Sezione Moduli Attivi */}
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
              <i className="fas fa-puzzle-piece text-yellow-600 mr-2"></i>
              Moduli Attivi
            </h3>
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <div className="flex flex-wrap gap-2">
                {license.activeModules && license.activeModules.length > 0 ? (
                  license.activeModules.map((module: string, index: number) => (
                    <Badge key={index} variant="outline" className="capitalize text-sm h-7 px-3 bg-blue-50 border-blue-200 text-blue-700">
                      <i className="fas fa-cog mr-1"></i>
                      {module}
                    </Badge>
                  ))
                ) : (
                  <div className="flex items-center text-gray-500">
                    <i className="fas fa-exclamation-circle mr-2"></i>
                    <span className="text-sm">Nessun modulo attivo</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sezione Dispositivi Autorizzati */}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
              <i className="fas fa-desktop text-purple-600 mr-2"></i>
              Dispositivi Autorizzati
            </h3>
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <DeviceKeysSection licenseId={license.id} />
            </div>
          </div>
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
                    // Solo i campi modificabili
                    renewalEnabled: license.renewalEnabled || false,
                    renewalPeriod: license.renewalPeriod,
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
