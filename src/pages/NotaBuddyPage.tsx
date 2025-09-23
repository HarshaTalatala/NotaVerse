import React, { useState, useRef, useEffect } from 'react';
import { NotaBuddyService } from '../services/notaBuddyService';
import { Card } from '../components/ui/Card';
import { useAuth } from '../contexts/AuthContext';

interface ChatMessage {
  id: string;
  type: 'user' | 'ai' | 'system';
  content: string;
  timestamp: Date;
}

const NotaBuddyPage: React.FC = () => {
  const { user, role, loading } = useAuth();
  
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'system',
      content: 'Welcome to NotaBuddy! 📚 Upload your documents (PDF, TXT, DOCX) and I\'ll help you understand and analyze them with AI-powered insights.',
      timestamp: new Date(),
    },
  ]);
  
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isAsking, setIsAsking] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Generate unique ID for messages
  const generateId = () => Math.random().toString(36).substr(2, 9);

  const addMessage = (type: 'user' | 'ai' | 'system', content: string) => {
    const newMessage: ChatMessage = {
      id: generateId(),
      type,
      content,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, newMessage]);
  };

  // File handling
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload({ target: { files } } as any);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);
    addMessage('user', `📁 Uploading: ${files[0].name}`);

    try {
      const file = files[0];
      
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 100);

      const result = await NotaBuddyService.uploadDocument(file);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      if (result.success) {
        setUploadedFiles(prev => [...prev, file.name]);
        addMessage('system', `✅ Successfully uploaded: ${file.name}. You can now ask questions about this document!`);
      } else {
        addMessage('system', `❌ Upload failed: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      addMessage('system', `❌ Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleAskQuestion = async () => {
    if (!currentQuestion.trim()) return;
    if (uploadedFiles.length === 0) {
      addMessage('system', '📚 Please upload at least one document before asking questions.');
      return;
    }

    const question = currentQuestion.trim();
    setCurrentQuestion('');
    setIsAsking(true);
    setIsTyping(true);

    addMessage('user', question);

    try {
      const response = await NotaBuddyService.askQuestion(question);
      
      if (response.success && response.answer) {
        addMessage('ai', response.answer);
      } else {
        addMessage('system', `❌ Error: ${response.error || 'Failed to get response'}`);
      }
    } catch (error) {
      console.error('Question error:', error);
      addMessage('system', `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsAsking(false);
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAskQuestion();
    }
  };

  const copyMessageContent = (messageId: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedMessageId(messageId);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 dark:border-blue-800 border-t-blue-600 dark:border-t-blue-400 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Access control - Only allow students and alumni
  if (!user || role === 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center p-8">
          <div className="w-24 h-24 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-12 h-12 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Access Restricted
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            NotaBuddy AI is only available to students and alumni. This feature is not accessible to administrators.
          </p>
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-left">
            <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">Available to:</h3>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                Students - For academic document analysis
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                Alumni - For continued learning support
              </li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            NotaBuddy AI
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Your intelligent document assistant - Upload, analyze, and chat with your documents.
          </p>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Upload Sidebar */}
          <div className="lg:col-span-1">
            <Card className="bg-white dark:bg-gray-800 p-6 sticky top-6">
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                    <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                      Document Hub
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Upload documents for AI analysis
                    </p>
                  </div>
                </div>
              </div>

              {/* Upload Area */}
              <div 
                className={`relative border-2 border-dashed rounded-lg p-6 transition-all duration-300 cursor-pointer mb-6 ${
                  isDragOver
                    ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                    : isUploading
                    ? 'border-purple-400 bg-purple-50 dark:bg-purple-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.txt,.docx"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                />
                
                <div className="text-center">
                  {isUploading ? (
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 border-4 border-blue-200 dark:border-blue-800 border-t-blue-600 dark:border-t-blue-400 rounded-full animate-spin mb-4"></div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                        Processing...
                      </p>
                      <div className="w-full max-w-xs mb-2">
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div 
                            className="h-2 bg-blue-600 dark:bg-blue-500 rounded-full transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                          ></div>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{Math.round(uploadProgress)}%</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center mb-4">
                        <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Upload Documents</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 text-center">
                        Drag & drop or click to browse
                      </p>
                      <div className="flex gap-2">
                        <span className="px-3 py-1 text-xs bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400 rounded-full font-medium">
                          PDF
                        </span>
                        <span className="px-3 py-1 text-xs bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400 rounded-full font-medium">
                          TXT
                        </span>
                        <span className="px-3 py-1 text-xs bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-400 rounded-full font-medium">
                          DOCX
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Uploaded Files */}
              {uploadedFiles.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                      <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                      Ready Files ({uploadedFiles.length})
                    </h3>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {uploadedFiles.map((filename, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-200 dark:border-green-800">
                        <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg flex-shrink-0">
                          <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-green-900 dark:text-green-100 truncate">
                            {filename}
                          </p>
                          <p className="text-xs text-green-600 dark:text-green-400">Ready for analysis</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-3">
            <Card className="bg-white dark:bg-gray-800 h-[calc(100vh-12rem)] flex flex-col">
              
              {/* Chat Header */}
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                      <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                        AI Chat Assistant
                      </h2>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Ask questions about your documents</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {uploadedFiles.length > 0 && (
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100 dark:bg-green-900/20 rounded-lg">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-sm font-medium text-green-700 dark:text-green-300">
                          {uploadedFiles.length} file{uploadedFiles.length !== 1 ? 's' : ''} ready
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6">
                {/* Drag overlay */}
                {isDragOver && (
                  <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-xl border-2 border-dashed border-blue-400">
                      <div className="text-center">
                        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                          <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                          Drop Your Document Here
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400">Release to upload instantly</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                      onMouseEnter={() => setHoveredMessageId(message.id)}
                      onMouseLeave={() => setHoveredMessageId(null)}
                    >
                      <div className={`flex items-start gap-3 max-w-2xl ${
                        message.type === 'user' ? 'flex-row-reverse' : ''
                      }`}>
                        {/* Avatar */}
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          message.type === 'user'
                            ? 'bg-blue-100 dark:bg-blue-900/20'
                            : message.type === 'ai'
                            ? 'bg-purple-100 dark:bg-purple-900/20'
                            : 'bg-amber-100 dark:bg-amber-900/20'
                        }`}>
                          {message.type === 'user' ? (
                            <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          ) : message.type === 'ai' ? (
                            <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          )}
                        </div>
                        
                        {/* Message Bubble */}
                        <div className="relative group">
                          <div className={`px-4 py-3 rounded-lg shadow-sm ${
                            message.type === 'user'
                              ? 'bg-blue-600 text-white'
                              : message.type === 'ai'
                              ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                              : 'bg-amber-100 dark:bg-amber-900/20 text-amber-900 dark:text-amber-100'
                          }`}>
                            <div className="text-sm leading-relaxed whitespace-pre-wrap">
                              {message.content}
                            </div>
                            <div className={`flex items-center justify-between mt-2 pt-2 border-t ${
                              message.type === 'user' 
                                ? 'text-blue-100 border-blue-500/20' 
                                : message.type === 'ai'
                                ? 'text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-600'
                                : 'text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-700'
                            }`}>
                              <span className="text-xs font-medium">
                                {message.type === 'user' ? 'You' : message.type === 'ai' ? 'AI' : 'System'}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-xs">
                                  {message.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </span>
                                {/* Copy button */}
                                {hoveredMessageId === message.id && (
                                  <button
                                    onClick={() => copyMessageContent(message.id, message.content)}
                                    className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                                    title="Copy"
                                  >
                                    {copiedMessageId === message.id ? (
                                      <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                      </svg>
                                    ) : (
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                      </svg>
                                    )}
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Typing Indicator */}
                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="flex items-start gap-3 max-w-2xl">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-purple-100 dark:bg-purple-900/20">
                          <svg className="w-4 h-4 text-purple-600 dark:text-purple-400 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div className="px-4 py-3 rounded-lg shadow-sm bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white">
                          <div className="flex items-center gap-2">
                            <div className="flex gap-1">
                              <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce"></div>
                              <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                              <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                            </div>
                            <span className="text-xs text-gray-500 dark:text-gray-400">AI is thinking...</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Empty state */}
                  {messages.length === 1 && (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        AI Assistant Ready!
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 max-w-sm mx-auto">
                        Upload documents and start chatting with your AI assistant
                      </p>
                      <div className="flex items-center justify-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                        <div className="flex items-center gap-1">
                          <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                            <svg className="w-3 h-3 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                          </div>
                          <span>Upload</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-6 h-6 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                            <svg className="w-3 h-3 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                          </div>
                          <span>Ask</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-6 h-6 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                            <svg className="w-3 h-3 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                          </div>
                          <span>Learn</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Input Area */}
              <div className="border-t border-gray-200 dark:border-gray-700 p-6 bg-white dark:bg-gray-800">
                <div className="flex gap-3 items-end">
                  <div className="flex-1">
                    <input
                      ref={inputRef}
                      type="text"
                      value={currentQuestion}
                      onChange={(e) => setCurrentQuestion(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder={
                        uploadedFiles.length === 0
                          ? "Upload documents first to start asking questions..."
                          : "Ask anything about your documents... Try: 'Summarize the main points' or 'What are the key findings?'"
                      }
                      disabled={isAsking || uploadedFiles.length === 0}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg 
                        focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
                        bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                        disabled:opacity-50 disabled:cursor-not-allowed
                        placeholder:text-gray-400 dark:placeholder:text-gray-500
                        transition-all duration-200"
                    />
                  </div>
                  <button
                    onClick={handleAskQuestion}
                    disabled={isAsking || !currentQuestion.trim() || uploadedFiles.length === 0}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 
                      text-white rounded-lg font-medium transition-colors duration-200
                      disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isAsking ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                        <span>Send</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

            </Card>
          </div>

        </div>
      </div>
    </div>
  );
};

export default NotaBuddyPage;