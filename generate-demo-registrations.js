
const axios = require('axios');

// Configurazione dell'endpoint API
const API_BASE_URL = 'http://localhost:5000';

// Dati demo per le registrazioni
const demoRegistrations = [
  {
    partitaIva: '01234567890',
    nomeAzienda: 'Tech Solutions SRL',
    prodotto: 'CassaWow',
    versione: '4.2.1',
    modulo: 'standard',
    uidDispositivo: 'WS-001-MAIN',
    sistemaOperativo: 'Windows 10 Pro',
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
    sistemaOperativo: 'Linux Ubuntu 20.04',
    note: 'POS principale sala ristorante'
  },
  {
    partitaIva: '98765432109',
    nomeAzienda: 'Restaurant Bella Vista',
    prodotto: 'JollyMag',
    versione: '3.8.5',
    modulo: 'restaurant',
    uidDispositivo: 'POS-002-CASSA2',
    sistemaOperativo: 'Linux Ubuntu 20.04',
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

async function createRegistration(registration) {
  try {
    console.log(`Creando registrazione per ${registration.nomeAzienda} - ${registration.uidDispositivo}...`);
    
    const response = await axios.post(`${API_BASE_URL}/api/device-registration`, registration, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`✅ Registrazione creata con successo:`, {
      id: response.data.registrationId,
      azienda: registration.nomeAzienda,
      dispositivo: registration.uidDispositivo,
      status: response.data.registrationStatus
    });
    
    return response.data;
  } catch (error) {
    console.error(`❌ Errore durante la creazione della registrazione per ${registration.nomeAzienda}:`, 
      error.response?.data?.message || error.message);
    return null;
  }
}

async function generateAllDemoRegistrations() {
  console.log('🚀 Inizio generazione registrazioni demo...\n');
  
  const results = [];
  
  for (let i = 0; i < demoRegistrations.length; i++) {
    const registration = demoRegistrations[i];
    const result = await createRegistration(registration);
    
    if (result) {
      results.push(result);
    }
    
    // Pausa di 500ms tra le registrazioni per evitare sovraccarico
    if (i < demoRegistrations.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  console.log(`\n📊 Riepilogo creazione registrazioni:`);
  console.log(`   ✅ Successo: ${results.length}`);
  console.log(`   ❌ Fallite: ${demoRegistrations.length - results.length}`);
  console.log(`   📊 Totale: ${demoRegistrations.length}`);
  
  // Raggruppamento per azienda
  const companiesMap = {};
  results.forEach(result => {
    const registration = demoRegistrations.find(r => r.uidDispositivo === result.uidDispositivo);
    if (registration) {
      if (!companiesMap[registration.nomeAzienda]) {
        companiesMap[registration.nomeAzienda] = {
          partitaIva: registration.partitaIva,
          prodotto: registration.prodotto,
          devices: 0
        };
      }
      companiesMap[registration.nomeAzienda].devices++;
    }
  });
  
  console.log(`\n🏢 Aziende create:`);
  Object.entries(companiesMap).forEach(([azienda, info]) => {
    console.log(`   • ${azienda} (${info.partitaIva}) - ${info.prodotto} - ${info.devices} dispositivi`);
  });
  
  console.log(`\n🎯 Le registrazioni sono pronte per i test di assegnazione licenze!`);
  console.log(`   Vai in "Registrazioni Software" per vedere tutte le registrazioni create.`);
}

// Esecuzione dello script
generateAllDemoRegistrations().catch(console.error);
