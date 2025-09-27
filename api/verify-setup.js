#!/usr/bin/env node

/**
 * Test script to verify Azure Functions backend setup
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 NotaVerse Backend Setup Verification\n');

// SECURITY NOTE: Do NOT commit `local.settings.json` or other files containing secrets.
// Use `local.settings.json.template` and copy to `local.settings.json` with your own values.
const templatePath = path.join(__dirname, 'local.settings.json.template');
if (!fs.existsSync(templatePath)) {
    console.warn('⚠️  local.settings.json.template is missing. Please create one from the project templates.');
}

// Check if we're in the right directory
const packageJsonPath = path.join(__dirname, 'package.json');
if (!fs.existsSync(packageJsonPath)) {
    console.error('❌ package.json not found. Make sure you\'re running this from the api directory.');
    process.exit(1);
}

// Read package.json
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
console.log(`📦 Project: ${packageJson.name} v${packageJson.version}`);

// Check dependencies
const requiredDeps = [
    '@azure/functions',
    '@google/generative-ai',
    'pdf-parse',
    'mammoth'
];

const missingDeps = requiredDeps.filter(dep => !packageJson.dependencies[dep]);
if (missingDeps.length > 0) {
    console.error(`❌ Missing dependencies: ${missingDeps.join(', ')}`);
    console.log('Run: npm install');
    process.exit(1);
}
console.log('✅ All required dependencies found');

// Check local.settings.json
const settingsPath = path.join(__dirname, 'local.settings.json');
if (!fs.existsSync(settingsPath)) {
    console.error('❌ local.settings.json not found');
    console.log('Copy local.settings.json.template to local.settings.json and configure it');
    process.exit(1);
}

const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
const geminiKey = settings.Values?.GEMINI_API_KEY;

if (!geminiKey || geminiKey === 'your_google_gemini_api_key_here') {
    console.warn('⚠️  GEMINI_API_KEY not configured in local.settings.json');
    console.log('Get your API key from: https://makersuite.google.com/app/apikey');
} else {
    console.log('✅ GEMINI_API_KEY configured (value hidden)');
}

// Check function files
const functionsDir = path.join(__dirname, 'src', 'functions');
const requiredFunctions = ['upload.ts', 'ask.ts', 'status.ts'];

for (const func of requiredFunctions) {
    const funcPath = path.join(functionsDir, func);
    if (fs.existsSync(funcPath)) {
        console.log(`✅ Function ${func} found`);
    } else {
        console.error(`❌ Function ${func} missing`);
    }
}

// Check utils
const utilsDir = path.join(__dirname, 'src', 'utils');
const requiredUtils = ['textExtractor.ts', 'aiService.ts', 'storage.ts'];

for (const util of requiredUtils) {
    const utilPath = path.join(utilsDir, util);
    if (fs.existsSync(utilPath)) {
        console.log(`✅ Utility ${util} found`);
    } else {
        console.error(`❌ Utility ${util} missing`);
    }
}

console.log('\n🎯 Next Steps:');
console.log('1. Configure GEMINI_API_KEY in local.settings.json');
console.log('2. Run: npm install');
console.log('3. Run: npm run build');
console.log('4. Run: npm start');
console.log('5. Test endpoints:');
console.log('   - GET  http://localhost:7071/api/status');
console.log('   - POST http://localhost:7071/api/upload (with file)');
console.log('   - POST http://localhost:7071/api/ask (with question)');

console.log('\n✨ Ready for hackathon development!');