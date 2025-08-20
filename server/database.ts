import mysql from 'mysql2/promise';

const dbConfig = {
  host: process.env.DATABASE_HOST || '87.106.247.35',
  user: process.env.DATABASE_USER || 'ext_replit',
  password: process.env.DATABASE_PASSWORD || 'Replit@2025',
  database: process.env.DATABASE_NAME || 'replit_license',
  charset: 'utf8mb4',
  timezone: '+00:00',
  acquireTimeout: 60000,
  timeout: 60000,
};

class Database {
  private pool: mysql.Pool;

  constructor() {
    this.pool = mysql.createPool({
      ...dbConfig,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
  }

  async query(sql: string, values?: any[]): Promise<any> {
    try {
      const [rows] = await this.pool.execute(sql, values);
      return rows;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }

  async beginTransaction(): Promise<mysql.PoolConnection> {
    const connection = await this.pool.getConnection();
    await connection.beginTransaction();
    return connection;
  }

  async commitTransaction(connection: mysql.PoolConnection) {
    await connection.commit();
    connection.release();
  }

  async rollbackTransaction(connection: mysql.PoolConnection) {
    await connection.rollback();
    connection.release();
  }

  async initTables() {
    try {
      // Create tables if they don't exist
      await this.query(`
        CREATE TABLE IF NOT EXISTS users (
          id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
          username VARCHAR(255) NOT NULL UNIQUE,
          password VARCHAR(255) NOT NULL,
          role VARCHAR(50) NOT NULL,
          company_id VARCHAR(36),
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) NOT NULL,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await this.query(`
        CREATE TABLE IF NOT EXISTS companies (
          id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
          name VARCHAR(255) NOT NULL,
          type VARCHAR(50) NOT NULL,
          parent_id VARCHAR(36),
          status VARCHAR(50) DEFAULT 'active',
          contact_info JSON,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await this.query(`
        CREATE TABLE IF NOT EXISTS agents (
          id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
          company_id VARCHAR(36) NOT NULL,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) NOT NULL,
          phone VARCHAR(50),
          role VARCHAR(100) DEFAULT 'agente',
          is_active BOOLEAN DEFAULT TRUE,
          permissions JSON,
          territory TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
        )
      `);

      await this.query(`
        CREATE TABLE IF NOT EXISTS products (
          id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
          name VARCHAR(255) NOT NULL,
          version VARCHAR(50) NOT NULL,
          description TEXT,
          price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
          discount DECIMAL(5,2) DEFAULT 0.00,
          license_type VARCHAR(50) NOT NULL DEFAULT 'permanente',
          max_users INT DEFAULT 1,
          max_devices INT DEFAULT 1,
          trial_days INT DEFAULT 30,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await this.query(`
        CREATE TABLE IF NOT EXISTS modules (
          id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
          product_id VARCHAR(36) NOT NULL,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          base_price DECIMAL(10,2)
        )
      `);

      await this.query(`
        CREATE TABLE IF NOT EXISTS clients (
          id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
          company_id VARCHAR(36),
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) NOT NULL,
          status VARCHAR(50) DEFAULT 'pending',
          contact_info JSON,
          is_multi_site BOOLEAN DEFAULT FALSE,
          is_multi_user BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await this.query(`
        CREATE TABLE IF NOT EXISTS licenses (
          id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
          client_id VARCHAR(36) NOT NULL,
          product_id VARCHAR(36) NOT NULL,
          activation_key VARCHAR(255) NOT NULL UNIQUE,
          computer_key VARCHAR(255),
          activation_date TIMESTAMP,
          expiry_date TIMESTAMP,
          license_type VARCHAR(50) NOT NULL,
          status VARCHAR(50) DEFAULT 'pending',
          max_users INT DEFAULT 1,
          max_devices INT DEFAULT 1,
          price DECIMAL(10,2),
          discount DECIMAL(5,2) DEFAULT 0,
          active_modules JSON,
          assigned_company VARCHAR(36),
          assigned_agent VARCHAR(36),
          renewal_enabled BOOLEAN DEFAULT FALSE,
          renewal_period VARCHAR(20),
          trial_days INT DEFAULT 30,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await this.query(`
        CREATE TABLE IF NOT EXISTS transactions (
          id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
          license_id VARCHAR(36) NOT NULL,
          client_id VARCHAR(36),
          company_id VARCHAR(36),
          type VARCHAR(50) NOT NULL,
          amount DECIMAL(10,2) NOT NULL,
          discount DECIMAL(10,2) DEFAULT 0.00,
          final_amount DECIMAL(10,2) NOT NULL,
          payment_method VARCHAR(100),
          status VARCHAR(50) DEFAULT 'in_attesa',
          payment_link TEXT,
          payment_date TIMESTAMP NULL,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);

      // Check and add columns to transactions table only if they don't exist
      const transactionColumns = ['client_id', 'company_id', 'discount', 'final_amount', 'payment_link', 'payment_date', 'updated_at', 'modified_by', 'credits_used'];
      for (const column of transactionColumns) {
        try {
          const columnExists = await this.query(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'transactions' AND COLUMN_NAME = ?`, [column]);
          if (columnExists.length === 0) {
            switch (column) {
              case 'client_id':
                await this.query(`ALTER TABLE transactions ADD COLUMN client_id VARCHAR(36)`);
                break;
              case 'company_id':
                await this.query(`ALTER TABLE transactions ADD COLUMN company_id VARCHAR(36)`);
                break;
              case 'discount':
                await this.query(`ALTER TABLE transactions ADD COLUMN discount DECIMAL(10,2) DEFAULT 0.00`);
                break;
              case 'final_amount':
                await this.query(`ALTER TABLE transactions ADD COLUMN final_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00`);
                break;
              case 'payment_link':
                await this.query(`ALTER TABLE transactions ADD COLUMN payment_link TEXT`);
                break;
              case 'payment_date':
                await this.query(`ALTER TABLE transactions ADD COLUMN payment_date TIMESTAMP NULL`);
                break;
              case 'updated_at':
                await this.query(`ALTER TABLE transactions ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`);
                break;
              case 'modified_by':
                await this.query(`ALTER TABLE transactions ADD COLUMN modified_by VARCHAR(36)`);
                break;
              case 'credits_used':
                await this.query(`ALTER TABLE transactions ADD COLUMN credits_used DECIMAL(10,2) DEFAULT 0.00`);
                break;
            }
          }
        } catch (e) { 
          console.log(`Error checking/adding column ${column}:`, e.message);
        }
      }

      // Check and add columns to licenses table only if they don't exist
      const licenseColumns = ['renewal_enabled', 'renewal_period', 'trial_days', 'notes'];
      for (const column of licenseColumns) {
        try {
          const columnExists = await this.query(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'licenses' AND COLUMN_NAME = ?`, [column]);
          if (columnExists.length === 0) {
            switch (column) {
              case 'renewal_enabled':
                await this.query(`ALTER TABLE licenses ADD COLUMN renewal_enabled BOOLEAN DEFAULT FALSE`);
                break;
              case 'renewal_period':
                await this.query(`ALTER TABLE licenses ADD COLUMN renewal_period VARCHAR(20)`);
                break;
              case 'trial_days':
                await this.query(`ALTER TABLE licenses ADD COLUMN trial_days INT DEFAULT 30`);
                break;
              case 'notes':
                await this.query(`ALTER TABLE licenses ADD COLUMN notes TEXT`);
                break;
            }
          }
        } catch (e) { 
          console.log(`Error checking/adding license column ${column}:`, e.message);
        }
      }

      await this.query(`
        CREATE TABLE IF NOT EXISTS activation_logs (
          id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
          license_id VARCHAR(36) NOT NULL,
          key_type VARCHAR(50) NOT NULL,
          device_info JSON,
          ip_address VARCHAR(45),
          user_agent TEXT,
          result VARCHAR(50) NOT NULL,
          error_message TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await this.query(`
        CREATE TABLE IF NOT EXISTS access_logs (
          id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
          user_id VARCHAR(36) NOT NULL,
          action VARCHAR(255) NOT NULL,
          resource VARCHAR(255),
          ip_address VARCHAR(45),
          user_agent TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // New device registration tables
      await this.query(`
        CREATE TABLE IF NOT EXISTS Testa_Reg_Azienda (
          PartitaIva VARCHAR(20) NOT NULL PRIMARY KEY,
          NomeAzienda VARCHAR(255) NOT NULL,
          Prodotto VARCHAR(255) NOT NULL,
          Versione VARCHAR(50),
          Modulo VARCHAR(255),
          Utenti INT DEFAULT 0,
          TotDispositivi INT DEFAULT 0,
          ID_Licenza VARCHAR(36),
          TotOrdini INT DEFAULT 0,
          TotVendite DECIMAL(15,2) DEFAULT 0.00,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);

      await this.query(`
        CREATE TABLE IF NOT EXISTS Dett_Reg_Azienda (
          ID INT AUTO_INCREMENT PRIMARY KEY,
          PartitaIva VARCHAR(20) NOT NULL,
          UID_Dispositivo VARCHAR(255) NOT NULL,
          SistemaOperativo VARCHAR(100),
          Note TEXT,
          DataAttivazione DATE,
          DataUltimoAccesso DATETIME,
          Ordini INT DEFAULT 0,
          Vendite DECIMAL(15,2) DEFAULT 0.00,
          Computer_Key VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (PartitaIva) REFERENCES Testa_Reg_Azienda(PartitaIva) ON DELETE CASCADE ON UPDATE CASCADE
        )
      `);

      // Remove old software_registrations table if it exists
      await this.query(`DROP TABLE IF EXISTS software_registrations`).catch(() => {
        // Table might not exist, ignore error
      });

      // 💳 WALLET SYSTEM - Create company wallets table
      await this.query(`
        CREATE TABLE IF NOT EXISTS company_wallets (
          id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
          company_id VARCHAR(36) NOT NULL UNIQUE,
          balance DECIMAL(10,2) DEFAULT 0.00,
          total_recharges DECIMAL(10,2) DEFAULT 0.00,
          total_spent DECIMAL(10,2) DEFAULT 0.00,
          last_recharge_date TIMESTAMP NULL,
          stripe_customer_id VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
        )
      `);

      // 📊 WALLET TRANSACTIONS - Create wallet transactions table
      await this.query(`
        CREATE TABLE IF NOT EXISTS wallet_transactions (
          id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
          company_id VARCHAR(36) NOT NULL,
          type VARCHAR(50) NOT NULL,
          amount DECIMAL(10,2) NOT NULL,
          balance_before DECIMAL(10,2) NOT NULL,
          balance_after DECIMAL(10,2) NOT NULL,
          description TEXT NOT NULL,
          related_entity_type VARCHAR(50),
          related_entity_id VARCHAR(36),
          from_company_id VARCHAR(36),
          to_company_id VARCHAR(36),
          stripe_payment_intent_id VARCHAR(255),
          created_by VARCHAR(36),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
          FOREIGN KEY (from_company_id) REFERENCES companies(id) ON DELETE SET NULL,
          FOREIGN KEY (to_company_id) REFERENCES companies(id) ON DELETE SET NULL,
          FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
        )
      `);

      // Credits support already handled above in the column check loop

      // Remove supported_license_types column from products table
      try {
        await this.query(`ALTER TABLE products DROP COLUMN supported_license_types`);
        console.log('✅ Rimossa colonna supported_license_types dalla tabella products');
      } catch (e) { 
        console.log('⚠️  Colonna supported_license_types già rimossa o non esistente');
      }

      // 🏗️ ARCHITECTURAL MIGRATION: Add pricing fields to products
      const productColumns = ['price', 'discount', 'license_type', 'max_users', 'max_devices', 'trial_days'];
      for (const column of productColumns) {
        try {
          const columnExists = await this.query(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'products' AND COLUMN_NAME = ?`, [column]);
          if (columnExists.length === 0) {
            switch (column) {
              case 'price':
                await this.query(`ALTER TABLE products ADD COLUMN price DECIMAL(10,2) NOT NULL DEFAULT 0.00`);
                break;
              case 'discount':
                await this.query(`ALTER TABLE products ADD COLUMN discount DECIMAL(5,2) DEFAULT 0.00`);
                break;
              case 'license_type':
                await this.query(`ALTER TABLE products ADD COLUMN license_type VARCHAR(50) NOT NULL DEFAULT 'permanente'`);
                break;
              case 'max_users':
                await this.query(`ALTER TABLE products ADD COLUMN max_users INT DEFAULT 1`);
                break;
              case 'max_devices':
                await this.query(`ALTER TABLE products ADD COLUMN max_devices INT DEFAULT 1`);
                break;
              case 'trial_days':
                await this.query(`ALTER TABLE products ADD COLUMN trial_days INT DEFAULT 30`);
                break;
            }
          }
        } catch (e) { 
          console.log(`Error checking/adding product column ${column}:`, e.message);
        }
      }

      // 🔧 SYSTEM CONFIG - Create system configuration table
      await this.query(`
        CREATE TABLE IF NOT EXISTS system_config (
          id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
          config_key VARCHAR(255) UNIQUE NOT NULL,
          config_value TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          created_by VARCHAR(36),
          updated_by VARCHAR(36),
          FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
          FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
        )
      `);

      console.log('Database tables initialized successfully');
    } catch (error) {
      console.error('Error initializing database tables:', error);
      throw error;
    }
  }
}

export const database = new Database();
