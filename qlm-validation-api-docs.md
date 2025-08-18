
# QLM License Validation API

## Endpoint di Validazione Licenza

### POST /api/software/validate

Verifica la validità di una licenza e l'autorizzazione del dispositivo.

#### Headers
```
Content-Type: application/json
User-Agent: NomeSoftware-Validation/1.0
```

#### Request Body
```json
{
  "partitaIva": "12345678901",
  "nomeSoftware": "MioSoftware Pro", 
  "computerKey": "COMP-1234567890-ABC123DEF",
  "machineInfo": "Windows 10 Pro - DESKTOP-ABC123"
}
```

#### Parametri Richiesti
- `partitaIva`: Partita IVA dell'azienda registrata
- `nomeSoftware`: Nome del software che richiede validazione
- `computerKey`: Chiave univoca del dispositivo (ottenuta durante registrazione)
- `machineInfo`: Informazioni sul sistema operativo e hardware (opzionale)

---

## Risposte API

### 1. Licenza Valida e Dispositivo Autorizzato ✅
```json
{
  "success": true,
  "deviceAuthorized": true,
  "licenseValidityDays": 365,
  "licenseType": "abbonamento_annuale",
  "maxDevices": 5,
  "maxUsers": 10,
  "activationKey": "LIC-12345678-ABCDEF12",
  "message": "Licenza valida per 365 giorni"
}
```

### 2. Licenza Permanente Valida ✅
```json
{
  "success": true,
  "deviceAuthorized": true,
  "licenseValidityDays": -1,
  "licenseType": "permanente",
  "maxDevices": 1,
  "maxUsers": 1,
  "activationKey": "LIC-87654321-FEDCBA98",
  "message": "Licenza permanente valida"
}
```

### 3. Dispositivo Non Autorizzato ❌
```json
{
  "success": false,
  "deviceAuthorized": false,
  "licenseValidityDays": 0,
  "message": "Dispositivo non autorizzato per questa licenza"
}
```

### 4. Licenza Scaduta ❌
```json
{
  "success": false,
  "deviceAuthorized": false,
  "licenseValidityDays": 0,
  "message": "Licenza scaduta"
}
```

### 5. Azienda Non Registrata ❌
```json
{
  "success": false,
  "deviceAuthorized": false,
  "licenseValidityDays": 0,
  "message": "Azienda non registrata nel sistema"
}
```

### 6. Nessuna Licenza Assegnata ❌
```json
{
  "success": false,
  "deviceAuthorized": false,
  "licenseValidityDays": 0,
  "message": "Nessuna licenza assegnata per questa azienda"
}
```

### 7. Licenza Non Attiva ❌
```json
{
  "success": false,
  "deviceAuthorized": false,
  "licenseValidityDays": 0,
  "message": "Licenza non attiva (stato: sospesa)"
}
```

---

## Codici di Stato HTTP

- **200 OK**: Richiesta elaborata correttamente (controllare `success` nel body)
- **400 Bad Request**: Parametri mancanti o non validi
- **500 Internal Server Error**: Errore del server

---

## Logica di Validazione

1. **Verifica Registrazione**: Controlla se l'azienda è registrata
2. **Verifica Licenza**: Controlla se c'è una licenza assegnata
3. **Verifica Stato**: Controlla se la licenza è attiva
4. **Verifica Dispositivo**: Controlla se il computerKey è autorizzato
5. **Verifica Scadenza**: Calcola i giorni rimanenti di validità
6. **Aggiorna Accesso**: Registra l'ultimo accesso del dispositivo

---

## Note Implementative

- Le licenze permanenti restituiscono `licenseValidityDays: -1`
- Il campo `deviceAuthorized` indica se il dispositivo specifico può usare la licenza
- `maxDevices` e `maxUsers` indicano i limiti della licenza
- La validazione aggiorna automaticamente il `dataUltimoAccesso` del dispositivo
- Usa HTTPS in produzione per proteggere le chiavi di licenza

---

## Frequenza Consigliata

- **All'avvio**: Sempre validare all'avvio del software
- **Periodica**: Ogni 24 ore per licenze attive
- **Prima di funzioni critiche**: Per funzionalità che richiedono licenza valida
- **Dopo lungo periodo offline**: Se il software è stato offline per più di 7 giorni
