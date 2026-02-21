import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileImage,
  ImageIcon,
  ZoomIn,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface DeliveryItem {
  id: string;
  versionNumber: number;
  deliveryType: string;
  externalLink: string | null;
  filePath: string | null;
  fileUrl: string | null;
  notes: string | null;
  submittedAt: string;
}

interface DesignGallerySectionProps {
  label: string;
  deliveries: DeliveryItem[];
  sectionNumber: number;
  onFullscreen: (url: string) => void;
  showFeedback?: boolean;
}

function SingleDesignCard({ delivery, index, onFullscreen }: {
  delivery: DeliveryItem;
  index: number;
  onFullscreen: (url: string) => void;
}) {
  const labelMatch = delivery.notes?.match(/^\[(.+?)\]\s*/);
  const displayLabel = labelMatch ? labelMatch[1] : `Design`;
  const remainingNotes = labelMatch ? delivery.notes!.slice(labelMatch[0].length).trim() : delivery.notes;
  const itemMatch = displayLabel.match(/#(\d+)/);
  const itemNumber = itemMatch ? itemMatch[1] : String(index + 1);

  return (
    <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs">
          {itemNumber}
        </div>
        <span className="text-sm font-medium text-gray-700">{displayLabel}</span>
      </div>

      {delivery.deliveryType === 'file' && delivery.fileUrl ? (
        <div className="relative group rounded-xl overflow-hidden bg-gradient-to-br from-white via-emerald-100 to-emerald-300 p-1 mb-3">
          <img
            src={delivery.fileUrl}
            alt={displayLabel}
            className="w-full rounded-lg object-contain cursor-pointer transition-transform hover:scale-[1.02] max-h-[400px]"
            onClick={() => onFullscreen(delivery.fileUrl!)}
          />
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
            onClick={() => onFullscreen(delivery.fileUrl!)}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
      ) : delivery.deliveryType === 'link' && delivery.externalLink ? (
        <div className="aspect-video bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl flex flex-col items-center justify-center gap-3 mb-3">
          <FileImage className="h-12 w-12 text-purple-400" />
          <Button
            size="sm"
            onClick={() => window.open(delivery.externalLink!, '_blank')}
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            Voir le design
          </Button>
        </div>
      ) : null}

      <div className="text-xs text-gray-400">
        Livré le {format(new Date(delivery.submittedAt), 'dd MMM yyyy', { locale: fr })}
      </div>

      {remainingNotes && (
        <div className="mt-2 p-3 bg-emerald-50 rounded-lg border border-emerald-100">
          <p className="text-gray-700 text-xs">{remainingNotes}</p>
        </div>
      )}
    </div>
  );
}

function CarouselViewer({ deliveries, onFullscreen }: {
  deliveries: DeliveryItem[];
  onFullscreen: (url: string) => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const total = deliveries.length;
  const current = deliveries[currentIndex];

  const goToPrev = () => setCurrentIndex(i => (i - 1 + total) % total);
  const goToNext = () => setCurrentIndex(i => (i + 1) % total);

  if (!current) return null;

  return (
    <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm p-4">
      {/* Carousel image */}
      <div className="relative group">
        {current.deliveryType === 'file' && current.fileUrl ? (
          <div className="relative rounded-xl overflow-hidden bg-gradient-to-br from-white via-emerald-100 to-emerald-300 p-1">
            <img
              src={current.fileUrl}
              alt={`Page ${currentIndex + 1}`}
              className="w-full rounded-lg object-contain cursor-pointer transition-transform hover:scale-[1.01] max-h-[500px]"
              onClick={() => onFullscreen(current.fileUrl!)}
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-3 right-3 bg-black/50 hover:bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
              onClick={() => onFullscreen(current.fileUrl!)}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
        ) : current.deliveryType === 'link' && current.externalLink ? (
          <div className="aspect-video bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl flex flex-col items-center justify-center gap-3">
            <FileImage className="h-12 w-12 text-purple-400" />
            <Button
              size="sm"
              onClick={() => window.open(current.externalLink!, '_blank')}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              Voir le design
            </Button>
          </div>
        ) : null}

        {/* Navigation arrows */}
        {total > 1 && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white h-10 w-10 rounded-full shadow-lg"
              onClick={goToPrev}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white h-10 w-10 rounded-full shadow-lg"
              onClick={goToNext}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </>
        )}
      </div>

      {/* Dots indicator + counter */}
      {total > 1 && (
        <div className="flex flex-col items-center gap-2 mt-4">
          <div className="flex items-center gap-1.5">
            {deliveries.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={cn(
                  "w-2.5 h-2.5 rounded-full transition-all duration-200",
                  idx === currentIndex
                    ? "bg-emerald-500 scale-110"
                    : "bg-gray-300 hover:bg-gray-400"
                )}
              />
            ))}
          </div>
          <span className="text-sm text-gray-500 font-medium">
            Page {currentIndex + 1} / {total}
          </span>
        </div>
      )}

      <div className="text-xs text-gray-400 mt-3">
        Livré le {format(new Date(current.submittedAt), 'dd MMM yyyy', { locale: fr })}
      </div>
    </div>
  );
}

export function DesignGallerySection({ label, deliveries, sectionNumber, onFullscreen, showFeedback }: DesignGallerySectionProps) {
  const isCarousel = label.toLowerCase().includes('carrousel') || label.toLowerCase().includes('carousel');
  const isMultiFile = deliveries.length > 1;

  return (
    <div className="mb-8">
      {/* Section title */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center justify-center w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 font-bold text-sm">
          {sectionNumber}
        </div>
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <ImageIcon className="h-5 w-5 text-emerald-500" />
          {label}
        </h2>
        <Badge variant="outline" className="border-emerald-300 text-emerald-600 bg-emerald-50 text-xs">
          {deliveries.length} {isCarousel && isMultiFile ? 'pages' : `fichier${deliveries.length > 1 ? 's' : ''}`}
        </Badge>
      </div>

      {/* Carousel view for carousel types with multiple files, grid for others */}
      {isCarousel && isMultiFile ? (
        <CarouselViewer deliveries={deliveries} onFullscreen={onFullscreen} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {deliveries.map((d, idx) => (
            <SingleDesignCard
              key={d.id}
              delivery={d}
              index={idx}
              onFullscreen={onFullscreen}
            />
          ))}
        </div>
      )}
    </div>
  );
}
