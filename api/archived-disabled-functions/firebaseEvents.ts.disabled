import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin SDK (only once)
if (getApps().length === 0) {
  initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID || 'nota-verse'
  });
}
const db = getFirestore();

interface Event {
  id?: string;
  title: string;
  description?: string;
  date?: any;
  location?: string;
  type?: string;
  capacity?: number;
  organizer?: string;
  imageUrl?: string;
  tags?: string[];
  rsvps?: string[];
  createdAt?: any;
  createdBy?: string;
  status?: string;
}

// Get Events from Firebase
async function getEvents(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const search = url.searchParams.get('search') || '';
    const type = url.searchParams.get('type') || '';

    context.log(`Fetching events - page: ${page}, limit: ${limit}, search: "${search}", type: "${type}"`);

    // Query Firebase Firestore
    const eventsRef = db.collection('events');
    const snapshot = await eventsRef.orderBy('date').get();
    
    const allEvents = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        // Convert Firestore Timestamp to ISO string for JSON serialization
        date: data.date?.toDate ? data.date.toDate().toISOString() : data.date,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt
      };
    }) as Event[];

    context.log(`Found ${allEvents.length} total events`);

    // Client-side filtering
    let filteredEvents = allEvents;
    
    if (search) {
      const searchLower = search.toLowerCase();
      filteredEvents = filteredEvents.filter(event => 
        event.title.toLowerCase().includes(searchLower) ||
        event.description?.toLowerCase().includes(searchLower) ||
        event.location?.toLowerCase().includes(searchLower) ||
        event.organizer?.toLowerCase().includes(searchLower)
      );
    }

    if (type && type !== 'all') {
      filteredEvents = filteredEvents.filter(event => event.type === type);
    }

    // Pagination
    const startIndex = (page - 1) * limit;
    const paginatedEvents = filteredEvents.slice(startIndex, startIndex + limit);

    context.log(`Returning ${paginatedEvents.length} events after filtering and pagination`);

    return {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      },
      jsonBody: {
        success: true,
        data: paginatedEvents,
        pagination: {
          page,
          limit,
          total: filteredEvents.length,
          totalPages: Math.ceil(filteredEvents.length / limit)
        }
      }
    };
  } catch (error) {
    context.error('Error fetching events:', error);
    return {
      status: 500,
      headers: { 
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      jsonBody: {
        success: false,
        error: 'Failed to fetch events',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
}

// Get Event by ID
async function getEventById(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    
    if (!id) {
      return {
        status: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        jsonBody: { success: false, error: 'Event ID is required' }
      };
    }

    const doc = await db.collection('events').doc(id).get();
    
    if (!doc.exists) {
      return {
        status: 404,
        headers: { 'Access-Control-Allow-Origin': '*' },
        jsonBody: { success: false, error: 'Event not found' }
      };
    }

    const data = doc.data();
    const eventData = {
      id: doc.id,
      ...data,
      date: data?.date?.toDate ? data.date.toDate().toISOString() : data?.date,
      createdAt: data?.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data?.createdAt
    };

    return {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      jsonBody: {
        success: true,
        data: eventData
      }
    };
  } catch (error) {
    context.error('Error fetching event:', error);
    return {
      status: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      jsonBody: {
        success: false,
        error: 'Failed to fetch event'
      }
    };
  }
}

// Create Event in Firebase
async function createEvent(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const eventData = await request.json() as Omit<Event, 'id'>;
    
    // Validate required fields
    if (!eventData.title) {
      return {
        status: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        jsonBody: {
          success: false,
          error: 'Event title is required'
        }
      };
    }

    const newEvent = {
      ...eventData,
      rsvps: eventData.rsvps || [],
      tags: eventData.tags || [],
      status: eventData.status || 'upcoming',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const docRef = await db.collection('events').add(newEvent);
    
    return {
      status: 201,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      jsonBody: {
        success: true,
        data: { id: docRef.id, ...newEvent }
      }
    };
  } catch (error) {
    context.error('Error creating event:', error);
    return {
      status: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      jsonBody: {
        success: false,
        error: 'Failed to create event'
      }
    };
  }
}

// Register functions
app.http('getEvents', {
  methods: ['GET'],
  route: 'getEvents',
  authLevel: 'anonymous',
  handler: getEvents
});

app.http('getEventById', {
  methods: ['GET'],
  route: 'getEventById',
  authLevel: 'anonymous',
  handler: getEventById
});

app.http('createEvent', {
  methods: ['POST'],
  route: 'createEvent',
  authLevel: 'anonymous',
  handler: createEvent
});

// CORS preflight handler
app.http('eventsCors', {
  methods: ['OPTIONS'],
  route: 'getEvents',
  authLevel: 'anonymous',
  handler: async (): Promise<HttpResponseInit> => {
    return {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400'
      }
    };
  }
});