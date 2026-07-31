"use client";

import { useState, useRef, useCallback } from 'react';
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { uploadToImgBB } from '@/lib/image-upload';
import toast from 'react-hot-toast';

interface ImageUploaderProps {
  value: string;
  onChange: (url: string) => void;
  label: string;
  aspectRatio?: 'square' | 'landscape' | 'auto';
  maxSize?: number; // in MB
  className?: string;
}

export function ImageUploader({
  value,
  onChange,
  label,
  aspectRatio = 'auto',
  maxSize = 10,
  className = ''
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    // Validate
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    if (file.size > maxSize * 1024 * 1024) {
      toast.error(`Image must be less than ${maxSize}MB`);
      return;
    }

    try {
      setUploading(true);
      const result = await uploadToImgBB(file);
      
      if (result.success && result.url) {
        onChange(result.url);
        toast.success('Image uploaded successfully');
      } else {
        toast.error(result.error || 'Upload failed');
      }
    } catch (error: any) {
      toast.error(error.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  };

  const aspectClass = {
    square: 'aspect-square',
    landscape: 'aspect-[16/9]',
    auto: 'aspect-auto'
  }[aspectRatio];

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</label>
      
      <div
        onClick={handleClick}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`
          relative cursor-pointer rounded-2xl border-2 border-dashed transition-all overflow-hidden
          ${dragActive ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-red-300'}
          ${uploading ? 'pointer-events-none' : ''}
          ${aspectRatio === 'square' ? 'h-48 w-48' : aspectRatio === 'landscape' ? 'h-40 w-full' : 'min-h-[160px] w-full'}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleChange}
          disabled={uploading}
        />

        {value ? (
          // Preview
          <div className="relative w-full h-full group">
            <img
              src={value}
              alt={label}
              className="w-full h-full object-cover"
            />
            {/* Overlay */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-all flex items-center justify-center">
              <div className="opacity-0 group-hover:opacity-100 transition-all flex gap-2">
                <button
                  type="button"
                  onClick={handleClick}
                  className="px-4 py-2 bg-white text-gray-900 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-gray-100"
                >
                  <Upload className="w-4 h-4" /> Replace
                </button>
                <button
                  type="button"
                  onClick={handleRemove}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-red-700"
                >
                  <X className="w-4 h-4" /> Remove
                </button>
              </div>
            </div>
          </div>
        ) : (
          // Upload Area
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            {uploading ? (
              <>
                <Loader2 className="w-10 h-10 text-red-500 animate-spin mb-3" />
                <p className="text-sm font-bold text-gray-900">Uploading...</p>
                <p className="text-xs text-gray-500 mt-1">Please wait</p>
              </>
            ) : (
              <>
                <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mb-3">
                  <ImageIcon className="w-7 h-7 text-red-500" />
                </div>
                <p className="text-sm font-bold text-gray-900">
                  Drop image here or click to upload
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  PNG, JPG up to {maxSize}MB
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
