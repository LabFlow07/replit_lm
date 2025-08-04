
import express, { type Request, type Response } from "express";
import { nanoid } from "nanoid";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { database } from "./database";
import { storage } from "./storage";

const router = express.Router();

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// Middleware to verify JWT token
const authenticateToken = (req: Request, res: Response, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) {
    return res.sendStatus(401);
  }

  jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
    if (err) {
      console.log('Token verification error:', err);
      return res.sendStatus(403);
    }
    
    console.log('Token payload on validation:', decoded);
    console.log('CompanyId from token:', decoded.companyId);
    
    (req as any).user = decoded;
    next();
  });
};

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

router.post("/api/login", async (req: Request, res: Response) => {
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

export default function registerRoutes(app: express.Express): void {
  app.use(router);
}
