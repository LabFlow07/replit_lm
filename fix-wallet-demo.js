// Script per inserire dati wallet di demo direttamente  
import { createConnection } from 'mysql2/promise';

async function createDemoWallets() {
  console.log('🔧 Creazione dati wallet di demo...');
  
  // Usa le stesse credenziali del server
  const connection = await createConnection({
    host: 'srv1382.hstgr.io',
    user: 'u790654745_replit', 
    password: 'System2024!',
    database: 'u790654745_replit_license'
  });

  try {
    // Inserisci wallet di demo
    const walletData = [
      { companyId: '308adb19-7977-48fc-9667-2a104a56d981', companyName: 'Cmh', balance: 150 },
      { companyId: 'cf41b7dc-c2f6-4974-907f-ae2d0df9cfc6', companyName: 'Dylog', balance: 320 },
      { companyId: '14c1d823-626d-4ade-ad1d-61af0671034f', companyName: 'Shadow', balance: 75 }
    ];

    for (const wallet of walletData) {
      // Inserisci wallet
      await connection.execute(`
        INSERT INTO company_wallets (company_id, balance, total_recharges, created_at, updated_at) 
        VALUES (?, ?, ?, NOW(), NOW())
        ON DUPLICATE KEY UPDATE 
          balance = VALUES(balance), 
          total_recharges = VALUES(total_recharges),
          updated_at = NOW()
      `, [wallet.companyId, wallet.balance, wallet.balance]);

      // Inserisci transazione iniziale 
      await connection.execute(`
        INSERT INTO wallet_transactions (
          company_id, type, amount, balance_before, balance_after,
          description, created_by, created_at
        ) VALUES (?, 'ricarica', ?, 0, ?, ?, '-6sQhFmE-PqZD2qoRXcw4', NOW())
      `, [
        wallet.companyId, 
        wallet.balance, 
        wallet.balance,
        `Ricarica iniziale wallet ${wallet.companyName}`
      ]);

      console.log(`💰 Wallet creato: ${wallet.companyName} - ${wallet.balance} crediti`);
    }

    console.log('✅ Wallet demo creati con successo!');
  } catch (error) {
    console.error('❌ Errore:', error.message);
  } finally {
    await connection.end();
  }
}

createDemoWallets();