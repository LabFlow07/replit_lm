// Script per creare wallet di test via API
async function createTestWallets() {
  console.log('🔧 Creazione wallet di test...');
  
  try {
    // Get auth token - simulate login
    const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    
    if (!loginResponse.ok) {
      throw new Error('Login failed');
    }
    
    const loginData = await loginResponse.json();
    const token = loginData.token;
    console.log('✅ Autenticazione completata');
    
    // Get companies
    const companiesResponse = await fetch('http://localhost:5000/api/companies', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!companiesResponse.ok) {
      throw new Error('Failed to get companies');
    }
    
    const companies = await companiesResponse.json();
    console.log(`📋 Trovate ${companies.length} aziende`);
    
    // Create wallets for first 3 companies
    const testCompanies = companies.slice(0, 3);
    
    for (const company of testCompanies) {
      const amount = Math.floor(Math.random() * 400) + 100; // Random between 100-500
      
      const rechargeResponse = await fetch(`http://localhost:5000/api/wallet/${company.id}/recharge`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ amount })
      });
      
      if (rechargeResponse.ok) {
        console.log(`💰 Wallet creato per ${company.name}: ${amount} crediti`);
      } else {
        console.log(`❌ Errore creazione wallet per ${company.name}`);
      }
    }
    
    console.log('✅ Creazione wallet completata!');
    
  } catch (error) {
    console.error('❌ Errore:', error.message);
  }
}

createTestWallets();