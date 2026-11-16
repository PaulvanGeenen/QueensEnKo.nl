import { motion } from 'motion/react';
import VideoPlayer from './VideoPlayer';
import { LIVE_VIDEOS } from '../constants';
import { useMedia } from '../context/MediaContext';

export default function Live() {
  const { activeType, activeId, playVideo, stopAll } = useMedia();

  const isVideoActive = (index: number) => activeType === 'video' && activeId === index;

  return (
    <section id="live" className="py-24 bg-gradient-to-b from-deep-black to-[#1a0033]">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="font-display text-5xl md:text-7xl font-bold italic metallic-gold mb-4">
            Live Spectakel
          </h2>
          <div className="h-1 w-24 bg-royal-red mx-auto mb-6" />
          <p className="text-white/80 max-w-2xl mx-auto italic text-lg">
            Proef de sfeer van onze bombastische optredens. De energie, de emotie, de pure rock-n-roll.
          </p>
        </motion.div>

        <div className="flex flex-wrap justify-center gap-8 lg:gap-12">
          {LIVE_VIDEOS.map((video, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.2 }}
              className="relative aspect-video rounded-2xl overflow-hidden border-4 border-white/5 shadow-2xl group w-full md:w-[calc(50%-1rem)] lg:w-[calc(45%-1.5rem)] max-w-2xl"
            >
              <VideoPlayer 
                url={video.url}
                thumbnail="/logoGEEL.png"
                isActive={isVideoActive(index)}
                onPlay={() => playVideo(index)}
                onStop={() => {
                  if (isVideoActive(index)) {
                    stopAll();
                  }
                }}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
