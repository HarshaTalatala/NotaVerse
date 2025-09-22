# NotaVerse Collaboration Hub Setup Guide

## Overview
The Collaboration Hub is a comprehensive feature that enables students, alumni, and administrators to create, share, and collaborate on notes, manage files, form teams, and track activities in real-time.

## Backend Architecture

### Azure Functions
- **Notes API** (`/api/notes`) - CRUD operations for notes with tagging and search
- **Comments API** (`/api/comments`) - Real-time collaboration with threaded comments
- **Files API** (`/api/files`) - File upload/download with Azure Blob Storage
- **Teams API** (`/api/teams`) - Team management with role-based access
- **Activities API** (`/api/activities`) - Activity tracking and dashboard feeds

### Database
- **Firebase Firestore** - Document storage for all collaboration data
- **Collections**:
  - `notes` - Note documents with metadata
  - `comments` - Comment documents with threading support
  - `files` - File metadata (actual files stored in Azure Blob)
  - `teams` - Team documents with member management
  - `activities` - Activity feed documents

### File Storage
- **Azure Blob Storage** - Secure file storage with direct upload/download

## Frontend Features

### Main Dashboard (`/collaboration`)
- Activity feed showing recent actions
- Quick stats and metrics
- Recent notes and team overview
- Search functionality
- Quick action buttons

### Core Features
1. **Notes Management**
   - Rich text editor with markdown support
   - Real-time collaboration
   - Tag-based organization
   - Public/private visibility
   - Team sharing

2. **Comments System**
   - Threaded comments on notes
   - Real-time updates
   - Reply functionality
   - Activity tracking

3. **File Management**
   - Secure file upload to Azure Blob Storage
   - File preview and download
   - Team and note attachments
   - Tag-based organization

4. **Team Vaults**
   - Create and join teams
   - Role-based permissions (owner, admin, editor, viewer)
   - Shared notes and files
   - Member management

5. **Activity Feed**
   - Real-time activity tracking
   - Dashboard integration
   - Team-specific activities
   - Activity statistics

## Environment Setup

### Backend Configuration

1. **Azure Blob Storage Setup**:
   ```bash
   # Create Azure Storage Account
   az storage account create --name notaversestorage --resource-group your-rg --location eastus --sku Standard_LRS
   
   # Get connection string
   az storage account show-connection-string --name notaversestorage --resource-group your-rg
   
   # Create container
   az storage container create --name notaverse-files --connection-string "your-connection-string"
   ```

2. **Environment Variables** (add to `api/local.settings.json`):
   ```json
   {
     "FIREBASE_PROJECT_ID": "your-firebase-project-id",
     "FIREBASE_CLIENT_EMAIL": "your-firebase-client-email",
     "FIREBASE_PRIVATE_KEY": "your-firebase-private-key",
     "AZURE_STORAGE_CONNECTION_STRING": "your-azure-storage-connection-string",
     "AZURE_STORAGE_CONTAINER_NAME": "notaverse-files"
   }
   ```

3. **Firebase Setup**:
   - Enable Firestore Database
   - Create service account with admin privileges
   - Download service account key JSON
   - Extract values for environment variables

### Frontend Configuration

1. **Environment Variables** (add to `.env`):
   ```env
   VITE_API_BASE_URL=http://localhost:7071/api
   VITE_FIREBASE_CONFIG={"apiKey":"...","authDomain":"...","projectId":"..."}
   ```

## API Documentation

### Notes API

#### GET /api/notes
Query parameters:
- `page` (number): Page number for pagination
- `limit` (number): Items per page
- `search` (string): Text search in title/content
- `tags` (string): Comma-separated tags
- `authorId` (string): Filter by author
- `teamId` (string): Filter by team
- `isPublic` (boolean): Filter by visibility

#### POST /api/notes
Request body:
```json
{
  "title": "Note Title",
  "content": "Note content...",
  "authorId": "user-id",
  "authorName": "User Name",
  "authorRole": "student|alumni|admin",
  "tags": ["tag1", "tag2"],
  "isPublic": true,
  "teamId": "optional-team-id",
  "collaborators": ["user-id-1", "user-id-2"]
}
```

### Files API

#### POST /api/files/upload
Form data:
- `file`: File to upload
- `uploadedBy`: User ID
- `uploadedByName`: User name
- `teamId`: Optional team ID
- `noteId`: Optional note ID
- `isPublic`: Visibility boolean
- `tags`: Comma-separated tags

#### GET /api/files/{id}/download
Returns file content with appropriate headers for download.

### Teams API

#### POST /api/teams
Request body:
```json
{
  "name": "Team Name",
  "description": "Team description",
  "createdBy": "user-id",
  "createdByName": "User Name",
  "isPrivate": false,
  "tags": ["tag1", "tag2"]
}
```

#### POST /api/teams/{id}/join
Request body:
```json
{
  "userId": "user-id",
  "userName": "User Name",
  "userRole": "student|alumni|admin"
}
```

## Deployment

### Azure Static Web Apps Deployment

1. **Build Configuration** (`staticwebapp.config.json`):
   ```json
   {
     "routes": [
       {
         "route": "/api/*",
         "allowedRoles": ["authenticated"]
       }
     ],
     "navigationFallback": {
       "rewrite": "/index.html"
     }
   }
   ```

2. **Azure Functions Deployment**:
   ```bash
   cd api
   func azure functionapp publish your-function-app-name
   ```

3. **Environment Variables for Production**:
   - Set all environment variables in Azure Function App settings
   - Configure CORS for your domain
   - Set up Azure Storage account in production
   - Configure Firebase project for production

## Security Considerations

1. **Role-Based Access Control**:
   - Users can only edit their own notes (unless team permissions allow)
   - Team roles control access to shared resources
   - Admin users have additional privileges

2. **File Security**:
   - Files stored in Azure Blob with secure access
   - Direct upload/download URLs with time-limited access
   - File type validation and size limits

3. **API Security**:
   - All endpoints require authentication
   - Input validation and sanitization
   - Rate limiting considerations

## Testing

### Manual Testing Checklist

1. **Notes**:
   - [ ] Create, edit, delete notes
   - [ ] Search and filter functionality
   - [ ] Tag management
   - [ ] Public/private visibility

2. **Comments**:
   - [ ] Add comments to notes
   - [ ] Reply to comments (threading)
   - [ ] Edit and delete comments
   - [ ] Real-time updates

3. **Files**:
   - [ ] Upload files of various types
   - [ ] Download files
   - [ ] Attach files to notes
   - [ ] Team file sharing

4. **Teams**:
   - [ ] Create teams
   - [ ] Join/leave teams
   - [ ] Manage team members
   - [ ] Role-based permissions

5. **Activities**:
   - [ ] Activity feed updates
   - [ ] Dashboard statistics
   - [ ] Team activity filtering

## Troubleshooting

### Common Issues

1. **CORS Errors**:
   - Ensure CORS_ORIGIN is set correctly in Azure Functions
   - Check that frontend URL matches CORS configuration

2. **Firebase Connection**:
   - Verify Firebase service account credentials
   - Check Firestore security rules
   - Ensure project ID is correct

3. **Azure Blob Storage**:
   - Verify connection string format
   - Check container permissions
   - Ensure storage account is accessible

4. **File Upload Issues**:
   - Check file size limits
   - Verify MIME type handling
   - Ensure proper form data encoding

### Logs and Monitoring

- Azure Functions logs in Azure Portal
- Frontend console for client-side errors
- Firebase console for database operations
- Azure Storage logs for file operations

## Future Enhancements

1. **Real-time Collaboration**:
   - WebSocket integration for live editing
   - Cursor position sharing
   - Conflict resolution

2. **Advanced Search**:
   - Full-text search with Azure Cognitive Search
   - Advanced filtering options
   - Saved search queries

3. **Analytics**:
   - User engagement metrics
   - Team collaboration statistics
   - Content popularity tracking

4. **Mobile Support**:
   - Progressive Web App features
   - Mobile-optimized UI
   - Offline capabilities

## Support

For technical support or questions about the Collaboration Hub:
1. Check this documentation first
2. Review error logs and console output
3. Test with minimal examples
4. Contact the development team with specific error details