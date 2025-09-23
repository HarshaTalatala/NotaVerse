# NotaVerse Azure Functions Backend

A hackathon-ready Azure Functions backend that provides AI-powered document processing and Q&A capabilities for NotaBuddy using Google Gemini 2.5 Pro.

## Features

- **Document Upload** (`POST /api/upload`): Upload PDF, TXT, or DOCX files
- **AI Q&A** (`POST /api/ask`): Ask questions about uploaded documents
- **In-memory storage** for fast demo performance
- **Text extraction** from multiple file formats
- **Intelligent chunking** (~500 words per chunk)
- **AI-powered summaries** using Google Gemini 2.5 Pro
- **Contextual search** and answer generation
- **CORS Support**: Configured for frontend integration
- **TypeScript**: Full TypeScript support with type definitions

## Quick Setup

### 1. Install Dependencies
```bash
cd api
npm install
```

### 2. Setup Environment Variables

Copy the template and add your API key:
```bash
cp local.settings.json.template local.settings.json
```

Edit `local.settings.json` and add your Google Gemini API key:
```json
{
  "Values": {
    "GEMINI_API_KEY": "your_actual_api_key_here"
  }
}
```

### 3. Get Google Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Copy the key to your `local.settings.json`

### 4. Run Locally
```bash
npm run start
```

The functions will be available at:
- Upload: `http://localhost:7071/api/upload`
- Ask: `http://localhost:7071/api/ask`

## API Endpoints

### POST /api/upload

Upload and process documents (PDF, TXT, DOCX).

**Request:**
- Content-Type: `multipart/form-data`
- Body: Form data with `file` field

**Example using curl:**
```bash
curl -X POST \
  http://localhost:7071/api/upload \
  -F "file=@document.pdf"
```

**Response:**
```json
{
  "success": true,
  "message": "Document processed successfully",
  "data": {
    "filename": "document.pdf",
    "totalChunks": 5,
    "processedChunks": 5,
    "storageStats": {
      "totalSummaries": 5,
      "totalDocuments": 1,
      "storageSize": "2.5 KB"
    }
  }
}
```

### POST /api/ask

Ask questions about uploaded documents.

**Request:**
- Content-Type: `application/json`
- Body: `{"question": "What is the main topic?"}`

**Example using curl:**
```bash
curl -X POST \
  http://localhost:7071/api/ask \
  -H "Content-Type: application/json" \
  -d '{"question": "What are the key points discussed?"}'
```

**Response:**
```json
{
  "success": true,
  "question": "What are the key points discussed?",
  "answer": "Based on the uploaded documents, the key points include...",
  "context": {
    "documentsFound": 1,
    "relevantSummaries": 3,
    "sourcesUsed": ["document.pdf"]
  }
}
```

## Query Parameters

### Pagination
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10, max: 100)

### Search
- `search`: Search term to filter results

### Sorting
- `sortBy`: Field to sort by (default: 'createdAt')
- `sortOrder`: 'asc' or 'desc' (default: 'desc')

### Events Specific
- `type`: Filter by event type ('workshop', 'seminar', 'networking', 'career-fair', 'social', 'academic')
- `upcoming`: Filter upcoming events ('true')

## Setup Instructions

### Prerequisites
- Node.js 18+ 
- Azure Functions Core Tools v4
- VS Code with Azure Functions extension (recommended)

### Installation

1. Install dependencies:
\`\`\`bash
npm install
\`\`\`

2. Install Azure Functions Core Tools globally:
\`\`\`bash
npm install -g azure-functions-core-tools@4 --unsafe-perm true
\`\`\`

3. Build the project:
\`\`\`bash
npm run build
\`\`\`

4. Start the development server:
\`\`\`bash
npm start
\`\`\`

The API will be available at `http://localhost:7071/api/`

### Development

- **Build**: `npm run build`
- **Watch**: `npm run watch` (builds on file changes)
- **Start**: `npm start` (runs the functions locally)
- **Clean**: `npm run clean` (removes dist folder)

### Environment Configuration

Update `local.settings.json` for local development:

\`\`\`json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "AzureWebJobsFeatureFlags": "EnableWorkerIndexing",
    "CORS_ORIGIN": "http://localhost:3000,http://localhost:5173"
  }
}
\`\`\`

## Data Models

### Student
\`\`\`typescript
interface Student {
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  department: string;
  year: number;
  gpa?: number;
  courses?: string[];
  interests?: string[];
  skills?: string[];
  projects?: Project[];
}
\`\`\`

### Alumni
\`\`\`typescript
interface Alumni {
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  department: string;
  graduationYear: number;
  currentCompany?: string;
  currentPosition?: string;
  experience?: number;
  skills?: string[];
  bio?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;
  isAvailableForMentoring?: boolean;
}
\`\`\`

### Event
\`\`\`typescript
interface Event {
  id?: string;
  title: string;
  description: string;
  type: 'workshop' | 'seminar' | 'networking' | 'career-fair' | 'social' | 'academic';
  startDate: Date;
  endDate: Date;
  location: string;
  maxAttendees?: number;
  currentAttendees?: number;
  organizer: string;
  organizerEmail: string;
  tags?: string[];
  imageUrl?: string;
  registrationRequired?: boolean;
  registrationDeadline?: Date;
  attendees?: string[];
}
\`\`\`

## Response Format

All endpoints return responses in this format:

\`\`\`typescript
{
  "success": boolean,
  "data": T | T[],
  "message?": string,
  "error?": string,
  "pagination?": {
    "page": number,
    "limit": number,
    "total": number,
    "totalPages": number
  }
}
\`\`\`

## CORS Configuration

The API is configured to accept requests from:
- `http://localhost:3000` (React dev server)
- `http://localhost:5173` (Vite dev server)

Update the `CORS_ORIGIN` environment variable to include your production frontend URLs.

## Deployment

### Azure Deployment

1. Create an Azure Function App
2. Configure Application Settings (environment variables)
3. Deploy using Azure Functions Core Tools:

\`\`\`bash
func azure functionapp publish <your-function-app-name>
\`\`\`

### Database Integration

Currently using in-memory storage for development. For production, integrate with:
- Azure Cosmos DB
- Azure SQL Database
- MongoDB Atlas

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License