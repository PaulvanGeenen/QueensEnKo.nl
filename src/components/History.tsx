import { motion } from 'motion/react';
import { Quote } from 'lucide-react';

export default function History() {
  return (
    <section id="verhaal" className="py-24 bg-deep-black relative overflow-hidden">
      {/* Decorative curtains/gradient edges */}
      <div className="absolute top-0 left-0 w-32 h-full bg-gradient-to-r from-royal-purple/20 to-transparent" />
      <div className="absolute top-0 right-0 w-32 h-full bg-gradient-to-l from-royal-purple/20 to-transparent" />

      <div className="container mx-auto px-4 max-w-4xl">
        <motion.div
           initial={{ opacity: 0, y: 50 }}
           whileInView={{ opacity: 1, y: 0 }}
           viewport={{ once: true }}
           className="relative"
        >
          <Quote className="absolute -top-12 -left-8 text-royal-gold/20" size={120} />
          
          <div className="text-center mb-12">
            <h2 className="font-display text-5xl md:text-7xl font-bold italic metallic-gold mb-6">
              Ons Verhaal
            </h2>
            <p className="text-royal-gold uppercase tracking-[0.4em] text-sm">Een Theatrale Reis</p>
          </div>

          <div className="prose prose-invert prose-lg max-w-none space-y-8 text-white/80 font-light leading-relaxed text-lg italic">
            <p className="first-letter:text-7xl first-letter:font-display first-letter:text-royal-gold first-letter:mr-3 first-letter:float-left">
              Gek op de muziek van Queen? Dan zit je bij Queens & Ko gebakken. Deze topmuzikanten trakteren je op de fenomenale muziek van Queen. Geen imitaties van de onvervangbare Freddie Mercury, maar een eigen theatrale reis door 50 jaar onvergetelijke rock, blues, ballads en vaudeville.
            </p>

            <p>
              In het verleden speelden de muzikanten van Queens & Ko onder andere in theaterstukken van ‘The Pink Floyd Project’ en de ‘Deep Purple’ en ‘The Scorpions’ producties van gitarist Jan Akkerman en zanger Bert Heerink. Geen onervaren clubje muzikanten dus.
            </p>

            <div className="my-8 flex justify-center">
              <div className="w-1/2 h-px bg-gradient-to-r from-transparent via-royal-gold to-transparent" />
            </div>

            <p>
              Een show van de band Queens & Ko is puur genieten van de vele klassiekers van de band Queen. In elk blokje muziek is de bezetting op het podium anders. Het laat de muziek van Queen nog meer sprankelen. Uiteraard komen de grote hits zoals Bohemian Rhapsody, Killer Queen, Radio Ga Ga en Somebody to Love voorbij, maar ook aan de echte fijnproevers is gedacht.
            </p>

            <p className="text-center font-bold text-royal-gold text-2xl mt-12 mb-4">
              "Het draait om de magische beleving van 50 jaar Queen"
            </p>

            <p>
              Alles staat in het teken van de muziek waarbij de vele vocale hoogstandjes niet uit de weg worden gegaan. Laat je meeslepen door de passie, de dramatiek en de koninklijke allure van Queens & Ko.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
