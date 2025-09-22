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

interface Student {
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  department: string;
  year: number;
  createdAt?: any;
  updatedAt?: any;
}

// Get Students from Firebase
async function getStudents(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const search = url.searchParams.get('search') || '';

    context.log(`Fetching students - page: ${page}, limit: ${limit}, search: "${search}"`);

    // Query Firebase Firestore
    const studentsRef = db.collection('students');
    const snapshot = await studentsRef.orderBy('firstName').get();
    
    const allStudents = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Student[];

    context.log(`Found ${allStudents.length} total students`);

    // Client-side filtering for search (in production, consider using search service)
    let filteredStudents = allStudents;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredStudents = allStudents.filter(student => 
        student.firstName.toLowerCase().includes(searchLower) ||
        student.lastName.toLowerCase().includes(searchLower) ||
        student.email.toLowerCase().includes(searchLower) ||
        student.department.toLowerCase().includes(searchLower)
      );
    }

    // Pagination
    const startIndex = (page - 1) * limit;
    const paginatedStudents = filteredStudents.slice(startIndex, startIndex + limit);

    context.log(`Returning ${paginatedStudents.length} students after filtering and pagination`);

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
        data: paginatedStudents,
        pagination: {
          page,
          limit,
          total: filteredStudents.length,
          totalPages: Math.ceil(filteredStudents.length / limit)
        }
      }
    };
  } catch (error) {
    context.error('Error fetching students:', error);
    return {
      status: 500,
      headers: { 
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      jsonBody: {
        success: false,
        error: 'Failed to fetch students',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
}

// Get Student by ID
async function getStudentById(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    
    if (!id) {
      return {
        status: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        jsonBody: { success: false, error: 'Student ID is required' }
      };
    }

    const doc = await db.collection('students').doc(id).get();
    
    if (!doc.exists) {
      return {
        status: 404,
        headers: { 'Access-Control-Allow-Origin': '*' },
        jsonBody: { success: false, error: 'Student not found' }
      };
    }

    return {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      jsonBody: {
        success: true,
        data: { id: doc.id, ...doc.data() }
      }
    };
  } catch (error) {
    context.error('Error fetching student:', error);
    return {
      status: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      jsonBody: {
        success: false,
        error: 'Failed to fetch student'
      }
    };
  }
}

// Create Student in Firebase
async function createStudent(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const studentData = await request.json() as Omit<Student, 'id'>;
    
    // Validate required fields
    if (!studentData.firstName || !studentData.lastName || !studentData.email) {
      return {
        status: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        jsonBody: {
          success: false,
          error: 'firstName, lastName, and email are required'
        }
      };
    }

    const newStudent = {
      ...studentData,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const docRef = await db.collection('students').add(newStudent);
    
    return {
      status: 201,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      jsonBody: {
        success: true,
        data: { id: docRef.id, ...newStudent }
      }
    };
  } catch (error) {
    context.error('Error creating student:', error);
    return {
      status: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      jsonBody: {
        success: false,
        error: 'Failed to create student'
      }
    };
  }
}

// Register functions with the routes that match your existing API calls
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
  route: 'createStudent',
  authLevel: 'anonymous',
  handler: createStudent
});

// CORS preflight handler
app.http('studentsCors', {
  methods: ['OPTIONS'],
  route: 'getStudents',
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