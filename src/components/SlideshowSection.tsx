import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { HERO_SLIDES } from '../constants';

export default function SlideshowSection() {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    if (HERO_SLIDES.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section id="showcase" className="relative h-[60vh] md:h-[80vh] w-full overflow-hidden bg-deep-black">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentSlide}
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 1.2, ease: "easeInOut" }}
          className="absolute inset-0 z-0"
        >
          <img 
            src={HERO_SLIDES[currentSlide]}
            alt={`Showcase ${currentSlide + 1}`}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-deep-black via-transparent to-deep-black" />
        </motion.div>
      </AnimatePresence>

    </section>
  );
}
