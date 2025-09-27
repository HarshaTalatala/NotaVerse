import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { Event, ApiResponse, PaginatedResponse } from '../types';
import { createSuccessResponse, createErrorResponse, ValidationError, NotFoundError, validateRequired, validateEmail, parseQueryParams } from '../utils/helpers';

// In-memory storage (replace with actual database in production)
let events: Event[] = [];

async function getEvents(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const { page, limit, search, sortBy, sortOrder } = parseQueryParams(request);
    const url = new URL(request.url);
    const params = new URLSearchParams(url.search);
    const type = params.get('type');
    const upcoming = params.get('upcoming');
    
    let filteredEvents = events;
    
    // Filter by type
    if (type) {
      filteredEvents = filteredEvents.filter(event => event.type === type);
    }
    
    // Filter upcoming events
    if (upcoming === 'true') {
      const now = new Date();
      filteredEvents = filteredEvents.filter(event => new Date(event.startDate) > now);
    }
    
    // Search functionality
    if (search) {
      filteredEvents = filteredEvents.filter(event => 
        event.title.toLowerCase().includes(search.toLowerCase()) ||
        event.description.toLowerCase().includes(search.toLowerCase()) ||
        event.location.toLowerCase().includes(search.toLowerCase()) ||
        event.organizer.toLowerCase().includes(search.toLowerCase()) ||
        event.tags?.some(tag => tag.toLowerCase().includes(search.toLowerCase()))
      );
    }
    
    // Sorting
    filteredEvents.sort((a, b) => {
      const aValue = a[sortBy as keyof Event];
      const bValue = b[sortBy as keyof Event];
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
    
    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedEvents = filteredEvents.slice(startIndex, endIndex);
    
    const response: PaginatedResponse<Event> = {
      success: true,
      data: paginatedEvents,
      pagination: {
        page,
        limit,
        total: filteredEvents.length,
        totalPages: Math.ceil(filteredEvents.length / limit)
      }
    };
    
    return {
      status: 200,
      jsonBody: response,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    };
  } catch (error) {
    context.error('Error getting events:', error);
    return {
      status: 500,
      jsonBody: createErrorResponse('Internal server error', 'Failed to retrieve events')
    };
  }
}

async function getEventById(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const eventId = request.params.id;
    const event = events.find(e => e.id === eventId);
    
    if (!event) {
      throw new NotFoundError('Event not found');
    }
    
    return {
      status: 200,
      jsonBody: createSuccessResponse(event),
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    };
  } catch (error) {
    if (error instanceof NotFoundError) {
      return {
        status: 404,
        jsonBody: createErrorResponse('Event not found')
      };
    }
    
    context.error('Error getting event:', error);
    return {
      status: 500,
      jsonBody: createErrorResponse('Internal server error')
    };
  }
}

async function createEvent(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const eventData = await request.json() as Partial<Event>;
    
    // Validation
    validateRequired(eventData, ['title', 'description', 'type', 'startDate', 'endDate', 'location', 'organizer', 'organizerEmail']);
    
    if (!validateEmail(eventData.organizerEmail!)) {
      throw new ValidationError('Invalid organizer email format');
    }
    
    // Validate dates
    const startDate = new Date(eventData.startDate!);
    const endDate = new Date(eventData.endDate!);
    
    if (startDate >= endDate) {
      throw new ValidationError('End date must be after start date');
    }
    
    if (eventData.registrationDeadline) {
      const registrationDeadline = new Date(eventData.registrationDeadline);
      if (registrationDeadline >= startDate) {
        throw new ValidationError('Registration deadline must be before start date');
      }
    }
    
    // Create new event
    const newEvent: Event = {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...eventData as Event,
      currentAttendees: 0,
      attendees: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    events.push(newEvent);
    
    return {
      status: 201,
      jsonBody: createSuccessResponse(newEvent, 'Event created successfully'),
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    };
  } catch (error) {
    if (error instanceof ValidationError) {
      return {
        status: 400,
        jsonBody: createErrorResponse('Validation error', error.message)
      };
    }
    
    context.error('Error creating event:', error);
    return {
      status: 500,
      jsonBody: createErrorResponse('Internal server error')
    };
  }
}

async function updateEvent(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const eventId = request.params.id;
    const updateData = await request.json() as Partial<Event>;
    
    const eventIndex = events.findIndex(e => e.id === eventId);
    if (eventIndex === -1) {
      throw new NotFoundError('Event not found');
    }
    
    // Validation
    if (updateData.organizerEmail && !validateEmail(updateData.organizerEmail)) {
      throw new ValidationError('Invalid organizer email format');
    }
    
    // Update event
    events[eventIndex] = {
      ...events[eventIndex],
      ...updateData,
      updatedAt: new Date()
    };
    
    return {
      status: 200,
      jsonBody: createSuccessResponse(events[eventIndex], 'Event updated successfully'),
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    };
  } catch (error) {
    if (error instanceof NotFoundError) {
      return {
        status: 404,
        jsonBody: createErrorResponse('Event not found')
      };
    }
    
    if (error instanceof ValidationError) {
      return {
        status: 400,
        jsonBody: createErrorResponse('Validation error', error.message)
      };
    }
    
    context.error('Error updating event:', error);
    return {
      status: 500,
      jsonBody: createErrorResponse('Internal server error')
    };
  }
}

async function deleteEvent(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const eventId = request.params.id;
    const eventIndex = events.findIndex(e => e.id === eventId);
    
    if (eventIndex === -1) {
      throw new NotFoundError('Event not found');
    }
    
    events.splice(eventIndex, 1);
    
    return {
      status: 200,
      jsonBody: createSuccessResponse(null, 'Event deleted successfully'),
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    };
  } catch (error) {
    if (error instanceof NotFoundError) {
      return {
        status: 404,
        jsonBody: createErrorResponse('Event not found')
      };
    }
    
    context.error('Error deleting event:', error);
    return {
      status: 500,
      jsonBody: createErrorResponse('Internal server error')
    };
  }
}

async function registerForEvent(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const eventId = request.params.id;
    const { userId } = await request.json() as { userId: string };
    
    if (!userId) {
      throw new ValidationError('User ID is required');
    }
    
    const eventIndex = events.findIndex(e => e.id === eventId);
    if (eventIndex === -1) {
      throw new NotFoundError('Event not found');
    }
    
    const event = events[eventIndex];
    
    // Check if registration is required and open
    if (event.registrationRequired && event.registrationDeadline) {
      const now = new Date();
      const deadline = new Date(event.registrationDeadline);
      if (now > deadline) {
        throw new ValidationError('Registration deadline has passed');
      }
    }
    
    // Check if event is full
    if (event.maxAttendees && event.currentAttendees! >= event.maxAttendees) {
      throw new ValidationError('Event is full');
    }
    
    // Check if user already registered
    if (event.attendees?.includes(userId)) {
      throw new ValidationError('User already registered for this event');
    }
    
    // Register user
    events[eventIndex] = {
      ...event,
      attendees: [...(event.attendees || []), userId],
      currentAttendees: (event.currentAttendees || 0) + 1,
      updatedAt: new Date()
    };
    
    return {
      status: 200,
      jsonBody: createSuccessResponse(events[eventIndex], 'Successfully registered for event'),
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    };
  } catch (error) {
    if (error instanceof NotFoundError) {
      return {
        status: 404,
        jsonBody: createErrorResponse('Event not found')
      };
    }
    
    if (error instanceof ValidationError) {
      return {
        status: 400,
        jsonBody: createErrorResponse('Registration error', error.message)
      };
    }
    
    context.error('Error registering for event:', error);
    return {
      status: 500,
      jsonBody: createErrorResponse('Internal server error')
    };
  }
}

// Register HTTP functions
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

app.http('updateEvent', {
  methods: ['PUT'],
  route: 'events/{id}',
  authLevel: 'anonymous',
  handler: updateEvent
});

app.http('deleteEvent', {
  methods: ['DELETE'],
  route: 'events/{id}',
  authLevel: 'anonymous',
  handler: deleteEvent
});

app.http('registerForEvent', {
  methods: ['POST'],
  route: 'events/{id}/register',
  authLevel: 'anonymous',
  handler: registerForEvent
});

// CORS preflight handler
app.http('eventsCors', {
  methods: ['OPTIONS'],
  route: 'events/{*segments?}',
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