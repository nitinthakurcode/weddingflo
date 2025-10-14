'use client';

import { useState } from 'react';
import { CreativeFile } from '@/types/creative';
import { Button } from '@/components/ui/button';
import { X, Download, FileText, Image, Video, File } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileGalleryProps {
  files: CreativeFile[];
  onRemove?: (fileId: string) => void;
  readonly?: boolean;
}

export function FileGallery({ files, onRemove, readonly = false }: FileGalleryProps) {
  const [selectedFile, setSelectedFile] = useState<CreativeFile | null>(null);

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return Image;
    if (mimeType.startsWith('video/')) return Video;
    if (mimeType.includes('pdf')) return FileText;
    return File;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleDownload = async (file: CreativeFile) => {
    if (!file.url) return;

    try {
      const response = await fetch(file.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to download file:', error);
    }
  };

  if (files.length === 0) {
    return (
      <div className="text-center py-8 border-2 border-dashed rounded-lg">
        <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">No files uploaded yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {files.map((file) => {
          const FileIcon = getFileIcon(file.type);
          const isImage = file.type.startsWith('image/');

          return (
            <div
              key={file.id}
              className={cn(
                'relative group border rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer',
                selectedFile?.id === file.id && 'ring-2 ring-primary'
              )}
              onClick={() => setSelectedFile(file)}
            >
              {/* Preview or Icon */}
              <div className="aspect-square bg-muted flex items-center justify-center">
                {isImage && file.url ? (
                  <img
                    src={file.url}
                    alt={file.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <FileIcon className="h-12 w-12 text-muted-foreground" />
                )}
              </div>

              {/* File Info */}
              <div className="p-2 bg-background">
                <p className="text-xs font-medium truncate" title={file.name}>
                  {file.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(file.size)}
                </p>
              </div>

              {/* Actions */}
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {file.url && (
                  <Button
                    size="icon"
                    variant="secondary"
                    className="h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(file);
                    }}
                  >
                    <Download className="h-3 w-3" />
                  </Button>
                )}
                {!readonly && onRemove && (
                  <Button
                    size="icon"
                    variant="destructive"
                    className="h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(file.id);
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>

              {/* Version Badge */}
              {file.version > 1 && (
                <div className="absolute bottom-12 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
                  v{file.version}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Selected File Preview Modal */}
      {selectedFile && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedFile(null)}
        >
          <div className="relative max-w-4xl w-full max-h-[90vh]">
            <Button
              size="icon"
              variant="outline"
              className="absolute top-4 right-4 z-10"
              onClick={() => setSelectedFile(null)}
            >
              <X className="h-4 w-4" />
            </Button>

            {selectedFile.type.startsWith('image/') && selectedFile.url ? (
              <img
                src={selectedFile.url}
                alt={selectedFile.name}
                className="w-full h-full object-contain rounded-lg"
              />
            ) : (
              <div className="bg-background rounded-lg p-8 text-center">
                <FileText className="mx-auto h-24 w-24 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">{selectedFile.name}</p>
                <p className="text-sm text-muted-foreground mt-2">
                  {formatFileSize(selectedFile.size)}
                </p>
                {selectedFile.url && (
                  <Button
                    className="mt-4"
                    onClick={() => handleDownload(selectedFile)}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
