import { motion } from 'motion/react';
import { ChevronDown } from 'lucide-react';

interface HeroProps {
  showAgenda?: boolean;
}

export default function Hero({ showAgenda = false }: HeroProps) {
  return (
    <section id="home" className="relative min-h-screen w-full flex items-center justify-center bg-[#070707] py-20 md:py-28">
      {/* Spotlight Effect */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[80vw] h-[80vw] bg-royal-gold/5 blur-[150px] rounded-full pointer-events-none" />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-4 w-full flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="mt-4 md:mt-8 mb-4"
        >
          <img 
            src="/logo.png" 
            alt="Queens & Ko Logo" 
            className="w-40 md:w-56 lg:w-64 h-auto drop-shadow-[0_0_40px_rgba(255,215,0,0.3)]"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="space-y-4"
        >
          <span className="text-royal-gold text-[10px] md:text-xs uppercase tracking-[0.8em] block font-bold opacity-80">
            Experientia Regalis
          </span>
          
          <h1 className="inline-block font-display text-[18vw] sm:text-[16vw] md:text-[15vw] lg:text-[200px] font-black tracking-tight italic metallic-gold leading-none pt-4 pb-8 px-12 sm:px-16 md:px-24 mx-auto overflow-visible">
            QUEEN
          </h1>
          
          <h2 className="font-sans text-xl md:text-3xl lg:text-4xl text-white font-extralight tracking-[0.5em] uppercase opacity-70">
            In een nieuw jasje
          </h2>
        </motion.div>

        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.2 }}
          className="my-6 md:my-8 text-sm md:text-base text-white/50 leading-relaxed max-w-xl mx-auto font-light tracking-wide px-6"
        >
          Geen imitaties, maar een theatrale reis door 50 jaar onvergetelijke rock, blues, ballads en vaudeville.
        </motion.p>

        <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
          {showAgenda && (
            <motion.a
              href="#agenda"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-12 py-4 bg-royal-gold text-deep-black font-bold text-xs rounded-full shadow-[0_0_30px_rgba(255,215,0,0.3)] hover:shadow-[0_0_50px_rgba(255,215,0,0.5)] transition-all uppercase tracking-[0.2em]"
            >
              Ervaar de show
            </motion.a>
          )}
          <motion.a
            href="#verhaal"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-12 py-4 border border-white/20 backdrop-blur-md text-white font-bold text-xs rounded-full hover:bg-white hover:text-deep-black transition-all uppercase tracking-[0.2em]"
          >
            Onze Historie
          </motion.a>
        </div>
      </div>

      {/* Scroll Indicator */}
      <motion.div
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 text-royal-gold/50 cursor-pointer hover:text-royal-gold"
        onClick={() => document.getElementById('showcase')?.scrollIntoView({ behavior: 'smooth' })}
      >
        <ChevronDown size={40} />
      </motion.div>
    </section>
  );
}
