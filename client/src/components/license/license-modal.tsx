
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
      return data.filter((reg: any) => 
        reg.licenzaAssegnata === licenseId && 
        reg.computerKey && 
        reg.computerKey.trim() !== ''
      );
    }
  });

  if (isLoading) {
    return <div className="animate-pulse h-8 bg-gray-200 rounded"></div>;
  }

  if (registrations.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
        <div className="flex items-center text-yellow-800">
          <i className="fas fa-exclamation-triangle mr-2"></i>
          <span className="text-sm font-medium">Nessun Dispositivo Autorizzato</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="bg-green-50 border border-green-200 p-2 rounded-lg">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-green-800">
            <i className="fas fa-shield-alt mr-1"></i>
            {registrations.length} Dispositivo{registrations.length !== 1 ? 'i' : ''} Autorizzato{registrations.length !== 1 ? 'i' : ''}
          </span>
          <Badge variant="secondary" className="text-xs">Attivi</Badge>
        </div>
      </div>

      <div className="space-y-2 max-h-40 overflow-y-auto">
        {registrations.map((registration: DeviceRegistration, index: number) => (
          <div key={registration.id} className="bg-white border border-gray-200 rounded p-2">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1">
                <i className="fas fa-desktop text-blue-500 text-xs"></i>
                <span className="font-medium text-xs">Dispositivo #{index + 1}</span>
              </div>
              <Badge variant="outline" className="text-xs py-0">Attivo</Badge>
            </div>
            
            <div className="text-xs text-gray-600 mb-1">
              <span className="font-medium">{registration.ragioneSociale}</span> • 
              <span className="ml-1">{registration.nomeSoftware} v{registration.versione}</span>
            </div>

            <div className="bg-gray-50 border rounded p-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-700">Computer Key:</span>
                <button 
                  onClick={() => navigator.clipboard.writeText(registration.computerKey)}
                  className="text-xs text-blue-600 hover:text-blue-800"
                  title="Copia Computer Key"
                >
                  <i className="fas fa-copy"></i>
                </button>
              </div>
              <p className="text-xs font-mono text-gray-900 mt-0.5 break-all bg-white px-1 py-0.5 rounded border">
                {registration.computerKey}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

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
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <i className="fas fa-key text-blue-600"></i>
              Dettagli Licenza
            </div>
            {getStatusBadge(license.status)}
          </DialogTitle>
          <DialogDescription className="text-sm">
            Informazioni complete sulla licenza selezionata
          </DialogDescription>
        </DialogHeader>

        {/* Chiave di Attivazione */}
        <div className="bg-gray-50 p-2 rounded-lg text-center mb-3">
          <Label className="text-xs font-medium text-gray-700">Chiave di Attivazione</Label>
          <p className="text-lg font-mono font-semibold text-gray-900 mt-0.5 tracking-wider">
            {license.activationKey}
          </p>
        </div>

        {/* Layout compatto a grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          
          {/* Colonna Sinistra */}
          <div className="space-y-4">
            
            {/* Informazioni Generali */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <h3 className="text-md font-semibold text-gray-900 mb-2 flex items-center">
                <i className="fas fa-info-circle text-blue-600 mr-2"></i>
                Informazioni Generali
              </h3>
              <div className="grid grid-cols-3 gap-3">
                {/* Cliente */}
                <div className="bg-white rounded p-2">
                  <div className="flex items-center mb-1">
                    <i className="fas fa-user text-blue-500 text-sm mr-1"></i>
                    <h4 className="font-medium text-xs text-gray-900">Cliente</h4>
                  </div>
                  <div className="space-y-1">
                    <div>
                      <p className="text-xs font-medium text-gray-900">{license.client?.name || 'N/A'}</p>
                      <p className="text-xs text-gray-600">{license.client?.email || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-blue-600">{license.company?.name || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Prodotto */}
                <div className="bg-white rounded p-2">
                  <div className="flex items-center mb-1">
                    <i className="fas fa-box text-green-500 text-sm mr-1"></i>
                    <h4 className="font-medium text-xs text-gray-900">Prodotto</h4>
                  </div>
                  <div className="space-y-1">
                    <div>
                      <p className="text-xs font-medium text-gray-900">
                        {license.product?.name} {license.product?.version}
                      </p>
                      <p className="text-xs text-gray-600">
                        {getLicenseTypeLabel(license.licenseType)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Prezzo e Limiti */}
                <div className="bg-white rounded p-2">
                  <div className="flex items-center mb-1">
                    <i className="fas fa-tags text-purple-500 text-sm mr-1"></i>
                    <h4 className="font-medium text-xs text-gray-900">Prezzo & Limiti</h4>
                  </div>
                  <div className="space-y-1">
                    <div>
                      <p className="text-xs font-medium text-gray-900">
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
                    <div className="flex gap-2 text-xs">
                      <span>{license.maxUsers || 1} utenti</span>
                      <span>{license.maxDevices || 1} dispositivi</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Avviso */}
              <div className="bg-blue-50 border border-blue-200 p-2 rounded mt-2">
                <p className="text-xs text-blue-800">
                  <i className="fas fa-info-circle mr-1"></i>
                  <strong>Configurazione Ereditata:</strong> Prezzo, sconto e limiti sono ereditati dal prodotto associato.
                </p>
              </div>
            </div>

            {/* Date e Status */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <h3 className="text-md font-semibold text-gray-900 mb-2 flex items-center">
                <i className="fas fa-calendar-alt text-green-600 mr-2"></i>
                Date e Status
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white rounded p-2">
                  <div className="flex items-center mb-1">
                    <i className="fas fa-plus-circle text-blue-500 text-xs mr-1"></i>
                    <span className="text-xs text-gray-500 uppercase">Creata il</span>
                  </div>
                  <p className="text-xs font-medium text-gray-900">
                    {license.createdAt 
                      ? new Date(license.createdAt).toLocaleDateString('it-IT')
                      : 'N/A'
                    }
                  </p>
                </div>

                <div className="bg-white rounded p-2">
                  <div className="flex items-center mb-1">
                    <i className="fas fa-play-circle text-green-500 text-xs mr-1"></i>
                    <span className="text-xs text-gray-500 uppercase">Attivata il</span>
                  </div>
                  <p className="text-xs font-medium text-gray-900">
                    {license.activationDate 
                      ? new Date(license.activationDate).toLocaleDateString('it-IT')
                      : 'Non attivata'
                    }
                  </p>
                </div>

                <div className="bg-white rounded p-2">
                  <div className="flex items-center mb-1">
                    <i className="fas fa-stop-circle text-red-500 text-xs mr-1"></i>
                    <span className="text-xs text-gray-500 uppercase">Scade il</span>
                  </div>
                  <p className={`text-xs font-medium ${
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

                <div className="bg-white rounded p-2">
                  <div className="flex items-center mb-1">
                    <i className="fas fa-sync-alt text-purple-500 text-xs mr-1"></i>
                    <span className="text-xs text-gray-500 uppercase">Rinnovo Auto</span>
                  </div>
                  <div className="flex items-center">
                    {license.renewalEnabled ? (
                      <span className="flex items-center text-green-600">
                        <i className="fas fa-check-circle mr-1 text-xs"></i>
                        <span className="text-xs font-medium">
                          {license.renewalPeriod === 'monthly' ? 'Mensile' : license.renewalPeriod === 'yearly' ? 'Annuale' : 'Attivo'}
                        </span>
                      </span>
                    ) : (
                      <span className="flex items-center text-red-600">
                        <i className="fas fa-times-circle mr-1 text-xs"></i>
                        <span className="text-xs font-medium">Disattivo</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Moduli Attivi */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <h3 className="text-md font-semibold text-gray-900 mb-2 flex items-center">
                <i className="fas fa-puzzle-piece text-yellow-600 mr-2"></i>
                Moduli Attivi
              </h3>
              <div className="bg-white rounded p-2">
                <div className="flex flex-wrap gap-1">
                  {license.activeModules && license.activeModules.length > 0 ? (
                    license.activeModules.map((module: string, index: number) => (
                      <Badge key={index} variant="outline" className="text-xs px-2 py-0 bg-blue-50 border-blue-200 text-blue-700">
                        <i className="fas fa-cog mr-1"></i>
                        {module}
                      </Badge>
                    ))
                  ) : (
                    <div className="flex items-center text-gray-500">
                      <i className="fas fa-exclamation-circle mr-1"></i>
                      <span className="text-xs">Nessun modulo attivo</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Colonna Destra */}
          <div className="space-y-4">
            
            {/* Dispositivi Autorizzati */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
              <h3 className="text-md font-semibold text-gray-900 mb-2 flex items-center">
                <i className="fas fa-desktop text-purple-600 mr-2"></i>
                Dispositivi Autorizzati
              </h3>
              <div className="bg-white rounded p-2">
                <DeviceKeysSection licenseId={license.id} />
              </div>
            </div>

            {/* Info Gestione Dispositivi */}
            <div className="bg-blue-50 border border-blue-200 p-2 rounded-lg">
              <div className="flex items-start">
                <i className="fas fa-info-circle text-blue-600 mt-0.5 mr-2 flex-shrink-0"></i>
                <p className="text-xs text-blue-800">
                  <strong>Gestione Dispositivi:</strong> Le Computer Key vengono assegnate tramite la sezione 
                  "Qlm Register" durante la classificazione delle registrazioni software.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t">
          <Button variant="outline" onClick={onClose} size="sm">
            Chiudi
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
