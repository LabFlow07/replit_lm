export interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  role: string;
  company?: {
    id: string;
    name: string;
    type: string;
  };
}

export interface Company {
  id: string;
  name: string;
  type: string;
  parentId?: string;
  status: string;
  contactInfo?: any;
  createdAt: Date;
}

export interface Product {
  id: string;
  name: string;
  version: string;
  description?: string;
  supportedLicenseTypes?: string[];
  createdAt: Date;
}

export interface Client {
  id: string;
  companyId?: string;
  name: string;
  email: string;
  status: string;
  contactInfo?: any;
  isMultiSite: boolean;
  isMultiUser: boolean;
  createdAt: Date;
}

export interface License {
  id: string;
  clientId: string;
  productId: string;
  activationKey: string;
  computerKey?: string;
  activationDate?: Date;
  expiryDate?: Date;
  licenseType: string;
  status?: string;
  maxUsers?: number;
  maxDevices?: number;
  price?: number;
  discount?: number;
  activeModules?: string[];
  assignedCompany?: string;
  assignedAgent?: string;
  createdAt: Date;
}

export interface LicenseWithDetails extends License {
  client: Client;
  product: Product;
  company?: Company;
}

export interface DashboardStats {
  activeLicenses: number;
  demoLicenses: number;
  totalClients: number;
  monthlyRevenue: number;
  todayActivations: number;
  demoConversions: number;
  expiringRenewals: number;
  dailyRevenue: number;
}
