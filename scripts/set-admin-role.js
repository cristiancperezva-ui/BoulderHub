import { readFileSync } from 'fs';
import { google } from 'googleapis';

const KEY_FILE = './firebase-admin-key.json';
const TARGET_EMAIL = process.argv[2];

if (!TARGET_EMAIL) { console.error('Uso: node scripts/set-admin-role.js <email>'); process.exit(1); }

async function main() {
  const key = JSON.parse(readFileSync(KEY_FILE, 'utf-8'));
  const auth = new google.auth.JWT({
    email: key.client_email,
    key: key.private_key,
    scopes: ['https://www.googleapis.com/auth/datastore', 'https://www.googleapis.com/auth/firebase'],
  });

  const baseUrl = `https://firestore.googleapis.com/v1/projects/${key.project_id}/databases/(default)/documents`;

  try {
    // List all users documents
    const listRes = await auth.request({ url: baseUrl + '/users', method: 'GET' });
    const docs = listRes.data?.documents || [];
    
    if (docs.length === 0) {
      console.log('No hay usuarios en Firestore. Inicia sesion primero en la app.');
      return;
    }

    let found = null;
    for (const doc of docs) {
      const email = doc.fields?.email?.stringValue;
      if (email === TARGET_EMAIL) {
        found = doc;
        break;
      }
    }

    if (!found) {
      console.log('Usuario con email', TARGET_EMAIL, 'no encontrado.');
      console.log('Usuarios disponibles:', docs.map(d => d.fields?.email?.stringValue || '?').join(', '));
      return;
    }

    const userId = found.name.split('/').pop();
    console.log('Usuario encontrado:', userId);
    console.log('Nombre:', found.fields?.displayName?.stringValue || '');

    // Update roles
    await auth.request({
      url: `${baseUrl}/users/${userId}?updateMask.fieldPaths=roles`,
      method: 'PATCH',
      data: {
        fields: {
          roles: {
            arrayValue: {
              values: [
                { stringValue: 'admin' },
                { stringValue: 'routesetter' },
                { stringValue: 'climber' },
              ],
            },
          },
        },
      },
    });

    console.log('Roles asignados: admin, routesetter, climber');
  } catch (err) {
    console.error('Error:', err.message);
    if (err.response) console.error('Data:', JSON.stringify(err.response.data).slice(0, 300));
  }
}

main().catch(console.error);
