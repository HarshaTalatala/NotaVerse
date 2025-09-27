const { BlobServiceClient } = require('@azure/storage-blob');

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
if (!connectionString) {
  console.error('ERROR: AZURE_STORAGE_CONNECTION_STRING is not set.\nSet it in api/local.settings.json (from local.settings.json.template) or as an environment variable.');
  process.exit(1);
}

async function configureBlobCors() {
  try {
    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    
    // Configure CORS rules
    const corsRules = [
      {
        allowedOrigins: '*',
        allowedMethods: 'GET,PUT,POST,DELETE,HEAD,OPTIONS',
        allowedHeaders: '*',
        exposedHeaders: '*',
        maxAgeInSeconds: 3600
      }
    ];

    console.log('🔧 Configuring Azure Blob Storage CORS...');
    
    // Set CORS rules
    await blobServiceClient.setProperties({
      cors: corsRules
    });
    
    console.log('✅ Azure Blob Storage CORS configured successfully!');
    console.log('CORS Rules:', JSON.stringify(corsRules, null, 2));

    // Verify the configuration
    const properties = await blobServiceClient.getProperties();
    console.log('📋 Current CORS configuration:', properties.cors);
    
  } catch (error) {
    console.error('❌ Error configuring CORS:', error.message);
    console.error('Full error:', error);
  }
}

configureBlobCors();