import mysql from 'mysql2/promise';

async function fixShadowTransactions() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'license_management'
  });

  try {
    console.log('🔧 Creating historical transaction for Shadow company...');
    
    // Inserisci transazione storica per Shadow
    const transactionId = 'shadow-historical-' + Date.now();
    
    await connection.execute(`
      INSERT INTO wallet_transactions (
        id, company_id, type, amount, balance_before, balance_after, 
        description, related_entity_type, created_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `, [
      transactionId,
      '14c1d823-626d-4ade-ad1d-61af0671034f', // Shadow company ID
      'ricarica',
      180,
      0,
      180,
      'Ricarica storica - saldo esistente importato nel sistema',
      'historical',
      'system'
    ]);

    console.log('✅ Historical transaction created successfully!');
    
    // Verifica la transazione
    const [rows] = await connection.execute(
      'SELECT * FROM wallet_transactions WHERE company_id = ? ORDER BY created_at DESC',
      ['14c1d823-626d-4ade-ad1d-61af0671034f']
    );
    
    console.log(`📊 Total transactions for Shadow: ${rows.length}`);
    rows.forEach(tx => {
      console.log(`- ${tx.type}: €${tx.amount} - ${tx.description}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await connection.end();
  }
}

fixShadowTransactions();