import { useState, useEffect, useRef } from 'react';
import {
  Send,
  Image as ImageIcon,
  X,
  Facebook,
  Instagram,
  CheckCircle2,
  Clock,
  AlertCircle,
  Trash2,
  Copy,
  Check,
  Sparkles,
} from 'lucide-react';

interface SocialPostRecord {
  id: string;
  message: string;
  imageUrl: string;
  platforms: string[];
  status: 'published' | 'partial' | 'queued' | 'error';
  results: Record<string, { status: string; message?: string; postId?: string }>;
  createdAt: string;
}

interface SocialConfigStatus {
  facebook: boolean;
  instagram: boolean;
}

export default function SocialComposer() {
  const [message, setMessage] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<{ facebook: boolean; instagram: boolean }>({
    facebook: true,
    instagram: true,
  });
  const [configured, setConfigured] = useState<SocialConfigStatus>({ facebook: false, instagram: false });
  const [posts, setPosts] = useState<SocialPostRecord[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'warning' | 'error'; text: string } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadPosts = async () => {
    try {
      const res = await fetch('/api/social_post.php');
      if (!res.ok) return;
      const data = await res.json();
      if (data.configured) setConfigured(data.configured);
      if (Array.isArray(data.posts)) setPosts(data.posts);
    } catch {
      // Negeer netwerkfout bij initieel laden
    }
  };

  useEffect(() => {
    loadPosts();
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setFeedback(null);
  };

  const clearImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const togglePlatform = (key: 'facebook' | 'instagram') => {
    setSelectedPlatforms((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const appendHashtags = () => {
    const tags = '#QueensEnKo #QueenTribute #LiveMusic';
    if (!message.includes('#QueensEnKo')) {
      setMessage((prev) => (prev.trim() ? `${prev.trim()}\n\n${tags}` : tags));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const platforms = (['facebook', 'instagram'] as const).filter((p) => selectedPlatforms[p]);
    if (platforms.length === 0) {
      setFeedback({ type: 'error', text: 'Vink eerst minimaal één kanaal aan (Facebook of Instagram).' });
      return;
    }
    if (!message.trim() && !imageFile) {
      setFeedback({ type: 'error', text: 'Typ eerst een bericht of kies een foto.' });
      return;
    }
    if (selectedPlatforms.instagram && !imageFile) {
      setFeedback({ type: 'error', text: 'Voor Instagram moet je altijd een foto kiezen.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('message', message.trim());
      formData.append('platforms', JSON.stringify(platforms));
      if (imageFile) {
        formData.append('image', imageFile);
      }

      const res = await fetch('/api/social_post.php', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        setFeedback({ type: 'error', text: data.error || 'Plaatsen mislukt.' });
        return;
      }

      const status = data.post?.status;
      if (status === 'published') {
        setFeedback({ type: 'success', text: 'Gelukt! Je bericht is direct geplaatst op de gekozen socials.' });
        setMessage('');
        clearImage();
      } else if (status === 'queued') {
        setFeedback({
          type: 'warning',
          text: 'Bericht & foto zijn opgeslagen! De directe Meta-koppeling (api/social_config.php) staat nog niet ingesteld, dus hij staat nu klaar in de wachtrij.',
        });
        setMessage('');
        clearImage();
      } else if (status === 'partial') {
        setFeedback({
          type: 'warning',
          text: 'Gedeeltelijk geplaatst. Controleer het resultaat hieronder bij Recente berichten.',
        });
      } else {
        const firstErr = Object.values(data.results || {})
          .map((r: any) => r?.message)
          .filter(Boolean)
          .join(' | ');
        setFeedback({ type: 'error', text: firstErr || 'Er ging iets mis bij het doorzetten.' });
      }

      await loadPosts();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'Netwerkfout bij versturen.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePost = async (id: string) => {
    try {
      const res = await fetch(`/api/social_post.php?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (res.ok) {
        setPosts((prev) => prev.filter((p) => p.id !== id));
      }
    } catch {
      // Negeer
    }
  };

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Main Composer Card */}
      <form
        onSubmit={handleSubmit}
        className="p-6 md:p-8 bg-zinc-950 border border-royal-gold/25 rounded-3xl space-y-6 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-royal-gold/5 blur-[100px] rounded-full pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 relative z-10">
          <div>
            <span className="text-[10px] text-royal-gold font-mono uppercase tracking-widest font-bold block">
              Direct Plaatsen (Geen Social-login nodig)
            </span>
            <h3 className="text-xl font-bold text-white mt-0.5">Nieuw Social Media Bericht</h3>
            <p className="text-xs text-zinc-400 mt-1">
              Typ je tekst, kies een foto en vink aan waar het op moet. Klik op plaatsen en klaar!
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span
              className={`text-[10px] font-mono px-2.5 py-1 rounded-full border ${
                configured.facebook
                  ? 'bg-green-500/10 text-green-400 border-green-500/20'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              }`}
            >
              FB: {configured.facebook ? 'API Gekoppeld' : 'Wachtrij-modus'}
            </span>
            <span
              className={`text-[10px] font-mono px-2.5 py-1 rounded-full border ${
                configured.instagram
                  ? 'bg-green-500/10 text-green-400 border-green-500/20'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              }`}
            >
              IG: {configured.instagram ? 'API Gekoppeld' : 'Wachtrij-modus'}
            </span>
          </div>
        </div>

        {/* Stap 1: Tekst */}
        <div className="space-y-2 relative z-10">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider font-mono">
              1. Berichttekst
            </label>
            <button
              type="button"
              onClick={appendHashtags}
              className="text-[10px] font-mono text-royal-gold hover:text-white flex items-center gap-1 px-2.5 py-1 bg-royal-gold/10 rounded-lg border border-royal-gold/20 transition-colors"
            >
              <Sparkles size={11} /> + Hashtags toevoegen
            </button>
          </div>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            placeholder="Bijv.: Wat een fantastische avond in Buren! Bedankt allemaal voor het meezingen! 🎸👑"
            className="w-full bg-zinc-900/80 border border-zinc-800 focus:border-royal-gold rounded-2xl p-4 text-sm text-white placeholder:text-zinc-600 outline-none transition-colors resize-y"
          />
        </div>

        {/* Stap 2: Foto */}
        <div className="space-y-2 relative z-10">
          <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider font-mono block">
            2. Foto toevoegen {selectedPlatforms.instagram && <span className="text-pink-400">(verplicht voor Instagram)</span>}
          </label>

          {imagePreview ? (
            <div className="relative inline-block">
              <img
                src={imagePreview}
                alt="Voorbeeld"
                className="max-h-64 rounded-2xl border border-zinc-800 object-cover"
              />
              <button
                type="button"
                onClick={clearImage}
                className="absolute top-2 right-2 p-1.5 bg-black/80 hover:bg-red-600 text-white rounded-full transition-colors"
                title="Foto verwijderen"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full p-6 border-2 border-dashed border-zinc-800 hover:border-royal-gold/50 rounded-2xl bg-zinc-900/40 hover:bg-zinc-900/70 transition-all flex flex-col items-center justify-center gap-2 text-zinc-400 hover:text-royal-gold"
            >
              <ImageIcon size={28} />
              <span className="text-xs font-bold">Klik hier om een foto te kiezen (JPG, PNG of WebP, max 8 MB)</span>
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleImageChange}
            className="hidden"
          />
        </div>

        {/* Stap 3: Kanalen kiezen */}
        <div className="space-y-2 relative z-10">
          <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider font-mono block">
            3. Kies waar je het wilt plaatsen
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => togglePlatform('facebook')}
              className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${
                selectedPlatforms.facebook
                  ? 'bg-blue-600/15 border-blue-500 text-white'
                  : 'bg-zinc-900/50 border-zinc-800 text-zinc-500 hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <Facebook size={22} className={selectedPlatforms.facebook ? 'text-blue-400' : 'text-zinc-600'} />
                <div className="text-left">
                  <div className="text-sm font-bold">Facebook</div>
                  <div className="text-[10px] text-zinc-400">Queens & Ko Pagina</div>
                </div>
              </div>
              <div
                className={`w-5 h-5 rounded-md border flex items-center justify-center ${
                  selectedPlatforms.facebook ? 'bg-blue-500 border-blue-400 text-white' : 'border-zinc-700'
                }`}
              >
                {selectedPlatforms.facebook && <Check size={13} />}
              </div>
            </button>

            <button
              type="button"
              onClick={() => togglePlatform('instagram')}
              className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${
                selectedPlatforms.instagram
                  ? 'bg-pink-600/15 border-pink-500 text-white'
                  : 'bg-zinc-900/50 border-zinc-800 text-zinc-500 hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <Instagram size={22} className={selectedPlatforms.instagram ? 'text-pink-400' : 'text-zinc-600'} />
                <div className="text-left">
                  <div className="text-sm font-bold">Instagram</div>
                  <div className="text-[10px] text-zinc-400">@queensenko</div>
                </div>
              </div>
              <div
                className={`w-5 h-5 rounded-md border flex items-center justify-center ${
                  selectedPlatforms.instagram ? 'bg-pink-500 border-pink-400 text-white' : 'border-zinc-700'
                }`}
              >
                {selectedPlatforms.instagram && <Check size={13} />}
              </div>
            </button>
          </div>
        </div>

        {feedback && (
          <div
            className={`p-4 rounded-2xl border text-xs flex items-start gap-2.5 relative z-10 ${
              feedback.type === 'success'
                ? 'bg-green-500/10 border-green-500/30 text-green-300'
                : feedback.type === 'warning'
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                : 'bg-red-500/10 border-red-500/30 text-red-300'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
            ) : feedback.type === 'warning' ? (
              <Clock size={16} className="shrink-0 mt-0.5" />
            ) : (
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
            )}
            <span>{feedback.text}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-4 bg-royal-gold hover:bg-white disabled:opacity-50 text-black font-extrabold text-sm uppercase tracking-wider rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-royal-gold/10 relative z-10"
        >
          <Send size={16} />
          {isSubmitting ? 'Bezig met plaatsen...' : 'Plaats op aangevinkte socials'}
        </button>
      </form>

      {/* Recente berichten / wachtrij */}
      {posts.length > 0 && (
        <div className="p-6 bg-zinc-950 border border-zinc-900 rounded-3xl space-y-4">
          <h4 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
            Recente Social Berichten ({posts.length})
          </h4>
          <div className="space-y-3">
            {posts.map((post) => (
              <div
                key={post.id}
                className="p-4 bg-zinc-900/50 border border-zinc-850 rounded-2xl flex flex-col sm:flex-row gap-4 justify-between"
              >
                <div className="flex gap-4 min-w-0">
                  {post.imageUrl && (
                    <img
                      src={post.imageUrl}
                      alt=""
                      className="w-20 h-20 rounded-xl object-cover shrink-0 border border-zinc-800"
                    />
                  )}
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase ${
                          post.status === 'published'
                            ? 'bg-green-500/15 text-green-400'
                            : post.status === 'queued'
                            ? 'bg-amber-500/15 text-amber-400'
                            : 'bg-red-500/15 text-red-400'
                        }`}
                      >
                        {post.status === 'published'
                          ? 'Geplaatst'
                          : post.status === 'queued'
                          ? 'Klaargezet'
                          : post.status === 'partial'
                          ? 'Gedeeltelijk'
                          : 'Fout'}
                      </span>
                      {post.platforms.map((pl) => (
                        <span key={pl} className="text-[10px] font-mono text-zinc-400 uppercase">
                          • {pl}
                        </span>
                      ))}
                      <span className="text-[10px] font-mono text-zinc-600">
                        {new Date(post.createdAt).toLocaleString('nl-NL')}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-200 whitespace-pre-line break-words">{post.message}</p>
                    {post.results && Object.keys(post.results).length > 0 && (
                      <div className="text-[10px] font-mono text-zinc-500 space-y-0.5">
                        {Object.entries(post.results).map(([k, r]) => (
                          <div key={k}>
                            {k}: {r.status}
                            {r.message ? ` — ${r.message}` : ''}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex sm:flex-col items-end justify-end gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleCopyText(post.id, post.message)}
                    className="px-2.5 py-1.5 bg-zinc-900 hover:bg-royal-gold text-zinc-400 hover:text-black rounded-lg text-[10px] font-mono uppercase flex items-center gap-1 transition-colors"
                  >
                    {copiedId === post.id ? <Check size={11} /> : <Copy size={11} />}
                    {copiedId === post.id ? 'Gekopieerd' : 'Kopieer'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeletePost(post.id)}
                    className="p-1.5 text-zinc-600 hover:text-red-400 transition-colors"
                    title="Verwijder uit overzicht"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
