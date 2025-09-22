import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useConversations, useMessages } from '@/hooks/useMessages';
import { Conversation, Message } from '@/types/index';
import { formatDistanceToNow, format } from 'date-fns';

export default function MessagesPage() {
  const { user } = useAuth();
  const { conversations, loading: conversationsLoading, error: conversationsError, refetch: refetchConversations } = useConversations(
    user?.uid || '', 'student'
  );
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [onlineUsers] = useState(new Set(['alumni123', 'alumni456'])); // Mock online status
  const [contextMenu, setContextMenu] = useState<{conversation: Conversation; x: number; y: number} | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);

  const {
    messages,
    loading: messagesLoading,
    error: messagesError,
    sending,
    sendMessage
  } = useMessages(selectedConversation?.id || '', user?.uid || '');

  // Filter conversations based on search query
  const filteredConversations = conversations.filter(conv =>
    conv.alumniName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (conv.lastMessage && conv.lastMessage.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-refresh conversations every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refetchConversations();
    }, 30000);
    return () => clearInterval(interval);
  }, [refetchConversations]);

  // Focus input when conversation selected
  useEffect(() => {
    if (selectedConversation && messageInputRef.current) {
      messageInputRef.current.focus();
    }
  }, [selectedConversation]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowEmojiPicker(false);
      setContextMenu(null);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('click', () => setContextMenu(null));
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('click', () => setContextMenu(null));
    };
  }, [handleKeyDown]);

  const handleContextMenu = (e: React.MouseEvent, conversation: Conversation) => {
    e.preventDefault();
    setContextMenu({
      conversation,
      x: e.clientX,
      y: e.clientY
    });
  };

  const archiveConversation = (conversationId: string) => {
    console.log('Archiving conversation:', conversationId);
    setContextMenu(null);
    // In a real app, this would call an API
  };

  const deleteConversation = (conversationId: string) => {
    console.log('Deleting conversation:', conversationId);
    setContextMenu(null);
    // In a real app, this would call an API
  };

  const commonEmojis = ['😊', '😂', '👍', '❤️', '🎉', '👋', '💡', '🤔', '👏', '🚀'];

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation || !user) return;

    const messageText = newMessage.trim();
    setNewMessage(''); // Clear input immediately for better UX
    setIsTyping(false);

    try {
      await sendMessage({
        senderId: user.uid,
        senderName: user.displayName || user.email || 'Student',
        senderRole: 'student',
        receiverId: selectedConversation.alumniId,
        receiverName: selectedConversation.alumniName,
        receiverRole: 'alumni',
        content: messageText
      });
    } catch (error) {
      console.error('Failed to send message:', error);
      setNewMessage(messageText); // Restore message on error
    }
  };

  const handleEmojiClick = (emoji: string) => {
    setNewMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
    messageInputRef.current?.focus();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    setIsTyping(e.target.value.length > 0);
  };

  const markConversationAsRead = (conversationId: string) => {
    // In a real app, this would call an API
    console.log('Marking conversation as read:', conversationId);
  };

  if (conversationsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (conversationsError) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-700 dark:text-red-400">{conversationsError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="py-6 flex-shrink-0">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Messages</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Your conversations with alumni
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden flex-1 flex max-w-full mb-6">
        {/* Mobile conversation selector overlay */}
        {selectedConversation && (
          <div className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setSelectedConversation(null)}>
          </div>
        )}
        {/* Conversations List */}
        <div className={`${selectedConversation ? 'hidden md:flex' : 'flex'} w-full md:w-1/3 border-r border-gray-200 dark:border-gray-700 flex-col`}>
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Conversations</h2>
              <button
                onClick={refetchConversations}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                title="Refresh conversations"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
            
            {/* Search Bar */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                placeholder="Search conversations..."
              />
              <svg className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">No conversations yet</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                  Start by contacting alumni from the alumni directory
                </p>
                <a
                  href="/alumni"
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Browse Alumni
                </a>
              </div>
            ) : (
              filteredConversations.map((conversation) => (
                <button
                  key={conversation.id}
                  onClick={() => {
                    setSelectedConversation(conversation);
                    markConversationAsRead(conversation.id!);
                  }}
                  onContextMenu={(e) => handleContextMenu(e, conversation)}
                  className={`w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700/50 transition-all duration-200 ${
                    selectedConversation?.id === conversation.id 
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 shadow-inner' 
                      : ''
                  } ${conversation.unreadCount > 0 ? 'font-semibold' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 via-purple-500 to-blue-600 rounded-full flex items-center justify-center shadow-md">
                        <span className="text-white font-semibold text-sm">
                          {conversation.alumniName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                      {onlineUsers.has(conversation.alumniId) && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className={`font-medium truncate ${
                          conversation.unreadCount > 0 
                            ? 'text-gray-900 dark:text-white' 
                            : 'text-gray-700 dark:text-gray-300'
                        }`}>
                          {conversation.alumniName}
                        </h3>
                        {conversation.lastMessageDate && (
                          <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0 ml-2">
                            {formatDistanceToNow(new Date(conversation.lastMessageDate), { addSuffix: false })}
                          </span>
                        )}
                      </div>
                      {conversation.lastMessage && (
                        <p className={`text-sm truncate mt-0.5 ${
                          conversation.unreadCount > 0 
                            ? 'text-gray-700 dark:text-gray-300' 
                            : 'text-gray-500 dark:text-gray-400'
                        }`}>
                          {conversation.lastMessage}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-1">
                        {onlineUsers.has(conversation.alumniId) && (
                          <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                            Online
                          </span>
                        )}
                        <div className="flex items-center gap-2">
                          {conversation.unreadCount > 0 && (
                            <span className="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] h-5 flex items-center justify-center">
                              {conversation.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
            {searchQuery && filteredConversations.length === 0 && (
              <div className="p-6 text-center">
                <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">No conversations found</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Try a different search term</p>
              </div>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className={`${selectedConversation ? 'flex' : 'hidden md:flex'} flex-1 flex-col z-50 md:z-auto bg-white dark:bg-gray-800`}>
          {selectedConversation ? (
            <>
              {/* Header */}
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* Mobile back button */}
                    <button
                      onClick={() => setSelectedConversation(null)}
                      className="md:hidden p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <div className="relative">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 via-purple-500 to-blue-600 rounded-full flex items-center justify-center shadow-md">
                        <span className="text-white font-semibold">
                          {selectedConversation.alumniName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                      {onlineUsers.has(selectedConversation.alumniId) && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></div>
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {selectedConversation.alumniName}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {onlineUsers.has(selectedConversation.alumniId) 
                          ? 'Online • Alumni' 
                          : 'Alumni'
                        }
                        {isTyping && onlineUsers.has(selectedConversation.alumniId) && (
                          <span className="ml-2 text-green-600 dark:text-green-400">• typing...</span>
                        )}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                      title="View profile"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </button>
                    <button
                      className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                      title="More options"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900/30 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent hover:scrollbar-thumb-gray-400 dark:hover:scrollbar-thumb-gray-500">
                <div className="max-w-4xl mx-auto px-4 py-6 space-y-2">
                  {messagesLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="flex flex-col items-center gap-3">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Loading messages...</p>
                      </div>
                    </div>
                  ) : messagesError ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <p className="text-red-600 dark:text-red-400 font-medium">{messagesError}</p>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center py-16">
                      <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No messages yet</h3>
                      <p className="text-gray-500 dark:text-gray-400">Start the conversation by sending your first message!</p>
                    </div>
                  ) : (
                  messages.map((message, index) => {
                    const isCurrentUser = message.senderId === user?.uid;
                    const isLastMessage = index === messages.length - 1;
                    const nextMessage = messages[index + 1];
                    const isConsecutive = nextMessage?.senderId === message.senderId;
                    const showAvatar = !isCurrentUser && (!isConsecutive || isLastMessage);
                    
                    return (
                      <div
                        key={message.id}
                        className={`flex items-end gap-3 ${isCurrentUser ? 'justify-end' : 'justify-start'} ${
                          isConsecutive && !isLastMessage ? 'mb-2' : 'mb-4'
                        }`}
                      >
                        {!isCurrentUser && (
                          <div className="w-8 h-8 flex-shrink-0">
                            {showAvatar && (
                              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 via-purple-500 to-blue-600 rounded-full flex items-center justify-center">
                                <span className="text-white font-medium text-xs">
                                  {message.senderName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                        
                        <div className={`group max-w-sm lg:max-w-lg ${isCurrentUser ? 'ml-16' : 'mr-16'}`}>
                          <div
                            className={`px-4 py-3 rounded-2xl shadow-md transition-all duration-200 hover:shadow-lg ${
                              isCurrentUser
                                ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-br-md'
                                : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 rounded-bl-md hover:bg-gray-50 dark:hover:bg-gray-650'
                            } ${isConsecutive && !isLastMessage ? (isCurrentUser ? 'rounded-br-2xl' : 'rounded-bl-2xl') : ''}`}
                          >
                            {!isCurrentUser && !isConsecutive && (
                              <p className="text-xs text-gray-600 dark:text-gray-300 mb-2 font-semibold">
                                {message.senderName}
                              </p>
                            )}
                            <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">{message.content}</p>
                            <div className="flex items-center justify-between mt-3">
                              <p
                                className={`text-xs font-medium ${
                                  isCurrentUser
                                    ? 'text-blue-100 opacity-80'
                                    : 'text-gray-500 dark:text-gray-400'
                                }`}
                              >
                                {format(new Date(message.createdAt), 'HH:mm')}
                              </p>
                              {isCurrentUser && (
                                <div className="flex items-center gap-1">
                                  {/* Message status indicators */}
                                  <svg className="w-3 h-3 text-blue-200" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                  {message.isRead && (
                                    <svg className="w-3 h-3 text-blue-200" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Message Input */}
              <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg">
                {/* Emoji Picker */}
                {showEmojiPicker && (
                  <div className="mb-4 p-4 bg-white dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 shadow-xl">
                    <div className="grid grid-cols-10 gap-1">
                      {commonEmojis.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => handleEmojiClick(emoji)}
                          className="text-xl hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg p-2 transition-all duration-200 hover:scale-110"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                <form onSubmit={handleSendMessage} className="flex items-end gap-3">
                  {/* Emoji Button */}
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className={`p-3 rounded-full transition-all duration-200 hover:scale-105 ${
                      showEmojiPicker 
                        ? 'text-blue-600 bg-blue-100 dark:bg-blue-900/30' 
                        : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                    title="Add emoji"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>

                  {/* Message Input */}
                  <div className="flex-1 relative">
                    <input
                      ref={messageInputRef}
                      type="text"
                      value={newMessage}
                      onChange={handleInputChange}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage(e);
                        }
                      }}
                      className="w-full px-5 py-3.5 border-2 border-gray-200 dark:border-gray-600 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 pr-12 transition-all duration-200 shadow-sm hover:shadow-md focus:shadow-lg"
                      placeholder="Type a message..."
                      disabled={sending}
                      maxLength={1000}
                    />
                    
                    {/* Character Counter */}
                    {newMessage.length > 800 && (
                      <span className={`absolute right-3 top-3 text-xs ${
                        newMessage.length > 950 ? 'text-red-500' : 'text-gray-400'
                      }`}>
                        {newMessage.length}/1000
                      </span>
                    )}
                  </div>

                  {/* Send Button */}
                  <button
                    type="submit"
                    disabled={sending || !newMessage.trim()}
                    className={`p-3.5 rounded-full transition-all duration-200 flex items-center justify-center shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none ${
                      newMessage.trim()
                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white'
                        : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                    }`}
                    title={sending ? 'Sending...' : 'Send message'}
                  >
                    {sending ? (
                      <div className="w-5 h-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    )}
                  </button>
                </form>
                
                {/* Quick Actions */}
                <div className="flex items-center justify-between mt-3 text-xs text-gray-500 dark:text-gray-400">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono">Enter</kbd>
                      to send
                    </span>
                    {isTyping && (
                      <span className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                        <div className="flex gap-1">
                          <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce"></div>
                          <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                          <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                        </div>
                        You are typing...
                      </span>
                    )}
                  </div>
                  {onlineUsers.has(selectedConversation.alumniId) && (
                    <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400 font-medium">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      {selectedConversation.alumniName.split(' ')[0]} is online
                    </span>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">Select a conversation</h3>
                <p className="text-gray-500 dark:text-gray-400">Choose a conversation from the left to start messaging</p>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-2 min-w-[160px]"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
          }}
        >
          <button
            onClick={() => markConversationAsRead(contextMenu.conversation.id!)}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Mark as read
          </button>
          <button
            onClick={() => archiveConversation(contextMenu.conversation.id!)}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8l6 6V8z" />
            </svg>
            Archive
          </button>
          <button
            onClick={() => deleteConversation(contextMenu.conversation.id!)}
            className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete
          </button>
        </div>
      )}
    </div>
  );
}