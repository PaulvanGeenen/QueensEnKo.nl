import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, X } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { cn } from '../lib/utils';

interface NavbarProps {
  showAgenda: boolean;
}

export default function Navbar({ showAgenda }: NavbarProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isProduction = typeof window !== 'undefined' && 
    (window.location.hostname.toLowerCase().includes('queensenko.nl') || 
     window.location.hostname.toLowerCase().includes('royal-tour'));
  const isRoot = location.pathname === '/';

  const navLinks = [
    { name: 'Home', href: isRoot ? '#home' : '/#home' },
    ...(showAgenda ? [{ name: 'Agenda', href: isRoot ? '#agenda' : '/#agenda' }] : []),
    { name: 'Band', href: isRoot ? '#band' : '/#band' },
    { name: 'Live', href: isRoot ? '#live' : '/#live' },
    { name: 'Setlist', href: isRoot ? '#setlist' : '/#setlist' },
    { name: 'Verhaal', href: isRoot ? '#verhaal' : '/#verhaal' },
    { name: 'Media', href: isRoot ? '#media' : '/#media' },
    { name: 'Contact', href: isRoot ? '#contact' : '/#contact' },
    ...(!isProduction ? [{ name: 'Beheer', href: '/beheer' }] : []),
  ];

  return (
    <nav className={cn(
      "fixed top-0 left-0 w-full z-50 transition-all duration-500 py-6 border-none",
      isScrolled ? "bg-deep-black/80 backdrop-blur-md py-4" : "bg-transparent"
    )}>
      <div className="container mx-auto px-6 flex justify-between lg:justify-center items-center relative">
        <div className="lg:hidden w-8" /> {/* Spacer for mobile alignment */}
        
        {/* Desktop Links */}
        <div className="hidden lg:flex items-center gap-10">
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              className="text-white/70 hover:text-royal-gold font-semibold uppercase tracking-[0.3em] text-[10px] transition-colors"
            >
              {link.name}
            </a>
          ))}
          <a
            href="#contact"
            className="px-6 py-1.5 border border-royal-gold text-royal-gold font-bold uppercase tracking-[0.3em] text-[10px] hover:bg-royal-gold hover:text-deep-black transition-all"
          >
            Boek nu
          </a>
        </div>

        {/* Mobile Toggle */}
        <button 
          className="lg:hidden text-royal-gold p-2"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <X size={32} /> : <Menu size={32} />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-deep-black overflow-hidden"
          >
            <div className="flex flex-col p-8 gap-6">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  onClick={() => setIsMenuOpen(false)}
                  className="text-white/70 hover:text-royal-gold font-display text-2xl italic font-bold text-center"
                >
                  {link.name}
                </a>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
