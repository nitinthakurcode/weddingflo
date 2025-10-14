'use client';

import { useCallback, useState } from 'react';
import { Control, FieldPath, FieldValues, useController } from 'react-hook-form';
import { Upload, X, File } from 'lucide-react';
import {
  FormControl,
  FormDescription,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { FileInputConstraints } from '@/types/forms';

export interface FormFileUploadProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>;
  name: FieldPath<TFieldValues>;
  label?: string;
  description?: string;
  required?: boolean;
  disabled?: boolean;
  constraints?: FileInputConstraints;
  onUpload?: (files: File[]) => Promise<string[]>; // Returns URLs
  className?: string;
}

export function FormFileUpload<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  description,
  required,
  disabled,
  constraints,
  onUpload,
  className,
}: FormFileUploadProps<TFieldValues>) {
  const {
    field,
    fieldState: { error },
  } = useController({
    name,
    control,
  });

  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ name: string; url: string }>>([]);

  const validateFiles = (files: File[]): string | null => {
    if (constraints?.maxFiles && files.length > constraints.maxFiles) {
      return `Maximum ${constraints.maxFiles} files allowed`;
    }

    if (constraints?.minFiles && files.length < constraints.minFiles) {
      return `Minimum ${constraints.minFiles} files required`;
    }

    for (const file of files) {
      if (constraints?.maxSize && file.size > constraints.maxSize) {
        return `File ${file.name} exceeds maximum size of ${constraints.maxSize / 1024 / 1024}MB`;
      }

      if (constraints?.accept) {
        const acceptedTypes = constraints.accept.split(',').map((t) => t.trim());
        const fileType = file.type;
        const fileExtension = `.${file.name.split('.').pop()}`;

        const isAccepted = acceptedTypes.some((type) => {
          if (type.startsWith('.')) {
            return fileExtension === type;
          }
          return fileType.match(new RegExp(type.replace('*', '.*')));
        });

        if (!isAccepted) {
          return `File ${file.name} type not accepted`;
        }
      }
    }

    return null;
  };

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;

      const fileArray = Array.from(files);
      const validationError = validateFiles(fileArray);

      if (validationError) {
        // You might want to show this error via toast
        console.error(validationError);
        return;
      }

      if (onUpload) {
        setUploading(true);
        try {
          const urls = await onUpload(fileArray);
          const newFiles = fileArray.map((file, index) => ({
            name: file.name,
            url: urls[index],
          }));
          setUploadedFiles((prev) => [...prev, ...newFiles]);
          field.onChange([...uploadedFiles.map((f) => f.url), ...urls]);
        } catch (error) {
          console.error('Upload failed:', error);
        } finally {
          setUploading(false);
        }
      }
    },
    [field, onUpload, uploadedFiles, validateFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFiles(e.target.files);
    },
    [handleFiles]
  );

  const removeFile = useCallback(
    (index: number) => {
      const newFiles = uploadedFiles.filter((_, i) => i !== index);
      setUploadedFiles(newFiles);
      field.onChange(newFiles.map((f) => f.url));
    },
    [uploadedFiles, field]
  );

  return (
    <FormItem className={cn(className)}>
      {label && (
        <FormLabel>
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </FormLabel>
      )}
      <FormControl>
        <div
          className={cn(
            'border-2 border-dashed rounded-lg p-6 transition-colors',
            isDragging && 'border-primary bg-primary/5',
            disabled && 'opacity-50 cursor-not-allowed',
            error && 'border-destructive'
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center justify-center gap-2 text-center">
            <Upload className="h-8 w-8 text-muted-foreground" />
            <div className="text-sm text-muted-foreground">
              Drag & drop files here, or click to select
            </div>
            <input
              type="file"
              className="hidden"
              id={`file-upload-${name}`}
              onChange={handleFileInput}
              disabled={disabled || uploading}
              accept={constraints?.accept}
              multiple={constraints?.maxFiles !== 1}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled || uploading}
              onClick={() => document.getElementById(`file-upload-${name}`)?.click()}
            >
              {uploading ? 'Uploading...' : 'Select Files'}
            </Button>
            {constraints && (
              <div className="text-xs text-muted-foreground">
                {constraints.accept && <div>Accepted: {constraints.accept}</div>}
                {constraints.maxSize && (
                  <div>Max size: {constraints.maxSize / 1024 / 1024}MB</div>
                )}
                {constraints.maxFiles && <div>Max files: {constraints.maxFiles}</div>}
              </div>
            )}
          </div>

          {uploadedFiles.length > 0 && (
            <div className="mt-4 space-y-2">
              {uploadedFiles.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-muted rounded-md"
                >
                  <div className="flex items-center gap-2">
                    <File className="h-4 w-4" />
                    <span className="text-sm">{file.name}</span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(index)}
                    disabled={disabled}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </FormControl>
      {description && <FormDescription id={`${name}-description`}>{description}</FormDescription>}
      <FormMessage id={`${name}-error`} />
    </FormItem>
  );
}
