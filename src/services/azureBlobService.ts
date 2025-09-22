import { BlobServiceClient, ContainerClient } from '@azure/storage-blob';

export interface UploadResult {
  url: string;
  fileName: string;
  size: number;
  mimeType: string;
  blobName: string;
}

export interface BlobFile {
  name: string;
  url: string;
  size: number;
  lastModified: Date;
  mimeType: string;
  downloadUrl: string;
}

class AzureBlobService {
  private blobServiceClient: BlobServiceClient | null = null;
  private containerClient: ContainerClient | null = null;
  private accountName: string = '';
  private accountKey: string = '';
  private containerName: string = 'collaboration-files';

  constructor() {
    this.initializeService();
  }

  private initializeService() {
    const connectionString = import.meta.env.VITE_AZURE_STORAGE_CONNECTION_STRING;
    this.accountName = import.meta.env.VITE_AZURE_STORAGE_ACCOUNT_NAME || '';
    this.accountKey = import.meta.env.VITE_AZURE_STORAGE_ACCOUNT_KEY || '';

    // Debug logging
    console.log('🔍 Azure Blob Service Debug:');
    console.log('Connection String exists:', !!connectionString);
    console.log('Account Name:', this.accountName);
    console.log('Account Key exists:', !!this.accountKey);
    console.log('Container Name:', this.containerName);
    
    if (this.accountName) {
      try {
        console.log('✅ Initializing Azure Blob Service with public access...');
        
        // Use browser-compatible initialization with public access
        // We'll create SAS URLs for actual uploads
        const serviceUrl = `https://${this.accountName}.blob.core.windows.net`;
        
        this.blobServiceClient = new BlobServiceClient(serviceUrl);
        this.containerClient = this.blobServiceClient.getContainerClient(this.containerName);
        
        console.log('✅ Azure Blob Storage initialized successfully!');
      } catch (error) {
        console.error('❌ Azure Blob Storage initialization failed:', error);
        console.warn('Azure Blob Storage not configured, file uploads will be disabled');
      }
    } else {
      console.warn('❌ Missing Azure Storage account name');
      console.warn('Azure Blob Storage not configured, file uploads will be disabled');
    }
  }

  public isConfigured(): boolean {
    return this.blobServiceClient !== null && this.containerClient !== null;
  }

  public manualInit(connectionString: string, accountName: string, accountKey: string) {
    try {
      console.log('🔄 Manual initialization with provided credentials...');
      console.log('Account name:', accountName);
      console.log('Account key (first 10 chars):', accountKey.substring(0, 10) + '...');
      
      // Check if we're in a browser environment
      if (typeof window === 'undefined') {
        throw new Error('Azure Blob Storage can only be initialized in browser environment');
      }
      
      // Use browser-compatible initialization
      const serviceUrl = `https://${accountName}.blob.core.windows.net`;
      
      console.log('✅ Creating BlobServiceClient with URL:', serviceUrl);
      this.blobServiceClient = new BlobServiceClient(serviceUrl);
      console.log('✅ BlobServiceClient created successfully');
      
      // Initialize the container client
      this.containerClient = this.blobServiceClient.getContainerClient(this.containerName);
      console.log('✅ ContainerClient created successfully');
      
      // Set account details
      this.accountName = accountName;
      this.accountKey = accountKey;
      
      console.log('✅ Manual initialization successful!');
      return true;
    } catch (error) {
      console.error('❌ Manual initialization failed:');
      console.error('Error type:', error?.constructor?.name);
      console.error('Error message:', error instanceof Error ? error.message : error);
      console.error('Full error:', error);
      return false;
    }
  }

  public async uploadFile(file: File, folder: string = '', userContext?: { userId?: string; userName?: string; userRole?: string; teamId?: string; noteId?: string }): Promise<UploadResult> {
    // For browser environment, we'll use the Azure Functions API for uploads
    // This avoids authentication issues with direct Azure SDK calls
    
    try {
      console.log('📤 Uploading file via Azure Functions API...');
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', folder);
      // Add required fields for Azure Functions API
  formData.append('uploadedBy', userContext?.userId || 'anonymous-user');
  formData.append('uploadedByName', userContext?.userName || 'Anonymous User');
  if (userContext?.userRole) formData.append('userRole', userContext.userRole);
  if (userContext?.teamId) formData.append('teamId', userContext.teamId);
  if (userContext?.noteId) formData.append('noteId', userContext.noteId);
      formData.append('isPublic', 'true'); // Making files public by default for testing
      
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/files/upload`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        return {
          url: result.data.url,
          fileName: file.name, // Use original file name
          size: file.size,
          mimeType: file.type,
          blobName: result.data.id // Use the returned ID as blob name
        };
      } else {
        throw new Error(result.error || 'Upload failed');
      }
      
    } catch (error) {
      console.error('Error uploading file:', error);
      
      // Fallback: If API is not available, show helpful message
      if (error instanceof Error && error.message.includes('fetch')) {
        throw new Error('Upload service not available. Please ensure the Azure Functions backend is running.');
      }
      
      throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async deleteFile(blobName: string): Promise<boolean> {
    if (!this.containerClient) {
      throw new Error('Azure Blob Storage not configured');
    }

    try {
      const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
      const deleteResponse = await blockBlobClient.delete();
      return deleteResponse._response.status === 202;
    } catch (error) {
      console.error('Error deleting file from Azure Blob:', error);
      return false;
    }
  }

  public async listFiles(folder: string = '', opts?: { teamId?: string }): Promise<BlobFile[]> {
    try {
      console.log('📋 Listing files via Azure Functions API...');
      
      // Use Azure Functions API to list files instead of direct blob access
      const queryParams = new URLSearchParams();
      if (folder) {
        queryParams.append('folder', folder);
      }
      if (opts?.teamId) {
        queryParams.append('teamId', opts.teamId);
      }
      
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/files?${queryParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to list files: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        // Convert API response to BlobFile format
        return result.data.map((file: any) => ({
          name: file.originalName || file.fileName,
          url: file.blobUrl,
          size: file.fileSize,
          lastModified: new Date(file.createdAt),
          mimeType: file.mimeType || 'application/octet-stream',
          downloadUrl: file.blobUrl
        })).sort((a: BlobFile, b: BlobFile) => b.lastModified.getTime() - a.lastModified.getTime());
      } else {
        console.error('Failed to list files:', result.error);
        return [];
      }
    } catch (error) {
      console.error('Error listing files from Azure Blob:', error);
      // Return empty array instead of throwing to prevent UI crashes
      return [];
    }
  }

  public async getFileInfo(blobName: string): Promise<BlobFile | null> {
    if (!this.containerClient) {
      throw new Error('Azure Blob Storage not configured');
    }

    try {
      const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
      const properties = await blockBlobClient.getProperties();
      const sasUrl = await this.generateSasUrl(blobName);

      return {
        name: properties.metadata?.originalName || blobName,
        url: sasUrl,
        size: properties.contentLength || 0,
        lastModified: properties.lastModified || new Date(),
        mimeType: properties.contentType || 'application/octet-stream',
        downloadUrl: sasUrl
      };
    } catch (error) {
      console.error('Error getting file info from Azure Blob:', error);
      return null;
    }
  }

  private async generateSasUrl(blobName: string, permissions: string = 'r'): Promise<string> {
    // For browser environment, we'll use the public URL
    // In production, you should implement SAS generation on the server side
    // and call an API endpoint to get the SAS URL
    
    try {
      // Use the public blob URL for now
      // In production, replace this with a server-side API call to generate SAS URLs
      return `https://${this.accountName}.blob.core.windows.net/${this.containerName}/${blobName}`;
    } catch (error) {
      console.warn('Error generating SAS URL, using public URL:', error);
      return `https://${this.accountName}.blob.core.windows.net/${this.containerName}/${blobName}`;
    }
  }

  public getFileUrl(blobName: string): string {
    return `https://${this.accountName}.blob.core.windows.net/${this.containerName}/${blobName}`;
  }
}

// Export singleton instance
export const azureBlobService = new AzureBlobService();
export default azureBlobService;