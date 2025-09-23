import pdfParse from 'pdf-parse';
import * as mammoth from 'mammoth';

/**
 * Extract text from different file types
 */
export async function extractTextFromFile(buffer: Buffer, mimetype: string): Promise<string> {
    try {
        switch (mimetype) {
            case 'text/plain':
                return buffer.toString('utf-8');
            
            case 'application/pdf':
                const pdfData = await pdfParse(buffer);
                return pdfData.text;
            
            case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
                const docxResult = await mammoth.extractRawText({ buffer });
                return docxResult.value;
            
            default:
                throw new Error(`Unsupported file type: ${mimetype}`);
        }
    } catch (error) {
        throw new Error(`Failed to extract text: ${error.message}`);
    }
}

/**
 * Split text into chunks of approximately targetWords
 */
export function chunkText(text: string, targetWords: number = 500): string[] {
    // If text is short enough, return as single chunk
    const wordCount = text.trim().split(/\s+/).length;
    if (wordCount <= targetWords) {
        return text.trim().length > 50 ? [text.trim()] : [];
    }

    // Split by sentences first, then by paragraphs if no sentences
    let sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    // If no sentence-ending punctuation found, split by paragraphs/newlines
    if (sentences.length <= 1) {
        sentences = text.split(/\n+/).filter(s => s.trim().length > 0);
    }
    
    // If still no good splits, split by word count
    if (sentences.length <= 1) {
        const words = text.trim().split(/\s+/);
        sentences = [];
        for (let i = 0; i < words.length; i += targetWords) {
            sentences.push(words.slice(i, i + targetWords).join(' '));
        }
    }

    const chunks: string[] = [];
    let currentChunk = '';
    let currentWordCount = 0;

    for (const sentence of sentences) {
        const sentenceWords = sentence.trim().split(/\s+/).length;
        
        if (currentWordCount + sentenceWords > targetWords && currentChunk.trim()) {
            chunks.push(currentChunk.trim());
            currentChunk = sentence.trim();
            currentWordCount = sentenceWords;
        } else {
            currentChunk += (currentChunk ? ' ' : '') + sentence.trim();
            currentWordCount += sentenceWords;
        }
    }
    
    if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
    }
    
    return chunks.filter(chunk => chunk.length > 50); // Filter out very small chunks
}

/**
 * Clean and normalize text
 */
export function cleanText(text: string): string {
    return text
        .replace(/\s+/g, ' ')           // Multiple spaces to single space
        .replace(/\n\s*\n/g, '\n')     // Multiple newlines to single newline
        .trim();
}