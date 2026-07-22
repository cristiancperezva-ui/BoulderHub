/**
 * Script para habilitar Google Sign-In en Firebase Auth
 */
import { readFileSync } from 'fs';
import { google } from 'googleapis';

const KEY_FILE = './firebase-admin-key.json';

async function main() {
  const key = JSON.parse(readFileSync(KEY_FILE, 'utf-8'));

  const auth = new google.auth.JWT({
    email: key.client_email,
    key: key.private_key,
    scopes: ['https://www.googleapis.com/auth/identitytoolkit',
             'https://www.googleapis.com/auth/firebase'],
  });

  await auth.authorize();
  const projectId = key.project_id;

  // Get current config
  const getUrl = `https://identitytoolkit.googleapis.com/admin/v2/projects/${projectId}/config`;
  const getRes = await auth.request({ url: getUrl, method: 'GET' });
  console.log('Current providers:', JSON.stringify(getRes.data?.signIn?.providers, null, 2));

  // Build providers list
  const existingProviders = getRes.data?.signIn?.providers || [];
  const providers = [];
  let hasGoogle = false;

  for (const p of existingProviders) {
    providers.push({ providerId: p.providerId, enabled: p.enabled });
    if (p.providerId === 'google.com') hasGoogle = true;
  }

  if (!hasGoogle) {
    providers.push({ providerId: 'google.com', enabled: true });
    console.log('Adding Google provider...');
  } else {
    console.log('Google provider exists, enabling...');
    // Update it to enabled
    for (const p of providers) {
      if (p.providerId === 'google.com') p.enabled = true;
    }
  }

  // Add authorized domains if needed
  const authorizedDomains = getRes.data?.signIn?.authorizedDomains || [];
  const domainsToAdd = ['boulderhub-app.web.app', 'localhost'];
  for (const d of domainsToAdd) {
    if (!authorizedDomains.includes(d)) authorizedDomains.push(d);
  }

  const patchBody = {
    signIn: {
      providers,
      authorizedDomains,
    },
  };

  const patchUrl = `https://identitytoolkit.googleapis.com/admin/v2/projects/${projectId}/config?updateMask=signIn.providers,signIn.authorizedDomains`;
  
  console.log('Patching with providers:', JSON.stringify(providers, null, 2));
  console.log('Domains:', JSON.stringify(authorizedDomains, null, 2));

  try {
    const patchRes = await auth.request({
      url: patchUrl,
      method: 'PATCH',
      data: patchBody,
    });
    console.log('✅ Google provider enabled successfully!');
    console.log('Response:', JSON.stringify(patchRes.data?.signIn?.providers, null, 2));
  } catch (err) {
    console.error('❌ Error:', err.message);
    if (err.response) {
      console.error('Response:', JSON.stringify(err.response.data, null, 2));
    }
  }
}

main().catch(console.error);
