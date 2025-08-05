import express, { type Request, type Response, type NextFunction } from "express";
import { nanoid } from "nanoid";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { database } from "./database";
import { storage } from "./storage";

const router = express.Router();

// JWT Secret - Use a consistent secret
const JWT_SECRET = process.env.JWT_SECRET || "qlm-jwt-secret-key-2024";

// Middleware to verify JWT token
function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    console.log('No token provided');
    return res.sendStatus(401);
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      console.error('Token verification error:', err);
      console.log('Token that failed:', token.substring(0, 20) + '...');
      console.log('JWT_SECRET exists:', !!JWT_SECRET);
      return res.sendStatus(403);
    }
    console.log('Token verified successfully for user:', user.username);
    (req as any).user = user;
    next();
  });
}

// Auth routes
router.post("/api/register", async (req: Request, res: Response) => {
  try {
    const { username, email, password, name, role, companyId } = req.body;

    // Check if user already exists
    const existingUser = await storage.getUserByUsername(username);
    if (existingUser) {
      return res.status(400).json({ message: "Username already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await storage.createUser({
      id: nanoid(),
      username,
      email,
      password: hashedPassword,
      name,
      role: role || 'cliente',
      companyId: companyId || null,
      createdAt: new Date().toISOString()
    });

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        username: user.username, 
        role: user.role,
        companyId: user.companyId 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ 
      message: "User registered successfully", 
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        companyId: user.companyId
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/api/auth/login", async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    const user = await storage.getUserByUsername(username);
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        username: user.username, 
        role: user.role,
        companyId: user.companyId 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log('Login successful for user:', user.username);
    console.log('Full token payload:', { 
      id: user.id, 
      username: user.username, 
      role: user.role,
      companyId: user.companyId 
    });
    console.log('CompanyId from token payload:', user.companyId);

    res.json({ 
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        companyId: user.companyId
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/api/user", authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const user = await storage.getUserById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      companyId: user.companyId
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Protected routes
router.get("/api/companies", authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    console.log('Fetching companies for user:', user.username, 'Role:', user.role, 'Company ID:', user.companyId);

    let companies;

    if (user.role === 'superadmin') {
      // Superadmin can see all companies
      companies = await storage.getAllCompanies();
      console.log('Superadmin: fetched all', companies.length, 'companies');
    } else if (user.role === 'admin') {
      // Admin can see their company and all subsidiaries
      companies = await storage.getCompaniesInHierarchy(user.companyId);
      console.log('Admin: fetched', companies.length, 'companies in hierarchy for company', user.companyId);
    } else {
      // Other roles can only see their own company
      const company = await storage.getCompanyById(user.companyId);
      companies = company ? [company] : [];
      console.log('User role', user.role, ': fetched', companies.length, 'companies (own company only)');
    }

    res.json(companies);
  } catch (error) {
    console.error('Get companies error:', error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/api/clients", authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    console.log('Fetching clients for user:', user.username, 'Role:', user.role, 'Company ID:', user.companyId);

    let clients;

    if (user.role === 'superadmin') {
      // Superadmin can see all clients
      clients = await storage.getAllClients();
      console.log('Superadmin: fetched all', clients.length, 'clients');
    } else if (user.role === 'admin') {
      // Admin can see clients from their company hierarchy
      clients = await storage.getClientsByCompanyHierarchy(user.companyId);
      console.log('Admin: fetched', clients.length, 'clients in company hierarchy', user.companyId);
    } else {
      // Other roles can only see clients from their own company
      clients = await storage.getClientsByCompany(user.companyId);
      console.log('User role', user.role, ': fetched', clients.length, 'clients from company', user.companyId);
    }

    console.log('Raw clients data received:', clients.length, 'clients');
    console.log(`Clients API returned ${clients.length} clients for user ${user.username} (${user.role})`);

    res.json(clients);
  } catch (error) {
    console.error('Get clients error:', error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/api/licenses", authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    console.log('Fetching licenses for user:', user.username, 'Role:', user.role, 'Company ID:', user.companyId);

    let licenses;

    if (user.role === 'superadmin') {
      // Superadmin can see all licenses
      licenses = await storage.getAllLicenses();
      console.log('Superadmin: fetched all', licenses.length, 'licenses');
    } else if (user.role === 'admin') {
      // Admin can see licenses from their company hierarchy
      licenses = await storage.getLicensesByCompanyHierarchy(user.companyId);
      console.log('Admin: fetched', licenses.length, 'licenses in company hierarchy', user.companyId);
    } else {
      // Other roles can only see licenses from their own company
      licenses = await storage.getLicensesByCompany(user.companyId);
      console.log('User role', user.role, ': fetched', licenses.length, 'licenses from company', user.companyId);
    }

    console.log(`Licenses API returned ${licenses.length} licenses for user ${user.username}`);

    res.json(licenses);
  } catch (error) {
    console.error('Get licenses error:', error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/api/licenses/expiring", authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    console.log('Fetching expiring licenses for user:', user.username, 'Role:', user.role, 'Company ID:', user.companyId);

    let licenses;

    if (user.role === 'superadmin') {
      // Superadmin can see all expiring licenses
      licenses = await storage.getExpiringLicenses();
      console.log('Superadmin: fetched all', licenses.length, 'expiring licenses');
    } else if (user.role === 'admin') {
      // Admin can see expiring licenses from their company hierarchy
      licenses = await storage.getExpiringLicensesByCompanyHierarchy(user.companyId);
      console.log('Admin: fetched', licenses.length, 'expiring licenses in company hierarchy', user.companyId);
    } else {
      // Other roles can only see expiring licenses from their own company
      licenses = await storage.getExpiringLicensesByCompany(user.companyId);
      console.log('User role', user.role, ': fetched', licenses.length, 'expiring licenses from company', user.companyId);
    }

    console.log(`Expiring licenses API returned ${licenses.length} licenses for user ${user.username}`);

    res.json(licenses);
  } catch (error) {
    console.error('Get expiring licenses error:', error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/api/licenses/active/count", authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    console.log('Fetching active licenses count for user:', user.username, 'Role:', user.role, 'Company ID:', user.companyId);

    let count;

    if (user.role === 'superadmin') {
      // Superadmin can see count of all active licenses
      count = await storage.getActiveLicensesCount();
      console.log('Superadmin: active licenses count =', count);
    } else if (user.role === 'admin') {
      // Admin can see count of active licenses from their company hierarchy
      count = await storage.getActiveLicensesCountByCompanyHierarchy(user.companyId);
      console.log('Admin: active licenses count in company hierarchy', user.companyId, '=', count);
    } else {
      // Other roles can only see count of active licenses from their own company
      count = await storage.getActiveLicensesCountByCompany(user.companyId);
      console.log('User role', user.role, ': active licenses count from company', user.companyId, '=', count);
    }

    res.json({ count });
  } catch (error) {
    console.error('Get active licenses count error:', error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/api/products", authenticateToken, async (req: Request, res: Response) => {
  try {
    const products = await storage.getAllProducts();
    res.json(products);
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/api/software/registrazioni", authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { status, nomeSoftware } = req.query;

    console.log('Fetching software registrations for user:', user.username, 'Role:', user.role, 'Company ID:', user.companyId);

    const filters = {
      ...(status && { status: status as string }),
      ...(nomeSoftware && { nomeSoftware: nomeSoftware as string })
    };

    const registrations = await storage.getSoftwareRegistrations(filters);
    console.log('Software registrations API returned', registrations.length, 'registrations for user', user.username);

    res.json(registrations);
  } catch (error) {
    console.error('Get software registrations error:', error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/api/software/registrazioni/:id", authenticateToken, async (req: Request, res: Response) => {
  try {
    const registrationId = req.params.id;
    const registration = await storage.getSoftwareRegistration(registrationId);

    if (!registration) {
      return res.status(404).json({ message: "Registration not found" });
    }

    res.json(registration);
  } catch (error) {
    console.error('Get software registration error:', error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.patch("/api/software/registrazioni/:id/classifica", authenticateToken, async (req: Request, res: Response) => {
  try {
    const registrationId = req.params.id;
    const { clienteAssegnato, licenzaAssegnata, prodottoAssegnato, note } = req.body;

    const updates = {
      clienteAssegnato,
      licenzaAssegnata,
      prodottoAssegnato,
      note,
      status: 'classificato'
    };

    const updatedRegistration = await storage.updateSoftwareRegistration(registrationId, updates);
    res.json(updatedRegistration);
  } catch (error) {
    console.error('Classify software registration error:', error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/api/licenses", authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const licenseData = {
      ...req.body,
      id: nanoid(),
      createdAt: new Date().toISOString()
    };

    // Validate that the user can create licenses for the specified client
    const client = await storage.getClientById(licenseData.clientId);
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    // Check permissions based on user role
    if (user.role !== 'superadmin') {
      let hasPermission = false;

      if (user.role === 'admin') {
        // Admin can create licenses for clients in their company hierarchy
        const companyIds = await storage.getCompanyHierarchy(user.companyId);
        hasPermission = companyIds.includes(client.company_id || client.companyId);
      } else {
        // Other roles can only create licenses for clients in their own company
        hasPermission = (client.company_id || client.companyId) === user.companyId;
      }

      if (!hasPermission) {
        return res.status(403).json({ message: "Not authorized to create license for this client" });
      }
    }

    const license = await storage.createLicense(licenseData);
    res.json(license);
  } catch (error) {
    console.error('Create license error:', error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.put("/api/licenses/:id", authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const licenseId = req.params.id;
    const updateData = req.body;

    // Get the existing license
    const existingLicense = await storage.getLicenseById(licenseId);
    if (!existingLicense) {
      return res.status(404).json({ message: "License not found" });
    }

    // Check permissions based on user role
    if (user.role !== 'superadmin') {
      let hasPermission = false;

      if (user.role === 'admin') {
        // Admin can update licenses for clients in their company hierarchy
        const companyIds = await storage.getCompanyHierarchy(user.companyId);
        hasPermission = companyIds.includes(existingLicense.client.company_id || existingLicense.client.companyId);
      } else {
        // Other roles can only update licenses for clients in their own company
        hasPermission = (existingLicense.client.company_id || existingLicense.client.companyId) === user.companyId;
      }

      if (!hasPermission) {
        return res.status(403).json({ message: "Not authorized to update this license" });
      }
    }

    const updatedLicense = await storage.updateLicense(licenseId, updateData);
    res.json(updatedLicense);
  } catch (error) {
    console.error('Update license error:', error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.delete("/api/licenses/:id", authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const licenseId = req.params.id;

    // Get the existing license
    const existingLicense = await storage.getLicenseById(licenseId);
    if (!existingLicense) {
      return res.status(404).json({ message: "License not found" });
    }

    // Check permissions based on user role
    if (user.role !== 'superadmin') {
      let hasPermission = false;

      if (user.role === 'admin') {
        // Admin can delete licenses for clients in their company hierarchy
        const companyIds = await storage.getCompanyHierarchy(user.companyId);
        hasPermission = companyIds.includes(existingLicense.client.company_id || existingLicense.client.companyId);
      } else {
        // Other roles can only delete licenses for clients in their own company
        hasPermission = (existingLicense.client.company_id || existingLicense.client.companyId) === user.companyId;
      }

      if (!hasPermission) {
        return res.status(403).json({ message: "Not authorized to delete this license" });
      }
    }

    await storage.deleteLicense(licenseId);
    res.json({ message: "License deleted successfully" });
  } catch (error) {
    console.error('Delete license error:', error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Demo data creation endpoint - only for superadmin
router.post("/api/demo/populate", authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    // Only superadmin can populate demo data
    if (user.role !== 'superadmin') {
      return res.status(403).json({ message: "Only superadmin can populate demo data" });
    }

    console.log('Starting demo data population...');

    // Clear existing data
    await database.query('DELETE FROM licenses');
    await database.query('DELETE FROM clients');
    await database.query('DELETE FROM products');
    await database.query('DELETE FROM companies');
    console.log('Cleared existing data');

    // Create companies
    const companies = [
      {
        id: 'comp-headquarters',
        name: 'QLM Solutions S.p.A.',
        type: 'sede',
        parent_id: null,
        status: 'active',
        contact_info: JSON.stringify({
          address: 'Via Roma 123, Milano',
          phone: '+39 02 1234567',
          email: 'info@qlmsolutions.it'
        })
      },
      {
        id: 'comp-reseller-1',
        name: 'TechnoSoft Distribution',
        type: 'rivenditore',
        parent_id: 'comp-headquarters',
        status: 'active',
        contact_info: JSON.stringify({
          address: 'Via Torino 45, Torino',
          phone: '+39 011 9876543',
          email: 'sales@technosoft.it'
        })
      },
      {
        id: 'comp-reseller-2',
        name: 'SoftwareHouse Roma',
        type: 'rivenditore',
        parent_id: 'comp-headquarters',
        status: 'active',
        contact_info: JSON.stringify({
          address: 'Via del Corso 78, Roma',
          phone: '+39 06 5551234',
          email: 'info@swhouse.it'
        })
      },
      {
        id: 'comp-client-1',
        name: 'Manifattura Italiana S.r.l.',
        type: 'cliente',
        parent_id: 'comp-reseller-1',
        status: 'active',
        contact_info: JSON.stringify({
          address: 'Via dell\'Industria 12, Brescia',
          phone: '+39 030 7778899',
          email: 'it@manifattura.it'
        })
      }
    ];

    for (const company of companies) {
      await database.query(`
        INSERT INTO companies (id, name, type, parent_id, status, contact_info, created_at)
        VALUES (?, ?, ?, ?, ?, ?, NOW())
      `, [company.id, company.name, company.type, company.parent_id, company.status, company.contact_info]);
    }
    console.log('Created companies');

    // Create products
    const products = [
      {
        id: 'prod-qlm-pro',
        name: 'QLM Professional',
        version: '2024.1',
        description: 'Soluzione completa per la gestione licenze software',
        supported_license_types: JSON.stringify(['permanente', 'abbonamento', 'trial'])
      },
      {
        id: 'prod-qlm-enterprise',
        name: 'QLM Enterprise',
        version: '2024.2',
        description: 'Soluzione enterprise per la gestione di licenze software su larga scala',
        supported_license_types: JSON.stringify(['permanente', 'abbonamento'])
      },
      {
        id: 'prod-cassawow',
        name: 'CassaWOW Easy',
        version: '2025.1',
        description: 'Software gestionale per punti vendita e ristoranti',
        supported_license_types: JSON.stringify(['abbonamento', 'trial'])
      }
    ];

    for (const product of products) {
      await database.query(`
        INSERT INTO products (id, name, version, description, supported_license_types, created_at)
        VALUES (?, ?, ?, ?, ?, NOW())
      `, [product.id, product.name, product.version, product.description, product.supported_license_types]);
    }
    console.log('Created products');

    // Create clients
    const clients = [
      {
        id: 'client-1',
        company_id: 'comp-client-1',
        name: 'Mario Rossi',
        email: 'mario.rossi@manifattura.it',
        status: 'convalidato',
        contact_info: JSON.stringify({
          phone: '+39 030 7778800',
          position: 'IT Manager'
        }),
        is_multi_site: false,
        is_multi_user: true
      },
      {
        id: 'client-2',
        company_id: 'comp-reseller-1',
        name: 'Laura Bianchi',
        email: 'laura.bianchi@technosoft.it',
        status: 'convalidato',
        contact_info: JSON.stringify({
          phone: '+39 011 9876544',
          position: 'Sales Manager'
        }),
        is_multi_site: true,
        is_multi_user: true
      },
      {
        id: 'client-3',
        company_id: 'comp-reseller-2',
        name: 'Giuseppe Verdi',
        email: 'g.verdi@swhouse.it',
        status: 'in_attesa',
        contact_info: JSON.stringify({
          phone: '+39 06 5551235',
          position: 'Technical Director'
        }),
        is_multi_site: false,
        is_multi_user: false
      }
    ];

    for (const client of clients) {
      await database.query(`
        INSERT INTO clients (id, company_id, name, email, status, contact_info, is_multi_site, is_multi_user, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `, [client.id, client.company_id, client.name, client.email, client.status, client.contact_info, client.is_multi_site, client.is_multi_user]);
    }
    console.log('Created clients');

    // Create licenses
    const licenses = [
      {
        id: 'lic-1',
        product_id: 'prod-qlm-pro',
        client_id: 'client-1',
        license_type: 'permanente',
        activation_key: 'QLM-PRO-2024-ABCD-1234',
        computer_key: 'PC-MARIO-WORK-001',
        status: 'attiva',
        max_users: 5,
        expires_at: null,
        activation_date: '2024-01-15',
        assigned_company: 'comp-client-1'
      },
      {
        id: 'lic-2',
        product_id: 'prod-cassawow',
        client_id: 'client-2',
        license_type: 'abbonamento',
        activation_key: 'CASSA-WOW-2025-EFGH-5678',
        computer_key: 'PC-LAURA-DEMO-002',
        status: 'attiva',
        max_users: 10,
        expires_at: '2025-12-31',
        activation_date: '2024-06-01',
        assigned_company: 'comp-reseller-1'
      },
      {
        id: 'lic-3',
        product_id: 'prod-qlm-enterprise',
        client_id: 'client-1',
        license_type: 'trial',
        activation_key: 'QLM-ENT-TRIAL-IJKL-9012',
        computer_key: 'PC-MARIO-TEST-003',
        status: 'scaduta',
        max_users: 3,
        expires_at: '2024-02-15',
        activation_date: '2024-01-16',
        assigned_company: 'comp-client-1'
      },
      {
        id: 'lic-4',
        product_id: 'prod-qlm-pro',
        client_id: 'client-3',
        license_type: 'abbonamento',
        activation_key: 'QLM-PRO-SUB-MNOP-3456',
        computer_key: null,
        status: 'non_attivata',
        max_users: 1,
        expires_at: '2025-08-31',
        activation_date: null,
        assigned_company: 'comp-reseller-2'
      }
    ];

    for (const license of licenses) {
      await database.query(`
        INSERT INTO licenses (id, product_id, client_id, license_type, activation_key, computer_key, status, max_users, expires_at, activation_date, assigned_company, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `, [license.id, license.product_id, license.client_id, license.license_type, license.activation_key, license.computer_key, license.status, license.max_users, license.expires_at, license.activation_date, license.assigned_company]);
    }
    console.log('Created licenses');

    const stats = {
      companies: companies.length,
      products: products.length,
      clients: clients.length,
      licenses: licenses.length
    };

    res.json({ 
      message: "Demo data populated successfully", 
      stats 
    });

  } catch (error) {
    console.error('Demo data population error:', error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// User management routes
router.get('/api/users', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    console.log(`Fetching users for user: ${req.user.username} Role: ${req.user.role} Company ID: ${req.user.companyId}`);
    
    let users;
    if (req.user.role === 'superadmin') {
      // Superadmin can see all users including inactive ones
      users = await storage.getUsers(undefined, true);
    } else if (req.user.role === 'admin' && req.user.companyId) {
      // Admin can see users in their company hierarchy (only active)
      users = await storage.getUsers(req.user.companyId, false);
    } else {
      return res.status(403).json({ message: "Access denied" });
    }

    console.log(`Found ${users.length} users`);
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post('/api/users', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    // Permission check
    if (req.user.role !== 'superadmin' && req.user.role !== 'admin') {
      return res.status(403).json({ message: "Access denied" });
    }

    const { username, name, email, password, role, companyId } = req.body;

    // Validate role permissions
    if (req.user.role === 'admin') {
      // Admin can only create users within their company hierarchy or subcompanies
      if (role === 'superadmin') {
        return res.status(403).json({ message: "Cannot create superadmin users" });
      }
      if (companyId && companyId !== req.user.companyId) {
        // Check if target company is in user's hierarchy
        const hierarchy = await storage.getCompanyHierarchy(req.user.companyId || '');
        if (!hierarchy.includes(companyId)) {
          return res.status(403).json({ message: "Cannot create users outside your company hierarchy" });
        }
      }
    }

    const newUser = await storage.createUser({
      username,
      name,
      email,
      password,
      role,
      companyId: companyId || req.user.companyId,
      isActive: true
    });

    console.log(`Created new user: ${newUser.username} with role: ${newUser.role}`);
    res.status(201).json(newUser);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.patch('/api/users/:id', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    // Permission check
    if (req.user.role !== 'superadmin' && req.user.role !== 'admin') {
      return res.status(403).json({ message: "Access denied" });
    }

    const userId = req.params.id;
    const updates = req.body;

    // Additional checks for admin users
    if (req.user.role === 'admin') {
      const targetUser = await storage.getUser(userId);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Admin cannot modify superadmin users
      if (targetUser.role === 'superadmin') {
        return res.status(403).json({ message: "Cannot modify superadmin users" });
      }

      // Admin can only modify users in their company hierarchy
      if (targetUser.companyId && req.user.companyId) {
        const hierarchy = await storage.getCompanyHierarchy(req.user.companyId);
        if (!hierarchy.includes(targetUser.companyId)) {
          return res.status(403).json({ message: "Cannot modify users outside your company hierarchy" });
        }
      }
    }

    const updatedUser = await storage.updateUser(userId, updates);
    console.log(`Updated user: ${updatedUser.username}`);
    res.json(updatedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.delete('/api/users/:id', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    // Permission check
    if (req.user.role !== 'superadmin' && req.user.role !== 'admin') {
      return res.status(403).json({ message: "Access denied" });
    }

    const userId = req.params.id;

    // Cannot delete self
    if (userId === req.user.id) {
      return res.status(400).json({ message: "Cannot delete yourself" });
    }

    // Additional checks for admin users
    if (req.user.role === 'admin') {
      const targetUser = await storage.getUser(userId);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Admin cannot delete superadmin users
      if (targetUser.role === 'superadmin') {
        return res.status(403).json({ message: "Cannot delete superadmin users" });
      }

      // Admin can only delete users in their company hierarchy
      if (targetUser.companyId && req.user.companyId) {
        const hierarchy = await storage.getCompanyHierarchy(req.user.companyId);
        if (!hierarchy.includes(targetUser.companyId)) {
          return res.status(403).json({ message: "Cannot delete users outside your company hierarchy" });
        }
      }
    }

    await storage.deleteUser(userId);
    console.log(`Deleted user: ${userId}`);
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default function registerRoutes(app: express.Express): void {
  app.use(router);
}