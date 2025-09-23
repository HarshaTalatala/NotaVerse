import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { geminiService } from '../utils/aiService';
import { storage } from '../utils/storage';

/**
 * Azure Function: Ask questions about uploaded documents
 * POST /api/ask
 * 
 * Input: { "question": "What is the main topic discussed?" }
 * Process: Search relevant summaries → Generate AI answer based on context
 */

export async function askQuestion(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log('Ask endpoint called');
    
    try {
        // Set CORS headers
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Content-Type': 'application/json'
        };

        // Handle preflight OPTIONS request
        if (request.method === 'OPTIONS') {
            return {
                status: 200,
                headers: corsHeaders
            };
        }

        // Parse request body
        let requestBody;
        try {
            const bodyText = await request.text();
            requestBody = JSON.parse(bodyText);
        } catch (error) {
            return {
                status: 400,
                headers: corsHeaders,
                body: JSON.stringify({
                    error: 'Invalid JSON in request body'
                })
            };
        }

        const { question } = requestBody;

        // Validate input
        if (!question || typeof question !== 'string' || question.trim().length === 0) {
            return {
                status: 400,
                headers: corsHeaders,
                body: JSON.stringify({
                    error: 'Question is required and must be a non-empty string'
                })
            };
        }

        const cleanQuestion = question.trim();
        context.log(`Processing question: "${cleanQuestion}"`);

        // Get all stored summaries
        const allSummaries = storage.getAllSummaries();
        
        if (allSummaries.length === 0) {
            return {
                status: 200,
                headers: corsHeaders,
                body: JSON.stringify({
                    success: true,
                    question: cleanQuestion,
                    answer: "I don't have any documents uploaded yet. Please upload some documents first using the /upload endpoint, then I'll be able to answer questions about their content.",
                    context: {
                        documentsFound: 0,
                        summariesSearched: 0,
                        relevantSummaries: 0
                    }
                })
            };
        }

        // Search for relevant summaries
        const relevantSummaries = geminiService.searchRelevantSummaries(cleanQuestion, allSummaries);
        
        context.log(`Found ${relevantSummaries.length} relevant summaries out of ${allSummaries.length} total`);

        if (relevantSummaries.length === 0) {
            return {
                status: 200,
                headers: corsHeaders,
                body: JSON.stringify({
                    success: true,
                    question: cleanQuestion,
                    answer: "I couldn't find any relevant information in the uploaded documents to answer your question. The question might be about topics not covered in the uploaded content.",
                    context: {
                        documentsFound: storage.getStats().totalDocuments,
                        summariesSearched: allSummaries.length,
                        relevantSummaries: 0
                    }
                })
            };
        }

        // Generate answer using AI
        const summaryTexts = relevantSummaries.map(s => s.content);
        let answer: string;
        
        try {
            answer = await geminiService.generateAnswer(cleanQuestion, summaryTexts);
        } catch (error) {
            context.log('Error generating answer:', error);
            return {
                status: 500,
                headers: corsHeaders,
                body: JSON.stringify({
                    success: false,
                    error: 'Failed to generate answer using AI service',
                    details: error.message
                })
            };
        }

        // Prepare context information - cast to full DocumentSummary type to access filename
        const fullSummaries = relevantSummaries as typeof allSummaries;
        const contextInfo = {
            documentsFound: storage.getStats().totalDocuments,
            summariesSearched: allSummaries.length,
            relevantSummaries: relevantSummaries.length,
            sourcesUsed: [...new Set(fullSummaries.map(s => s.filename))] // Unique filenames
        };

        const response = {
            success: true,
            question: cleanQuestion,
            answer: answer,
            context: contextInfo,
            timestamp: new Date().toISOString()
        };

        context.log('Ask processing completed successfully');

        return {
            status: 200,
            headers: corsHeaders,
            body: JSON.stringify(response)
        };

    } catch (error) {
        context.log('Ask endpoint error:', error);
        
        return {
            status: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                success: false,
                error: 'Internal server error while processing question',
                details: error.message
            })
        };
    }
}

// Register the function
app.http('ask', {
    methods: ['POST', 'OPTIONS'],
    authLevel: 'anonymous',
    route: 'ask',
    handler: askQuestion
});