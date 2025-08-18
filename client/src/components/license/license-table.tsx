import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import React, { useState } from 'react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

// Helper functions for date comparisons (assuming these are defined elsewhere or should be included)
const isExpired = (expiryDate: string | Date): boolean => {
  const expiry = new Date(expiryDate);
  const now = new Date();
  return expiry < now;
};

const isExpiringSoon = (expiryDate: string | Date): boolean => {
  const expiry = new Date(expiryDate);
  const now = new Date();
  const diffTime = expiry.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays >= 0 && diffDays <= 7; // Expiring within 7 days
};


function LicenseModal({ license, isOpen, onClose, onEdit }: { license: any, isOpen: boolean, onClose: () => void, onEdit?: () => void }) {
  if (!license) {
    return null;
  }

  // State for form inputs if editing
  const [editedLicense, setEditedLicense] = useState(license);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setEditedLicense(prev => ({ ...prev, [id]: value }));
  };

  const handleSelectChange = (value: string, field: string) => {
    setEditedLicense(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    // Here you would typically call an API to save the changes
    console.log("Saving changes:", editedLicense);
    onEdit?.(); // Call the onEdit prop passed from parent if it exists
    onClose();
  };


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{onEdit ? "Modifica Licenza" : "Dettagli Licenza"}</DialogTitle>
          <DialogDescription>
            {onEdit ? "Apporta modifiche alla licenza." : "Visualizza i dettagli completi della licenza."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="activationKey" className="text-right">
              Chiave Licenza
            </Label>
            <Input id="activationKey" value={editedLicense.activationKey} className="col-span-3" disabled={!onEdit} onChange={handleInputChange}/>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="productName" className="text-right">
              Prodotto
            </Label>
            <Input id="productName" value={editedLicense.product?.name || 'N/A'} className="col-span-3" disabled={!onEdit} onChange={(e) => setEditedLicense(prev => ({ ...prev, product: { ...prev.product, name: e.target.value } }))}/>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="clientName" className="text-right">
              Cliente
            </Label>
            <Input id="clientName" value={editedLicense.client?.name || 'N/A'} className="col-span-3" disabled={!onEdit} onChange={(e) => setEditedLicense(prev => ({ ...prev, client: { ...prev.client, name: e.target.value } }))}/>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="companyName" className="text-right">
              Azienda
            </Label>
            <Input id="companyName" value={editedLicense.company?.name || 'N/A'} className="col-span-3" disabled={!onEdit} onChange={(e) => setEditedLicense(prev => ({ ...prev, company: { ...prev.company, name: e.target.value } }))}/>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="licenseType" className="text-right">
              Tipo Licenza
            </Label>
            <Select onValueChange={(value) => handleSelectChange(value, 'licenseType')} disabled={!onEdit} value={editedLicense.licenseType}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Seleziona tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="permanent">Permanente</SelectItem>
                <SelectItem value="trial">Trial</SelectItem>
                <SelectItem value="subscription">Abbonamento Mensile</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="status" className="text-right">
              Stato
            </Label>
             <Select onValueChange={(value) => handleSelectChange(value, 'status')} disabled={!onEdit} value={editedLicense.status}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Seleziona stato" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="attiva">Attiva</SelectItem>
                <SelectItem value="scaduta">Scaduta</SelectItem>
                <SelectItem value="trial">Trial</SelectItem>
                <SelectItem value="sospesa">Sospesa</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="expiryDate" className="text-right">
              Scadenza
            </Label>
            <Input
              id="expiryDate"
              type="date" // Use type="date" for native date picker
              value={editedLicense.expiryDate ? new Date(editedLicense.expiryDate).toISOString().split('T')[0] : ''}
              className="col-span-3"
              disabled={!onEdit || editedLicense.licenseType === 'permanent'} // Disable if not editing or if license is permanent
              onChange={(e) => {
                const newDate = e.target.value;
                setEditedLicense(prev => ({ ...prev, expiryDate: newDate }));
              }}
            />
          </div>
           <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="price" className="text-right">
              Prezzo
            </Label>
            <Input id="price" value={editedLicense.price || ''} className="col-span-3" disabled={!onEdit} onChange={handleInputChange}/>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="priceType" className="text-right">
              Tipologia Prezzo
            </Label>
            <Select onValueChange={(value) => handleSelectChange(value, 'priceType')} disabled={!onEdit} value={editedLicense.priceType}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Seleziona tipologia" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mensile">Mensile</SelectItem>
                <SelectItem value="annuale">Annuale</SelectItem>
                <SelectItem value="una_tantum">Una Tantum</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {onEdit ? (
          <Button type="submit" onClick={handleSave}>Salva Modifiche</Button>
        ) : (
          <Button onClick={onEdit}>Modifica</Button>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function LicenseTable() {
  const [, setLocation] = useLocation();
  const [isModalOpen, setModalOpen] = useState(false);
  const [selectedLicense, setSelectedLicense] = useState(null);

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const { data: licenses = [], isLoading } = useQuery({
    queryKey: ['/api/licenses'],
    refetchOnWindowFocus: false,
    staleTime: 0,
    queryFn: async () => {
      const token = localStorage.getItem('qlm_token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch('/api/licenses', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Licenses data received:', data);
      return data;
    }
  });

  const getStatusBadge = (status: string) => {
    const variants = {
      'attiva': 'default',
      'scaduta': 'destructive',
      'trial': 'outline',
      'sospesa': 'secondary'
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'}>
        {status === 'attiva' ? 'Attiva' : 
         status === 'scaduta' ? 'Scaduta' : 
         status === 'trial' ? 'Trial' : 
         status === 'sospesa' ? 'Sospesa' : status}
      </Badge>
    );
  };

  const getTypeBadge = (type: string) => {
    const colors = {
      'permanent': 'bg-green-100 text-green-800',
      'trial': 'bg-blue-100 text-blue-800', 
      'subscription': 'bg-purple-100 text-purple-800'
    } as const;

    return (
      <span className={`px-2 py-1 text-xs rounded-full ${colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800'}`}>
        {type === 'permanent' ? 'Permanente' : 
         type === 'trial' ? 'Trial' : 
         type === 'subscription' ? 'Abbonamento' : type}
      </span>
    );
  };

  const getLicenseTypeBadge = (type: string) => {
    const colors = {
      'permanente': 'bg-green-100 text-green-800',
      'trial': 'bg-yellow-100 text-yellow-800',
      'abbonamento_mensile': 'bg-blue-100 text-blue-800',
      'abbonamento_annuale': 'bg-indigo-100 text-indigo-800'
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getLicenseTypeLabel = (type: string) => {
    const labels = {
      'permanente': 'Permanente',
      'trial': 'Trial',
      'abbonamento_mensile': 'Mensile',
      'abbonamento_annuale': 'Annuale'
    };
    return labels[type as keyof typeof labels] || type;
  };

  const openEditModal = async (license: any) => {
    try {
      const token = localStorage.getItem('qlm_token');
      // Fetching detailed license data for editing
      const response = await fetch(`/api/licenses/${license.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const detailedLicense = await response.json();
        // Ensure the fetched data includes all fields needed for the modal,
        // including price and priceType if they are not always present in the initial list.
        setSelectedLicense(detailedLicense);
        setModalOpen(true);
      } else {
        console.error('Failed to fetch license details, using provided license data instead.');
        // Fallback to using the license data passed to the function
        setSelectedLicense(license);
        setModalOpen(true);
      }
    } catch (error) {
      console.error('Error fetching license details:', error);
      // Fallback to using the license data passed to the function
      setSelectedLicense(license);
      setModalOpen(true);
    }
  };

  const closeModal = () => {
    setSelectedLicense(null);
    setModalOpen(false);
  };

  const handleLicenseAction = async (license: any, action: string) => {
    try {
      const token = localStorage.getItem('qlm_token');
      const response = await fetch(`/api/licenses/${license.id}/${action}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        // Refresh licenses list by re-fetching
        window.location.reload();
      } else {
        console.error(`Failed to ${action} license`);
      }
    } catch (error) {
      console.error(`Error ${action} license:`, error);
    }
  };

  const filteredLicenses = licenses.filter((license: any) => {
    const searchTermMatch = 
      license.activationKey.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (license.product?.name.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
      (license.client?.name.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
      (license.company?.name.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);

    const statusMatch = statusFilter === "all" || license.status === statusFilter;
    const typeMatch = typeFilter === "all" || license.licenseType === typeFilter;

    return searchTermMatch && statusMatch && typeMatch;
  });


  return (
    <Card>
      <CardHeader className="space-y-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <i className="fas fa-list text-green-500"></i>
            Elenco Licenze
          </CardTitle>
        </div>

        {/* Filtri */}
        <div className="flex flex-col gap-4">
          <Input
            placeholder="Cerca per chiave licenza, cliente o prodotto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />

          <div className="flex flex-col sm:flex-row gap-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Stato" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti gli stati</SelectItem>
                <SelectItem value="attiva">Attiva</SelectItem>
                <SelectItem value="trial">Trial</SelectItem>
                <SelectItem value="demo">Demo</SelectItem>
                <SelectItem value="scaduta">Scaduta</SelectItem>
                <SelectItem value="sospesa">Sospesa</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti i tipi</SelectItem>
                <SelectItem value="permanent">Permanente</SelectItem>
                <SelectItem value="trial">Trial</SelectItem>
                <SelectItem value="subscription">Abbonamento</SelectItem>
              </SelectContent>
            </Select>

            <Button 
              variant="outline"
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("all");
                setTypeFilter("all");
              }}
              className="w-full sm:w-auto"
            >
              Reset
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Chiave Licenza</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prodotto</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Azienda</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stato</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Scadenza</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Azioni</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredLicenses.map((license: any) => (
                  <tr key={license.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                      {license.activationKey}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <button
                        onClick={() => setLocation('/products')}
                        className="flex items-center text-left hover:text-blue-600 hover:underline transition-colors"
                      >
                        <i className="fas fa-box text-blue-500 mr-2"></i>
                        <div>
                          <div className="font-medium">{license.product?.name || 'N/A'}</div>
                          <div className="text-xs text-gray-500">{license.product?.version || ''}</div>
                        </div>
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <button
                        onClick={() => setLocation('/clients')}
                        className="flex items-center text-left hover:text-green-600 hover:underline transition-colors"
                      >
                        <i className="fas fa-user text-green-500 mr-2"></i>
                        <div>
                          <div className="font-medium">{license.client?.name || 'N/A'}</div>
                          <div className="text-xs text-gray-500">{license.client?.email || ''}</div>
                        </div>
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button
                        onClick={() => setLocation('/companies')}
                        className="flex items-center text-left hover:text-purple-600 hover:underline transition-colors"
                      >
                        <i className="fas fa-building text-gray-400 mr-2"></i>
                        {license.company?.name || 'N/A'}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getLicenseTypeBadge(license.licenseType)}`}>
                        {getLicenseTypeLabel(license.licenseType)}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(license.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {license.expiryDate ? (
                        <div className={
                          isExpired(license.expiryDate) ? 'text-red-600 font-medium' :
                          isExpiringSoon(license.expiryDate) ? 'text-orange-600 font-medium' :
                          'text-green-600'
                        }>
                          {format(new Date(license.expiryDate), 'dd/MM/yyyy', { locale: it })}
                          {isExpiringSoon(license.expiryDate) && !isExpired(license.expiryDate) && (
                            <div className="text-xs text-orange-500">In scadenza</div>
                          )}
                          {isExpired(license.expiryDate) && (
                            <div className="text-xs text-red-500">Scaduta</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Permanente</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => openEditModal(license)}
                          title="Visualizza/Modifica licenza"
                        >
                          <i className="fas fa-edit text-green-600"></i>
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-red-600"
                          onClick={() => {
                            const action = license.status === 'attiva' ? 'suspend' : 'activate';
                            handleLicenseAction(license, action);
                          }}
                          title={license.status === 'attiva' ? 'Sospendi licenza' : 'Attiva licenza'}
                        >
                          <i className={license.status === 'attiva' ? 'fas fa-ban' : 'fas fa-check-circle'}></i>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredLicenses.length === 0 && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <i className="fas fa-key text-gray-400 text-2xl"></i>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nessuna licenza trovata</h3>
                <p className="text-gray-500 mb-4">Inizia creando la tua prima licenza</p>
              </div>
            )}
          </div>
        )}
      </CardContent>

      <LicenseModal
        license={selectedLicense}
        isOpen={isModalOpen}
        onClose={closeModal}
        onEdit={() => handleLicenseAction(selectedLicense, 'update')} // Assuming 'update' is the correct action for saving edits
      />
    </Card>
  );
}