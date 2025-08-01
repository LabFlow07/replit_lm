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

  // Create test data if database is empty
  const existingLicenses = await storage.getLicenses();
  if (existingLicenses.length === 0) {
    // Create test company
    const testCompany = await storage.createCompany({
      name: 'ABC Software Solutions',
      type: 'rivenditore',
      parentId: null,
      status: 'active',
      contactInfo: { phone: '+39 02 12345678', address: 'Via Roma 123, Milano' }
    });

    // Create test product
    const testProduct = await storage.createProduct({
      name: 'QLM Professional',
      version: '2024.1',
      description: 'Piattaforma completa di gestione licenze',
      supportedLicenseTypes: ['permanente', 'trial', 'abbonamento']
    });

    // Create test client
    const testClient = await storage.createClient({
      companyId: testCompany.id,
      name: 'Mario Rossi',
      email: 'mario.rossi@company.com',
      status: 'convalidato',
      contactInfo: { phone: '+39 02 87654321' },
      isMultiSite: false,
      isMultiUser: true
    });

    // Create test licenses
    await storage.createLicense({
      clientId: testClient.id,
      productId: testProduct.id,
      activationKey: 'LIC-2024-ACTIVE-001',
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
      assignedCompany: testCompany.id,
      assignedAgent: null
    });

    await storage.createLicense({
      clientId: testClient.id,
      productId: testProduct.id,
      activationKey: 'LIC-2024-DEMO-002',
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
      assignedCompany: testCompany.id,
      assignedAgent: null
    });

    await storage.createLicense({
      clientId: testClient.id,
      productId: testProduct.id,
      activationKey: 'LIC-2024-PENDING-003',
      computerKey: null,
      activationDate: null,
      expiryDate: null,
      licenseType: 'permanente',
      status: 'in_attesa_convalida',
      maxUsers: 10,
      maxDevices: 5,
      price: 2500,
      discount: 10,
      activeModules: [],
      assignedCompany: testCompany.id,
      assignedAgent: null
    });

    console.log('Test data created successfully');
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
      const stats = await storage.getDashboardStats(req.user.id, req.user.role);
      res.json(stats);
    } catch (error) {
      console.error('Dashboard stats error:', error);
      res.status(500).json({ message: 'Failed to fetch dashboard stats' });
    }
  });

  // License endpoints
  app.get('/api/licenses', async (req, res) => {
    try {
      const licenses = await storage.getLicenses(req.query);
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

  // Create new license
  app.post('/api/licenses', async (req, res) => {
    try {
      const licenseData = req.body;
      
      // Generate activation key
      const timestamp = Date.now().toString(36).toUpperCase();
      const random = Math.random().toString(36).substring(2, 8).toUpperCase();
      const activationKey = `LIC-${timestamp}-${random}`;
      
      const license = await storage.createLicense({
        ...licenseData,
        activationKey,
        status: 'pending'
      });
      
      res.status(201).json(license);
    } catch (error) {
      console.error('Create license error:', error);
      res.status(500).json({ message: 'Failed to create license' });
    }
  });

  // Client endpoints
  app.get('/api/clients', async (req, res) => {
    try {
      const clients = await storage.getClients(req.query.companyId as string);
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

  const httpServer = createServer(app);
  return httpServer;
}
