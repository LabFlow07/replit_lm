// Script to fix shadow user token in browser console
// Run this in the browser console to update the token

console.log('Fixing shadow user token...');

// Set the correct token
const correctToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImRiMjdmNTYzLWU4OTgtNGUwZC05ZjA1LTdlOTg0YzIwYjM1ZiIsInVzZXJuYW1lIjoic2hhZG93Iiwicm9sZSI6ImFkbWluIiwiY29tcGFueUlkIjoiMTRjMWQ4MjMtNjI2ZC00YWRlLWFkMWQtNjFhZjA2NzEwMzRmIiwiaWF0IjoxNzU0MzIxODMxLCJleHAiOjE3NTQ0MDgyMzF9.FGcaXi1aym2_9vGsTXtWt4cyVrvRGCgz6yyWBCNFHkk";

localStorage.setItem('qlm_token', correctToken);
console.log('Token updated! Reload the page to see the filtered data.');

// Optionally reload the page automatically
window.location.reload();