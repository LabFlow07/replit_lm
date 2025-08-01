import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, decimal, boolean, json } from "drizzle-orm/pg-core";
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

// Products/Applications
export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  version: text("version").notNull(),
  description: text("description"),
  supportedLicenseTypes: json("supported_license_types"), // permanente, demo, abbonamento
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
  computerKey: text("computer_key"),
  activationDate: timestamp("activation_date"),
  expiryDate: timestamp("expiry_date"),
  licenseType: text("license_type").notNull(), // permanente, trial, abbonamento
  status: text("status").default('pending'), // attiva, scaduta, sospesa, demo, in_attesa_convalida
  maxUsers: integer("max_users").default(1),
  maxDevices: integer("max_devices").default(1),
  price: decimal("price", { precision: 10, scale: 2 }),
  discount: decimal("discount", { precision: 5, scale: 2 }).default('0'),
  activeModules: json("active_modules"),
  assignedCompany: varchar("assigned_company"),
  assignedAgent: varchar("assigned_agent"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Transactions
export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  licenseId: varchar("license_id").notNull(),
  type: text("type").notNull(), // attivazione, rinnovo, posticipato
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: text("payment_method"),
  status: text("status").default('pending'), // completed, pending, failed
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
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

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ 
  id: true, 
  createdAt: true 
});

export const insertCompanySchema = createInsertSchema(companies).omit({ 
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

export const insertActivationLogSchema = createInsertSchema(activationLogs).omit({ 
  id: true, 
  createdAt: true 
});

export const insertAccessLogSchema = createInsertSchema(accessLogs).omit({ 
  id: true, 
  createdAt: true 
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Company = typeof companies.$inferSelect;
export type InsertCompany = z.infer<typeof insertCompanySchema>;

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

export type ActivationLog = typeof activationLogs.$inferSelect;
export type InsertActivationLog = z.infer<typeof insertActivationLogSchema>;

export type AccessLog = typeof accessLogs.$inferSelect;
export type InsertAccessLog = z.infer<typeof insertAccessLogSchema>;

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
