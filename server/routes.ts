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

router.get("/api/auth/validate", authenticateToken, async (req: Request, res: Response) => {
  res.json({ isValid: true });
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

router.post("/api/companies", authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const companyData = {
      ...req.body,
      id: nanoid(),
      createdAt: new Date().toISOString()
    };

    // Check permissions based on user role
    if (user.role !== 'superadmin' && user.role !== 'admin') {
      return res.status(403).json({ message: "Not authorized to create companies" });
    }

    const company = await storage.createCompany(companyData);
    res.json(company);
  } catch (error) {
    console.error('Create company error:', error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.put("/api/companies/:id", authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const companyId = req.params.id;
    const { name, type, parentId, status, contactInfo } = req.body;

    console.log(`Update company request for ID: ${companyId} by user: ${user.username} (${user.role})`);
    console.log('Update data:', { name, type, parentId, status, contactInfo });

    // Check permissions based on user role
    if (user.role !== 'superadmin' && user.role !== 'admin') {
      return res.status(403).json({ message: "Not authorized to update companies" });
    }

    const existingCompany = await storage.getCompany(companyId);
    if (!existingCompany) {
      return res.status(404).json({ message: "Company not found" });
    }

    // Admin can only update companies in their hierarchy
    if (user.role === 'admin' && user.companyId) {
      const companyIds = await storage.getCompanyHierarchy(user.companyId);
      if (!companyIds.includes(companyId)) {
        return res.status(403).json({ message: "Not authorized to update this company" });
      }
    }

    const updatedCompany = await storage.updateCompany(companyId, {
      name,
      type,
      parentId: parentId || null,
      status,
      contactInfo
    });

    console.log('Company updated successfully:', updatedCompany);
    res.json(updatedCompany);
  } catch (error) {
    console.error('Update company error:', error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.delete("/api/companies/:id", authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const companyId = req.params.id;

    console.log(`Delete company request for ID: ${companyId} by user: ${user.username} (${user.role})`);

    // Only superadmin can delete companies
    if (user.role !== 'superadmin') {
      return res.status(403).json({ message: "Only superadmin can delete companies" });
    }

    const existingCompany = await storage.getCompany(companyId);
    if (!existingCompany) {
      return res.status(404).json({ message: "Company not found" });
    }

    console.log(`Found company to delete: ${existingCompany.name} (${existingCompany.id})`);

    // Check if company has clients before attempting deletion
    const clients = await storage.getClientsByCompany(companyId);
    if (clients.length > 0) {
      return res.status(400).json({ 
        message: `Cannot delete company "${existingCompany.name}" because it has ${clients.length} associated clients. Please move or remove all clients first.` 
      });
    }

    // Get subcompanies info for logging
    const allCompanies = await storage.getAllCompanies();
    const subcompanies = allCompanies.filter((company: any) => 
      (company.parent_id === companyId || company.parentId === companyId)
    );

    if (subcompanies.length > 0) {
      console.log(`Company ${existingCompany.name} has ${subcompanies.length} subcompanies that will be moved to parent`);
    }

    await storage.deleteCompany(companyId);
    console.log(`Company ${existingCompany.name} deleted successfully`);

    res.json({ 
      message: "Company deleted successfully",
      details: {
        deletedCompany: existingCompany.name,
        movedSubcompanies: subcompanies.length
      }
    });
  } catch (error) {
    console.error('Delete company error:', error);
    if (error instanceof Error) {
      return res.status(400).json({ message: error.message });
    }
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
    let whereClause = '';
    const queryParams: any[] = [];

    if (user.role === 'superadmin') {
      // Superadmin can see all licenses
      console.log('Superadmin: fetching all licenses');
    } else if (user.role === 'admin') {
      // Admin can see licenses from their company hierarchy
      whereClause = 'WHERE c.company_id IN (?) OR comp.parent_id IN (?) OR comp.id IN (?)';
      queryParams.push(user.companyId, user.companyId, user.companyId);
      console.log('Admin: fetching licenses for company hierarchy', user.companyId);
    } else {
      // Other roles can only see licenses from their own company
      whereClause = 'WHERE c.company_id = ?';
      queryParams.push(user.companyId);
      console.log('User role', user.role, ': fetching licenses for company', user.companyId);
    }

    // Use a database query that joins clients, companies, and products
    const query = `
      SELECT 
        l.*,
        c.name as clientName,
        c.email as clientEmail,
        c.company_id as clientCompanyId,
        comp.name as companyName,
        comp.parent_id as parentCompanyId,
        parent_comp.name as parentCompanyName,
        p.name as productName,
        p.version as productVersion
      FROM licenses l
      LEFT JOIN clients c ON l.client_id = c.id
      LEFT JOIN companies comp ON c.company_id = comp.id
      LEFT JOIN companies parent_comp ON comp.parent_id = parent_comp.id
      LEFT JOIN products p ON l.product_id = p.id
      ${whereClause}
      ORDER BY l.created_at DESC
    `;

    const rows = await database.query(query, queryParams);

    const mappedLicenses = rows.map((row: any) => ({
      id: row.id,
      activationKey: row.activation_key,
      client: {
        id: row.client_id,
        name: row.clientName,
        email: row.clientEmail,
        company_id: row.clientCompanyId
      },
      company: {
        id: row.clientCompanyId,
        name: row.companyName,
        parent_id: row.parentCompanyId
      },
      product: {
        id: row.product_id,
        name: row.productName,
        version: row.productVersion
      },
      status: row.status,
      licenseType: row.license_type,
      maxDevices: row.max_devices,
      maxUsers: row.max_users,
      expirationDate: row.expiration_date,
      expiryDate: row.expiration_date,
      isActive: row.is_active,
      lastActivation: row.last_activation,
      activationDate: row.activation_date,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      price: row.price,
      discount: row.discount,
      notes: row.notes,
      activeModules: row.active_modules ? JSON.parse(row.active_modules) : ['core'],
      // Additional fields for fallback display
      clientName: row.clientName,
      clientEmail: row.clientEmail,
      companyName: row.companyName,
      parentCompanyId: row.parentCompanyId,
      parentCompanyName: row.parentCompanyName
    }));

    licenses = mappedLicenses;
    console.log(`Licenses API returned ${licenses.length} licenses for user ${user.username}`);

    res.json(licenses);
  } catch (error) {
    console.error('Get licenses error:', error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/api/licenses/:id", authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const licenseId = req.params.id;

    console.log('Fetching license details for:', licenseId, 'by user:', user.username);

    // Enhanced query to get complete license details with client and company info
    const query = `
      SELECT 
        l.*,
        c.id as client_id,
        c.name as clientName,
        c.email as clientEmail,
        c.company_id as clientCompanyId,
        comp.id as company_id,
        comp.name as companyName,
        comp.parent_id as parentCompanyId,
        parent_comp.name as parentCompanyName,
        p.id as product_id,
        p.name as productName,
        p.version as productVersion
      FROM licenses l
      LEFT JOIN clients c ON l.client_id = c.id
      LEFT JOIN companies comp ON c.company_id = comp.id
      LEFT JOIN companies parent_comp ON comp.parent_id = parent_comp.id
      LEFT JOIN products p ON l.product_id = p.id
      WHERE l.id = ?
    `;

    const rows = await database.query(query, [licenseId]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "License not found" });
    }

    const row = rows[0];
    const licenseWithDetails = {
      id: row.id,
      activationKey: row.activation_key,
      client: {
        id: row.client_id,
        name: row.clientName,
        email: row.clientEmail,
        company_id: row.clientCompanyId
      },
      company: {
        id: row.company_id,
        name: row.companyName,
        parent_id: row.parentCompanyId
      },
      product: {
        id: row.product_id,
        name: row.productName,
        version: row.productVersion
      },
      status: row.status,
      licenseType: row.license_type,
      maxDevices: row.max_devices,
      maxUsers: row.max_users,
      expirationDate: row.expiration_date,
      expiryDate: row.expiration_date,
      activationDate: row.activation_date,
      isActive: row.is_active,
      lastActivation: row.last_activation,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      price: row.price,
      discount: row.discount,
      notes: row.notes,
      activeModules: row.active_modules ? JSON.parse(row.active_modules) : ['core'],
      // Additional fields for fallback display
      clientName: row.clientName,
      clientEmail: row.clientEmail,
      companyName: row.companyName,
      parentCompanyId: row.parentCompanyId,
      parentCompanyName: row.parentCompanyName
    };

    console.log('License details retrieved:', licenseWithDetails.activationKey);
    res.json(licenseWithDetails);
  } catch (error) {
    console.error('Get license details error:', error);
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

    console.log('Fetching device registrations for user:', user.username, 'Role:', user.role, 'Company ID:', user.companyId);

    // Get all company registrations
    const companies = await storage.getAllTestaRegAzienda();

    // Filter based on query parameters
    let filteredCompanies = companies;
    if (nomeSoftware) {
      filteredCompanies = companies.filter(company => 
        company.prodotto?.toLowerCase().includes((nomeSoftware as string).toLowerCase())
      );
    }

    // Build response with device details
    const registrations = [];
    for (const company of filteredCompanies) {
      const devices = await storage.getDettRegAziendaByPartitaIva(company.partitaIva);

      // Create a registration entry for each device
      for (const device of devices) {
        const hasLicense = company.idLicenza !== null;
        const registration = {
          id: `${company.partitaIva}-${device.id}`,
          partitaIva: company.partitaIva,
          nomeSoftware: company.prodotto,
          versione: company.versione,
          modulo: company.modulo,
          ragioneSociale: company.nomeAzienda,
          uidDispositivo: device.uidDispositivo,
          sistemaOperativo: device.sistemaOperativo,
          computerKey: device.computerKey,
          totaleOrdini: device.ordini,
          totaleVenduto: parseFloat(device.vendite || '0'),
          status: hasLicense ? 'classificato' : 'non_assegnato',
          clienteAssegnato: null, // Will be populated when license is assigned
          licenzaAssegnata: company.idLicenza,
          prodottoAssegnato: company.prodotto,
          note: device.note,
          primaRegistrazione: device.dataAttivazione,
          ultimaAttivita: device.dataUltimoAccesso,
          createdAt: device.createdAt,
          updatedAt: device.updatedAt
        };

        // Filter by status if specified
        if (!status || status === 'all' || registration.status === status) {
          registrations.push(registration);
        }
      }
    }

    console.log('Device registrations API returned', registrations.length, 'registrations for user', user.username);
    res.json(registrations);
  } catch (error) {
    console.error('Get device registrations error:', error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/api/software/registrazioni/:id", authenticateToken, async (req: Request, res: Response) => {
  try {
    const registrationId = req.params.id;
    // ID format: "partitaIva-deviceId"
    const [partitaIva, deviceId] = registrationId.split('-');

    if (!partitaIva || !deviceId) {
      return res.status(400).json({ message: "Invalid registration ID format" });
    }

    const company = await storage.getTestaRegAziendaByPartitaIva(partitaIva);
    const device = await storage.getDettRegAziendaById(parseInt(deviceId));

    if (!company || !device) {
      return res.status(404).json({ message: "Registration not found" });
    }

    const hasLicense = company.idLicenza !== null;
    const registration = {
      id: registrationId,
      partitaIva: company.partitaIva,
      nomeSoftware: company.prodotto,
      versione: company.versione,
      modulo: company.modulo,
      ragioneSociale: company.nomeAzienda,
      uidDispositivo: device.uidDispositivo,
      sistemaOperativo: device.sistemaOperativo,
      computerKey: device.computerKey,
      totaleOrdini: device.ordini,
      totaleVenduto: parseFloat(device.vendite || '0'),
      status: hasLicense ? 'classificato' : 'non_assegnato',
      clienteAssegnato: null,
      licenzaAssegnata: company.idLicenza,
      prodottoAssegnato: company.prodotto,
      note: device.note,
      primaRegistrazione: device.dataAttivazione,
      ultimaAttivita: device.dataUltimoAccesso,
      createdAt: device.createdAt,
      updatedAt: device.updatedAt
    };

    res.json(registration);
  } catch (error) {
    console.error('Get device registration error:', error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.patch("/api/software/registrazioni/:id/classifica", authenticateToken, async (req: Request, res: Response) => {
  try {
    const registrationId = req.params.id;
    const { aziendaAssegnata, clienteAssegnato, licenzaAssegnata, prodottoAssegnato, note, authorizeDevice = false } = req.body;

    console.log(`Classifying registration ${registrationId} with data:`, req.body);

    // ID format: "partitaIva-deviceId"
    const [partitaIva, deviceId] = registrationId.split('-');

    if (!partitaIva || !deviceId) {
      return res.status(400).json({ message: "Invalid registration ID format" });
    }

    // Handle license assignment or removal
    if (licenzaAssegnata) {
      console.log(`Activating license ${licenzaAssegnata} for registration ${registrationId}`);

      // Always activate the license when it's assigned through classification
      await storage.updateLicense(licenzaAssegnata, {
        status: 'attiva'
      });

      // Update company record with license assignment
      await storage.updateTestaRegAzienda(partitaIva, {
        idLicenza: licenzaAssegnata
      });

      console.log(`License ${licenzaAssegnata} activated and assigned to company ${partitaIva}`);
    } else if (licenzaAssegnata === null) {
      // Remove license assignment - set company license to null and suspend any existing license
      const company = await storage.getTestaRegAziendaByPartitaIva(partitaIva);
      
      if (company && company.idLicenza) {
        console.log(`Removing license assignment ${company.idLicenza} from registration ${registrationId}`);
        
        // Suspend the license instead of deactivating it completely
        await storage.updateLicense(company.idLicenza, {
          status: 'sospesa'
        });

        // Remove license assignment from company
        await storage.updateTestaRegAzienda(partitaIva, {
          idLicenza: null
        });

        console.log(`License assignment removed from company ${partitaIva}`);
      }
    }

    // Update device notes and computer key
    if (deviceId) {
      const deviceUpdates: any = {};

      if (note !== undefined) {
        deviceUpdates.note = note;
      }

      // Get current device to check if it already has a computer key
      const currentDevice = await storage.getDettRegAziendaById(parseInt(deviceId));

      // Handle device authorization
      if (authorizeDevice && !currentDevice?.computerKey) {
        // Generate new computer key if device should be authorized and doesn't have one
        const computerKey = `COMP-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
        deviceUpdates.computerKey = computerKey;
        console.log(`Generated new computer key ${computerKey} for device ${deviceId}`);
      } else if (!authorizeDevice) {
        // Remove computer key if authorization is being removed or assignment is being cleared
        if (currentDevice?.computerKey) {
          deviceUpdates.computerKey = null;
          console.log(`Removed computer key for device ${deviceId}`);
        }
      }

      if (Object.keys(deviceUpdates).length > 0) {
        await storage.updateDettRegAzienda(parseInt(deviceId), deviceUpdates);
      }
    }

    // Get updated registration data to return
    const company = await storage.getTestaRegAziendaByPartitaIva(partitaIva);
    const device = await storage.getDettRegAziendaById(parseInt(deviceId));

    if (!company || !device) {
      return res.status(404).json({ message: "Registration not found after update" });
    }

    const hasLicense = company.idLicenza !== null;
    const updatedRegistration = {
      id: registrationId,
      partitaIva: company.partitaIva,
      nomeSoftware: company.prodotto,
      versione: company.versione,
      modulo: company.modulo,
      ragioneSociale: company.nomeAzienda,
      uidDispositivo: device.uidDispositivo,
      sistemaOperativo: device.sistemaOperativo,
      computerKey: device.computerKey,
      totaleOrdini: device.ordini,
      totaleVenduto: parseFloat(device.vendite || '0'),
      status: hasLicense ? 'classificato' : 'non_assegnato',
      clienteAssegnato: clienteAssegnato || null,
      licenzaAssegnata: company.idLicenza,
      prodottoAssegnato: company.prodotto,
      note: device.note,
      primaRegistrazione: device.dataAttivazione,
      ultimaAttivita: device.dataUltimoAccesso,
      createdAt: device.createdAt,
      updatedAt: device.updatedAt
    };

    console.log('Device registration classified successfully:', updatedRegistration);
    res.json(updatedRegistration);
  } catch (error) {
    console.error('Classify device registration error:', error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
});

router.post("/api/licenses/from-registration", authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const {
      registrationId,
      clientId,
      productId,
      licenseType,
      maxUsers,
      maxDevices,
      price
    } = req.body;

    // Get the registration to validate
    const registration = await storage.getSoftwareRegistration(registrationId);
    if (!registration) {
      return res.status(404).json({ message: "Registration not found" });
    }

    // Validate that the user can create licenses for the specified client
    const client = await storage.getClientById(clientId);
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    // Check permissions based on user role
    if (user.role !== 'superadmin') {
      let hasPermission = false;

      if (user.role === 'admin') {
        const companyIds = await storage.getCompanyHierarchy(user.companyId);
        hasPermission = companyIds.includes(client.company_id || client.companyId);
      } else {
        hasPermission = (client.company_id || client.companyId) === user.companyId;
      }

      if (!hasPermission) {
        return res.status(403).json({ message: "Not authorized to create license for this client" });
      }
    }

    const licenseData = {
      clientId,
      productId,
      licenseType: licenseType || 'abbonamento',
      maxUsers: maxUsers || 1,
      maxDevices: maxDevices || 1,
      price: price || 0,
      discount: 0,
      status: 'attiva',
      activeModules: ['core'],
      assignedCompany: client.company_id || client.companyId,
      assignedAgent: user.id,
      computerKey: registration.computerKey || null,
      notes: `Creata da registrazione software: ${registration.nomeSoftware} v${registration.versione}`
    };

    console.log('Creating license from registration with data:', licenseData);
    const license = await storage.createLicense(licenseData);

    // Update registration status to "licenziato"
    await storage.updateSoftwareRegistration(registrationId, {
      status: 'licenziato',
      licenzaAssegnata: license.id
    });

    console.log('License created successfully from registration:', license.id);
    res.json(license);
  } catch (error) {
    console.error('Create license from registration error:', error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/api/clients", authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const clientData = {
      ...req.body,
      id: nanoid(),
      createdAt: new Date().toISOString()
    };

    // Check permissions based on user role
    if (user.role !== 'superadmin' && user.role !== 'admin') {
      return res.status(403).json({ message: "Not authorized to create clients" });
    }

    // Validate company assignment for admin users
    if (user.role === 'admin' && clientData.companyId) {
      const companyIds = await storage.getCompanyHierarchy(user.companyId);
      if (!companyIds.includes(clientData.companyId)) {
        return res.status(403).json({ message: "Not authorized to create client for this company" });
      }
    }

    const client = await storage.createClient(clientData);
    res.json(client);
  } catch (error) {
    console.error('Create client error:', error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/api/clienti/registrazione", authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { name, email, companyId, status, isMultiSite, isMultiUser, contactInfo } = req.body;

    // Check permissions based on user role
    if (user.role !== 'superadmin' && user.role !== 'admin') {
      return res.status(403).json({ message: "Not authorized to create clients" });
    }

    // Validate company assignment for admin users
    if (user.role === 'admin' && companyId) {
      const companyIds = await storage.getCompanyHierarchy(user.companyId);
      if (!companyIds.includes(companyId)) {
        return res.status(403).json({ message: "Not authorized to create client for this company" });
      }
    }

    const clientData = {
      id: nanoid(),
      name,
      email,
      companyId: companyId || user.companyId,
      status: status || 'in_attesa',
      isMultiSite: isMultiSite || false,
      isMultiUser: isMultiUser || false,
      contactInfo: contactInfo || {},
      createdAt: new Date().toISOString()
    };

    const client = await storage.createClient(clientData);
    console.log('Created new client:', client.name, 'for company:', clientData.companyId);
    res.json(client);
  } catch (error) {
    console.error('Create client registration error:', error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Update client
router.patch("/api/clients/:id", authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const clientId = req.params.id;
    const updateData = req.body;

    console.log('Client update request for:', clientId, 'by user:', user.username);
    console.log('Update data:', updateData);

    // Get the existing client to check permissions
    const existingClient = await storage.getClientById(clientId);
    if (!existingClient) {
      return res.status(404).json({ message: "Client not found" });
    }

    // Check permissions based on user role
    if (user.role !== 'superadmin') {
      let hasPermission = false;

      if (user.role === 'admin') {
        // Admin can update clients in their company hierarchy
        const companyIds = await storage.getCompanyHierarchy(user.companyId);
        hasPermission = companyIds.includes(existingClient.company_id || existingClient.companyId);
      } else {
        // Other roles can only update clients in their own company
        hasPermission = (existingClient.company_id || existingClient.companyId) === user.companyId;
      }

      if (!hasPermission) {
        return res.status(403).json({ message: "Not authorized to update this client" });
      }
    }

    // Update the client
    const updatedClient = await storage.updateClient(clientId, updateData);
    console.log('Client updated successfully:', updatedClient.name);
    res.json(updatedClient);
  } catch (error) {
    console.error('Update client error:', error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.delete("/api/clients/:id", authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const clientId = req.params.id;

    // Only superadmin can delete clients
    if (user.role !== 'superadmin') {
      return res.status(403).json({ message: "Only superadmin can delete clients" });
    }

    const existingClient = await storage.getClientById(clientId);
    if (!existingClient) {
      return res.status(404).json({ message: "Client not found" });
    }

    await storage.deleteClient(clientId);
    res.json({ message: "Client deleted successfully" });
  } catch (error) {
    console.error('Delete client error:', error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/api/licenses", authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const {
      clientId,
      productId,
      licenseType,
      maxUsers,
      maxDevices,
      price,
      discount,
      status,
      activeModules
    } = req.body;

    // Validate required fields
    if (!clientId) {
      return res.status(400).json({ message: "Client is required" });
    }
    if (!productId) {
      return res.status(400).json({ message: "Product is required" });
    }

    // Validate client
    const client = await storage.getClientById(clientId);
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

    // Validate product
    const product = await storage.getProduct(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const licenseData = {
      clientId,
      productId,
      licenseType,
      maxUsers: maxUsers || 1,
      maxDevices: maxDevices || 1,
      price: price || 0,
      discount: discount || 0,
      status: status || 'in_attesa_convalida',
      activeModules: activeModules || ['core'],
      assignedCompany: client.company_id || client.companyId,
      assignedAgent: user.id,
      activationKey: req.body.activationKey || undefined,
      computerKey: req.body.computerKey || undefined
    };

    console.log('Creating license with data:', licenseData);
    const license = await storage.createLicense(licenseData);

    console.log('License created successfully:', license.id);
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
    const existingLicense = await storage.getLicense(licenseId);
    if (!existingLicense) {
      return res.status(404).json({ message: "License not found" });
    }

    // Check if this license was created from a software registration (classified license)
    const isClassifiedLicense = existingLicense.notes && existingLicense.notes.includes('registrazione software');

    // Only superadmin can modify classified licenses
    if (isClassifiedLicense && user.role !== 'superadmin') {
      return res.status(403).json({ 
        message: "Solo il superadmin può modificare le licenze classificate dalle registrazioni software" 
      });
    }

    // Check permissions based on user role for regular licenses
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
    const existingLicense = await storage.getLicense(licenseId);
    if (!existingLicense) {
      return res.status(404).json({ message: "License not found" });
    }

    // Check if this license was created from a software registration (classified license)
    const isClassifiedLicense = existingLicense.notes && existingLicense.notes.includes('registrazione software');

    // Only superadmin can delete licenses, especially classified ones
    if (user.role !== 'superadmin') {
      if (isClassifiedLicense) {
        return res.status(403).json({ 
          message: "Solo il superadmin può eliminare le licenze classificate dalle registrazioni software" 
        });
      } else {
        return res.status(403).json({ message: "Only superadmin can delete licenses" });
      }
    }

    await storage.deleteLicense(licenseId);
    res.json({ message: "License deleted successfully" });
  } catch (error) {
    console.error('Delete license error:', error);
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

    // Check if username is being changed and if it already exists
    if (updates.username) {
      const existingUser = await storage.getUserByUsername(updates.username);
      if (existingUser && existingUser.id !== userId) {
        return res.status(400).json({ message: "Username already exists" });
      }
    }

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

      // Admin cannot change company assignment outside their hierarchy
      if (updates.companyId && req.user.companyId) {
        const hierarchy = await storage.getCompanyHierarchy(req.user.companyId);
        if (!hierarchy.includes(updates.companyId)) {
          return res.status(403).json({ message: "Cannot assign users to companies outside your hierarchy" });
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

// Transaction routes
router.get("/api/transactions", authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    console.log('Fetching transactions for user:', user.username, 'Role:', user.role, 'Company ID:', user.companyId);

    let transactions;

    if (user.role === 'superadmin') {
      // Superadmin can see all transactions
      transactions = await storage.getAllTransactions();
      console.log('Superadmin: fetched all', transactions.length, 'transactions');
    } else if (user.role === 'admin') {
      // Admin can see transactions from their company hierarchy
      transactions = await storage.getTransactionsByCompanyHierarchy(user.companyId);
      console.log('Admin: fetched', transactions.length, 'transactions in company hierarchy', user.companyId);
    } else {
      // Other roles can only see transactions from their own company
      transactions = await storage.getTransactionsByCompany(user.companyId);
      console.log('User role', user.role, ': fetched', transactions.length, 'transactions from company', user.companyId);
    }

    res.json(transactions);
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/api/transactions", authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const transactionData = {
      ...req.body,
      id: nanoid(),
      createdAt: new Date().toISOString()
    };

    // Check permissions based on user role
    if (user.role !== 'superadmin' && user.role !== 'admin') {
      return res.status(403).json({ message: "Not authorized to create transactions" });
    }

    const transaction = await storage.createTransaction(transactionData);
    res.json(transaction);
  } catch (error) {
    console.error('Create transaction error:', error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.put("/api/products/:id", authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const productId = req.params.id;
    const { name, version, description, supportedLicenseTypes } = req.body;

    // Only superadmin and admin can update products
    if (user.role !== 'superadmin' && user.role !== 'admin') {
      return res.status(403).json({ message: "Not authorized to update products" });
    }

    const existingProduct = await storage.getProductById(productId);
    if (!existingProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    const updatedProduct = await storage.updateProduct(productId, {
      name,
      version,
      description,
      supportedLicenseTypes
    });

    res.json(updatedProduct);
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.delete("/api/products/:id", authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const productId = req.params.id;

    // Only superadmin can delete products
    if (user.role !== 'superadmin') {
      return res.status(403).json({ message: "Only superadmin can delete products" });
    }

    const existingProduct = await storage.getProductById(productId);
    if (!existingProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Check if product has active licenses
    const productLicenses = await storage.getLicensesByProduct(productId);
    if (productLicenses.length > 0) {
      return res.status(400).json({ 
        message: "Cannot delete product with active licenses. Please remove all licenses first." 
      });
    }

    await storage.deleteProduct(productId);
    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.delete("/api/transactions/:id", authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const transactionId = req.params.id;

    // Only superadmin can delete transactions
    if (user.role !== 'superadmin') {
      return res.status(403).json({ message: "Only superadmin can delete transactions" });
    }

    const existingTransaction = await storage.getTransactionById(transactionId);
    if (!existingTransaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    await storage.deleteTransaction(transactionId);
    res.json({ message: "Transaction deleted successfully" });
  } catch (error) {
    console.error('Delete transaction error:', error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Device Registration API - New endpoint for device registration
router.post("/api/device-registration", async (req: Request, res: Response) => {
  try {
    const {
      partitaIva,
      nomeAzienda,
      prodotto,
      versione,
      modulo,
      uidDispositivo,
      sistemaOperativo,
      computerKey,
      note
    } = req.body;

    // Input validation
    if (!partitaIva || !nomeAzienda || !prodotto || !uidDispositivo) {
      return res.status(400).json({ 
        message: "Campi obbligatori: partitaIva, nomeAzienda, prodotto, uidDispositivo" 
      });
    }

    // Step 1: Check/Create Testa_Reg_Azienda entry
    let testaReg = await storage.getTestaRegAziendaByPartitaIva(partitaIva);

    if (!testaReg) {
      // Create new company registration
      testaReg = await storage.createTestaRegAzienda({
        partitaIva,
        nomeAzienda,
        prodotto,
        versione: versione || null,
        modulo: modulo || null,
        utenti: 1,
        totDispositivi: 1,
        idLicenza: null, // Initially no license assigned
        totOrdini: 0,
        totVendite: "0.00"
      });
    } else {
      // Update device count
      await storage.updateTestaRegAzienda(partitaIva, {
        totDispositivi: (testaReg.totDispositivi || 0) + 1
      });
    }

    // Step 2: Register the specific device
    const now = new Date();
    const deviceData = {
      partitaIva,
      uidDispositivo,
      sistemaOperativo: sistemaOperativo || null,
      note: note || null,
      dataAttivazione: now.toISOString().split('T')[0], // Today's date as YYYY-MM-DD
      dataUltimoAccesso: now.toISOString().replace('T', ' ').split('.')[0], // MySQL DATETIME format
      ordini: 0,
      vendite: "0.00",
      computerKey: computerKey || null
    };

    const dettReg = await storage.createDettRegAzienda(deviceData);

    // Step 3: Determine response based on license assignment
    let response = {
      registrationId: dettReg.id,
      partitaIva: partitaIva,
      nomeAzienda: nomeAzienda,
      uidDispositivo: uidDispositivo,
      registrationStatus: "accepted", // Always accept initial registrations
      deviceAuthorized: false,
      licenseValidityDays: 0,
      message: "Registrazione accettata. In attesa di assegnazione licenza."
    };

    // If license is already assigned, check validity and authorization
    if (testaReg.idLicenza) {
      const license = await storage.getLicense(testaReg.idLicenza);

      if (license) {
        // Calculate remaining days
        let validityDays = 0;
        if (license.expiryDate) {
          const expiryDate = new Date(license.expiryDate);
          const today = new Date();
          const timeDiff = expiryDate.getTime() - today.getTime();
          validityDays = Math.ceil(timeDiff / (1000 * 3600 * 24));
        } else {
          validityDays = -1; // Permanent license
        }

        // Check if specific device is authorized (device has computer key assigned)
        const currentDevice = await storage.getDettRegAziendaByComputerKey(computerKey);
        const deviceAuthorized = currentDevice && currentDevice.computerKey === computerKey;

        response = {
          ...response,
          deviceAuthorized: deviceAuthorized || false,
          licenseValidityDays: validityDays,
          message: deviceAuthorized 
            ? `Dispositivo autorizzato. Licenza valida per ${validityDays > 0 ? validityDays + ' giorni' : 'sempre'}.`
            : `Licenza assegnata ma dispositivo non autorizzato. Validità: ${validityDays > 0 ? validityDays + ' giorni' : 'sempre'}.`
        };
      }
    }

    res.status(201).json(response);

  } catch (error) {
    console.error('Device registration error:', error);
    res.status(500).json({ 
      message: "Errore interno del server durante la registrazione", 
      error: error.message 
    });
  }
});

// Get device registrations by company
router.get("/api/device-registrations/:partitaIva", authenticateToken, async (req: Request, res: Response) => {
  try {
    const { partitaIva } = req.params;

    const testaReg = await storage.getTestaRegAziendaByPartitaIva(partitaIva);
    if (!testaReg) {
      return res.status(404).json({ message: "Azienda non trovata" });
    }

    const devices = await storage.getDettRegAzienda(partitaIva);

    res.json({
      company: testaReg,
      devices: devices
    });
  } catch (error) {
    console.error('Get device registrations error:', error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Assign license to company (manual process)
router.post("/api/assign-license-to-company", authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { partitaIva, licenseId, authorizedDevices } = req.body;

    // Only admin/superadmin can assign licenses
    if (user.role !== 'superadmin' && user.role !== 'admin') {
      return res.status(403).json({ message: "Accesso negato" });
    }

    // Update Testa_Reg_Azienda with license assignment
    await storage.updateTestaRegAzienda(partitaIva, { idLicenza: licenseId });

    // If specific devices are authorized, assign computer keys to them
    if (authorizedDevices && Array.isArray(authorizedDevices)) {
      for (const deviceId of authorizedDevices) {
        // Generate a unique computer key for this device
        const computerKey = `COMP-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
        await storage.updateDettRegAzienda(deviceId, { 
          computerKey: computerKey 
        });
      }
    }

    res.json({ message: "Licenza assegnata con successo" });
  } catch (error) {
    console.error('Assign license error:', error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Delete software registration
router.delete("/api/software/registrazioni/:id", authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const registrationId = req.params.id;

    // Only admin/superadmin can delete registrations
    if (user.role !== 'superadmin' && user.role !== 'admin') {
      return res.status(403).json({ message: "Accesso negato" });
    }

    // ID format: "partitaIva-deviceId"
    const [partitaIva, deviceId] = registrationId.split('-');

    if (!partitaIva || !deviceId) {
      return res.status(400).json({ message: "Invalid registration ID format" });
    }

    console.log(`Deleting registration ${registrationId} - Device ${deviceId} from company ${partitaIva}`);

    // First, delete the specific device
    await storage.deleteDettRegAzienda(parseInt(deviceId));
    console.log(`Deleted device ${deviceId} from Dett_Reg_Azienda`);

    // Check if there are any remaining devices for this company
    const remainingDevices = await storage.getDettRegAzienda(partitaIva);

    // If no devices remain, delete the company entry too
    if (remainingDevices.length === 0) {
      await storage.deleteTestaRegAzienda(partitaIva);
      console.log(`Deleted company ${partitaIva} from Testa_Reg_Azienda (no devices remaining)`);
    } else {
      // Update the device count
      await storage.updateTestaRegAzienda(partitaIva, {
        totDispositivi: remainingDevices.length
      });
      console.log(`Updated device count for company ${partitaIva} to ${remainingDevices.length}`);
    }

    res.json({ message: "Registrazione eliminata con successo" });
  } catch (error) {
    console.error('Delete software registration error:', error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Software registration endpoint (anonymous - for client software registrations)
router.post("/api/software/register", async (req: Request, res: Response) => {
  try {
    const {
      nomeAzienda,
      partitaIva,
      nomeSoftware,
      versione,
      computerKey,
      installationPath,
      machineInfo,
      registrationDate
    } = req.body;

    // Input validation
    if (!partitaIva || !nomeAzienda || !nomeSoftware || !computerKey) {
      return res.status(400).json({ 
        message: "Campi obbligatori: partitaIva, nomeAzienda, nomeSoftware, computerKey" 
      });
    }

    // Step 1: Check/Create Testa_Reg_Azienda entry
    let testaReg = await storage.getTestaRegAziendaByPartitaIva(partitaIva);

    if (!testaReg) {
      // Create new company registration
      testaReg = await storage.createTestaRegAzienda({
        partitaIva,
        nomeAzienda,
        prodotto: nomeSoftware,
        versione: versione || null,
        modulo: null,
        utenti: 1,
        totDispositivi: 1,
        idLicenza: null, // Initially no license assigned
        totOrdini: 0,
        totVendite: "0.00"
      });
    } else {
      // Update device count
      await storage.updateTestaRegAzienda(partitaIva, {
        totDispositivi: (testaReg.totDispositivi || 0) + 1
      });
    }

    // Step 2: Register the specific device
    const now = new Date();
    const deviceData = {
      partitaIva,
      uidDispositivo: computerKey, // Use computerKey as unique device identifier
      sistemaOperativo: machineInfo || null,
      note: installationPath ? `Percorso: ${installationPath}` : null,
      dataAttivazione: now.toISOString().split('T')[0], // Today's date as YYYY-MM-DD
      dataUltimoAccesso: now.toISOString().replace('T', ' ').split('.')[0], // MySQL DATETIME format
      ordini: 0,
      vendite: "0.00",
      computerKey: computerKey
    };

    const dettReg = await storage.createDettRegAzienda(deviceData);

    // Step 3: Return successful registration response
    const response = {
      success: true,
      testaId: testaReg.id,
      dettId: dettReg.id,
      partitaIva: partitaIva,
      nomeAzienda: nomeAzienda,
      nomeSoftware: nomeSoftware,
      computerKey: computerKey,
      registrationStatus: "accepted",
      deviceAuthorized: false,
      licenseValidityDays: 0,
      message: "Registrazione software completata con successo. In attesa di classificazione amministratore."
    };

    console.log(`Software registration completed: ${nomeAzienda} - ${computerKey}`);
    res.json(response);
  } catch (error) {
    console.error('Software registration error:', error);
    res.status(500).json({ 
      success: false,
      message: "Errore interno del server durante la registrazione" 
    });
  }
});

export default function registerRoutes(app: express.Express): void {
  app.use(router);
}