import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { Message, Conversation, ContactRequest, ApiResponse, PaginatedResponse } from '../types';

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

// GET /api/conversations - Get user's conversations
async function getConversations(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    if (!db) {
      return {
        status: 503,
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: false, error: 'Database not available' })
      };
    }

    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    const userRole = url.searchParams.get('userRole');

    if (!userId || !userRole) {
      return {
        status: 400,
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: false, error: 'userId and userRole are required' })
      };
    }

    let query;
    if (userRole === 'student') {
      query = db.collection('conversations').where('studentId', '==', userId);
    } else if (userRole === 'alumni') {
      query = db.collection('conversations').where('alumniId', '==', userId);
    } else {
      return {
        status: 400,
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: false, error: 'Invalid user role' })
      };
    }

    const snapshot = await query.orderBy('updatedAt', 'desc').get();
    const conversations = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
      updatedAt: doc.data().updatedAt?.toDate?.() || doc.data().updatedAt,
      lastMessageDate: doc.data().lastMessageDate?.toDate?.() || doc.data().lastMessageDate
    }));

    return {
      status: 200,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, data: conversations })
    };
  } catch (error: any) {
    context.error('Error fetching conversations:', error);
    return {
      status: 500,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: false, error: 'Failed to fetch conversations' })
    };
  }
}

// GET /api/messages - Get messages for a conversation
async function getMessages(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    if (!db) {
      return {
        status: 503,
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: false, error: 'Database not available' })
      };
    }

    const url = new URL(request.url);
    const conversationId = url.searchParams.get('conversationId');
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '50');

    if (!conversationId) {
      return {
        status: 400,
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: false, error: 'conversationId is required' })
      };
    }

    const snapshot = await db.collection('messages')
      .where('conversationId', '==', conversationId)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .offset((page - 1) * limit)
      .get();

    const messages = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
      updatedAt: doc.data().updatedAt?.toDate?.() || doc.data().updatedAt
    })).reverse(); // Reverse to show oldest first

    // Get total count for pagination
    const totalSnapshot = await db.collection('messages')
      .where('conversationId', '==', conversationId)
      .get();

    const response: PaginatedResponse<Message> = {
      success: true,
      data: messages,
      pagination: {
        page,
        limit,
        total: totalSnapshot.size,
        totalPages: Math.ceil(totalSnapshot.size / limit)
      }
    };

    return {
      status: 200,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify(response)
    };
  } catch (error: any) {
    context.error('Error fetching messages:', error);
    return {
      status: 500,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: false, error: 'Failed to fetch messages' })
    };
  }
}

// POST /api/contact-request - Send contact request to alumni
async function sendContactRequest(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    if (!db) {
      return {
        status: 503,
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: false, error: 'Database not available' })
      };
    }

    const contactRequest = await request.json() as Omit<ContactRequest, 'id' | 'createdAt'>;

    // Validate required fields
    if (!contactRequest.studentId || !contactRequest.alumniId || !contactRequest.subject || !contactRequest.message) {
      return {
        status: 400,
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: false, error: 'All fields are required' })
      };
    }

    // Check if conversation already exists
    const existingConversation = await db.collection('conversations')
      .where('studentId', '==', contactRequest.studentId)
      .where('alumniId', '==', contactRequest.alumniId)
      .get();

    if (!existingConversation.empty) {
      return {
        status: 400,
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: false, error: 'Conversation already exists' })
      };
    }

    // Create contact request
    const newContactRequest = {
      ...contactRequest,
      status: 'pending' as const,
      createdAt: new Date()
    };

    const docRef = await db.collection('contactRequests').add(newContactRequest);

    return {
      status: 201,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        success: true, 
        data: { id: docRef.id, ...newContactRequest },
        message: 'Contact request sent successfully'
      })
    };
  } catch (error: any) {
    context.error('Error sending contact request:', error);
    return {
      status: 500,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: false, error: 'Failed to send contact request' })
    };
  }
}

// POST /api/contact-response - Respond to contact request
async function respondToContactRequest(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    if (!db) {
      return {
        status: 503,
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: false, error: 'Database not available' })
      };
    }

    const { requestId, response, alumniId } = await request.json() as {
      requestId: string;
      response: 'accepted' | 'declined';
      alumniId: string;
    };

    if (!requestId || !response || !alumniId || !['accepted', 'declined'].includes(response)) {
      return {
        status: 400,
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: false, error: 'Invalid request data' })
      };
    }

    // Get the contact request
    const requestDoc = await db.collection('contactRequests').doc(requestId).get();
    if (!requestDoc.exists) {
      return {
        status: 404,
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: false, error: 'Contact request not found' })
      };
    }

    const contactRequestData = requestDoc.data();
    if (contactRequestData.alumniId !== alumniId) {
      return {
        status: 403,
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: false, error: 'Unauthorized' })
      };
    }

    // Update contact request status
    await db.collection('contactRequests').doc(requestId).update({
      status: response,
      respondedAt: new Date()
    });

    // If accepted, create conversation and initial message
    if (response === 'accepted') {
      const conversation = {
        studentId: contactRequestData.studentId,
        studentName: contactRequestData.studentName,
        alumniId: contactRequestData.alumniId,
        alumniName: contactRequestData.alumniName,
        lastMessage: contactRequestData.message,
        lastMessageDate: new Date(),
        lastMessageSender: contactRequestData.studentId,
        unreadCount: 1,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const conversationRef = await db.collection('conversations').add(conversation);

      // Create initial message
      const initialMessage = {
        conversationId: conversationRef.id,
        senderId: contactRequestData.studentId,
        senderName: contactRequestData.studentName,
        senderRole: 'student',
        receiverId: contactRequestData.alumniId,
        receiverName: contactRequestData.alumniName,
        receiverRole: 'alumni',
        content: contactRequestData.message,
        isRead: false,
        createdAt: new Date()
      };

      await db.collection('messages').add(initialMessage);
    }

    return {
      status: 200,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        success: true, 
        message: `Contact request ${response} successfully`
      })
    };
  } catch (error: any) {
    context.error('Error responding to contact request:', error);
    return {
      status: 500,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: false, error: 'Failed to respond to contact request' })
    };
  }
}

// POST /api/send-message - Send a message in existing conversation
async function sendMessage(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    if (!db) {
      return {
        status: 503,
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: false, error: 'Database not available' })
      };
    }

    const messageData = await request.json() as Omit<Message, 'id' | 'createdAt' | 'isRead'>;

    // Validate required fields
    if (!messageData.conversationId || !messageData.senderId || !messageData.receiverId || !messageData.content) {
      return {
        status: 400,
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: false, error: 'Required fields missing' })
      };
    }

    // Verify conversation exists
    const conversationDoc = await db.collection('conversations').doc(messageData.conversationId).get();
    if (!conversationDoc.exists) {
      return {
        status: 404,
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: false, error: 'Conversation not found' })
      };
    }

    // Create message
    const newMessage = {
      ...messageData,
      content: messageData.content.trim(),
      isRead: false,
      createdAt: new Date()
    };

    const messageRef = await db.collection('messages').add(newMessage);

    // Update conversation with last message info
    await db.collection('conversations').doc(messageData.conversationId).update({
      lastMessage: messageData.content.trim(),
      lastMessageDate: new Date(),
      lastMessageSender: messageData.senderId,
      unreadCount: db.FieldValue.increment(1),
      updatedAt: new Date()
    });

    return {
      status: 201,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        success: true, 
        data: { id: messageRef.id, ...newMessage },
        message: 'Message sent successfully'
      })
    };
  } catch (error: any) {
    context.error('Error sending message:', error);
    return {
      status: 500,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: false, error: 'Failed to send message' })
    };
  }
}

// PUT /api/mark-read - Mark messages as read
async function markMessagesAsRead(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    if (!db) {
      return {
        status: 503,
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: false, error: 'Database not available' })
      };
    }

    const { conversationId, userId } = await request.json() as {
      conversationId: string;
      userId: string;
    };

    if (!conversationId || !userId) {
      return {
        status: 400,
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: false, error: 'conversationId and userId are required' })
      };
    }

    // Mark all unread messages in conversation as read for this user
    const unreadMessages = await db.collection('messages')
      .where('conversationId', '==', conversationId)
      .where('receiverId', '==', userId)
      .where('isRead', '==', false)
      .get();

    const batch = db.batch();
    unreadMessages.docs.forEach(doc => {
      batch.update(doc.ref, { isRead: true });
    });

    await batch.commit();

    // Update conversation unread count
    await db.collection('conversations').doc(conversationId).update({
      unreadCount: 0
    });

    return {
      status: 200,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        success: true, 
        message: 'Messages marked as read'
      })
    };
  } catch (error: any) {
    context.error('Error marking messages as read:', error);
    return {
      status: 500,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: false, error: 'Failed to mark messages as read' })
    };
  }
}

// GET /api/contact-requests - Get contact requests for alumni
async function getContactRequests(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    if (!db) {
      return {
        status: 503,
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: false, error: 'Database not available' })
      };
    }

    const url = new URL(request.url);
    const alumniId = url.searchParams.get('alumniId');
    const status = url.searchParams.get('status') || 'pending';

    if (!alumniId) {
      return {
        status: 400,
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: false, error: 'alumniId is required' })
      };
    }

    const snapshot = await db.collection('contactRequests')
      .where('alumniId', '==', alumniId)
      .where('status', '==', status)
      .orderBy('createdAt', 'desc')
      .get();

    const requests = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
      respondedAt: doc.data().respondedAt?.toDate?.() || doc.data().respondedAt
    }));

    return {
      status: 200,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, data: requests })
    };
  } catch (error: any) {
    context.error('Error fetching contact requests:', error);
    return {
      status: 500,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: false, error: 'Failed to fetch contact requests' })
    };
  }
}

// CORS preflight handler
async function handleCors(): Promise<HttpResponseInit> {
  return {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  };
}

// Register HTTP functions
app.http('getConversations', {
  methods: ['GET'],
  route: 'conversations',
  authLevel: 'anonymous',
  handler: getConversations
});

app.http('getMessages', {
  methods: ['GET'],
  route: 'messages',
  authLevel: 'anonymous',
  handler: getMessages
});

app.http('sendContactRequest', {
  methods: ['POST'],
  route: 'contact-request',
  authLevel: 'anonymous',
  handler: sendContactRequest
});

app.http('respondToContactRequest', {
  methods: ['POST'],
  route: 'contact-response',
  authLevel: 'anonymous',
  handler: respondToContactRequest
});

app.http('sendMessage', {
  methods: ['POST'],
  route: 'send-message',
  authLevel: 'anonymous',
  handler: sendMessage
});

app.http('markMessagesAsRead', {
  methods: ['PUT'],
  route: 'mark-read',
  authLevel: 'anonymous',
  handler: markMessagesAsRead
});

app.http('getContactRequests', {
  methods: ['GET'],
  route: 'contact-requests',
  authLevel: 'anonymous',
  handler: getContactRequests
});

// CORS handlers
app.http('messagesCors', {
  methods: ['OPTIONS'],
  route: 'messages',
  authLevel: 'anonymous',
  handler: handleCors
});

app.http('conversationsCors', {
  methods: ['OPTIONS'],
  route: 'conversations',
  authLevel: 'anonymous',
  handler: handleCors
});

app.http('contactRequestCors', {
  methods: ['OPTIONS'],
  route: 'contact-request',
  authLevel: 'anonymous',
  handler: handleCors
});

app.http('contactResponseCors', {
  methods: ['OPTIONS'],
  route: 'contact-response',
  authLevel: 'anonymous',
  handler: handleCors
});

app.http('sendMessageCors', {
  methods: ['OPTIONS'],
  route: 'send-message',
  authLevel: 'anonymous',
  handler: handleCors
});

app.http('markReadCors', {
  methods: ['OPTIONS'],
  route: 'mark-read',
  authLevel: 'anonymous',
  handler: handleCors
});

app.http('contactRequestsCors', {
  methods: ['OPTIONS'],
  route: 'contact-requests',
  authLevel: 'anonymous',
  handler: handleCors
});