// Script per inizializzare wallet di test
import mysql from 'mysql2/promise';

async function initWallets() {
  const connection = await mysql.createConnection({
    host: 'srv1382.hstgr.io',
    user: 'u790654745_replit',
    password: 'System2024!',
    database: 'u790654745_replit_license'
  });

  try {
    console.log('🔧 Inizializzazione wallet aziendali...');

    // Get companies
    const [companies] = await connection.execute('SELECT id, name FROM companies ORDER BY name');
    console.log(`📋 Trovate ${companies.length} aziende`);

    // Create wallets for all companies
    for (const company of companies) {
      const initialBalance = Math.floor(Math.random() * 500) + 50; // Random balance between 50-550
      
      // Create wallet
      await connection.execute(`
        INSERT INTO company_wallets (company_id, balance, created_at, updated_at) 
        VALUES (?, ?, NOW(), NOW())
        ON DUPLICATE KEY UPDATE balance = VALUES(balance), updated_at = NOW()
      `, [company.id, initialBalance]);

      // Create initial transaction
      await connection.execute(`
        INSERT INTO wallet_transactions (company_id, amount, transaction_type, description, created_by, created_at)
        VALUES (?, ?, 'ricarica', ?, '-6sQhFmE-PqZD2qoRXcw4', NOW())
      `, [company.id, initialBalance, `Ricarica iniziale wallet ${company.name}`]);

      console.log(`💰 Wallet creato per ${company.name}: ${initialBalance} crediti`);
    }

    console.log('✅ Inizializzazione wallet completata!');
  } catch (error) {
    console.error('❌ Errore inizializzazione:', error);
  } finally {
    await connection.end();
  }
}

initWallets();