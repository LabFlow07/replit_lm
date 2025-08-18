import type { License, InsertTransaction } from '@shared/schema';
import { DatabaseStorage } from './storage';

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
 * Processa i rinnovi automatici per le licenze in scadenza
 */
export async function processAutomaticRenewals(storage: DatabaseStorage): Promise<void> {
  try {
    console.log('Inizio processo rinnovi automatici...');
    
    // Trova tutte le licenze attive con rinnovo abilitato che scadono nei prossimi 7 giorni
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    
    const licenses = await storage.getLicenses();
    const renewalCandidates = licenses.filter(license => {
      // Solo licenze attive con rinnovo abilitato
      if (license.status !== 'attiva') return false;
      
      // Solo abbonamenti (non permanenti o trial)
      if (license.licenseType === 'permanente' || license.licenseType === 'trial') return false;
      
      // Solo licenze che scadono entro 7 giorni
      if (!license.expiryDate) return false;
      
      const expiryDate = new Date(license.expiryDate);
      return expiryDate <= sevenDaysFromNow;
    });
    
    console.log(`Trovate ${renewalCandidates.length} licenze candidate per il rinnovo automatico`);
    
    for (const license of renewalCandidates) {
      try {
        // Genera la transazione di rinnovo
        await generateRenewalTransaction(storage, license, 'rinnovo');
        
        // Calcola la nuova data di scadenza
        const newExpiryDate = calculateExpiryDate(
          license.licenseType,
          license.trialDays || 30,
          license.expiryDate || new Date()
        );
        
        if (newExpiryDate) {
          // Aggiorna la data di scadenza della licenza
          await storage.updateLicense(license.id, {
            expiryDate: newExpiryDate,
            notes: `Rinnovo automatico effettuato il ${new Date().toLocaleDateString('it-IT')}`
          });
          
          console.log(`Licenza ${license.activationKey} rinnovata fino al ${newExpiryDate.toLocaleDateString('it-IT')}`);
        }
        
      } catch (error) {
        console.error(`Errore nel rinnovo automatico della licenza ${license.id}:`, error);
      }
    }
    
    console.log('Processo rinnovi automatici completato');
    
  } catch (error) {
    console.error('Errore nel processo rinnovi automatici:', error);
    throw error;
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