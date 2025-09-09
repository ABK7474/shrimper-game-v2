import { useRef, useCallback } from 'react';

export const useSound = () => {
  const audioRefs = useRef({});
  
  const playSound = useCallback((soundName, volume = 0.5) => {
    if (!audioRefs.current[soundName]) {
      audioRefs.current[soundName] = new Audio(`/sounds/${soundName}.mp3`);
    }
    
    const audio = audioRefs.current[soundName];
    audio.volume = volume;
    audio.currentTime = 0;
    audio.play().catch(e => console.log('Ses çalınamadı:', e));
  }, []);
  
  return { playSound };
};
