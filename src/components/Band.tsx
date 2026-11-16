import { motion, AnimatePresence } from 'motion/react';
import { useState } from 'react';
import { BAND_MEMBERS } from '../constants';
import { ChevronDown, ChevronUp } from 'lucide-react';

function MemberCard({ member, index }: { member: any; index: number }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1 }}
      className="group/card group-card-hover relative glass-card p-6 flex flex-col cursor-pointer transition-all duration-500 select-none outline-none focus:outline-none active:outline-none"
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <div 
        className="member-image-container relative aspect-square mb-6 rounded-xl shadow-2xl transition-all duration-700 border border-white/10 group-hover/card:border-royal-gold/50"
      >
        <img 
          src={member.image} 
          alt={member.name}
          className={`member-photo w-full h-full object-cover pointer-events-none ${isExpanded ? 'is-active' : ''}`}
          draggable="false"
        />
        
        <div 
          className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-60 group-hover/card:opacity-20 transition-opacity duration-700 pointer-events-none z-10"
        />
      </div>
      
      <span className="text-royal-gold text-[10px] uppercase tracking-[0.3em] font-bold block mb-2">Member of Queens & Ko</span>
      <h4 
        className="font-display text-2xl font-bold mb-1 tracking-wide transition-colors duration-500 text-white group-hover/card:text-royal-gold"
      >
        {member.name}
      </h4>
      <p className="text-white/40 text-[10px] uppercase tracking-widest mb-4 font-bold border-l-2 border-royal-red pl-3">
        {member.role}
      </p>
      
      <div className="relative grow">
        <AnimatePresence mode="wait">
          {isExpanded ? (
            <motion.div 
              key="bio"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4"
            >
              {member.bio.split('\n\n').map((paragraph: string, i: number) => (
                <p key={i} className="text-white/80 font-light leading-relaxed text-sm italic">
                  {paragraph}
                </p>
              ))}
            </motion.div>
          ) : (
            <motion.p 
              key="desc"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-white/60 font-light leading-relaxed text-sm line-clamp-3"
            >
              {member.description}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsExpanded(!isExpanded);
        }}
        className="mt-4 flex items-center gap-1 text-royal-gold text-[11px] uppercase tracking-widest font-bold hover:text-white transition-colors group/btn outline-none"
      >
        <span>{isExpanded ? 'Minder lezen' : 'Lees meer'}</span>
        {isExpanded ? (
          <ChevronUp size={14} className="group-hover/btn:-translate-y-0.5 transition-transform" />
        ) : (
          <ChevronDown size={14} className="group-hover/btn:translate-y-0.5 transition-transform" />
        )}
      </button>
    </motion.div>
  );
}

export default function Band() {
  return (
    <section id="band" className="py-24 bg-deep-black relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-royal-gold to-transparent opacity-50" />
      
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-20"
        >
          <h2 className="font-display text-5xl md:text-7xl font-bold italic metallic-gold mb-4">
            The Royal Line-up
          </h2>
          <p className="text-royal-gold/70 uppercase tracking-[0.3em] font-semibold">De Meesters van de Rock-Opera</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {BAND_MEMBERS.map((member, index) => (
            <MemberCard key={member.name} member={member} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
