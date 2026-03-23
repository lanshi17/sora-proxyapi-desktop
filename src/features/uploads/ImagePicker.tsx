import { open } from '@tauri-apps/plugin-dialog';
import { convertFileSrc, isTauri } from '@tauri-apps/api/core';
import { ChangeEvent, useRef } from 'react';
import { ImagePreview } from './image-preview';

interface ImagePickerProps {
  onImagesSelected: (images: ImagePreview[]) => void;
  selectedImages?: ImagePreview[];
}

export function ImagePicker({ onImagesSelected, selectedImages = [] }: ImagePickerProps) {
  const browserInputRef = useRef<HTMLInputElement | null>(null);

  const createBrowserPreview = (file: File): ImagePreview => ({
    id: crypto.randomUUID(),
    path: file.name,
    name: file.name,
    previewUrl: URL.createObjectURL(file),
    file
  });


  const handleBrowserSelection = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);

    if (files.length === 0) return;

    const newFiles = files.map(createBrowserPreview);
    onImagesSelected([...selectedImages, ...newFiles]);
    event.target.value = '';
  };

  const handleOpenDialog = async () => {
    if (!isTauri()) {
      browserInputRef.current?.click();
      return;
    }

    try {
      const selected = await open({
        multiple: true,
        filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif'] }]
      });

      if (!selected) return;

      const paths = Array.isArray(selected) ? selected : [selected];
      
      const newFiles = paths.map((path) => {
        const name = path.split(/[/\\]/).pop() || 'unknown';
        return {
          id: crypto.randomUUID(),
          path,
          name,
          previewUrl: convertFileSrc(path),
        };
      });

      onImagesSelected([...selectedImages, ...newFiles]);
    } catch (error) {
      console.error('Error selecting images:', error);
    }
  };

  const removeImage = (idToRemove: string) => {
    onImagesSelected(selectedImages.filter(img => img.id !== idToRemove));
  };

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 p-5">
      <div className="flex flex-col gap-3">
        <input
          ref={browserInputRef}
          data-testid="browser-image-input"
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleBrowserSelection}
        />
        <button 
          type="button"
          onClick={handleOpenDialog}
          className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700"
        >
          Add Reference Images
        </button>
        <p className="text-sm text-slate-500">PNG, JPG, WEBP, or GIF files work best as visual references.</p>
      </div>

      {selectedImages.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedImages.map((image) => (
            <div key={image.id} className="relative group overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm" style={{ width: '80px', height: '80px' }}>
              <img 
                src={image.previewUrl} 
                alt={image.name} 
                className="w-full h-full object-contain"
              />
              <button
                type="button"
                onClick={() => removeImage(image.id)}
                aria-label={`Remove ${image.name}`}
                className="absolute top-1 right-1 bg-red-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs opacity-80 hover:opacity-100"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
