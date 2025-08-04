// Script per aggiornare il token di shadow nel browser
// Esegui questo comando nella console del browser per aggiornare il token

console.log('🔧 Aggiornamento token utente shadow...');

// Token corretto e aggiornato
const correctToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImRiMjdmNTYzLWU4OTgtNGUwZC05ZjA1LTdlOTg0YzIwYjM1ZiIsInVzZXJuYW1lIjoic2hhZG93Iiwicm9sZSI6ImFkbWluIiwiY29tcGFueUlkIjoiMTRjMWQ4MjMtNjI2ZC00YWRlLWFkMWQtNjFhZjA2NzEwMzRmIiwiaWF0IjoxNzU0MzIyMjAwLCJleHAiOjE3NTQ0MDg2MDB9.AZPk4Zxj_mkuebFRX4gcn139akMgV_7MIv36R_ZdnzM";

localStorage.setItem('qlm_token', correctToken);
console.log('✅ Token aggiornato! La pagina si ricaricherà automaticamente...');
console.log('📊 Dopo il ricaricamento vedrai solo i dati filtrati per admin.');

// Ricarica automatica della pagina
window.location.reload();