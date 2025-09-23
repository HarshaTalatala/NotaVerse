/**
 * In-memory storage for document summaries
 * Note: In production, you'd use a proper database like Azure Cosmos DB
 */

export interface DocumentSummary {
    id: string;
    filename: string;
    uploadedAt: Date;
    originalText: string;
    content: string; // The AI-generated summary
    chunkIndex: number;
    totalChunks: number;
}

class InMemoryStorage {
    private summaries: Map<string, DocumentSummary> = new Map();
    private documentCounts: Map<string, number> = new Map();

    /**
     * Store a document summary
     */
    storeSummary(summary: DocumentSummary): void {
        this.summaries.set(summary.id, summary);
        
        // Update document chunk count
        const baseFilename = summary.filename;
        const currentCount = this.documentCounts.get(baseFilename) || 0;
        this.documentCounts.set(baseFilename, Math.max(currentCount, summary.totalChunks));
    }

    /**
     * Get all summaries
     */
    getAllSummaries(): DocumentSummary[] {
        return Array.from(this.summaries.values());
    }

    /**
     * Get summaries by filename
     */
    getSummariesByFilename(filename: string): DocumentSummary[] {
        return Array.from(this.summaries.values())
            .filter(summary => summary.filename === filename)
            .sort((a, b) => a.chunkIndex - b.chunkIndex);
    }

    /**
     * Check if document is completely processed
     */
    isDocumentComplete(filename: string): boolean {
        const expectedChunks = this.documentCounts.get(filename) || 0;
        const actualChunks = this.getSummariesByFilename(filename).length;
        return expectedChunks > 0 && actualChunks === expectedChunks;
    }

    /**
     * Get storage statistics
     */
    getStats(): { totalSummaries: number; totalDocuments: number; storageSize: string } {
        const totalSummaries = this.summaries.size;
        const totalDocuments = this.documentCounts.size;
        
        // Estimate storage size
        let totalSize = 0;
        this.summaries.forEach(summary => {
            totalSize += JSON.stringify(summary).length;
        });
        
        const storageSizeKB = Math.round(totalSize / 1024 * 100) / 100;
        
        return {
            totalSummaries,
            totalDocuments,
            storageSize: `${storageSizeKB} KB`
        };
    }

    /**
     * Clear all stored data
     */
    clear(): void {
        this.summaries.clear();
        this.documentCounts.clear();
    }

    /**
     * Generate a unique ID for a summary
     */
    generateSummaryId(filename: string, chunkIndex: number): string {
        return `${filename}_chunk_${chunkIndex}_${Date.now()}`;
    }
}

// Export singleton instance
export const storage = new InMemoryStorage();