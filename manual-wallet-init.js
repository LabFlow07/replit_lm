// Script per inizializzare wallet usando le API interne
async function initWallets() {
  console.log('🔧 Inizializzazione wallet via API interne...');
  
  try {
    // Login come admin
    const response = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    
    const { token } = await response.json();
    console.log('✅ Login effettuato');
    
    // Lista aziende per creare wallet
    const companies = [
      { id: '308adb19-7977-48fc-9667-2a104a56d981', name: 'Cmh', credits: 150 },
      { id: 'cf41b7dc-c2f6-4974-907f-ae2d0df9cfc6', name: 'Dylog', credits: 320 },
      { id: '14c1d823-626d-4ade-ad1d-61af0671034f', name: 'Shadow', credits: 75 }
    ];
    
    for (const company of companies) {
      // Crea wallet con ricarica
      const rechargeRes = await fetch(`http://localhost:5000/api/wallet/${company.id}/recharge`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ amount: company.credits })
      });
      
      if (rechargeRes.ok) {
        console.log(`💰 Wallet ${company.name}: ${company.credits} crediti`);
      } else {
        const error = await rechargeRes.text();
        console.log(`❌ Errore ${company.name}: ${error}`);
      }
    }
    
    console.log('✅ Inizializzazione completata!');
  } catch (error) {
    console.error('❌ Errore:', error.message);
  }
}

initWallets();