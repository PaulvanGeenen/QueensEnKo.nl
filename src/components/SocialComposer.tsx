import React, { useState, useEffect, useRef } from 'react';
import {
  Facebook,
  Instagram,
  Send,
  Image as ImageIcon,
  Check,
  AlertCircle,
  Clock,
  CheckCircle2,
  X,
  Sparkles,
  Copy,
  ExternalLink,
  Trash2,
  FolderOpen,
  Plus,
  Layers
} from 'lucide-react';
import { FileManager, StorageItem } from './FileManager';

interface SocialConfigStatus {
  facebook: boolean;
  instagram: boolean;
}

interface SocialPostRecord {
  id: string;
  message: string;
  imageUrl?: string;
  imageUrls?: string[];
  platforms: ('facebook' | 'instagram')[];
  status: 'published' | 'queued' | 'partial' | 'error';
  results?: Record<string, any>;
  createdAt: string;
}

interface SelectedMedia {
  id: string;
  file?: File;
  url: string;
  name: string;
  source: 'upload' | 'storage';
}

export default function SocialComposer() {
  const [message, setMessage] = useState('');
  const [selectedMedia, setSelectedMedia] = useState<SelectedMedia[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<{ facebook: boolean; instagram: boolean }>({
    facebook: true,
    instagram: true,
  });
  const [configured, setConfigured] = useState<SocialConfigStatus>({ facebook: false, instagram: false });
  const [posts, setPosts] = useState<SocialPostRecord[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'warning' | 'error'; text: string } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
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

  const handleFilesUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newItems: SelectedMedia[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      newItems.push({
        id: `upload_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
        file: f,
        url: URL.createObjectURL(f),
        name: f.name,
        source: 'upload',
      });
    }

    setSelectedMedia((prev) => [...prev, ...newItems]);
    setFeedback(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleLibrarySelect = (items: StorageItem[]) => {
    const newItems: SelectedMedia[] = items.map((item, idx) => ({
      id: `storage_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
      url: item.url || '',
      name: item.name,
      source: 'storage',
    }));

    setSelectedMedia((prev) => {
      // Voorkom duplicaten op basis van url
      const existingUrls = new Set(prev.map((p) => p.url));
      const filtered = newItems.filter((n) => !existingUrls.has(n.url));
      return [...prev, ...filtered];
    });

    setIsLibraryOpen(false);
    setFeedback(null);
  };

  const removeMediaItem = (id: string) => {
    setSelectedMedia((prev) => {
      const item = prev.find((p) => p.id === id);
      if (item?.file && item.url) {
        URL.revokeObjectURL(item.url);
      }
      return prev.filter((p) => p.id !== id);
    });
  };

  const clearAllMedia = () => {
    selectedMedia.forEach((m) => {
      if (m.file && m.url) URL.revokeObjectURL(m.url);
    });
    setSelectedMedia([]);
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
    if (!message.trim() && selectedMedia.length === 0) {
      setFeedback({ type: 'error', text: 'Typ eerst een bericht of kies minimaal één foto.' });
      return;
    }
    if (selectedPlatforms.instagram && selectedMedia.length === 0) {
      setFeedback({ type: 'error', text: 'Voor Instagram moet je altijd minimaal één foto kiezen.' });
      return;
    }
    if (selectedPlatforms.instagram && selectedMedia.length > 10) {
      setFeedback({ type: 'error', text: 'Instagram ondersteunt maximaal 10 foto\'s in één carrousel.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('message', message.trim());
      formData.append('platforms', JSON.stringify(platforms));

      // Lokale bestanden doorsturen
      const uploadFiles = selectedMedia.filter((m) => m.file).map((m) => m.file as File);
      uploadFiles.forEach((file) => {
        formData.append('images[]', file);
      });

      // Bibliotheek URLs doorsturen
      const libraryUrls = selectedMedia.filter((m) => !m.file && m.url).map((m) => m.url);
      if (libraryUrls.length > 0) {
        formData.append('imageUrls', JSON.stringify(libraryUrls));
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
        const countText = selectedMedia.length > 1 ? `met ${selectedMedia.length} foto's (als album/carrousel)` : '';
        setFeedback({
          type: 'success',
          text: `Gelukt! Je bericht ${countText} is direct geplaatst op de gekozen socials.`,
        });
        setMessage('');
        clearAllMedia();
      } else if (status === 'queued') {
        setFeedback({
          type: 'warning',
          text: 'Bericht & foto(\'s) zijn opgeslagen in de wachtrij.',
        });
        setMessage('');
        clearAllMedia();
      } else if (status === 'partial') {
        setFeedback({
          type: 'warning',
          text: 'Gedeeltelijk geplaatst. Controleer het resultaat hieronder bij Recente berichten.',
        });
      } else {
        const firstErr = Object.values(data.results || {})
          .map((r: any) => (r as any)?.message)
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
        className="p-6 md:p-8 bg-zinc-950 border border-zinc-900 rounded-3xl space-y-6 relative overflow-hidden shadow-2xl"
      >
        <div className="absolute top-0 right-0 w-80 h-80 bg-[radial-gradient(circle_at_top_right,rgba(212,175,55,0.08)_0%,transparent_70%)] pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-900 pb-5 relative z-10">
          <div>
            <h3 className="text-royal-gold text-lg font-bold italic font-sans flex items-center gap-2">
              Bericht & Foto's Publiceren
            </h3>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Plaats in één keer op de officiële Facebookpagina en het Instagram-account van Queens & Ko.
            </p>
          </div>

          <div className="flex items-center gap-2 font-mono text-[10px]">
            <span
              className={`px-2.5 py-1 rounded-full border flex items-center gap-1.5 ${
                configured.facebook
                  ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-500'
              }`}
            >
              <Facebook size={12} />
              {configured.facebook ? 'FB Actief' : 'FB Stand-by'}
            </span>
            <span
              className={`px-2.5 py-1 rounded-full border flex items-center gap-1.5 ${
                configured.instagram
                  ? 'bg-pink-500/10 border-pink-500/30 text-pink-400'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-500'
              }`}
            >
              <Instagram size={12} />
              {configured.instagram ? 'IG Actief' : 'IG Stand-by'}
            </span>
          </div>
        </div>

        {/* Duidelijke instructie voor bandleden */}
        <div className="p-4 bg-royal-gold/10 border border-royal-gold/30 rounded-2xl flex items-start gap-3.5 relative z-10">
          <div className="p-2 bg-royal-gold/20 text-royal-gold rounded-xl shrink-0 mt-0.5">
            <Sparkles size={18} />
          </div>
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-royal-gold uppercase tracking-wider font-mono">
              Hoe werkt dit voor de band?
            </h4>
            <p className="text-xs text-zinc-200 leading-relaxed font-sans">
              Typ hieronder je bericht, voeg eventueel foto's toe en klik onderaan op de gouden knop. 
              Je hoeft <strong>niet in te loggen op Facebook of Instagram</strong>; onze website publiceert het bericht direct automatisch namens Queens & Ko!
            </p>
          </div>
        </div>

        {/* Stap 1: Berichttekst */}
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

        {/* Stap 2: Foto's toevoegen (Enkel of Meerdere, Upload of Mediabibliotheek) */}
        <div className="space-y-3 relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider font-mono block">
              2. Foto('s) toevoegen {selectedPlatforms.instagram && <span className="text-pink-400">(verplicht voor Instagram)</span>}
            </label>
            {selectedMedia.length > 0 && (
              <button
                type="button"
                onClick={clearAllMedia}
                className="text-[10px] font-mono text-zinc-400 hover:text-red-400 flex items-center gap-1 self-start sm:self-auto"
              >
                <X size={12} /> Alles wissen
              </button>
            )}
          </div>

          {/* Action buttons: Upload of Kies uit bibliotheek */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-4 border-2 border-dashed border-zinc-800 hover:border-royal-gold/60 rounded-2xl bg-zinc-900/40 hover:bg-zinc-900/80 transition-all flex items-center gap-3 text-zinc-300 hover:text-white group text-left"
            >
              <div className="p-2.5 bg-zinc-800 group-hover:bg-royal-gold/20 text-zinc-400 group-hover:text-royal-gold rounded-xl transition-colors shrink-0">
                <ImageIcon size={20} />
              </div>
              <div>
                <p className="text-xs font-bold font-mono">Upload foto('s)</p>
                <p className="text-[10px] text-zinc-500 mt-0.5">Vanaf je computer of telefoon (meerdere mogelijk)</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setIsLibraryOpen(true)}
              className="p-4 border border-zinc-800 hover:border-royal-gold/60 rounded-2xl bg-zinc-900/60 hover:bg-zinc-900 transition-all flex items-center gap-3 text-zinc-300 hover:text-white group text-left"
            >
              <div className="p-2.5 bg-royal-gold/15 text-royal-gold rounded-xl transition-colors shrink-0">
                <FolderOpen size={20} />
              </div>
              <div>
                <p className="text-xs font-bold font-mono">Kies uit Bestandsbeheer</p>
                <p className="text-[10px] text-zinc-500 mt-0.5">Kies uit bandfoto's & uploads op de server</p>
              </div>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFilesUpload}
              className="hidden"
            />
          </div>

          {/* Lijst / Grid met geselecteerde foto's */}
          {selectedMedia.length > 0 && (
            <div className="space-y-2 pt-2">
              <div className="flex items-center gap-2 text-xs font-mono">
                {selectedMedia.length > 1 ? (
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-royal-gold/15 border border-royal-gold/30 text-royal-gold font-bold">
                    <Layers size={13} /> {selectedMedia.length} foto's geselecteerd: Wordt als Album op FB en Carrousel op IG geplaatst!
                  </span>
                ) : (
                  <span className="text-zinc-400">1 foto geselecteerd</span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 pt-1">
                {selectedMedia.map((media, index) => (
                  <div
                    key={media.id}
                    className="relative group rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-900 aspect-square shadow-lg"
                  >
                    <img
                      src={media.url}
                      alt={media.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />

                    {/* Volgordebadge */}
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-lg bg-black/80 backdrop-blur-sm text-[10px] font-mono font-bold text-royal-gold border border-royal-gold/30">
                      #{index + 1}
                    </div>

                    {/* Verwijderknop */}
                    <button
                      type="button"
                      onClick={() => removeMediaItem(media.id)}
                      className="absolute top-2 right-2 p-1.5 bg-black/80 hover:bg-red-600 text-white rounded-xl transition-colors shadow-md"
                      title="Verwijder foto"
                    >
                      <X size={13} />
                    </button>

                    {/* Bron label onderin */}
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 to-transparent p-2 text-[10px] font-mono text-zinc-300 truncate">
                      {media.name}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
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
          {isSubmitting
            ? 'Bezig met plaatsen op socials...'
            : `Plaats op aangevinkte socials ${selectedMedia.length > 1 ? `(${selectedMedia.length} foto's)` : ''}`}
        </button>
      </form>

      {/* Recente berichten / wachtrij */}
      {posts.length > 0 && (
        <div className="p-6 bg-zinc-950 border border-zinc-900 rounded-3xl space-y-4">
          <h4 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
            Recente Social Berichten ({posts.length})
          </h4>
          <div className="space-y-3">
            {posts.map((post) => {
              const displayImages = post.imageUrls && post.imageUrls.length > 0 ? post.imageUrls : (post.imageUrl ? [post.imageUrl] : []);
              return (
                <div
                  key={post.id}
                  className="p-4 bg-zinc-900/50 border border-zinc-850 rounded-2xl flex flex-col sm:flex-row gap-4 justify-between"
                >
                  <div className="flex gap-4 min-w-0">
                    {displayImages.length > 0 && (
                      <div className="flex gap-1.5 shrink-0">
                        {displayImages.slice(0, 3).map((imgUrl, i) => (
                          <img
                            key={i}
                            src={imgUrl}
                            alt=""
                            className="w-16 h-16 rounded-xl object-cover border border-zinc-800"
                          />
                        ))}
                        {displayImages.length > 3 && (
                          <div className="w-16 h-16 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-mono text-royal-gold font-bold">
                            +{displayImages.length - 3}
                          </div>
                        )}
                      </div>
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
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center justify-end gap-2 shrink-0 border-t sm:border-t-0 border-zinc-850 pt-2 sm:pt-0">
                    {post.results?.facebook?.postId && (
                      <a
                        href={`https://www.facebook.com/${post.results.facebook.postId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-blue-600/15 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/25 text-[11px] font-mono rounded-xl transition-all flex items-center gap-1.5"
                        title="Bekijk dit bericht direct op Facebook"
                      >
                        <ExternalLink size={12} />
                        <span>Bekijk op Facebook</span>
                      </a>
                    )}
                    {post.results?.instagram?.postId && (
                      <a
                        href="https://www.instagram.com/queensenko/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-pink-600/15 hover:bg-pink-600 text-pink-400 hover:text-white border border-pink-500/25 text-[11px] font-mono rounded-xl transition-all flex items-center gap-1.5"
                        title="Bekijk Instagram profiel"
                      >
                        <ExternalLink size={12} />
                        <span>Bekijk op Instagram</span>
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => handleCopyText(post.id, post.message)}
                      className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-mono rounded-xl transition-colors flex items-center gap-1.5"
                      title="Kopieer tekst"
                    >
                      <Copy size={12} />
                      <span>{copiedId === post.id ? 'Gekopieerd!' : 'Kopieer'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeletePost(post.id)}
                      className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
                      title="Verwijder uit overzicht"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL: Mediabibliotheek Picker */}
      {isLibraryOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6">
          <div className="w-full max-w-4xl max-h-[90vh] flex flex-col">
            <FileManager
              mode="picker"
              multiSelect={true}
              onSelect={handleLibrarySelect}
              onClose={() => setIsLibraryOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
