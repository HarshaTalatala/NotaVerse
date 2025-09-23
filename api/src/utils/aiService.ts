// Note: Install @google/generative-ai package first: npm install @google/generative-ai
import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Google Gemini AI service for text processing
 */
class GeminiService {
    private genAI: GoogleGenerativeAI;
    private model: any;

    constructor() {
        // API key will be set via Azure Function Application Settings
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error('GEMINI_API_KEY environment variable is required');
        }
        
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
    }

    /**
     * Generate a concise summary of the given text chunk
     */
    async generateSummary(text: string): Promise<string> {
        try {
            const prompt = `Please provide a concise but comprehensive summary of the following text. Focus on key concepts, main ideas, and important details that would be useful for answering questions later:

${text}

Summary:`;

            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            return response.text().trim();
        } catch (error) {
            console.error('Error generating summary:', error);
            throw new Error(`Failed to generate summary: ${error.message}`);
        }
    }

    /**
     * Generate an answer based on context and question
     */
    async generateAnswer(question: string, relevantSummaries: string[]): Promise<string> {
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
            console.error('Error generating answer:', error);
            throw new Error(`Failed to generate answer: ${error.message}`);
        }
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
}

export const geminiService = new GeminiService();