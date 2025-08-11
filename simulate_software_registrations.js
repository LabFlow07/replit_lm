#!/usr/bin/env node

/**
 * Script per simulare registrazioni software tramite API QLM
 * Popola le tabelle Testa_Reg_Azienda e Dett_Reg_Azienda
 */

import fetch from 'node-fetch';

// Configurazione
const API_BASE = 'http://localhost:5000';
const ENDPOINT = '/api/software/register';

// Dati di test per simulare diverse aziende e software
const testData = [
  {
    nomeAzienda: 'TechCorp Italia SpA',
    partitaIva: '12345678901',
    nomeSoftware: 'QLM Management Suite',
    versione: '3.2.1',
    installationPath: 'C:\\Program Files\\QLM\\Management',
    devices: [
      { computerKey: 'TCORP-WS001-ABC123', machineInfo: 'Windows 11 Pro - Workstation Marketing' },
      { computerKey: 'TCORP-SRV001-DEF456', machineInfo: 'Windows Server 2022 - Database Server' }
    ]
  },
  {
    nomeAzienda: 'Innovazione Digitale Srl',
    partitaIva: '09876543210',
    nomeSoftware: 'CAD Professional',
    versione: '2024.1',
    installationPath: 'C:\\Program Files\\AutoCAD\\2024',
    devices: [
      { computerKey: 'INNOV-CAD01-GHI789', machineInfo: 'Windows 10 Pro - CAD Workstation 1' },
      { computerKey: 'INNOV-CAD02-JKL012', machineInfo: 'Windows 10 Pro - CAD Workstation 2' },
      { computerKey: 'INNOV-LAP01-MNO345', machineInfo: 'Windows 11 Pro - Laptop Designer' }
    ]
  },
  {
    nomeAzienda: 'Studio Legale Rossi & Associati',
    partitaIva: '11223344556',
    nomeSoftware: 'LegalSoft Pro',
    versione: '8.5.2',
    installationPath: 'C:\\Program Files\\LegalSoft\\Pro',
    devices: [
      { computerKey: 'LEGAL-PC01-PQR678', machineInfo: 'Windows 11 Pro - Avv. Rossi' },
      { computerKey: 'LEGAL-PC02-STU901', machineInfo: 'Windows 10 Pro - Segreteria' }
    ]
  },
  {
    nomeAzienda: 'Manifattura Metalli SpA',
    partitaIva: '55667788990',
    nomeSoftware: 'Industrial Control System',
    versione: '12.3',
    installationPath: 'C:\\ICS\\Production',
    devices: [
      { computerKey: 'METAL-CTRL01-VWX234', machineInfo: 'Windows 10 IoT - Production Line 1' },
      { computerKey: 'METAL-CTRL02-YZA567', machineInfo: 'Windows 10 IoT - Production Line 2' },
      { computerKey: 'METAL-OFFICE-BCD890', machineInfo: 'Windows 11 Pro - Production Manager' }
    ]
  },
  {
    nomeAzienda: 'Farmacia Centrale',
    partitaIva: '99887766554',
    nomeSoftware: 'PharmacyManager Plus',
    versione: '7.1.4',
    installationPath: 'C:\\Program Files\\PharmacyManager',
    devices: [
      { computerKey: 'PHARM-POS01-EFG123', machineInfo: 'Windows 10 Pro - Cassa 1' },
      { computerKey: 'PHARM-POS02-HIJ456', machineInfo: 'Windows 10 Pro - Cassa 2' },
      { computerKey: 'PHARM-BACK-KLM789', machineInfo: 'Windows 11 Pro - Gestione Magazzino' }
    ]
  },
  {
    nomeAzienda: 'Costruzioni Moderne Srl',
    partitaIva: '33445566778',
    nomeSoftware: 'Building Information Modeling',
    versione: '2024.2',
    installationPath: 'C:\\Program Files\\Autodesk\\BIM',
    devices: [
      { computerKey: 'BUILD-ARCH01-NOP012', machineInfo: 'Windows 11 Pro - Architetto Capo' },
      { computerKey: 'BUILD-ENG01-QRS345', machineInfo: 'Windows 10 Pro - Ingegnere Strutturale' }
    ]
  },
  {
    nomeAzienda: 'Logistica Express',
    partitaIva: '77889900112',
    nomeSoftware: 'Fleet Management System',
    versione: '5.8.1',
    installationPath: 'C:\\FleetMgmt\\System',
    devices: [
      { computerKey: 'FLEET-HQ01-TUV678', machineInfo: 'Windows 11 Pro - Centrale Operativa' },
      { computerKey: 'FLEET-TAB01-WXY901', machineInfo: 'Windows 10 Pro - Tablet Dispatcher' }
    ]
  },
  {
    nomeAzienda: 'Agenzia Marketing Plus',
    partitaIva: '22334455667',
    nomeSoftware: 'Creative Suite Professional',
    versione: '2024.1.1',
    installationPath: 'C:\\Program Files\\Adobe\\CreativeSuite',
    devices: [
      { computerKey: 'MKTG-DES01-ZAB234', machineInfo: 'Windows 11 Pro - Graphic Designer' },
      { computerKey: 'MKTG-DES02-CDE567', machineInfo: 'Windows 11 Pro - Video Editor' },
      { computerKey: 'MKTG-LAP01-FGH890', machineInfo: 'MacBook Pro M3 - Creative Director' }
    ]
  }
];

// Funzione per effettuare una registrazione software
async function registerSoftware(companyData, device) {
  const payload = {
    nomeAzienda: companyData.nomeAzienda,
    partitaIva: companyData.partitaIva,
    nomeSoftware: companyData.nomeSoftware,
    versione: companyData.versione,
    computerKey: device.computerKey,
    installationPath: companyData.installationPath,
    machineInfo: device.machineInfo,
    registrationDate: new Date().toISOString()
  };

  try {
    console.log(`📡 Registrando: ${companyData.nomeAzienda} - ${device.computerKey}`);
    
    const response = await fetch(`${API_BASE}${ENDPOINT}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'QLM-Software-Registration-Simulator/1.0'
      },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      const result = await response.json();
      console.log(`✅ Registrazione completata: ID ${result.testaId}/${result.dettId}`);
      return { success: true, data: result };
    } else {
      const error = await response.text();
      console.log(`❌ Errore registrazione: ${response.status} - ${error}`);
      return { success: false, error: `${response.status}: ${error}` };
    }
  } catch (error) {
    console.log(`🚨 Errore di rete: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Funzione principale per eseguire tutte le registrazioni
async function simulateRegistrations() {
  console.log('🚀 Avvio simulazione registrazioni software...\n');
  console.log(`📍 Server: ${API_BASE}${ENDPOINT}\n`);

  let totalRegistrations = 0;
  let successfulRegistrations = 0;
  let failedRegistrations = 0;

  // Conta il totale delle registrazioni
  testData.forEach(company => {
    totalRegistrations += company.devices.length;
  });

  console.log(`📊 Totale registrazioni da processare: ${totalRegistrations}\n`);

  // Esegui le registrazioni
  for (const company of testData) {
    console.log(`🏢 Processando: ${company.nomeAzienda} (P.IVA: ${company.partitaIva})`);
    console.log(`   Software: ${company.nomeSoftware} v${company.versione}`);
    console.log(`   Dispositivi: ${company.devices.length}\n`);

    for (const device of company.devices) {
      const result = await registerSoftware(company, device);
      
      if (result.success) {
        successfulRegistrations++;
      } else {
        failedRegistrations++;
      }

      // Pausa di 500ms tra le registrazioni per non sovraccaricare il server
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log(''); // Riga vuota tra aziende
  }

  // Riassunto finale
  console.log('═'.repeat(60));
  console.log('📈 RIASSUNTO SIMULAZIONE');
  console.log('═'.repeat(60));
  console.log(`✅ Registrazioni riuscite: ${successfulRegistrations}`);
  console.log(`❌ Registrazioni fallite: ${failedRegistrations}`);
  console.log(`📊 Totale processate: ${totalRegistrations}`);
  console.log(`🎯 Tasso di successo: ${((successfulRegistrations / totalRegistrations) * 100).toFixed(1)}%`);
  
  if (successfulRegistrations > 0) {
    console.log('\n🎉 Simulazione completata! Puoi ora visualizzare le registrazioni nell\'interfaccia QLM.');
    console.log('📋 Le registrazioni sono state salvate nelle tabelle:');
    console.log('   • Testa_Reg_Azienda (informazioni azienda/software)');
    console.log('   • Dett_Reg_Azienda (dettagli dispositivi)');
  }
}

// Avvia la simulazione
simulateRegistrations().catch(error => {
  console.error('🚨 Errore fatale durante la simulazione:', error);
  process.exit(1);
});

export { simulateRegistrations, registerSoftware };