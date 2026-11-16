import React, { useState, useEffect, useRef } from 'react';

interface VideoPlayerProps {
  url: string;
  thumbnail: string;
  isActive?: boolean;
  onPlay?: () => void;
  onStop?: () => void;
}

export default function VideoPlayer({ url, thumbnail, isActive, onPlay, onStop }: VideoPlayerProps) {
  const [isFinishing, setIsFinishing] = useState(false);
  const [shouldRenderVideo, setShouldRenderVideo] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (isActive) {
      setShouldRenderVideo(true);
      setIsFinishing(false);
    } else if (shouldRenderVideo && !isActive) {
      // If we were playing and now isActive is false, start fade out
      setIsFinishing(true);
      
      // Stop the video audio/playback during fade out
      if (videoRef.current) {
        videoRef.current.pause();
      }

      const timer = setTimeout(() => {
        setShouldRenderVideo(false);
        setIsFinishing(false);
      }, 3000); // 3 seconds fade out as requested
      return () => clearTimeout(timer);
    }
  }, [isActive, shouldRenderVideo]);

  // Extract YouTube ID
  const getYoutubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  // Extract Google Drive ID
  const getDriveId = (url: string) => {
    const regExp = /[-\w]{25,}/;
    const match = url.match(regExp);
    // Avoid picking up the folder ID if possible, but usually drive links have the ID clearly
    if (url.includes('drive.google.com')) {
      return match ? match[0] : null;
    }
    return null;
  };

  const videoId = getYoutubeId(url);
  const driveId = getDriveId(url);
  const isLocal = url.startsWith('/') || url.includes('.mov') || url.includes('.mp4');

  const handleEnded = () => {
    if (onStop) onStop();
  };

  const handlePlayClick = () => {
    if (onPlay) onPlay();
  };

  if (!shouldRenderVideo) {
    return (
      <div 
        className="relative w-full h-full cursor-pointer group"
        onClick={handlePlayClick}
      >
        <img 
          src={thumbnail} 
          alt="Video Background" 
          className="w-full h-full object-contain p-8 md:p-12 relative z-10"
        />
        <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-16 h-16 md:w-20 md:h-20 bg-royal-gold rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(255,215,0,0.5)] transform group-hover:scale-110 transition-transform">
            <div className="w-0 h-0 border-t-[10px] border-t-transparent border-l-[20px] border-l-deep-black border-b-[10px] border-b-transparent ml-2" />
          </div>
        </div>
      </div>
    );
  }

  if (isLocal) {
    return (
      <div className={`absolute inset-0 w-full h-full bg-black transition-opacity duration-[3000ms] ${isFinishing ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <video
          ref={videoRef}
          src={encodeURI(url)}
          className="w-full h-full"
          autoPlay
          controls={!isFinishing}
          onEnded={handleEnded}
        />
      </div>
    );
  }

  if (driveId) {
    return (
      <div className={`absolute inset-0 w-full h-full bg-black transition-opacity duration-[3000ms] ${isFinishing ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <iframe
          width="100%"
          height="100%"
          src={`https://drive.google.com/file/d/${driveId}/preview`}
          title="Google Drive video player"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="absolute inset-0 w-full h-full"
        ></iframe>
      </div>
    );
  }

  return (
    <div className={`absolute inset-0 w-full h-full bg-black transition-opacity duration-[3000ms] ${isFinishing ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
      <iframe
        width="100%"
        height="100%"
        src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
        title="YouTube video player"
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        className="absolute inset-0 w-full h-full"
      ></iframe>
    </div>
  );
}
