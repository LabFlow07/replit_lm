import { database } from "./database";
import type {
  User, InsertUser,
  Company, InsertCompany,
  Product, InsertProduct,
  Module, InsertModule,
  Client, InsertClient,
  License, InsertLicense, LicenseWithDetails,
  Transaction, InsertTransaction,
  CompanyWallet, InsertCompanyWallet,
  WalletTransaction, InsertWalletTransaction,
  ActivationLog, InsertActivationLog,
  AccessLog, InsertAccessLog,
  DashboardStats, UserWithCompany, TestaRegAzienda, InsertTestaRegAzienda, DettRegAzienda, InsertDettRegAzienda, SoftwareRegistration, InsertSoftwareRegistration, Category
} from "@shared/schema";
import { randomUUID } from "crypto";
import bcrypt from "bcrypt";
import { nanoid } from "nanoid";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<UserWithCompany | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUsers(companyId?: string, includingInactive?: boolean): Promise<UserWithCompany[]>;
  updateUser(id: string, updates: Partial<User>): Promise<User>;
  deleteUser(id: string): Promise<void>;

  // Company methods
  getCompany(id: string): Promise<Company | undefined>;
  getCompanies(): Promise<Company[]>;
  getCompaniesByType(type: string): Promise<Company[]>;
  createCompany(company: InsertCompany): Promise<Company>;
  updateCompany(id: string, updates: Partial<Company>): Promise<Company>;
  deleteCompany(id: string): Promise<void>;

  // Product methods
  getProducts(): Promise<Product[]>;
  getProduct(id: string): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, updates: Partial<Product>): Promise<Product>;
  deleteProduct(id: string): Promise<void>;

  // Module methods
  getModulesByProduct(productId: string): Promise<Module[]>;
  createModule(module: InsertModule): Promise<Module>;

  // Client methods
  getClients(companyId?: string): Promise<Client[]>;
  getClientsByCompany(companyId: string): Promise<Client[]>;
  getClientsByCompanyHierarchy(companyId: string): Promise<Client[]>;
  getClientsByCompanyAndSubcompanies(companyId: string): Promise<Client[]>;
  getClient(id: string): Promise<Client | undefined>;
  getClientById(id: string): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: string, updates: Partial<Client>): Promise<Client>;
  updateClientStatus(id: string, status: string): Promise<void>;
  deleteClient(id: string): Promise<void>;

  // License methods
  getLicenses(filters?: any): Promise<LicenseWithDetails[]>;
  getLicense(id: string): Promise<LicenseWithDetails | undefined>;
  getLicenseByActivationKey(key: string): Promise<LicenseWithDetails | undefined>;
  createLicense(license: InsertLicense): Promise<License>;
  updateLicense(id: string, updates: Partial<License>): Promise<void>;
  deleteLicense(id: string): Promise<void>;
  activateLicense(activationKey: string, computerKey: string, deviceInfo: any): Promise<License>;
  validateLicense(activationKey: string, computerKey?: string): Promise<LicenseWithDetails | null>;
  getLicensesExpiringByDate(): Promise<LicenseWithDetails[]>;
  getLicensesExpiringByCompanyHierarchy(companyId: string): Promise<LicenseWithDetails[]>;

  // Transaction methods
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  getTransactionsByLicense(licenseId: string): Promise<Transaction[]>;
  getTransactionById(id: string): Promise<Transaction | null>;
  updateTransaction(id: string, updates: Partial<Transaction>): Promise<Transaction>;
  deleteTransaction(id: string): Promise<void>;
  clearAllTransactions(): Promise<number>;
  getAllTransactions(): Promise<Transaction[]>;
  getTransactionsByCompanyHierarchy(companyId: string): Promise<Transaction[]>;
  getTransactionsByCompany(companyId: string): Promise<Transaction[]>;
  updateTransactionStatus(id: string, status: string, paymentDate?: Date): Promise<void>;
  getTransactionsByClient(clientId: string): Promise<Transaction[]>;
  getTransactionsByCompanyAndClient(companyId?: string, clientId?: string): Promise<Transaction[]>;
  deleteTransactionsByLicense(licenseId: string): Promise<void>;

  // Wallet methods
  getCompanyWallet(companyId: string): Promise<CompanyWallet | null>;
  createCompanyWallet(companyId: string): Promise<CompanyWallet>;
  updateWalletBalance(companyId: string, amount: number, description: string, type: string, createdBy?: string): Promise<CompanyWallet>;
  transferCredits(fromCompanyId: string, toCompanyId: string, amount: number, createdBy: string): Promise<boolean>;
  getWalletTransactions(companyId: string, limit?: number): Promise<WalletTransaction[]>;
  createWalletTransaction(transaction: InsertWalletTransaction): Promise<WalletTransaction>;
  chargeWalletForLicense(companyId: string, licenseId: string, amount: number, createdBy: string): Promise<boolean>;

  // Logging methods
  logActivation(log: InsertActivationLog): Promise<void>;
  logAccess(log: InsertAccessLog): Promise<void>;

  // Statistics
  getDashboardStats(userId: string, userRole: string, userCompanyId?: string): Promise<DashboardStats>;
  getActiveLicensesCount(): Promise<number>;
  getActiveLicensesCountByCompanyHierarchy(companyId: string): Promise<number>;
  getActiveLicensesCountByCompany(companyId: string): Promise<number>;

  // Company hierarchy methods
  getCompanyHierarchy(companyId: string): Promise<string[]>;
  getLicensesByCompanyHierarchy(companyId: string): Promise<LicenseWithDetails[]>;
  getClientsByCompanyHierarchy(companyId: string): Promise<Client[]>;
  getAllProducts(): Promise<Product[]>;
  getAllCompanies(): Promise<Company[]>;
  getAllClients(): Promise<Client[]>;

  // Software Registration methods
  getSoftwareRegistrations(filters?: any): Promise<SoftwareRegistration[]>;
  getSoftwareRegistration(id: string): Promise<SoftwareRegistration | undefined>;
  getSoftwareRegistrationByComputerKey(computerKey: string): Promise<SoftwareRegistration | undefined>;
  createSoftwareRegistration(registration: InsertSoftwareRegistration): Promise<SoftwareRegistration>;
  updateSoftwareRegistration(id: string, updates: Partial<SoftwareRegistration>): Promise<SoftwareRegistration>;

  // Device Registration methods - New tables
  getTestaRegAzienda(): Promise<TestaRegAzienda[]>;
  getTestaRegAziendaByPartitaIva(partitaIva: string): Promise<TestaRegAzienda | undefined>;
  createTestaRegAzienda(registration: InsertTestaRegAzienda): Promise<TestaRegAzienda>;
  getAllTestaRegAzienda(): Promise<TestaRegAzienda[]>;
  updateTestaRegAzienda(partitaIva: string, updates: Partial<TestaRegAzienda>): Promise<TestaRegAzienda>;
  getDettRegAzienda(partitaIva?: string): Promise<DettRegAzienda[]>;
  getDettRegAziendaById(id: number): Promise<DettRegAzienda | undefined>;
  createDettRegAzienda(registration: InsertDettRegAzienda): Promise<DettRegAzienda>;
  updateDettRegAzienda(id: number, updates: Partial<DettRegAzienda>): Promise<DettRegAzienda>;
  getDettRegAziendaByPartitaIva(partitaIva: string): Promise<DettRegAzienda[]>;
  getDettRegAziendaByComputerKey(computerKey: string): Promise<DettRegAzienda | undefined>;
  deleteTestaRegAzienda(partitaIva: string): Promise<void>;
  deleteDettRegAzienda(id: number): Promise<void>;

  // Configuration methods
  saveStripeConfiguration(publicKey: string, secretKey: string, userId: string): Promise<void>;
  getStripeConfiguration(): Promise<{publicKey: string; secretKey: string} | null>;

  // Category methods
  getAllCategories(): Promise<Category[]>;
  getCategoriesByCompanyHierarchy(companyId: string): Promise<Category[]>;
  createCategory(category: any): Promise<Category>;
  getCategoryById(categoryId: string): Promise<Category | null>;
  updateCategory(categoryId: string, updates: Partial<Category>): Promise<Category | null>;
  deleteCategory(categoryId: string): Promise<boolean>;
}

class DatabaseStorage implements IStorage {
  // Use the real database connection
  private get db() {
    return database;
  }

  async getUser(id: string): Promise<User | undefined> {
    const rows = await this.db.query(
      'SELECT * FROM users WHERE id = ? AND is_active = TRUE',
      [id]
    );
    return rows[0];
  }

  async getUserById(id: string): Promise<User | undefined> {
    const rows = await this.db.query(
      'SELECT * FROM users WHERE id = ? AND is_active = TRUE',
      [id]
    );
    if (!rows[0]) {
      return undefined;
    }
    const user = rows[0];
    return {
      id: user.id,
      username: user.username,
      password: user.password,
      role: user.role,
      companyId: user.company_id,
      name: user.name,
      email: user.email,
      isActive: user.is_active,
      createdAt: user.created_at
    };
  }

  async getUserByUsername(username: string): Promise<UserWithCompany | undefined> {
    console.log('getUserByUsername: Looking up user:', username);

    const rows = await database.query(`
      SELECT u.*, c.name as company_name, c.type as company_type, c.parent_id as company_parent_id
      FROM users u
      LEFT JOIN companies c ON u.company_id = c.id
      WHERE u.username = ? AND u.is_active = TRUE
    `, [username]);

    if (!rows[0]) {
      console.log('getUserByUsername: User not found:', username);
      return undefined;
    }

    const user = rows[0];
    console.log('getUserByUsername: Found user', user.username, 'with role:', user.role, ', company_id:', user.company_id, ', company_name:', user.company_name);

    return {
      id: user.id,
      username: user.username,
      password: user.password,
      role: user.role,
      companyId: user.company_id,
      name: user.name,
      email: user.email,
      isActive: user.is_active,
      createdAt: user.created_at,
      company: user.company_id ? {
        id: user.company_id,
        name: user.company_name,
        type: user.company_type,
        parentId: user.company_parent_id,
        status: 'active',
        contactInfo: null,
        createdAt: new Date()
      } : undefined
    };
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const hashedPassword = await bcrypt.hash(insertUser.password, 10);

    await this.db.query(`
      INSERT INTO users (id, username, password, role, company_id, name, email, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)
    `, [id, insertUser.username, hashedPassword, insertUser.role, insertUser.companyId, insertUser.name, insertUser.email]);

    return { ...insertUser, id, password: hashedPassword, isActive: true, createdAt: new Date() };
  }

  async getCompany(id: string): Promise<Company | undefined> {
    const rows = await this.db.query('SELECT * FROM companies WHERE id = ?', [id]);
    return rows[0];
  }

  async getCompaniesByType(type: string): Promise<Company[]> {
    const rows = await this.db.query('SELECT * FROM companies WHERE type = ? AND status = "active"', [type]);
    return rows;
  }

  async getCompanies(): Promise<Company[]> {
    try {
      const rows = await this.db.query('SELECT * FROM companies ORDER BY name ASC');
      console.log(`getCompanies: Found ${rows.length} companies in database`);

      const mapped = rows.map((row: any) => ({
        ...row,
        parentId: (!row.parent_id || row.parent_id === '0' || row.parent_id === 0) ? null : row.parent_id,
        contactInfo: row.contact_info ? JSON.parse(row.contact_info) : {},
        createdAt: row.created_at
      }));

      console.log('getCompanies: Mapped companies:', mapped.map(c => ({ id: c.id, name: c.name, parent_id: c.parent_id })));
      return mapped;
    } catch (error) {
      console.error('Error in getCompanies:', error);
      throw error;
    }
  }

  async createCompany(insertCompany: InsertCompany): Promise<Company> {
    const id = randomUUID();
    await this.db.query(`
      INSERT INTO companies (id, name, type, parent_id, status, contact_info)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [id, insertCompany.name, insertCompany.type, insertCompany.parentId || null, insertCompany.status || 'active', JSON.stringify(insertCompany.contactInfo || {})]);

    const created = {
      ...insertCompany,
      id,
      createdAt: new Date(),
      parentId: insertCompany.parentId,
      parent_id: insertCompany.parentId
    };
    return created;
  }

  async updateCompany(id: string, updates: Partial<Company>): Promise<Company> {
    const updateFields = [];
    const updateValues = [];

    if (updates.name !== undefined) {
      updateFields.push('name = ?');
      updateValues.push(updates.name);
    }
    if (updates.type !== undefined) {
      updateFields.push('type = ?');
      updateValues.push(updates.type);
    }
    if (updates.parentId !== undefined) {
      updateFields.push('parent_id = ?');
      updateValues.push(updates.parentId);
    }
    if (updates.status !== undefined) {
      updateFields.push('status = ?');
      updateValues.push(updates.status);
    }
    if (updates.contactInfo !== undefined) {
      updateFields.push('contact_info = ?');
      updateValues.push(JSON.stringify(updates.contactInfo));
    }

    if (updateFields.length === 0) {
      throw new Error('No fields to update');
    }

    updateValues.push(id);

    console.log('Executing update query:', `UPDATE companies SET ${updateFields.join(', ')} WHERE id = ?`);
    console.log('With values:', updateValues);

    await this.db.query(`
      UPDATE companies SET ${updateFields.join(', ')} WHERE id = ?
    `, updateValues);

    const updatedCompany = await this.getCompany(id);
    if (!updatedCompany) {
      throw new Error('Company not found after update');
    }

    // Normalize the response
    return {
      ...updatedCompany,
      parentId: updatedCompany.parent_id,
      contactInfo: typeof updatedCompany.contact_info === 'string'
        ? JSON.parse(updatedCompany.contact_info)
        : (updatedCompany.contact_info || {})
    };
  }

  async deleteCompany(id: string): Promise<void> {
    console.log(`deleteCompany: Starting deletion for company ID: ${id}`);

    // First check if company has clients
    const clients = await this.db.query('SELECT COUNT(*) as count FROM clients WHERE company_id = ?', [id]);
    console.log(`deleteCompany: Found ${clients[0].count} clients for company ${id}`);

    if (clients[0].count > 0) {
      throw new Error('Cannot delete company with existing clients');
    }

    // Get the company to find its parent
    const company = await this.db.query('SELECT parent_id, name FROM companies WHERE id = ?', [id]);
    if (company.length === 0) {
      throw new Error('Company not found');
    }

    const parentId = company[0].parent_id;
    const companyName = company[0].name;
    console.log(`deleteCompany: Company ${companyName} has parent_id: ${parentId}`);

    // Check for subcompanies
    const subcompanies = await this.db.query('SELECT id, name FROM companies WHERE parent_id = ?', [id]);
    console.log(`deleteCompany: Found ${subcompanies.length} subcompanies for company ${id}`);

    if (subcompanies.length > 0) {
      console.log(`deleteCompany: Moving ${subcompanies.length} subcompanies to parent ${parentId || 'root'}`);

      // Move subcompanies to the parent company (or make them root if no parent)
      const result = await this.db.query(
        'UPDATE companies SET parent_id = ? WHERE parent_id = ?',
        [parentId, id]
      );
      console.log(`deleteCompany: Updated ${result.affectedRows || 'unknown'} subcompanies`);
    }

    // Now delete the company
    console.log(`deleteCompany: Deleting company ${companyName} (${id})`);
    const deleteResult = await this.db.query('DELETE FROM companies WHERE id = ?', [id]);
    console.log(`deleteCompany: Delete result - affected rows: ${deleteResult.affectedRows || 'unknown'}`);

    if (deleteResult.affectedRows === 0) {
      throw new Error('Company deletion failed - no rows affected');
    }

    console.log(`deleteCompany: Successfully deleted company ${companyName}`);
  }

  async getProducts(): Promise<Product[]> {
    const rows = await this.db.query('SELECT * FROM products ORDER BY name');
    return rows.map(row => ({
      ...row,
      supportedLicenseTypes: JSON.parse(row.supported_license_types || '[]'),
      price: parseFloat(row.price || '0'),
      discount: parseFloat(row.discount || '0'),
      maxUsers: parseInt(row.max_users || '1'),
      maxDevices: parseInt(row.max_devices || '1'),
      trialDays: parseInt(row.trial_days || '30'),
      licenseType: row.license_type
    }));
  }

  async getAllProducts(): Promise<Product[]> {
    try {
      const rows = await database.query(`
        SELECT p.*, c.name as category_name, c.color as category_color
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        ORDER BY p.name, p.version
      `);

      // Map database fields to camelCase for frontend compatibility
      return rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        version: row.version,
        description: row.description,
        categoryId: row.category_id,
        category: row.category_name ? {
          id: row.category_id,
          name: row.category_name,
          color: row.category_color
        } : null,
        createdAt: row.created_at,
        price: parseFloat(row.price || '0'),
        discount: parseFloat(row.discount || '0'),
        licenseType: row.license_type,
        maxUsers: row.max_users,
        maxDevices: row.max_devices,
        trialDays: row.trial_days,
        // Legacy fields for backward compatibility
        supportedLicenseTypes: []
      }));
    } catch (error) {
      console.error('Get all products error:', error);
      throw error;
    }
  }

  async getAllCompanies(): Promise<Company[]> {
    return this.getCompanies();
  }

  async getAllClients(): Promise<Client[]> {
    const rows = await this.db.query('SELECT * FROM clients ORDER BY name');
    return rows.map(row => ({
      ...row,
      contactInfo: JSON.parse(row.contact_info || '{}')
    }));
  }

  async getCompanyById(id: string): Promise<Company | undefined> {
    return this.getCompany(id);
  }

  async getCompaniesInHierarchy(companyId: string): Promise<Company[]> {
    const allCompanies = await this.getCompanies();
    const hierarchy: Company[] = [];

    // Find the root company
    const rootCompany = allCompanies.find(c => c.id === companyId);
    if (rootCompany) {
      hierarchy.push(rootCompany);
    }

    // Find all subsidiaries recursively
    const findSubcompanies = (parentId: string) => {
      const subcompanies = allCompanies.filter(c => c.parent_id === parentId);
      subcompanies.forEach(sub => {
        hierarchy.push(sub);
        findSubcompanies(sub.id);
      });
    };

    findSubcompanies(companyId);
    return hierarchy;
  }

  async getProduct(id: string): Promise<Product | undefined> {
    const rows = await this.db.query('SELECT * FROM products WHERE id = ?', [id]);
    if (rows[0]) {
      return {
        ...rows[0],
        supportedLicenseTypes: JSON.parse(rows[0].supported_license_types || '[]')
      };
    }
    return undefined;
  }

  async createProduct(productData: InsertProduct): Promise<Product> {
    const id = randomUUID();
    await this.db.query(`
      INSERT INTO products (id, name, version, description, category_id, price, discount, license_type, max_users, max_devices, trial_days, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `, [
      id,
      productData.name,
      productData.version,
      productData.description,
      productData.categoryId || null,
      productData.price || 0,
      productData.discount || 0,
      productData.licenseType || 'permanente',
      productData.maxUsers || 1,
      productData.maxDevices || 1,
      productData.trialDays || 30
    ]);

    return { ...productData, id, createdAt: new Date() };
  }

  async getModulesByProduct(productId: string): Promise<Module[]> {
    const rows = await this.db.query('SELECT * FROM modules WHERE product_id = ?', [productId]);
    return rows;
  }

  async createModule(insertModule: InsertModule): Promise<Module> {
    const id = randomUUID();
    await this.db.query(`
      INSERT INTO modules (id, product_id, name, description, base_price)
      VALUES (?, ?, ?, ?, ?)
    `, [id, insertModule.productId, insertModule.name, insertModule.description, insertModule.basePrice]);

    return { ...insertModule, id };
  }

  async getClients(companyId?: string): Promise<Client[]> {
    let query = 'SELECT * FROM clients ORDER BY name';
    let params: any[] = [];

    if (companyId) {
      query = 'SELECT * FROM clients WHERE company_id = ? ORDER BY name';
      params = [companyId];
    }

    const rows = await this.db.query(query, params);
    return rows.map(row => ({
      ...row,
      contactInfo: JSON.parse(row.contact_info || '{}')
    }));
  }

  async getClientsByCompany(companyId: string): Promise<Client[]> {
    const rows = await this.db.query(
      'SELECT * FROM clients WHERE company_id = ? ORDER BY created_at DESC',
      [companyId]
    );
    return rows.map(row => ({
      ...row,
      contactInfo: JSON.parse(row.contact_info || '{}')
    }));
  }

  async getClientsByCompanyHierarchy(companyId: string): Promise<Client[]> {
    const companyIds = await this.getCompanyHierarchy(companyId);
    console.log(`getClientsByCompanyHierarchy: Company hierarchy for ${companyId}:`, companyIds);

    if (companyIds.length === 0) {
      console.log(`getClientsByCompanyHierarchy: No companies in hierarchy, returning empty array`);
      return [];
    }

    const placeholders = companyIds.map(() => '?').join(',');
    const query = `SELECT * FROM clients WHERE company_id IN (${placeholders}) ORDER BY name`;

    console.log(`getClientsByCompanyHierarchy: Executing query:`, query);
    console.log(`getClientsByCompanyHierarchy: With company IDs:`, companyIds);
    const rows = await this.db.query(query, companyIds);
    console.log(`getClientsByCompanyHierarchy: Found ${rows.length} clients`);

    const mappedClients = rows.map(row => ({
      ...row,
      contactInfo: JSON.parse(row.contact_info || '{}')
    }));

    console.log(`getClientsByCompanyHierarchy: Mapped clients:`, mappedClients.map(c => ({ id: c.id, name: c.name, email: c.email, company_id: c.company_id })));
    return mappedClients;

  }

  async getClientsByCompanyAndSubcompanies(companyId: string): Promise<Client[]> {
    // Use the main function for consistency
    return this.getClientsByCompanyHierarchy(companyId);
  }

  async createClient(insertClient: InsertClient): Promise<Client> {
    const id = randomUUID();
    await this.db.query(`
      INSERT INTO clients (id, company_id, name, email, status, contact_info, is_multi_site, is_multi_user)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, insertClient.companyId, insertClient.name, insertClient.email, insertClient.status || 'pending',
        JSON.stringify(insertClient.contactInfo), insertClient.isMultiSite, insertClient.isMultiUser]);

    return { ...insertClient, id, createdAt: new Date() };
  }

  async getCompanyHierarchy(companyId: string): Promise<string[]> {
    const allCompanies = await this.getCompanies();
    const hierarchy: string[] = [companyId];

    console.log(`getCompanyHierarchy: Starting with company ${companyId}`);
    console.log(`getCompanyHierarchy: All companies:`, allCompanies.map(c => ({ id: c.id, name: c.name, parent_id: c.parent_id })));

    const findSubcompanies = (parentId: string) => {
      const subcompanies = allCompanies.filter(c => c.parent_id === parentId);
      console.log(`getCompanyHierarchy: Found ${subcompanies.length} subcompanies for parent ${parentId}:`, subcompanies.map(s => ({ id: s.id, name: s.name })));
      subcompanies.forEach(sub => {
        hierarchy.push(sub.id);
        findSubcompanies(sub.id);
      });
    };

    findSubcompanies(companyId);
    console.log(`getCompanyHierarchy: Final hierarchy for ${companyId}:`, hierarchy);
    return hierarchy;
  }

  async getClient(id: string): Promise<Client | undefined> {
    const rows = await this.db.query('SELECT * FROM clients WHERE id = ?', [id]);
    if (rows[0]) {
      return {
        ...rows[0],
        contactInfo: JSON.parse(rows[0].contact_info || '{}')
      };
    }
    return undefined;
  }

  async getClientById(id: string): Promise<Client | undefined> {
    return this.getClient(id);
  }

  async updateClient(id: string, updates: Partial<Client>): Promise<Client> {
    const updateFields: string[] = [];
    const updateValues: any[] = [];

    if (updates.name !== undefined) {
      updateFields.push('name = ?');
      updateValues.push(updates.name);
    }
    if (updates.email !== undefined) {
      updateFields.push('email = ?');
      updateValues.push(updates.email);
    }
    if (updates.company_id !== undefined) {
      updateFields.push('company_id = ?');
      updateValues.push(updates.company_id);
    }
    if (updates.status !== undefined) {
      updateFields.push('status = ?');
      updateValues.push(updates.status);
    }
    if (updates.isMultiSite !== undefined) {
      updateFields.push('is_multi_site = ?');
      updateValues.push(updates.isMultiSite ? 1 : 0);
    }
    if (updates.isMultiUser !== undefined) {
      updateFields.push('is_multi_user = ?');
      updateValues.push(updates.isMultiUser ? 1 : 0);
    }
    if (updates.contactInfo !== undefined) {
      updateFields.push('contact_info = ?');
      updateValues.push(JSON.stringify(updates.contactInfo));
    }

    if (updateFields.length === 0) {
      throw new Error('No valid fields to update');
    }

    updateValues.push(id);

    await this.db.query(`
      UPDATE clients
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `, updateValues);

    const updatedClient = await this.getClientById(id);
    if (!updatedClient) {
      throw new Error('Client not found after update');
    }

    return updatedClient;
  }

  async updateClientStatus(id: string, status: string): Promise<void> {
    await this.db.query('UPDATE clients SET status = ? WHERE id = ?', [status, id]);
  }

  async deleteClient(id: string): Promise<void> {
    await this.db.query('DELETE FROM clients WHERE id = ?', [id]);
  }

  async getProductById(id: string): Promise<any> {
    const rows = await this.db.query('SELECT * FROM products WHERE id = ?', [id]);
    return rows.length > 0 ? rows[0] : null;
  }

  async getLicensesByProduct(productId: string): Promise<any[]> {
    const rows = await this.db.query('SELECT * FROM licenses WHERE product_id = ?', [productId]);
    return rows;
  }

  async updateProduct(productId: string, updateData: any): Promise<Product> {
    try {
      const setParts = [];
      const values = [];

      if (updateData.name !== undefined) {
        setParts.push('name = ?');
        values.push(updateData.name);
      }
      if (updateData.version !== undefined) {
        setParts.push('version = ?');
        values.push(updateData.version);
      }
      if (updateData.description !== undefined) {
        setParts.push('description = ?');
        values.push(updateData.description);
      }
      if (updateData.categoryId !== undefined) {
        setParts.push('category_id = ?');
        values.push(updateData.categoryId);
      }
      if (updateData.licenseType !== undefined) {
        setParts.push('license_type = ?');
        values.push(updateData.licenseType);
      }
      if (updateData.price !== undefined) {
        setParts.push('price = ?');
        values.push(updateData.price);
      }
      if (updateData.discount !== undefined) {
        setParts.push('discount = ?');
        values.push(updateData.discount);
      }
      if (updateData.maxUsers !== undefined) {
        setParts.push('max_users = ?');
        values.push(updateData.maxUsers);
      }
      if (updateData.maxDevices !== undefined) {
        setParts.push('max_devices = ?');
        values.push(updateData.maxDevices);
      }
      if (updateData.trialDays !== undefined) {
        setParts.push('trial_days = ?');
        values.push(updateData.trialDays);
      }

      if (setParts.length === 0) {
        throw new Error('No fields to update');
      }

      values.push(productId);

      await this.db.query(`
        UPDATE products
        SET ${setParts.join(', ')}
        WHERE id = ?
      `, values);

      return await this.getProduct(productId) as Product;
    } catch (error) {
      console.error('Update product error:', error);
      throw error;
    }
  }

  async deleteProduct(id: string): Promise<void> {
    await this.db.query('DELETE FROM products WHERE id = ?', [id]);
  }

  async getLicenses(filters?: any): Promise<LicenseWithDetails[]> {
    let query = `
      SELECT
        l.*,
        c.name as client_name, c.email as client_email, c.status as client_status, c.company_id,
        p.name as product_name, p.version as product_version,
        comp.name as company_name
      FROM licenses l
      JOIN clients c ON l.client_id = c.id
      JOIN products p ON l.product_id = p.id
      LEFT JOIN companies comp ON l.assigned_company = comp.id
      ORDER BY l.expiry_date ASC, l.created_at DESC
    `;

    const rows = await this.db.query(query);

    return this.mapLicenseRows(rows);
  }

  async getLicense(id: string): Promise<LicenseWithDetails | undefined> {
    const licenses = await this.getLicenses();
    return licenses.find(l => l.id === id);
  }

  async getLicenseByActivationKey(key: string): Promise<LicenseWithDetails | undefined> {
    const licenses = await this.getLicenses();
    return licenses.find(l => l.activationKey === key);
  }

  async getAllLicenses(): Promise<LicenseWithDetails[]> {
    const query = `
      SELECT
        l.*,
        c.name as client_name,
        c.email as client_email,
        c.status as client_status,
        c.company_id,
        p.name as product_name,
        p.version as product_version,
        comp.name as company_name
      FROM licenses l
      LEFT JOIN clients c ON l.client_id = c.id
      LEFT JOIN products p ON l.product_id = p.id
      LEFT JOIN companies comp ON c.company_id = comp.id
      ORDER BY l.created_at DESC
    `;

    const rows = await this.db.query(query);
    console.log(`getAllLicenses: Query returned ${rows.length} raw rows`);
    return this.mapLicenseRows(rows);
  }

  async getLicensesByCompanyHierarchy(companyId: string): Promise<LicenseWithDetails[]> {
    const companyIds = await this.getCompanyHierarchy(companyId);
    const placeholders = companyIds.map(() => '?').join(',');

    console.log(`getLicensesByCompanyHierarchy: Starting with company ${companyId}`);
    console.log(`getLicensesByCompanyHierarchy: Company hierarchy IDs: [${companyIds.join(', ')}]`);

    const query = `
      SELECT
        l.*,
        c.name as client_name,
        c.email as client_email,
        c.status as client_status,
        c.company_id,
        p.name as product_name,
        p.version as product_version,
        comp.name as company_name
      FROM licenses l
      LEFT JOIN clients c ON l.client_id = c.id
      LEFT JOIN products p ON l.product_id = p.id
      LEFT JOIN companies comp ON c.company_id = comp.id
      WHERE c.company_id IN (${placeholders})
      ORDER BY l.created_at DESC
    `;

    console.log(`getLicensesByCompanyHierarchy: Executing query with placeholders: ${placeholders}`);
    console.log(`getLicensesByCompanyHierarchy: Query parameters: [${companyIds.join(', ')}]`);

    const rows = await this.db.query(query, companyIds);
    console.log(`getLicensesByCompanyHierarchy: Query returned ${rows.length} raw rows`);

    // Debug: let's check what clients exist in these companies
    const debugClientsQuery = `SELECT id, name, email, company_id FROM clients WHERE company_id IN (${placeholders})`;
    const debugClients = await this.db.query(debugClientsQuery, companyIds);
    console.log(`getLicensesByCompanyHierarchy: DEBUG - Clients in hierarchy companies:`, debugClients.map(c => ({ name: c.name, email: c.email, company_id: c.company_id })));

    // Debug: let's check all licenses and their client company_ids
    const debugLicensesQuery = `
      SELECT l.id, l.activation_key, c.name as client_name, c.company_id
      FROM licenses l
      JOIN clients c ON l.client_id = c.id
      ORDER BY l.created_at DESC
    `;
    const debugLicenses = await this.db.query(debugLicensesQuery);
    console.log(`getLicensesByCompanyHierarchy: DEBUG - All licenses with client companies:`, debugLicenses.map(l => ({
      id: l.id.substring(0, 8),
      activation_key: l.activation_key,
      client_name: l.client_name,
      client_company_id: l.company_id
    })));

    // Debug: specifically check which licenses should match our hierarchy
    const matchingLicenses = debugLicenses.filter(l => companyIds.includes(l.company_id));
    console.log(`getLicensesByCompanyHierarchy: DEBUG - Licenses that should match our hierarchy:`, matchingLicenses.map(l => ({
      id: l.id.substring(0, 8),
      activation_key: l.activation_key,
      client_name: l.client_name,
      client_company_id: l.company_id
    })));

    const mappedLicenses = this.mapLicenseRows(rows);
    console.log(`getLicensesByCompanyHierarchy: Final result - returning ${mappedLicenses.length} licenses for company hierarchy ${companyId}`);

    return mappedLicenses;
  }

  async createLicense(insertLicense: InsertLicense): Promise<License> {
    const id = randomUUID();

    // Genera automaticamente la chiave di attivazione se non fornita
    const activationKey = insertLicense.activationKey || `${(insertLicense.licenseType || 'LIC').toUpperCase()}-${randomUUID().substring(0, 8).toUpperCase()}`;

    // 🚫 NON calcolare automaticamente la data di scadenza durante la creazione
    // La data di scadenza viene calcolata SOLO durante l'attivazione della licenza
    let expiryDate = insertLicense.expiryDate || null;

    // SOLO se la licenza viene creata GIÀ con computerKey (attivazione immediata)
    // allora calcola la data di scadenza, altrimenti rimane NULL
    if (insertLicense.computerKey && insertLicense.activationKey) {
      console.log('🔄 Licenza creata con attivazione immediata - calcolo data scadenza');
      const baseDate = new Date();

      if (insertLicense.licenseType === 'abbonamento_mensile') {
        expiryDate = new Date(baseDate);
        expiryDate.setMonth(expiryDate.getMonth() + 1);
        expiryDate.setDate(expiryDate.getDate() - 1); // Per 18/8 -> 17/9
        console.log('📅 Licenza mensile: scadenza impostata a', expiryDate.toISOString().split('T')[0]);
      } else if (insertLicense.licenseType === 'abbonamento_annuale') {
        expiryDate = new Date(baseDate);
        expiryDate.setFullYear(expiryDate.getFullYear() + 1);
        expiryDate.setDate(expiryDate.getDate() - 1); // Per 18/8/25 -> 17/8/26
        console.log('📅 Licenza annuale: scadenza impostata a', expiryDate.toISOString().split('T')[0]);
      } else if (insertLicense.licenseType === 'trial') {
        expiryDate = new Date(baseDate);
        expiryDate.setDate(expiryDate.getDate() + 30); // Trial di 30 giorni
        console.log('📅 Licenza trial: scadenza impostata a', expiryDate.toISOString().split('T')[0]);
      }
    } else {
      console.log('⏳ Licenza creata senza attivazione - data scadenza sarà calcolata durante attivazione');
    }

    // Se viene fornita una chiave di attivazione e chiave computer, attiva automaticamente
    const shouldActivate = insertLicense.activationKey && insertLicense.computerKey;
    const finalStatus = shouldActivate ? 'attiva' : (insertLicense.status || 'in_attesa_convalida');
    const activationDate = shouldActivate ? new Date() : (insertLicense.activationDate || null);

    await this.db.query(`
      INSERT INTO licenses (
        id, client_id, product_id, activation_key, computer_key, activation_date,
        expiry_date, license_type, status, max_users, max_devices, price, discount,
        active_modules, assigned_company, assigned_agent, renewal_enabled, renewal_period
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      insertLicense.clientId,
      insertLicense.productId,
      activationKey,
      insertLicense.computerKey || null,
      activationDate,
      expiryDate,
      insertLicense.licenseType || 'permanente',
      finalStatus,
      insertLicense.maxUsers || 1,
      insertLicense.maxDevices || 1,
      parseFloat(insertLicense.price?.toString() || '0'),
      parseFloat(insertLicense.discount?.toString() || '0'),
      JSON.stringify(insertLicense.activeModules || ['core']),
      insertLicense.assignedCompany || null,
      insertLicense.assignedAgent || null,
      insertLicense.renewalEnabled ? 1 : 0,
      insertLicense.renewalPeriod || null
    ]);

    // NON creare automaticamente la transazione durante la creazione della licenza
    // La transazione verrà creata solo durante l'assegnazione/attivazione della licenza

    return {
      ...insertLicense,
      id,
      activationKey,
      expiryDate,
      createdAt: new Date()
    };
  }

  async updateLicense(id: string, updates: Partial<License>): Promise<void> {
    console.log(`updateLicense called for license ${id} with updates:`, updates);

    const fieldMapping: { [key: string]: string } = {
      'maxUsers': 'max_users',
      'maxDevices': 'max_devices',
      'licenseType': 'license_type',
      'activationKey': 'activation_key',
      'computerKey': 'computer_key',
      'activationDate': 'activation_date',
      'expiryDate': 'expiry_date',
      'activeModules': 'active_modules',
      'assignedCompany': 'assigned_company',
      'assignedAgent': 'assigned_agent',
      'renewalEnabled': 'renewal_enabled',
      'renewalPeriod': 'renewal_period'
    };

    const fields = Object.keys(updates).filter(key => key !== 'id' && key !== 'createdAt');
    const setClause = fields.map(field => {
      const dbField = fieldMapping[field] || field;
      return `${dbField} = ?`;
    }).join(', ');

    const values = fields.map(field => {
      let value = updates[field as keyof License];
      // Convert activeModules to JSON string if needed
      if (field === 'activeModules' && Array.isArray(value)) {
        value = JSON.stringify(value);
      }
      // Convert Date objects or ISO strings to MySQL datetime format
      if (field === 'activationDate' || field === 'expiryDate') {
        if (value instanceof Date) {
          const convertedValue = value.toISOString().slice(0, 19).replace('T', ' ');
          console.log(`Converting ${field} from Date ${value.toISOString()} to MySQL format: ${convertedValue}`);
          value = convertedValue;
        } else if (typeof value === 'string' && value.includes('T')) {
          // Convert ISO string to MySQL datetime format
          const convertedValue = value.slice(0, 19).replace('T', ' ');
          console.log(`Converting ${field} from ISO string ${value} to MySQL format: ${convertedValue}`);
          value = convertedValue;
        }
      }
      return value;
    });

    const query = `UPDATE licenses SET ${setClause} WHERE id = ?`;
    console.log(`Executing query: ${query}`);
    console.log(`With values:`, [...values, id]);

    await this.db.query(query, [...values, id]);
    console.log(`License ${id} updated successfully in database`);
  }

  async deleteLicense(licenseId: string): Promise<void> {
    try {
      // First delete any associated transactions
      await this.db.query('DELETE FROM transactions WHERE license_id = ?', [licenseId]);

      // Then delete the license
      const query = 'DELETE FROM licenses WHERE id = ?';
      await this.db.query(query, [licenseId]);
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }

  async activateLicense(activationKey: string, computerKey: string, deviceInfo: any): Promise<License> {
    const license = await this.getLicenseByActivationKey(activationKey);
    if (!license) {
      throw new Error('License not found');
    }

    if (license.status === 'attiva') {
      throw new Error('License already activated');
    }

    // Calcola la data di scadenza basata sulla data di attivazione
    const activationDate = new Date();
    let expiryDate = license.expiryDate;

    // Se non c'è data di scadenza e la licenza è di tipo abbonamento o trial, calcolala
    if (!expiryDate) {
      if (license.licenseType === 'abbonamento_mensile') {
        expiryDate = new Date(activationDate);
        expiryDate.setMonth(expiryDate.getMonth() + 1);
        expiryDate.setDate(expiryDate.getDate() - 1);
      } else if (license.licenseType === 'abbonamento_annuale') {
        expiryDate = new Date(activationDate);
        expiryDate.setFullYear(expiryDate.getFullYear() + 1);
        expiryDate.setDate(expiryDate.getDate() - 1);
      } else if (license.licenseType === 'trial') {
        expiryDate = new Date(activationDate);
        expiryDate.setDate(expiryDate.getDate() + 30);
      }
    }

    await this.updateLicense(license.id, {
      computerKey,
      activationDate,
      expiryDate,
      status: 'attiva'
    });

    await this.logActivation({
      licenseId: license.id,
      keyType: 'activation',
      deviceInfo,
      ipAddress: '',
      userAgent: '',
      result: 'success'
    });

    return license;
  }

  async validateLicense(activationKey: string, computerKey?: string): Promise<LicenseWithDetails | null> {
    const license = await this.getLicenseByActivationKey(activationKey);

    if (!license) {
      return null;
    }

    if (license.status !== 'attiva') {
      return null;
    }

    if (computerKey && license.computerKey !== computerKey) {
      return null;
    }

    if (license.expiryDate && new Date() > new Date(license.expiryDate)) {
      await this.updateLicense(license.id, { status: 'scaduta' });
      return null;
    }

    return license;
  }

  async countAuthorizedDevicesForLicense(licenseId: string): Promise<number> {
    try {
      // Count devices with computer keys assigned to this license through software registrations
      const query = `
        SELECT COUNT(*) as count
        FROM Dett_Reg_Azienda d
        INNER JOIN Testa_Reg_Azienda t ON d.PartitaIva = t.PartitaIva
        WHERE t.ID_Licenza = ?
        AND d.Computer_Key IS NOT NULL
        AND d.Computer_Key != ''
      `;

      const result = await this.db.query(query, [licenseId]);
      const count = result[0]?.count || 0;

      console.log(`License ${licenseId} has ${count} authorized devices through software registrations`);

      return count;
    } catch (error) {
      console.error('Error counting authorized devices for license:', error);
      return 0;
    }
  }

  async createTransaction(transactionData: InsertTransaction): Promise<Transaction> {
    const id = nanoid();

    // Ensure proper numeric calculation
    const amount = parseFloat(transactionData.amount || '0');
    const discount = parseFloat(transactionData.discount || '0');
    // If finalAmount is provided, use it; otherwise calculate it
    const finalAmount = parseFloat(transactionData.finalAmount || '0') || Math.max(0, amount - discount);

    const query = `
      INSERT INTO transactions (
        id, license_id, client_id, company_id, type, amount, discount,
        final_amount, payment_method, status, payment_link, payment_date,
        notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const now = new Date(); // Use Date object for better handling of date/time

    await this.db.query(query, [
      id,
      transactionData.licenseId,
      transactionData.clientId,
      transactionData.companyId || null,
      transactionData.type || 'attivazione',
      amount,
      discount,
      finalAmount,
      transactionData.paymentMethod || null,
      transactionData.status || 'in_attesa',
      transactionData.paymentLink || null,
      transactionData.paymentDate || null,
      transactionData.notes || null,
      now,
      now
    ]);

    return {
      id,
      ...transactionData,
      amount,
      discount,
      finalAmount,
      createdAt: now,
      updatedAt: now
    };
  }

  async getTransactionsByLicense(licenseId: string): Promise<Transaction[]> {
    const rows = await this.db.query(
      'SELECT * FROM transactions WHERE license_id = ? ORDER BY created_at DESC',
      [licenseId]
    );
    return rows;
  }

  async getAllTransactions(): Promise<Transaction[]> {
    try {
      const query = `
        SELECT
          t.*,
          c.name as client_name,
          c.email as client_email,
          comp.name as company_name,
          l.activation_key as license_key,
          u.username as modified_by_username
        FROM transactions t
        LEFT JOIN clients c ON t.client_id = c.id
        LEFT JOIN companies comp ON t.company_id = comp.id
        LEFT JOIN licenses l ON t.license_id = l.id
        LEFT JOIN users u ON t.modified_by = u.id
        ORDER BY COALESCE(t.created_at, t.updated_at) DESC
      `;

      const rows = await this.db.query(query);
      return rows.map((row: any) => ({
        id: row.id,
        licenseId: row.license_id,
        clientId: row.client_id,
        companyId: row.company_id,
        client_name: row.client_name,
        client_email: row.client_email,
        company_name: row.company_name,
        license_key: row.license_key,
        type: row.type,
        amount: row.amount,
        discount: row.discount,
        final_amount: row.final_amount,
        paymentMethod: row.payment_method,
        status: row.status,
        paymentLink: row.payment_link,
        paymentDate: row.payment_date,
        notes: row.notes,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        modifiedBy: row.modified_by_username
      }));
    } catch (error) {
      console.error('Error getting all transactions:', error);
      throw error;
    }
  }

  async getTransactionsByCompanyHierarchy(companyId: string): Promise<any[]> {
    try {
      // Get all companies in the hierarchy
      const companyIds = await this.getCompanyHierarchy(companyId);
      const placeholders = companyIds.map(() => '?').join(',');

      const query = `
        SELECT
          t.*,
          c.name as client_name,
          c.email as client_email,
          comp.name as company_name,
          l.activation_key as license_key,
          u.username as modified_by_username
        FROM transactions t
        LEFT JOIN clients c ON t.client_id = c.id
        LEFT JOIN companies comp ON t.company_id = comp.id
        LEFT JOIN licenses l ON t.license_id = l.id
        LEFT JOIN users u ON t.modified_by = u.id
        WHERE t.company_id IN (${placeholders})
        ORDER BY COALESCE(t.created_at, t.updated_at) DESC
      `;

      const rows = await this.db.query(query, companyIds);
      return rows.map((row: any) => ({
        id: row.id,
        licenseId: row.license_id,
        clientId: row.client_id,
        companyId: row.company_id,
        client_name: row.client_name,
        client_email: row.client_email,
        company_name: row.company_name,
        license_key: row.license_key,
        type: row.type,
        amount: row.amount,
        discount: row.discount,
        final_amount: row.final_amount,
        paymentMethod: row.payment_method,
        status: row.status,
        paymentLink: row.payment_link,
        paymentDate: row.payment_date,
        notes: row.notes,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        modifiedBy: row.modified_by_username
      }));
    } catch (error) {
      console.error('Error getting transactions by company hierarchy:', error);
      throw error;
    }
  }

  async getTransactionsByCompany(companyId: string): Promise<Transaction[]> {
    const query = `
      SELECT
        t.*,
        c.name as client_name,
        c.email as client_email,
        comp.name as company_name,
        l.activation_key as license_key,
        u.username as modified_by_username
      FROM transactions t
      LEFT JOIN clients c ON t.client_id = c.id
      LEFT JOIN companies comp ON t.company_id = comp.id
      LEFT JOIN licenses l ON t.license_id = l.id
      LEFT JOIN users u ON t.modified_by = u.id
      WHERE t.company_id = ?
      ORDER BY t.created_at DESC
    `;

    const rows = await this.db.query(query, [companyId]);
    return rows.map((row: any) => ({
      id: row.id,
      licenseId: row.license_id,
      clientId: row.client_id,
      companyId: row.company_id,
      client_name: row.client_name,
      client_email: row.client_email,
      company_name: row.company_name,
      license_key: row.license_key,
      type: row.type,
      amount: parseFloat(row.amount || '0'),
      discount: parseFloat(row.discount || '0'),
      final_amount: parseFloat(row.final_amount || '0'),
      paymentMethod: row.payment_method,
      status: row.status,
      paymentLink: row.payment_link,
      paymentDate: row.payment_date,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      modifiedBy: row.modified_by_username
    }));
  }

  async getTransactionById(id: string): Promise<Transaction | null> {
    const rows = await this.db.query(
      'SELECT * FROM transactions WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  }



  async updateTransaction(id: string, updates: Partial<Transaction>): Promise<Transaction> {
    const updateFields = [];
    const updateValues = [];

    for (const [key, value] of Object.entries(updates)) {
      if (key !== 'id' && key !== 'createdAt') {
        updateFields.push(`${key.replace(/([A-Z])/g, '_$1').toLowerCase()} = ?`);
        updateValues.push(value);
      }
    }

    updateFields.push('updated_at = ?');
    updateValues.push(new Date());
    updateValues.push(id);

    await this.db.query(
      `UPDATE transactions SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    const transaction = await this.getTransactionById(id);
    if (!transaction) {
      throw new Error('Transaction not found after update');
    }
    return transaction;
  }

  async updateTransactionStatus(transactionId: string, status: string, paymentMethod?: string, modifiedBy?: string): Promise<any> {
    console.log(`🔧 updateTransactionStatus called with: ${transactionId}, status: ${status}, paymentMethod: ${paymentMethod}, modifiedBy: ${modifiedBy}`);
    try {
      // Format date for MariaDB compatibility (YYYY-MM-DD HH:MM:SS)
      const now = new Date();
      const mariaDbDate = now.toISOString().slice(0, 19).replace('T', ' ');

      console.log(`📅 Current MariaDB date: ${mariaDbDate}`);

      // Determine payment date based on status
      let paymentDateValue = null;
      if (status === 'in_attesa') {
        // If status is "in_attesa", explicitly set payment_date to NULL
        paymentDateValue = null;
        console.log(`⏳ Status is "in_attesa" - removing payment date (setting to NULL)`);
      } else if (status === 'contanti' || status === 'bonifico' || status === 'carta_di_credito' ||
                 status === 'dall_agente' || status === 'dal_rivenditore' ||
                 status === 'completed' || status === 'manual_paid') {
        // If status indicates payment received, set current date
        paymentDateValue = mariaDbDate;
        console.log(`💳 Status indicates payment received - setting payment date to: ${mariaDbDate}`);
      } else {
        console.log(`ℹ️ Status "${status}" does not require payment date change - keeping current value`);
      }

      // Build the query dynamically based on what needs to be updated
      const updateFields = ['status = ?', 'updated_at = ?'];
      const queryParams = [status, mariaDbDate];

      // Handle payment date explicitly
      updateFields.push('payment_date = ?');
      queryParams.push(paymentDateValue);

      // Handle payment method
      if (paymentMethod !== undefined) {
        updateFields.push('payment_method = ?');
        queryParams.push(paymentMethod);
      }

      // Handle modified by
      if (modifiedBy !== undefined) {
        updateFields.push('modified_by = ?');
        queryParams.push(modifiedBy);
      }

      // Add transaction ID for WHERE clause
      queryParams.push(transactionId);

      const query = `UPDATE transactions SET ${updateFields.join(', ')} WHERE id = ?`;
      console.log(`🔍 Executing SQL query: ${query}`);
      console.log(`📝 With parameters:`, queryParams);

      const result = await this.db.query(query, queryParams);

      if (result.affectedRows === 0) {
        throw new Error('Transaction not found');
      }

      console.log(`✅ Transaction ${transactionId} updated successfully with ${result.affectedRows} rows affected`);
      return await this.getTransactionById(transactionId);
    } catch (error) {
      console.error('Error updating transaction status:', error);
      throw error;
    }
  }

  async getTransaction(id: string): Promise<Transaction | undefined> {
    const rows = await this.db.query(`
      SELECT
        t.*,
        c.name as client_name,
        c.email as client_email,
        comp.name as company_name,
        l.activation_key as license_key
      FROM transactions t
      LEFT JOIN clients c ON t.client_id = c.id
      LEFT JOIN companies comp ON t.company_id = comp.id OR c.company_id = comp.id
      LEFT JOIN licenses l ON t.license_id = l.id
      WHERE t.id = ?
    `, [id]);

    if (rows.length === 0) return undefined;

    const row = rows[0];
    return {
      id: row.id,
      licenseId: row.license_id,
      clientId: row.client_id,
      companyId: row.company_id,
      client_name: row.client_name,
      client_email: row.client_email,
      company_name: row.company_name,
      license_key: row.license_key,
      type: row.type,
      amount: parseFloat(row.amount || '0'),
      discount: parseFloat(row.discount || '0'),
      finalAmount: parseFloat(row.final_amount || '0'),
      final_amount: parseFloat(row.final_amount || '0'),
      paymentMethod: row.payment_method,
      status: row.status,
      paymentLink: row.payment_link,
      paymentDate: row.payment_date,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      created_at: row.created_at,
      creditsUsed: parseFloat(row.credits_used || '0'), // Add this field for refund processing
      modifiedBy: row.modified_by
    };
  }

  async updateTransactionPaymentLink(id: string, paymentLink: string): Promise<Transaction> {
    return await this.updateTransaction(id, {
      paymentLink,
      updatedAt: new Date()
    });
  }

  async getTransactionsByClient(clientId: string): Promise<Transaction[]> {
    const rows = await this.db.query(
      'SELECT * FROM transactions WHERE client_id = ? ORDER BY created_at DESC',
      [clientId]
    );
    return rows;
  }

  async getTransactionsByCompanyAndClient(companyId?: string, clientId?: string): Promise<Transaction[]> {
    let query = 'SELECT t.* FROM transactions t';
    let whereConditions = [];
    let queryParams = [];

    if (companyId || clientId) {
      query += ' JOIN licenses l ON t.license_id = l.id JOIN clients c ON l.client_id = c.id';

      if (companyId) {
        whereConditions.push('c.company_id = ?');
        queryParams.push(companyId);
      }

      if (clientId) {
        whereConditions.push('c.id = ?');
        queryParams.push(clientId);
      }
    }

    if (whereConditions.length > 0) {
      query += ' WHERE ' + whereConditions.join(' AND ');
    }

    query += ' ORDER BY t.created_at DESC';

    const rows = await this.db.query(query, queryParams);
    return rows;
  }

  async deleteTransaction(id: string): Promise<void> {
    await this.db.query('DELETE FROM transactions WHERE id = ?', [id]);
  }

  async deleteTransactionsByLicense(licenseId: string): Promise<void> {
    await this.db.query('DELETE FROM transactions WHERE license_id = ?', [licenseId]);
  }

  async clearAllTransactions(): Promise<number> {
    const result = await this.db.query('DELETE FROM transactions');
    return result.affectedRows || 0;
  }

  async logActivation(log: InsertActivationLog): Promise<void> {
    const id = randomUUID();
    await this.db.query(`
      INSERT INTO activation_logs (id, license_id, key_type, device_info, ip_address, user_agent, result, error_message)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, log.licenseId, log.keyType, JSON.stringify(log.deviceInfo), log.ipAddress, log.userAgent, log.result, log.errorMessage]);
  }

  async logAccess(log: InsertAccessLog): Promise<void> {
    const id = randomUUID();
    await this.db.query(`
      INSERT INTO access_logs (id, user_id, action, resource, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [id, log.userId, log.action, log.resource, log.ipAddress, log.userAgent]);
  }

  async getLicensesExpiringByDate(): Promise<LicenseWithDetails[]> {
    const query = `
      SELECT
        l.*,
        c.name as client_name, c.email as client_email, c.status as client_status, c.company_id,
        p.name as product_name, p.version as product_version,
        comp.name as company_name
      FROM licenses l
      JOIN clients c ON l.client_id = c.id
      JOIN products p ON l.product_id = p.id
      LEFT JOIN companies comp ON l.assigned_company = comp.id
      WHERE l.expiry_date IS NOT NULL
      AND l.status = 'attiva'
      ORDER BY l.expiry_date ASC
    `

    const rows = await this.db.query(query);
    return this.mapLicenseRows(rows);
  }

  async getLicensesExpiringByCompanyHierarchy(companyId: string): Promise<LicenseWithDetails[]> {
    const companyIds = await this.getCompanyHierarchy(companyId);
    const placeholders = companyIds.map(() => '?').join(',');

    const query = `
      SELECT
        l.*,
        c.name as client_name, c.email as client_email, c.status as client_status, c.company_id,
        p.name as product_name, p.version as product_version,
        comp.name as company_name
      FROM licenses l
      JOIN clients c ON l.client_id = c.id
      JOIN products p ON l.product_id = p.id
      LEFT JOIN companies comp ON l.assigned_company = comp.id
      WHERE l.expiry_date IS NOT NULL
      AND l.status = 'attiva'
      AND c.company_id IN (${placeholders})
      ORDER BY l.expiry_date ASC
    `

    const rows = await this.db.query(query, companyIds);
    return this.mapLicenseRows(rows);
  }

  private mapLicenseRows(rows: any[]): LicenseWithDetails[] {
    return rows.map(row => ({
      id: row.id,
      clientId: row.client_id,
      productId: row.product_id,
      activationKey: row.activation_key,
      computerKey: row.computerKey,
      activationDate: row.activationDate,
      expiryDate: row.expiryDate,
      licenseType: row.licenseType,
      status: row.status,
      maxUsers: row.maxUsers,
      maxDevices: row.maxDevices,
      price: row.price,
      discount: row.discount,
      activeModules: JSON.parse(row.active_modules || '[]'),
      assignedCompany: row.assignedCompany,
      assignedAgent: row.assignedAgent,
      renewalEnabled: row.renewalEnabled,
      renewalPeriod: row.renewalPeriod,
      createdAt: row.createdAt,
      client: {
        id: row.client_id,
        name: row.client_name,
        email: row.client_email,
        status: row.client_status,
        companyId: row.client_company_id || row.company_id,
        contactInfo: {},
        isMultiSite: false,
        isMultiUser: false,
        createdAt: new Date()
      },
      product: {
        id: row.product_id,
        name: row.product_name,
        version: row.product_version,
        description: '',
        supportedLicenseTypes: [],
        createdAt: new Date()
      },
      company: row.company_name ? {
        id: row.assigned_company,
        name: row.company_name,
        type: '',
        parentId: null,
        status: 'active',
        contactInfo: null,
        createdAt: new Date()
      } : undefined
    }));
  }

  async getDashboardStats(userId: string, userRole: string, userCompanyId?: string): Promise<DashboardStats> {
    // If user is admin (not superadmin), filter by company hierarchy
    if (userRole === 'admin' && userCompanyId) {
      const companyIds = await this.getCompanyHierarchy(userCompanyId);
      const placeholders = companyIds.map(() => '?').join(',');

      const [activeLicenses] = await this.db.query(
        `SELECT COUNT(*) as count FROM licenses l
         JOIN clients c ON l.client_id = c.id
         WHERE l.status = "attiva" AND c.company_id IN (${placeholders})`,
        companyIds
      );

      const [demoLicenses] = await this.db.query(
        `SELECT COUNT(*) as count FROM licenses l
         JOIN clients c ON l.client_id = c.id
         WHERE l.license_type = "trial" AND l.status IN ("attiva", "demo")
         AND c.company_id IN (${placeholders})`,
        companyIds
      );

      const [totalClients] = await this.db.query(
        `SELECT COUNT(*) as count FROM clients
         WHERE status = "convalidato" AND company_id IN (${placeholders})`,
        companyIds
      );

      const [monthlyRevenue] = await this.db.query(`
        SELECT COALESCE(SUM(t.amount), 0) as total
        FROM transactions t
        JOIN licenses l ON t.license_id = l.id
        JOIN clients c ON l.client_id = c.id
        WHERE t.status = "completed"
        AND MONTH(t.created_at) = MONTH(CURRENT_DATE())
        AND YEAR(t.created_at) = YEAR(CURRENT_DATE())
        AND c.company_id IN (${placeholders})
      `, companyIds);

      const [todayActivations] = await this.db.query(`
        SELECT COUNT(*) as count
        FROM licenses l
        JOIN clients c ON l.client_id = c.id
        WHERE DATE(l.activation_date) = CURDATE()
        AND c.company_id IN (${placeholders})
      `, companyIds);

      return {
        activeLicenses: activeLicenses[0]?.count || 0,
        demoLicenses: demoLicenses[0]?.count || 0,
        totalClients: totalClients[0]?.count || 0,
        monthlyRevenue: parseFloat(monthlyRevenue[0]?.total || '0'),
        todayActivations: todayActivations[0]?.count || 0,
        demoConversions: 0,
        expiringRenewals: 0,
        dailyRevenue: 0
      };
    }

    // For superadmin, get all stats
    const [activeLicenses] = await this.db.query(
      'SELECT COUNT(*) as count FROM licenses WHERE status = "attiva"'
    );

    const [demoLicenses] = await this.db.query(
      'SELECT COUNT(*) as count FROM licenses WHERE license_type = "trial" AND status IN ("attiva", "demo")'
    );

    const [totalClients] = await this.db.query(
      'SELECT COUNT(*) as count FROM clients WHERE status = "convalidato"'
    );

    const [monthlyRevenue] = await this.db.query(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM transactions
      WHERE status = "completed"
      AND MONTH(created_at) = MONTH(CURRENT_DATE())
      AND YEAR(created_at) = YEAR(CURRENT_DATE())
    `);

    const [todayActivations] = await this.db.query(`
      SELECT COUNT(*) as count
      FROM licenses
      WHERE DATE(activation_date) = CURDATE()
    `);

    return {
      activeLicenses: activeLicenses[0]?.count || 0,
      demoLicenses: demoLicenses[0]?.count || 0,
      totalClients: totalClients[0]?.count || 0,
      monthlyRevenue: parseFloat(monthlyRevenue[0]?.total || '0'),
      todayActivations: todayActivations[0]?.count || 0,
      demoConversions: 8, // TODO: Calculate properly
      expiringRenewals: 47, // TODO: Calculate properly
      dailyRevenue: 1250 // TODO: Calculate properly
    };
  }

  // Software Registration methods
  async getSoftwareRegistrations(filters?: any): Promise<SoftwareRegistration[]> {
    let sql = `
      SELECT sr.*,
             c.name as client_name,
             p.name as product_name,
             p.version as product_version,
             comp.name as company_name
      FROM software_registrations sr
      LEFT JOIN clients c ON sr.cliente_assegnato = c.id
      LEFT JOIN products p ON sr.prodotto_assegnato = p.id
      LEFT JOIN companies comp ON c.company_id = comp.id
    `;
    const params: any[] = [];
    const whereClauses = [];

    if (filters?.status) {
      whereClauses.push('sr.status = ?');
      params.push(filters.status);
    }

    if (filters?.nomeSoftware) {
      whereClauses.push(`(
        sr.nome_software LIKE ? OR
        sr.ragione_sociale LIKE ? OR
        sr.versione LIKE ? OR
        sr.partita_iva LIKE ? OR
        sr.note LIKE ? OR
        sr.computer_key LIKE ? OR
        sr.sistema_operativo LIKE ? OR
        sr.indirizzo_ip LIKE ? OR
        c.name LIKE ? OR
        c.email LIKE ? OR
        p.name LIKE ? OR
        p.version LIKE ? OR
        comp.name LIKE ?
      )`);
      const searchTerm = `%${filters.nomeSoftware}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }

    if (whereClauses.length > 0) {
      sql += ' WHERE ' + whereClauses.join(' AND ');
    }

    sql += ' ORDER BY sr.prima_registrazione DESC';

    const rows = await this.db.query(sql, params);
    return rows.map((row: any) => ({
      ...row,
      totaleVenduto: parseFloat(row.totale_venduto || '0'),
      primaRegistrazione: row.prima_registrazione,
      ultimaAttivita: row.ultima_attivita,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      clientName: row.client_name,
      productName: row.product_name,
      productVersion: row.product_version,
      companyName: row.company_name,
      // Ensure these fields are properly mapped
      nomeSoftware: row.nome_software,
      versione: row.versione,
      ragioneSociale: row.ragione_sociale,
      partitaIva: row.partita_iva,
      totaleOrdini: row.totale_ordini,
      sistemaOperativo: row.sistema_operativo,
      indirizzoIp: row.indirizzo_ip,
      computerKey: row.computer_key,
      status: row.status,
      clienteAssegnato: row.cliente_assegnato,
      licenzaAssegnata: row.licenza_assegnata,
      prodottoAssegnato: row.prodotto_assegnato,
      note: row.note
    }));
  }

  async getSoftwareRegistration(id: string): Promise<SoftwareRegistration | undefined> {
    const rows = await this.db.query(
      'SELECT * FROM software_registrations WHERE id = ?',
      [id]
    );

    if (rows.length === 0) return undefined;

    const row = rows[0];
    return {
      ...row,
      totaleVenduto: parseFloat(row.totale_venduto || '0'),
      primaRegistrazione: row.prima_registrazione,
      ultimaAttivita: row.ultima_attivita,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  async getSoftwareRegistrationByComputerKey(computerKey: string): Promise<SoftwareRegistration | undefined> {
    const rows = await this.db.query(
      'SELECT * FROM software_registrations WHERE computer_key = ?',
      [computerKey]
    );

    if (rows.length === 0) return undefined;

    const row = rows[0];
    return {
      ...row,
      totaleVenduto: parseFloat(row.totale_venduto || '0'),
      primaRegistrazione: row.prima_registrazione,
      ultimaAttivita: row.ultima_attivita,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  async createSoftwareRegistration(registration: InsertSoftwareRegistration): Promise<SoftwareRegistration> {
    const id = randomUUID();
    const now = new Date();

    await this.db.query(`
      INSERT INTO software_registrations (
        id, nome_software, versione, ragione_sociale, partita_iva,
        totale_ordini, totale_venduto, sistema_operativo, indirizzo_ip,
        computer_key, installation_path, status, note,
        prima_registrazione, ultima_attivita, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      registration.nomeSoftware,
      registration.versione,
      registration.ragioneSociale,
      registration.partitaIva,
      registration.totaleOrdini || 0,
      registration.totaleVenduto || '0.00',
      registration.sistemaOperativo,
      registration.indirizzoIp,
      registration.computerKey,
      registration.installationPath,
      registration.status || 'non_assegnato',
      registration.note,
      now,
      now,
      now,
      now
    ]);

    return this.getSoftwareRegistration(id) as Promise<SoftwareRegistration>;
  }

  async updateSoftwareRegistration(id: string, updates: Partial<SoftwareRegistration>): Promise<SoftwareRegistration> {
    const setClauses = [];
    const params = [];

    // Map specific fields manually to handle naming differences
    const fieldMapping: { [key: string]: string } = {
      'clienteAssegnato': 'cliente_assegnato',
      'licenzaAssegnata': 'licenza_assegnata',
      'prodottoAssegnato': 'prodotto_assegnato',
      'note': 'note',
      'status': 'status',
      'nomeSoftware': 'nome_software',
      'versione': 'versione',
      'ragioneSociale': 'ragione_sociale',
      'partitaIva': 'partita_iva',
      'totaleOrdini': 'totale_ordini',
      'totaleVenduto': 'totale_venduto',
      'sistemaOperativo': 'sistema_operativo',
      'indirizzoIp': 'indirizzo_ip',
      'computerKey': 'computer_key',
      'installationPath': 'installation_path'
    };

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined && fieldMapping[key]) {
        setClauses.push(`${fieldMapping[key]} = ?`);
        params.push(value);
      }
    });

    if (setClauses.length > 0) {
      setClauses.push('updated_at = ?');
      params.push(new Date());
      params.push(id);

      await this.db.query(
        `UPDATE software_registrations SET ${setClauses.join(', ')} WHERE id = ?`,
        params
      );
    }

    return this.getSoftwareRegistration(id) as Promise<SoftwareRegistration>;
  }

  // Additional methods for licenses count and company hierarchy
  async getProduct(id: string): Promise<any> {
    const rows = await this.db.query('SELECT * FROM products WHERE id = ?', [id]);
    return rows.length > 0 ? rows[0] : null;
  }

  async getActiveLicensesCount(): Promise<number> {
    const rows = await this.db.query('SELECT COUNT(*) as count FROM licenses WHERE status = "attiva"');
    return rows[0]?.count || 0;
  }

  async getActiveLicensesCountByCompanyHierarchy(companyId: string): Promise<number> {
    const companyIds = await this.getCompanyHierarchy(companyId);
    const placeholders = companyIds.map(() => '?').join(',');

    const rows = await this.db.query(
      `SELECT COUNT(*) as count FROM licenses l
       JOIN clients c ON l.client_id = c.id
       WHERE l.status = "attiva" AND c.company_id IN (${placeholders})`,
      companyIds
    );
    return rows[0]?.count || 0;
  }

  async getActiveLicensesCountByCompany(companyId: string): Promise<number> {
    const rows = await this.db.query(
      `SELECT COUNT(*) as count FROM licenses l
       JOIN clients c ON l.client_id = c.id
       WHERE l.status = "attiva" AND c.company_id = ?`,
      [companyId]
    );
    return rows[0]?.count || 0;
  }

  async getCompanyHierarchy(companyId: string): Promise<string[]> {
    console.log('getCompanyHierarchy: Starting with company', companyId);

    const hierarchy = [companyId];

    // Get all companies to build the tree
    const allCompanies = await this.db.query('SELECT id, name, parent_id FROM companies WHERE status = "active"');
    console.log('getCompanyHierarchy: All companies:', allCompanies);

    // Helper function to find all children of a company
    const findChildren = (parentId: string): string[] => {
      const children = allCompanies.filter((company: any) => company.parent_id === parentId);
      console.log(`getCompanyHierarchy: Found ${children.length} subcompanies for parent ${parentId}:`, children);
      let allChildren: string[] = [];

      for (const child of children) {
        allChildren.push(child.id);
        // Recursively find children of children
        allChildren = allChildren.concat(findChildren(child.id));
      }

      return allChildren;
    };

    const subCompanies = findChildren(companyId);
    hierarchy.push(...subCompanies);

    console.log(`getCompanyHierarchy: Final hierarchy for ${companyId}:`, hierarchy);
    return hierarchy;
  }

  async getLicensesByCompanyHierarchy(companyId: string): Promise<LicenseWithDetails[]> {
    console.log('getLicensesByCompanyHierarchy: Starting with company', companyId);
    const companyIds = await this.getCompanyHierarchy(companyId);
    console.log('getLicensesByCompanyHierarchy: Company hierarchy IDs:', companyIds);

    if (companyIds.length === 0) {
      console.log('getLicensesByCompanyHierarchy: No companies in hierarchy, returning empty array');
      return [];
    }

    const placeholders = companyIds.map(() => '?').join(',');
    console.log('getLicensesByCompanyHierarchy: Executing query with placeholders:', placeholders);
    console.log('getLicensesByCompanyHierarchy: Query parameters:', companyIds);

    const rows = await this.db.query(`
      SELECT
        l.*,
        c.name as client_name, c.email as client_email, c.status as client_status, c.company_id,
        p.name as product_name, p.version as product_version,
        comp.name as company_name
      FROM licenses l
      INNER JOIN clients c ON l.client_id = c.id
      LEFT JOIN products p ON l.product_id = p.id
      LEFT JOIN companies comp ON l.assigned_company = comp.id
      WHERE c.company_id IN (${placeholders})
      ORDER BY l.created_at DESC
    `, companyIds);

    console.log(`getLicensesByCompanyHierarchy: Query returned ${rows.length} raw rows`);

    // Debug information about company filtering
    const allClients = await this.db.query('SELECT name, email, company_id FROM clients WHERE company_id IN (' + placeholders + ')', companyIds);
    console.log('getLicensesByCompanyHierarchy: DEBUG - Clients in hierarchy companies:', allClients);

    const allLicensesWithClients = await this.db.query(`
      SELECT l.id, l.activation_key, c.name as client_name, c.company_id as client_company_id
      FROM licenses l
      LEFT JOIN clients c ON l.client_id = c.id
    `);
    console.log('getLicensesByCompanyHierarchy: DEBUG - All licenses with client companies:', allLicensesWithClients);

    const matchingLicenses = allLicensesWithClients.filter((license: any) => companyIds.includes(license.client_company_id));
    console.log('getLicensesByCompanyHierarchy: DEBUG - Licenses that should match our hierarchy:', matchingLicenses);

    const result = rows.map((row: any) => ({
      id: row.id,
      activationKey: row.activation_key,
      licenseType: row.license_type,
      status: row.status,
      maxUsers: row.max_users,
      maxDevices: row.max_devices,
      expiryDate: row.expiryDate,
      activationDate: row.activationDate,
      computerKey: row.computerKey,
      deviceInfo: row.device_info ? JSON.parse(row.device_info) : null,
      price: parseFloat(row.price || '0'),
      discount: parseFloat(row.discount || '0'),
      activeModules: JSON.parse(row.active_modules || '[]'),
      assignedCompany: row.assignedCompany,
      assignedAgent: row.assignedAgent,
      createdAt: row.createdAt,
      client: {
        id: row.client_id,
        name: row.client_name,
        email: row.client_email,
        status: row.client_status,
        companyId: row.company_id,
        contactInfo: {},
        isMultiSite: false,
        isMultiUser: false,
        createdAt: new Date()
      },
      product: {
        id: row.product_id,
        name: row.product_name,
        version: row.product_version,
        description: '',
        supportedLicenseTypes: [],
        createdAt: new Date()
      },
      company: row.company_name ? {
        id: row.assigned_company,
        name: row.company_name,
        type: '',
        parentId: null,
        status: 'active',
        contactInfo: null,
        createdAt: new Date()
      } : undefined
    }));

    console.log(`getLicensesByCompanyHierarchy: Final result - returning ${result.length} licenses for company hierarchy ${companyId}`);
    return result;
  }

  async getClientsByCompanyHierarchy(companyId: string): Promise<Client[]> {
    const companyIds = await this.getCompanyHierarchy(companyId);
    const placeholders = companyIds.map(() => '?').join(',');

    const rows = await this.db.query(
      `SELECT * FROM clients WHERE company_id IN (${placeholders}) ORDER BY name`,
      companyIds
    );

    return rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      status: row.status,
      companyId: row.company_id,
      contactInfo: row.contact_info ? JSON.parse(row.contact_info) : {},
      isMultiSite: Boolean(row.is_multi_site),
      isMultiUser: Boolean(row.is_multi_user),
      createdAt: row.created_at
    }));
  }

  async getAllProducts(): Promise<Product[]> {
    return this.getProducts();
  }

  // User management methods
  async getUsers(companyId?: string, includingInactive?: boolean): Promise<UserWithCompany[]> {
    console.log(`getUsers: companyId=${companyId}, includingInactive=${includingInactive}`);

    let sql = `
      SELECT u.*, c.name as company_name, c.type as company_type, c.parent_id as company_parent_id
      FROM users u
      LEFT JOIN companies c ON u.company_id = c.id
    `;
    const params: any[] = [];
    const conditions: string[] = [];

    // Only filter out inactive users if not explicitly including them
    if (!includingInactive) {
      // In MySQL, boolean TRUE is stored as 1
      conditions.push('u.is_active = 1');
      console.log('getUsers: Adding is_active = 1 condition');
    }

    if (companyId) {
      // If companyId is provided, filter by company hierarchy
      const companyIds = await this.getCompanyHierarchy(companyId);
      console.log(`getUsers: Filtering users for company hierarchy: ${companyIds.join(', ')}`);

      if (companyIds.length > 0) {
        const placeholders = companyIds.map(() => '?').join(',');
        // Admin users should only see users from their company hierarchy, not null company users
        conditions.push(`u.company_id IN (${placeholders})`);
        params.push(...companyIds);
      } else {
        // If no companies in hierarchy, return empty result
        conditions.push('1 = 0');
      }
    }

    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }

    sql += ' ORDER BY u.created_at DESC';

    const rows = await this.db.query(sql, params);

    return rows.map((user: any) => ({
      id: user.id,
      username: user.username,
      password: user.password,
      role: user.role,
      companyId: user.company_id,
      name: user.name,
      email: user.email,
      isActive: user.is_active,
      createdAt: user.created_at,
      company: user.company_id ? {
        id: user.company_id,
        name: user.company_name,
        type: user.company_type,
        parentId: user.company_parent_id,
        status: 'active',
        contactInfo: null,
        createdAt: new Date()
      } : undefined
    }));
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const setClauses = [];
    const params = [];

    if (updates.username !== undefined) {
      setClauses.push('username = ?');
      params.push(updates.username);
    }
    if (updates.name !== undefined) {
      setClauses.push('name = ?');
      params.push(updates.name);
    }
    if (updates.email !== undefined) {
      setClauses.push('email = ?');
      params.push(updates.email);
    }
    if (updates.companyId !== undefined) {
      setClauses.push('company_id = ?');
      params.push(updates.companyId);
    }
    if (updates.isActive !== undefined) {
      setClauses.push('is_active = ?');
      params.push(updates.isActive);
    }
    if (updates.password !== undefined) {
      const hashedPassword = await bcrypt.hash(updates.password, 10);
      setClauses.push('password = ?');
      params.push(hashedPassword);
    }

    if (setClauses.length === 0) {
      throw new Error('No fields to update');
    }

    params.push(id);

    await this.db.query(
      `UPDATE users SET ${setClauses.join(', ')} WHERE id = ?`,
      params
    );

    const updatedUser = await this.getUser(id);
    if (!updatedUser) {
      throw new Error('User not found after update');
    }

    return updatedUser;
  }

  async deleteUser(id: string): Promise<void> {
    await this.db.query('DELETE FROM users WHERE id = ?', [id]);
  }

  // Device Registration methods - New tables implementation
  async getTestaRegAzienda(): Promise<TestaRegAzienda[]> {
    const rows = await this.db.query('SELECT * FROM Testa_Reg_Azienda ORDER BY created_at DESC');

    return rows.map((row: any) => ({
      partitaIva: row.PartitaIva,
      nomeAzienda: row.NomeAzienda,
      prodotto: row.Prodotto,
      versione: row.Versione,
      modulo: row.Modulo,
      utenti: row.Utenti,
      totDispositivi: row.TotDispositivi,
      idLicenza: row.ID_Licenza,
      totOrdini: row.TotOrdini,
      totVendite: row.TotVendite?.toString() || '0.00',
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }

  async getTestaRegAziendaByPartitaIva(partitaIva: string): Promise<TestaRegAzienda | undefined> {
    const rows = await this.db.query('SELECT * FROM Testa_Reg_Azienda WHERE PartitaIva = ?', [partitaIva]);

    if (rows.length === 0) return undefined;

    const row = rows[0];
    return {
      partitaIva: row.PartitaIva,
      nomeAzienda: row.NomeAzienda,
      prodotto: row.Prodotto,
      versione: row.Versione,
      modulo: row.Modulo,
      utenti: row.Utenti,
      totDispositivi: row.TotDispositivi,
      idLicenza: row.ID_Licenza,
      totOrdini: row.TotOrdini,
      totVendite: row.TotVendite?.toString() || '0.00',
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  async createTestaRegAzienda(registration: InsertTestaRegAzienda): Promise<TestaRegAzienda> {
    const now = new Date();

    await this.db.query(`
      INSERT INTO Testa_Reg_Azienda (
        PartitaIva, NomeAzienda, Prodotto, Versione, Modulo,
        Utenti, TotDispositivi, ID_Licenza, TotOrdini, TotVendite,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      registration.partitaIva,
      registration.nomeAzienda,
      registration.prodotto,
      registration.versione,
      registration.modulo,
      registration.utenti || 0,
      registration.totDispositivi || 0,
      registration.idLicenza,
      registration.totOrdini || 0,
      registration.totVendite || '0.00',
      now,
      now
    ]);

    return this.getTestaRegAziendaByPartitaIva(registration.partitaIva) as Promise<TestaRegAzienda>;
  }

  async getAllTestaRegAzienda(): Promise<TestaRegAzienda[]> {
    const rows = await this.db.query('SELECT * FROM Testa_Reg_Azienda ORDER BY created_at DESC');

    return rows.map((row: any) => ({
      partitaIva: row.PartitaIva,
      nomeAzienda: row.NomeAzienda,
      prodotto: row.Prodotto,
      versione: row.Versione,
      modulo: row.Modulo,
      utenti: row.Utenti,
      totDispositivi: row.TotDispositivi,
      idLicenza: row.ID_Licenza,
      totOrdini: row.TotOrdini,
      totVendite: row.TotVendite?.toString() || '0.00',
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }

  async updateTestaRegAzienda(partitaIva: string, updates: Partial<TestaRegAzienda>): Promise<TestaRegAzienda> {
    const setClauses = [];
    const params = [];

    const fieldMapping: { [key: string]: string } = {
      'nomeAzienda': 'NomeAzienda',
      'prodotto': 'Prodotto',
      'versione': 'Versione',
      'modulo': 'Modulo',
      'utenti': 'Utenti',
      'totDispositivi': 'TotDispositivi',
      'idLicenza': 'ID_Licenza',
      'totOrdini': 'TotOrdini',
      'totVendite': 'TotVendite'
    };

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined && fieldMapping[key]) {
        setClauses.push(`${fieldMapping[key]} = ?`);
        params.push(value);
      }
    });

    if (setClauses.length > 0) {
      setClauses.push('updated_at = ?');
      params.push(new Date());
      params.push(partitaIva);

      await this.db.query(
        `UPDATE Testa_Reg_Azienda SET ${setClauses.join(', ')} WHERE PartitaIva = ?`,
        params
      );
    }

    return this.getTestaRegAziendaByPartitaIva(partitaIva) as Promise<TestaRegAzienda>;
  }

  async getDettRegAziendaByPartitaIva(partitaIva: string): Promise<DettRegAzienda[]> {
    const rows = await this.db.query('SELECT * FROM Dett_Reg_Azienda WHERE PartitaIva = ? ORDER BY created_at DESC', [partitaIva]);

    return rows.map((row: any) => ({
      id: row.ID,
      partitaIva: row.PartitaIva,
      uidDispositivo: row.UID_Dispositivo,
      sistemaOperativo: row.SistemaOperativo,
      note: row.Note,
      dataAttivazione: row.DataAttivazione,
      dataUltimoAccesso: row.DataUltimoAccesso,
      ordini: row.Ordini,
      vendite: row.Vendite?.toString() || '0.00',
      computerKey: row.Computer_Key,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }

  async getDettRegAzienda(partitaIva?: string): Promise<DettRegAzienda[]> {
    let query = 'SELECT * FROM Dett_Reg_Azienda';
    const params: any[] = [];

    if (partitaIva) {
      query += ' WHERE PartitaIva = ?';
      params.push(partitaIva);
    }

    query += ' ORDER BY created_at DESC';

    const rows = await this.db.query(query, params);

    return rows.map((row: any) => ({
      id: row.ID,
      partitaIva: row.PartitaIva,
      uidDispositivo: row.UID_Dispositivo,
      sistemaOperativo: row.SistemaOperativo,
      note: row.Note,
      dataAttivazione: row.DataAttivazione,
      dataUltimoAccesso: row.DataUltimoAccesso,
      ordini: row.Ordini,
      vendite: row.Vendite?.toString() || '0.00',
      computerKey: row.Computer_Key,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }

  async getDettRegAziendaById(id: number): Promise<DettRegAzienda | undefined> {
    const rows = await this.db.query('SELECT * FROM Dett_Reg_Azienda WHERE ID = ?', [id]);

    if (rows.length === 0) return undefined;

    const row = rows[0];
    return {
      id: row.ID,
      partitaIva: row.PartitaIva,
      uidDispositivo: row.UID_Dispositivo,
      sistemaOperativo: row.SistemaOperativo,
      note: row.Note,
      dataAttivazione: row.DataAttivazione,
      dataUltimoAccesso: row.DataUltimoAccesso,
      ordini: row.Ordini,
      vendite: row.Vendite?.toString() || '0.00',
      computerKey: row.Computer_Key,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  async createDettRegAzienda(registration: InsertDettRegAzienda): Promise<DettRegAzienda> {
    const now = new Date();

    // Convert dataUltimoAccesso to MySQL DATETIME format if it's an ISO string
    let dataUltimoAccesso = registration.dataUltimoAccesso;
    if (typeof dataUltimoAccesso === 'string' && dataUltimoAccesso.includes('T')) {
      // Convert ISO string to MySQL DATETIME format
      dataUltimoAccesso = dataUltimoAccesso.replace('T', ' ').replace('Z', '').split('.')[0];
    }

    const result = await this.db.query(`
      INSERT INTO Dett_Reg_Azienda (
        PartitaIva, UID_Dispositivo, SistemaOperativo, Note,
        DataAttivazione, DataUltimoAccesso, Ordini, Vendite, Computer_Key,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      registration.partitaIva,
      registration.uidDispositivo,
      registration.sistemaOperativo,
      registration.note,
      registration.dataAttivazione,
      dataUltimoAccesso,
      registration.ordini || 0,
      registration.vendite || '0.00',
      registration.computerKey,
      now,
      now
    ]);

    // Get the auto-incremented ID
    const insertId = result.insertId;
    return this.getDettRegAziendaById(insertId) as Promise<DettRegAzienda>;
  }

  async updateDettRegAzienda(id: number, updates: Partial<DettRegAzienda>): Promise<DettRegAzienda> {
    const setClauses = [];
    const params = [];

    const fieldMapping: { [key: string]: string } = {
      'uidDispositivo': 'UID_Dispositivo',
      'sistemaOperativo': 'SistemaOperativo',
      'note': 'Note',
      'dataAttivazione': 'DataAttivazione',
      'dataUltimoAccesso': 'DataUltimoAccesso',
      'ordini': 'Ordini',
      'vendite': 'Vendite',
      'computerKey': 'Computer_Key'
    };

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined && fieldMapping[key]) {
        setClauses.push(`${fieldMapping[key]} = ?`);
        params.push(value);
      }
    });

    if (setClauses.length > 0) {
      setClauses.push('updated_at = ?');
      params.push(new Date());
      params.push(id);

      await this.db.query(
        `UPDATE Dett_Reg_Azienda SET ${setClauses.join(', ')} WHERE ID = ?`,
        params
      );
    }

    return this.getDettRegAziendaById(id) as Promise<DettRegAzienda>;
  }

  async getDettRegAziendaByComputerKey(computerKey: string): Promise<DettRegAzienda | undefined> {
    const rows = await this.db.query('SELECT * FROM Dett_Reg_Azienda WHERE Computer_Key = ?', [computerKey]);

    if (rows.length === 0) return undefined;

    const row = rows[0];
    return {
      id: row.ID,
      partitaIva: row.PartitaIva,
      uidDispositivo: row.UID_Dispositivo,
      sistemaOperativo: row.SistemaOperativo,
      note: row.Note,
      dataAttivazione: row.DataAttivazione,
      dataUltimoAccesso: row.DataUltimoAccesso,
      ordini: row.Ordini,
      vendite: row.Vendite?.toString() || '0.00',
      computerKey: row.Computer_Key,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  async deleteTestaRegAzienda(partitaIva: string): Promise<void> {
    await this.db.query('DELETE FROM Testa_Reg_Azienda WHERE PartitaIva = ?', [partitaIva]);
  }

  async deleteDettRegAzienda(id: number): Promise<void> {
    await this.db.query('DELETE FROM Dett_Reg_Azienda WHERE ID = ?', [id]);
  }

  // 💳 WALLET METHODS - Sistema crediti aziendale

  async getCompanyWallet(companyId: string): Promise<CompanyWallet | null> {
    const rows = await this.db.query(
      'SELECT * FROM company_wallets WHERE company_id = ?',
      [companyId]
    );

    if (rows.length === 0) return null;

    const row = rows[0];
    return {
      id: row.id,
      companyId: row.company_id,
      balance: parseFloat(row.balance || '0'),
      totalRecharges: parseFloat(row.total_recharges || '0'),
      totalSpent: parseFloat(row.total_spent || '0'),
      lastRechargeDate: row.last_recharge_date,
      stripeCustomerId: row.stripe_customer_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  async createCompanyWallet(companyId: string): Promise<CompanyWallet> {
    const walletId = randomUUID();
    const now = new Date();

    await this.db.query(`
      INSERT INTO company_wallets (
        id, company_id, balance, total_recharges, total_spent,
        created_at, updated_at
      ) VALUES (?, ?, 0.00, 0.00, 0.00, ?, ?)
    `, [walletId, companyId, now, now]);

    return this.getCompanyWallet(companyId) as Promise<CompanyWallet>;
  }

  async createWalletTransaction(data: {
    companyId: string;
    type: string;
    amount: number;
    balanceBefore: number;
    balanceAfter: number;
    description: string;
    relatedEntityType?: string | null;
    relatedEntityId?: string | null;
    fromCompanyId?: string | null;
    toCompanyId?: string | null;
    stripePaymentIntentId?: string | null;
    createdBy?: string | null;
  }): Promise<void> {
    const transactionId = randomUUID();

    await this.db.query(`
      INSERT INTO wallet_transactions (
        id, company_id, type, amount, balance_before, balance_after,
        description, related_entity_type, related_entity_id,
        from_company_id, to_company_id, stripe_payment_intent_id,
        created_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      transactionId,
      data.companyId,
      data.type,
      data.amount,
      data.balanceBefore,
      data.balanceAfter,
      data.description,
      data.relatedEntityType || null,
      data.relatedEntityId || null,
      data.fromCompanyId || null,
      data.toCompanyId || null,
      data.stripePaymentIntentId || null,
      data.createdBy || null,
      new Date()
    ]);

    console.log(`💾 Wallet transaction saved: ${data.type} ${data.amount} crediti for company ${data.companyId}`);
  }

  async updateWalletBalance(
    companyId: string,
    amount: number,
    description: string,
    type: string,
    createdBy?: string
  ): Promise<CompanyWallet> {
    // Ottieni o crea il wallet
    let wallet = await this.getCompanyWallet(companyId);
    if (!wallet) {
      wallet = await this.createCompanyWallet(companyId);
    }

    try {
      const balanceBefore = wallet.balance;
      const balanceAfter = balanceBefore + amount;

      // Aggiorna il saldo del wallet
      await this.db.query(`
        UPDATE company_wallets
        SET balance = ?,
            ${type === 'ricarica' || type === 'rimborso' ? 'total_recharges = total_recharges + ?, last_recharge_date = ?' : 'total_spent = total_spent + ABS(?)'},
            updated_at = ?
        WHERE company_id = ?
      `, (type === 'ricarica' || type === 'rimborso')
        ? [balanceAfter, Math.abs(amount), new Date(), new Date(), companyId]
        : [balanceAfter, Math.abs(amount), new Date(), companyId]
      );

      // Registra la transazione wallet
      const transactionData = {
        companyId,
        type,
        amount: Math.abs(amount), // Always show positive amount in wallet history
        balanceBefore,
        balanceAfter,
        description,
        createdBy: createdBy || null,
        relatedEntityType: type === 'rimborso' ? 'license_refund' : null,
        relatedEntityId: null,
        fromCompanyId: null,
        toCompanyId: null,
        stripePaymentIntentId: null
      };

      await this.createWalletTransaction(transactionData);

      console.log(`💳 Wallet updated: Company ${companyId}, ${type} ${amount} crediti, saldo: ${balanceBefore} → ${balanceAfter}`);

      return await this.getCompanyWallet(companyId) as CompanyWallet;
    } catch (error) {
      console.error('Error updating wallet balance:', error);
      throw error;
    }
  }

  async updateWalletStripeCustomer(companyId: string, stripeCustomerId: string): Promise<void> {
    await this.db.query(`
      UPDATE company_wallets
      SET stripe_customer_id = ?, updated_at = ?
      WHERE company_id = ?
    `, [stripeCustomerId, new Date(), companyId]);
  }

  async transferCredits(
    fromCompanyId: string,
    toCompanyId: string,
    amount: number,
    createdBy: string
  ): Promise<boolean> {
    // Verifica gerarchia aziendale
    const fromCompany = await this.getCompany(fromCompanyId);
    const toCompany = await this.getCompany(toCompanyId);

    if (!fromCompany || !toCompany) {
      throw new Error('Azienda non trovata');
    }

    // Verifica che toCompany sia una sotto-azienda di fromCompany
    const hierarchy = await this.getCompanyHierarchy(fromCompanyId);
    if (!hierarchy.includes(toCompanyId)) {
      throw new Error('Il trasferimento è consentito solo verso sotto-aziende');
    }

    // Verifica saldo disponibile
    const fromWallet = await this.getCompanyWallet(fromCompanyId);
    if (!fromWallet || fromWallet.balance < amount) {
      throw new Error('Saldo insufficiente per il trasferimento');
    }

    try {
      // Sottrai crediti dall'azienda madre
      await this.updateWalletBalance(
        fromCompanyId,
        -amount,
        `Trasferimento a ${toCompany.name}`,
        'trasferimento_out',
        createdBy
      );

      // Aggiungi crediti alla sotto-azienda
      await this.updateWalletBalance(
        toCompanyId,
        amount,
        `Trasferimento da ${fromCompany.name}`,
        'trasferimento_in',
        createdBy
      );

      console.log(`🔄 Trasferimento completato: ${fromCompany.name} → ${toCompany.name}, ${amount} crediti`);
      return true;
    } catch (error) {
      console.error('Error transferring credits:', error);
      throw error;
    }
  }

  async getWalletTransactions(companyId: string, limit: number = 50): Promise<WalletTransaction[]> {
    console.log(`🔍 getWalletTransactions: Searching for company_id = ${companyId}, limit = ${limit}`);

    // First, let's check if the table exists and has any data
    const totalRowsQuery = await this.db.query('SELECT COUNT(*) as total FROM wallet_transactions');
    console.log(`🔍 Total wallet_transactions in database: ${totalRowsQuery[0]?.total || 0}`);

    // Check if there are any transactions for this specific company
    const companyRowsQuery = await this.db.query('SELECT COUNT(*) as total FROM wallet_transactions WHERE company_id = ?', [companyId]);
    console.log(`🔍 Transactions for company ${companyId}: ${companyRowsQuery[0]?.total || 0}`);

    const rows = await this.db.query(`
      SELECT
        id,
        company_id as companyId,
        type,
        amount,
        balance_before as balanceBefore,
        balance_after as balanceAfter,
        description,
        related_entity_type as relatedEntityType,
        related_entity_id as relatedEntityId,
        from_company_id as fromCompanyId,
        to_company_id as toCompanyId,
        stripe_payment_intent_id as stripePaymentIntentId,
        created_by as createdBy,
        created_at as createdAt
      FROM wallet_transactions
      WHERE company_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `, [companyId, limit]);

    console.log(`🔍 Query returned ${rows.length} transactions for company ${companyId}`);
    if (rows.length > 0) {
      console.log(`🔍 First transaction:`, rows[0]);
    }

    return rows.map((row: any) => ({
      id: row.id,
      companyId: row.companyId,
      type: row.type,
      amount: parseFloat(row.amount || '0'),
      balanceBefore: parseFloat(row.balanceBefore || '0'),
      balanceAfter: parseFloat(row.balanceAfter || '0'),
      description: row.description,
      relatedEntityType: row.relatedEntityType,
      relatedEntityId: row.relatedEntityId,
      fromCompanyId: row.fromCompanyId,
      toCompanyId: row.toCompanyId,
      stripePaymentIntentId: row.stripePaymentIntentId,
      createdBy: row.createdBy,
      createdAt: row.createdAt
    }));
  }

  async createWalletTransaction(transaction: InsertWalletTransaction): Promise<WalletTransaction> {
    const id = randomUUID();
    const now = new Date();

    await this.db.query(`
      INSERT INTO wallet_transactions (
        id, company_id, type, amount, balance_before, balance_after,
        description, related_entity_type, related_entity_id,
        from_company_id, to_company_id, stripe_payment_intent_id,
        created_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      transaction.companyId,
      transaction.type,
      transaction.amount,
      transaction.balanceBefore || 0,
      transaction.balanceAfter || 0,
      transaction.description,
      transaction.relatedEntityType || null,
      transaction.relatedEntityId || null,
      transaction.fromCompanyId || null,
      transaction.toCompanyId || null,
      transaction.stripePaymentIntentId || null,
      transaction.createdBy || null,
      now
    ]);

    return {
      id,
      companyId: transaction.companyId,
      type: transaction.type,
      amount: transaction.amount,
      balanceBefore: transaction.balanceBefore,
      balanceAfter: transaction.balanceAfter,
      description: transaction.description,
      relatedEntityType: transaction.relatedEntityType,
      relatedEntityId: transaction.relatedEntityId,
      fromCompanyId: transaction.fromCompanyId,
      toCompanyId: transaction.toCompanyId,
      stripePaymentIntentId: transaction.stripePaymentIntentId,
      createdBy: transaction.createdBy,
      createdAt: now
    };
  }

  async chargeWalletForLicense(
    companyId: string,
    licenseId: string,
    amount: number,
    createdBy: string
  ): Promise<boolean> {
    const wallet = await this.getCompanyWallet(companyId);
    if (!wallet || wallet.balance < amount) {
      console.log(`❌ Wallet charge failed: Company ${companyId}, insufficient balance (${wallet?.balance || 0} < ${amount})`);
      return false;
    }

    try {
      // Scala i crediti dal wallet
      await this.updateWalletBalance(
        companyId,
        -amount,
        `Rinnovo licenza ${licenseId}`,
        'spesa',
        createdBy
      );

      // Aggiorna la transazione licenza con crediti utilizzati
      await this.db.query(`
        UPDATE transactions
        SET credits_used = ?, payment_method = 'crediti', status = 'pagato_crediti', payment_date = ?
        WHERE license_id = ? AND status = 'in_attesa'
      `, [amount, new Date(), licenseId]);

      console.log(`💳 Wallet charged: Company ${companyId}, License ${licenseId}, ${amount} crediti`);
      return true;
    } catch (error) {
      console.error('Error charging wallet for license:', error);
      return false;
    }
  }

  // Configuration methods implementation
  async saveStripeConfiguration(publicKey: string, secretKey: string, userId: string): Promise<void> {
    try {
      // First check if configuration already exists
      const existing = await this.db.query(
        'SELECT id FROM system_config WHERE config_key = ? OR config_key = ?',
        ['stripe_public_key', 'stripe_secret_key']
      );

      if (existing.length > 0) {
        // Update existing configuration
        await this.db.query(
          'UPDATE system_config SET config_value = ?, updated_at = NOW(), updated_by = ? WHERE config_key = ?',
          [publicKey, userId, 'stripe_public_key']
        );
        await this.db.query(
          'UPDATE system_config SET config_value = ?, updated_at = NOW(), updated_by = ? WHERE config_key = ?',
          [secretKey, userId, 'stripe_secret_key']
        );
      } else {
        // Insert new configuration
        await this.db.query(
          'INSERT INTO system_config (id, config_key, config_value, created_at, updated_at, created_by, updated_by) VALUES (?, ?, ?, NOW(), NOW(), ?, ?)',
          [randomUUID(), 'stripe_public_key', publicKey, userId, userId]
        );
        await this.db.query(
          'INSERT INTO system_config (id, config_key, config_value, created_at, updated_at, created_by, updated_by) VALUES (?, ?, ?, NOW(), NOW(), ?, ?)',
          [randomUUID(), 'stripe_secret_key', secretKey, userId, userId]
        );
      }

      console.log('✅ Stripe configuration saved to database successfully');
    } catch (error) {
      console.error('❌ Database error saving Stripe config:', error);
      throw new Error('Failed to save Stripe configuration to database');
    }
  }

  async getStripeConfiguration(): Promise<{ publicKey: string; secretKey: string } | null> {
    try {
      const rows = await this.db.query(
        'SELECT config_key, config_value FROM system_config WHERE config_key IN (?, ?)',
        ['stripe_public_key', 'stripe_secret_key']
      );

      if (rows.length < 2) {
        return null;
      }

      const config: { publicKey: string; secretKey: string } = { publicKey: '', secretKey: '' };

      for (const row of rows) {
        if (row.config_key === 'stripe_public_key') {
          config.publicKey = row.config_value;
        } else if (row.config_key === 'stripe_secret_key') {
          config.secretKey = row.config_value;
        }
      }

      return config.publicKey && config.secretKey ? config : null;
    } catch (error) {
      console.error('❌ Database error retrieving Stripe config:', error);
      return null;
    }
  }

  // Category methods
  async getAllCategories(): Promise<Category[]> {
    const rows = await this.db.query('SELECT * FROM categories WHERE is_active = TRUE ORDER BY name');
    return rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      color: row.color,
      isActive: row.is_active,
      companyId: row.company_id,
      createdAt: row.created_at
    }));
  }

  async getCategoriesByCompanyHierarchy(companyId: string): Promise<Category[]> {
    // Get company hierarchy (user's company + all subcompanies)
    const companyIds = await this.getCompanyHierarchy(companyId);
    const placeholders = companyIds.map(() => '?').join(',');

    // Get categories that belong to companies in hierarchy + global categories (company_id IS NULL)
    const rows = await this.db.query(`
      SELECT * FROM categories
      WHERE is_active = TRUE
      AND (company_id IS NULL OR company_id IN (${placeholders}))
      ORDER BY company_id IS NULL DESC, name ASC
    `, companyIds);

    return rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      color: row.color,
      isActive: row.is_active,
      companyId: row.company_id,
      createdAt: row.created_at
    }));
  }

  async createCategory(categoryData: any): Promise<Category> {
    const id = randomUUID();
    await this.db.query(`
      INSERT INTO categories (id, name, description, color, is_active, company_id)
      VALUES (?, ?, ?, ?, TRUE, ?)
    `, [id, categoryData.name, categoryData.description, categoryData.color, categoryData.companyId || null]);

    return this.getCategoryById(id) as Promise<Category>;
  }

  async getCategoryById(categoryId: string): Promise<Category | null> {
    const rows = await this.db.query('SELECT * FROM categories WHERE id = ? AND is_active = TRUE', [categoryId]);
    if (rows.length === 0) return null;

    const row = rows[0];
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      color: row.color,
      isActive: row.is_active,
      companyId: row.company_id,
      createdAt: row.created_at
    };
  }

  async updateCategory(categoryId: string, updateData: Partial<Category>): Promise<Category | null> {
    try {
      const setParts = [];
      const values = [];

      if (updateData.name !== undefined) {
        setParts.push('name = ?');
        values.push(updateData.name);
      }
      if (updateData.description !== undefined) {
        setParts.push('description = ?');
        values.push(updateData.description);
      }
      if (updateData.color !== undefined) {
        setParts.push('color = ?');
        values.push(updateData.color);
      }
      if (updateData.isActive !== undefined) {
        setParts.push('is_active = ?');
        values.push(updateData.isActive);
      }

      if (setParts.length === 0) {
        return await this.getCategoryById(categoryId); // Return current category if no updates
      }

      values.push(categoryId);

      await database.query(`
        UPDATE categories
        SET ${setParts.join(', ')}
        WHERE id = ?
      `, values);

      return await this.getCategoryById(categoryId);
    } catch (error) {
      console.error('Update category error:', error);
      throw error;
    }
  }

  async deleteCategory(categoryId: string): Promise<boolean> {
    try {
      // Check if category has products
      const products = await database.query('SELECT COUNT(*) as count FROM products WHERE category_id = ?', [categoryId]);

      if (products[0].count > 0) {
        throw new Error(`Cannot delete category: ${products[0].count} products are assigned to this category`);
      }

      await database.query('DELETE FROM categories WHERE id = ?', [categoryId]);
      return true;
    } catch (error) {
      console.error('Delete category error:', error);
      throw error;
    }
  }
}

export const storage = new DatabaseStorage();