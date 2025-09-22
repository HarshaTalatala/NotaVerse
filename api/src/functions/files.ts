import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { BlobServiceClient } from '@azure/storage-blob';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { FileAttachment, ApiResponse, PaginatedResponse, Activity } from '../types';

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

// Initialize Azure Blob Storage
const blobServiceClient = BlobServiceClient.fromConnectionString(
  process.env.AZURE_STORAGE_CONNECTION_STRING || ''
);
// Use a single consistent container name (ensure env overrides) - must match frontend expected default
const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'collaboration-files';

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

// Helper function to generate unique filename
function generateUniqueFileName(originalName: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  const extension = originalName.split('.').pop();
  const nameWithoutExt = originalName.split('.').slice(0, -1).join('.');
  return `${nameWithoutExt}_${timestamp}_${random}.${extension}`;
}

// GET /api/files - Get files with filtering and pagination
async function getFiles(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    if (!db) {
      // Fallback: list blobs directly from Azure when Firestore unavailable
      const url = new URL(request.url);
      const page = parseInt(url.searchParams.get('page') || '1');
      const limit = parseInt(url.searchParams.get('limit') || '20');
      const containerClient = blobServiceClient.getContainerClient(containerName);
      const items: FileAttachment[] = [];
      let index = 0;
      for await (const blob of containerClient.listBlobsFlat()) {
        // Manual pagination in-memory
        if (index >= (page - 1) * limit && items.length < limit) {
          items.push({
            id: blob.name,
            fileName: blob.name,
            originalName: blob.name,
            fileSize: blob.properties.contentLength || 0,
            mimeType: blob.properties.contentType || 'application/octet-stream',
            blobUrl: `${containerClient.url}/${blob.name}`,
            uploadedBy: 'unknown',
            uploadedByName: 'Unknown',
            isPublic: true,
            createdAt: blob.properties.createdOn || new Date()
          } as any);
        }
        index++;
      }

      const response: PaginatedResponse<FileAttachment> = {
        success: true,
        data: items,
        pagination: {
          page,
          limit,
          total: index,
          totalPages: Math.ceil(index / limit)
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
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const teamId = url.searchParams.get('teamId') || '';
    const noteId = url.searchParams.get('noteId') || '';
    const userId = url.searchParams.get('userId') || '';
    const isPublic = url.searchParams.get('isPublic');
    const tags = url.searchParams.get('tags')?.split(',').filter(Boolean) || [];

    let query = db.collection('files').orderBy('createdAt', 'desc');

    // Apply filters
    if (teamId) {
      query = query.where('teamId', '==', teamId);
    }
    if (noteId) {
      query = query.where('noteId', '==', noteId);
    }
    if (userId) {
      query = query.where('uploadedBy', '==', userId);
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

    const files: FileAttachment[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      files.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate(),
      } as FileAttachment);
    });

    const response: PaginatedResponse<FileAttachment> = {
      success: true,
      data: files,
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
    context.error('Error getting files:', error);
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

// POST /api/files/upload - Upload a file
async function uploadFile(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    // Parse multipart form data (simplified - in production use proper multipart parser)
    const formData = await request.formData();
  const file = formData.get('file') as File;
  const uploadedBy = formData.get('uploadedBy') as string;
  const uploadedByName = formData.get('uploadedByName') as string;
  const userRole = (formData.get('userRole') as string) || 'student';
    const teamId = formData.get('teamId') as string;
    const noteId = formData.get('noteId') as string;
    const isPublic = formData.get('isPublic') === 'true';
    const tags = formData.get('tags') ? (formData.get('tags') as string).split(',') : [];

    if (!file || !uploadedBy || !uploadedByName) {
      return {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: false,
          error: 'File, uploadedBy, and uploadedByName are required'
        })
      };
    }

    // Generate unique filename
    const fileName = generateUniqueFileName(file.name);
    
    // Upload to Azure Blob Storage
    if (!process.env.AZURE_STORAGE_CONNECTION_STRING) {
      context.error('Missing AZURE_STORAGE_CONNECTION_STRING environment variable');
      return {
        status: 500,
        headers: { 'Content-Type': 'application/json','Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ success:false, error:'Storage not configured' })
      };
    }

    const containerClient = blobServiceClient.getContainerClient(containerName);
    // Ensure container exists (idempotent)
    try {
      const createResp = await containerClient.createIfNotExists({ access: 'container' });
      if (createResp.succeeded) {
        context.log(`Created container '${containerName}'`);
      }
    } catch (e) {
      context.error('Failed to ensure container exists', e);
    }
    const blockBlobClient = containerClient.getBlockBlobClient(fileName);
    
    const buffer = Buffer.from(await file.arrayBuffer());
    try {
      await blockBlobClient.upload(buffer, buffer.length, {
        blobHTTPHeaders: {
          blobContentType: file.type || 'application/octet-stream'
        }
      });
    } catch (e:any) {
      context.error('Azure Blob upload failed', { message: e.message, stack: e.stack });
      return {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ success: false, error: 'Blob upload failed' })
      };
    }

    // Create file record in Firestore (if available)
    let fileId = 'temp_' + Date.now();
    if (db) {
      const fileAttachment: Omit<FileAttachment, 'id'> = {
        fileName,
        originalName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        blobUrl: blockBlobClient.url,
        uploadedBy,
        uploadedByName,
        teamId: teamId || undefined,
        noteId: noteId || undefined,
        isPublic,
        tags,
        createdAt: new Date()
      };

      const docRef = await db.collection('files').add(fileAttachment);
      fileId = docRef.id;

      // Create activity log
      await createActivity(
        uploadedBy,
        uploadedByName,
        userRole,
        'file_uploaded',
        fileId,
        'file',
        `Uploaded file \"${file.name}\"`,
        { teamId, noteId, fileSize: file.size }
      );
    }

    const response: ApiResponse<{ id: string; url: string }> = {
      success: true,
      data: { 
        id: fileId,
        url: blockBlobClient.url
      },
      message: 'File uploaded successfully'
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
  context.error('Error uploading file:', error);
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

// GET /api/files/{id} - Get file metadata
async function getFile(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const fileId = request.params.id;
    if (!fileId) {
      return {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: false,
          error: 'File ID is required'
        })
      };
    }

    const doc = await db.collection('files').doc(fileId).get();
    if (!doc.exists) {
      return {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: false,
          error: 'File not found'
        })
      };
    }

    const data = doc.data();
    const file: FileAttachment = {
      id: doc.id,
      ...data,
      createdAt: data?.createdAt?.toDate(),
    } as FileAttachment;

    const response: ApiResponse<FileAttachment> = {
      success: true,
      data: file
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
    context.error('Error getting file:', error);
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

// DELETE /api/files/{id} - Delete a file
async function deleteFile(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const fileId = request.params.id;
    if (!fileId) {
      return {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: false,
          error: 'File ID is required'
        })
      };
    }

    // Get file data
    const doc = await db.collection('files').doc(fileId).get();
    if (!doc.exists) {
      return {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: false,
          error: 'File not found'
        })
      };
    }

    const fileData = doc.data() as FileAttachment;

    // Delete from Azure Blob Storage
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(fileData.fileName);
    await blockBlobClient.deleteIfExists();

    // Delete from Firestore
    await doc.ref.delete();

    const response: ApiResponse<null> = {
      success: true,
      message: 'File deleted successfully'
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
    context.error('Error deleting file:', error);
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

// GET /api/files/{id}/download - Download/stream a file
async function downloadFile(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const fileId = request.params.id;
    if (!fileId) {
      return {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: false,
          error: 'File ID is required'
        })
      };
    }

    // Get file metadata
    const doc = await db.collection('files').doc(fileId).get();
    if (!doc.exists) {
      return {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: false,
          error: 'File not found'
        })
      };
    }

    const fileData = doc.data() as FileAttachment;

    // Get blob from Azure Storage
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(fileData.fileName);
    
    const downloadBlockBlobResponse = await blockBlobClient.download();
    
    if (!downloadBlockBlobResponse.readableStreamBody) {
      return {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: false,
          error: 'File content not found'
        })
      };
    }

    // Convert stream to buffer
    const chunks: Uint8Array[] = [];
    for await (const chunk of downloadBlockBlobResponse.readableStreamBody) {
      chunks.push(chunk instanceof Buffer ? chunk : Buffer.from(chunk));
    }
    const buffer = Buffer.concat(chunks);

    return {
      status: 200,
      headers: {
        'Content-Type': fileData.mimeType,
        'Content-Length': fileData.fileSize.toString(),
        'Content-Disposition': `attachment; filename="${fileData.originalName}"`,
        'Access-Control-Allow-Origin': '*'
      },
      body: buffer
    };
  } catch (error: any) {
    context.error('Error downloading file:', error);
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
app.http('files-get', {
  methods: ['GET'],
  route: 'files',
  authLevel: 'anonymous',
  handler: getFiles
});

app.http('files-upload', {
  methods: ['POST'],
  route: 'files/upload',
  authLevel: 'anonymous',
  handler: uploadFile
});

app.http('file-get', {
  methods: ['GET'],
  route: 'files/{id}',
  authLevel: 'anonymous',
  handler: getFile
});

app.http('file-download', {
  methods: ['GET'],
  route: 'files/{id}/download',
  authLevel: 'anonymous',
  handler: downloadFile
});

app.http('file-delete', {
  methods: ['DELETE'],
  route: 'files/{id}',
  authLevel: 'anonymous',
  handler: deleteFile
});

// Handle OPTIONS requests for CORS
app.http('files-options', {
  methods: ['OPTIONS'],
  route: 'files',
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

app.http('files-upload-options', {
  methods: ['OPTIONS'],
  route: 'files/upload',
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

app.http('file-options', {
  methods: ['OPTIONS'],
  route: 'files/{id}',
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

app.http('file-download-options', {
  methods: ['OPTIONS'],
  route: 'files/{id}/download',
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