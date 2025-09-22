// GET /api/notes - Get all notes with filtering and pagination
async function getNotes(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    if (!db) {
      // Return empty list when Firebase is not available instead of error
      const response: PaginatedResponse<Note> = {
        success: true,
        data: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0
        }
      };
      return {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': '*',
          'Access-Control-Allow-Methods': '*'
        },
        body: JSON.stringify(response)
      };
    }

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const search = url.searchParams.get('search') || '';
    const tags = url.searchParams.get('tags')?.split(',').filter(Boolean) || [];
    const authorId = url.searchParams.get('authorId') || '';
    const teamId = url.searchParams.get('teamId') || '';
    const isPublic = url.searchParams.get('isPublic');

    let query = db.collection('notes').orderBy('createdAt', 'desc');

    // Apply filters
    if (authorId) {
      query = query.where('authorId', '==', authorId);
    }
    if (teamId) {
      query = query.where('teamId', '==', teamId);
    }
    if (isPublic !== null && isPublic !== undefined) {
      query = query.where('isPublic', '==', isPublic === 'true');
    }
    if (tags.length > 0) {
      query = query.where('tags', 'array-contains-any', tags);
    }

    // Get total count for pagination
    const countSnapshot = await query.get();
    const total = countSnapshot.size;

    // Apply pagination
    const offset = (page - 1) * limit;
    const snapshot = await query.offset(offset).limit(limit).get();

    let notes: Note[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      notes.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate(),
        lastModified: data.lastModified?.toDate(),
      } as Note);
    });

    // Apply text search filter (since Firestore doesn't support full-text search)
    if (search) {
      notes = notes.filter(note =>
        note.title.toLowerCase().includes(search.toLowerCase()) ||
        note.content.toLowerCase().includes(search.toLowerCase())
      );
    }

    const response: PaginatedResponse<Note> = {
      success: true,
      data: notes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
    return {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Allow-Methods': '*'
      },
      body: JSON.stringify(response)
    };
  } catch (error: any) {
    context.error('Error getting notes:', error);
    return {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: 'Internal server error'
      })
    };
  }
}
import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { Note, ApiResponse, PaginatedResponse, Activity } from '../types';
import { createCorsResponse, handlePreflightRequest } from '../utils/cors';

// Initialize Firebase Admin if not already initialized
let db: any = null;
try {
  if (getApps().length === 0 && process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
    db = getFirestore();
  }
} catch (error) {
  console.log('Firebase initialization skipped - no valid credentials provided');
}

// Helper function to create activity log
async function createActivity(
  userId: string,
  userName: string,
  userRole: string,
  type: string,
  entityId: string,
  entityType: string,
  description: string,
  metadata?: any
) {
  const activity: Activity = {
    userId,
    userName,
    userRole: userRole as 'student' | 'alumni' | 'admin',
    type: type as any,
    entityId,
    entityType: entityType as any,
    description,
    metadata,
    createdAt: new Date()
  };
// Initialize Firebase Admin if not already initialized
let db: any = null;
try {
  if (getApps().length === 0 && process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
    db = getFirestore();
  }
} catch (error) {
  console.log('Firebase initialization skipped - no valid credentials provided');
}

// Helper function to create activity log
async function createActivity(
  userId: string,
  userName: string,
  userRole: string,
  type: string,
  entityId: string,
  entityType: string,
  description: string,
  metadata?: any
) {
  if (!db) {
    console.log('Activity log skipped - Firebase not available');
    return;
  }
  const activity: Activity = {
    userId,
    userName,
    userRole: userRole as 'student' | 'alumni' | 'admin',
    type: type as any,
    entityId,
    entityType: entityType as any,
    description,
    metadata,
    createdAt: new Date()
  };

  await db.collection('activities').add(activity);
}

// GET /api/notes - Get all notes with filtering and pagination
async function getNotes(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    if (!db) {
      // Return empty list when Firebase is not available instead of error
      const response: PaginatedResponse<Note> = {
        success: true,
        data: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0
        }
      };
      return {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': '*',
          'Access-Control-Allow-Methods': '*'
        },
        body: JSON.stringify(response)
      };
    }

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const search = url.searchParams.get('search') || '';
    const tags = url.searchParams.get('tags')?.split(',').filter(Boolean) || [];
    const authorId = url.searchParams.get('authorId') || '';
    const teamId = url.searchParams.get('teamId') || '';
    const isPublic = url.searchParams.get('isPublic');

    let query = db.collection('notes').orderBy('createdAt', 'desc');

    // Apply filters
    if (authorId) {
      query = query.where('authorId', '==', authorId);
    }
    if (teamId) {
      query = query.where('teamId', '==', teamId);
    }
    if (isPublic !== null && isPublic !== undefined) {
      query = query.where('isPublic', '==', isPublic === 'true');
    }
    if (tags.length > 0) {
      query = query.where('tags', 'array-contains-any', tags);
    }

    // Get total count for pagination
    const countSnapshot = await query.get();
    const total = countSnapshot.size;

    // Apply pagination
    const offset = (page - 1) * limit;
    const snapshot = await query.offset(offset).limit(limit).get();

    let notes: Note[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      notes.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate(),
        lastModified: data.lastModified?.toDate(),
      } as Note);
    });

    // Apply text search filter (since Firestore doesn't support full-text search)
    if (search) {
      notes = notes.filter(note =>
        note.title.toLowerCase().includes(search.toLowerCase()) ||
        note.content.toLowerCase().includes(search.toLowerCase())
      );
    }

    const response: PaginatedResponse<Note> = {
      success: true,
      data: notes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
    return {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Allow-Methods': '*'
      },
      body: JSON.stringify(response)
    };
  } catch (error: any) {
    context.error('Error getting notes:', error);
    return {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: 'Internal server error'
      })
    };
  }
}
}

// GET /api/notes/{id} - Get a specific note
async function getNote(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const noteId = request.params.id;
    if (!noteId) {
      return {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: false,
          error: 'Note ID is required'
        })
      };
    }

    const doc = await db.collection('notes').doc(noteId).get();
    if (!doc.exists) {
      return {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: false,
          error: 'Note not found'
        })
      };
    }

    const data = doc.data();
    const note: Note = {
      id: doc.id,
      ...data,
      createdAt: data?.createdAt?.toDate(),
      lastModified: data?.lastModified?.toDate(),
    } as Note;

    const response: ApiResponse<Note> = {
      success: true,
      data: note
    };

    return {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(response)
    };
  } catch (error: any) {
    context.error('Error getting note:', error);
    return {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: 'Internal server error'
      })
    };
  }
}

// POST /api/notes - Create a new note
async function createNote(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const body = await request.json() as Partial<Note>;
    
    if (!body.title || !body.content || !body.authorId || !body.authorName) {
      return {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: false,
          error: 'Title, content, authorId, and authorName are required'
        })
      };
    }

    const now = new Date();
    const note: Omit<Note, 'id'> = {
      title: body.title,
      content: body.content,
      authorId: body.authorId,
      authorName: body.authorName,
      authorRole: body.authorRole || 'student',
      tags: body.tags || [],
      isPublic: body.isPublic !== undefined ? body.isPublic : true,
      teamId: body.teamId,
      collaborators: body.collaborators || [],
      lastModified: now,
      createdAt: now,
      version: 1
    };

    const docRef = await db.collection('notes').add(note);
    
    // Create activity log
    await createActivity(
      note.authorId,
      note.authorName,
      note.authorRole,
      'note_created',
      docRef.id,
      'note',
      `Created note "${note.title}"`
    );

    const response: ApiResponse<{ id: string }> = {
      success: true,
      data: { id: docRef.id },
      message: 'Note created successfully'
    };

    return {
      status: 201,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(response)
    };
  } catch (error: any) {
    context.error('Error creating note:', error);
    return {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: 'Internal server error'
      })
    };
  }
}

// PUT /api/notes/{id} - Update a note
async function updateNote(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const noteId = request.params.id;
    if (!noteId) {
      return {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: false,
          error: 'Note ID is required'
        })
      };
    }

    const body = await request.json() as Partial<Note>;
    const updates: any = {};

    if (body.title !== undefined) updates.title = body.title;
    if (body.content !== undefined) updates.content = body.content;
    if (body.tags !== undefined) updates.tags = body.tags;
    if (body.isPublic !== undefined) updates.isPublic = body.isPublic;
    if (body.collaborators !== undefined) updates.collaborators = body.collaborators;

    // Always update lastModified and increment version
    updates.lastModified = new Date();

    // Get current note to increment version
    const currentDoc = await db.collection('notes').doc(noteId).get();
    if (!currentDoc.exists) {
      return {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: false,
          error: 'Note not found'
        })
      };
    }

    const currentData = currentDoc.data();
    updates.version = (currentData?.version || 1) + 1;

    await db.collection('notes').doc(noteId).update(updates);

    // Create activity log
    if (body.authorId && body.authorName && body.authorRole) {
      await createActivity(
        body.authorId,
        body.authorName,
        body.authorRole,
        'note_updated',
        noteId,
        'note',
        `Updated note "${currentData?.title || 'Unknown'}"`
      );
    }

    const response: ApiResponse<null> = {
      success: true,
      message: 'Note updated successfully'
    };

    return {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(response)
    };
  } catch (error: any) {
    context.error('Error updating note:', error);
    return {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: 'Internal server error'
      })
    };
  }
}

// DELETE /api/notes/{id} - Delete a note
async function deleteNote(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const noteId = request.params.id;
    if (!noteId) {
      return {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: false,
          error: 'Note ID is required'
        })
      };
    }

    // Get note data before deletion for activity log
    const doc = await db.collection('notes').doc(noteId).get();
    if (!doc.exists) {
      return {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: false,
          error: 'Note not found'
        })
      };
    }

    const noteData = doc.data();
    
    // Delete related comments
    const commentsSnapshot = await db.collection('comments').where('noteId', '==', noteId).get();
    const batch = db.batch();
    commentsSnapshot.forEach((commentDoc) => {
      batch.delete(commentDoc.ref);
    });

    // Delete the note
    batch.delete(doc.ref);
    await batch.commit();

    const response: ApiResponse<null> = {
      success: true,
      message: 'Note and related comments deleted successfully'
    };

    return {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(response)
    };
  } catch (error: any) {
    context.error('Error deleting note:', error);
    return {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: 'Internal server error'
      })
    };
  }
}

// Register HTTP functions
app.http('notes-get', {
  methods: ['GET'],
  route: 'notes',
  authLevel: 'anonymous',
  handler: getNotes
});

app.http('note-get', {
  methods: ['GET'],
  route: 'notes/{id}',
  authLevel: 'anonymous',
  handler: getNote
});

app.http('notes-post', {
  methods: ['POST'],
  route: 'notes',
  authLevel: 'anonymous',
  handler: createNote
});

app.http('note-put', {
  methods: ['PUT'],
  route: 'notes/{id}',
  authLevel: 'anonymous',
  handler: updateNote
});

app.http('note-delete', {
  methods: ['DELETE'],
  route: 'notes/{id}',
  authLevel: 'anonymous',
  handler: deleteNote
});

// Handle OPTIONS requests for CORS
app.http('notes-options', {
  methods: ['OPTIONS'],
  route: 'notes',
  authLevel: 'anonymous',
  handler: async () => ({
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Allow-Methods': '*'
    }
  })
});

app.http('note-options', {
  methods: ['OPTIONS'],
  route: 'notes/{id}',
  authLevel: 'anonymous',
  handler: async () => ({
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Allow-Methods': '*'
    }
  })
});