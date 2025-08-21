import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, serial, decimal, boolean, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table for authentication
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull(), // superadmin, rivenditore, agente, cliente
  companyId: varchar("company_id"),
  name: text("name").notNull(),
  email: text("email").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Companies/Organizations hierarchy
export const companies = pgTable("companies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: text("type").notNull(), // rivenditore, sottoazienda, agente, cliente
  parentId: varchar("parent_id"),
  status: text("status").default('active'), // active, inactive, pending
  contactInfo: json("contact_info"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Agents - company representatives/salespeople
export const agents = pgTable("agents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  role: text("role").default('agente'), // agente, responsabile_vendite, account_manager
  isActive: boolean("is_active").default(true),
  permissions: json("permissions"), // permissions for various operations
  territory: text("territory"), // geographical or client territory
  createdAt: timestamp("created_at").defaultNow(),
});

// Categories for products
export const categories = pgTable("categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  description: text("description"),
  color: text("color").default('#3B82F6'), // hex color for UI
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Products/Applications
export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  version: text("version").notNull(),
  description: text("description"),
  categoryId: varchar("category_id"), // Foreign key to categories
  // Pricing and configuration (only modifiable by superadmin)
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  discount: decimal("discount", { precision: 5, scale: 2 }).default('0'),
  licenseType: text("license_type").notNull(), // permanente, trial, abbonamento_mensile, abbonamento_annuale
  maxUsers: integer("max_users").default(1),
  maxDevices: integer("max_devices").default(1),
  trialDays: integer("trial_days").default(30), // trial period in days
  createdAt: timestamp("created_at").defaultNow(),
});

// Product modules/features
export const modules = pgTable("modules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar("product_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  basePrice: decimal("base_price", { precision: 10, scale: 2 }),
});

// Clients
export const clients = pgTable("clients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id"),
  name: text("name").notNull(),
  email: text("email").notNull(),
  status: text("status").default('pending'), // convalidato, in_attesa, sospeso
  contactInfo: json("contact_info"),
  isMultiSite: boolean("is_multi_site").default(false),
  isMultiUser: boolean("is_multi_user").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Licenses
export const licenses = pgTable("licenses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull(),
  productId: varchar("product_id").notNull(),
  activationKey: text("activation_key").notNull().unique(),
  expiryDate: timestamp("expiry_date"),
  activationDate: timestamp("activation_date"), // when license was activated
  status: text("status").default('pending'), // attiva, scaduta, sospesa, demo, in_attesa_convalida
  computerKey: text("computer_key"), // device-specific key
  activeModules: json("active_modules"),
  assignedCompany: varchar("assigned_company"),
  assignedAgent: varchar("assigned_agent"),
  renewalEnabled: boolean("renewal_enabled").default(false), // automatic renewal enabled
  renewalPeriod: text("renewal_period"), // monthly, yearly - for subscriptions
  notes: text("notes"), // additional notes
  createdAt: timestamp("created_at").defaultNow(),
  // Pricing, license type, max users/devices are now inherited from product
});

// Company Wallets - Sistema crediti aziendale
export const companyWallets = pgTable("company_wallets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().unique(),
  balance: decimal("balance", { precision: 10, scale: 2 }).default('0.00'), // saldo crediti (1 credito = 1 euro)
  totalRecharges: decimal("total_recharges", { precision: 10, scale: 2 }).default('0.00'), // totale ricariche effettuate
  totalSpent: decimal("total_spent", { precision: 10, scale: 2 }).default('0.00'), // totale speso
  lastRechargeDate: timestamp("last_recharge_date"),
  stripeCustomerId: text("stripe_customer_id"), // ID cliente Stripe per ricariche
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Wallet Transactions - Storico movimenti crediti
export const walletTransactions = pgTable("wallet_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull(),
  type: text("type").notNull(), // ricarica, spesa, trasferimento_in, trasferimento_out
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(), // importo in crediti
  balanceBefore: decimal("balance_before", { precision: 10, scale: 2 }).notNull(),
  balanceAfter: decimal("balance_after", { precision: 10, scale: 2 }).notNull(),
  description: text("description").notNull(),
  relatedEntityType: text("related_entity_type"), // license, recharge, transfer
  relatedEntityId: varchar("related_entity_id"), // ID della licenza, ricarica, o trasferimento
  fromCompanyId: varchar("from_company_id"), // per trasferimenti
  toCompanyId: varchar("to_company_id"), // per trasferimenti
  stripePaymentIntentId: text("stripe_payment_intent_id"), // per ricariche Stripe
  createdBy: varchar("created_by"), // utente che ha creato la transazione
  createdAt: timestamp("created_at").defaultNow(),
});

// Transactions - Modificato per supportare crediti
export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  licenseId: varchar("license_id").notNull(),
  clientId: varchar("client_id"), // client who needs to pay
  companyId: varchar("company_id"), // company of the client
  type: text("type").notNull(), // attivazione, rinnovo, posticipato
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(), // ora in crediti
  discount: decimal("discount", { precision: 10, scale: 2 }).default('0.00'),
  finalAmount: decimal("final_amount", { precision: 10, scale: 2 }).notNull(), // amount - discount
  paymentMethod: text("payment_method"), // crediti, contanti, bonifico, carta_di_credito, stripe, paypal
  status: text("status").default('in_attesa'), // in_attesa, pagato_crediti, contanti, bonifico, carta_di_credito, dall_agente, dal_rivenditore, gratis, altro
  paymentLink: text("payment_link"), // Stripe payment link
  paymentDate: timestamp("payment_date"), // when payment was completed
  creditsUsed: decimal("credits_used", { precision: 10, scale: 2 }), // crediti utilizzati dal wallet
  notes: text("notes"),
  modifiedBy: varchar("modified_by"), // user who last modified the record
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Activation logs
export const activationLogs = pgTable("activation_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  licenseId: varchar("license_id").notNull(),
  keyType: text("key_type").notNull(), // activation, computer
  deviceInfo: json("device_info"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  result: text("result").notNull(), // success, failed
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Access logs
export const accessLogs = pgTable("access_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  action: text("action").notNull(),
  resource: text("resource"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Sistema di registrazione dispositivi - Tabella Testa (Header)
export const testaRegAzienda = pgTable("Testa_Reg_Azienda", {
  partitaIva: varchar("PartitaIva", { length: 20 }).primaryKey(),
  nomeAzienda: text("NomeAzienda").notNull(),
  prodotto: text("Prodotto").notNull(),
  versione: varchar("Versione", { length: 50 }),
  modulo: text("Modulo"),
  utenti: integer("Utenti").default(0),
  totDispositivi: integer("TotDispositivi").default(0),
  idLicenza: varchar("ID_Licenza", { length: 36 }), // FK verso tabella licenze (nullable)
  totOrdini: integer("TotOrdini").default(0),
  totVendite: decimal("TotVendite", { precision: 15, scale: 2 }).default("0.00"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Sistema di registrazione dispositivi - Tabella Dettaglio (Details)  
export const dettRegAzienda = pgTable("Dett_Reg_Azienda", {
  id: serial("ID").primaryKey(),
  partitaIva: varchar("PartitaIva", { length: 20 }).notNull(),
  uidDispositivo: text("UID_Dispositivo").notNull(),
  sistemaOperativo: varchar("SistemaOperativo", { length: 100 }),
  note: text("Note"),
  dataAttivazione: timestamp("DataAttivazione"),
  dataUltimoAccesso: timestamp("DataUltimoAccesso"),
  ordini: integer("Ordini").default(0),
  vendite: decimal("Vendite", { precision: 15, scale: 2 }).default("0.00"),
  computerKey: text("Computer_Key"), // Chiave di binding dispositivo
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ 
  id: true, 
  createdAt: true 
});

export const insertCompanySchema = createInsertSchema(companies).omit({ 
  id: true, 
  createdAt: true 
});

export const insertAgentSchema = createInsertSchema(agents).omit({ 
  id: true, 
  createdAt: true 
});

export const insertCategorySchema = createInsertSchema(categories).omit({ 
  id: true, 
  createdAt: true 
});

export const insertProductSchema = createInsertSchema(products).omit({ 
  id: true, 
  createdAt: true 
});

export const insertModuleSchema = createInsertSchema(modules).omit({ 
  id: true 
});

export const insertClientSchema = createInsertSchema(clients).omit({ 
  id: true, 
  createdAt: true 
});

export const insertLicenseSchema = createInsertSchema(licenses).omit({ 
  id: true, 
  createdAt: true 
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({ 
  id: true, 
  createdAt: true 
});

export const insertCompanyWalletSchema = createInsertSchema(companyWallets).omit({ 
  id: true, 
  createdAt: true,
  updatedAt: true
});

export const insertWalletTransactionSchema = createInsertSchema(walletTransactions).omit({ 
  id: true, 
  createdAt: true 
});

export const insertActivationLogSchema = createInsertSchema(activationLogs).omit({ 
  id: true, 
  createdAt: true 
});

export const insertAccessLogSchema = createInsertSchema(accessLogs).omit({ 
  id: true, 
  createdAt: true 
});

export const insertTestaRegAziendaSchema = createInsertSchema(testaRegAzienda).omit({ 
  createdAt: true,
  updatedAt: true
});

export const insertDettRegAziendaSchema = createInsertSchema(dettRegAzienda).omit({ 
  id: true,
  createdAt: true,
  updatedAt: true
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Company = typeof companies.$inferSelect;
export type InsertCompany = z.infer<typeof insertCompanySchema>;

export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;

export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;

export type Module = typeof modules.$inferSelect;
export type InsertModule = z.infer<typeof insertModuleSchema>;

export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;

export type License = typeof licenses.$inferSelect;
export type InsertLicense = z.infer<typeof insertLicenseSchema>;

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;

export type CompanyWallet = typeof companyWallets.$inferSelect;
export type InsertCompanyWallet = z.infer<typeof insertCompanyWalletSchema>;

export type WalletTransaction = typeof walletTransactions.$inferSelect;
export type InsertWalletTransaction = z.infer<typeof insertWalletTransactionSchema>;

export type ActivationLog = typeof activationLogs.$inferSelect;
export type InsertActivationLog = z.infer<typeof insertActivationLogSchema>;

export type AccessLog = typeof accessLogs.$inferSelect;
export type InsertAccessLog = z.infer<typeof insertAccessLogSchema>;

export type TestaRegAzienda = typeof testaRegAzienda.$inferSelect;
export type InsertTestaRegAzienda = z.infer<typeof insertTestaRegAziendaSchema>;

export type DettRegAzienda = typeof dettRegAzienda.$inferSelect;
export type InsertDettRegAzienda = z.infer<typeof insertDettRegAziendaSchema>;

// API Response types
export type LicenseWithDetails = License & {
  client: Client;
  product: Product;
  company?: Company;
};

export type UserWithCompany = User & {
  company?: Company;
};

export type DashboardStats = {
  activeLicenses: number;
  demoLicenses: number;
  totalClients: number;
  monthlyRevenue: number;
  todayActivations: number;
  demoConversions: number;
  expiringRenewals: number;
  dailyRevenue: number;
};