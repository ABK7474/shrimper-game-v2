import { useRef, useCallback } from 'react';

export const useSound = () => {
  const audioRefs = useRef({});
  const backgroundMusicRef = useRef(null);
  
  const playSound = useCallback((soundName, volume = 0.5) => {
    if (!audioRefs.current[soundName]) {
      audioRefs.current[soundName] = new Audio(`/sounds/${soundName}.mp3`);
    }
    
    const audio = audioRefs.current[soundName];
    audio.volume = volume;
    audio.currentTime = 0;
    audio.play().catch(e => console.log('Ses çalınamadı:', e));
  }, []);
  
  const playBackgroundMusic = useCallback((volume = 0.3) => {
    if (!backgroundMusicRef.current) {
      backgroundMusicRef.current = new Audio('/sounds/background.mp3');
      backgroundMusicRef.current.loop = true; // Müziği loop yap
    }
    
    const audio = backgroundMusicRef.current;
    audio.volume = volume;
    audio.currentTime = 0;
    audio.play().catch(e => console.log('Arka plan müziği çalınamadı:', e));
  }, []);
  
  const stopBackgroundMusic = useCallback(() => {
    if (backgroundMusicRef.current) {
      backgroundMusicRef.current.pause();
      backgroundMusicRef.current.currentTime = 0;
    }
  }, []);
  
  const pauseBackgroundMusic = useCallback(() => {
    if (backgroundMusicRef.current) {
      backgroundMusicRef.current.pause();
    }
  }, []);
  
  const resumeBackgroundMusic = useCallback(() => {
    if (backgroundMusicRef.current) {
      backgroundMusicRef.current.play().catch(e => console.log('Arka plan müziği devam ettirilemedi:', e));
    }
  }, []);
  
  return { 
    playSound, 
    playBackgroundMusic, 
    stopBackgroundMusic,
    pauseBackgroundMusic,
    resumeBackgroundMusic
  };
};
