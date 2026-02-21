import { useState, useRef } from 'react';
import { ImagePlus, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ImageUploaderProps {
  images: File[];
  onImagesChange: (images: File[]) => void;
  maxImages?: number;
}

export function ImageUploader({
  images,
  onImagesChange,
  maxImages = 5,
}: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      addFiles(Array.from(files));
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const addFiles = (newFiles: File[]) => {
    // Filter only images
    const imageFiles = newFiles.filter(file => file.type.startsWith('image/'));
    
    // Limit to max images
    const remaining = maxImages - images.length;
    const filesToAdd = imageFiles.slice(0, remaining);
    
    if (filesToAdd.length > 0) {
      onImagesChange([...images, ...filesToAdd]);
    }
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    onImagesChange(newImages);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files) {
      addFiles(Array.from(files));
    }
  };

  const canAddMore = images.length < maxImages;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <ImagePlus className="h-4 w-4" />
        <span>Captures d'écran (optionnel, max {maxImages})</span>
      </div>

      {/* Image previews */}
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map((file, index) => (
            <div
              key={index}
              className="relative group w-16 h-16 rounded-lg overflow-hidden border border-amber-500/30"
            >
              <img
                src={URL.createObjectURL(file)}
                alt={`Capture ${index + 1}`}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
              >
                <X className="h-4 w-4 text-white" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload area */}
      {canAddMore && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer",
            isDragging
              ? "border-amber-500 bg-amber-500/10"
              : "border-amber-500/30 hover:border-amber-500/50 hover:bg-amber-500/5"
          )}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileChange}
            className="hidden"
          />
          <ImagePlus className="h-6 w-6 mx-auto mb-2 text-amber-500/60" />
          <p className="text-xs text-muted-foreground">
            Cliquez ou glissez des images ici
          </p>
        </div>
      )}
    </div>
  );
}
