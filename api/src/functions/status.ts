import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { storage } from '../utils/storage';

/**
 * Azure Function: Health check and storage status
 * GET /api/status
 * 
 * Returns: System status and current storage information
 */

export async function getStatus(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log('Status endpoint called');
    
    try {
        // Set CORS headers
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
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

        // Get storage statistics
        const storageStats = storage.getStats();
        const allSummaries = storage.getAllSummaries();

        // System information
        const systemInfo = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            nodeVersion: process.version,
            platform: process.platform,
            uptime: process.uptime(),
            memoryUsage: process.memoryUsage(),
            environment: {
                hasGeminiKey: !!process.env.GEMINI_API_KEY,
                functionsRuntime: process.env.FUNCTIONS_WORKER_RUNTIME || 'unknown'
            }
        };

        // Storage information
        const storageInfo = {
            ...storageStats,
            recentDocuments: allSummaries
                .slice(0, 5)
                .map(summary => ({
                    filename: summary.filename,
                    uploadedAt: summary.uploadedAt,
                    chunkIndex: summary.chunkIndex,
                    totalChunks: summary.totalChunks
                }))
        };

        const response = {
            system: systemInfo,
            storage: storageInfo,
            endpoints: {
                upload: '/api/upload (POST)',
                ask: '/api/ask (POST)',
                status: '/api/status (GET)'
            }
        };

        return {
            status: 200,
            headers: corsHeaders,
            body: JSON.stringify(response, null, 2)
        };

    } catch (error) {
        context.log('Status endpoint error:', error);
        
        return {
            status: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                status: 'error',
                error: 'Internal server error',
                details: error.message,
                timestamp: new Date().toISOString()
            })
        };
    }
}

// Register the function
app.http('status', {
    methods: ['GET', 'OPTIONS'],
    authLevel: 'anonymous',
    route: 'status',
    handler: getStatus
});