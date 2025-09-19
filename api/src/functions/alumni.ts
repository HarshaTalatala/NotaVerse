import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { Alumni, ApiResponse, PaginatedResponse } from '../types';
import { createSuccessResponse, createErrorResponse, ValidationError, NotFoundError, validateRequired, validateEmail, parseQueryParams } from '../utils/helpers';

// In-memory storage (replace with actual database in production)
let alumni: Alumni[] = [];

async function getAlumni(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const { page, limit, search, sortBy, sortOrder } = parseQueryParams(request);
    
    let filteredAlumni = alumni;
    
    // Search functionality
    if (search) {
      filteredAlumni = alumni.filter(alum => 
        alum.firstName.toLowerCase().includes(search.toLowerCase()) ||
        alum.lastName.toLowerCase().includes(search.toLowerCase()) ||
        alum.email.toLowerCase().includes(search.toLowerCase()) ||
        alum.department.toLowerCase().includes(search.toLowerCase()) ||
        alum.currentCompany?.toLowerCase().includes(search.toLowerCase()) ||
        alum.currentPosition?.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    // Sorting
    filteredAlumni.sort((a, b) => {
      const aValue = a[sortBy as keyof Alumni];
      const bValue = b[sortBy as keyof Alumni];
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
    
    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedAlumni = filteredAlumni.slice(startIndex, endIndex);
    
    const response: PaginatedResponse<Alumni> = {
      success: true,
      data: paginatedAlumni,
      pagination: {
        page,
        limit,
        total: filteredAlumni.length,
        totalPages: Math.ceil(filteredAlumni.length / limit)
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
    context.error('Error getting alumni:', error);
    return {
      status: 500,
      jsonBody: createErrorResponse('Internal server error', 'Failed to retrieve alumni')
    };
  }
}

async function getAlumniById(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const alumniId = request.params.id;
    const alum = alumni.find(a => a.id === alumniId);
    
    if (!alum) {
      throw new NotFoundError('Alumni not found');
    }
    
    return {
      status: 200,
      jsonBody: createSuccessResponse(alum),
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
        jsonBody: createErrorResponse('Alumni not found')
      };
    }
    
    context.error('Error getting alumni:', error);
    return {
      status: 500,
      jsonBody: createErrorResponse('Internal server error')
    };
  }
}

async function createAlumni(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const alumniData = await request.json() as Partial<Alumni>;
    
    // Validation
    validateRequired(alumniData, ['firstName', 'lastName', 'email', 'department', 'graduationYear']);
    
    if (!validateEmail(alumniData.email!)) {
      throw new ValidationError('Invalid email format');
    }
    
    // Check if alumni already exists
    const existingAlumni = alumni.find(a => a.email === alumniData.email);
    if (existingAlumni) {
      throw new ValidationError('Alumni with this email already exists');
    }
    
    // Create new alumni
    const newAlumni: Alumni = {
      id: `alumni_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...alumniData as Alumni,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    alumni.push(newAlumni);
    
    return {
      status: 201,
      jsonBody: createSuccessResponse(newAlumni, 'Alumni created successfully'),
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
    
    context.error('Error creating alumni:', error);
    return {
      status: 500,
      jsonBody: createErrorResponse('Internal server error')
    };
  }
}

async function updateAlumni(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const alumniId = request.params.id;
    const updateData = await request.json() as Partial<Alumni>;
    
    const alumniIndex = alumni.findIndex(a => a.id === alumniId);
    if (alumniIndex === -1) {
      throw new NotFoundError('Alumni not found');
    }
    
    // Validation
    if (updateData.email && !validateEmail(updateData.email)) {
      throw new ValidationError('Invalid email format');
    }
    
    // Update alumni
    alumni[alumniIndex] = {
      ...alumni[alumniIndex],
      ...updateData,
      updatedAt: new Date()
    };
    
    return {
      status: 200,
      jsonBody: createSuccessResponse(alumni[alumniIndex], 'Alumni updated successfully'),
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
        jsonBody: createErrorResponse('Alumni not found')
      };
    }
    
    if (error instanceof ValidationError) {
      return {
        status: 400,
        jsonBody: createErrorResponse('Validation error', error.message)
      };
    }
    
    context.error('Error updating alumni:', error);
    return {
      status: 500,
      jsonBody: createErrorResponse('Internal server error')
    };
  }
}

async function deleteAlumni(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const alumniId = request.params.id;
    const alumniIndex = alumni.findIndex(a => a.id === alumniId);
    
    if (alumniIndex === -1) {
      throw new NotFoundError('Alumni not found');
    }
    
    alumni.splice(alumniIndex, 1);
    
    return {
      status: 200,
      jsonBody: createSuccessResponse(null, 'Alumni deleted successfully'),
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
        jsonBody: createErrorResponse('Alumni not found')
      };
    }
    
    context.error('Error deleting alumni:', error);
    return {
      status: 500,
      jsonBody: createErrorResponse('Internal server error')
    };
  }
}

// Register HTTP functions
app.http('getAlumni', {
  methods: ['GET'],
  route: 'getAlumni',
  authLevel: 'anonymous',
  handler: getAlumni
});

app.http('getAlumniById', {
  methods: ['GET'],
  route: 'getAlumniById',
  authLevel: 'anonymous',
  handler: getAlumniById
});

app.http('createAlumni', {
  methods: ['POST'],
  route: 'alumni',
  authLevel: 'anonymous',
  handler: createAlumni
});

app.http('updateAlumni', {
  methods: ['PUT'],
  route: 'alumni/{id}',
  authLevel: 'anonymous',
  handler: updateAlumni
});

app.http('deleteAlumni', {
  methods: ['DELETE'],
  route: 'alumni/{id}',
  authLevel: 'anonymous',
  handler: deleteAlumni
});

// CORS preflight handler
app.http('alumniCors', {
  methods: ['OPTIONS'],
  route: 'alumni/{*segments?}',
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