import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SETLIST } from '../constants';
import { Music, ChevronDown, ChevronUp } from 'lucide-react';

export default function Setlist() {
  const [isExpanded, setIsExpanded] = useState(false);
  const MOBILE_LIMIT = 10;

  return (
    <section id="setlist" className="py-24 bg-[#050505] relative">
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none overflow-hidden">
        <h2 className="text-[20vw] font-black text-white whitespace-nowrap -rotate-12 translate-y-1/2 select-none">
          QUEEN QUEENS & KO QUEEN
        </h2>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
           initial={{ opacity: 0, scale: 0.9 }}
           whileInView={{ opacity: 1, scale: 1 }}
           viewport={{ once: true }}
           className="max-w-6xl mx-auto bg-deep-black/60 backdrop-blur-xl border border-royal-gold/20 rounded-[2rem] p-8 md:p-16 shadow-[0_50px_100px_-20px_rgba(0,0,0,1)]"
        >
          <div className="text-center mb-16">
            <Music className="text-royal-gold mx-auto mb-4" size={40} />
            <h2 className="font-display text-5xl md:text-6xl font-bold italic metallic-gold mb-4">
              De Setlist
            </h2>
            <div className="h-px w-full bg-gradient-to-r from-transparent via-royal-gold to-transparent" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8">
            {SETLIST.map((song, i) => (
              <div
                key={i}
                className={`items-center gap-3 py-3 border-b border-white/5 group hover:border-royal-gold/30 transition-colors ${
                  i >= MOBILE_LIMIT 
                    ? (isExpanded ? 'flex' : 'hidden md:flex') 
                    : 'flex'
                }`}
              >
                <span className="text-royal-gold/40 font-mono text-[10px] leading-none shrink-0">
                  {(i + 1).toString().padStart(2, '0')}.
                </span>
                <span className="text-base md:text-lg font-display italic text-white/90 group-hover:text-royal-gold transition-colors truncate">
                  {song}
                </span>
              </div>
            ))}
          </div>

          <p className="mt-16 text-center text-white/40 text-sm italic">
            ...en nog vele andere klassiekers, rock-opera anthems en verborgen parels.
          </p>

          <div className="mt-8 text-center md:hidden">
            <button
              onClick={() => {
                if (isExpanded) {
                  setIsExpanded(false);
                  // Scroll back to the top of the setlist section after a small delay
                  setTimeout(() => {
                    const header = document.getElementById('setlist');
                    if (header) {
                      const offset = 80;
                      const elementPosition = header.getBoundingClientRect().top;
                      const offsetPosition = elementPosition + window.pageYOffset - offset;
                      
                      window.scrollTo({
                        top: offsetPosition,
                        behavior: 'smooth'
                      });
                    }
                  }, 300); // Increased delay to allow animation to complete
                } else {
                  setIsExpanded(true);
                }
              }}
              className="inline-flex items-center gap-2 bg-royal-gold/10 hover:bg-royal-gold/20 text-royal-gold px-8 py-3 rounded-full border border-royal-gold/30 transition-all font-bold tracking-widest text-xs uppercase"
            >
              {isExpanded ? (
                <>
                  <span>Minder tonen</span>
                  <ChevronUp size={16} />
                </>
              ) : (
                <>
                  <span>Volledige lijst</span>
                  <ChevronDown size={16} />
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
