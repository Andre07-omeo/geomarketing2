#!/usr/bin/env node

// Charger le fichier .env.local manuellement
const fs = require('fs');
const path = require('path');

// Lire et parser le fichier .env.local
function loadEnvFile(filePath) {
  try {
    const envPath = path.resolve(process.cwd(), filePath);
    if (!fs.existsSync(envPath)) {
      console.log(`⚠️ Fichier ${filePath} non trouvé`);
      return {};
    }
    
    const content = fs.readFileSync(envPath, 'utf8');
    const env = {};
    
    content.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          env[key.trim()] = valueParts.join('=').trim();
        }
      }
    });
    
    return env;
  } catch (error) {
    console.error('Erreur lors du chargement du fichier .env:', error);
    return {};
  }
}

// Charger les variables
const envVars = loadEnvFile('.env.local');
const envVarsProd = loadEnvFile('.env.production');

// Fusionner (production prime sur local)
const allVars = { ...envVars, ...envVarsProd };

// Mettre dans process.env
Object.keys(allVars).forEach(key => {
  process.env[key] = allVars[key];
});

// Liste des variables d'environnement REQUISES
const requiredEnvVars = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
];

console.log('\n🔍 Vérification des variables d\'environnement...\n');

// Récupérer les variables manquantes
const missing = requiredEnvVars.filter(
  (varName) => !process.env[varName] || 
  process.env[varName] === '' ||
  process.env[varName] === 'your_api_key_here' ||
  process.env[varName] === 'your_project_id'
);

if (missing.length > 0) {
  console.log('❌ Variables d\'environnement manquantes ou non configurées:');
  missing.forEach((varName) => {
    console.log(`   - ${varName}`);
  });
  console.log('\n💡 Assurez-vous que .env.local contient toutes les variables.');
  console.log('   Exemple:');
  console.log('   NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...');
  console.log('\n');
  process.exit(1);
} else {
  console.log('✅ Toutes les variables d\'environnement sont définies.');
  console.log('\n📋 Configuration actuelle:');
  console.log(`   - Firebase Project: ${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}`);
  console.log(`   - App Name: ${process.env.NEXT_PUBLIC_APP_NAME || 'Non défini'}`);
  console.log(`   - Environment: ${process.env.NEXT_PUBLIC_APP_ENV || 'Non défini'}`);
  console.log(`   - Logo URL: ${(process.env.NEXT_PUBLIC_LOGO_URL || 'Non défini').substring(0, 50)}...`);
  console.log('\n✅ Configuration valide !\n');
  process.exit(0);
}