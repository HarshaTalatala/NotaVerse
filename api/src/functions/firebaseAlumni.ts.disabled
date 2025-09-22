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

interface Alumni {
  id?: string;
  name: string;
  email?: string;
  graduationYear?: number;
  company?: string;
  title?: string;
  location?: string;
  linkedIn?: string;
  bio?: string;
  skills?: string[];
  industry?: string;
  experience?: number;
  profileImage?: string;
  createdAt?: any;
}

// Get Alumni from Firebase
async function getAlumni(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const search = url.searchParams.get('search') || '';
    const industry = url.searchParams.get('industry') || '';
    const year = url.searchParams.get('year') || '';

    context.log(`Fetching alumni - page: ${page}, limit: ${limit}, search: "${search}"`);

    // Query Firebase Firestore
    const alumniRef = db.collection('alumni');
    const snapshot = await alumniRef.orderBy('name').get();
    
    const allAlumni = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        // Convert Firestore Timestamp to ISO string for JSON serialization
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt
      };
    }) as Alumni[];

    context.log(`Found ${allAlumni.length} total alumni`);

    // Client-side filtering
    let filteredAlumni = allAlumni;
    
    if (search) {
      const searchLower = search.toLowerCase();
      filteredAlumni = filteredAlumni.filter(alumni => 
        alumni.name.toLowerCase().includes(searchLower) ||
        alumni.company?.toLowerCase().includes(searchLower) ||
        alumni.title?.toLowerCase().includes(searchLower) ||
        alumni.location?.toLowerCase().includes(searchLower) ||
        alumni.industry?.toLowerCase().includes(searchLower)
      );
    }

    if (industry) {
      filteredAlumni = filteredAlumni.filter(alumni => 
        alumni.industry?.toLowerCase().includes(industry.toLowerCase())
      );
    }

    if (year) {
      filteredAlumni = filteredAlumni.filter(alumni => 
        alumni.graduationYear?.toString() === year
      );
    }

    // Pagination
    const startIndex = (page - 1) * limit;
    const paginatedAlumni = filteredAlumni.slice(startIndex, startIndex + limit);

    context.log(`Returning ${paginatedAlumni.length} alumni after filtering and pagination`);

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
        data: paginatedAlumni,
        pagination: {
          page,
          limit,
          total: filteredAlumni.length,
          totalPages: Math.ceil(filteredAlumni.length / limit)
        }
      }
    };
  } catch (error) {
    context.error('Error fetching alumni:', error);
    return {
      status: 500,
      headers: { 
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      jsonBody: {
        success: false,
        error: 'Failed to fetch alumni',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
}

// Get Alumni by ID
async function getAlumniById(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    
    if (!id) {
      return {
        status: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        jsonBody: { success: false, error: 'Alumni ID is required' }
      };
    }

    const doc = await db.collection('alumni').doc(id).get();
    
    if (!doc.exists) {
      return {
        status: 404,
        headers: { 'Access-Control-Allow-Origin': '*' },
        jsonBody: { success: false, error: 'Alumni not found' }
      };
    }

    const data = doc.data();
    const alumniData = {
      id: doc.id,
      ...data,
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
        data: alumniData
      }
    };
  } catch (error) {
    context.error('Error fetching alumni:', error);
    return {
      status: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      jsonBody: {
        success: false,
        error: 'Failed to fetch alumni'
      }
    };
  }
}

// Create Alumni in Firebase
async function createAlumni(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const alumniData = await request.json() as Omit<Alumni, 'id'>;
    
    // Validate required fields
    if (!alumniData.name) {
      return {
        status: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        jsonBody: {
          success: false,
          error: 'Alumni name is required'
        }
      };
    }

    const newAlumni = {
      ...alumniData,
      skills: alumniData.skills || [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const docRef = await db.collection('alumni').add(newAlumni);
    
    return {
      status: 201,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      jsonBody: {
        success: true,
        data: { id: docRef.id, ...newAlumni }
      }
    };
  } catch (error) {
    context.error('Error creating alumni:', error);
    return {
      status: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      jsonBody: {
        success: false,
        error: 'Failed to create alumni'
      }
    };
  }
}

// Register functions
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
  route: 'createAlumni',
  authLevel: 'anonymous',
  handler: createAlumni
});

// CORS preflight handler
app.http('alumniCors', {
  methods: ['OPTIONS'],
  route: 'getAlumni',
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