import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { database } from "./database";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { Request, Response } from 'express';
import { insertSoftwareRegistrationSchema } from '@shared/schema';

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
    console.log('Token decoded for user:', decoded.username, 'Role:', decoded.role);

    // Get fresh user data with company info using username
    const userWithCompany = await storage.getUserByUsername(decoded.username);
    if (!userWithCompany) {
      console.log('User not found in database:', decoded.username);
      return res.status(403).json({ message: 'Invalid token' });
    }

    console.log('Authenticated user:', userWithCompany.username, 'Role:', userWithCompany.role, 'Company ID:', userWithCompany.companyId);
    req.user = userWithCompany;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
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

  // Create shadow test user if not exists
  const shadowUser = await storage.getUserByUsername('shadow');
  if (!shadowUser) {
    // Find Shadow company
    const companies = await storage.getCompanies();
    const shadowCompany = companies.find(c => c.name === 'Shadow');
    
    if (shadowCompany) {
      await storage.createUser({
        username: 'shadow',
        password: 'shadow123',
        role: 'admin',
        name: 'Shadow Admin',
        email: 'admin@shadow.com',
        companyId: shadowCompany.id
      });
      console.log('Shadow admin user created: shadow/shadow123');
    }
  }

  // Create test licenses for Shadow company if they don't exist
  const shadowCompany = await storage.getCompanies().then(companies => 
    companies.find(c => c.name === 'Shadow')
  );
  
  if (shadowCompany) {
    const shadowClients = await storage.getClientsByCompanyAndSubcompanies(shadowCompany.id);
    console.log(`Found ${shadowClients.length} clients in Shadow hierarchy`);
    
    if (shadowClients.length > 0) {
      const products = await storage.getProducts();
      const testProduct = products[0]; // Use first available product
      
      if (testProduct) {
        // Check if licenses already exist for Shadow clients
        const existingLicenses = await storage.getLicensesByCompanyHierarchy(shadowCompany.id);
        console.log(`Found ${existingLicenses.length} existing licenses for Shadow hierarchy`);
        
        if (existingLicenses.length === 0) {
          // Create a test license for the barlume client
          const barlumeclient = shadowClients.find(c => c.name === 'barlume');
          if (barlumeclient) {
            console.log('Creating test license for barlume client');
            await storage.createLicense({
              clientId: barlumeclient.id,
              productId: testProduct.id,
              activationKey: 'LIC-SHADOW-TEST-001',
              computerKey: null,
              activationDate: null,
              expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
              licenseType: 'permanente',
              status: 'attiva',
              maxUsers: 1,
              maxDevices: 1,
              price: 500,
              discount: 0,
              activeModules: ['core'],
              assignedCompany: shadowCompany.id,
              assignedAgent: null
            });
            console.log('Test license created for Shadow hierarchy');
          }
        }
      }
    }
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

    // Create demo software registrations
    const demoRegistrations = [
      {
        nomeSoftware: 'QLM Professional',
        versione: '2024.1',
        ragioneSociale: 'Rossi Consulting SRL',
        partitaIva: 'IT12345678901',
        totaleOrdini: 15,
        totaleVenduto: '45000.00',
        sistemaOperativo: 'Windows 11 Pro',
        indirizzoIp: '192.168.1.101',
        computerKey: 'COMP-ROSSI-001',
        installationPath: 'C:\\Program Files\\QLM Professional',
        status: 'non_assegnato',
        note: 'Prima installazione del software presso il cliente'
      },
      {
        nomeSoftware: 'DataGuard Pro',
        versione: '3.5.2',
        ragioneSociale: 'TechCorp Italia',
        partitaIva: 'IT98765432109',
        totaleOrdini: 8,
        totaleVenduto: '12500.00',
        sistemaOperativo: 'Windows Server 2022',
        indirizzoIp: '10.0.0.50',
        computerKey: 'COMP-TECH-SRV01',
        installationPath: 'C:\\Program Files\\DataGuard Pro',
        status: 'classificato',
        clienteAssegnato: client2?.id,
        prodottoAssegnato: null, // Sarà assegnato tramite UI
        note: 'Software installato su server principale'
      },
      {
        nomeSoftware: 'WebSecure Suite',
        versione: '1.8.0',
        ragioneSociale: 'Innovate Solutions',
        partitaIva: 'IT11223344556',
        totaleOrdini: 3,
        totaleVenduto: '8900.00',
        sistemaOperativo: 'Ubuntu Server 22.04',
        indirizzoIp: '172.16.0.25',
        computerKey: 'COMP-INNOV-WEB01',
        installationPath: '/opt/websecure',
        status: 'non_assegnato',
        note: 'Installazione su ambiente di produzione'
      },
      {
        nomeSoftware: 'QLM Starter',
        versione: '2024.1',
        ragioneSociale: 'Ferrari Development',
        partitaIva: 'IT55667788990',
        totaleOrdini: 2,
        totaleVenduto: '998.00',
        sistemaOperativo: 'Windows 10 Professional',
        indirizzoIp: '192.168.0.15',
        computerKey: 'COMP-FERRARI-DEV',
        installationPath: 'C:\\Program Files (x86)\\QLM Starter',
        status: 'licenziato',
        clienteAssegnato: client5.id,
        licenzaAssegnata: null,
        note: 'Versione starter per sviluppatore singolo'
      },
      {
        nomeSoftware: 'QLM Professional',
        versione: '2024.2',
        ragioneSociale: 'Enterprise Corp',
        partitaIva: 'IT33445566778',
        totaleOrdini: 25,
        totaleVenduto: '67500.00',
        sistemaOperativo: 'Windows 11 Enterprise',
        indirizzoIp: '10.10.0.100',
        computerKey: 'COMP-ENT-MAIN01',
        installationPath: 'C:\\Program Files\\QLM Professional',
        status: 'non_assegnato',
        note: 'Installazione su workstation principale'
      },
      {
        nomeSoftware: 'DataGuard Pro',
        versione: '3.6.0',
        ragioneSociale: 'Southern Tech SRL',
        partitaIva: 'IT77889900112',
        totaleOrdini: 12,
        totaleVenduto: '18750.00',
        sistemaOperativo: 'CentOS 8',
        indirizzoIp: '172.20.1.45',
        computerKey: 'COMP-SOUTH-BAK01',
        installationPath: '/usr/local/dataguard',
        status: 'classificato',
        clienteAssegnato: client7.id,
        note: 'Server di backup aziendale'
      },
      {
        nomeSoftware: 'WebSecure Suite',
        versione: '1.7.5',
        ragioneSociale: 'Verdi Systems',
        partitaIva: 'IT99887766554',
        totaleOrdini: 5,
        totaleVenduto: '6450.00',
        sistemaOperativo: 'Windows Server 2019',
        indirizzoIp: '192.168.100.200',
        computerKey: 'COMP-VERDI-SEC01',
        installationPath: 'C:\\Program Files\\WebSecure Suite',
        status: 'non_assegnato',
        note: 'Firewall e protezione web aziendale'
      },
      {
        nomeSoftware: 'QLM Enterprise',
        versione: '2024.2',
        ragioneSociale: 'Sicilia Software',
        partitaIva: 'IT44556677889',
        totaleOrdini: 35,
        totaleVenduto: '125000.00',
        sistemaOperativo: 'Red Hat Enterprise Linux 9',
        indirizzoIp: '10.5.0.75',
        computerKey: 'COMP-SIC-ENT01',
        installationPath: '/opt/qlm-enterprise',
        status: 'classificato',
        clienteAssegnato: client9.id,
        note: 'Installazione enterprise per gestione licenze massive'
      },
      {
        nomeSoftware: 'QLM Professional',
        versione: '2023.12',
        ragioneSociale: 'Toscana Digital',
        partitaIva: 'IT22334455667',
        totaleOrdini: 7,
        totaleVenduto: '10500.00',
        sistemaOperativo: 'macOS Sonoma 14.2',
        indirizzoIp: '192.168.50.30',
        computerKey: 'COMP-TOSC-MAC01',
        installationPath: '/Applications/QLM Professional.app',
        status: 'non_assegnato',
        note: 'Installazione su ambiente Mac per sviluppo'
      },
      {
        nomeSoftware: 'DataGuard Pro',
        versione: '3.4.8',
        ragioneSociale: 'StartupTech',
        partitaIva: 'IT66778899001',
        totaleOrdini: 1,
        totaleVenduto: '1999.00',
        sistemaOperativo: 'Windows 11 Home',
        indirizzoIp: '192.168.1.50',
        computerKey: 'COMP-START-PC01',
        installationPath: 'C:\\Program Files\\DataGuard Pro',
        status: 'non_assegnato',
        note: 'Prima installazione per startup in fase di test'
      }
    ];

    // Create software registrations using the API endpoint logic
    for (const regData of demoRegistrations) {
      try {
        const existingReg = await storage.getSoftwareRegistrationByComputerKey(regData.computerKey);
        if (!existingReg) {
          await storage.createSoftwareRegistration({
            nomeSoftware: regData.nomeSoftware,
            versione: regData.versione,
            ragioneSociale: regData.ragioneSociale,
            partitaIva: regData.partitaIva,
            totaleOrdini: regData.totaleOrdini,
            totaleVenduto: regData.totaleVenduto,
            sistemaOperativo: regData.sistemaOperativo,
            indirizzoIp: regData.indirizzoIp,
            computerKey: regData.computerKey,
            installationPath: regData.installationPath,
            status: regData.status,
            clienteAssegnato: regData.clienteAssegnato,
            licenzaAssegnata: regData.licenzaAssegnata,
            note: regData.note
          });
        }
      } catch (error) {
        console.error(`Error creating software registration for ${regData.ragioneSociale}:`, error);
      }
    }

    console.log('Extended demo data created successfully with multiple clients, products, licenses and software registrations');
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

      console.log('User data before creating token:', {
        id: user.id,
        username: user.username,
        role: user.role,
        companyId: user.companyId,
        company: user.company
      });

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

      console.log(`Login successful for user ${user.username}, JWT payload will contain companyId:`, user.companyId);

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

  // Software Registration Endpoint (senza autenticazione per i client software)
  app.post('/api/software/registrazione', async (req, res) => {
    try {
      const registrationData = req.body;

      // Validazione dei dati
      const validatedData = insertSoftwareRegistrationSchema.parse({
        nomeSoftware: registrationData.nomeSoftware,
        versione: registrationData.versione,
        ragioneSociale: registrationData.ragioneSociale,
        partitaIva: registrationData.partitaIva,
        totaleOrdini: registrationData.totaleOrdini || 0,
        totaleVenduto: registrationData.totaleVenduto || '0.00',
        sistemaOperativo: registrationData.sistemaOperativo,
        indirizzoIp: req.ip || req.connection.remoteAddress,
        computerKey: registrationData.computerKey,
        installationPath: registrationData.installationPath,
        status: 'non_assegnato',
        note: registrationData.note
      });

      // Verifica se esiste già una registrazione con lo stesso computer key
      const existingRegistration = await storage.getSoftwareRegistrationByComputerKey(validatedData.computerKey);

      if (existingRegistration) {
        // Aggiorna la registrazione esistente
        const updatedRegistration = await storage.updateSoftwareRegistration(existingRegistration.id, {
          ...validatedData,
          ultimaAttivita: new Date()
        });

        res.json({
          status: 'updated',
          message: 'Registrazione software aggiornata',
          registrationId: updatedRegistration.id
        });
      } else {
        // Crea una nuova registrazione
        const registration = await storage.createSoftwareRegistration(validatedData);

        res.status(201).json({
          status: 'created',
          message: 'Software registrato con successo',
          registrationId: registration.id
        });
      }
    } catch (error) {
      console.error('Software registration error:', error);
      res.status(400).json({
        status: 'error',
        message: 'Errore durante la registrazione del software',
        details: error instanceof z.ZodError ? error.errors : undefined
      });
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

      console.log(`GET /api/licenses/expiring - User: ${userWithCompany?.username}, Role: ${userWithCompany?.role}, Company ID: ${userWithCompany?.companyId}`);

      // If user is admin (not superadmin), filter by their company hierarchy
      if (userWithCompany?.role === 'admin' && userWithCompany?.companyId) {
        console.log(`Admin ${userWithCompany.username} filtering expiring licenses for company hierarchy starting from:`, userWithCompany.companyId);
        licenses = await storage.getLicensesExpiringByCompanyHierarchy(userWithCompany.companyId);
        console.log(`Admin ${userWithCompany.username} found ${licenses.length} expiring licenses in hierarchy`);
      } else if (userWithCompany?.role === 'superadmin') {
        // Superadmin can see all expiring licenses
        licenses = await storage.getLicensesExpiringByDate();
        console.log(`Superadmin ${userWithCompany.username} returning all expiring licenses`);
      } else {
        // Other roles get basic filtering
        licenses = await storage.getLicensesExpiringByDate();
        console.log(`Other role ${userWithCompany?.role} - returning basic filtered expiring licenses`);
      }

      console.log(`GET /api/licenses/expiring - User: ${userWithCompany?.username} (${userWithCompany?.role}) - Company: ${userWithCompany?.company?.name} - Returning ${licenses.length} expiring licenses`);
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

      console.log(`GET /api/licenses - User: ${userWithCompany?.username}, Role: ${userWithCompany?.role}, Company ID: ${userWithCompany?.companyId}`);

      // If user is admin (not superadmin), filter by their company hierarchy
      if (userWithCompany?.role === 'admin' && userWithCompany?.companyId) {
        console.log(`Admin ${userWithCompany.username} filtering licenses for company hierarchy starting from:`, userWithCompany.companyId);
        licenses = await storage.getLicensesByCompanyHierarchy(userWithCompany.companyId);
        console.log(`Admin ${userWithCompany.username} found ${licenses.length} licenses in hierarchy`);
      } else if (userWithCompany?.role === 'superadmin') {
        // Superadmin can see all licenses
        licenses = await storage.getLicenses(req.query);
        console.log(`Superadmin ${userWithCompany.username} returning all licenses`);
      } else {
        // Other roles get basic filtering
        licenses = await storage.getLicenses(req.query);
        console.log(`Other role ${userWithCompany?.role} - returning basic filtered licenses`);
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

      console.log(`GET /api/clients - User: ${userWithCompany?.username}, Role: ${userWithCompany?.role}, Company ID: ${userWithCompany?.companyId}`);

      // If user is admin (not superadmin), filter by their company hierarchy
      if (userWithCompany?.role === 'admin' && userWithCompany?.companyId) {
        console.log(`Admin ${userWithCompany.username} filtering clients for company hierarchy starting from:`, userWithCompany.companyId);
        clients = await storage.getClientsByCompanyAndSubcompanies(userWithCompany.companyId);
        console.log(`Admin ${userWithCompany.username} found ${clients.length} clients in hierarchy for companies:`, userWithCompany.companyId);
      } else if (userWithCompany?.role === 'superadmin') {
        // Superadmin can see all clients
        clients = await storage.getClients();
        console.log(`Superadmin ${userWithCompany.username} returning all clients`);
      } else {
        // Other roles get filtered by their company only
        clients = await storage.getClients(userWithCompany?.companyId || undefined);
        console.log(`Other role ${userWithCompany?.role} - filtering by company: ${userWithCompany?.companyId}`);
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
  app.put('/api/licenses/:id', authenticateToken, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const licenseData = req.body;

      const updated = await storage.updateLicense(id, licenseData);
      if (!updated) {
        return res.status(404).json({ message: 'License not found' });
      }

      res.json(updated);
    } catch (error) {
      console.error('Error updating license:', error);
      res.status(500).json({ message: 'Failed to update license' });
    }
  });

  // License actions (suspend/activate)
  app.patch('/api/licenses/:id/suspend', authenticateToken, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updated = await storage.updateLicense(id, { status: 'sospesa' });
      if (!updated) {
        return res.status(404).json({ message: 'License not found' });
      }
      res.json(updated);
    } catch (error) {
      console.error('Error suspending license:', error);
      res.status(500).json({ message: 'Failed to suspend license' });
    }
  });

  app.patch('/api/licenses/:id/activate', authenticateToken, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updated = await storage.updateLicense(id, { status: 'attiva' });
      if (!updated) {
        return res.status(404).json({ message: 'License not found' });
      }
      res.json(updated);
    } catch (error) {
      console.error('Error activating license:', error);
      res.status(500).json({ message: 'Failed to activate license' });
    }
  });

  // Endpoint per visualizzare le registrazioni software (autenticazione richiesta)
  // Software registrations endpoints
  app.get('/api/software/registrazioni', authenticateToken, async (req, res) => {
    try {
      const registrations = await storage.getSoftwareRegistrations(req.query);
      res.json(registrations);
    } catch (error) {
      console.error('Error fetching software registrations:', error);
      res.status(500).json({ message: 'Failed to fetch software registrations' });
    }
  });

  // Endpoint per classificare una registrazione (assegnare a cliente/licenza)
  app.patch('/api/software/registrazioni/:id/classifica', authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const { clienteAssegnato, licenzaAssegnata, note } = req.body;

      const updated = await storage.updateSoftwareRegistration(id, {
        status: 'classificato',
        clienteAssegnato,
        licenzaAssegnata,
        note
      });

      if (!updated) {
        return res.status(404).json({ message: 'Registrazione non trovata' });
      }

      res.json({
        status: 'success',
        message: 'Registrazione classificata con successo',
        registration: updated
      });
    } catch (error) {
      console.error('Classify software registration error:', error);
      res.status(500).json({ message: 'Failed to classify software registration' });
    }
  });

  // Create demo software registrations endpoint
  app.post('/api/software/registrazioni/demo', authenticateToken, async (req, res) => {
    try {
      // Get existing clients for assignments
      const clients = await storage.getClients();

      const client1 = clients.find(c => c.email === 'mario.rossi@company.com');
      const client2 = clients.find(c => c.email === 'giulia.bianchi@techcorp.it');
      const client3 = clients.find(c => c.email === 'f.verde@innovate.com');
      const client4 = clients.find(c => c.email === 'anna.neri@startup.io');
      const client5 = clients.find(c => c.email === 'luca@ferrari-dev.com');
      const client6 = clients.find(c => c.email === 'marco.blu@enterprise.com');
      const client7 = clients.find(c => c.email === 'g.napoli@southdist.it');
      const client8 = clients.find(c => c.email === 'elena.verdi@northeast.com');
      const client9 = clients.find(c => c.email === 's.sicilia@siciliasoft.it');
      const client10 = clients.find(c => c.email === 'chiara@toscana-it.com');

      const demoRegistrations = [
        {
          nomeSoftware: 'QLM Professional',
          versione: '2024.1',
          ragioneSociale: 'Rossi Consulting SRL',
          partitaIva: 'IT12345678901',
          totaleOrdini: 15,
          totaleVenduto: '45000.00',
          sistemaOperativo: 'Windows 11 Pro',
          indirizzoIp: '192.168.1.101',
          computerKey: 'COMP-ROSSI-001',
          installationPath: 'C:\\Program Files\\QLM Professional',
          status: 'non_assegnato',
          note: 'Prima installazione del software presso il cliente'
        },
        {
          nomeSoftware: 'DataGuard Pro',
          versione: '3.5.2',
          ragioneSociale: 'TechCorp Italia',
          partitaIva: 'IT98765432109',
          totaleOrdini: 8,
          totaleVenduto: '12500.00',
          sistemaOperativo: 'Windows Server 2022',
          indirizzoIp: '10.0.0.50',
          computerKey: 'COMP-TECH-SRV01',
          installationPath: 'C:\\Program Files\\DataGuard Pro',
          status: 'classificato',
          clienteAssegnato: client2?.id,
          prodottoAssegnato: null, // Sarà assegnato tramite UI
          note: 'Software installato su server principale'
        },
        {
          nomeSoftware: 'WebSecure Suite',
          versione: '1.8.0',
          ragioneSociale: 'Innovate Solutions',
          partitaIva: 'IT11223344556',
          totaleOrdini: 3,
          totaleVenduto: '8900.00',
          sistemaOperativo: 'Ubuntu Server 22.04',
          indirizzoIp: '172.16.0.25',
          computerKey: 'COMP-INNOV-WEB01',
          installationPath: '/opt/websecure',
          status: 'non_assegnato',
          note: 'Installazione su ambiente di produzione'
        },
        {
          nomeSoftware: 'QLM Starter',
          versione: '2024.1',
          ragioneSociale: 'Ferrari Development',
          partitaIva: 'IT55667788990',
          totaleOrdini: 2,
          totaleVenduto: '998.00',
          sistemaOperativo: 'Windows 10 Professional',
          indirizzoIp: '192.168.0.15',
          computerKey: 'COMP-FERRARI-DEV',
          installationPath: 'C:\\Program Files (x86)\\QLM Starter',
          status: 'licenziato',
          clienteAssegnato: client5?.id,
          licenzaAssegnata: null,
          note: 'Versione starter per sviluppatore singolo'
        },
        {
          nomeSoftware: 'QLM Professional',
          versione: '2024.2',
          ragioneSociale: 'Enterprise Corp',
          partitaIva: 'IT33445566778',
          totaleOrdini: 25,
          totaleVenduto: '67500.00',
          sistemaOperativo: 'Windows 11 Enterprise',
          indirizzoIp: '10.10.0.100',
          computerKey: 'COMP-ENT-MAIN01',
          installationPath: 'C:\\Program Files\\QLM Professional',
          status: 'non_assegnato',
          note: 'Installazione su workstation principale'
        },
        {
          nomeSoftware: 'DataGuard Pro',
          versione: '3.6.0',
          ragioneSociale: 'Southern Tech SRL',
          partitaIva: 'IT77889900112',
          totaleOrdini: 12,
          totaleVenduto: '18750.00',
          sistemaOperativo: 'CentOS 8',
          indirizzoIp: '172.20.1.45',
          computerKey: 'COMP-SOUTH-BAK01',
          installationPath: '/usr/local/dataguard',
          status: 'classificato',
          clienteAssegnato: client7?.id,
          note: 'Server di backup aziendale'
        },
        {
          nomeSoftware: 'WebSecure Suite',
          versione: '1.7.5',
          ragioneSociale: 'Verdi Systems',
          partitaIva: 'IT99887766554',
          totaleOrdini: 5,
          totaleVenduto: '6450.00',
          sistemaOperativo: 'Windows Server 2019',
          indirizzoIp: '192.168.100.200',
          computerKey: 'COMP-VERDI-SEC01',
          installationPath: 'C:\\Program Files\\WebSecure Suite',
          status: 'non_assegnato',
          note: 'Firewall e protezione web aziendale'
        },
        {
          nomeSoftware: 'QLM Enterprise',
          versione: '2024.2',
          ragioneSociale: 'Sicilia Software',
          partitaIva: 'IT44556677889',
          totaleOrdini: 35,
          totaleVenduto: '125000.00',
          sistemaOperativo: 'Red Hat Enterprise Linux 9',
          indirizzoIp: '10.5.0.75',
          computerKey: 'COMP-SIC-ENT01',
          installationPath: '/opt/qlm-enterprise',
          status: 'classificato',
          clienteAssegnato: client9?.id,
          note: 'Installazione enterprise per gestione licenze massive'
        },
        {
          nomeSoftware: 'QLM Professional',
          versione: '2023.12',
          ragioneSociale: 'Toscana Digital',
          partitaIva: 'IT22334455667',
          totaleOrdini: 7,
          totaleVenduto: '10500.00',
          sistemaOperativo: 'macOS Sonoma 14.2',
          indirizzoIp: '192.168.50.30',
          computerKey: 'COMP-TOSC-MAC01',
          installationPath: '/Applications/QLM Professional.app',
          status: 'non_assegnato',
          note: 'Installazione su ambiente Mac per sviluppo'
        },
        {
          nomeSoftware: 'DataGuard Pro',
          versione: '3.4.8',
          ragioneSociale: 'StartupTech',
          partitaIva: 'IT66778899001',
          totaleOrdini: 1,
          totaleVenduto: '1999.00',
          sistemaOperativo: 'Windows 11 Home',
          indirizzoIp: '192.168.1.50',
          computerKey: 'COMP-START-PC01',
          installationPath: 'C:\\Program Files\\DataGuard Pro',
          status: 'non_assegnato',
          note: 'Prima installazione per startup in fase di test'
        },
        {
          nomeSoftware: 'Office Suite Pro',
          versione: '2024.3',
          ragioneSociale: 'Milano Tech Solutions',
          partitaIva: 'IT12312312312',
          totaleOrdini: 20,
          totaleVenduto: '32000.00',
          sistemaOperativo: 'Windows 11 Pro',
          indirizzoIp: '192.168.2.100',
          computerKey: 'COMP-MILANO-OFF01',
          installationPath: 'C:\\Program Files\\Office Suite Pro',
          status: 'non_assegnato',
          note: 'Suite per ufficio completa'
        },
        {
          nomeSoftware: 'CRM Enterprise',
          versione: '5.2.1',
          ragioneSociale: 'Roma Business Center',
          partitaIva: 'IT98798798798',
          totaleOrdini: 50,
          totaleVenduto: '75000.00',
          sistemaOperativo: 'Windows Server 2022',
          indirizzoIp: '10.1.1.50',
          computerKey: 'COMP-ROMA-CRM01',
          installationPath: 'C:\\Program Files\\CRM Enterprise',
          status: 'classificato',
          clienteAssegnato: client1?.id,
          note: 'Sistema CRM per gestione clienti'
        }
      ];

      let createdCount = 0;

      for (const regData of demoRegistrations) {
        try {
          const existingReg = await storage.getSoftwareRegistrationByComputerKey(regData.computerKey);
          if (!existingReg) {
            await storage.createSoftwareRegistration({
              nomeSoftware: regData.nomeSoftware,
              versione: regData.versione,
              ragioneSociale: regData.ragioneSociale,
              partitaIva: regData.partitaIva,
              totaleOrdini: regData.totaleOrdini,
              totaleVenduto: regData.totaleVenduto,
              sistemaOperativo: regData.sistemaOperativo,
              indirizzoIp: regData.indirizzoIp,
              computerKey: regData.computerKey,
              installationPath: regData.installationPath,
              status: regData.status,
              clienteAssegnato: regData.clienteAssegnato,
              licenzaAssegnata: regData.licenzaAssegnata,
              note: regData.note
            });
            createdCount++;
          }
        } catch (error) {
          console.error(`Error creating software registration for ${regData.ragioneSociale}:`, error);
        }
      }

      res.json({
        status: 'success',
        message: `${createdCount} demo software registrations created successfully`,
        createdCount
      });

    } catch (error) {
      console.error('Create demo software registrations error:', error);
      res.status(500).json({ message: 'Failed to create demo software registrations' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}