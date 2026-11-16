import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Calendar, Ticket, MapPin, ExternalLink } from 'lucide-react';
import { AgendaItem } from '../types';
import { db, collection, onSnapshot, query, orderBy, where } from '../lib/firebase';
import { filterActiveAgendaItems } from '../lib/agendaFilter';
import { trackButtonPress } from '../lib/tracker';

export default function Agenda() {
  const [agenda, setAgenda] = useState<AgendaItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'agenda'),
      where('isVisible', '==', true),
      orderBy('date', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const raw = snapshot.docs.map(doc => ({ ...doc.data() } as AgendaItem));
      setAgenda(filterActiveAgendaItems(raw));
      setLoading(false);
    }, (err) => {
      console.error('[Agenda] Database subscription error:', err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading || agenda.length === 0) return null;

  return (
    <section id="agenda" className="py-24 bg-gradient-to-b from-[#1a0033] to-deep-black">
      <div className="container mx-auto px-4">
        <motion.div
           initial={{ opacity: 0, y: 20 }}
           whileInView={{ opacity: 1, y: 0 }}
           viewport={{ once: true }}
           className="text-center mb-16"
        >
          <h2 className="font-display text-5xl md:text-7xl font-bold italic metallic-gold mb-4">
            The Royal Tour
          </h2>
          <div className="flex items-center justify-center gap-4 text-royal-gold uppercase tracking-[0.3em] font-semibold text-sm">
            <Calendar size={16} />
            <span>Agenda & Shows</span>
          </div>
        </motion.div>

        <div className="max-w-5xl mx-auto space-y-4">
          {agenda.map((show, index) => {
            const showDate = new Date(show.date);
            const formattedDate = showDate.toLocaleDateString('nl-NL', {
              day: '2-digit',
              month: 'long',
              year: 'numeric'
            });
            const formattedTime = showDate.toLocaleTimeString('nl-NL', {
              hour: '2-digit',
              minute: '2-digit'
            });

          // Helper to ensure URL is absolute
    const ensureAbsoluteUrl = (url: string) => {
      if (!url) return '';
      if (url.startsWith('http://') || url.startsWith('https://')) return url;
      return `https://${url}`;
    };

    return (
      <motion.div
        key={show.id}
        initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ delay: index * 0.1 }}
        className="group relative glass-card p-6 md:p-8 flex flex-col md:grid md:grid-cols-[160px_1fr_auto] items-start gap-6 md:gap-12"
      >
        {/* Date Box */}
        <div className="flex flex-col items-center md:items-start shrink-0">
          <span className="text-white/40 text-[10px] uppercase tracking-[0.2em] mb-1">Datum & Tijd</span>
          <div className="flex flex-col items-center md:items-start">
            <span className="text-white font-bold text-xl tracking-tight leading-tight">{formattedDate}</span>
            <span className="text-royal-gold font-medium text-sm mt-0.5">{formattedTime} uur</span>
          </div>
        </div>

        {/* Venue & Content section */}
        <div className="flex flex-col md:flex-row md:items-start gap-8 grow w-full">
          {/* Primary Info */}
          <div className="flex-1 flex flex-col items-center md:items-start">
            <div className="flex items-center gap-2 mb-1.5">
              <h3 className="font-display text-2xl font-bold text-white group-hover:text-royal-gold transition-colors tracking-wide">
                {show.locationName}
              </h3>
              {show.infoLink && (
                <a 
                  href={ensureAbsoluteUrl(show.infoLink)} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  onClick={() => trackButtonPress(`Venue website: ${show.locationName}`)}
                  className="text-zinc-600 hover:text-royal-gold transition-colors"
                >
                  <ExternalLink size={16} />
                </a>
              )}
            </div>
            <div className="flex items-center gap-2 text-white/50 text-[11px] uppercase tracking-widest font-medium">
              <MapPin size={12} className="text-royal-red" />
              <span>{show.locationCity}, NL</span>
              {show.address && (
                <span className="text-white/30 truncate max-w-[200px]"> - {show.address}</span>
              )}
            </div>
            {(show.address || show.locationName) && (
              <a 
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${show.locationName} ${show.address || ''} ${show.locationCity}`)}`}
                target="_blank" 
                rel="noopener noreferrer"
                onClick={() => trackButtonPress(`Kaart route: ${show.locationName} (${show.locationCity})`)}
                className="mt-3 text-royal-gold/60 hover:text-royal-gold text-[10px] flex items-center gap-1.5 transition-colors"
              >
                <MapPin size={12} /> Bekijk op Google Maps
              </a>
            )}
          </div>

          {/* Secondary Info (Desktop only splitter) */}
          {(show.comments || (show.ticketPrice && show.ticketPrice !== '')) && (
            <div className="hidden lg:flex flex-col border-l border-white/10 pl-8 max-w-[300px]">
              {show.comments && show.comments.trim() !== "" && (
                <p className="text-white/60 text-xs italic leading-relaxed mb-2">
                  "{show.comments}"
                </p>
              )}
              {show.ticketPrice && show.ticketPrice !== '' && (
                <div className="flex items-center">
                  {parseFloat(show.ticketPrice.replace(',', '.')) === 0 ? (
                    <span className="bg-royal-gold/10 text-royal-gold px-2 py-0.5 rounded border border-royal-gold/20 text-[10px] font-black tracking-widest uppercase shadow-[0_0_10px_rgba(255,215,0,0.1)]">
                      Entree: GRATIS
                    </span>
                  ) : (
                    <span className="text-royal-gold/80 text-[10px] font-bold tracking-[0.2em] uppercase">
                      Tickets: {
                        !isNaN(parseFloat(show.ticketPrice.replace(',', '.'))) 
                          ? new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(parseFloat(show.ticketPrice.replace(',', '.')))
                          : `€${show.ticketPrice}`
                      }
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Mobile comments/price */}
          <div className="lg:hidden flex flex-col items-center">
            {show.comments && show.comments.trim() !== "" && (
              <p className="text-zinc-500 text-xs italic mb-2 text-center">"{show.comments}"</p>
            )}
            {show.ticketPrice && show.ticketPrice !== '' && (
              <div className="flex items-center mt-1">
                {parseFloat(show.ticketPrice.replace(',', '.')) === 0 ? (
                  <span className="bg-royal-gold/10 text-royal-gold px-2 py-0.5 rounded border border-royal-gold/20 text-[9px] font-black tracking-widest uppercase">
                    Entree: GRATIS
                  </span>
                ) : (
                  <span className="text-white/30 text-[10px] italic">
                    Tickets: {
                      !isNaN(parseFloat(show.ticketPrice.replace(',', '.'))) 
                        ? new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(parseFloat(show.ticketPrice.replace(',', '.')))
                        : `€${show.ticketPrice}`
                    }
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* CTA */}
        <div className="shrink-0 w-full md:w-auto">
          {((show.ticketLink && show.ticketLink.trim() !== '') || show.isSoldOut) && (
            <motion.a
              href={show.isSoldOut ? '#' : ensureAbsoluteUrl(show.ticketLink || '')}
              target={show.isSoldOut ? '_self' : '_blank'}
              rel="noopener noreferrer"
              whileHover={!show.isSoldOut ? { scale: 1.05 } : {}}
              whileTap={!show.isSoldOut ? { scale: 0.95 } : {}}
              className={`w-full md:w-auto px-10 py-3 rounded-full font-bold uppercase tracking-[0.2em] text-[11px] flex items-center justify-center gap-2 transition-all no-underline ${
                show.isSoldOut 
                ? "bg-white/10 text-white/30 cursor-not-allowed border border-white/5" 
                : "bg-royal-gold text-deep-black shadow-[0_0_20px_rgba(255,215,0,0.3)] hover:shadow-[0_0_30px_rgba(255,215,0,0.5)]"
              }`}
              onClick={(e) => {
                if (show.isSoldOut) {
                  e.preventDefault();
                  trackButtonPress(`Tickets verkocht klik: ${show.locationName}`);
                } else {
                  trackButtonPress(`Tickets kopen: ${show.locationName} (${show.locationCity})`);
                }
              }}
            >
              <Ticket size={16} />
              <span>{show.isSoldOut ? 'Uitverkocht' : 'Tickets'}</span>
            </motion.a>
          )}
        </div>

                {/* Decorative side accent */}
                <div className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-royal-gold opacity-0 group-hover:opacity-100 transition-opacity rounded-r-full" />
              </motion.div>
            );
          })}
        </div>

        {agenda.length === 0 && !loading && (
          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            className="mt-16 text-center"
          >
            <p className="text-white/40 italic">Meer data worden spoedig koninklijk aangekondigd...</p>
          </motion.div>
        )}
      </div>
    </section>
  );
}
