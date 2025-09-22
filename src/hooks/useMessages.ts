import { useState, useEffect, useCallback } from 'react';
import { Message, Conversation, ContactRequest } from '@/types/index';
import api from '@/services/api';

export const useConversations = (userId: string, userRole: 'student' | 'alumni') => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConversations = useCallback(async () => {
    if (!userId || !userRole) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Use dummy data for now since API is not responding
      console.log('🔄 Using dummy data for conversations');
      
      const dummyConversations: Conversation[] = [
        {
          id: 'conv1',
          studentId: 'nab4TPB6WJVYWTVyD7sWAc4IwGw1',
          alumniId: 'alumni123',
          studentName: 'Navya',
          alumniName: 'Ramya Vardhanapu',
          lastMessage: 'Hi! I would love to connect and learn about your experience in the tech industry.',
          lastMessageDate: new Date('2025-09-22T08:30:00Z'),
          lastMessageSender: 'John Doe',
          unreadCount: userRole === 'student' ? 2 : 0,
          status: 'active',
          createdAt: new Date('2025-09-21T10:00:00Z'),
          updatedAt: new Date('2025-09-22T08:30:00Z')
        },
        {
          id: 'conv2',
          studentId: 'nab4TPB6WJVYWTVyD7sWAc4IwGw1',
          alumniId: 'alumni456',
          studentName: 'John Doe',
          alumniName: 'Rishi Kakarla',
          lastMessage: 'Thank you for accepting my connection request!',
          lastMessageDate: new Date('2025-09-21T16:45:00Z'),
          lastMessageSender: 'John Doe',
          unreadCount: userRole === 'student' ? 0 : 1,
          status: 'active',
          createdAt: new Date('2025-09-21T14:00:00Z'),
          updatedAt: new Date('2025-09-21T16:45:00Z')
        }
      ];
      
      setConversations(dummyConversations);
      
      // Comment out the API call for now
      /*
      const response = await api.get('/conversations', {
        params: { userId, userRole }
      });
      
      if (response.data.success) {
        setConversations(response.data.data);
      } else {
        throw new Error(response.data.error || 'Failed to fetch conversations');
      }
      */
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to fetch conversations');
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }, [userId, userRole]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  return {
    conversations,
    loading,
    error,
    refetch: fetchConversations
  };
};

export const useMessages = (conversationId: string, userId: string) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const fetchMessages = useCallback(async () => {
    if (!conversationId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Use dummy data for now since API is not responding
      console.log('🔄 Using dummy data for messages');
      
      const dummyMessages: Message[] = [
        {
          id: 'msg1',
          conversationId,
          senderId: 'nab4TPB6WJVYWTVyD7sWAc4IwGw1',
          senderName: 'John Doe',
          senderRole: 'student',
          receiverId: 'alumni123',
          receiverName: 'Sarah Johnson',
          receiverRole: 'alumni',
          content: 'Hi! I would love to connect and learn about your experience in the tech industry.',
          createdAt: new Date('2025-09-21T10:15:00Z'),
          isRead: true
        },
        {
          id: 'msg2',
          conversationId,
          senderId: 'alumni123',
          senderName: 'Sarah Johnson',
          senderRole: 'alumni',
          receiverId: 'nab4TPB6WJVYWTVyD7sWAc4IwGw1',
          receiverName: 'John Doe',
          receiverRole: 'student',
          content: 'Hello John! I\'d be happy to share my experiences. What specific areas are you most interested in?',
          createdAt: new Date('2025-09-21T14:30:00Z'),
          isRead: true
        },
        {
          id: 'msg3',
          conversationId,
          senderId: 'nab4TPB6WJVYWTVyD7sWAc4IwGw1',
          senderName: 'John Doe',
          senderRole: 'student',
          receiverId: 'alumni123',
          receiverName: 'Sarah Johnson',
          receiverRole: 'alumni',
          content: 'I\'m particularly interested in software development and how you transitioned from university to your current role.',
          createdAt: new Date('2025-09-22T08:30:00Z'),
          isRead: false
        }
      ];
      
      setMessages(dummyMessages);
      
      // Comment out the API call for now
      /*
      const response = await api.get('/messages', {
        params: { conversationId, page: 1, limit: 100 }
      });
      
      if (response.data.success) {
        setMessages(response.data.data);
        // Mark messages as read when fetching
        if (userId) {
          markAsRead();
        }
      } else {
        throw new Error(response.data.error || 'Failed to fetch messages');
      }
      */
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to fetch messages');
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [conversationId, userId]);

  const sendMessage = async (messageData: {
    senderId: string;
    senderName: string;
    senderRole: 'student' | 'alumni';
    receiverId: string;
    receiverName: string;
    receiverRole: 'student' | 'alumni';
    content: string;
  }) => {
    if (!conversationId || !messageData.content.trim()) return;
    
    try {
      setSending(true);
      setError(null);
      
      const response = await api.post('/send-message', {
        conversationId,
        ...messageData,
        content: messageData.content.trim()
      });
      
      if (response.data.success) {
        // Add the new message to the local state immediately
        setMessages(prev => [...prev, response.data.data]);
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Failed to send message');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to send message');
      throw err;
    } finally {
      setSending(false);
    }
  };

  const markAsRead = async () => {
    if (!conversationId || !userId) return;
    
    try {
      await api.put('/mark-read', {
        conversationId,
        userId
      });
    } catch (err: any) {
      console.error('Failed to mark messages as read:', err);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  return {
    messages,
    loading,
    error,
    sending,
    sendMessage,
    markAsRead,
    refetch: fetchMessages
  };
};

export const useContactRequests = (alumniId: string) => {
  const [requests, setRequests] = useState<ContactRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    if (!alumniId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Use dummy data for now since API is not responding
      console.log('🔄 Using dummy data for contact requests');
      
      const dummyRequests: ContactRequest[] = [
        {
          id: 'req1',
          studentId: 'student456',
          studentName: 'Alice Smith',
          studentEmail: 'alice.smith@university.edu',
          alumniId,
          alumniName: 'Sarah Johnson',
          subject: 'Career Guidance in Cybersecurity',
          message: 'Hi! I\'m a Computer Science student interested in learning about careers in cybersecurity.',
          status: 'pending',
          createdAt: new Date('2025-09-22T07:00:00Z')
        },
        {
          id: 'req2',
          studentId: 'student789',
          studentName: 'Bob Wilson',
          studentEmail: 'bob.wilson@university.edu',
          alumniId,
          alumniName: 'Sarah Johnson',
          subject: 'Software Engineering Opportunities',
          message: 'Hello! I would like to connect and discuss opportunities in software engineering.',
          status: 'pending',
          createdAt: new Date('2025-09-21T18:00:00Z')
        }
      ];
      
      setRequests(dummyRequests);
      
      // Comment out the API call for now
      /*
      const response = await api.get('/contact-requests', {
        params: { alumniId, status: 'pending' }
      });
      
      if (response.data.success) {
        setRequests(response.data.data);
      } else {
        throw new Error(response.data.error || 'Failed to fetch contact requests');
      }
      */
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to fetch contact requests');
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [alumniId]);

  const respondToRequest = async (requestId: string, response: 'accepted' | 'declined') => {
    try {
      setError(null);
      const result = await api.post('/contact-response', {
        requestId,
        response,
        alumniId
      });
      
      if (result.data.success) {
        // Remove the request from the list
        setRequests(prev => prev.filter(req => req.id !== requestId));
        return result.data;
      } else {
        throw new Error(result.data.error || 'Failed to respond to request');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to respond to request');
      throw err;
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  return {
    requests,
    loading,
    error,
    respondToRequest,
    refetch: fetchRequests
  };
};

export const useSendContactRequest = () => {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendContactRequest = async (requestData: {
    studentId: string;
    studentName: string;
    studentEmail?: string;
    alumniId: string;
    alumniName: string;
    subject: string;
    message: string;
  }) => {
    try {
      setSending(true);
      setError(null);
      
      // Use dummy response for now since API is not responding
      console.log('🔄 Using dummy response for contact request');
      console.log('Contact request data:', requestData);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const dummyResponse = {
        success: true,
        data: {
          id: `req_${Date.now()}`,
          ...requestData,
          status: 'pending',
          createdAt: new Date()
        }
      };
      
      return dummyResponse.data;
      
      // Comment out the API call for now
      /*
      const response = await api.post('/contact-request', requestData);
      
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Failed to send contact request');
      }
      */
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to send contact request';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setSending(false);
    }
  };

  return {
    sendContactRequest,
    sending,
    error,
    clearError: () => setError(null)
  };
};