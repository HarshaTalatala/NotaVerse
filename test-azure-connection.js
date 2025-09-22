#!/usr/bin/env node

// Azure Blob Storage Connection Test
// Run this after setting up your .env file

import { BlobServiceClient } from '@azure/storage-blob';
import dotenv from 'dotenv';

dotenv.config();

async function testAzureConnection() {
  console.log('🧪 Testing Azure Blob Storage Connection...\n');
  
  // Check environment variables
  const connectionString = process.env.VITE_AZURE_STORAGE_CONNECTION_STRING;
  const accountName = process.env.VITE_AZURE_STORAGE_ACCOUNT_NAME;
  const containerName = process.env.VITE_AZURE_STORAGE_CONTAINER_NAME || 'collaboration-files';
  
  if (!connectionString) {
    console.error('❌ VITE_AZURE_STORAGE_CONNECTION_STRING not found in .env');
    console.log('💡 Add your connection string to .env file');
    process.exit(1);
  }
  
  if (!accountName) {
    console.error('❌ VITE_AZURE_STORAGE_ACCOUNT_NAME not found in .env');
    process.exit(1);
  }
  
  try {
    // Test connection
    console.log('📡 Connecting to Azure Storage...');
    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    
    // Test container access
    console.log('📂 Checking container access...');
    const containerClient = blobServiceClient.getContainerClient(containerName);
    
    // Try to list blobs (will work even if container is empty)
    console.log('📋 Testing container permissions...');
    const iterator = containerClient.listBlobsFlat();
    const blobs = [];
    for await (const blob of iterator) {
      blobs.push(blob.name);
    }
    
    // Success!
    console.log('✅ Connection successful!');
    console.log(`📦 Storage Account: ${accountName}`);
    console.log(`📁 Container: ${containerName}`);
    console.log(`📄 Current files: ${blobs.length}`);
    
    if (blobs.length > 0) {
      console.log('📋 Files found:');
      blobs.forEach(name => console.log(`   - ${name}`));
    }
    
    console.log('\n🎉 Azure Blob Storage is ready for NotaVerse!');
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.log('\n💡 Troubleshooting:');
    console.log('   1. Check your connection string is correct');
    console.log('   2. Ensure the container "collaboration-files" exists');
    console.log('   3. Verify your Azure Storage Account is accessible');
  }
}

testAzureConnection();