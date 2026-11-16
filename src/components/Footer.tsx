import { useState } from 'react';
import { db, doc, setDoc } from '../lib/firebase';
import { Mail, Check, AlertCircle } from 'lucide-react';
import { trackButtonPress } from '../lib/tracker';

export default function Footer() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setStatus('error');
      setMessage('Voer een geldig e-mailadres in.');
      return;
    }

    try {
      setStatus('loading');
      setMessage('');
      
      const cleanEmail = email.toLowerCase().trim();
      const subId = 'sub_' + Date.now();
      
      // Save subscription in Firestore newsletter collection using email as identifier to avoid duplicates
      await setDoc(doc(db, 'newsletter', cleanEmail), {
        id: subId,
        email: cleanEmail,
        subscribedAt: new Date().toISOString()
      });

      trackButtonPress(`Nieuwsbrief aanmelding: ${cleanEmail}`);
      
      setStatus('success');
      setMessage('Bedankt voor je aanmelding! Je bent nu geabonneerd.');
      setEmail('');
    } catch (err: any) {
      console.error('[Newsletter] Subscription error:', err);
      setStatus('error');
      setMessage('Er is iets misgegaan. Probeer het later opnieuw.');
    }
  };

  return (
    <footer className="py-20 bg-[#050505] border-t border-white/5 relative overflow-hidden">
      {/* Decorative ambient background glow */}
      <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-royal-gold/5 rounded-full blur-[100px] pointer-events-none" />
      
      <div className="container mx-auto px-6 max-w-4xl text-center relative z-10">
        
        {/* Newsletter Signup Form */}
        <div className="mb-20 max-w-xl mx-auto bg-[#0a0a0a] p-10 rounded-[32px] border border-royal-gold/20 shadow-[0_0_40px_-15px_rgba(212,175,55,0.15)] hover:border-royal-gold/40 hover:shadow-[0_0_50px_-12px_rgba(212,175,55,0.25)] transition-all duration-700 backdrop-blur-3xl relative overflow-hidden group">
          {/* Subtle top light bar */}
          <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-royal-gold/50 to-transparent" />
          
          <div className="absolute -top-12 -left-12 w-40 h-40 bg-royal-gold/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="inline-flex items-center gap-2 bg-[#050505] border border-royal-gold/30 px-5 py-2.5 rounded-full text-royal-gold shadow-[0_0_15px_rgba(212,175,55,0.2)] mb-6">
            <Mail size={14} className="animate-pulse" />
            <span className="text-[10px] font-mono uppercase tracking-[0.25em] font-extrabold text-royal-gold">Nieuwsbrief</span>
          </div>

          <p className="text-white hover:text-royal-gold/90 transition-colors font-sans text-2xl font-bold tracking-tight italic mb-2">
            Zorg dat je niets mist
          </p>
          <p className="text-white/65 font-sans text-xs max-w-sm mx-auto mb-8">
            Blijf direct op de hoogte van onze aankomende optredens, exclusieve shows en zinderend koor-nieuws.
          </p>

          <form onSubmit={handleSubscribe} className="space-y-3 sm:space-y-0 sm:flex sm:gap-2.5 max-w-md mx-auto">
            <div className="relative flex-1">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Je e-mailadres"
                className="w-full bg-black/85 border border-zinc-800/80 rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-royal-gold/80 focus:ring-1 focus:ring-royal-gold/20 transition-all placeholder:text-zinc-600 font-sans"
                disabled={status === 'loading' || status === 'success'}
              />
            </div>

            <button
              type="submit"
              disabled={status === 'loading' || status === 'success'}
              className="w-full sm:w-auto px-6 bg-royal-gold text-deep-black hover:bg-white disabled:opacity-50 disabled:hover:bg-royal-gold transition-all duration-300 font-extrabold uppercase tracking-widest text-[11px] py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(212,175,55,0.15)] hover:shadow-[0_4px_25px_rgba(212,175,55,0.35)] whitespace-nowrap active:scale-[0.98]"
            >
              {status === 'loading' ? 'Verwerken...' : status === 'success' ? 'Aangemeld' : 'Aanmelden'}
            </button>
          </form>

          {message && (
            <div className={`mt-4 text-xs font-mono py-2 px-3 rounded-lg border flex items-center gap-2 justify-center ${
              status === 'success' 
                ? 'bg-green-500/10 border-green-550/30 text-green-400' 
                : 'bg-red-500/10 border-red-550/30 text-rose-400'
            }`}>
              {status === 'success' ? <Check size={12} /> : <AlertCircle size={12} />}
              <span>{message}</span>
            </div>
          )}
        </div>

        {/* Logo and metadata */}
        <div className="flex justify-center mb-8">
          <img 
            src="/logo.png" 
            alt="Queens & Ko Logo" 
            className="h-24 md:h-32 w-auto opacity-80 brightness-110 hover:opacity-100 transition-all duration-500" 
          />
        </div>
        
        <div className="flex justify-center gap-8 mb-8 text-white/40 uppercase tracking-widest text-[10px] font-bold">
          <a href="#" className="hover:text-royal-gold transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-royal-gold transition-colors">Terms of Service</a>
          <a href="#" className="hover:text-royal-gold transition-colors">Cookies</a>
        </div>

        <p className="text-white/20 text-xs font-light tracking-[0.2em] uppercase">
          &copy; {new Date().getFullYear()} Queens & Ko. Alle rechten voorbehouden.
        </p>
        <p className="text-white/10 text-[8px] mt-4 uppercase tracking-[0.5em]">
          Long live the Queen.
        </p>
      </div>
    </footer>
  );
}
