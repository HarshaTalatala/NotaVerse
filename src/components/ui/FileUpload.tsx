import React, { useState, useRef } from 'react';
import { Button } from './Button';
import { Spinner } from './Spinner';
import { azureBlobService, UploadResult } from '../../services/azureBlobService';

interface FileUploadProps {
  onUploadComplete?: (file: UploadResult) => void;
  onError?: (error: string) => void;
  accept?: string;
  maxSize?: number; // in MB
  folder?: string;
  multiple?: boolean;
  disabled?: boolean;
  className?: string;
  userId?: string; // added to pass real user info
  userName?: string;
  userRole?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onUploadComplete,
  onError,
  accept = '*/*',
  maxSize = 50,
  folder = '',
  multiple = false,
  disabled = false,
  className = '',
  userId,
  userName,
  userRole
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    if (!azureBlobService.isConfigured()) {
      onError?.('Azure Blob Storage is not configured');
      return;
    }

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Validate file size
      if (file.size > maxSize * 1024 * 1024) {
        onError?.(`File "${file.name}" is too large. Maximum size is ${maxSize}MB`);
        continue;
      }

      await uploadFile(file);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadFile = async (file: File) => {
    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Simulate upload progress (Azure SDK doesn't provide real-time progress)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 100);

      const result = await azureBlobService.uploadFile(file, folder, {
        userId,
        userName,
        userRole
      });
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      setTimeout(() => {
        setUploadProgress(0);
        setIsUploading(false);
      }, 500);

      onUploadComplete?.(result);
    } catch (error) {
      setIsUploading(false);
      setUploadProgress(0);
      onError?.(error instanceof Error ? error.message : 'Failed to upload file');
    }
  };

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const files = Array.from(event.dataTransfer.files);
    
    if (!azureBlobService.isConfigured()) {
      onError?.('Azure Blob Storage is not configured');
      return;
    }

    for (const file of files) {
      if (file.size > maxSize * 1024 * 1024) {
        onError?.(`File "${file.name}" is too large. Maximum size is ${maxSize}MB`);
        continue;
      }

      await uploadFile(file);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <div className={`relative ${className}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleFileSelect}
        disabled={disabled || isUploading}
        className="hidden"
      />
      
      <div
        className={`
          border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
          ${isUploading ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600 hover:border-blue-500 hover:bg-gray-50 dark:hover:bg-gray-700/50'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        onClick={() => !disabled && !isUploading && fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        {isUploading ? (
          <div className="space-y-4">
            <Spinner size="lg" />
            <div className="space-y-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Uploading file...
              </p>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-500">
                {uploadProgress}%
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <svg
              className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <div>
              <p className="text-lg font-medium text-gray-900 dark:text-white">
                Drop files here or click to upload
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Maximum file size: {maxSize}MB
              </p>
              {accept !== '*/*' && (
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  Accepted formats: {accept}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
      {isUploading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center rounded-lg bg-black/60 backdrop-blur-sm z-10">
          <div className="w-11/12 max-w-sm bg-white dark:bg-gray-800 rounded-lg p-5 shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center mb-3">
              <Spinner size="sm" />
              <h4 className="ml-2 text-sm font-medium text-gray-800 dark:text-gray-200">Uploading...</h4>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2 overflow-hidden">
              <div className="bg-blue-600 h-2 transition-all" style={{ width: `${uploadProgress}%` }} />
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">{uploadProgress}% • Please keep this window open</p>
            <div className="flex justify-end">
              <button
                type="button"
                disabled
                className="px-3 py-1.5 text-xs rounded-md bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 cursor-not-allowed"
                title="Cancel disabled (single-shot upload)"
              >Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};