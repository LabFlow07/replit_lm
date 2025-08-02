import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { database } from "./database";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { z } from "zod";

const JWT_SECRET = process.env.JWT_SECRET || 'qlm-secret-key-2024';

// Middleware for authentication
const authenticateToken = async (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user = await storage.getUser(decoded.id);
    if (!user) {
      return res.status(403).json({ message: 'Invalid token' });
    }
    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid token' });
  }
};

// Middleware for logging access
const logAccess = async (req: any, res: any, next: any) => {
  if (req.user) {
    await storage.logAccess({
      userId: req.user.id,
      action: `${req.method} ${req.path}`,
      resource: req.path,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent') || ''
    });
  }
  next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize database
  await database.initTables();

  // Create default admin user if not exists
  const adminUser = await storage.getUserByUsername('admin');
  if (!adminUser) {
    await storage.createUser({
      username: 'admin',
      password: 'admin123',
      role: 'superadmin',
      name: 'Administrator',
      email: 'admin@qlm.com',
      companyId: null
    });
    console.log('Default admin user created: admin/admin123');
  }

  // Create test data - always ensure demo data exists
  try {
    const existingCompanies = await storage.getCompanies();
    console.log(`Found ${existingCompanies.length} existing companies`);

    // Force creation of demo data if we have less than 5 companies
    if (existingCompanies.length < 5) {
    // Create test companies
    const testCompany1 = await storage.createCompany({
      name: 'ABC Software Solutions',
      type: 'rivenditore',
      parentId: null,
      status: 'active',
      contactInfo: { phone: '+39 02 12345678', address: 'Via Roma 123, Milano' }
    });

    const testCompany2 = await storage.createCompany({
      name: 'Tech Innovation SpA',
      type: 'rivenditore',
      parentId: null,
      status: 'active',
      contactInfo: { phone: '+39 06 98765432', address: 'Via Veneto 45, Roma' }
    });

    const testCompany3 = await storage.createCompany({
      name: 'Digital Systems Ltd',
      type: 'agente',
      parentId: testCompany1.id,
      status: 'active',
      contactInfo: { phone: '+39 011 5554321', address: 'Corso Francia 78, Torino' }
    });

    const testCompany4 = await storage.createCompany({
      name: 'South Italy Distributors',
      type: 'distributore',
      parentId: testCompany2.id,
      status: 'active',
      contactInfo: { phone: '+39 081 3334455', address: 'Via Partenope 22, Napoli' }
    });

    const testCompany5 = await storage.createCompany({
      name: 'NorthEast Tech',
      type: 'agente',
      parentId: testCompany1.id,
      status: 'active',
      contactInfo: { phone: '+39 045 9876543', address: 'Viale Europa 15, Verona' }
    });

    const testCompany6 = await storage.createCompany({
      name: 'Sicilia Software House',
      type: 'azienda',
      parentId: testCompany4.id,
      status: 'active',
      contactInfo: { phone: '+39 091 2223344', address: 'Via Libertà 88, Palermo' }
    });

    const testCompany7 = await storage.createCompany({
      name: 'Toscana IT Solutions',
      type: 'azienda',
      parentId: testCompany1.id,
      status: 'active',
      contactInfo: { phone: '+39 055 7788990', address: 'Piazza Duomo 12, Firenze' }
    });

    // Create test products
    const product1 = await storage.createProduct({
      name: 'QLM Professional',
      version: '2024.1',
      description: 'Piattaforma completa di gestione licenze software con funzionalità avanzate',
      supportedLicenseTypes: ['permanente', 'trial', 'abbonamento_mensile', 'abbonamento_annuale']
    });

    const product2 = await storage.createProduct({
      name: 'QLM Enterprise',
      version: '2024.2',
      description: 'Soluzione enterprise per la gestione di licenze software su larga scala',
      supportedLicenseTypes: ['permanente', 'abbonamento_mensile', 'abbonamento_annuale']
    });

    const product3 = await storage.createProduct({
      name: 'QLM Starter',
      version: '2024.1',
      description: 'Versione base per piccole aziende e sviluppatori indipendenti',
      supportedLicenseTypes: ['permanente', 'trial']
    });

    const product4 = await storage.createProduct({
      name: 'DataGuard Pro',
      version: '3.5.2',
      description: 'Software di protezione e backup dati aziendali',
      supportedLicenseTypes: ['permanente', 'trial', 'abbonamento']
    });

    const product5 = await storage.createProduct({
      name: 'WebSecure Suite',
      version: '1.8.0',
      description: 'Suite completa per la sicurezza web e protezione da malware',
      supportedLicenseTypes: ['abbonamento', 'trial']
    });

    // Create test clients
    const client1 = await storage.createClient({
      companyId: testCompany1.id,
      name: 'Mario Rossi',
      email: 'mario.rossi@company.com',
      status: 'convalidato',
      contactInfo: { phone: '+39 02 87654321', company: 'Rossi Consulting SRL' },
      isMultiSite: false,
      isMultiUser: true
    });

    const client2 = await storage.createClient({
      companyId: testCompany1.id,
      name: 'Giulia Bianchi',
      email: 'giulia.bianchi@techcorp.it',
      status: 'convalidato',
      contactInfo: { phone: '+39 02 55512345', company: 'TechCorp Italia' },
      isMultiSite: true,
      isMultiUser: true
    });

    const client3 = await storage.createClient({
      companyId: testCompany2.id,
      name: 'Francesco Verde',
      email: 'f.verde@innovate.com',
      status: 'convalidato',
      contactInfo: { phone: '+39 06 44556677', company: 'Innovate Solutions' },
      isMultiSite: false,
      isMultiUser: false
    });

    const client4 = await storage.createClient({
      companyId: testCompany2.id,
      name: 'Anna Neri',
      email: 'anna.neri@startup.io',
      status: 'in_attesa',
      contactInfo: { phone: '+39 06 33344455', company: 'StartupTech' },
      isMultiSite: false,
      isMultiUser: true
    });

    const client5 = await storage.createClient({
      companyId: testCompany3.id,
      name: 'Luca Ferrari',
      email: 'luca@ferrari-dev.com',
      status: 'convalidato',
      contactInfo: { phone: '+39 011 2233445', company: 'Ferrari Development' },
      isMultiSite: false,
      isMultiUser: false
    });

    const client6 = await storage.createClient({
      companyId: testCompany1.id,
      name: 'Marco Blu',
      email: 'marco.blu@enterprise.com',
      status: 'sospeso',
      contactInfo: { phone: '+39 02 77788899', company: 'Enterprise Corp' },
      isMultiSite: true,
      isMultiUser: true
    });

    const client7 = await storage.createClient({
      companyId: testCompany4.id,
      name: 'Giuseppe Napoli',
      email: 'g.napoli@southdist.it',
      status: 'convalidato',
      contactInfo: { phone: '+39 081 5556677', company: 'Southern Tech SRL' },
      isMultiSite: false,
      isMultiUser: true
    });

    const client8 = await storage.createClient({
      companyId: testCompany5.id,
      name: 'Elena Verdi',
      email: 'elena.verdi@northeast.com',
      status: 'convalidato',
      contactInfo: { phone: '+39 045 1112233', company: 'Verdi Systems' },
      isMultiSite: true,
      isMultiUser: false
    });

    const client9 = await storage.createClient({
      companyId: testCompany6.id,
      name: 'Salvatore Sicilia',
      email: 's.sicilia@siciliasoft.it',
      status: 'in_attesa',
      contactInfo: { phone: '+39 091 4445566', company: 'Sicilia Software' },
      isMultiSite: false,
      isMultiUser: true
    });

    const client10 = await storage.createClient({
      companyId: testCompany7.id,
      name: 'Chiara Fiorentina',
      email: 'chiara@toscana-it.com',
      status: 'convalidato',
      contactInfo: { phone: '+39 055 9998877', company: 'Toscana Digital' },
      isMultiSite: true,
      isMultiUser: true
    });

    // Create test licenses for different products and clients
    // QLM Professional licenses
    await storage.createLicense({
      clientId: client1.id,
      productId: product1.id,
      activationKey: 'LIC-2024-QLMP-001',
      computerKey: 'COMP-12345678',
      activationDate: new Date(),
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      licenseType: 'permanente',
      status: 'attiva',
      maxUsers: 5,
      maxDevices: 3,
      price: 1500,
      discount: 0,
      activeModules: ['core', 'reports', 'api'],
      assignedCompany: testCompany1.id,
      assignedAgent: null
    });

    await storage.createLicense({
      clientId: client2.id,
      productId: product1.id,
      activationKey: 'LIC-2024-QLMP-002',
      computerKey: 'COMP-87654321',
      activationDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      expiryDate: null, // Verrà calcolata automaticamente
      licenseType: 'abbonamento_mensile',
      status: 'attiva',
      maxUsers: 10,
      maxDevices: 5,
      price: 250,
      discount: 15,
      activeModules: ['core', 'reports', 'api', 'advanced'],
      assignedCompany: testCompany1.id,
      assignedAgent: null
    });

    // Aggiungi licenza con abbonamento annuale
    await storage.createLicense({
      clientId: client7.id,
      productId: product2.id,
      activationKey: 'LIC-2024-QLME-002',
      computerKey: 'COMP-ANNUAL01',
      activationDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      expiryDate: null, // Verrà calcolata automaticamente
      licenseType: 'abbonamento_annuale',
      status: 'attiva',
      maxUsers: 50,
      maxDevices: 25,
      price: 7500,
      discount: 10,
      activeModules: ['core', 'reports', 'api', 'advanced', 'enterprise'],
      assignedCompany: testCompany4.id,
      assignedAgent: null
    });

    // QLM Enterprise licenses
    await storage.createLicense({
      clientId: client3.id,
      productId: product2.id,
      activationKey: 'LIC-2024-QLME-001',
      computerKey: 'COMP-ENTER001',
      activationDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      expiryDate: new Date(Date.now() + 305 * 24 * 60 * 60 * 1000),
      licenseType: 'permanente',
      status: 'attiva',
      maxUsers: 50,
      maxDevices: 25,
      price: 8500,
      discount: 20,
      activeModules: ['core', 'reports', 'api', 'advanced', 'enterprise'],
      assignedCompany: testCompany2.id,
      assignedAgent: null
    });

    // QLM Starter licenses
    await storage.createLicense({
      clientId: client5.id,
      productId: product3.id,
      activationKey: 'LIC-2024-QLMS-001',
      computerKey: 'COMP-START001',
      activationDate: new Date(),
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      licenseType: 'permanente',
      status: 'attiva',
      maxUsers: 2,
      maxDevices: 1,
      price: 499,
      discount: 0,
      activeModules: ['core'],
      assignedCompany: testCompany3.id,
      assignedAgent: null
    });

    // DataGuard Pro licenses
    await storage.createLicense({
      clientId: client2.id,
      productId: product4.id,
      activationKey: 'LIC-2024-DGP-001',
      computerKey: 'COMP-GUARD001',
      activationDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      expiryDate: new Date(Date.now() + 275 * 24 * 60 * 60 * 1000),
      licenseType: 'abbonamento',
      status: 'attiva',
      maxUsers: 15,
      maxDevices: 10,
      price: 1899,
      discount: 10,
      activeModules: ['backup', 'encryption', 'monitoring'],
      assignedCompany: testCompany1.id,
      assignedAgent: null
    });

    // Demo/Trial licenses
    await storage.createLicense({
      clientId: client4.id,
      productId: product1.id,
      activationKey: 'LIC-2024-DEMO-001',
      computerKey: null,
      activationDate: null,
      expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      licenseType: 'trial',
      status: 'demo',
      maxUsers: 1,
      maxDevices: 1,
      price: 0,
      discount: 0,
      activeModules: ['core'],
      assignedCompany: testCompany2.id,
      assignedAgent: null
    });

    await storage.createLicense({
      clientId: client4.id,
      productId: product5.id,
      activationKey: 'LIC-2024-DEMO-002',
      computerKey: null,
      activationDate: null,
      expiryDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      licenseType: 'trial',
      status: 'demo',
      maxUsers: 1,
      maxDevices: 1,
      price: 0,
      discount: 0,
      activeModules: ['basic_scan'],
      assignedCompany: testCompany2.id,
      assignedAgent: null
    });

    // Pending licenses
    await storage.createLicense({
      clientId: client1.id,
      productId: product2.id,
      activationKey: 'LIC-2024-PEND-001',
      computerKey: null,
      activationDate: null,
      expiryDate: null,
      licenseType: 'permanente',
      status: 'in_attesa_convalida',
      maxUsers: 25,
      maxDevices: 15,
      price: 6500,
      discount: 25,
      activeModules: [],
      assignedCompany: testCompany1.id,
      assignedAgent: null
    });

    await storage.createLicense({
      clientId: client6.id,
      productId: product4.id,
      activationKey: 'LIC-2024-SUSP-001',
      computerKey: 'COMP-SUSP001',
      activationDate: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
      expiryDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      licenseType: 'abbonamento',
      status: 'scaduta',
      maxUsers: 20,
      maxDevices: 10,
      price: 2299,
      discount: 5,
      activeModules: ['backup', 'encryption'],
      assignedCompany: testCompany1.id,
      assignedAgent: null
    });

    // WebSecure Suite license
    await storage.createLicense({
      clientId: client3.id,
      productId: product5.id,
      activationKey: 'LIC-2024-WS-001',
      computerKey: 'COMP-SECURE01',
      activationDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      expiryDate: new Date(Date.now() + 350 * 24 * 60 * 60 * 1000),
      licenseType: 'abbonamento',
      status: 'attiva',
      maxUsers: 8,
      maxDevices: 5,
      price: 1299,
      discount: 0,
      activeModules: ['web_protection', 'malware_scan', 'firewall'],
      assignedCompany: testCompany2.id,
      assignedAgent: null
    });

    console.log('Extended demo data created successfully with multiple clients, products and licenses');
    }
  } catch (error) {
    console.error('Error creating demo data:', error);
  }

  // Authentication endpoints
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { username, password } = req.body;

      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          email: user.email,
          role: user.role,
          companyId: user.companyId,
          company: user.company
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Protected routes - exclude auth endpoints
  app.use('/api', (req, res, next) => {
    if (req.path.includes('/auth/')) {
      return next();
    }
    authenticateToken(req, res, next);
  }, logAccess);

  // Dashboard stats
  app.get('/api/dashboard/stats', async (req, res) => {
    try {
      // Get fresh user data with company info
      const userWithCompany = await storage.getUserByUsername(req.user.username);
      const stats = await storage.getDashboardStats(userWithCompany?.id || req.user.id, userWithCompany?.role || req.user.role, userWithCompany?.companyId);
      console.log(`Dashboard stats for ${userWithCompany?.username} (${userWithCompany?.role}) - Company: ${userWithCompany?.companyId}`);
      res.json(stats);
    } catch (error) {
      console.error('Dashboard stats error:', error);
      res.status(500).json({ message: 'Failed to fetch dashboard stats' });
    }
  });

  // Endpoint per licenze in scadenza ordinate per data
  app.get('/api/licenses/expiring', async (req, res) => {
    try {
      // Get fresh user data with company info
      const userWithCompany = await storage.getUserByUsername(req.user.username);
      let licenses;

      // If user is admin (not superadmin), filter by their company hierarchy
      if (userWithCompany?.role === 'admin' && userWithCompany?.companyId) {
        licenses = await storage.getLicensesExpiringByCompanyHierarchy(userWithCompany.companyId);
        console.log(`Admin ${userWithCompany.username} filtering expiring licenses for company hierarchy starting from:`, userWithCompany.companyId);
      } else if (userWithCompany?.role === 'superadmin') {
        // Superadmin can see all expiring licenses
        licenses = await storage.getLicensesExpiringByDate();
      } else {
        // Other roles get basic filtering
        licenses = await storage.getLicensesExpiringByDate();
      }

      res.json(licenses);
    } catch (error) {
      console.error('Get expiring licenses error:', error);
      res.status(500).json({ message: 'Failed to fetch expiring licenses' });
    }
  });

  // License endpoints
  app.get('/api/licenses', async (req, res) => {
    try {
      // Get fresh user data with company info
      const userWithCompany = await storage.getUserByUsername(req.user.username);
      let licenses;

      // If user is admin (not superadmin), filter by their company hierarchy
      if (userWithCompany?.role === 'admin' && userWithCompany?.companyId) {
        licenses = await storage.getLicensesByCompanyHierarchy(userWithCompany.companyId);
        console.log(`Admin ${userWithCompany.username} filtering licenses for company hierarchy starting from:`, userWithCompany.companyId);
      } else if (userWithCompany?.role === 'superadmin') {
        // Superadmin can see all licenses
        licenses = await storage.getLicenses(req.query);
      } else {
        // Other roles get basic filtering
        licenses = await storage.getLicenses(req.query);
      }

      console.log(`GET /api/licenses - User: ${userWithCompany?.username} (${userWithCompany?.role}) - Company: ${userWithCompany?.company?.name} - Returning ${licenses.length} licenses`);
      res.json(licenses);
    } catch (error) {
      console.error('Get licenses error:', error);
      res.status(500).json({ message: 'Failed to fetch licenses' });
    }
  });

  app.get('/api/licenses/:id', async (req, res) => {
    try {
      const license = await storage.getLicense(req.params.id);
      if (!license) {
        return res.status(404).json({ message: 'License not found' });
      }
      res.json(license);
    } catch (error) {
      console.error('Get license error:', error);
      res.status(500).json({ message: 'Failed to fetch license' });
    }
  });

  // License activation endpoint
  app.post('/api/licenze/attiva', async (req, res) => {
    try {
      const { activationKey, computerId, deviceInfo } = req.body;

      if (!activationKey || !computerId) {
        return res.status(400).json({ 
          message: 'Activation key and computer ID are required' 
        });
      }

      // Generate computer key from device info
      const computerKey = `COMP-${computerId.slice(-8).toUpperCase()}`;

      const license = await storage.activateLicense(activationKey, computerKey, deviceInfo);

      res.json({
        status: 'success',
        message: 'License activated successfully',
        license: {
          activationKey: license.activationKey,
          computerKey,
          status: 'attiva',
          activationDate: new Date().toISOString()
        }
      });
    } catch (error: any) {
      console.error('License activation error:', error);
      res.status(400).json({ 
        status: 'error',
        message: error.message || 'License activation failed' 
      });
    }
  });

  // License validation endpoint
  app.post('/api/licenze/valida', async (req, res) => {
    try {
      const { activationKey, computerKey } = req.body;

      if (!activationKey) {
        return res.status(400).json({ 
          status: 'invalid',
          message: 'Activation key is required' 
        });
      }

      const license = await storage.validateLicense(activationKey, computerKey);

      if (!license) {
        return res.json({
          status: 'invalid',
          message: 'License not found or expired'
        });
      }

      res.json({
        status: 'valid',
        license: {
          id: license.activationKey,
          product: license.product.name,
          version: license.product.version,
          client: license.client.name,
          expiryDate: license.expiryDate,
          activeModules: license.activeModules || [],
          deviceBound: !!license.computerKey,
          maxUsers: license.maxUsers,
          currentUsers: 1 // TODO: Track actual users
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('License validation error:', error);
      res.status(500).json({ 
        status: 'error',
        message: 'License validation failed' 
      });
    }
  });

  // Client endpoints
  app.get('/api/clients', async (req, res) => {
    try {
      // Get fresh user data with company info
      const userWithCompany = await storage.getUserByUsername(req.user.username);
      let clients;

      // If user is admin (not superadmin), filter by their company hierarchy
      if (userWithCompany?.role === 'admin' && userWithCompany?.companyId) {
        clients = await storage.getClientsByCompanyAndSubcompanies(userWithCompany.companyId);
        console.log(`Admin ${userWithCompany.username} filtering clients for company hierarchy starting from:`, userWithCompany.companyId);
      } else if (userWithCompany?.role === 'superadmin') {
        // Superadmin can see all clients
        clients = await storage.getClients(req.query.companyId as string);
      } else {
        // Other roles get filtered by their company only
        clients = await storage.getClients(userWithCompany?.companyId);
      }

      console.log(`GET /api/clients - User: ${userWithCompany?.username} (${userWithCompany?.role}) - Company: ${userWithCompany?.company?.name} - Returning ${clients.length} clients`);
      res.json(clients);
    } catch (error) {
      console.error('Get clients error:', error);
      res.status(500).json({ message: 'Failed to fetch clients' });
    }
  });

  app.post('/api/clienti/registrazione', async (req, res) => {
    try {
      const clientData = req.body;
      const client = await storage.createClient({
        ...clientData,
        status: 'in_attesa'
      });
      res.status(201).json(client);
    } catch (error) {
      console.error('Client registration error:', error);
      res.status(500).json({ message: 'Client registration failed' });
    }
  });

  // Product endpoints
  app.get('/api/products', async (req, res) => {
    try {
      const products = await storage.getProducts();
      res.json(products);
    } catch (error) {
      console.error('Get products error:', error);
      res.status(500).json({ message: 'Failed to fetch products' });
    }
  });

  app.post('/api/products', async (req, res) => {
    try {
      const productData = req.body;
      const product = await storage.createProduct(productData);
      res.status(201).json(product);
    } catch (error) {
      console.error('Create product error:', error);
      res.status(500).json({ message: 'Failed to create product' });
    }
  });

  // Transaction endpoints
  app.get('/api/transactions', async (req, res) => {
    try {
      const { licenseId } = req.query;
      if (licenseId) {
        const transactions = await storage.getTransactionsByLicense(licenseId as string);
        res.json(transactions);
      } else {
        res.json([]);
      }
    } catch (error) {
      console.error('Get transactions error:', error);
      res.status(500).json({ message: 'Failed to fetch transactions' });
    }
  });

  // License renewal endpoint
  app.post('/api/licenze/rinnova', async (req, res) => {
    try {
      const { licenseId, paymentMethod, amount } = req.body;

      const license = await storage.getLicense(licenseId);
      if (!license) {
        return res.status(404).json({ message: 'License not found' });
      }

      // Create renewal transaction
      await storage.createTransaction({
        licenseId,
        type: 'rinnovo',
        amount,
        paymentMethod,
        status: 'completed'
      });

      // Extend license expiry
      const newExpiryDate = new Date();
      newExpiryDate.setFullYear(newExpiryDate.getFullYear() + 1);

      await storage.updateLicense(licenseId, {
        expiryDate: newExpiryDate,
        status: 'attiva'
      });

      res.json({ 
        status: 'success',
        message: 'License renewed successfully',
        newExpiryDate 
      });
    } catch (error) {
      console.error('License renewal error:', error);
      res.status(500).json({ message: 'License renewal failed' });
    }
  });

  // Statistics endpoint
  app.get('/api/statistiche', async (req, res) => {
    try {
      const stats = await storage.getDashboardStats(req.user.id, req.user.role);
      res.json(stats);
    } catch (error) {
      console.error('Statistics error:', error);
      res.status(500).json({ message: 'Failed to fetch statistics' });
    }
  });

  // User endpoints
  app.get('/api/users', async (req, res) => {
    try {
      // TODO: Implement getUsers method in storage
      res.json([]);
    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({ message: 'Failed to fetch users' });
    }
  });

  app.post('/api/users', async (req, res) => {
    try {
      const userData = req.body;
      console.log('Creating user:', userData);

      const user = await storage.createUser({
        username: userData.username,
        password: userData.password,
        role: userData.role,
        name: userData.name,
        email: userData.email,
        companyId: userData.companyId
      });

      console.log('User created successfully:', user.id);
      res.status(201).json(user);
    } catch (error) {
      console.error('Create user error:', error);
      res.status(500).json({ message: 'Failed to create user' });
    }
  });

  // Company endpoints
  app.get('/api/companies', async (req, res) => {
    try {
      //      // Get fresh user data with company info
      const userWithCompany = await storage.getUserByUsername(req.user.username);
      console.log('GET /api/companies - User:', userWithCompany?.username, userWithCompany?.role, 'Company ID:', userWithCompany?.companyId, 'Company:', userWithCompany?.company?.name);

      let companies;
      if (userWithCompany?.role === 'admin' && userWithCompany?.companyId) {
        // Admin can only see their company hierarchy
        const companyIds = await storage.getCompanyHierarchy(userWithCompany.companyId);
        const allCompanies = await storage.getCompanies();
        companies = allCompanies.filter(c => companyIds.includes(c.id));
        console.log(`Admin ${userWithCompany.username} company hierarchy:`, companyIds);
      } else if (userWithCompany?.role === 'superadmin') {
        // Superadmin can see all companies
        companies = await storage.getCompanies();
      } else {
        // Other roles get limited view
        companies = await storage.getCompanies();
      }

      console.log(`GET /api/companies - Returning ${companies.length} companies for ${userWithCompany?.role} ${userWithCompany?.username}`);
      res.json(companies);
    } catch (error) {
      console.error('Get companies error:', error);
      res.status(500).json({ message: 'Failed to fetch companies' });
    }
  });

  app.post('/api/companies', async (req, res) => {
    try {
      const companyData = req.body;
      const company = await storage.createCompany(companyData);
      res.status(201).json(company);
    } catch (error) {
      console.error('Create company error:', error);
      res.status(500).json({ message: 'Failed to create company' });
    }
  });

  app.put('/api/companies/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const companyData = req.body;
      const company = await storage.updateCompany(id, companyData);
      res.json(company);
    } catch (error) {
      console.error('Update company error:', error);
      res.status(500).json({ message: 'Failed to update company' });
    }
  });

  // Create new license
  app.post('/api/licenses', async (req, res) => {
    try {
      const licenseData = req.body;
      console.log('License creation data:', licenseData);

      // Generate activation key
      const timestamp = Date.now().toString(36).toUpperCase();
      const random = Math.random().toString(36).substring(2, 8).toUpperCase();
      const activationKey = `LIC-${timestamp}-${random}`;

      // Get user's company for assignment
      const userWithCompany = await storage.getUserByUsername(req.user.username);

      const license = await storage.createLicense({
        clientId: licenseData.clientId,
        productId: licenseData.productId,
        activationKey,
        computerKey: null,
        activationDate: null,
        expiryDate: null,
        licenseType: licenseData.licenseType,
        status: 'in_attesa_convalida',
        maxUsers: parseInt(licenseData.maxUsers) || 1,
        maxDevices: parseInt(licenseData.maxDevices) || 1,
        price: parseFloat(licenseData.price) || 0,
        discount: parseFloat(licenseData.discount) || 0,
        activeModules: [],
        assignedCompany: userWithCompany?.companyId || null,
        assignedAgent: null
      });

      res.status(201).json(license);
    } catch (error) {
      console.error('Create license error:', error);
      res.status(500).json({ message: 'Failed to create license' });
    }
  });

  // Update license
  app.patch('/api/licenses/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      await storage.updateLicense(id, updates);
      
      const updatedLicense = await storage.getLicense(id);
      res.json(updatedLicense);
    } catch (error) {
      console.error('Update license error:', error);
      res.status(500).json({ message: 'Failed to update license' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}