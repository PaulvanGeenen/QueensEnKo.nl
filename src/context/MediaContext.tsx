import React, { createContext, useContext, useState, useCallback } from 'react';

type MediaType = 'video' | 'audio' | null;

interface MediaContextType {
  activeType: MediaType;
  activeId: string | number | null;
  playVideo: (id: string | number) => void;
  playAudio: (id: string | number) => void;
  stopAll: () => void;
}

const MediaContext = createContext<MediaContextType | undefined>(undefined);

export function MediaProvider({ children }: { children: React.ReactNode }) {
  const [activeType, setActiveType] = useState<MediaType>(null);
  const [activeId, setActiveId] = useState<string | number | null>(null);

  const playVideo = useCallback((id: string | number) => {
    setActiveType('video');
    setActiveId(id);
  }, []);

  const playAudio = useCallback((id: string | number) => {
    setActiveType('audio');
    setActiveId(id);
  }, []);

  const stopAll = useCallback(() => {
    setActiveType(null);
    setActiveId(null);
  }, []);

  return (
    <MediaContext.Provider value={{ activeType, activeId, playVideo, playAudio, stopAll }}>
      {children}
    </MediaContext.Provider>
  );
}

export function useMedia() {
  const context = useContext(MediaContext);
  if (context === undefined) {
    throw new Error('useMedia must be used within a MediaProvider');
  }
  return context;
}
