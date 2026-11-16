import { motion } from 'motion/react';
import { Mail, Phone, Instagram, Facebook, Send, ExternalLink } from 'lucide-react';
import { trackButtonPress } from '../lib/tracker';

export default function Contact() {
  return (
    <section id="contact" className="py-24 bg-deep-black relative">
       {/* Background glow */}
       <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-royal-purple/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-4xl mx-auto px-4 text-center">
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="font-display text-5xl md:text-7xl font-bold italic metallic-gold mb-8">
              Boek the Magic
            </h2>
            <p className="text-white/80 text-lg mb-12 max-w-2xl mx-auto leading-relaxed">
              Wilt u Queens & Ko op uw podium, festival of evenement? Neem vandaag nog contact met ons op voor een onvergetelijke theatrale ervaring.
            </p>

            {/* Exclusief boekingskantoor: Buro Berbers */}
            <div className="max-w-xl mx-auto mb-14 p-8 bg-gradient-to-b from-royal-gold/10 to-white/[0.02] border border-royal-gold/20 rounded-3xl backdrop-blur-md relative overflow-hidden text-center group/card hover:border-royal-gold/40 transition-all">
              <div className="absolute top-0 right-0 bg-royal-gold text-deep-black font-mono text-[9px] uppercase font-black tracking-widest px-4 py-1.5 rounded-bl-2xl">
                Eerste Mogelijkheid
              </div>
              <h3 className="text-2xl md:text-3xl font-display font-bold italic text-royal-gold mb-3">
                Buro Berbers
              </h3>
              <p className="text-white/85 text-sm md:text-base leading-relaxed mb-6 max-w-md mx-auto">
                Voor de meest professionele afhandeling, festivals, theaters en grotere evenementen boekt u Queens & Ko direct via ons exclusieve boekingskantoor <strong>Buro Berbers</strong>.
              </p>
              <a 
                href="https://www.buroberbers.nl/" 
                target="_blank" 
                rel="noopener noreferrer" 
                onClick={() => trackButtonPress('Boeken via Buro Berbers')}
                className="inline-flex items-center gap-2 px-8 py-3.5 bg-royal-gold hover:bg-white text-deep-black font-extrabold rounded-2xl transition-all font-display italic tracking-wide group/btn shadow-lg shadow-royal-gold/10 hover:shadow-white/10"
              >
                Bezoek Buro Berbers <ExternalLink size={16} className="group-hover/btn:translate-x-0.5 transition-transform" />
              </a>
            </div>

            <div className="text-white/40 font-mono text-xs uppercase tracking-[0.2em] mb-12 flex items-center justify-center gap-4">
              <span className="h-px w-8 bg-white/10"></span>
              of neem direct contact op
              <span className="h-px w-8 bg-white/10"></span>
            </div>

            <div className="flex flex-col items-center space-y-8">
              <div className="flex flex-col items-center space-y-4">
                <a 
                  href="tel:+31624977615" 
                  onClick={() => trackButtonPress('Telefoon link: 06 249 776 15')}
                  className="flex items-center gap-6 group hover:translate-x-2 transition-transform"
                >
                  <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-royal-gold group-hover:text-deep-black transition-all">
                    <Phone size={24} />
                  </div>
                  <span className="text-2xl md:text-3xl font-display italic text-white/90 group-hover:text-royal-gold transition-colors">06 249 776 15</span>
                </a>
                <a 
                  href="tel:+31644466601" 
                  onClick={() => trackButtonPress('Telefoon link: 06 444 666 01')}
                  className="flex items-center gap-6 group hover:translate-x-2 transition-transform"
                >
                  <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-royal-gold group-hover:text-deep-black transition-all">
                    <Phone size={24} />
                  </div>
                  <span className="text-2xl md:text-3xl font-display italic text-white/90 group-hover:text-royal-gold transition-colors">06 444 666 01</span>
                </a>
              </div>
              
              <a 
                href="mailto:QueensenKo@gmail.com" 
                onClick={() => trackButtonPress('Email link: QueensenKo@gmail.com')}
                className="flex items-center gap-6 group hover:translate-x-2 transition-transform"
              >
                <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-royal-gold group-hover:text-deep-black transition-all">
                  <Mail size={24} />
                </div>
                <span className="text-2xl md:text-3xl font-display italic text-white/90 group-hover:text-royal-gold transition-colors">QueensenKo@gmail.com</span>
              </a>
              
              <div className="flex gap-4 mt-8">
                <a 
                  href="https://www.instagram.com/queensenko/" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  onClick={() => trackButtonPress('Social link: Instagram')}
                  className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-gradient-to-tr hover:from-[#f09433] hover:via-[#e6683c] hover:to-[#bc1888] transition-all hover:scale-110"
                >
                  <Instagram size={24} />
                </a>
                <a 
                  href="https://www.facebook.com/profile.php?id=100007789546947&fref=ts" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  onClick={() => trackButtonPress('Social link: Facebook')}
                  className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-[#1877f2] transition-all hover:scale-110"
                >
                  <Facebook size={24} />
                </a>
              </div>
            </div>
          </motion.div>
        </div>
    </section>
  );
}
