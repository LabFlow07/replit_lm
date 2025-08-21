import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";

import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { apiRequest } from "@/lib/queryClient";
import { Search, Monitor, User, MapPin, Calendar, Activity, Settings, X, Eye, Edit } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import Sidebar from '@/components/layout/sidebar';
import { useSidebar } from "@/contexts/SidebarContext";
import { useAuth } from "@/hooks/use-auth"; // Import useAuth hook

import { useToast } from "@/hooks/use-toast";

// Componente per la ricerca intelligente delle aziende
interface CompanySearchInputProps {
  companies: Company[];
  onCompanySelect: (companyId: string) => void;
  placeholder?: string;
  initialCompanyId?: string | null; // Prop for initial company selection
}

function CompanySearchInput({ companies, onCompanySelect, placeholder = "Cerca azienda...", initialCompanyId }: CompanySearchInputProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  // Set initial company if provided and not already selected
  useEffect(() => {
    if (initialCompanyId && (!selectedCompany || selectedCompany.id !== initialCompanyId)) {
      const company = companies.find(c => c.id === initialCompanyId);
      if (company) {
        console.log('Setting initial company:', company);
        setSelectedCompany(company);
        setSearchTerm(company.name || '');
        onCompanySelect(company.id);
      }
    } else if (!initialCompanyId && selectedCompany) {
      // Only clear when no initial company ID and there's currently a selection
      console.log('Clearing company selection');
      setSelectedCompany(null);
      setSearchTerm('');
      onCompanySelect('');
    }
  }, [initialCompanyId]); // Only depend on initialCompanyId


  // Filtra le aziende in base al termine di ricerca
  // Safe arrays
  const safeCompanies = Array.isArray(companies) ? companies : [];

  const filteredCompanies = safeCompanies.filter((company: Company) => {
    const searchLower = searchTerm.toLowerCase();
    return company.name?.toLowerCase().includes(searchLower) ||
           company.partitaIva?.toLowerCase().includes(searchLower);
  }).sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  const handleCompanySelect = (company: Company) => {
    setSelectedCompany(company);
    setSearchTerm(company.name || '');
    setIsOpen(false);
    onCompanySelect(company.id);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setIsOpen(true);
    if (!e.target.value) {
      setSelectedCompany(null);
      onCompanySelect('');
    }
  };

  return (
    <div className="relative company-search-container">
      <Input
        type="text"
        value={searchTerm}
        onChange={handleInputChange}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        className="w-full"
        autoComplete="off"
      />

      {isOpen && searchTerm && filteredCompanies.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto company-search-dropdown">
          {filteredCompanies.slice(0, 20).map((company: Company) => (
            <div
              key={company.id}
              onClick={() => handleCompanySelect(company)}
              className="px-3 py-2 cursor-pointer hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
            >
              <div className="flex flex-col">
                <div className="font-medium text-sm text-gray-900">
                  <i className="fas fa-building mr-2 text-blue-600"></i>
                  {company.name}
                </div>
                {company.partitaIva && (
                  <div className="text-xs text-gray-600">
                    P.IVA: {company.partitaIva}
                  </div>
                )}
              </div>
            </div>
          ))}

          {filteredCompanies.length > 20 && (
            <div className="px-3 py-2 text-xs text-gray-500 text-center bg-gray-50">
              Visualizzati primi 20 risultati. Affina la ricerca per vedere di più.
            </div>
          )}
        </div>
      )}

      {isOpen && searchTerm && filteredCompanies.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg company-search-dropdown">
          <div className="px-3 py-2 text-sm text-gray-500 text-center">
            Nessuna azienda trovata
          </div>
        </div>
      )}
    </div>
  );
}

// Componente per la ricerca intelligente dei clienti
interface ClientSearchInputProps {
  clients: Client[];
  companies: Company[];
  onClientSelect: (clientId: string) => void;
  companyId?: string;
  placeholder?: string;
  initialClientId?: string; // Add initial client ID prop
}

function ClientSearchInput({ clients, companies, onClientSelect, companyId, placeholder = "Cerca cliente...", initialClientId }: ClientSearchInputProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // Safe arrays to prevent runtime errors
  const safeClients = Array.isArray(clients) ? clients : [];
  const safeCompanies = Array.isArray(companies) ? companies : [];

  // Funzione per ottenere il nome dell'azienda
  const getCompanyName = (companyId: string) => {
    const company = safeCompanies.find((c: Company) => c.id === companyId);
    return company ? company.name : 'N/A';
  };

  // Handle initial client selection and company changes
  useEffect(() => {
    if (initialClientId && companyId && (!selectedClient || selectedClient.id !== initialClientId)) {
      const client = safeClients.find(c => c.id === initialClientId);
      if (client && (client.company_id === companyId || client.companyId === companyId)) {
        console.log('Setting initial client:', client);
        setSelectedClient(client);
        setSearchTerm(client.name || '');
        onClientSelect(client.id);
      }
    } else if ((!companyId || !initialClientId) && selectedClient) {
      // Only reset when company changes or client is cleared and there's currently a selection
      console.log('Clearing client selection');
      setSelectedClient(null);
      setSearchTerm("");
      onClientSelect('');
    }
  }, [companyId, initialClientId]); // Only depend on the key props

  // Filtra i clienti SOLO per l'azienda selezionata
  const filteredClients = safeClients.filter((client: Client) => {
    // Filtra RIGOROSAMENTE per azienda - deve corrispondere esattamente
    const clientCompanyId = client.companyId || client.company_id;
    if (!companyId || clientCompanyId !== companyId) {
      return false;
    }

    // Poi filtra per termine di ricerca se presente
    if (!searchTerm) return true;

    const searchLower = searchTerm.toLowerCase();
    const clientMatch = client.name?.toLowerCase().includes(searchLower) ||
                       client.email?.toLowerCase().includes(searchLower);

    return clientMatch;
  }).sort((a, b) => {
    // Ordina per nome cliente
    return (a.name || '').localeCompare(b.name || '');
  });

  const handleClientSelect = (client: Client) => {
    setSelectedClient(client);
    setSearchTerm(client.name || '');
    setIsOpen(false);
    onClientSelect(client.id);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setIsOpen(true);
    if (!e.target.value) {
      setSelectedClient(null);
      onClientSelect(''); // Clear selection if input is cleared
    }
  };

  return (
    <div className="relative client-search-container">
      <Input
        type="text"
        value={searchTerm}
        onChange={handleInputChange}
        onFocus={() => setIsOpen(true)}
        placeholder={companyId ? placeholder : "Seleziona prima un'azienda"}
        className="w-full"
        autoComplete="off"
        disabled={!companyId}
      />

      {isOpen && companyId && filteredClients.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto client-search-dropdown">
          {filteredClients.map((client: Client) => (
            <div
              key={client.id}
              onClick={() => handleClientSelect(client)}
              className="px-3 py-2 cursor-pointer hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
            >
              <div className="flex flex-col">
                <div className="font-medium text-sm text-gray-900">
                  <i className="fas fa-user mr-2 text-green-600"></i>
                  {client.name}
                </div>
                <div className="text-xs text-gray-600">
                  {client.email}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isOpen && companyId && filteredClients.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg client-search-dropdown">
          <div className="px-3 py-2 text-sm text-gray-500 text-center">
            {searchTerm ? "Nessun cliente trovato" : "Nessun cliente disponibile per questa azienda"}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SoftwareRegistrations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [searchInput, setSearchInput] = useState(''); // State for the input field
  const [searchTerm, setSearchTerm] = useState(''); // State for the actual search term after user action
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedRegistration, setSelectedRegistration] = useState<SoftwareRegistration | null>(null);
  const [isClassifyModalOpen, setIsClassifyModalOpen] = useState(false); // Renamed for clarity
  const [isEditModalOpen, setIsEditModalOpen] = useState(false); // For toggling view vs edit mode
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false); // Separate dialog for view-only
  const [validatingId, setValidatingId] = useState<string | null>(null); // State for validating key
  const { contentMargin } = useSidebar();
  const { user } = useAuth(); // Use the actual user from useAuth hook

  // Initialize form with default values
  const { register, handleSubmit, reset, setValue, watch, formState: { isSubmitting } } = useForm<any>({
    defaultValues: {
      authorizeDevice: false // Default value for the checkbox
    }
  });

  // Function to execute search
  const executeSearch = () => {
    setSearchTerm(searchInput.trim());
  };

  // Handle Enter key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      executeSearch();
    }
  };

  // Clear search
  const clearSearch = () => {
    setSearchInput('');
    setSearchTerm('');
  };

  // Fetch software registrations
  const { data: registrations = [], isLoading } = useQuery({
    queryKey: ['/api/software/registrations', { status: statusFilter, search: searchTerm }],
    queryFn: async () => {
      const params = new URLSearchParams({
        ...(statusFilter && statusFilter !== 'all' && { status: statusFilter }),
        ...(searchTerm && { search: searchTerm })
      });
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/software/registrazioni?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch registrations');
      }
      const data = await response.json();
      return data.map((reg: any) => ({
        ...reg,
        nomeSoftware: reg.nomeSoftware || reg.softwareName,
        versione: reg.versione || reg.version,
        ragioneSociale: reg.ragioneSociale || reg.clientName,
        computerKey: reg.computerKey,
        primaRegistrazione: reg.primaRegistrazione || reg.registrationDate,
        ultimaAttivita: reg.ultimaAttivita || reg.lastSeen,
        clienteAssegnato: reg.clienteAssegnato,
        prodottoAssegnato: reg.prodottoAssegnato,
        licenzaAssegnata: reg.licenzaAssegnata,
        note: reg.note,
        clientId: reg.clienteAssegnato // Assuming clientId is the same as clienteAssegnato for display
      }));
    }
  });

  // Fetch clients for classification
  const { data: clients = [] } = useQuery({
    queryKey: ['/api/clients'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/clients', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch clients');
      }
      return response.json();
    },
    enabled: isClassifyModalOpen // Fetch when the classify modal is open
  });

  // Fetch licenses for classification
  const { data: licenses = [] } = useQuery({
    queryKey: ['/api/licenses'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/licenses', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch licenses');
      }
      const data = await response.json();
      return data.map((license: any) => ({
        ...license,
        client: license.client || (license.clientId ? { id: license.clientId, name: license.clientName, company_id: license.companyId } : undefined),
        company: license.company || (license.companyId ? { id: license.companyId, name: license.companyName } : undefined),
        product: license.product || { id: license.productId, name: license.productName, version: license.productVersion }
      }));
    },
    enabled: isClassifyModalOpen
  });

  // Fetch products for classification
  const { data: products = [] } = useQuery({
    queryKey: ['/api/products'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/products', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }
      return response.json();
    },
    enabled: isClassifyModalOpen
  });

  // Fetch companies for classification
  const { data: companies = [] } = useQuery({
    queryKey: ['/api/companies'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/companies', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch companies');
      }
      return response.json();
    },
    enabled: isClassifyModalOpen
  });

  // Safe arrays to prevent runtime errors
  const safeRegistrations = Array.isArray(registrations) ? registrations : [];
  const safeClients = Array.isArray(clients) ? clients : [];
  const safeLicenses = Array.isArray(licenses) ? licenses : [];
  const safeProducts = Array.isArray(products) ? products : [];
  const safeCompanies = Array.isArray(companies) ? companies : [];

  // Classify registration mutation
  const classifyMutation = useMutation({
    mutationFn: async (data: any) => {
      let finalLicenseId = data.licenzaAssegnata;

      if (data.clienteAssegnato && data.clienteAssegnato !== 'none' &&
          data.prodottoAssegnato && data.prodottoAssegnato !== 'none') {

        const clientLicenses = safeLicenses.filter((license: License) =>
          license.client?.id === data.clienteAssegnato &&
          (license.product?.id === data.prodottoAssegnato ||
           license.product?.name === data.prodottoAssegnato) &&
          (license.status === 'attiva' || license.status === 'in_attesa_convalida' || license.status === 'sospesa')
        );

        if (clientLicenses.length === 1) {
          finalLicenseId = clientLicenses[0].id;
        } else if (clientLicenses.length > 1 && !finalLicenseId) {
          finalLicenseId = clientLicenses[0].id;
        }
      }

      const requestBody = {
        aziendaAssegnata: data.aziendaAssegnata === 'none' ? null : data.aziendaAssegnata,
        clienteAssegnato: data.clienteAssegnato === 'none' ? null : data.clienteAssegnato,
        licenzaAssegnata: (finalLicenseId === 'none' || !finalLicenseId) ? null : finalLicenseId,
        prodottoAssegnato: data.prodottoAssegnato === 'none' ? null : data.prodottoAssegnato,
        note: data.note,
        authorizeDevice: data.authorizeDevice || false
      };

      console.log('Classifying registration with data:', requestBody);

      const response = await fetch(`/api/software/registrazioni/${selectedRegistration?.id}/classifica`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json();

        // Handle device limit exceeded error specifically
        if (errorData.code === 'DEVICE_LIMIT_EXCEEDED') {
          const error = new Error(errorData.message);
          (error as any).code = 'DEVICE_LIMIT_EXCEEDED';
          (error as any).maxDevices = errorData.maxDevices;
          (error as any).currentDevices = errorData.currentDevices;
          throw error;
        }

        throw new Error(errorData.message || 'Failed to classify registration');
      }

      return response.json();
    },
    onSuccess: (data) => {
      console.log('Classification successful:', data);
      queryClient.invalidateQueries({ queryKey: ['/api/software/registrazioni'] });
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      queryClient.invalidateQueries({ queryKey: ['/api/licenses'] });
      setIsClassifyModalOpen(false);
      setIsEditModalOpen(false); // Close both modals on success
      setSelectedRegistration(null);
      reset();
    },
    onError: (error: any) => {
      console.error('Classification error:', error);

      // Handle device limit exceeded error with a custom dialog
      if (error.code === 'DEVICE_LIMIT_EXCEEDED') {
        const message = `⚠️ Limite Dispositivi Raggiunto\n\n` +
          `La licenza selezionata consente massimo ${error.maxDevices} dispositivo${error.maxDevices > 1 ? 'i' : ''}.\n` +
          `Attualmente sono già autorizzati ${error.currentDevices} dispositivi.\n\n` +
          `Per autorizzare questo nuovo dispositivo, devi prima rimuovere l'autorizzazione da un altro dispositivo esistente.\n\n` +
          `Vuoi procedere comunque senza autorizzare il dispositivo?`;

        if (confirm(message)) {
          // Retry without device authorization
          const currentFormData = watch();
          classifyMutation.mutate({
            ...currentFormData,
            authorizeDevice: false
          });
        }
        return;
      }

      alert(`Errore nella classificazione: ${error.message}`);
    }
  });

  // Mutation for general edits (like updating notes)
  const editMutation = useMutation({
    mutationFn: async (data: any) => {
      const requestBody = {
        note: data.note,
        // Add other fields that can be edited by admin if needed
      };

      console.log('Editing registration with data:', requestBody);

      const response = await fetch(`/api/software/registrazioni/${selectedRegistration?.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update registration');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/software/registrazioni'] });
      setIsEditModalOpen(false);
      setSelectedRegistration(null);
      reset();
    },
    onError: (error: any) => {
      alert(`Errore nell'aggiornamento: ${error.message}`);
    }
  });


  // Handle computer key validation
  const handleValidateKey = async (registration: any) => {
    if (!registration.computerKey) {
      toast({
        title: "Errore",
        description: "Computer key mancante",
        variant: "destructive",
      });
      return;
    }

    setValidatingId(registration.id);

    try {
      const response = await fetch('/api/software-registrations/validate-key', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          registrationId: registration.id,
          computerKey: registration.computerKey
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Errore nella validazione');
      }

      const result = await response.json();

      toast({
        title: "Successo",
        description: "Computer key convalidata con successo",
      });

      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/software/registrazioni'] });

    } catch (error: any) {
      console.error('Validation error:', error);
      toast({
        title: "Errore",
        description: error.message || "Errore durante la convalida della computer key",
        variant: "destructive",
      });
    } finally {
      setValidatingId(null);
    }
  };

  const onClassifySubmit = (data: any) => {
    // Validation checks for classification
    const currentCompanyId = watch('aziendaAssegnata');
    const currentClientId = watch('clienteAssegnato');
    const currentLicenseId = watch('licenzaAssegnata');

    if (currentClientId && !currentCompanyId) {
      alert('⚠️ Errore: Non puoi assegnare un cliente senza selezionare un\'azienda.');
      return;
    }

    if (currentLicenseId && !currentClientId) {
      alert('⚠️ Errore: Non puoi assegnare una licenza senza selezionare un cliente.');
      return;
    }

    // Check if user wants to remove assignments
    if (!currentLicenseId && (selectedRegistration?.licenzaAssegnata || selectedRegistration?.clienteAssegnato)) {
      const confirmMessage =
        `⚠️ Attenzione!\n\n` +
        `Selezionando "Nessuna Licenza" verranno rimosse TUTTE le assegnazioni esistenti (Azienda, Cliente, Licenza).\n\n` +
        `Vuoi continuare?`;

      if (!confirm(confirmMessage)) {
        return; // Annulla l'operazione
      }
    }

    classifyMutation.mutate(data);
  };

  // Helper functions to get names for the modal
  const getClientName = (clientId: string | undefined) => {
    const client = safeClients.find(c => c.id === clientId);
    return client?.name || 'Non assegnato';
  };

  const getClientCompanyName = (clientId: string | undefined) => {
    const client = safeClients.find(c => c.id === clientId);
    const company = safeCompanies.find(c => c.id === (client?.company_id || client?.companyId));
    return company?.name || 'Non assegnata';
  };

  const getLicenseName = (licenseId: string | undefined) => {
    const license = safeLicenses.find(l => l.id === licenseId);
    return license?.activationKey || 'Non assegnata';
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      'non_assegnato': { variant: 'destructive', label: 'Non Assegnato' },
      'classificato': { variant: 'default', label: 'Classificato' },
      'in_attesa_computer_key': { variant: 'outline', label: 'In Attesa Computer Key' },
      'licenziato': { variant: 'secondary', label: 'Licenziato' }
    };

    const statusInfo = statusMap[status as keyof typeof statusMap] || { variant: 'outline', label: status };

    return (
      <Badge variant={statusInfo.variant as any} data-testid={`badge-status-${status}`}>
        {statusInfo.label}
      </Badge>
    );
  };

  const formatCurrency = (amount: number) => {
    return `${Math.round(amount)} crediti`;
  };

  const filteredRegistrations = safeRegistrations.filter((registration: SoftwareRegistration) => {
    if (statusFilter !== 'all' && registration.status !== statusFilter) return false;
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        (registration.nomeSoftware || registration.softwareName || '').toLowerCase().includes(search) ||
        (registration.ragioneSociale || registration.clientName || '').toLowerCase().includes(search) ||
        (registration.partitaIva || '').toLowerCase().includes(search) ||
        (registration.computerKey || '').toLowerCase().includes(search) ||
        (registration.note || '').toLowerCase().includes(search) ||
        (registration.prodottoAssegnato || '').toLowerCase().includes(search) ||
        (registration.sistemaOperativo || '').toLowerCase().includes(search) ||
        (registration.versione || registration.version || '').toLowerCase().includes(search)
      );
    }
    return true;
  });

  const handleClassify = (id: string) => {
    const registrationToClassify = safeRegistrations.find((r: SoftwareRegistration) => r.id === id);
    setSelectedRegistration(registrationToClassify || null);

    reset(); // Reset form state

    if (registrationToClassify) {
      const client = safeClients.find(c => c.id === registrationToClassify.clienteAssegnato);
      const companyId = client?.company_id || client?.companyId || '';

      // Set initial form values using setValue
      setValue('aziendaAssegnata', companyId || '');
      setValue('clienteAssegnato', registrationToClassify.clienteAssegnato || '');
      setValue('prodottoAssegnato', registrationToClassify.prodottoAssegnato || '');
      setValue('licenzaAssegnata', registrationToClassify.licenzaAssegnata || '');
      setValue('note', registrationToClassify.note || '');
      setValue('authorizeDevice', !!registrationToClassify.computerKey); // Set checkbox based on existing key
    }
    setIsClassifyModalOpen(true);
  };

  const handleEdit = (registration: SoftwareRegistration) => {
    setSelectedRegistration(registration);

    reset(); // Reset form state

    if (registration) {
      const client = safeClients.find(c => c.id === registration.clienteAssegnato);
      const companyId = client?.company_id || client?.companyId || '';

      // Set initial form values using setValue
      setValue('aziendaAssegnata', companyId || '');
      setValue('clienteAssegnato', registration.clienteAssegnato || '');
      setValue('prodottoAssegnato', registration.prodottoAssegnato || '');
      setValue('licenzaAssegnata', registration.licenzaAssegnata || '');
      setValue('note', registration.note || '');
      setValue('authorizeDevice', !!registration.computerKey); // Set checkbox based on existing key
    }

    setIsEditModalOpen(true); // Open edit modal specifically
  };

  // Function to view registration details
  const handleViewRegistration = (id: string) => {
    const registrationToView = safeRegistrations.find((r: SoftwareRegistration) => r.id === id);
    setSelectedRegistration(registrationToView || null);
    setIsViewDialogOpen(true);
  };

  const handleDeleteRegistration = async (id: string) => {
    if (confirm('Sei sicuro di voler eliminare questa registrazione?')) {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/software/registrazioni/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          queryClient.invalidateQueries({ queryKey: ['/api/software/registrazioni'] });
          alert('Registrazione eliminata con successo!');
        } else {
          alert('Errore nell\'eliminazione della registrazione');
        }
      } catch (error) {
        console.error('Error deleting registration:', error);
        alert('Errore nell\'eliminazione della registrazione');
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className={`flex-1 ${contentMargin} overflow-auto transition-all duration-300 ease-in-out p-6`}>
          <div className="space-y-4">
            <div className="h-10 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse w-1/4" />
            <div className="h-6 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse w-1/2" />
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className={`flex-1 ${contentMargin} overflow-auto transition-all duration-300 ease-in-out`}>
        <div className="container mx-auto p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight" data-testid="heading-registrations">
                LmRegister
              </h1>
              <p className="text-muted-foreground">
                Gestisci le registrazioni automatiche dei software installati presso i clienti
              </p>
            </div>
          </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Filtri di Ricerca
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="search-input">Ricerca Software/Azienda</Label>
              <div className="flex gap-2">
                <Input
                  id="search-input"
                  placeholder="Cerca in tutti i campi (software, azienda, cliente, prodotto, note, computer key, etc.)..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  data-testid="input-search"
                />
                <Button
                  onClick={executeSearch}
                  variant="outline"
                  size="sm"
                  className="px-4"
                  data-testid="button-search"
                >
                  <Search className="h-4 w-4" />
                </Button>
                {searchTerm && (
                  <Button
                    onClick={clearSearch}
                    variant="ghost"
                    size="sm"
                    className="px-4"
                    data-testid="button-clear-search"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {searchTerm && (
                <div className="mt-1 text-xs text-gray-500">
                  Ricercando: "{searchTerm}" - Trovati: {safeRegistrations.length} risultati
                </div>
              )}
            </div>
            <div className="md:w-48">
              <Label htmlFor="status-filter">Stato</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger data-testid="select-status-filter">
                  <SelectValue placeholder="Tutti gli stati" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti gli stati</SelectItem>
                  <SelectItem value="non_assegnato">Non Assegnato</SelectItem>
                  <SelectItem value="in_attesa_computer_key">In Attesa Computer Key</SelectItem>
                  <SelectItem value="classificato">Classificato</SelectItem>
                  <SelectItem value="licenziato">Licenziato</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Monitor className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Totale Registrazioni</p>
                <p className="text-2xl font-bold" data-testid="text-total-registrations">
                  {filteredRegistrations.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">Non Assegnate</p>
                <p className="text-2xl font-bold text-orange-600" data-testid="text-unassigned">
                  {filteredRegistrations.filter((r: SoftwareRegistration) => r.status === 'non_assegnato').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Classificate</p>
                <p className="text-2xl font-bold text-green-600" data-testid="text-classified">
                  {filteredRegistrations.filter((r: SoftwareRegistration) => r.status === 'classificato').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground">In Attesa Computer Key</p>
                <p className="text-2xl font-bold text-yellow-600" data-testid="text-waiting-key">
                  {filteredRegistrations.filter((r: SoftwareRegistration) => r.status === 'in_attesa_computer_key').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {filteredRegistrations.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Monitor className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nessuna registrazione trovata</h3>
            <p className="text-muted-foreground">
              Non ci sono registrazioni software che corrispondono ai criteri di ricerca.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse excel-table">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium text-sm border-r min-w-[180px]">Azienda/Cliente</th>
                    <th className="text-left p-3 font-medium text-sm border-r min-w-[200px]">Software/Prodotto</th>
                    <th className="text-left p-3 font-medium text-sm border-r min-w-[100px]">Versione</th>
                    <th className="text-left p-3 font-medium text-sm border-r min-w-[100px]">Ordini</th>
                    <th className="text-left p-3 font-medium text-sm border-r min-w-[100px]">Venduto</th>
                    <th className="text-left p-3 font-medium text-sm border-r min-w-[80px]">Stato</th>
                    <th className="text-left p-3 font-medium text-sm border-r min-w-[130px]">Data Registrazione</th>
                    <th className="text-left p-3 font-medium text-sm border-r min-w-[130px]">Ultimo Accesso</th>
                    <th className="text-left p-3 font-medium text-sm min-w-[150px]">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRegistrations.map((registration: SoftwareRegistration, index: number) => (
                    <tr key={registration.id} className={`border-b hover:bg-muted/30 ${index % 2 === 0 ? 'bg-white' : 'bg-muted/10'}`}>
                      <td className="p-3 border-r">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-blue-500" />
                          <div>
                            <div className="font-medium text-sm text-gray-900">
                              {registration.ragioneSociale || 'Non specificato'}
                            </div>
                            {registration.licenzaAssegnata && (() => {
                              const assignedLicense = safeLicenses.find(l => l.id === registration.licenzaAssegnata);
                              if (assignedLicense) {
                                const safeCompanies = Array.isArray(companies) ? companies : [];
                                const clientCompany = safeCompanies.find(c =>
                                  c.id === assignedLicense.client?.company_id ||
                                  c.id === assignedLicense.client?.companyId
                                );
                                return (
                                  <div className="text-xs text-muted-foreground space-y-1">
                                    <div>Cliente: {assignedLicense.client?.name || 'Non specificato'}</div>
                                    <div>Azienda: {clientCompany?.name || 'Non specificata'}</div>
                                  </div>
                                );
                              }
                              return <div className="text-xs text-muted-foreground">Cliente: Non assegnato</div>;
                            })() || <div className="text-xs text-muted-foreground">Cliente: Non assegnato</div>}
                          </div>
                        </div>
                      </td>

                      <td className="p-3 border-r">
                        <div className="flex items-center gap-2">
                          <Monitor className="h-4 w-4 text-green-500" />
                          <div>
                            <div className="font-medium text-sm text-gray-900">
                              {registration.nomeSoftware || registration.softwareName || 'Non specificato'}
                            </div>
                            {registration.licenzaAssegnata && (() => {
                              const assignedLicense = safeLicenses.find(l => l.id === registration.licenzaAssegnata);
                              if (assignedLicense && assignedLicense.product) {
                                return (
                                  <div className="text-xs text-muted-foreground">
                                    Prodotto: {assignedLicense.product.name || 'Non specificato'}
                                  </div>
                                );
                              }
                              return <div className="text-xs text-muted-foreground">Prodotto: Non assegnato</div>;
                            })() || <div className="text-xs text-muted-foreground">Prodotto: Non assegnato</div>}
                            {registration.note && (
                              <div className="text-xs text-muted-foreground truncate max-w-[150px]" title={registration.note}>
                                Note: {registration.note}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="p-3 border-r">
                        <div className="flex flex-col gap-1">
                          <Badge variant="outline" className="text-xs font-mono">
                            {registration.versione || registration.version || 'N/A'}
                          </Badge>
                          {registration.version && registration.versione && registration.version !== registration.versione && (
                            <Badge variant="secondary" className="text-xs font-mono">
                              Rilevata: {registration.versione}
                            </Badge>
                          )}
                          {registration.computerKey && (
                            <div className="mt-1 p-1 bg-green-50 border border-green-200 rounded text-xs">
                              <div className="font-mono text-green-800 text-xs" title={registration.computerKey}>
                                {registration.computerKey.substring(0, 10)}...
                              </div>
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="p-3 border-r text-center">
                        <div className="font-medium text-sm">
                          {registration.totaleOrdini || 0}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          ordini
                        </div>
                      </td>

                      <td className="p-3 border-r text-right">
                        <div className="font-medium text-sm text-green-600">
                          {formatCurrency(registration.totaleVenduto || 0)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          venduto
                        </div>
                      </td>

                      <td className="p-3 border-r">
                        {getStatusBadge(registration.status)}
                      </td>

                      <td className="p-3 border-r text-sm">
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {(registration.primaRegistrazione || registration.registrationDate) ?
                              format(new Date(registration.primaRegistrazione || registration.registrationDate!), 'dd/MM/yyyy', { locale: it }) :
                              'N/A'
                            }
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {(registration.primaRegistrazione || registration.registrationDate) ?
                              format(new Date(registration.primaRegistrazione || registration.registrationDate!), 'HH:mm', { locale: it }) :
                              'N/A'
                            }
                          </span>
                        </div>
                      </td>

                      <td className="p-3 border-r text-sm">
                        {(registration.ultimaAttivita || registration.lastSeen) ? (
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {format(new Date(registration.ultimaAttivita || registration.lastSeen!), 'dd/MM/yyyy', { locale: it })}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(registration.ultimaAttivita || registration.lastSeen!), 'HH:mm', { locale: it })}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic">Mai</span>
                        )}
                      </td>

                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          {/* Visualizza - sempre disponibile per tutti */}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            title="Visualizza Dettagli"
                            onClick={() => handleViewRegistration(registration.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>

                          {/* Modifica - disponibile per admin e superadmin */}
                          {(user?.role === 'admin' || user?.role === 'superadmin') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              title={user?.role === 'superadmin' ? 'Modifica Registrazione' : 'Gestione Computer Key'}
                              onClick={() => handleClassify(registration.id)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialog for View Details */}
      <Dialog open={isViewDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsViewDialogOpen(false);
          setSelectedRegistration(null);
        }
      }}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Dettagli Registrazione Software</span>
              {selectedRegistration && getStatusBadge(selectedRegistration.status)}
            </DialogTitle>
          </DialogHeader>

          {selectedRegistration && (
            <div className="space-y-4">
              {/* Header compatto con info principali */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-blue-800">Software:</span>
                    <div className="text-blue-900">{selectedRegistration.nomeSoftware || selectedRegistration.prodottoAssegnato}</div>
                  </div>
                  <div>
                    <span className="font-medium text-blue-800">Versione:</span>
                    <div className="text-blue-900">{selectedRegistration.versione}</div>
                  </div>
                  <div>
                    <span className="font-medium text-blue-800">P. IVA:</span>
                    <div className="text-blue-900">{selectedRegistration.partitaIva}</div>
                  </div>
                  <div>
                    <span className="font-medium text-blue-800">Computer Key:</span>
                    <div className="text-blue-900 font-mono text-xs">{selectedRegistration.computerKey || 'Non assegnata'}</div>
                  </div>
                </div>
              </div>

              {/* Due colonne principali per dettagli */}
              <div className="grid grid-cols-2 gap-6">
                {/* Colonna sinistra - Informazioni Dispositivo */}
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Informazioni Dispositivo</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Ragione Sociale:</span>
                        <span className="font-medium">{selectedRegistration.ragioneSociale}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Sistema Operativo:</span>
                        <span className="font-medium">{selectedRegistration.sistemaOperativo}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Prima Registrazione:</span>
                        <span className="font-medium">
                          {selectedRegistration.primaRegistrazione ?
                            new Date(selectedRegistration.primaRegistrazione).toLocaleDateString('it-IT') :
                            'N/A'
                          }
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Ultima Attività:</span>
                        <span className="font-medium">
                          {selectedRegistration.ultimaAttivita ?
                            new Date(selectedRegistration.ultimaAttivita).toLocaleDateString('it-IT') :
                            'N/A'
                          }
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Totale Venduto:</span>
                        <span className="font-bold text-green-600">{selectedRegistration.totaleVenduto} crediti</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Totale Ordini:</span>
                        <span className="font-medium">{selectedRegistration.totaleOrdini}</span>
                      </div>
                    </div>
                  </div>

                  {/* Note esistenti */}
                  {selectedRegistration.note && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Note Esistenti</h3>
                      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm">
                        {selectedRegistration.note}
                      </div>
                    </div>
                  )}
                </div>

                {/* Colonna destra - Form di modifica/classificazione */}
                <div className="space-y-4">
                  {/* Sezione Assegnazioni Attuali solo per view */}
                  {isViewDialogOpen && !isClassifyModalOpen && !isEditModalOpen && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-3">Assegnazioni Attuali</h3>
                      <div className="space-y-3 text-sm">
                        <div className="p-3 bg-gray-50 rounded-md">
                          <div className="font-medium text-gray-700 mb-1">Azienda Assegnata</div>
                          <div>{getClientCompanyName(selectedRegistration.clienteAssegnato) || 'Non assegnata'}</div>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-md">
                          <div className="font-medium text-gray-700 mb-1">Cliente Assegnato</div>
                          <div>{getClientName(selectedRegistration.clienteAssegnato) || 'Non assegnato'}</div>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-md">
                          <div className="font-medium text-gray-700 mb-1">Licenza Assegnata</div>
                          <div>{getLicenseName(selectedRegistration.licenzaAssegnata) || 'Non assegnata'}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Form di gestione per superadmin - sia per edit che classify */}
                  {(isClassifyModalOpen || isEditModalOpen) && user?.role === 'superadmin' && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-3">
                        Gestione Assegnazioni
                      </h3>
                      <form onSubmit={handleSubmit(onClassifySubmit)} className="space-y-4">

                        <div>
                          <Label htmlFor="aziendaAssegnata" className="text-sm">Azienda</Label>
                          <CompanySearchInput
                            companies={safeCompanies}
                            onCompanySelect={(companyId) => {
                              setValue('aziendaAssegnata', companyId);
                              setValue('clienteAssegnato', '');
                              setValue('licenzaAssegnata', '');
                            }}
                            initialCompanyId={watch('aziendaAssegnata')}
                          />
                        </div>

                        <div>
                          <Label htmlFor="clienteAssegnato" className="text-sm">Cliente</Label>
                          <ClientSearchInput
                            clients={safeClients}
                            companies={safeCompanies}
                            onClientSelect={(clientId) => {
                              setValue('clienteAssegnato', clientId);
                              setValue('licenzaAssegnata', '');
                            }}
                            companyId={watch('aziendaAssegnata')}
                            initialClientId={watch('clienteAssegnato')}
                          />
                        </div>

                        <div>
                          <Label htmlFor="licenzaAssegnata" className="text-sm">Licenza</Label>
                          <Select
                            value={watch('licenzaAssegnata') || ''}
                            onValueChange={(value) => {
                              setValue('licenzaAssegnata', value);
                              setValue('prodottoAssegnato', null);
                            }}
                            disabled={!watch('clienteAssegnato')}
                          >
                            <SelectTrigger data-testid="select-assign-license" className="h-9">
                              <SelectValue placeholder="Seleziona licenza" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Nessuna Licenza (Rimuove assegnazioni)</SelectItem>
                              {safeLicenses
                                .filter((license: License) => {
                                  const selectedClientId = watch('clienteAssegnato');
                                  const selectedCompanyId = watch('aziendaAssegnata');

                                  return (
                                    license.client?.id === selectedClientId &&
                                    (license.client?.company_id || license.client?.companyId) === selectedCompanyId &&
                                    ['attiva', 'in_attesa_convalida', 'sospesa'].includes(license.status)
                                  );
                                })
                                .map((license: License) => (
                                  <SelectItem key={license.id} value={license.id}>
                                    <div className="flex flex-col">
                                      <span className="font-medium">{license.activationKey}</span>
                                      <span className="text-xs text-gray-500">{license.product?.name || 'N/A'}</span>
                                    </div>
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor="note" className="text-sm">Note</Label>
                          <Textarea
                            {...register('note')}
                            placeholder="Aggiungi o modifica note..."
                            rows={3}
                            className="text-sm"
                            defaultValue={selectedRegistration?.note || ''}
                          />
                        </div>

                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="authorizeDevice"
                            checked={watch('authorizeDevice')}
                            onCheckedChange={(checked) => setValue('authorizeDevice', checked)}
                          />
                          <Label htmlFor="authorizeDevice" className="text-sm">
                            Autorizza dispositivo (genera computer key)
                          </Label>
                        </div>

                        <div className="flex justify-end space-x-2 pt-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              isClassifyModalOpen ? setIsClassifyModalOpen(false) : setIsEditModalOpen(false);
                              reset();
                              setSelectedRegistration(null);
                            }}
                          >
                            Annulla
                          </Button>
                          <Button type="submit" size="sm" disabled={isSubmitting}>
                            {isSubmitting ? 'Salvando...' : 'Salva Assegnazioni'}
                          </Button>
                          {selectedRegistration?.licenzaAssegnata && (
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                setValue('aziendaAssegnata', '');
                                setValue('clienteAssegnato', '');
                                setValue('licenzaAssegnata', 'none');
                                setValue('prodottoAssegnato', '');
                              }}
                            >
                              Rimuovi Assegnazioni
                            </Button>
                          )}
                        </div>
                      </form>
                    </div>
                  )}

                  {/* Form per admin (solo note) */}
                  {user?.role === 'admin' && user?.role !== 'superadmin' && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-3">
                        Modifica Note
                      </h3>
                      <form onSubmit={handleSubmit((data) => editMutation.mutate(data))} className="space-y-4">
                        <div>
                          <Label htmlFor="note" className="text-sm">Note</Label>
                          <Textarea
                            {...register('note')}
                            placeholder="Aggiungi o modifica note..."
                            rows={3}
                            className="text-sm"
                            defaultValue={selectedRegistration?.note || ''}
                          />
                        </div>

                        <div className="flex justify-end space-x-2 pt-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              isClassifyModalOpen ? setIsClassifyModalOpen(false) : setIsEditModalOpen(false);
                              reset();
                              setSelectedRegistration(null);
                            }}
                          >
                            Annulla
                          </Button>
                          <Button type="submit" size="sm" disabled={isSubmitting}>
                            {isSubmitting ? 'Salvando...' : 'Salva Note'}
                          </Button>
                        </div>
                      </form>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer - Pulsante Chiudi per la modal di edit/classify */}
              <div className="flex justify-end pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    isClassifyModalOpen ? setIsClassifyModalOpen(false) : setIsEditModalOpen(false);
                    reset();
                    setSelectedRegistration(null);
                  }}
                >
                  Chiudi
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
        </div>
      </div>
    </div>
  );
};