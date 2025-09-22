const { BlobServiceClient } = require('@azure/storage-blob');

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING || 
  'DefaultEndpointsProtocol=https;AccountName=notaversefiles;AccountKey=PdeMgtTT73Oo+noQ9wHCiSZbPIOIodcJM8HWwsna7K1HC21fFeq6uh2LZaeTzjDzy7zN6lPXEI0O+ASt38/khQ==;EndpointSuffix=core.windows.net';

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