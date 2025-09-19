import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { Student, ApiResponse, PaginatedResponse } from '../types';
import { createSuccessResponse, createErrorResponse, ValidationError, NotFoundError, validateRequired, validateEmail, parseQueryParams } from '../utils/helpers';

// In-memory storage (replace with actual database in production)
let students: Student[] = [];

async function getStudents(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const { page, limit, search, sortBy, sortOrder } = parseQueryParams(request);
    
    let filteredStudents = students;
    
    // Search functionality
    if (search) {
      filteredStudents = students.filter(student => 
        student.firstName.toLowerCase().includes(search.toLowerCase()) ||
        student.lastName.toLowerCase().includes(search.toLowerCase()) ||
        student.email.toLowerCase().includes(search.toLowerCase()) ||
        student.department.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    // Sorting
    filteredStudents.sort((a, b) => {
      const aValue = a[sortBy as keyof Student];
      const bValue = b[sortBy as keyof Student];
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
    
    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedStudents = filteredStudents.slice(startIndex, endIndex);
    
    const response: PaginatedResponse<Student> = {
      success: true,
      data: paginatedStudents,
      pagination: {
        page,
        limit,
        total: filteredStudents.length,
        totalPages: Math.ceil(filteredStudents.length / limit)
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
    context.error('Error getting students:', error);
    return {
      status: 500,
      jsonBody: createErrorResponse('Internal server error', 'Failed to retrieve students')
    };
  }
}

async function getStudentById(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const studentId = request.params.id;
    const student = students.find(s => s.id === studentId);
    
    if (!student) {
      throw new NotFoundError('Student not found');
    }
    
    return {
      status: 200,
      jsonBody: createSuccessResponse(student),
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
        jsonBody: createErrorResponse('Student not found')
      };
    }
    
    context.error('Error getting student:', error);
    return {
      status: 500,
      jsonBody: createErrorResponse('Internal server error')
    };
  }
}

async function createStudent(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const studentData = await request.json() as Partial<Student>;
    
    // Validation
    validateRequired(studentData, ['firstName', 'lastName', 'email', 'department', 'year']);
    
    if (!validateEmail(studentData.email!)) {
      throw new ValidationError('Invalid email format');
    }
    
    // Check if student already exists
    const existingStudent = students.find(s => s.email === studentData.email);
    if (existingStudent) {
      throw new ValidationError('Student with this email already exists');
    }
    
    // Create new student
    const newStudent: Student = {
      id: `student_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...studentData as Student,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    students.push(newStudent);
    
    return {
      status: 201,
      jsonBody: createSuccessResponse(newStudent, 'Student created successfully'),
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
    
    context.error('Error creating student:', error);
    return {
      status: 500,
      jsonBody: createErrorResponse('Internal server error')
    };
  }
}

async function updateStudent(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const studentId = request.params.id;
    const updateData = await request.json() as Partial<Student>;
    
    const studentIndex = students.findIndex(s => s.id === studentId);
    if (studentIndex === -1) {
      throw new NotFoundError('Student not found');
    }
    
    // Validation
    if (updateData.email && !validateEmail(updateData.email)) {
      throw new ValidationError('Invalid email format');
    }
    
    // Update student
    students[studentIndex] = {
      ...students[studentIndex],
      ...updateData,
      updatedAt: new Date()
    };
    
    return {
      status: 200,
      jsonBody: createSuccessResponse(students[studentIndex], 'Student updated successfully'),
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
        jsonBody: createErrorResponse('Student not found')
      };
    }
    
    if (error instanceof ValidationError) {
      return {
        status: 400,
        jsonBody: createErrorResponse('Validation error', error.message)
      };
    }
    
    context.error('Error updating student:', error);
    return {
      status: 500,
      jsonBody: createErrorResponse('Internal server error')
    };
  }
}

async function deleteStudent(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const studentId = request.params.id;
    const studentIndex = students.findIndex(s => s.id === studentId);
    
    if (studentIndex === -1) {
      throw new NotFoundError('Student not found');
    }
    
    students.splice(studentIndex, 1);
    
    return {
      status: 200,
      jsonBody: createSuccessResponse(null, 'Student deleted successfully'),
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
        jsonBody: createErrorResponse('Student not found')
      };
    }
    
    context.error('Error deleting student:', error);
    return {
      status: 500,
      jsonBody: createErrorResponse('Internal server error')
    };
  }
}

// Register HTTP functions
app.http('getStudents', {
  methods: ['GET'],
  route: 'getStudents',
  authLevel: 'anonymous',
  handler: getStudents
});

app.http('getStudentById', {
  methods: ['GET'],
  route: 'getStudentById',
  authLevel: 'anonymous',
  handler: getStudentById
});

app.http('createStudent', {
  methods: ['POST'],
  route: 'students',
  authLevel: 'anonymous',
  handler: createStudent
});

app.http('updateStudent', {
  methods: ['PUT'],
  route: 'students/{id}',
  authLevel: 'anonymous',
  handler: updateStudent
});

app.http('deleteStudent', {
  methods: ['DELETE'],
  route: 'students/{id}',
  authLevel: 'anonymous',
  handler: deleteStudent
});

// CORS preflight handler
app.http('studentsCors', {
  methods: ['OPTIONS'],
  route: 'students/{*segments?}',
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