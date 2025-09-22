import React, { useEffect, useState } from 'react';
import { azureBlobService } from '../services/azureBlobService';
import { BlobServiceClient } from '@azure/storage-blob';

export const AzureTestPage: React.FC = () => {
  const [status, setStatus] = useState<string>('Testing...');
  const [details, setDetails] = useState<any>({});
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    console.log(message);
    setLogs(prev => [...prev, message]);
  };

  useEffect(() => {
    const testAzure = async () => {
      addLog('🧪 Starting Azure test...');
      
      // Check environment variables
      const envVars = {
        connectionString: import.meta.env.VITE_AZURE_STORAGE_CONNECTION_STRING,
        accountName: import.meta.env.VITE_AZURE_STORAGE_ACCOUNT_NAME,
        accountKey: import.meta.env.VITE_AZURE_STORAGE_ACCOUNT_KEY,
        containerName: import.meta.env.VITE_AZURE_STORAGE_CONTAINER_NAME
      };
      
      addLog('📊 Environment variables loaded');
      setDetails(envVars);
      
      // Test direct Azure SDK initialization
      try {
        addLog('🔧 Testing direct Azure SDK with simple URL approach...');
        
        // Use simple browser-compatible initialization
        const serviceUrl = `https://${envVars.accountName}.blob.core.windows.net`;
        const directClient = new BlobServiceClient(serviceUrl);
        
        addLog('✅ Direct Azure SDK initialization successful!');
        
        // Test container client
        const containerClient = directClient.getContainerClient('collaboration-files');
        addLog('✅ Container client created successfully!');
        
        // For now, we'll skip the listing test since it requires auth
        // We'll test actual uploads through the Azure Functions API
        addLog('✅ Basic client setup test successful!');
        
        setStatus('Direct SDK test passed!');
        
        // Now test our service
        addLog('🔧 Testing our service...');
        const isConfigured = azureBlobService.isConfigured();
        addLog(`Service initially configured: ${isConfigured}`);
        
        if (!isConfigured) {
          addLog('🔄 Attempting manual service initialization...');
          const success = azureBlobService.manualInit(
            envVars.connectionString,
            envVars.accountName || '',
            envVars.accountKey || ''
          );
          addLog(`Manual init result: ${success}`);
          setStatus(success ? 'Service manual init successful!' : 'Service manual init failed!');
        } else {
          setStatus('Service already configured!');
        }
        
      } catch (error) {
        addLog(`❌ Direct SDK test failed: ${error instanceof Error ? error.message : error}`);
        setStatus('Direct SDK test failed!');
      }
    };
    
    testAzure();
  }, []);

  return (
    <div className="p-8 bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
      <h1 className="text-2xl font-bold mb-4">Azure Blob Storage Test</h1>
      
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold">Status:</h2>
          <p className="text-lg">{status}</p>
        </div>
        
        <div>
          <h2 className="text-lg font-semibold">Service Status:</h2>
          <p>Configured: {azureBlobService.isConfigured() ? '✅ Yes' : '❌ No'}</p>
        </div>
        
        <div>
          <h2 className="text-lg font-semibold">Debug Logs:</h2>
          <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded text-sm h-64 overflow-auto">
            {logs.map((log, index) => (
              <div key={index} className="mb-1">{log}</div>
            ))}
          </div>
        </div>
        
        <div>
          <h2 className="text-lg font-semibold">Environment Variables:</h2>
          <pre className="bg-gray-100 dark:bg-gray-700 p-4 rounded text-sm overflow-auto">
            {JSON.stringify(details, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
};