# Azure Storage Account Setup Guide

## Step 1: Complete Azure Portal Setup

Use these recommended settings in the Azure Portal:

### Basics
- **Resource Group**: notaverse (use existing - same as your Static Web Apps)
- **Storage Account Name**: notaversestorage (must be globally unique)
- **Region**: Same region as your Static Web Apps
- **Performance**: Standard
- **Redundancy**: LRS (development) or GRS (production)

### Advanced Settings
- ✅ Require secure transfer for REST API operations
- ✅ Allow Blob anonymous access
- **Access tier**: Hot

## Step 2: Get Connection Details

After creation:
1. Go to your storage account → "Access keys"
2. Copy "Connection string" from key1
3. Note your storage account name

## Step 3: Create Container

1. Go to your storage account → "Containers"
2. Click "+ Container"
3. Name: `collaboration-files`
4. Public access level: **Private** (recommended)

## Step 4: Configure Environment Variables

### Frontend (.env)
Create `.env` file in the root directory:

```bash
# Copy these from .env.example and fill in your values
VITE_FIREBASE_API_KEY=your_existing_value
VITE_FIREBASE_AUTH_DOMAIN=your_existing_value
VITE_FIREBASE_PROJECT_ID=your_existing_value
VITE_FIREBASE_STORAGE_BUCKET=your_existing_value
VITE_FIREBASE_MESSAGING_SENDER_ID=your_existing_value
VITE_FIREBASE_APP_ID=your_existing_value
VITE_FIREBASE_MEASUREMENT_ID=your_existing_value

# API Configuration
VITE_API_BASE_URL=http://localhost:7071/api

# Azure Blob Storage Configuration (ADD THESE)
VITE_AZURE_STORAGE_CONNECTION_STRING=YOUR_CONNECTION_STRING_FROM_PORTAL
VITE_AZURE_STORAGE_ACCOUNT_NAME=YOUR_STORAGE_ACCOUNT_NAME
VITE_AZURE_STORAGE_ACCOUNT_KEY=YOUR_ACCOUNT_KEY
VITE_AZURE_STORAGE_CONTAINER_NAME=collaboration-files
```

### Backend (api/local.settings.json)
Update the Values section:

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "AzureWebJobsFeatureFlags": "EnableWorkerIndexing",
    "CORS_ORIGIN": "http://localhost:3000,http://localhost:5173,https://yourfrontend.com",
    "FIREBASE_PROJECT_ID": "nota-verse",
    "FIREBASE_CLIENT_EMAIL": "",
    "FIREBASE_PRIVATE_KEY": "",
    "AZURE_STORAGE_CONNECTION_STRING": "YOUR_CONNECTION_STRING_FROM_PORTAL",
    "AZURE_STORAGE_CONTAINER_NAME": "collaboration-files",
    "GOOGLE_APPLICATION_CREDENTIALS": ""
  }
}
```

## Step 5: Test the Setup

### Start Development Servers
```bash
# Terminal 1: Frontend
npm run dev

# Terminal 2: Backend (after configuring environment)
cd api
func start
```

### Test File Upload
1. Go to http://localhost:5173
2. Navigate to Collaboration Hub
3. Click "Upload File" button
4. Try uploading a file
5. Check if it appears in your Azure Storage Container

## Troubleshooting

### Common Issues:
- **Storage account name taken**: Try different variations
- **CORS errors**: Ensure AZURE_STORAGE_CONNECTION_STRING is set in both frontend and backend
- **Upload fails**: Check container exists and has correct permissions
- **Access denied**: Verify connection string is correct

### Verification Steps:
1. Check Azure Portal → Storage Account → Containers → collaboration-files
2. Uploaded files should appear there
3. File URLs should work when clicked in the app

## Security Notes

- Keep your connection strings private
- Never commit `.env` files to git
- Use SAS tokens for production (already implemented in the service)
- Consider using Azure Key Vault for production secrets

---

Once you complete the Azure Portal setup, come back and I'll help you configure the environment variables with your specific connection details!