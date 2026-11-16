import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, Volume2, Music } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { AUDIO_DEMOS } from '../constants';
import { useMedia } from '../context/MediaContext';
import { trackButtonPress } from '../lib/tracker';

export default function AudioPlayer() {
  const { activeType, activeId, playAudio, stopAll } = useMedia();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const activeTrackIndex = activeType === 'audio' && typeof activeId === 'number' ? activeId : null;

  useEffect(() => {
    if (activeTrackIndex !== null) {
      if (audioRef.current) {
        audioRef.current.play().catch(err => {
          if (err.name === 'AbortError') return;
          console.error("Playback failed:", err);
        });
        setIsPlaying(true);
      }
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
    }
  }, [activeTrackIndex]);

  // Handle case where global activeType changes to something else (like 'video')
  useEffect(() => {
    if (activeType !== 'audio' && isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
    }
  }, [activeType, isPlaying]);

  const handleTrackSelect = (index: number) => {
    const track = AUDIO_DEMOS[index];
    if (activeTrackIndex === index) {
      if (isPlaying) {
        trackButtonPress(`Pause Audio: ${track.title}`);
        stopAll();
      } else {
        trackButtonPress(`Play Audio: ${track.title}`);
        playAudio(index);
      }
    } else {
      trackButtonPress(`Play Audio: ${track.title}`);
      playAudio(index);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    stopAll();
    setCurrentTime(0);
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <section className="py-24 bg-deep-black relative overflow-hidden">
      <audio 
        ref={audioRef}
        src={activeTrackIndex !== null ? AUDIO_DEMOS[activeTrackIndex].url : undefined}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
      />
      
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="glass-card rounded-[2.5rem] p-8 md:p-16 relative z-10 border border-white/5">
          <div className="flex flex-col md:flex-row items-center gap-12 md:gap-16">
            <div className="w-56 h-56 rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative group shrink-0 border border-white/10 bg-gradient-to-br from-royal-purple/30 to-deep-black flex items-center justify-center">
              <AnimatePresence mode="wait">
                {isPlaying ? (
                  <motion.div
                    key="playing"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 1.2, opacity: 0 }}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <div className="flex gap-1 items-end h-12">
                      {[0, 1, 2, 3].map((i) => (
                        <motion.div
                          key={i}
                          animate={{ height: [12, 48, 20, 36, 12] }}
                          transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
                          className="w-2 bg-royal-gold rounded-full"
                        />
                      ))}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="idle"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="w-full h-full flex items-center justify-center p-8"
                  >
                    <img 
                      src="/logoGEEL.png" 
                      alt="Queens & Ko Logo" 
                      className="w-full h-full object-contain brightness-125 transition-opacity" 
                      referrerPolicy="no-referrer" 
                    />
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="absolute inset-0 bg-gradient-to-t from-deep-black/60 to-transparent" />
            </div>

            <div className="grow w-full">
              <div className="flex justify-between items-center mb-4">
                <span className="text-royal-gold text-[11px] uppercase tracking-[0.5em] font-bold block">
                  {isPlaying ? 'Currently Playing' : 'Select a Track'}
                </span>
                {activeTrackIndex !== null && (
                  <Music className="text-royal-gold animate-pulse" size={16} />
                )}
              </div>
              
              <h2 className="font-display text-4xl text-white italic mb-10 tracking-wide">Luister naar the Magic</h2>

              <div className="space-y-4">
                {AUDIO_DEMOS.map((track, i) => (
                  <motion.div
                    key={i}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className={`flex items-center gap-6 p-5 rounded-2xl cursor-pointer transition-all duration-300 ${activeTrackIndex === i ? 'bg-royal-gold text-deep-black shadow-[0_10px_30px_rgba(255,215,0,0.15)]' : 'bg-white/5 border border-white/5 hover:border-white/20 hover:bg-white/[0.08]'}`}
                    onClick={() => handleTrackSelect(i)}
                  >
                    <button className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 shadow-lg transition-transform ${activeTrackIndex === i ? 'bg-deep-black text-royal-gold scale-110' : 'bg-royal-gold text-deep-black group-hover:scale-110'}`}>
                      {activeTrackIndex === i && isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
                    </button>
                    <div className="grow">
                      <p className={`font-bold tracking-wider uppercase text-[13px] ${activeTrackIndex === i ? 'text-deep-black' : 'text-white'}`}>{track.title}</p>
                      <p className={`text-[10px] uppercase tracking-[0.2em] font-medium mt-0.5 ${activeTrackIndex === i ? 'text-deep-black/70' : 'text-white/40'}`}>Queens & Ko Demo</p>
                    </div>
                    <span className={`font-mono text-xs font-bold ${activeTrackIndex === i ? 'text-deep-black/60' : 'text-white/30'}`}>{track.duration}</span>
                  </motion.div>
                ))}
              </div>

              <div className="mt-10 flex flex-col gap-4">
                <div className="h-[4px] w-full bg-white/10 rounded-full relative overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className="absolute top-0 left-0 h-full bg-royal-gold shadow-[0_0_15px_#ffd700]" 
                  />
                </div>
                <div className="flex justify-between items-center px-1">
                  <span className="text-[10px] font-bold text-white/40 tracking-widest uppercase">Premium Experience</span>
                  <div className="flex items-center gap-2">
                    <Volume2 size={12} className="text-royal-gold/60" />
                    <span className="text-[10px] font-bold text-royal-gold tracking-widest uppercase">High Fidelity Audio</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
