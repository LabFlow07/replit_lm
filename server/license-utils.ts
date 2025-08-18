import type { License, InsertTransaction } from '@shared/schema';
import { DatabaseStorage } from './storage';
import cron from 'node-cron';

/**
 * Calcola la data di scadenza per una licenza basata sul tipo
 */
export function calculateExpiryDate(licenseType: string, trialDays: number = 30, fromDate?: Date): Date | null {
  const baseDate = fromDate || new Date();
  
  switch (licenseType) {
    case 'permanente':
      return null; // No expiry for permanent licenses
    
    case 'trial':
      const trialExpiry = new Date(baseDate);
      trialExpiry.setDate(trialExpiry.getDate() + trialDays);
      return trialExpiry;
    
    case 'abbonamento_mensile':
    case 'mensile':
      const monthlyExpiry = new Date(baseDate);
      monthlyExpiry.setMonth(monthlyExpiry.getMonth() + 1);
      monthlyExpiry.setDate(monthlyExpiry.getDate() - 1);
      return monthlyExpiry;
    
    case 'abbonamento_annuale':
    case 'annuale':
      const yearlyExpiry = new Date(baseDate);
      yearlyExpiry.setFullYear(yearlyExpiry.getFullYear() + 1);
      yearlyExpiry.setDate(yearlyExpiry.getDate() - 1);
      return yearlyExpiry;
    
    default:
      return null;
  }
}

/**
 * Genera una transazione per il rinnovo di una licenza
 */
export async function generateRenewalTransaction(
  storage: DatabaseStorage,
  license: License,
  renewalType: 'rinnovo' | 'attivazione' = 'rinnovo'
): Promise<void> {
  try {
    // Calcola l'importo per il rinnovo
    const amount = parseFloat(license.price?.toString() || '0');
    const discount = parseFloat(license.discount?.toString() || '0');
    const finalAmount = Math.max(0, amount - discount);
    
    // Ottieni i dati del cliente
    const client = await storage.getClientById(license.clientId);
    if (!client) {
      throw new Error(`Cliente non trovato per la licenza ${license.id}`);
    }
    
    // Crea la transazione
    const transactionData: InsertTransaction = {
      licenseId: license.id,
      clientId: client.id,
      companyId: client.companyId,
      type: renewalType,
      amount: amount.toString(),
      discount: discount.toString(),
      finalAmount: finalAmount.toString(),
      status: 'in_attesa',
      notes: `Transazione generata automaticamente per ${renewalType === 'rinnovo' ? 'rinnovo' : 'attivazione'} licenza ${license.activationKey}`
    };
    
    await storage.createTransaction(transactionData);
    console.log(`Transazione di ${renewalType} generata per licenza ${license.activationKey}: ${finalAmount}€`);
    
  } catch (error) {
    console.error(`Errore nella generazione della transazione di rinnovo per licenza ${license.id}:`, error);
    throw error;
  }
}

/**
 * Processa i rinnovi automatici per le licenze scadute alla mezzanotte
 */
export async function processAutomaticRenewals(storage: DatabaseStorage): Promise<void> {
  try {
    console.log('🔄 Inizio processo rinnovi automatici alla mezzanotte...');
    
    // Oggi (data corrente)
    const today = new Date();
    const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    const licenses = await storage.getLicenses();
    const renewalCandidates = licenses.filter(license => {
      // Solo licenze con rinnovo automatico abilitato
      if (!license.renewalEnabled) return false;
      
      // Solo licenze attive 
      if (license.status !== 'attiva') return false;
      
      // Solo abbonamenti (non permanenti o trial)
      if (license.licenseType === 'permanente' || license.licenseType === 'trial') return false;
      
      // Solo licenze che scadono oggi o sono già scadute
      if (!license.expiryDate) return false;
      
      const expiryDate = new Date(license.expiryDate);
      const expiryDateOnly = new Date(expiryDate.getFullYear(), expiryDate.getMonth(), expiryDate.getDate());
      
      // Licenza scade oggi o è già scaduta
      return expiryDateOnly <= todayDateOnly;
    });
    
    console.log(`📋 Trovate ${renewalCandidates.length} licenze con rinnovo automatico da processare`);
    
    if (renewalCandidates.length === 0) {
      console.log('✅ Nessuna licenza da rinnovare oggi');
      return;
    }
    
    let successfulRenewals = 0;
    let failedRenewals = 0;
    
    for (const license of renewalCandidates) {
      try {
        console.log(`🔄 Processando rinnovo per licenza ${license.activationKey}...`);
        
        // Genera la transazione di rinnovo
        await generateRenewalTransaction(storage, license, 'rinnovo');
        
        // Calcola la nuova data di scadenza partendo da oggi
        const newExpiryDate = calculateExpiryDate(
          license.licenseType,
          license.trialDays || 30,
          new Date() // Parte da oggi per evitare arretrati
        );
        
        if (newExpiryDate) {
          // Aggiorna la data di scadenza della licenza
          const currentNotes = license.notes || '';
          const renewalNote = `Rinnovo automatico effettuato il ${new Date().toLocaleDateString('it-IT')}`;
          const updatedNotes = currentNotes ? `${currentNotes}\n${renewalNote}` : renewalNote;
          
          await storage.updateLicense(license.id, {
            expiryDate: newExpiryDate,
            notes: updatedNotes,
            status: 'attiva' // Assicura che rimanga attiva
          });
          
          console.log(`✅ Licenza ${license.activationKey} rinnovata automaticamente fino al ${newExpiryDate.toLocaleDateString('it-IT')}`);
          successfulRenewals++;
        } else {
          console.error(`❌ Errore nel calcolo data scadenza per licenza ${license.activationKey}`);
          failedRenewals++;
        }
        
      } catch (error) {
        console.error(`❌ Errore nel rinnovo automatico della licenza ${license.id}:`, error);
        failedRenewals++;
      }
    }
    
    console.log(`🎯 Processo rinnovi automatici completato: ${successfulRenewals} successi, ${failedRenewals} errori`);
    
  } catch (error) {
    console.error('❌ Errore nel processo rinnovi automatici:', error);
    throw error;
  }
}

/**
 * Avvia il sistema di rinnovo automatico con schedulazione a mezzanotte
 */
export function startAutomaticRenewalScheduler(storage: DatabaseStorage): void {
  console.log('🕒 Avvio sistema di rinnovo automatico licenze...');
  
  // Schedula il rinnovo automatico ogni giorno alle 00:00 (mezzanotte)
  cron.schedule('0 0 * * *', async () => {
    console.log('🌅 Esecuzione rinnovi automatici programmata alle 00:00');
    try {
      await processAutomaticRenewals(storage);
    } catch (error) {
      console.error('❌ Errore nell\'esecuzione programmata dei rinnovi automatici:', error);
    }
  }, {
    scheduled: true,
    timezone: "Europe/Rome" // Fuso orario italiano
  });
  
  console.log('✅ Sistema di rinnovo automatico attivato - esecuzione giornaliera alle 00:00 (Europe/Rome)');
  
  // Test immediato opzionale (solo in sviluppo)
  if (process.env.NODE_ENV === 'development') {
    console.log('🔧 Modalità sviluppo: esecuzione test rinnovi...');
    // Uncomment per test immediato in sviluppo:
    // processAutomaticRenewals(storage).catch(console.error);
  }
}

/**
 * Aggiorna le scadenze per tutte le licenze che non hanno ancora una data di scadenza
 */
export async function updateMissingExpiryDates(storage: DatabaseStorage): Promise<void> {
  try {
    console.log('Aggiornamento date scadenza mancanti...');
    
    const licenses = await storage.getLicenses();
    let updatedCount = 0;
    
    console.log(`Controllando ${licenses.length} licenze...`);
    
    for (const license of licenses) {
      try {
        const updates: any = {};
        let needsUpdate = false;
        
        // Aggiorna data di attivazione se mancante per licenze attive
        if (!license.activationDate && license.status === 'attiva') {
          updates.activationDate = new Date();
          needsUpdate = true;
          console.log(`Aggiornando data attivazione per licenza ${license.activationKey}`);
        }
        
        // Aggiorna data di scadenza se mancante per licenze non permanenti
        if (!license.expiryDate && license.licenseType !== 'permanente') {
          const expiryDate = calculateExpiryDate(
            license.licenseType,
            license.trialDays || 30,
            license.activationDate || license.createdAt || new Date()
          );
          
          if (expiryDate) {
            updates.expiryDate = expiryDate;
            needsUpdate = true;
            console.log(`Aggiornando scadenza licenza ${license.activationKey}: ${expiryDate.toLocaleDateString('it-IT')}`);
          }
        }
        
        if (needsUpdate) {
          await storage.updateLicense(license.id, updates);
          updatedCount++;
        }
        
      } catch (error) {
        console.error(`Errore nell'aggiornamento licenza ${license.id}:`, error);
      }
    }
    
    console.log(`Aggiornamento completato: ${updatedCount} licenze aggiornate`);
    
  } catch (error) {
    console.error('Errore nell\'aggiornamento date scadenza:', error);
    throw error;
  }
}