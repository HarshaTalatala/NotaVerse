import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { extractTextFromFile, chunkText, cleanText } from '../utils/textExtractor';
import { geminiService } from '../utils/aiService';
import { storage } from '../utils/storage';

/**
 * Azure Function: Upload and process documents
 * POST /api/upload
 * 
 * Accepts: PDF, TXT, DOCX files
 * Process: Extract text → Chunk → Generate AI summaries → Store in memory
 */

export async function uploadDocument(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log('Upload endpoint called');
    
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

        // Check if request has file data
        const contentType = request.headers.get('content-type') || '';
        if (!contentType.includes('multipart/form-data')) {
            return {
                status: 400,
                headers: corsHeaders,
                body: JSON.stringify({
                    error: 'Request must be multipart/form-data with a file upload'
                })
            };
        }

        // Parse the multipart form data
        const formData = await request.formData();
        const file = formData.get('file') as File;
        
        if (!file) {
            return {
                status: 400,
                headers: corsHeaders,
                body: JSON.stringify({
                    error: 'No file provided. Please upload a PDF, TXT, or DOCX file.'
                })
            };
        }

        context.log(`Processing file: ${file.name}, type: ${file.type}, size: ${file.size}`);

        // Convert File to Buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Extract text from the file
        let extractedText: string;
        try {
            extractedText = await extractTextFromFile(buffer, file.type);
            extractedText = cleanText(extractedText);
        } catch (error) {
            context.log('Text extraction failed:', error);
            return {
                status: 400,
                headers: corsHeaders,
                body: JSON.stringify({
                    error: `Failed to extract text from file: ${error.message}`
                })
            };
        }

        if (!extractedText || extractedText.length < 50) {
            return {
                status: 400,
                headers: corsHeaders,
                body: JSON.stringify({
                    error: 'File appears to be empty or contains insufficient text content'
                })
            };
        }

        // Split text into chunks
        const chunks = chunkText(extractedText, 500);
        context.log(`Text split into ${chunks.length} chunks`);

        if (chunks.length === 0) {
            return {
                status: 400,
                headers: corsHeaders,
                body: JSON.stringify({
                    error: 'No valid text chunks could be created from the file'
                })
            };
        }

        // Process each chunk with AI
        const processedChunks = [];
        const errors = [];

        for (let i = 0; i < chunks.length; i++) {
            try {
                context.log(`Processing chunk ${i + 1}/${chunks.length}`);
                
                // Generate AI summary for this chunk
                const summary = await geminiService.generateSummary(chunks[i]);
                
                // Create summary object
                const summaryObj = {
                    id: storage.generateSummaryId(file.name, i),
                    filename: file.name,
                    uploadedAt: new Date(),
                    originalText: chunks[i],
                    content: summary,
                    chunkIndex: i,
                    totalChunks: chunks.length
                };

                // Store in memory
                storage.storeSummary(summaryObj);
                processedChunks.push({
                    chunkIndex: i,
                    wordCount: chunks[i].split(/\s+/).length,
                    summaryLength: summary.length
                });

            } catch (error) {
                context.log(`Error processing chunk ${i}:`, error);
                errors.push(`Chunk ${i}: ${error.message}`);
            }
        }

        // Get storage stats
        const stats = storage.getStats();

        const response = {
            success: true,
            message: 'Document processed successfully',
            data: {
                filename: file.name,
                fileSize: file.size,
                totalChunks: chunks.length,
                processedChunks: processedChunks.length,
                failedChunks: errors.length,
                errors: errors.length > 0 ? errors : undefined,
                processingTime: new Date().toISOString(),
                storageStats: stats
            }
        };

        context.log('Upload processing completed:', response);

        return {
            status: 200,
            headers: corsHeaders,
            body: JSON.stringify(response)
        };

    } catch (error) {
        context.log('Upload endpoint error:', error);
        
        return {
            status: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                success: false,
                error: 'Internal server error during file processing',
                details: error.message
            })
        };
    }
}

// Register the function
app.http('upload', {
    methods: ['POST', 'OPTIONS'],
    authLevel: 'anonymous',
    route: 'upload',
    handler: uploadDocument
});