// Notification sound utility using Web Audio API
// Creates a pleasant, clear notification sound

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
}

export function playNotificationSound() {
  try {
    const ctx = getAudioContext();
    
    // Resume context if suspended (browser autoplay policy)
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;

    // Create oscillator for the main tone
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    // Connect nodes
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    // Pleasant notification sound - two-tone chime
    oscillator.type = 'sine';
    
    // First tone (higher)
    oscillator.frequency.setValueAtTime(880, now); // A5
    oscillator.frequency.setValueAtTime(1046.5, now + 0.1); // C6

    // Smooth envelope for a clear, pleasant sound
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.3, now + 0.02);
    gainNode.gain.linearRampToValueAtTime(0.2, now + 0.1);
    gainNode.gain.linearRampToValueAtTime(0.25, now + 0.12);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    // Start and stop
    oscillator.start(now);
    oscillator.stop(now + 0.5);

    // Add a second harmonic for richness
    const oscillator2 = ctx.createOscillator();
    const gainNode2 = ctx.createGain();
    
    oscillator2.connect(gainNode2);
    gainNode2.connect(ctx.destination);
    
    oscillator2.type = 'sine';
    oscillator2.frequency.setValueAtTime(1318.5, now); // E6
    oscillator2.frequency.setValueAtTime(1568, now + 0.1); // G6
    
    gainNode2.gain.setValueAtTime(0, now);
    gainNode2.gain.linearRampToValueAtTime(0.15, now + 0.02);
    gainNode2.gain.linearRampToValueAtTime(0.1, now + 0.1);
    gainNode2.gain.linearRampToValueAtTime(0.12, now + 0.12);
    gainNode2.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    
    oscillator2.start(now);
    oscillator2.stop(now + 0.4);

  } catch (error) {
    console.warn('Could not play notification sound:', error);
  }
}

// Alternative: Simple bell sound
export function playBellSound() {
  try {
    const ctx = getAudioContext();
    
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;
    
    // Bell-like sound using multiple harmonics
    const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5 chord
    
    frequencies.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      
      const volume = 0.2 / (index + 1);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(volume, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
      
      osc.start(now);
      osc.stop(now + 0.8);
    });

  } catch (error) {
    console.warn('Could not play bell sound:', error);
  }
}
