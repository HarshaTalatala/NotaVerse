// Note: Install @google/generative-ai package first: npm install @google/generative-ai
import { GoogleGenerativeAI } from '@google/generative-ai';

// Load environment variables from .env file in development
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

/**
 * Google Gemini AI service for text processing
 */
class GeminiService {
    private genAI: GoogleGenerativeAI | null = null;
    private model: any = null;
    private isConfigured: boolean = false;

    constructor() {
        // API key will be set via Azure Function Application Settings
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey || apiKey === 'your_google_gemini_api_key_here') {
            console.warn('GEMINI_API_KEY is not configured. Using fallback responses.');
            this.isConfigured = false;
        } else {
            try {
                this.genAI = new GoogleGenerativeAI(apiKey);
                this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });
                this.isConfigured = true;
                console.log('Gemini AI service initialized successfully');
            } catch (error) {
                console.error('Failed to initialize Gemini AI service:', error);
                this.isConfigured = false;
            }
        }
    }

    /**
     * Generate a concise summary of the given text chunk
     */
    async generateSummary(text: string): Promise<string> {
        if (!this.isConfigured || !this.model) {
            // Fallback summary generation
            return this.generateFallbackSummary(text);
        }

        try {
            const prompt = `Please provide a concise but comprehensive summary of the following text. Focus on key concepts, main ideas, and important details that would be useful for answering questions later:

${text}

Summary:`;

            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            return response.text().trim();
        } catch (error) {
            console.error('Error generating summary with Gemini:', error);
            console.log('Falling back to basic summary generation');
            return this.generateFallbackSummary(text);
        }
    }

    /**
     * Generate a fallback summary when AI is not available
     */
    private generateFallbackSummary(text: string): string {
        // Extract first few sentences and key information
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
        const firstSentences = sentences.slice(0, 3).join('. ').trim();
        
        // Extract what looks like headings or important terms (capitalized words/phrases)
        const importantTerms = text.match(/[A-Z][A-Za-z\s]{2,20}(?=[.!?:]|$)/g) || [];
        const uniqueTerms = [...new Set(importantTerms)].slice(0, 5);
        
        let summary = firstSentences;
        if (uniqueTerms.length > 0) {
            summary += `\n\nKey topics mentioned: ${uniqueTerms.join(', ')}.`;
        }
        
        summary += `\n\n[Note: This is a basic summary. Configure GEMINI_API_KEY for AI-powered analysis.]`;
        
        return summary;
    }

    /**
     * Generate an answer based on context and question
     */
    async generateAnswer(question: string, relevantSummaries: string[]): Promise<string> {
        if (!this.isConfigured || !this.model) {
            // Fallback answer generation
            return this.generateFallbackAnswer(question, relevantSummaries);
        }

        try {
            const context = relevantSummaries.join('\n\n---\n\n');
            
            const prompt = `Based on the following context from uploaded documents, please answer the question. If the context doesn't contain enough information to answer the question, please say so clearly.

Context:
${context}

Question: ${question}

Answer:`;

            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            return response.text().trim();
        } catch (error) {
            console.error('Error generating answer with Gemini:', error);
            console.log('Falling back to basic answer generation');
            return this.generateFallbackAnswer(question, relevantSummaries);
        }
    }

    /**
     * Generate a fallback answer when AI is not available
     */
    private generateFallbackAnswer(question: string, relevantSummaries: string[]): string {
        const context = relevantSummaries.join('\n\n');
        const questionLower = question.toLowerCase();
        
        // Try to provide relevant excerpts based on question keywords
        const questionWords = questionLower.split(/\s+/).filter(word => word.length > 3);
        let relevantParts: string[] = [];
        
        // Look for relevant parts in summaries
        relevantSummaries.forEach(summary => {
            const summaryLower = summary.toLowerCase();
            questionWords.forEach(word => {
                if (summaryLower.includes(word)) {
                    // Extract sentences containing the keyword
                    const sentences = summary.split(/[.!?]+/);
                    sentences.forEach(sentence => {
                        if (sentence.toLowerCase().includes(word) && sentence.trim().length > 20) {
                            relevantParts.push(sentence.trim());
                        }
                    });
                }
            });
        });
        
        let answer = '';
        
        if (relevantParts.length > 0) {
            const uniqueParts = [...new Set(relevantParts)].slice(0, 3);
            answer = `Based on the uploaded documents, here's what I found:\n\n`;
            uniqueParts.forEach((part, index) => {
                answer += `${index + 1}. ${part}.\n\n`;
            });
        } else {
            answer = `I found some information in your documents that might be related to "${question}", but I cannot provide a detailed analysis without AI capabilities.\n\nThe documents contain:\n${context.substring(0, 300)}...\n\n`;
        }
        
        answer += `\n[Note: For detailed AI analysis, please configure the GEMINI_API_KEY environment variable.]`;
        
        return answer;
    }

    /**
     * Search for relevant summaries based on question
     */
    searchRelevantSummaries(question: string, summaries: Array<{id: string, content: string, originalText: string}>): Array<{id: string, content: string, originalText: string}> {
        const questionWords = question.toLowerCase().split(/\s+/).filter(word => word.length > 3);
        
        const scoredSummaries = summaries.map(summary => {
            const summaryText = (summary.content + ' ' + summary.originalText).toLowerCase();
            let score = 0;
            
            questionWords.forEach(word => {
                const wordCount = (summaryText.match(new RegExp(word, 'g')) || []).length;
                score += wordCount;
            });
            
            return { ...summary, score };
        });
        
        // Return top 5 most relevant summaries
        return scoredSummaries
            .sort((a, b) => b.score - a.score)
            .slice(0, 5)
            .filter(s => s.score > 0);
    }

    /**
     * Check if the AI service is properly configured
     */
    isAIConfigured(): boolean {
        return this.isConfigured;
    }

    /**
     * Get configuration status message
     */
    getConfigurationStatus(): string {
        if (this.isConfigured) {
            return 'Gemini AI is configured and ready';
        } else {
            return 'AI service not configured - using fallback responses. Set GEMINI_API_KEY to enable full AI capabilities.';
        }
    }
}

export const geminiService = new GeminiService();