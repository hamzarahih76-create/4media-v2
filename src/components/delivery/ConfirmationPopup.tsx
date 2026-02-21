import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Download,
  Loader2,
  PartyPopper,
  Gift,
  Zap,
  AlertTriangle,
  X
} from 'lucide-react';

interface ConfirmationPopupProps {
  open: boolean;
  onClose: () => void;
  isVideoValidated: boolean;
  isDownloading: boolean;
  onDownload: () => void;
}

export function ConfirmationPopup({
  open,
  onClose,
  isVideoValidated,
  isDownloading,
  onDownload,
}: ConfirmationPopupProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent 
        className="bg-slate-900/98 border-emerald-500/30 backdrop-blur-2xl sm:max-w-lg p-0 overflow-hidden"
        // Remove default close button, we'll add our own
      >
        {/* Custom close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-full p-2 bg-white/10 hover:bg-white/20 transition-colors"
          aria-label="Fermer"
        >
          <X className="h-5 w-5 text-white/70" />
        </button>

        {/* Gradient glow effect */}
        <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/30 to-teal-500/30 rounded-3xl blur-xl opacity-50 pointer-events-none" />
        
        <div className="relative p-8 sm:p-10">
          {/* Celebration icons */}
          <div className="flex justify-center gap-4 mb-8">
            <div 
              className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center animate-bounce shadow-lg shadow-emerald-500/30" 
              style={{ animationDelay: '0s' }}
            >
              <PartyPopper className="h-8 w-8 text-white" />
            </div>
            <div 
              className="w-16 h-16 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center animate-bounce shadow-lg shadow-teal-500/30" 
              style={{ animationDelay: '0.2s' }}
            >
              <Gift className="h-8 w-8 text-white" />
            </div>
            <div 
              className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center animate-bounce shadow-lg shadow-emerald-500/30" 
              style={{ animationDelay: '0.4s' }}
            >
              <Zap className="h-8 w-8 text-white" />
            </div>
          </div>

          {/* Title */}
          <DialogHeader className="mb-6">
            <DialogTitle className="text-3xl font-bold text-white text-center">
              Merci pour votre confiance ! 🎉
            </DialogTitle>
          </DialogHeader>

          {/* Message */}
          <p className="text-white/70 text-lg text-center max-w-sm mx-auto mb-8">
            Votre retour a été transmis à notre équipe. Nous vous recontactons très vite !
          </p>

          {/* Download Button - Only active when validated */}
          {isVideoValidated && (
            <div className="flex justify-center mb-6">
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-2xl blur-lg opacity-70 group-hover:opacity-100 transition-opacity duration-300" />
                <Button
                  onClick={onDownload}
                  disabled={isDownloading}
                  className="relative gap-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white px-10 py-7 text-lg font-bold rounded-2xl shadow-xl shadow-emerald-500/40 transition-all duration-300"
                >
                  {isDownloading ? (
                    <>
                      <Loader2 className="h-6 w-6 animate-spin" />
                      Préparation...
                    </>
                  ) : (
                    <>
                      <Download className="h-6 w-6" />
                      Télécharger ma vidéo
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
          
          {/* Download Warning - More prominent for client attention */}
          {isVideoValidated && (
            <div className="bg-gradient-to-r from-red-500/20 to-orange-500/20 border-2 border-red-500/60 rounded-2xl p-5 max-w-md mx-auto shadow-lg shadow-red-500/20">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0 animate-pulse shadow-lg shadow-red-500/50">
                  <AlertTriangle className="h-7 w-7 text-white" />
                </div>
                <div className="text-left flex-1">
                  <h3 className="text-red-400 font-bold text-lg mb-2 flex items-center gap-2">
                    ⚠️ ATTENTION - Action requise
                  </h3>
                  <p className="text-white text-base leading-relaxed">
                    <strong className="text-red-300">Téléchargez votre vidéo maintenant !</strong>
                    <br />
                    <span className="text-white/80">
                      Pour des raisons de stockage, elle sera <strong className="text-red-300">définitivement supprimée</strong> de nos serveurs dans quelques jours.
                    </span>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Close button at the bottom for non-validated videos */}
          {!isVideoValidated && (
            <div className="flex justify-center mt-4">
              <Button
                variant="outline"
                onClick={onClose}
                className="border-white/20 text-white/70 hover:bg-white/10 hover:text-white px-8 py-3 rounded-xl"
              >
                Fermer
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
