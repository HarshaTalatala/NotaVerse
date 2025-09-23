/**
 * NotaBuddy API Service
 * Handles communication with Azure Functions backend
 */

const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://your-function-app.azurewebsites.net/api'  // Replace with your deployed Azure Functions URL
  : 'http://localhost:7071/api';

export interface UploadResponse {
  success: boolean;
  message: string;
  data?: {
    filename: string;
    totalChunks: number;
    processedChunks: number;
    storageStats: {
      totalSummaries: number;
      totalDocuments: number;
      storageSize: string;
    };
  };
  error?: string;
}

export interface AskResponse {
  success: boolean;
  question: string;
  answer: string;
  context?: {
    documentsFound: number;
    relevantSummaries: number;
    sourcesUsed: string[];
  };
  error?: string;
}

export interface StatusResponse {
  system: {
    status: string;
    timestamp: string;
    environment: {
      hasGeminiKey: boolean;
    };
    aiService?: {
      status: string;
      configured: boolean;
    };
  };
  storage: {
    totalSummaries: number;
    totalDocuments: number;
    storageSize: string;
  };
}

export class NotaBuddyService {
  
  /**
   * Upload a document for processing
   */
  static async uploadDocument(file: File): Promise<UploadResponse> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      // Check if backend is using fallback processing
      if (result.message && result.message.includes('Configure GEMINI_API_KEY')) {
        result.message += ' The document has been uploaded, but AI analysis requires proper backend configuration.';
      }

      return result;
    } catch (error) {
      // Fallback to mock service for demo purposes
      console.log('Backend not available, using mock service');
      const mockResult = await this.mockUploadDocument(file);
      
      // Add backend unavailable notice
      mockResult.message = `🔧 Backend unavailable - Using demo mode. ${mockResult.message} In production, this would be processed by the AI backend.`;
      
      return mockResult;
    }
  }

  /**
   * Mock upload document for demo purposes
   */
  static async mockUploadDocument(file: File): Promise<UploadResponse> {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    const supportedTypes = ['.pdf', '.txt', '.docx'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!supportedTypes.includes(fileExtension)) {
      return {
        success: false,
        message: 'Unsupported file type',
        error: `File type ${fileExtension} is not supported. Please upload PDF, TXT, or DOCX files.`
      };
    }

    return {
      success: true,
      message: 'Document uploaded and processed successfully',
      data: {
        filename: file.name,
        totalChunks: Math.floor(Math.random() * 10) + 5,
        processedChunks: Math.floor(Math.random() * 10) + 5,
        storageStats: {
          totalSummaries: Math.floor(Math.random() * 50) + 10,
          totalDocuments: Math.floor(Math.random() * 10) + 1,
          storageSize: `${(Math.random() * 5 + 1).toFixed(2)} MB`
        }
      }
    };
  }

  /**
   * Ask a question about uploaded documents
   */
  static async askQuestion(question: string): Promise<AskResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question }),
      });

      if (!response.ok) {
        throw new Error(`Ask failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      // Check if the backend is using fallback responses
      if (result.answer && result.answer.includes('Configure GEMINI_API_KEY')) {
        // Add a notice about the backend configuration
        result.answer += '\n\n💡 **Note**: The AI backend is not fully configured. For enhanced AI capabilities, the administrator needs to configure the GEMINI_API_KEY.';
      }

      return result;
    } catch (error) {
      // Fallback to mock service for demo purposes
      console.log('Backend not available, using mock AI responses');
      const mockResult = await this.mockAskQuestion(question);
      
      // Add backend unavailable notice
      mockResult.answer = `🔧 **Backend unavailable** - Using demo responses.\n\n${mockResult.answer}\n\n💡 **Note**: The backend server may not be running. In a production environment, you would have full AI-powered document analysis.`;
      
      return mockResult;
    }
  }

  /**
   * Mock AI question answering for demo purposes
   */
  static async mockAskQuestion(question: string): Promise<AskResponse> {
    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 1000));

    const responses = {
      // Generic responses
      'summarize': "Based on the uploaded document, here are the key points:\n\n• The document discusses important concepts and methodologies\n• It contains structured information with clear sections\n• Main themes include analysis, implementation, and best practices\n• The content appears to be well-researched and comprehensive\n• Several actionable insights and recommendations are provided",
      
      'summary': "Here's a comprehensive summary of your document:\n\nThe document presents a structured approach to the topic at hand, covering fundamental concepts, practical applications, and implementation strategies. Key sections include background information, methodology, results, and conclusions. The content demonstrates thorough research and provides valuable insights for readers interested in this subject area.",
      
      'main points': "The main points from your document include:\n\n1. **Introduction & Background** - Sets the foundation for the topic\n2. **Core Concepts** - Explains fundamental principles and theories\n3. **Methodology** - Describes the approach and processes used\n4. **Analysis** - Presents findings and interpretations\n5. **Conclusions** - Summarizes outcomes and implications\n6. **Recommendations** - Suggests next steps or improvements",
      
      'key findings': "The key findings from your document are:\n\n✓ **Primary Discovery**: The research reveals significant insights into the subject matter\n✓ **Supporting Evidence**: Multiple data points support the main conclusions\n✓ **Practical Implications**: The findings have real-world applications\n✓ **Future Directions**: Several areas for continued research are identified\n✓ **Limitations**: Some constraints and boundaries are acknowledged",
      
      'conclusion': "The document concludes with several important takeaways:\n\n• The research objectives have been successfully addressed\n• The methodology proved effective for the intended purpose\n• Results align with initial hypotheses and expectations\n• Recommendations for future work are clearly outlined\n• The study contributes valuable knowledge to the field",
      
      'methodology': "The methodology section outlines:\n\n🔍 **Research Design**: Systematic approach to data collection and analysis\n📊 **Data Sources**: Multiple reliable sources were utilized\n⚙️ **Tools & Techniques**: Appropriate methods for the research questions\n📋 **Process**: Step-by-step procedures for consistency\n✅ **Validation**: Methods to ensure accuracy and reliability",
      
      'recommendations': "Based on the document analysis, the recommendations include:\n\n1. **Immediate Actions**: Steps that can be implemented right away\n2. **Short-term Goals**: Objectives for the next 3-6 months\n3. **Long-term Vision**: Strategic plans for sustained success\n4. **Resource Allocation**: Suggested investments and priorities\n5. **Risk Mitigation**: Strategies to address potential challenges\n6. **Performance Metrics**: Ways to measure success and progress"
    };

    // Find best matching response
    const lowerQuestion = question.toLowerCase();
    let bestMatch = '';
    let response = '';

    for (const [key, value] of Object.entries(responses)) {
      if (lowerQuestion.includes(key)) {
        if (key.length > bestMatch.length) {
          bestMatch = key;
          response = value;
        }
      }
    }

    // Default response if no match found
    if (!response) {
      response = `I've analyzed your document regarding "${question}". Based on the content, I can provide the following insights:\n\n• The document contains relevant information that addresses aspects of your question\n• Key concepts and data points support various interpretations\n• The content suggests several important considerations\n• Further analysis might reveal additional insights\n• Feel free to ask more specific questions about particular sections or topics\n\nWould you like me to focus on any specific aspect of the document?`;
    }

    return {
      success: true,
      question: question,
      answer: response,
      context: {
        documentsFound: 1,
        relevantSummaries: Math.floor(Math.random() * 5) + 3,
        sourcesUsed: ['RD.docx', 'Document Analysis Engine']
      }
    };
  }

  /**
   * Get system status and storage information
   */
  static async getStatus(): Promise<StatusResponse> {
    const response = await fetch(`${API_BASE_URL}/status`);

    if (!response.ok) {
      throw new Error(`Status check failed: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Check if the backend is available
   */
  static async healthCheck(): Promise<boolean> {
    try {
      const status = await this.getStatus();
      return status.system.status === 'healthy';
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }

  /**
   * Get backend and AI configuration status
   */
  static async getBackendStatus(): Promise<{
    backendAvailable: boolean;
    aiConfigured: boolean;
    message: string;
  }> {
    try {
      const status = await this.getStatus();
      
      return {
        backendAvailable: true,
        aiConfigured: status.system?.aiService?.configured || false,
        message: status.system?.aiService?.status || 'Backend connected'
      };
    } catch (error) {
      return {
        backendAvailable: false,
        aiConfigured: false,
        message: 'Backend server is not available. Running in demo mode.'
      };
    }
  }
}