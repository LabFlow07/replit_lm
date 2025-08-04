import { database } from "./database";
import type { 
  User, InsertUser, 
  Company, InsertCompany,
  Product, InsertProduct,
  Module, InsertModule,
  Client, InsertClient,
  License, InsertLicense, LicenseWithDetails,
  Transaction, InsertTransaction,
  ActivationLog, InsertActivationLog,
  AccessLog, InsertAccessLog,
  SoftwareRegistration, InsertSoftwareRegistration,
  DashboardStats, UserWithCompany
} from "@shared/schema";
import { randomUUID } from "crypto";
import bcrypt from "bcrypt";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<UserWithCompany | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Company methods
  getCompany(id: string): Promise<Company | undefined>;
  getCompanies(): Promise<Company[]>;
  getCompaniesByType(type: string): Promise<Company[]>;
  createCompany(company: InsertCompany): Promise<Company>;
  updateCompany(id: string, updates: Partial<Company>): Promise<Company>;

  // Product methods
  getProducts(): Promise<Product[]>;
  getProduct(id: string): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;

  // Module methods
  getModulesByProduct(productId: string): Promise<Module[]>;
  createModule(module: InsertModule): Promise<Module>;

  // Client methods
  getClients(companyId?: string): Promise<Client[]>;
  getClient(id: string): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClientStatus(id: string, status: string): Promise<void>;

  // License methods
  getLicenses(filters?: any): Promise<LicenseWithDetails[]>;
  getLicense(id: string): Promise<LicenseWithDetails | undefined>;
  getLicenseByActivationKey(key: string): Promise<LicenseWithDetails | undefined>;
  createLicense(license: InsertLicense): Promise<License>;
  updateLicense(id: string, updates: Partial<License>): Promise<void>;
  activateLicense(activationKey: string, computerKey: string, deviceInfo: any): Promise<License>;
  validateLicense(activationKey: string, computerKey?: string): Promise<LicenseWithDetails | null>;

  // Transaction methods
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  getTransactionsByLicense(licenseId: string): Promise<Transaction[]>;

  // Logging methods
  logActivation(log: InsertActivationLog): Promise<void>;
  logAccess(log: InsertAccessLog): Promise<void>;

  // Statistics
  getDashboardStats(userId: string, userRole: string): Promise<DashboardStats>;

  // Software Registration methods
  getSoftwareRegistrations(filters?: any): Promise<SoftwareRegistration[]>;
  getSoftwareRegistration(id: string): Promise<SoftwareRegistration | undefined>;
  getSoftwareRegistrationByComputerKey(computerKey: string): Promise<SoftwareRegistration | undefined>;
  createSoftwareRegistration(registration: InsertSoftwareRegistration): Promise<SoftwareRegistration>;
  updateSoftwareRegistration(id: string, updates: Partial<SoftwareRegistration>): Promise<SoftwareRegistration>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const rows = await database.query(
      'SELECT * FROM users WHERE id = ? AND is_active = TRUE',
      [id]
    );
    return rows[0];
  }

  async getUserByUsername(username: string): Promise<UserWithCompany | undefined> {
    const rows = await database.query(`
      SELECT u.*, c.name as company_name, c.type as company_type, c.parent_id as company_parent_id
      FROM users u
      LEFT JOIN companies c ON u.company_id = c.id
      WHERE u.username = ? AND u.is_active = TRUE
    `, [username]);

    if (rows[0]) {
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
    return undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const hashedPassword = await bcrypt.hash(insertUser.password, 10);

    await database.query(`
      INSERT INTO users (id, username, password, role, company_id, name, email, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)
    `, [id, insertUser.username, hashedPassword, insertUser.role, insertUser.companyId, insertUser.name, insertUser.email]);

    return { ...insertUser, id, password: hashedPassword, isActive: true, createdAt: new Date() };
  }

  async getCompany(id: string): Promise<Company | undefined> {
    const rows = await database.query('SELECT * FROM companies WHERE id = ?', [id]);
    return rows[0];
  }

  async getCompaniesByType(type: string): Promise<Company[]> {
    const rows = await database.query('SELECT * FROM companies WHERE type = ? AND status = "active"', [type]);
    return rows;
  }

  async getCompanies(): Promise<Company[]> {
    try {
      const rows = await database.query('SELECT * FROM companies ORDER BY name ASC');
      console.log(`getCompanies: Found ${rows.length} companies in database`);

      const mapped = rows.map((row: any) => ({
        ...row,
        parentId: row.parent_id,
        parent_id: row.parent_id, // Mantieni entrambi per compatibilità
        contactInfo: row.contact_info ? JSON.parse(row.contact_info) : {},
        createdAt: row.created_at,
         // Normalize parent_id: convert 0, empty string, or null to null
        parent_id: (!row.parent_id || row.parent_id === '0' || row.parent_id === 0) ? null : row.parent_id
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
    await database.query(`
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

    if (updates.name) {
      updateFields.push('name = ?');
      updateValues.push(updates.name);
    }
    if (updates.type) {
      updateFields.push('type = ?');
      updateValues.push(updates.type);
    }
    if (updates.parentId !== undefined) {
      updateFields.push('parent_id = ?');
      updateValues.push(updates.parentId);
    }
    if (updates.status) {
      updateFields.push('status = ?');
      updateValues.push(updates.status);
    }
    if (updates.contactInfo) {
      updateFields.push('contact_info = ?');
      updateValues.push(JSON.stringify(updates.contactInfo));
    }

    updateValues.push(id);

    await database.query(`
      UPDATE companies SET ${updateFields.join(', ')} WHERE id = ?
    `, updateValues);

    const updatedCompany = await this.getCompany(id);
    return updatedCompany!;
  }

  async getProducts(): Promise<Product[]> {
    const rows = await database.query('SELECT * FROM products ORDER BY name');
    return rows.map(row => ({
      ...row,
      supportedLicenseTypes: JSON.parse(row.supported_license_types || '[]')
    }));
  }

  async getProduct(id: string): Promise<Product | undefined> {
    const rows = await database.query('SELECT * FROM products WHERE id = ?', [id]);
    if (rows[0]) {
      return {
        ...rows[0],
        supportedLicenseTypes: JSON.parse(rows[0].supported_license_types || '[]')
      };
    }
    return undefined;
  }

  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    const id = randomUUID();
    await database.query(`
      INSERT INTO products (id, name, version, description, supported_license_types)
      VALUES (?, ?, ?, ?, ?)
    `, [id, insertProduct.name, insertProduct.version, insertProduct.description, JSON.stringify(insertProduct.supportedLicenseTypes)]);

    return { ...insertProduct, id, createdAt: new Date() };
  }

  async getModulesByProduct(productId: string): Promise<Module[]> {
    const rows = await database.query('SELECT * FROM modules WHERE product_id = ?', [productId]);
    return rows;
  }

  async createModule(insertModule: InsertModule): Promise<Module> {
    const id = randomUUID();
    await database.query(`
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

    const rows = await database.query(query, params);
    return rows.map(row => ({
      ...row,
      contactInfo: JSON.parse(row.contact_info || '{}')
    }));
  }

  async getClientsByCompany(companyId: string): Promise<Client[]> {
    const rows = await database.query(
      'SELECT * FROM clients WHERE company_id = ? ORDER BY created_at DESC',
      [companyId]
    );
    return rows.map(row => ({
      ...row,
      contactInfo: JSON.parse(row.contact_info || '{}')
    }));
  }

  async getClientsByCompanyAndSubcompanies(companyId: string): Promise<Client[]> {
    const companyIds = await this.getCompanyHierarchy(companyId);
    const placeholders = companyIds.map(() => '?').join(',');

    const query = `SELECT * FROM clients WHERE company_id IN (${placeholders}) ORDER BY name`;
    const rows = await database.query(query, companyIds);

    return rows.map(row => ({
      ...row,
      contactInfo: JSON.parse(row.contact_info || '{}')
    }));
  }

  async getCompanyHierarchy(companyId: string): Promise<string[]> {
    const allCompanies = await this.getCompanies();
    const hierarchy: string[] = [companyId];

    const findSubcompanies = (parentId: string) => {
      const subcompanies = allCompanies.filter(c => c.parent_id === parentId);
      subcompanies.forEach(sub => {
        hierarchy.push(sub.id);
        findSubcompanies(sub.id);
      });
    };

    findSubcompanies(companyId);
    return hierarchy;
  }

  async getClient(id: string): Promise<Client | undefined> {
    const rows = await database.query('SELECT * FROM clients WHERE id = ?', [id]);
    if (rows[0]) {
      return {
        ...rows[0],
        contactInfo: JSON.parse(rows[0].contact_info || '{}')
      };
    }
    return undefined;
  }

  async createClient(insertClient: InsertClient): Promise<Client> {
    const id = randomUUID();
    await database.query(`
      INSERT INTO clients (id, company_id, name, email, status, contact_info, is_multi_site, is_multi_user)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, insertClient.companyId, insertClient.name, insertClient.email, insertClient.status || 'pending', 
        JSON.stringify(insertClient.contactInfo), insertClient.isMultiSite, insertClient.isMultiUser]);

    return { ...insertClient, id, createdAt: new Date() };
  }

  async updateClientStatus(id: string, status: string): Promise<void> {
    await database.query('UPDATE clients SET status = ? WHERE id = ?', [status, id]);
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

    const rows = await database.query(query);
    return rows.map(row => ({
      id: row.id,
      clientId: row.client_id,
      productId: row.product_id,
      activationKey: row.activation_key,
      computerKey: row.computer_key,
      activationDate: row.activation_date,
      expiryDate: row.expiry_date,
      licenseType: row.license_type,
      status: row.status,
      maxUsers: row.max_users,
      maxDevices: row.max_devices,
      price: row.price,
      discount: row.discount,
      activeModules: JSON.parse(row.active_modules || '[]'),
      assignedCompany: row.assigned_company,
      assignedAgent: row.assigned_agent,
      createdAt: row.created_at,
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
  }

  async getLicense(id: string): Promise<LicenseWithDetails | undefined> {
    const licenses = await this.getLicenses();
    return licenses.find(l => l.id === id);
  }

  async getLicenseByActivationKey(key: string): Promise<LicenseWithDetails | undefined> {
    const licenses = await this.getLicenses();
    return licenses.find(l => l.activationKey === key);
  }

  async getLicensesByCompanyHierarchy(companyId: string): Promise<LicenseWithDetails[]> {
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
      WHERE c.company_id IN (${placeholders})
      ORDER BY l.created_at DESC
    `;

    const rows = await database.query(query, companyIds);
    return rows.map(row => ({
      id: row.id,
      clientId: row.client_id,
      productId: row.product_id,
      activationKey: row.activation_key,
      computerKey: row.computer_key,
      activationDate: row.activation_date,
      expiryDate: row.expiry_date,
      licenseType: row.license_type,
      status: row.status,
      maxUsers: row.max_users,
      maxDevices: row.max_devices,
      price: row.price,
      discount: row.discount,
      activeModules: JSON.parse(row.active_modules || '[]'),
      assignedCompany: row.assigned_company,
      assignedAgent: row.assigned_agent,
      createdAt: row.created_at,
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
  }

  async createLicense(insertLicense: InsertLicense): Promise<License> {
    const id = randomUUID();

    // Calcola automaticamente la data di scadenza per gli abbonamenti
    let expiryDate = insertLicense.expiryDate;
    if (insertLicense.licenseType === 'abbonamento_mensile') {
      const now = new Date();
      expiryDate = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
    } else if (insertLicense.licenseType === 'abbonamento_annuale') {
      const now = new Date();
      expiryDate = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
    }

    await database.query(`
      INSERT INTO licenses (
        id, client_id, product_id, activation_key, computer_key, activation_date,
        expiry_date, license_type, status, max_users, max_devices, price, discount,
        active_modules, assigned_company, assigned_agent
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id, 
      insertLicense.clientId, 
      insertLicense.productId, 
      insertLicense.activationKey,
      insertLicense.computerKey || null, 
      insertLicense.activationDate || null, 
      expiryDate || null,
      insertLicense.licenseType, 
      insertLicense.status || 'pending', 
      insertLicense.maxUsers || 1,
      insertLicense.maxDevices || 1, 
      insertLicense.price || 0, 
      insertLicense.discount || 0,
      JSON.stringify(insertLicense.activeModules || []), 
      insertLicense.assignedCompany || null,
      insertLicense.assignedAgent || null
    ]);

    return { ...insertLicense, id, expiryDate, createdAt: new Date() };
  }

  async updateLicense(id: string, updates: Partial<License>): Promise<void> {
    const fields = Object.keys(updates).filter(key => key !== 'id' && key !== 'createdAt');
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const values = fields.map(field => updates[field as keyof License]);

    await database.query(`UPDATE licenses SET ${setClause} WHERE id = ?`, [...values, id]);
  }

  async activateLicense(activationKey: string, computerKey: string, deviceInfo: any): Promise<License> {
    const license = await this.getLicenseByActivationKey(activationKey);
    if (!license) {
      throw new Error('License not found');
    }

    if (license.status === 'attiva') {
      throw new Error('License already activated');
    }

    await this.updateLicense(license.id, {
      computerKey,
      activationDate: new Date(),
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

  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    const id = randomUUID();
    await database.query(`
      INSERT INTO transactions (id, license_id, type, amount, payment_method, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [id, insertTransaction.licenseId, insertTransaction.type, insertTransaction.amount,
        insertTransaction.paymentMethod, insertTransaction.status, insertTransaction.notes]);

    return { ...insertTransaction, id, createdAt: new Date() };
  }

  async getTransactionsByLicense(licenseId: string): Promise<Transaction[]> {
    const rows = await database.query(
      'SELECT * FROM transactions WHERE license_id = ? ORDER BY created_at DESC',
      [licenseId]
    );
    return rows;
  }

  async logActivation(log: InsertActivationLog): Promise<void> {
    const id = randomUUID();
    await database.query(`
      INSERT INTO activation_logs (id, license_id, key_type, device_info, ip_address, user_agent, result, error_message)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, log.licenseId, log.keyType, JSON.stringify(log.deviceInfo), log.ipAddress, log.userAgent, log.result, log.errorMessage]);
  }

  async logAccess(log: InsertAccessLog): Promise<void> {
    const id = randomUUID();
    await database.query(`
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

    const rows = await database.query(query);
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

    const rows = await database.query(query, companyIds);
    return this.mapLicenseRows(rows);
  }

  private mapLicenseRows(rows: any[]): LicenseWithDetails[] {
    return rows.map(row => ({
      id: row.id,
      clientId: row.client_id,
      productId: row.product_id,
      activationKey: row.activation_key,
      computerKey: row.computer_key,
      activationDate: row.activation_date,
      expiryDate: row.expiry_date,
      licenseType: row.license_type,
      status: row.status,
      maxUsers: row.max_users,
      maxDevices: row.max_devices,
      price: row.price,
      discount: row.discount,
      activeModules: JSON.parse(row.active_modules || '[]'),
      assignedCompany: row.assigned_company,
      assignedAgent: row.assigned_agent,
      createdAt: row.created_at,
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
  }

  async getDashboardStats(userId: string, userRole: string, userCompanyId?: string): Promise<DashboardStats> {
    // If user is admin (not superadmin), filter by company hierarchy
    if (userRole === 'admin' && userCompanyId) {
      const companyIds = await this.getCompanyHierarchy(userCompanyId);
      const placeholders = companyIds.map(() => '?').join(',');

      const [activeLicenses] = await database.query(
        `SELECT COUNT(*) as count FROM licenses l 
         JOIN clients c ON l.client_id = c.id 
         WHERE l.status = "attiva" AND c.company_id IN (${placeholders})`,
        companyIds
      );

      const [demoLicenses] = await database.query(
        `SELECT COUNT(*) as count FROM licenses l 
         JOIN clients c ON l.client_id = c.id 
         WHERE l.license_type = "trial" AND l.status IN ("attiva", "demo") 
         AND c.company_id IN (${placeholders})`,
        companyIds
      );

      const [totalClients] = await database.query(
        `SELECT COUNT(*) as count FROM clients 
         WHERE status = "convalidato" AND company_id IN (${placeholders})`,
        companyIds
      );

      const [monthlyRevenue] = await database.query(`
        SELECT COALESCE(SUM(t.amount), 0) as total 
        FROM transactions t
        JOIN licenses l ON t.license_id = l.id
        JOIN clients c ON l.client_id = c.id
        WHERE t.status = "completed" 
        AND MONTH(t.created_at) = MONTH(CURRENT_DATE())
        AND YEAR(t.created_at) = YEAR(CURRENT_DATE())
        AND c.company_id IN (${placeholders})
      `, companyIds);

      const [todayActivations] = await database.query(`
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
    const [activeLicenses] = await database.query(
      'SELECT COUNT(*) as count FROM licenses WHERE status = "attiva"'
    );

    const [demoLicenses] = await database.query(
      'SELECT COUNT(*) as count FROM licenses WHERE license_type = "trial" AND status IN ("attiva", "demo")'
    );

    const [totalClients] = await database.query(
      'SELECT COUNT(*) as count FROM clients WHERE status = "convalidato"'
    );

    const [monthlyRevenue] = await database.query(`
      SELECT COALESCE(SUM(amount), 0) as total 
      FROM transactions 
      WHERE status = "completed" 
      AND MONTH(created_at) = MONTH(CURRENT_DATE())
      AND YEAR(created_at) = YEAR(CURRENT_DATE())
    `);

    const [todayActivations] = await database.query(`
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
    let sql = 'SELECT * FROM software_registrations';
    const params = [];

    if (filters?.status) {
      sql += ' WHERE status = ?';
      params.push(filters.status);
    }

    if (filters?.nomeSoftware) {
      sql += filters?.status ? ' AND' : ' WHERE';
      sql += ' nome_software LIKE ?';
      params.push(`%${filters.nomeSoftware}%`);
    }

    sql += ' ORDER BY prima_registrazione DESC';

    const rows = await database.query(sql, params);
    return rows.map((row: any) => ({
      ...row,
      totaleVenduto: parseFloat(row.totale_venduto || '0'),
      primaRegistrazione: row.prima_registrazione,
      ultimaAttivita: row.ultima_attivita,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }

  async getSoftwareRegistration(id: string): Promise<SoftwareRegistration | undefined> {
    const rows = await database.query(
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
    const rows = await database.query(
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

    await database.query(`
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

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        // Convert camelCase to snake_case for database
        const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        setClauses.push(`${dbKey} = ?`);
        params.push(value);
      }
    });

    setClauses.push('updated_at = ?');
    params.push(new Date());
    params.push(id);

    await database.query(
      `UPDATE software_registrations SET ${setClauses.join(', ')} WHERE id = ?`,
      params
    );

    return this.getSoftwareRegistration(id) as Promise<SoftwareRegistration>;
  }
}

export const storage = new DatabaseStorage();