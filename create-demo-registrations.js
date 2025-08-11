
import axios from 'axios';

// Configurazione dell'endpoint API
const API_BASE_URL = 'http://localhost:5000';

// Dati demo per le registrazioni software
const demoRegistrations = [
  {
    partitaIva: '01234567890',
    nomeAzienda: 'Tech Solutions SRL',
    prodotto: 'CassaWow',
    versione: '4.2.1',
    modulo: 'standard',
    uidDispositivo: 'WS-001-MAIN',
    sistemaOperativo: 'Windows 11 Pro',
    note: 'Installazione principale su workstation'
  },
  {
    partitaIva: '01234567890',
    nomeAzienda: 'Tech Solutions SRL',
    prodotto: 'CassaWow',
    versione: '4.2.1',
    modulo: 'standard',
    uidDispositivo: 'TAB-002-MOBILE',
    sistemaOperativo: 'Android 12',
    note: 'Tablet per vendite mobile'
  },
  {
    partitaIva: '98765432109',
    nomeAzienda: 'Restaurant Bella Vista',
    prodotto: 'JollyMag',
    versione: '3.8.5',
    modulo: 'restaurant',
    uidDispositivo: 'POS-001-CASSA1',
    sistemaOperativo: 'Linux Ubuntu 22.04',
    note: 'POS principale sala ristorante'
  },
  {
    partitaIva: '98765432109',
    nomeAzienda: 'Restaurant Bella Vista',
    prodotto: 'JollyMag',
    versione: '3.8.5',
    modulo: 'restaurant',
    uidDispositivo: 'POS-002-CASSA2',
    sistemaOperativo: 'Linux Ubuntu 22.04',
    note: 'POS secondario per picchi di lavoro'
  },
  {
    partitaIva: '11223344556',
    nomeAzienda: 'Fashion Store Milano',
    prodotto: 'Videcomoda',
    versione: '2.3.0',
    modulo: 'fashion',
    uidDispositivo: 'DESK-001-VENDITE',
    sistemaOperativo: 'Windows 11',
    note: 'Postazione vendite principale'
  },
  {
    partitaIva: '11223344556',
    nomeAzienda: 'Fashion Store Milano',
    prodotto: 'Videcomoda',
    versione: '2.3.0',
    modulo: 'fashion',
    uidDispositivo: 'DESK-002-MAGAZZINO',
    sistemaOperativo: 'Windows 10',
    note: 'Postazione gestione magazzino'
  },
  {
    partitaIva: '55667788990',
    nomeAzienda: 'Alimentari del Centro',
    prodotto: 'CassaWow',
    versione: '4.1.8',
    modulo: 'grocery',
    uidDispositivo: 'REG-001-PRINCIPALE',
    sistemaOperativo: 'Windows 10',
    note: 'Registratore principale'
  },
  {
    partitaIva: '33445566778',
    nomeAzienda: 'Libreria Moderna',
    prodotto: 'JollyMag',
    versione: '3.9.2',
    modulo: 'bookstore',
    uidDispositivo: 'BOOK-001-COUNTER',
    sistemaOperativo: 'macOS Monterey',
    note: 'Banco principale libreria'
  },
  {
    partitaIva: '77889900112',
    nomeAzienda: 'Farmacia San Marco',
    prodotto: 'CassaWow',
    versione: '4.3.0',
    modulo: 'pharmacy',
    uidDispositivo: 'PHARM-001-MAIN',
    sistemaOperativo: 'Windows 11 Pro',
    note: 'Sistema principale farmacia'
  },
  {
    partitaIva: '77889900112',
    nomeAzienda: 'Farmacia San Marco',
    prodotto: 'CassaWow',
    versione: '4.3.0',
    modulo: 'pharmacy',
    uidDispositivo: 'PHARM-002-BACKUP',
    sistemaOperativo: 'Windows 10',
    note: 'Sistema di backup emergenze'
  },
  {
    partitaIva: '99887766554',
    nomeAzienda: 'Bar Centrale',
    prodotto: 'JollyMag',
    versione: '3.7.1',
    modulo: 'bar',
    uidDispositivo: 'BAR-001-CASSA',
    sistemaOperativo: 'Linux Mint 21',
    note: 'Cassa bar principale'
  },
  {
    partitaIva: '22334455667',
    nomeAzienda: 'Profumeria Elegante',
    prodotto: 'Videcomoda',
    versione: '2.4.1',
    modulo: 'beauty',
    uidDispositivo: 'BEAUTY-001-SALES',
    sistemaOperativo: 'Windows 10 Pro',
    note: 'Postazione vendite profumeria'
  },
  {
    partitaIva: '44556677889',
    nomeAzienda: 'Ferramenta Rossi',
    prodotto: 'CassaWow',
    versione: '4.0.5',
    modulo: 'hardware',
    uidDispositivo: 'HARD-001-REGISTER',
    sistemaOperativo: 'Windows 10',
    note: 'Registratore ferramenta'
  },
  {
    partitaIva: '66778899001',
    nomeAzienda: 'Pasticceria Dolce Vita',
    prodotto: 'JollyMag',
    versione: '3.8.8',
    modulo: 'bakery',
    uidDispositivo: 'CAKE-001-FRONT',
    sistemaOperativo: 'Ubuntu 22.04',
    note: 'POS banco vendite pasticceria'
  }
];

// Funzione per creare una registrazione tramite API
async function createRegistration(registration) {
  try {
    console.log(`Creando registrazione per ${registration.nomeAzienda} - ${registration.uidDispositivo}...`);
    
    const response = await axios.post(`${API_BASE_URL}/api/device-registration`, registration, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    console.log(`✅ Registrazione creata con successo: ${response.data.message}`);
    return response.data;
  } catch (error) {
    if (error.response) {
      console.error(`❌ Errore API (${error.response.status}):`, error.response.data.message);
    } else if (error.request) {
      console.error('❌ Errore di connessione:', error.message);
    } else {
      console.error('❌ Errore generico:', error.message);
    }
    return null;
  }
}

// Funzione principale per creare tutte le registrazioni demo
async function generateAllDemoRegistrations() {
  console.log('🚀 SCRIPT GENERAZIONE REGISTRAZIONI DEMO SOFTWARE');
  console.log('==================================================\n');
  
  // Verifica connessione al server
  try {
    console.log('🔍 Verificando connessione al server...');
    await axios.get(`${API_BASE_URL}/api/products`, { timeout: 5000 });
    console.log('✅ Server raggiungibile\n');
  } catch (error) {
    console.error('❌ Server non raggiungibile. Assicurati che il server sia avviato.');
    console.error('💡 Suggerimento: Il server deve essere in esecuzione sulla porta 5000.');
    return;
  }

  let successCount = 0;
  let errorCount = 0;
  
  console.log(`📋 Creando ${demoRegistrations.length} registrazioni demo...\n`);
  
  for (const registration of demoRegistrations) {
    const result = await createRegistration(registration);
    
    if (result) {
      successCount++;
    } else {
      errorCount++;
    }
    
    // Pausa di 300ms tra le registrazioni per evitare sovraccarico
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  console.log('\n📊 RIEPILOGO CREAZIONE REGISTRAZIONI:');
  console.log(`   ✅ Registrazioni completate: ${successCount}`);
  console.log(`   ❌ Registrazioni fallite: ${errorCount}`);
  console.log(`   📈 Totale tentativi: ${demoRegistrations.length}`);
  
  // Raggruppamento per azienda
  const companiesMap = {};
  for (const registration of demoRegistrations) {
    if (!companiesMap[registration.nomeAzienda]) {
      companiesMap[registration.nomeAzienda] = {
        partitaIva: registration.partitaIva,
        prodotto: registration.prodotto,
        devices: 0
      };
    }
    companiesMap[registration.nomeAzienda].devices++;
  }
  
  console.log('\n🏢 AZIENDE CREATE:');
  Object.entries(companiesMap).forEach(([azienda, info]) => {
    console.log(`   • ${azienda} (${info.partitaIva}) - ${info.prodotto} - ${info.devices} dispositivi`);
  });
  
  if (successCount > 0) {
    console.log('\n🎉 SCRIPT COMPLETATO CON SUCCESSO!');
    console.log('📋 Le registrazioni demo sono state create nelle tabelle:');
    console.log('   - Testa_Reg_Azienda (informazioni aziende)');
    console.log('   - Dett_Reg_Azienda (dettagli dispositivi)');
    console.log('\n💡 Vai nella sezione "Registrazioni Software" per visualizzarle.');
  } else {
    console.log('\n⚠️  Nessuna registrazione creata. Controlla i logs per maggiori dettagli.');
  }
}

// Avvia lo script
generateAllDemoRegistrations().catch(error => {
  console.error('\n💥 ERRORE FATALE:', error.message);
  process.exit(1);
});
