import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

// Mock user for role checking, replace with actual auth context in a real app
// const user = {
//   role: 'superadmin' // or 'admin', 'user', etc.
// };
// Use the actual user from useAuth hook
// const { user } = useAuth();


interface SoftwareRegistration {
  id: string;
  nomeSoftware: string;
  versione: string;
  ragioneSociale: string;
  partitaIva?: string;
  totaleOrdini: number;
  totaleVenduto: number;
  sistemaOperativo?: string;
  indirizzoIp?: string;
  computerKey?: string;
  installationPath?: string;
  status: 'non_assegnato' | 'classificato' | 'licenziato' | 'in_attesa_computer_key';
  clienteAssegnato?: string;
  licenzaAssegnata?: string;
  prodottoAssegnato?: string; // Added to match the dialog
  aziendaAssegnata?: string; // Added for company assignment
  note?: string;
  primaRegistrazione: string;
  ultimaAttivita: string;
  createdAt: string;
  updatedAt: string;
  // These fields are likely mapped or renamed from API response
  softwareName?: string; // Assuming API returns this
  version?: string; // Assuming API returns this
  clientName?: string; // Assuming API returns this
  clientId?: string; // Assuming API returns this
  registrationDate?: string; // Assuming API returns this
  lastSeen?: string; // Assuming API returns this
}

interface Client {
  id: string;
  name: string;
  email: string;
  status: string;
  company_id?: string;
  companyId?: string; // Added for compatibility
}

interface License {
  id: string;
  activationKey: string;
  client?: { id: string; name?: string; email?: string; company_id?: string; companyId?: string; }; // Updated to match typical API responses
  company?: { id: string; name?: string; }; // Added company field for display
  product: { name: string, version?: string, id: string }; // Added product id and version for completeness
  status: string;
  licenseType?: string; // Added for potential display
  maxDevices?: number; // Added for display
  expiryDate?: string; // Added for display
  clientName?: string; // Added fallback if client object is not present
  companyName?: string; // Added fallback if company object is not present
  companyId?: string; // Added for compatibility
}

interface Product {
  id: string;
  name: string;
  version: string;
  description?: string;
}

interface Company {
  id: string;
  name: string;
  partitaIva?: string;
}

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
    if (initialCompanyId && !selectedCompany) {
      const company = companies.find(c => c.id === initialCompanyId);
      if (company) {
        setSelectedCompany(company);
        setSearchTerm(company.name || '');
        onCompanySelect(company.id);
      }
    } else if (!initialCompanyId && selectedCompany) {
      // Clear selection only if we had a company selected before
      setSelectedCompany(null);
      setSearchTerm('');
      onCompanySelect('');
    }
  }, [initialCompanyId, companies]); // Removed onCompanySelect and selectedCompany from dependencies


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
}

function ClientSearchInput({ clients, companies, onClientSelect, companyId, placeholder = "Cerca cliente..." }: ClientSearchInputProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // Safe arrays to prevent errors
  const safeClients = Array.isArray(clients) ? clients : [];
  const safeCompanies = Array.isArray(companies) ? companies : [];

  // Funzione per ottenere il nome dell'azienda
  const getCompanyName = (companyId: string) => {
    const company = safeCompanies.find((c: Company) => c.id === companyId);
    return company ? company.name : 'N/A';
  };

  // Reset search term and selected client when companyId changes
  useEffect(() => {
    setSearchTerm("");
    setSelectedClient(null);
    onClientSelect(''); // Also clear the selected client ID when company changes
  }, [companyId]); // Removed onClientSelect from dependencies

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
  const [isClassifyDialogOpen, setIsClassifyDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [validatingId, setValidatingId] = useState<string | null>(null); // State for validating key
  const { contentMargin } = useSidebar();
  const { user } = useAuth(); // Use the actual user from useAuth hook

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
    queryKey: ['/api/software/registrazioni', { status: statusFilter, search: searchTerm }],
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
    enabled: isClassifyDialogOpen // Only fetch when the dialog is open
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
    enabled: true
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
    enabled: true
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
    enabled: true
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
      setIsClassifyDialogOpen(false);
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
    classifyMutation.mutate(data);
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

    reset();

    if (registrationToClassify) {
      const client = safeClients.find(c => c.id === registrationToClassify.clienteAssegnato);
      const companyId = client?.company_id || client?.companyId || ''; // Use empty string instead of null

      // Set values using setValue
      setValue('aziendaAssegnata', companyId);
      setValue('clienteAssegnato', registrationToClassify.clienteAssegnato || '');
      setValue('prodottoAssegnato', registrationToClassify.prodottoAssegnato || '');
      setValue('licenzaAssegnata', registrationToClassify.licenzaAssegnata || '');
      setValue('note', registrationToClassify.note || '');
    }
    setIsClassifyDialogOpen(true);
  };

  const handleEdit = (registration: SoftwareRegistration) => {
    setSelectedRegistration(registration);

    let client = null;
    let companyId = '';
    let clientId = '';

    // First try to get client from clienteAssegnato (direct assignment)
    if (registration.clienteAssegnato) {
      client = safeClients.find(c => c.id === registration.clienteAssegnato);
      clientId = registration.clienteAssegnato;
      companyId = client?.company_id || client?.companyId || '';
    } 
    // If no direct client assignment, try to get from assigned license
    else if (registration.licenzaAssegnata) {
      const assignedLicense = safeLicenses.find(l => l.id === registration.licenzaAssegnata);
      if (assignedLicense?.client) {
        // Get the client ID from the license
        clientId = assignedLicense.client.id;
        companyId = assignedLicense.client.company_id || assignedLicense.client.companyId || '';
        
        // Find the full client object for form population
        client = safeClients.find(c => c.id === clientId);
        
        console.log('Found license client:', assignedLicense.client);
        console.log('Found full client from list:', client);
      }
    }

    console.log('Edit registration:', registration);
    console.log('Final client:', client);
    console.log('Final client ID:', clientId);
    console.log('Company ID:', companyId);
    console.log('Computer Key:', registration.computerKey);

    reset();

    // Set values using setValue - use clientId instead of client?.id to ensure we get the right ID
    setValue('aziendaAssegnata', companyId);
    setValue('clienteAssegnato', clientId);
    setValue('prodottoAssegnato', registration.prodottoAssegnato || '');
    setValue('licenzaAssegnata', registration.licenzaAssegnata || '');
    setValue('note', registration.note || '');
    setValue('authorizeDevice', !!registration.computerKey);

    setIsClassifyDialogOpen(true);
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
      <div className="container mx-auto p-6">
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse" />
          ))}
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
                              onClick={() => handleEdit(registration)}
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

      <Dialog open={isClassifyDialogOpen} onOpenChange={setIsClassifyDialogOpen}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {user?.role === 'superadmin' ? 'Classifica Registrazione Software' : 'Convalida Computer Key'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onClassifySubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="software">Software</Label>
                <p className="text-sm text-gray-600 p-2 bg-gray-50 border rounded-md">{selectedRegistration?.nomeSoftware}</p>
              </div>
              <div>
                <Label htmlFor="versione">Versione</Label>
                <p className="text-sm text-gray-600 p-2 bg-gray-50 border rounded-md">{selectedRegistration?.versione}</p>
              </div>
              <div>
                <Label htmlFor="azienda">Azienda</Label>
                <p className="text-sm text-gray-600 p-2 bg-gray-50 border rounded-md">{selectedRegistration?.ragioneSociale}</p>
              </div>
              <div>
                <Label htmlFor="computerKey">Computer Key</Label>
                <p className="text-sm text-gray-600 font-mono p-2 bg-gray-50 border rounded-md">
                  {selectedRegistration?.computerKey || 'Non assegnata'}
                </p>
              </div>
            </div>

            {user?.role === 'superadmin' && (
              <>
                <div>
                  <Label htmlFor="aziendaAssegnata">Azienda</Label>
                  <CompanySearchInput
                    companies={Array.isArray(companies) ? companies.map(c => ({
                      ...c,
                      name: c.name || 'Nome non disponibile', // Provide default if name is null/undefined
                      partitaIva: c.partitaIva || 'N/A' // Provide default if partitaIva is null/undefined
                    })) : []}
                    onCompanySelect={(companyId) => {
                      setValue('aziendaAssegnata', companyId || null);
                      setValue('clienteAssegnato', null);
                      setValue('licenzaAssegnata', null);
                      setValue('prodottoAssegnato', null);
                    }}
                    placeholder="Cerca azienda per nome o P.IVA..."
                    initialCompanyId={watch('aziendaAssegnata') || undefined}
                  />
                </div>

                <div>
                  <Label htmlFor="clienteAssegnato">Cliente</Label>
                  <ClientSearchInput
                    clients={clients}
                    companies={Array.isArray(companies) ? companies : []}
                    companyId={watch('aziendaAssegnata')}
                    onClientSelect={(clientId) => {
                      setValue('clienteAssegnato', clientId || null);
                      setValue('licenzaAssegnata', null);
                      setValue('prodottoAssegnato', null);
                    }}
                    placeholder="Cerca cliente per nome o email..."
                  />
                </div>

                <div>
                  <Label htmlFor="licenzaAssegnata">Licenza</Label>
                  {(() => {
                    const selectedClientId = watch('clienteAssegnato');
                    const selectedCompanyId = watch('aziendaAssegnata');

                    if (!selectedCompanyId) {
                      return (
                        <div className="p-3 bg-gray-50 rounded-md border text-center">
                          <p className="text-sm text-gray-500">Seleziona prima un'azienda</p>
                        </div>
                      );
                    }

                    if (!selectedClientId) {
                      return (
                        <div className="p-3 bg-gray-50 rounded-md border text-center">
                          <p className="text-sm text-gray-500">Seleziona prima un cliente</p>
                        </div>
                      );
                    }

                    const clientLicenses = safeLicenses.filter((license: License) => {
                      const licenseClientId = license.client?.id;
                      if (licenseClientId !== selectedClientId) return false;

                      const licenseClientCompanyId = license.client?.company_id || license.client?.companyId;
                      if (licenseClientCompanyId !== selectedCompanyId) return false;

                      return ['attiva', 'in_attesa_convalida', 'sospesa'].includes(license.status);
                    });

                    if (clientLicenses.length === 0) {
                      return (
                        <div className="p-3 bg-yellow-50 rounded-md border border-yellow-200">
                          <p className="text-sm text-yellow-700">
                            <i className="fas fa-key mr-2"></i>
                            Nessuna licenza disponibile per questo cliente
                          </p>
                        </div>
                      );
                    }

                    const selectedLicenseId = watch('licenzaAssegnata');

                    return (
                      <>
                        <Select value={selectedLicenseId || 'none'} onValueChange={(value) => {
                          setValue('licenzaAssegnata', value === 'none' ? null : value);
                          if (value !== 'none') {
                            const selectedLicense = safeLicenses.find(l => l.id === value);
                            if (selectedLicense && selectedLicense.product) {
                              setValue('prodottoAssegnato', selectedLicense.product.id);
                            }
                          } else {
                            setValue('prodottoAssegnato', null);
                          }
                        }}>
                          <SelectTrigger data-testid="select-assign-license">
                            <SelectValue placeholder="Seleziona licenza" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Nessuna Licenza</SelectItem>
                            {clientLicenses.map((license: License) => (
                              <SelectItem key={license.id} value={license.id}>
                                <div className="flex flex-col">
                                  <span className="font-mono text-xs">{license.activationKey}</span>
                                  <span className="text-xs text-gray-600">
                                    {license.product?.name} ({license.status})
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {selectedLicenseId && selectedLicenseId !== 'none' && (() => {
                          const selectedLicense = safeLicenses.find((license: License) => license.id === selectedLicenseId);

                          if (!selectedLicense || !selectedLicense.product) {
                            return (
                              <div className="p-3 bg-yellow-50 rounded-md border border-yellow-200 mt-2">
                                <p className="text-sm text-yellow-700">
                                  <i className="fas fa-key mr-2"></i>
                                  Prodotto non trovato per questa licenza
                                </p>
                              </div>
                            );
                          }

                          return (
                            <div className="p-3 bg-green-50 rounded-md border border-green-200 mt-2">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-medium text-green-800">
                                    <i className="fas fa-key mr-2"></i>
                                    Licenza selezionata
                                  </p>
                                  <p className="text-xs text-green-600 mt-1">
                                    {selectedLicense.product.name} v{selectedLicense.product.version || 'N/A'}
                                  </p>
                                  <p className="text-xs text-green-600">
                                    Stato: {selectedLicense.status} | Dispositivi: {selectedLicense.maxDevices || 1}
                                  </p>
                                </div>
                                <i className="fas fa-key text-green-500 text-xl"></i>
                              </div>
                            </div>
                          );
                        })()}
                      </>
                    );
                  })()}
                </div>
              </>
            )}

            <div className="space-y-4">
              {(user?.role === 'admin' || user?.role === 'superadmin') && (selectedRegistration?.licenzaAssegnata || watch('licenzaAssegnata')) && (
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="authorizeDevice"
                    {...register('authorizeDevice')}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    data-testid="checkbox-authorize-device"
                    // Set initial checked state based on existing computerKey or form value if available
                    defaultChecked={!!selectedRegistration?.computerKey || watch('authorizeDevice')}
                  />
                  <Label htmlFor="authorizeDevice" className="font-medium">
                    Autorizza dispositivo (genera/rimuovi computer key)
                  </Label>
                </div>
              )}

              {user?.role === 'admin' && !selectedRegistration?.licenzaAssegnata && !watch('licenzaAssegnata') && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-sm text-yellow-800">
                    <i className="fas fa-key mr-2"></i>
                    Nessuna licenza assegnata a questa registrazione. Solo il superadmin può assegnare licenze.
                  </p>
                </div>
              )}

              <div>
                <Label htmlFor="note">Note</Label>
                <Textarea
                  id="note"
                  {...register('note')}
                  placeholder="Aggiungi note sulla classificazione..."
                  data-testid="textarea-classification-notes"
                  className={user?.role === 'admin' ? "min-h-[80px] bg-gray-50" : "min-h-[80px]"}
                  defaultValue={selectedRegistration?.note || ''}
                  readOnly={user?.role === 'admin'}
                />
                {user?.role === 'admin' && (
                  <p className="text-xs text-gray-500 mt-1">Solo il superadmin può modificare le note</p>
                )}
              </div>
            </div>

            <div className="flex flex-col-reverse md:flex-row justify-between items-start md:items-center gap-3 pt-4 border-t">
              <div className="flex flex-wrap gap-2">
                {user?.role === 'superadmin' && selectedRegistration?.licenzaAssegnata && (
                  <>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        if (confirm('Sei sicuro di voler rimuovere l\'assegnazione della licenza? Questa operazione resetterà la registrazione a "Non Assegnato".')) {
                          const removeAssignmentData = {
                            aziendaAssegnata: null,
                            clienteAssegnato: null,
                            licenzaAssegnata: null,
                            prodottoAssegnato: null,
                            note: selectedRegistration.note,
                            authorizeDevice: false
                          };
                          classifyMutation.mutate(removeAssignmentData);
                        }
                      }}
                      disabled={classifyMutation.isPending}
                    >
                      <i className="fas fa-unlink mr-2"></i>
                      Rimuovi Assegnazione
                    </Button>

                    {selectedRegistration?.computerKey && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (confirm('Sei sicuro di voler rimuovere solo la Computer Key? Il dispositivo non sarà più autorizzato ma la licenza rimarrà assegnata.')) {
                            const removeKeyData = {
                              aziendaAssegnata: selectedRegistration.aziendaAssegnata || null,
                              clienteAssegnato: selectedRegistration.clienteAssegnato || null,
                              licenzaAssegnata: selectedRegistration.licenzaAssegnata || null,
                              prodottoAssegnato: selectedRegistration.prodottoAssegnato || null,
                              note: selectedRegistration.note,
                              authorizeDevice: false
                            };
                            classifyMutation.mutate(removeKeyData);
                          }
                        }}
                        disabled={classifyMutation.isPending}
                        className="border-orange-300 text-orange-700 hover:bg-orange-50"
                      >
                        <i className="fas fa-key mr-2"></i>
                        Rimuovi Solo Computer Key
                      </Button>
                    )}
                  </>
                )}
              </div>
              <div className="flex space-x-2 w-full md:w-auto">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    reset();
                    setSelectedRegistration(null);
                    setIsClassifyDialogOpen(false);
                  }}
                  className="flex-1 md:flex-none"
                >
                  Annulla
                </Button>
                <Button type="submit" disabled={isSubmitting} className="flex-1 md:flex-none">
                  {isSubmitting ? "Salvando..." : (
                    user?.role === 'superadmin' ? "Salva Classificazione" : "Convalida Computer Key"
                  )}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="w-[95vw] max-w-4xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Dettagli Registrazione Software</DialogTitle>
          </DialogHeader>

          {selectedRegistration && (
            <div className="space-y-6">
              {/* Informazioni Base */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Software</Label>
                    <p className="text-sm p-2 bg-gray-50 border rounded-md">{selectedRegistration.nomeSoftware}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Versione</Label>
                    <p className="text-sm p-2 bg-gray-50 border rounded-md">{selectedRegistration.versione}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Ragione Sociale</Label>
                    <p className="text-sm p-2 bg-gray-50 border rounded-md">{selectedRegistration.ragioneSociale}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Partita IVA</Label>
                    <p className="text-sm p-2 bg-gray-50 border rounded-md">{selectedRegistration.partitaIva || 'Non specificata'}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Stato</Label>
                    <div className="p-2">
                      {getStatusBadge(selectedRegistration.status)}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Computer Key</Label>
                    <p className="text-xs font-mono p-2 bg-gray-50 border rounded-md break-all">
                      {selectedRegistration.computerKey || 'Non assegnata'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Sistema Operativo</Label>
                    <p className="text-sm p-2 bg-gray-50 border rounded-md">{selectedRegistration.sistemaOperativo || 'Non specificato'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Indirizzo IP</Label>
                    <p className="text-sm p-2 bg-gray-50 border rounded-md">{selectedRegistration.indirizzoIp || 'Non specificato'}</p>
                  </div>
                </div>
              </div>

              {/* Informazioni Assegnazione */}
              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold mb-4">Informazioni Assegnazione</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Cliente Assegnato</Label>
                    {selectedRegistration.clienteAssegnato ? (() => {
                      const client = safeClients.find(c => c.id === selectedRegistration.clienteAssegnato);
                      return (
                        <div className="p-2 bg-green-50 border border-green-200 rounded-md">
                          <p className="text-sm font-medium text-green-800">{client?.name || 'Cliente non trovato'}</p>
                          <p className="text-xs text-green-600">{client?.email || ''}</p>
                        </div>
                      );
                    })() : (
                      <p className="text-sm p-2 bg-gray-50 border rounded-md">Non assegnato</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Azienda</Label>
                    {selectedRegistration.clienteAssegnato ? (() => {
                      const client = safeClients.find(c => c.id === selectedRegistration.clienteAssegnato);
                      const companyId = client?.company_id || client?.companyId;
                      const company = safeCompanies.find(c => c.id === companyId);
                      return company ? (
                        <div className="p-2 bg-blue-50 border border-blue-200 rounded-md">
                          <p className="text-sm font-medium text-blue-800">{company.name}</p>
                          <p className="text-xs text-blue-600">P.IVA: {company.partitaIva || 'N/A'}</p>
                        </div>
                      ) : (
                        <p className="text-sm p-2 bg-gray-50 border rounded-md">Non specificata</p>
                      );
                    })() : (
                      <p className="text-sm p-2 bg-gray-50 border rounded-md">Non assegnata</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Prodotto Assegnato</Label>
                    {selectedRegistration.prodottoAssegnato ? (() => {
                      const product = safeProducts.find(p => p.id === selectedRegistration.prodottoAssegnato || p.name === selectedRegistration.prodottoAssegnato);
                      return product ? (
                        <div className="p-2 bg-purple-50 border border-purple-200 rounded-md">
                          <p className="text-sm font-medium text-purple-800">{product.name}</p>
                          <p className="text-xs text-purple-600">v{product.version || 'N/A'}</p>
                        </div>
                      ) : (
                        <p className="text-sm p-2 bg-gray-50 border rounded-md">Prodotto: {selectedRegistration.prodottoAssegnato}</p>
                      );
                    })() : (
                      <p className="text-sm p-2 bg-gray-50 border rounded-md">Non assegnato</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Licenza Assegnata</Label>
                    {selectedRegistration.licenzaAssegnata ? (() => {
                      const license = safeLicenses.find(l => l.id === selectedRegistration.licenzaAssegnata);
                      return license ? (
                        <div className="p-2 bg-orange-50 border border-orange-200 rounded-md">
                          <p className="text-xs font-mono text-orange-800">{license.activationKey}</p>
                          <p className="text-xs text-orange-600">Stato: {license.status}</p>
                          {license.maxDevices && (
                            <p className="text-xs text-orange-600">Max dispositivi: {license.maxDevices}</p>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm p-2 bg-gray-50 border rounded-md">Licenza non trovata</p>
                      );
                    })() : (
                      <p className="text-sm p-2 bg-gray-50 border rounded-md">Non assegnata</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Informazioni Temporali e Statistiche */}
              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold mb-4">Informazioni Temporali e Statistiche</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Prima Registrazione</Label>
                    <p className="text-sm p-2 bg-gray-50 border rounded-md">
                      {selectedRegistration.primaRegistrazione ? 
                        format(new Date(selectedRegistration.primaRegistrazione), 'dd/MM/yyyy HH:mm', { locale: it }) : 
                        'N/A'
                      }
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Ultima Attività</Label>
                    <p className="text-sm p-2 bg-gray-50 border rounded-md">
                      {selectedRegistration.ultimaAttivita ? 
                        format(new Date(selectedRegistration.ultimaAttivita), 'dd/MM/yyyy HH:mm', { locale: it }) : 
                        'Mai'
                      }
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Totale Venduto</Label>
                    <p className="text-sm p-2 bg-gray-50 border rounded-md font-medium text-green-600">
                      {formatCurrency(selectedRegistration.totaleVenduto || 0)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Note */}
              {selectedRegistration.note && (
                <div className="border-t pt-4">
                  <Label className="text-sm font-medium text-gray-600">Note</Label>
                  <div className="mt-2 p-3 bg-gray-50 border rounded-md">
                    <p className="text-sm whitespace-pre-wrap">{selectedRegistration.note}</p>
                  </div>
                </div>
              )}

              {/* Informazioni Tecniche */}
              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold mb-4">Informazioni Tecniche</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Percorso Installazione</Label>
                    <p className="text-xs font-mono p-2 bg-gray-50 border rounded-md break-all">
                      {selectedRegistration.installationPath || 'Non specificato'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Totale Ordini</Label>
                    <p className="text-sm p-2 bg-gray-50 border rounded-md">
                      {selectedRegistration.totaleOrdini || 0}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setIsViewDialogOpen(false);
                setSelectedRegistration(null);
              }}
            >
              Chiudi
            </Button>
          </div>
        </DialogContent>
      </Dialog>
        </div>
      </div>
    </div>
  );
};