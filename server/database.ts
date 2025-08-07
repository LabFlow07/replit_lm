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
          supported_license_types JSON,
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
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await this.query(`
        CREATE TABLE IF NOT EXISTS transactions (
          id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
          license_id VARCHAR(36) NOT NULL,
          type VARCHAR(50) NOT NULL,
          amount DECIMAL(10,2) NOT NULL,
          payment_method VARCHAR(100),
          status VARCHAR(50) DEFAULT 'pending',
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

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

      await this.query(`
        CREATE TABLE IF NOT EXISTS software_registrations (
          id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
          nome_software VARCHAR(255) NOT NULL,
          versione VARCHAR(50) NOT NULL,
          ragione_sociale VARCHAR(255) NOT NULL,
          partita_iva VARCHAR(50),
          totale_ordini INT DEFAULT 0,
          totale_venduto DECIMAL(10,2) DEFAULT 0.00,
          sistema_operativo VARCHAR(100),
          indirizzo_ip VARCHAR(45),
          computer_key VARCHAR(255),
          installation_path TEXT,
          status VARCHAR(50) DEFAULT 'non_assegnato',
          cliente_assegnato VARCHAR(36),
          licenza_assegnata VARCHAR(36),
          prodotto_assegnato VARCHAR(36),
          note TEXT,
          prima_registrazione TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          ultima_attivita TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);

      // Add the missing column if it doesn't exist
      await this.query(`
        ALTER TABLE software_registrations 
        ADD COLUMN IF NOT EXISTS prodotto_assegnato VARCHAR(36)
      `).catch(() => {
        // Column might already exist, ignore error
      });

      console.log('Database tables initialized successfully');
    } catch (error) {
      console.error('Error initializing database tables:', error);
      throw error;
    }
  }
}

export const database = new Database();
