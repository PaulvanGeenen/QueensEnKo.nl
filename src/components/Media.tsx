import { motion } from 'motion/react';
import { Newspaper, Video } from 'lucide-react';
import VideoPlayer from './VideoPlayer';
import { INTERVIEW_VIDEO } from '../constants';
import { useMedia } from '../context/MediaContext';

export default function Media() {
  const { activeType, activeId, playVideo, stopAll } = useMedia();
  const interviewVideo = INTERVIEW_VIDEO.url;
  
  const isVideoActive = activeType === 'video' && activeId === 'interview';

  return (
    <section id="media" className="py-24 bg-gradient-to-t from-deep-black to-[#0d0d0d]">
      <div className="container mx-auto px-4">
        <motion.div
           initial={{ opacity: 0 }}
           whileInView={{ opacity: 1 }}
           viewport={{ once: true }}
           className="text-center mb-20"
        >
          <h2 className="font-display text-5xl md:text-7xl font-bold italic metallic-gold mb-4">
            In de Media
          </h2>
          <p className="text-royal-gold uppercase tracking-widest text-sm font-bold">Wat men zegt over Queens & Ko</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          {/* Newspaper Report */}
          <motion.a
            href="https://www.hetkontakt.nl/vijfheerenlanden/nieuws/377090/ruim-1-800-euro-opgehaald-voor-kwf-bij-optreden-queens-ko-in-"
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="group cursor-pointer block"
          >
            <div className="bg-[#f0f0f0] p-4 text-[#1a1a1a] shadow-2xl rounded-sm transform group-hover:rotate-1 group-hover:scale-[1.02] transition-all duration-500 relative overflow-hidden">
              <img 
                src="/KWF-artikel.jpg" 
                alt="Het Kontakt - KWF Artikel" 
                className="w-full h-auto shadow-inner"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
            </div>
            <p className="text-white/40 mt-4 text-center text-sm italic group-hover:text-royal-gold transition-colors">Klik om het volledige artikel van Het Kontakt te lezen</p>
          </motion.a>

          {/* YouTube Interview */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="flex flex-col h-full"
          >
            <div className="mb-6 flex items-center gap-4 text-white/90">
              <div className="bg-royal-red p-2 rounded-lg"><Video size={24} /></div>
              <h3 className="font-display text-3xl italic font-bold">Interview: Herma & Liz</h3>
            </div>
            <div className="relative aspect-video rounded-2xl overflow-hidden border-2 border-white/10 shadow-2xl grow min-h-[300px]">
              <VideoPlayer 
                url={interviewVideo}
                thumbnail="/logoGEEL.png"
                isActive={isVideoActive}
                onPlay={() => playVideo('interview')}
                onStop={() => {
                  if (isVideoActive) stopAll();
                }}
              />
            </div>
            <p className="text-white/60 mt-6 leading-relaxed italic border-l-2 border-royal-gold pl-6">
              In dit exclusieve diepte-interview vertellen Herma en Liz over het ontstaan van Queens & Ko, de passie voor Queen en de uitdagingen van een theatrale rock-opera.
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
