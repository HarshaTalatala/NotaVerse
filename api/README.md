# NotaVerse Backend API

Azure Functions backend for the NotaVerse application, providing REST APIs for student management, alumni connections, and events management.

## Features

- **Student Management**: CRUD operations for student profiles
- **Alumni Management**: CRUD operations for alumni profiles with career information
- **Events Management**: CRUD operations for events with registration functionality
- **CORS Support**: Configured for frontend integration
- **TypeScript**: Full TypeScript support with type definitions
- **Validation**: Request validation and error handling
- **Pagination**: Built-in pagination for list endpoints
- **Search**: Search functionality across all entities

## API Endpoints

### Students
- `GET /api/students` - Get all students (paginated, searchable)
- `GET /api/students/{id}` - Get student by ID
- `POST /api/students` - Create new student
- `PUT /api/students/{id}` - Update student
- `DELETE /api/students/{id}` - Delete student

### Alumni
- `GET /api/alumni` - Get all alumni (paginated, searchable)
- `GET /api/alumni/{id}` - Get alumni by ID
- `POST /api/alumni` - Create new alumni
- `PUT /api/alumni/{id}` - Update alumni
- `DELETE /api/alumni/{id}` - Delete alumni

### Events
- `GET /api/events` - Get all events (paginated, searchable, filterable)
- `GET /api/events/{id}` - Get event by ID
- `POST /api/events` - Create new event
- `PUT /api/events/{id}` - Update event
- `DELETE /api/events/{id}` - Delete event
- `POST /api/events/{id}/register` - Register for event

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