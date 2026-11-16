import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Plus, Save, Trash2, Calendar, MapPin, 
  Link as LinkIcon, DollarSign, Eye, EyeOff, 
  CheckCircle2, XCircle, ArrowLeft, MessageSquare,
  Edit3, X, RefreshCw, BarChart3, Users, Clock,
  Map, Laptop, Shield, Database, ListOrdered, Check, Mail, Copy, Download,
  ChevronLeft, ChevronRight, Facebook, Instagram, Share2, ExternalLink, Play
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip,
  BarChart, Bar, Cell, PieChart, Pie
} from 'recharts';
import { AgendaItem } from '../types';
import { SessionData, disableTracking } from '../lib/tracker';
import { 
  db, 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  deleteDoc, 
  query, 
  orderBy,
  onSnapshot
} from '../lib/firebase';
import BeheerMap from './BeheerMap';

interface DailySummaryData {
  id: string; // YYYY-MM-DD
  date: string;
  totalVisitors: number;
  avgDuration: number;
  cities: { [city: string]: number };
  devices: { [device: string]: number };
  os: { [os: string]: number };
  referrers: { [ref: string]: number };
  clicks: { [click: string]: number };
}

interface SubscriberData {
  id: string;
  email: string;
  subscribedAt: string;
  docId?: string;
}

export default function BeheerDashboard() {
  const [password, setPassword] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isFirestoreConnected, setIsFirestoreConnected] = useState(true);

  // Always force a fresh login by clearing any stored auth status on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('queens_ko_admin_auth');
      sessionStorage.removeItem('queens_ko_admin_auth');
    }
  }, []);
  
  const [activeTab, setActiveTab] = useState<'stats' | 'sessions' | 'agenda' | 'newsletter' | 'downloads' | 'map' | 'socials'>('stats');
  
  // States for Agenda
  const [agenda, setAgenda] = useState<AgendaItem[]>([]);
  const [editingItem, setEditingItem] = useState<AgendaItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // States for Visitor tracking analytics
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [dailySummaries, setDailySummaries] = useState<DailySummaryData[]>([]);
  const [isConsolidating, setIsConsolidating] = useState(false);
  const [weeksOffset, setWeeksOffset] = useState(0);

  // States for Custom Database Consolidation & Opschonen Modal
  const [showCleanupModal, setShowCleanupModal] = useState(false);
  const [cleanupStep, setCleanupStep] = useState<'password' | 'explanation' | 'progress' | 'success'>('password');
  const [cleanupPasswordInput, setCleanupPasswordInput] = useState('');
  const [cleanupModalError, setCleanupModalError] = useState('');
  const [sessionsToConsolidateCount, setSessionsToConsolidateCount] = useState(0);

  // States for Newsletter subscribers
  const [subscribers, setSubscribers] = useState<SubscriberData[]>([]);
  const [subscriberSearch, setSubscriberSearch] = useState('');
  const [isCopying, setIsCopying] = useState(false);
  const [copiedSocialField, setCopiedSocialField] = useState<'username' | 'password' | null>(null);

  // Common UI states
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);

  const correctPassword = 'KillerQueen';
  const navigate = useNavigate();

  // Handle Auth
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === correctPassword) {
      setIsAuthorized(true);
      setError('');
      sessionStorage.setItem('queens_ko_admin_auth', 'true');
      
      // Delete administrator's session from Firestore to avoid skewing analytics
      const mySessionId = sessionStorage.getItem('queens_ko_session_id');
      if (mySessionId) {
        deleteDoc(doc(db, 'sessions', mySessionId)).catch(err => {
          console.warn('[Admin] Failed to delete own session on login:', err);
        });
      }
      disableTracking();
      
      fetchData();
    } else {
      setError('Verkeerd wachtwoord');
    }
  };

  const handleLogout = () => {
    setIsAuthorized(false);
    sessionStorage.removeItem('queens_ko_admin_auth');
    setPassword('');
  };

  const fetchData = async () => {
    // Legacy helper; our live onSnapshot observers maintain synchronization automatically.
  };

  useEffect(() => {
    if (!isAuthorized) {
      setLoading(false);
      return;
    }

    if (!isFirestoreConnected) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    // 1. Subscribe to Agenda (Real-time snapshot)
    const qAgenda = query(collection(db, 'agenda'));
    const unsubAgenda = onSnapshot(qAgenda, (snap) => {
      const dataAgenda = snap.docs.map(d => d.data() as AgendaItem);
      setAgenda(dataAgenda);
      setLoading(false);
    }, (err) => {
      console.error('[Admin] Agenda subscription error:', err);
      const errMsg = err instanceof Error ? err.message : String(err);
      setError(`Fout bij het laden van live agenda: ${errMsg}`);
      setLoading(false);
    });

    // 2. Subscribe to Active visitor sessions (Real-time snapshot)
    const qSessions = query(collection(db, 'sessions'));
    const unsubSessions = onSnapshot(qSessions, (snap) => {
      const dataSessions = snap.docs.map(d => d.data() as SessionData);
      setSessions(dataSessions);
    }, (err) => {
      console.error('[Admin] Sessions subscription error:', err);
    });

    // 3. Subscribe to Consolidated daily summaries (Real-time snapshot)
    const qSummaries = query(collection(db, 'daily_summaries'));
    const unsubSummaries = onSnapshot(qSummaries, (snap) => {
      const dataSummaries = snap.docs.map(d => d.data() as DailySummaryData);
      setDailySummaries(dataSummaries);
    }, (err) => {
      console.error('[Admin] Daily summaries subscription error:', err);
    });

    // 4. Subscribe to Newsletter (Real-time snapshot)
    const qSubscribers = query(collection(db, 'newsletter'));
    const unsubSubscribers = onSnapshot(qSubscribers, (snap) => {
      const dataSubscribers = snap.docs.map(d => ({
        ...d.data() as SubscriberData,
        docId: d.id
      }));
      setSubscribers(dataSubscribers);
    }, (err) => {
      console.error('[Admin] Newsletter subscription error:', err);
    });

    return () => {
      unsubAgenda();
      unsubSessions();
      unsubSummaries();
      unsubSubscribers();
    };
  }, [isAuthorized, isFirestoreConnected]);

  const removeSubscriber = async (docId: string, email: string) => {
    if (window.confirm(`Weet u zeker dat u ${email} wilt afmelden en verwijderen van de nieuwsbrieflijst?`)) {
      try {
        setError('');
        await deleteDoc(doc(db, 'newsletter', docId));
        setSuccess('Abonnee succesvol afgemeld!');
        setTimeout(() => setSuccess(''), 3000);
        setSubscribers(prev => prev.filter(s => (s.docId || s.email) !== docId));
      } catch (err: any) {
        console.error('Delete subscriber error:', err);
        setError('Kan abonnee niet verwijderen.');
      }
    }
  };

  // Track session removals
  const removeSession = async (id: string) => {
    if (window.confirm('Weet u zeker dat u dit bezoekersjournaal wilt verwijderen?')) {
      try {
        setError('');
        await deleteDoc(doc(db, 'sessions', id));
        setSuccess('Bezoekersjournaal succesvol verwijderd!');
        setTimeout(() => setSuccess(''), 3000);
        // Refresh session list
        setSessions(prev => prev.filter(s => s.id !== id));
      } catch (err: any) {
        console.error('Delete session error:', err);
        setError('Kan sessie niet verwijderen.');
      }
    }
  };

  // Open Custom Consolidation & Cleanup Modal
  const openCleanupModal = () => {
    // Determine the count of sessions to consolidate (older than 4 hours)
    const fourHoursAgo = Date.now() - 4 * 60 * 60 * 1000;
    const count = sessions.filter(s => new Date(s.startedAt).getTime() < fourHoursAgo).length;
    setSessionsToConsolidateCount(count);
    
    setCleanupPasswordInput('');
    setCleanupModalError('');
    setCleanupStep('password');
    setShowCleanupModal(true);
  };

  // Verify custom password
  const verifyCleanupPassword = () => {
    if (cleanupPasswordInput === 'Luna') {
      setCleanupModalError('');
      setCleanupStep('explanation');
    } else {
      setCleanupModalError('Onjuist wachtwoord. Probeer het opnieuw.');
    }
  };

  // Convert raw visitor logs into Daily Summaries & Archive them cleanly
  const executeCleanup = async () => {
    try {
      setCleanupStep('progress');
      setIsConsolidating(true);
      setError('');
      
      // Let's keep sessions that started in the last 4 hours to avoid interrupting active viewers!
      const fourHoursAgo = Date.now() - 4 * 60 * 60 * 1000;
      const sessionsToConsolidate = sessions.filter(s => new Date(s.startedAt).getTime() < fourHoursAgo);

      if (sessionsToConsolidate.length === 0) {
        setIsConsolidating(false);
        setCleanupStep('success');
        return;
      }

      // Group sessions by day (YYYY-MM-DD)
      const groupedByDay: { [day: string]: SessionData[] } = {};
      sessionsToConsolidate.forEach(sess => {
        const day = sess.startedAt.substring(0, 10); // get YYYY-MM-DD
        if (!groupedByDay[day]) groupedByDay[day] = [];
        groupedByDay[day].push(sess);
      });

      // Loop through each grouped day and upsert to daily_summaries
      for (const [day, daySessions] of Object.entries(groupedByDay)) {
        const totalCount = daySessions.length;
        const totalDuration = daySessions.reduce((sum, s) => sum + s.duration, 0);
        const avgDuration = Math.round(totalDuration / totalCount);

        // Aggregate attributes
        const cities: { [k: string]: number } = {};
        const devices: { [k: string]: number } = {};
        const os: { [k: string]: number } = {};
        const referrers: { [k: string]: number } = {};
        const clicks: { [k: string]: number } = {};

        daySessions.forEach(s => {
          if (s.city) cities[s.city] = (cities[s.city] || 0) + 1;
          if (s.device) devices[s.device] = (devices[s.device] || 0) + 1;
          if (s.os) os[s.os] = (os[s.os] || 0) + 1;
          if (s.referrer) referrers[s.referrer] = (referrers[s.referrer] || 0) + 1;
          if (s.clicks) {
            s.clicks.forEach(c => {
              clicks[c.label] = (clicks[c.label] || 0) + 1;
            });
          }
        });

        // Check if a daily summary already exists for this date, to merge numbers!
        const existingDocRef = doc(db, 'daily_summaries', day);
        const matchSummary = dailySummaries.find(ds => ds.id === day);

        let consolidatedSummary: DailySummaryData;

        if (matchSummary) {
          // Merge with previous
          const prevTotal = matchSummary.totalVisitors;
          const newTotal = prevTotal + totalCount;
          const mergedAvgDuration = Math.round(((matchSummary.avgDuration * prevTotal) + totalDuration) / newTotal);

          // Merge Maps helper
          const mergeObj = (prev: any, current: any) => {
            const merged = { ...prev };
            Object.keys(current).forEach(k => {
              merged[k] = (merged[k] || 0) + current[k];
            });
            return merged;
          };

          consolidatedSummary = {
            id: day,
            date: day,
            totalVisitors: newTotal,
            avgDuration: mergedAvgDuration,
            cities: mergeObj(matchSummary.cities, cities),
            devices: mergeObj(matchSummary.devices, devices),
            os: mergeObj(matchSummary.os, os),
            referrers: mergeObj(matchSummary.referrers, referrers),
            clicks: mergeObj(matchSummary.clicks, clicks),
          };
        } else {
          consolidatedSummary = {
            id: day,
            date: day,
            totalVisitors: totalCount,
            avgDuration: avgDuration,
            cities,
            devices,
            os,
            referrers,
            clicks,
          };
        }

        // Save consolidated summary
        await setDoc(existingDocRef, consolidatedSummary);

        // Safely delete individual session records from database
        for (const s of daySessions) {
          await deleteDoc(doc(db, 'sessions', s.id));
        }
      }

      setSuccess('Database succesvol geschoond & detailed visitor logs als dagsamenvatting gearchiveerd!');
      setTimeout(() => setSuccess(''), 4000);
      setCleanupStep('success');

    } catch (err: any) {
      console.error('[Consolidation] Error during archive:', err);
      setCleanupModalError('Consolidatie mislukt: ' + (err.message || err));
      setCleanupStep('password');
    } finally {
      setIsConsolidating(false);
    }
  };

  // Identify and delete any admin visits/beheer visits from the sessions table
  const cleanUpAdminSessions = async () => {
    const password = window.prompt('Voer het wachtwoord in om de beheerbezoeken op te schonen:');
    if (password === null) return; // Geannuleerd
    if (password !== 'Luna') {
      alert('Onjuist wachtwoord. Actie geannuleerd.');
      return;
    }

    const adminSessionIdsToDelete: string[] = [];

    sessions.forEach(sess => {
      // 1. If session has clicks containing admin keywords
      const hasAdminClicks = sess.clicks && sess.clicks.some(clk => {
        if (!clk.label) return false;
        const label = clk.label.toLowerCase();
        return label.includes('beheer') || 
               label.includes('inloggen') || 
               label.includes('login') || 
               label.includes('wachtwoord') || 
               label.includes('dashboard') ||
               label.includes('consolideer') ||
               label.includes('nieuwsbrief') ||
               label.includes('abonnee') ||
               label.includes('afmelden') ||
               label.includes('persfotos') ||
               label.includes('sessie');
      });

      // 2. Or if they visited but have absolutely zero views on normal visitor sections
      const userSections = ['home', 'agenda', 'band', 'live', 'setlist', 'verhaal', 'media', 'contact'];
      const hasNormalViews = sess.views && Object.keys(sess.views).some(k => userSections.includes(k));

      // 3. Or if referrer contains "beheer"
      const isBeheerReferrer = sess.referrer && sess.referrer.toLowerCase().includes('beheer');

      if (hasAdminClicks || isBeheerReferrer || (!hasNormalViews && sess.duration > 0 && (!sess.views || Object.keys(sess.views).length === 0))) {
        adminSessionIdsToDelete.push(sess.id);
      }
    });

    if (adminSessionIdsToDelete.length === 0) {
      alert('Er zijn momenteel geen beheer-bezoeken gedetecteerd in de actieve sessies.');
      return;
    }

    const confirmClean = window.confirm(
      `Er zijn ${adminSessionIdsToDelete.length} bezoeken gedetecteerd die te maken hebben met de beheerpagina's (inlogpogingen, beheerder of onvoltooide beheer-sessies).\n\n` +
      `Wilt u deze ${adminSessionIdsToDelete.length} bezoeken nu permanent uit de database verwijderen om pure bezoekersdata te behouden?`
    );

    if (!confirmClean) return;

    try {
      setError('');
      let count = 0;
      for (const id of adminSessionIdsToDelete) {
        await deleteDoc(doc(db, 'sessions', id));
        count++;
      }
      setSuccess(`${count} beheer-sessies succesvol verwijderd uit de database!`);
      setTimeout(() => setSuccess(''), 3000);
      setSessions(prev => prev.filter(s => !adminSessionIdsToDelete.includes(s.id)));
    } catch (err: any) {
      console.error('[Admin] Fout bij opschonen beheer-sessies:', err);
      setError('Er is een fout opgetreden bij het verwijderen van de beheer-sessies.');
    }
  };

  // Helper date conversions for Event editor
  const toLocalISO = (dateStr: string | undefined) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '';
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    } catch {
      return '';
    }
  };

  const handleDateChange = (val: string, field: keyof typeof editingItem) => {
    if (!editingItem) return;
    if (!val) {
      setEditingItem({ ...editingItem, [field]: undefined });
      return;
    }
    try {
      const [d, t] = val.split('T');
      const [y, m, day] = d.split('-').map(Number);
      const [h, min] = t.split(':').map(Number);
      const date = new Date(y, m - 1, day, h, min);
      if (isNaN(date.getTime())) return;
      setEditingItem({ ...editingItem, [field]: date.toISOString() });
    } catch {
      console.error('Invalid date format');
    }
  };

  const startAddAgenda = () => {
    const now = new Date();
    const until = new Date();
    until.setFullYear(now.getFullYear() + 1);

    const newItem: AgendaItem = {
      id: Date.now().toString(),
      date: now.toISOString(),
      locationName: '',
      locationCity: '',
      address: '',
      infoLink: '',
      ticketPrice: '',
      displayFrom: now.toISOString(),
      displayUntil: until.toISOString(),
      isVisible: true,
      ticketLink: '',
      isSoldOut: false,
      comments: '',
    };
    setEditingItem(newItem);
  };

  const saveAgendaItem = async () => {
    if (!editingItem) return;
    const from = new Date(editingItem.displayFrom);
    const until = new Date(editingItem.displayUntil);
    if (from >= until) {
      setError('\'Toon vanaf\' moet voor \'Toon tot\' liggen');
      return;
    }

    const cleanData = JSON.parse(JSON.stringify(editingItem));
    try {
      setError('');
      setIsSaving(true);
      const docRef = doc(db, 'agenda', editingItem.id);
      await setDoc(docRef, cleanData);
      setSuccess('Agenda event succesvol opgeslagen!');
      setTimeout(() => setSuccess(''), 3000);
      setEditingItem(null);
      fetchData();
    } catch (err: any) {
      console.error('Agenda save failed:', err);
      setError('Krijg geen toestemming om agenda op te slaan.');
    } finally {
      setIsSaving(false);
    }
  };

  const removeAgendaItem = async (id: string) => {
    if (window.confirm('Weet u zeker dat u dit agenda item wilt verwijderen?')) {
      try {
        setError('');
        await deleteDoc(doc(db, 'agenda', id));
        setSuccess('Agenda item succesvol verwijderd!');
        setTimeout(() => setSuccess(''), 3000);
        fetchData();
      } catch (err: any) {
        console.error('Delete agenda error:', err);
        setError('Uitsluiting mislukt');
      }
    }
  };

  // Compute analytics from both daily summaries & active sessions
  const getCombinedVisitorOverTime = () => {
    const daysData: { [day: string]: number } = {};

    // 1. Put summary data
    dailySummaries.forEach(ds => {
      daysData[ds.date] = (daysData[ds.date] || 0) + ds.totalVisitors;
    });

    // 2. Combine with raw active session counters
    sessions.forEach(s => {
      try {
        const day = s.startedAt.substring(0, 10);
        daysData[day] = (daysData[day] || 0) + 1;
      } catch {}
    });

    // Generate exactly 14 dates based on weeksOffset (where 1 unit = 2 weeks = 14 days)
    const result: { date: string; bezoekers: number }[] = [];
    const today = new Date();
    
    // Starting point is today minus (weeksOffset * 14) days
    const offsetDays = weeksOffset * 14;
    
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - offsetDays - i);
      
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const dayStr = String(d.getDate()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${dayStr}`;
      
      result.push({
        date: formattedDate,
        bezoekers: daysData[formattedDate] || 0
      });
    }

    return result;
  };

  const getCombinedOrigins = () => {
    const raw: { [orig: string]: number } = {};

    dailySummaries.forEach(ds => {
      if (ds.referrers) {
        Object.entries(ds.referrers).forEach(([ref, num]) => {
          raw[ref] = (raw[ref] || 0) + Number(num);
        });
      }
    });

    sessions.forEach(s => {
      const ref = s.referrer || 'Direct';
      raw[ref] = (raw[ref] || 0) + 1;
    });

    return Object.entries(raw)
      .map(([origin, count]) => ({ name: origin, value: count }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  };

  const getCombinedCities = () => {
    const raw: { [city: string]: number } = {};

    dailySummaries.forEach(ds => {
      if (ds.cities) {
        Object.entries(ds.cities).forEach(([c, num]) => {
          raw[c] = (raw[c] || 0) + Number(num);
        });
      }
    });

    sessions.forEach(s => {
      if (s.city && s.city !== 'Onbekend') {
        raw[s.city] = (raw[s.city] || 0) + 1;
      }
    });

    return Object.entries(raw)
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  };

  const getCombinedDevices = () => {
    const raw: { [dev: string]: number } = {};

    dailySummaries.forEach(ds => {
      if (ds.devices) {
        Object.entries(ds.devices).forEach(([d, num]) => {
          raw[d] = (raw[d] || 0) + Number(num);
        });
      }
    });

    sessions.forEach(s => {
      const dev = s.device || 'Onbekend';
      raw[dev] = (raw[dev] || 0) + 1;
    });

    return Object.entries(raw).map(([name, value]) => ({ name, value }));
  };

  const getCombinedOS = () => {
    const raw: { [os: string]: number } = {};
    dailySummaries.forEach(ds => {
      if (ds.os) {
        Object.entries(ds.os).forEach(([o, num]) => {
          raw[o] = (raw[o] || 0) + Number(num);
        });
      }
    });
    sessions.forEach(s => {
      const os = s.os || 'Onbekend';
      raw[os] = (raw[os] || 0) + 1;
    });
    return Object.entries(raw).map(([name, value]) => ({ name, value }));
  };

  const getCombinedComponentFocus = () => {
    const raw: { [section: string]: number } = {};
    sessions.forEach(s => {
      if (s.views) {
        Object.entries(s.views).forEach(([section, sec]) => {
          raw[section] = (raw[section] || 0) + Number(sec);
        });
      }
    });
    return Object.entries(raw)
      .map(([section, seconds]) => ({ section, duur: Math.round(seconds / 60) })) // in minutes
      .sort((a, b) => b.duur - a.duur);
  };

  const getCombinedClicks = () => {
    const raw: { [label: string]: number } = {};

    dailySummaries.forEach(ds => {
      if (ds.clicks) {
        Object.entries(ds.clicks).forEach(([lbl, count]) => {
          raw[lbl] = (raw[lbl] || 0) + Number(count);
        });
      }
    });

    sessions.forEach(s => {
      if (s.clicks) {
        s.clicks.forEach(c => {
          raw[c.label] = (raw[c.label] || 0) + 1;
        });
      }
    });

    return Object.entries(raw)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  };

  const getAverageDurationFormatted = () => {
    let sum = 0;
    let count = 0;

    dailySummaries.forEach(ds => {
      sum += (ds.avgDuration * ds.totalVisitors);
      count += ds.totalVisitors;
    });

    sessions.forEach(s => {
      sum += s.duration;
      count += 1;
    });

    if (count === 0) return '00:00';
    const avgSec = Math.round(sum / count);
    const m = Math.floor(avgSec / 60);
    const s = avgSec % 60;
    return `${m}m ${s}s`;
  };

  const getTotalVisitorsCount = () => {
    const summaryTotal = dailySummaries.reduce((sum, ds) => sum + ds.totalVisitors, 0);
    return summaryTotal + sessions.length;
  };

  // UI rendering blocks
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-deep-black">
        <RefreshCw className="text-royal-gold animate-spin" size={48} />
      </div>
    );
  }

  // Password Wall
  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-deep-black p-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.05)_0%,transparent_70%)] pointer-events-none" />
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-zinc-950/60 backdrop-blur-xl border border-royal-gold/30 p-8 rounded-3xl shadow-2xl relative"
        >
          <div className="flex justify-center mb-6">
            <Link to="/" className="text-zinc-500 hover:text-royal-gold flex items-center gap-2 text-xs transition-colors font-mono uppercase tracking-widest">
              <ArrowLeft size={14} /> Terug naar website
            </Link>
          </div>
          
          <div className="text-center mb-6">
            <h2 className="text-3xl font-display font-extrabold text-royal-gold italic mb-1">Beheer Center</h2>
            <p className="text-zinc-500 text-xs font-mono uppercase tracking-widest">Queens & Ko Administratie</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-zinc-400 text-xs uppercase tracking-wider mb-2 font-mono">Toegangswachtwoord</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error === 'Verkeerd wachtwoord') {
                    setError('');
                  }
                }}
                className="w-full bg-black/60 border border-zinc-800 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-royal-gold/60 transition-colors placeholder:text-zinc-700"
                placeholder="Voer wachtwoord in..."
              />
            </div>
            {error && <p className="text-red-500 text-xs font-mono">{error}</p>}
            
            <button 
              type="submit"
              className="w-full bg-royal-gold text-deep-black font-extrabold py-3.5 rounded-xl hover:bg-white transition-colors uppercase tracking-widest text-xs"
            >
              Verifiëren
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  const combinedVisitors = getCombinedVisitorOverTime();
  const totalVisitors = getTotalVisitorsCount();
  const avgDuration = getAverageDurationFormatted();
  const topOrigins = getCombinedOrigins();
  const topCities = getCombinedCities();
  const devicesShare = getCombinedDevices();
  const osShare = getCombinedOS();
  const sectionVisits = getCombinedComponentFocus();
  const popularClicks = getCombinedClicks();

  return (
    <div className="min-h-screen bg-black text-white py-12 px-6">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Block */}
        <div className="flex flex-col lg:flex-row justify-between lg:items-center border-b border-zinc-900 pb-6 gap-4">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-zinc-500 hover:text-royal-gold transition-colors block p-1">
              <ArrowLeft size={28} />
            </Link>
            <div>
              <h1 className="text-3xl md:text-4xl font-display font-extrabold text-royal-gold italic">Beheer Center</h1>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                {isFirestoreConnected ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">Live Gekoppeld met TransIP MySQL</span>
                    <button
                      onClick={() => {
                        setIsFirestoreConnected(false);
                        setError('');
                      }}
                      className="text-[10px] text-red-500 hover:underline font-mono uppercase tracking-wider ml-1"
                      title="Verbreek live verbinding"
                    >
                      (Verbreek)
                    </button>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <span className="text-[10px] text-amber-500 font-mono uppercase tracking-widest font-bold">Standby-modus</span>
                    <button
                      onClick={() => setIsFirestoreConnected(true)}
                      className="px-2 py-0.5 bg-royal-gold/15 hover:bg-royal-gold text-royal-gold hover:text-black border border-royal-gold/30 rounded text-[9px] font-mono uppercase tracking-wider ml-1 transition-all"
                      title="Klik om verbinding te maken met de TransIP MySQL database"
                    >
                      Verbinden
                    </button>
                  </>
                )}
                <span className="text-zinc-700">•</span>
                <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider flex items-center gap-1">
                  <Database size={10} className="text-royal-gold" /> paulw6_QueensEnKo
                </span>
                <span className="text-zinc-700">•</span>
                <button 
                  onClick={handleLogout}
                  className="text-[10px] text-royal-gold hover:underline font-mono uppercase tracking-wider"
                >
                  Uitloggen
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button 
              onClick={() => setActiveTab('stats')}
              className={`px-5 py-2.5 rounded-xl font-mono text-xs uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'stats' ? 'bg-royal-gold text-deep-black font-extrabold' : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'}`}
            >
              <BarChart3 size={16} /> Statistieken
            </button>
            <button 
              onClick={() => setActiveTab('sessions')}
              className={`px-5 py-2.5 rounded-xl font-mono text-xs uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'sessions' ? 'bg-royal-gold text-deep-black font-extrabold' : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'}`}
            >
              <Users size={16} /> Bezoekersjournaal ({sessions.length})
            </button>
            <button 
              onClick={() => setActiveTab('agenda')}
              className={`px-5 py-2.5 rounded-xl font-mono text-xs uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'agenda' ? 'bg-royal-gold text-deep-black font-extrabold' : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'}`}
            >
              <Calendar size={16} /> Agenda & Shows ({agenda.length})
            </button>
            <button 
              onClick={() => setActiveTab('newsletter')}
              className={`px-5 py-2.5 rounded-xl font-mono text-xs uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'newsletter' ? 'bg-royal-gold text-deep-black font-extrabold' : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'}`}
            >
              <Mail size={16} /> Nieuwsbrief ({subscribers.length})
            </button>
            <button 
              onClick={() => setActiveTab('downloads')}
              className={`px-5 py-2.5 rounded-xl font-mono text-xs uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'downloads' ? 'bg-royal-gold text-deep-black font-extrabold' : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'}`}
            >
              <Download size={16} /> Bestanden
            </button>
            <button 
              onClick={() => setActiveTab('map')}
              className={`px-5 py-2.5 rounded-xl font-mono text-xs uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'map' ? 'bg-royal-gold text-deep-black font-extrabold' : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'}`}
            >
              <Map size={16} /> Bezoekerskaart
            </button>
            <button 
              onClick={() => setActiveTab('socials')}
              className={`px-5 py-2.5 rounded-xl font-mono text-xs uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'socials' ? 'bg-royal-gold text-deep-black font-extrabold' : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'}`}
            >
              <Share2 size={16} /> Social Media
            </button>
          </div>
        </div>

        {/* Global Notifications Banners */}
        {success && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-green-500/10 border border-green-500 text-green-400 rounded-2xl text-center text-sm font-mono flex items-center justify-center gap-2">
            <CheckCircle2 size={18} /> {success}
          </motion.div>
        )}
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="space-y-4"
          >
            <div className="p-4 bg-red-500/10 border border-red-500 text-red-400 rounded-2xl text-center text-sm font-mono flex items-center justify-center gap-2">
              <XCircle size={18} /> {error}
            </div>
            
            {(error.includes('429') || error.includes('Quota exceeded') || error.includes('RESOURCE_EXHAUSTED')) && (
              <div className="p-6 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-amber-500/15 rounded-xl text-amber-500 shrink-0 mt-0.5">
                    <Database size={20} />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-amber-500 font-bold text-sm">Databaseverbinding tijdelijk onderbroken</h4>
                    <p className="text-zinc-300 text-xs leading-relaxed">
                      De verbinding met de TransIP MySQL-database gaf een tijdelijke fout. Klik hieronder om opnieuw te verbinden.
                    </p>
                  </div>
                </div>
                
                <div className="pl-11 space-y-3">
                  <div className="pt-2 flex flex-wrap gap-3">
                    <button
                      onClick={() => {
                        setError('');
                        setIsFirestoreConnected(false);
                        setTimeout(() => {
                          setIsFirestoreConnected(true);
                        }, 100);
                      }}
                      className="px-4 py-2 bg-royal-gold hover:bg-white text-black font-extrabold text-[11px] rounded-xl transition-all uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-royal-gold/10"
                    >
                      <Database size={13} /> Opnieuw Verbinden (Hertesten)
                    </button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Connection standby panel */}
        {!isFirestoreConnected && activeTab !== 'downloads' && activeTab !== 'socials' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 md:p-8 bg-zinc-950 border border-zinc-900 rounded-3xl space-y-6 shadow-xl relative overflow-hidden"
          >
            {/* Background ambient accent */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-royal-gold/5 blur-[100px] rounded-full pointer-events-none" />

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-500 border border-amber-500/15 shrink-0 animate-pulse">
                  <Database size={28} />
                </div>
                <div className="space-y-3">
                  <div>
                    <h3 className="text-white text-lg font-bold flex items-center gap-2">
                      <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping shrink-0" />
                      Beheer Center is Standby (Gegevens Laden)
                    </h3>
                    <p className="text-sm text-zinc-300 mt-1.5 leading-relaxed max-w-2xl">
                      Om de website snel te houden en serverbronnen te sparen, is de live verbinding tijdelijk inactief. U moet eerst verbinding maken om uw gegevens te tonen.
                    </p>
                  </div>

                  <div className="p-4 bg-zinc-900/40 rounded-2xl border border-zinc-900 space-y-2">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Hoe werkt het?</span>
                    <ul className="text-xs text-zinc-400 space-y-1.5 list-disc pl-4 leading-relaxed">
                      <li>
                        Klik rechts op de goudkleurige knop <strong className="text-royal-gold font-semibold">"Start Live Verbinding"</strong>.
                      </li>
                      <li>
                        Alle live gegevens zoals de <strong className="text-white font-medium">agenda en shows</strong>, <strong className="text-white font-medium">statistieken</strong> en <strong className="text-white font-medium">nieuwsbrieven</strong> worden direct ingeladen.
                      </li>
                      <li>
                        Daarna kunt u direct items toevoegen, wijzigen en opslaan.
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="shrink-0 w-full lg:w-auto">
                <button
                  onClick={() => setIsFirestoreConnected(true)}
                  className="w-full lg:w-auto px-8 py-4 bg-royal-gold hover:bg-white text-black font-extrabold text-xs rounded-xl transition-all duration-300 uppercase tracking-widest flex items-center justify-center gap-3 shadow-lg shadow-royal-gold/10 hover:shadow-white/20 transform hover:-translate-y-0.5 active:translate-y-0"
                >
                  <Database size={16} className="animate-bounce" /> Start Live Verbinding
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Tab Switcher Body */}
        <AnimatePresence mode="wait">
          
          {/* TAB 1: STATISTICS */}
          {activeTab === 'stats' && (
            <motion.div 
              key="stats-tab" 
              initial={{ opacity: 0, y: 15 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              
              {/* Highlight KPI metrics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                <div className="bg-zinc-950 border border-zinc-900 p-6 rounded-2xl flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-zinc-500 text-xs uppercase tracking-widest font-mono">Totaal Gemeten Bezoeken</span>
                    <h5 className="text-3xl font-bold text-white tracking-tight">{totalVisitors}</h5>
                    <p className="text-[10px] text-zinc-600 font-mono">Consolidatie + actieve sessies</p>
                  </div>
                  <div className="p-4 bg-royal-gold/10 rounded-xl text-royal-gold">
                    <Users size={28} />
                  </div>
                </div>

                <div className="bg-zinc-950 border border-zinc-900 p-6 rounded-2xl flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-zinc-500 text-xs uppercase tracking-widest font-mono">Gemiddelde Sessieduur</span>
                    <h5 className="text-3xl font-bold text-royal-gold tracking-tight">{avgDuration}</h5>
                    <p className="text-[10px] text-zinc-600 font-mono">Tijd doorgebracht op de site</p>
                  </div>
                  <div className="p-4 bg-royal-gold/10 rounded-xl text-royal-gold">
                    <Clock size={28} />
                  </div>
                </div>

                {/* DB growth cleanup controller */}
                <div className="bg-zinc-950 border border-royal-gold/20 p-6 rounded-2xl flex flex-col justify-between">
                  <div className="flex justify-between items-start gap-3">
                    <div className="space-y-1">
                      <span className="text-zinc-500 text-xs uppercase tracking-widest font-mono">Database Groeiherstel</span>
                      <h5 className="text-base font-bold text-white tracking-tight">Consolideren & Opschonen</h5>
                    </div>
                    <div className="p-2 bg-royal-gold/10 rounded-lg text-royal-gold">
                      <Database size={18} />
                    </div>
                  </div>
                  
                  <div className="mt-4 flex items-center justify-between gap-2 border-t border-zinc-900 pt-3">
                    <span className="text-[10px] text-zinc-500 font-mono leading-tight">Oudere logs omzetten naar summaries, ruimt raw records op.</span>
                    <button 
                      onClick={openCleanupModal}
                      disabled={isConsolidating}
                      className="px-4 py-2 bg-royal-gold hover:bg-white text-black font-extrabold text-[10px] rounded-lg transition-colors whitespace-nowrap uppercase tracking-wider flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {isConsolidating ? <RefreshCw className="animate-spin" size={12} /> : null}
                      Opschonen
                    </button>
                  </div>
                </div>

              </div>

              {/* Graphic charts: visitors line graph & locations */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Recharts Area Visitor Graph */}
                <div className="lg:col-span-2 bg-zinc-950 border border-zinc-900 rounded-2xl p-6 flex flex-col justify-between h-[480px]">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <h3 className="text-zinc-500 text-xs uppercase tracking-widest font-mono">Bezoekersverkeer</h3>
                      <h4 className="text-royal-gold text-lg font-bold italic">
                        {weeksOffset === 0 ? 'Aantal bezoekers (afgelopen 14 dagen)' : `Bezoekers (${weeksOffset * 2} tot ${(weeksOffset + 1) * 2} weken geleden)`}
                      </h4>
                    </div>
                    
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <button
                        onClick={() => setWeeksOffset(prev => prev + 1)}
                        className="px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg border border-zinc-800 transition-colors flex items-center justify-center gap-1 text-[11px] font-mono animate-none"
                        title="2 weken terug in de tijd"
                      >
                        <ChevronLeft size={13} /> Ouder
                      </button>
                      
                      <span className="text-[11px] font-mono text-zinc-500 px-1 select-none whitespace-nowrap">
                        {weeksOffset === 0 ? 'Heden' : `-${weeksOffset * 2} w`}
                      </span>

                      <button
                        onClick={() => setWeeksOffset(prev => Math.max(0, prev - 1))}
                        disabled={weeksOffset === 0}
                        className="px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-zinc-900 text-zinc-400 hover:text-white disabled:text-zinc-600 rounded-lg border border-zinc-800 transition-colors flex items-center justify-center gap-1 text-[11px] font-mono"
                        title="2 weken vooruit in de tijd"
                      >
                        Nieuwer <ChevronRight size={13} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="w-full h-[320px] mt-4">
                    {combinedVisitors.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={combinedVisitors} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                          <defs>
                            <linearGradient id="visitorColor" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#d4af37" stopOpacity={0.4}/>
                              <stop offset="95%" stopColor="#d4af37" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="date" stroke="#4b5563" fontSize={10} fontFamily="monospace" />
                          <YAxis stroke="#4b5563" fontSize={10} fontFamily="monospace" allowDecimals={false} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '12px' }}
                            labelStyle={{ color: '#d4af37', fontFamily: 'monospace', fontWeight: 'bold' }}
                            itemStyle={{ color: '#ffffff', fontFamily: 'sans-serif' }}
                          />
                          <Area type="monotone" dataKey="bezoekers" stroke="#d4af37" strokeWidth={2} fillOpacity={1} fill="url(#visitorColor)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center font-mono text-zinc-600 text-xs">
                        Nog geen data beschikbaar over bezoekers.
                      </div>
                    )}
                  </div>
                </div>

                {/* Geografie Snelkoppeling / Teaser Card */}
                <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6 flex flex-col justify-between h-[480px]">
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <h3 className="text-zinc-550 text-xs uppercase tracking-widest font-mono">Geografie Snelkoppeling</h3>
                      <h4 className="text-royal-gold text-lg font-bold italic">Bezoekerskaart</h4>
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                      Volg in real-time waar je websitebezoekers vandaan komen binnen Nederland. Bekijk actieve locaties, bezoekersaantallen en gedetailleerde demografische ranglijsten op de interactieve kaart.
                    </p>
                    
                    <div className="bg-black/60 border border-zinc-900 rounded-2xl p-4 space-y-2.5 font-mono text-xs mt-2">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-zinc-500 uppercase tracking-wider">Unieke steden:</span>
                        <span className="text-white font-bold">{
                          Array.from(new Set(sessions.map(s => s.city).filter(c => c && c !== 'Onbekend'))).length
                        }</span>
                      </div>
                      <div className="flex justify-between items-center text-[11px] border-t border-zinc-900 pt-2.5">
                        <span className="text-zinc-500 uppercase tracking-wider">Actieve sessies:</span>
                        <span className="text-royal-gold font-bold">{sessions.length}</span>
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={() => setActiveTab('map')}
                    className="w-full py-3.5 bg-royal-gold hover:bg-white text-black font-extrabold rounded-xl transition-colors text-xs uppercase tracking-wider flex items-center justify-center gap-2 mt-4"
                  >
                    <Map size={14} /> Open Bezoekerskaart
                  </button>
                </div>

              </div>

              {/* Devices and Clicks behaviors */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Screen platform & Referrers widget */}
                <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6 space-y-6">
                  <div>
                    <h3 className="text-zinc-500 text-xs uppercase tracking-widest font-mono">Apparaat & Besturingssysteem</h3>
                    <h4 className="text-royal-gold text-base font-bold italic mt-0.5">Systeemverdeling</h4>
                  </div>

                  {/* Horizontals bars mapping devices */}
                  <div className="space-y-4 font-mono text-xs">
                    <div>
                      <p className="text-zinc-500 mb-1.5 uppercase tracking-wider text-[10px]">Apparaattype</p>
                      <div className="space-y-2">
                        {devicesShare.map((item, i) => {
                          const total = devicesShare.reduce((a, b) => a + b.value, 0) || 1;
                          const pct = Math.round((item.value / total) * 100);
                          return (
                            <div key={i} className="space-y-1">
                              <div className="flex justify-between text-[11px]">
                                <span className="text-zinc-300 font-bold">{item.name}</span>
                                <span className="text-royal-gold font-bold">{pct}% ({item.value})</span>
                              </div>
                              <div className="h-2 bg-zinc-900 rounded-full overflow-hidden">
                                <div className="h-full bg-royal-gold rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          );
                        })}
                        {devicesShare.length === 0 && <span className="text-zinc-600 font-mono text-[11px]">Geen gegevens beschikbaar</span>}
                      </div>
                    </div>

                    <div className="border-t border-zinc-900 pt-4">
                      <p className="text-zinc-500 mb-1.5 uppercase tracking-wider text-[10px]">Besturingssysteem (OS)</p>
                      <div className="space-y-2">
                        {osShare.map((item, i) => {
                          const total = osShare.reduce((a, b) => a + b.value, 0) || 1;
                          const pct = Math.round((item.value / total) * 100);
                          return (
                            <div key={i} className="space-y-1">
                              <div className="flex justify-between text-[11px]">
                                <span className="text-zinc-300 font-bold">{item.name}</span>
                                <span className="text-royal-gold font-bold">{pct}% ({item.value})</span>
                              </div>
                              <div className="h-2 bg-zinc-900 rounded-full overflow-hidden">
                                <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          );
                        })}
                        {osShare.length === 0 && <span className="text-zinc-600 font-mono text-[11px]">Geen gegevens beschikbaar</span>}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Referrers List and scroll view focus */}
                <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-zinc-500 text-xs uppercase tracking-widest font-mono">Herkomst</h3>
                      <h4 className="text-royal-gold text-base font-bold italic mt-0.5">Top Verwijzingsbronnen</h4>
                    </div>

                    <div className="divide-y divide-zinc-900">
                      {topOrigins.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center py-2.5 font-mono text-xs">
                          <span className="text-zinc-300 truncate max-w-[200px]" title={item.name}>{item.name}</span>
                          <span className="text-royal-gold font-bold bg-royal-gold/10 px-2 py-0.5 rounded">{item.value} x</span>
                        </div>
                      ))}
                      {topOrigins.length === 0 && (
                        <p className="text-zinc-650 italic text-[11px] py-4 text-center font-mono">Nog geen logs</p>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-zinc-900 pt-4 mt-4">
                    <div>
                      <h4 className="text-zinc-500 text-[10px] uppercase tracking-widest font-mono mb-2">Populairste secties (duur in min)</h4>
                    </div>
                    <div className="space-y-2 font-mono text-xs">
                      {sectionVisits.slice(0, 4).map((view, i) => (
                        <div key={i} className="flex items-center justify-between text-[11px]">
                          <span className="text-zinc-400 capitalize">#{view.section}</span>
                          <span className="text-royal-gold font-bold">{view.duur} min</span>
                        </div>
                      ))}
                      {sectionVisits.length === 0 && (
                        <span className="text-zinc-650 font-mono text-[11px] block text-center">Nog geen weergavetijd</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Popular button clicks and action counts */}
                <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6 flex flex-col justify-between">
                  <div className="space-y-4 w-full">
                    <div>
                      <h3 className="text-zinc-500 text-xs uppercase tracking-widest font-mono">Klikgedrag</h3>
                      <h4 className="text-royal-gold text-base font-bold italic mt-0.5">Populaire Knopklikken</h4>
                    </div>

                    <div className="space-y-3 font-mono text-xs">
                      {popularClicks.length > 0 ? (
                        popularClicks.slice(0, 6).map((click, index) => (
                          <div key={index} className="space-y-1">
                            <div className="flex justify-between text-[11px]">
                              <span className="text-zinc-300 truncate max-w-[180px]" title={click.label}>
                                {index + 1}. {click.label}
                              </span>
                              <span className="text-royal-gold font-bold">{click.count}x</span>
                            </div>
                            <div className="h-1 bg-zinc-950 rounded overflow-hidden">
                              <div 
                                className="h-full bg-amber-500 rounded" 
                                style={{ width: `${Math.min(100, (click.count / (popularClicks[0]?.count || 1)) * 100)}%` }} 
                              />
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-zinc-650 font-mono text-[11px] text-center py-6">Geen knopklikken vastgelegd...</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="bg-royal-gold/5 border border-royal-gold/15 p-3 rounded-xl mt-4">
                    <p className="text-[10px] font-sans text-zinc-400 leading-normal">
                      <Shield className="inline-block text-royal-gold mr-1" size={12} />
                      Audits en clicks worden volledig anoniem opgeslagen om de privacy van bezoekers te waarborgen.
                    </p>
                  </div>
                </div>

              </div>
              
            </motion.div>
          )}

          {/* TAB 2: ACTIVE SESSIONS LIST (GRIDVIEW) */}
          {activeTab === 'sessions' && (
            <motion.div 
              key="sessions-tab" 
              initial={{ opacity: 0, y: 15 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -15 }}
              className="space-y-4"
            >
              <div className="flex flex-col sm:flex-row justify-between sm:items-center bg-zinc-950/40 p-5 border border-zinc-900 rounded-2xl gap-4">
                <div>
                  <h3 className="text-sm font-bold text-white">Actieve Bezoekerssessies</h3>
                  <p className="text-xs text-zinc-500">Toont live en recente journals uit de database</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <button 
                    onClick={cleanUpAdminSessions}
                    className="px-4 py-2 bg-red-500/10 border border-red-500/25 rounded-xl text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-all flex items-center gap-1.5 text-xs font-mono font-bold"
                  >
                    <Trash2 size={14} /> Schoon Beheerbezoeken Op
                  </button>
                  <button 
                    onClick={fetchData} 
                    className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 hover:text-royal-gold hover:border-royal-gold/30 transition-all flex items-center gap-1.5 text-xs font-mono"
                  >
                    <RefreshCw size={14} /> Ververs lijst
                  </button>
                </div>
              </div>

              {/* Responsive GridView table */}
              <div className="bg-zinc-950/80 border border-zinc-800/60 rounded-2xl overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse font-sans">
                    <thead>
                      <tr className="bg-zinc-900/50 border-b border-zinc-800 text-[11px] font-mono text-zinc-450 uppercase tracking-widest">
                        <th className="p-4 font-bold">Details & Locatie</th>
                        <th className="p-4 font-bold">Referrer</th>
                        <th className="p-4 font-bold">Systeem</th>
                        <th className="p-4 font-bold">Duur & Activiteit</th>
                        <th className="p-4 font-bold">Actiepad</th>
                        <th className="p-4 text-center font-bold">Beheren</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900">
                      {sessions
                        .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
                        .map((sess) => {
                          const m = Math.floor(sess.duration / 60);
                          const s = sess.duration % 60;
                          const hasClicks = sess.clicks && sess.clicks.length > 0;
                          
                          return (
                            <tr key={sess.id} className="hover:bg-zinc-900/40 transition-all text-xs border-zinc-900 group">
                              
                              <td className="p-4 space-y-1">
                                <div className="font-mono text-[10px] text-zinc-500 font-bold">{sess.id}</div>
                                <div className="font-bold flex items-center gap-1 text-zinc-200">
                                  <MapPin size={12} className="text-royal-gold" /> {sess.city || 'Onbekend'}
                                  <span className="text-[10px] text-zinc-550">({sess.country})</span>
                                </div>
                                <div className="text-[9px] text-zinc-500">Gestart: {new Date(sess.startedAt).toLocaleString('nl-NL')}</div>
                              </td>

                              <td className="p-4">
                                <span className="bg-zinc-900 border border-zinc-800/80 px-2 py-1 rounded text-zinc-400 font-mono text-[10px] inline-block max-w-[150px] truncate" title={sess.referrer}>
                                  {sess.referrer || 'Direct'}
                                </span>
                              </td>

                              <td className="p-4 space-y-1">
                                <div className="font-mono font-bold text-zinc-300 flex items-center gap-1.5">
                                  <Laptop size={12} className="text-zinc-500" />
                                  <span>{sess.device} / {sess.os}</span>
                                </div>
                                <div className="text-[9px] text-zinc-550 truncate max-w-[140px]" title={sess.userAgent}>
                                  {sess.userAgent}
                                </div>
                              </td>

                              <td className="p-4 space-y-1">
                                <div className="font-medium text-white flex items-center gap-1">
                                  <Clock size={12} className="text-royal-gold" /> 
                                  <span>{m > 0 ? `${m}m ` : ''}{s}s</span>
                                </div>
                                {/* section times inline overview */}
                                {sess.views && Object.keys(sess.views).length > 0 ? (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {Object.entries(sess.views).map(([sec, secDur]) => (
                                      <span key={sec} className="text-[9px] bg-zinc-900 border border-zinc-850 text-royal-gold px-1.5 py-0.2 rounded font-mono">
                                        #{sec}: {secDur}s
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-[9px] text-zinc-600 block">Geen actieve weergaven</span>
                                )}
                              </td>

                              <td className="p-4">
                                {hasClicks ? (
                                  <div className="max-w-[190px] max-h-[64px] overflow-y-auto space-y-0.5 scrollbar-hide">
                                    {sess.clicks.map((clk, idx) => (
                                      <div key={idx} className="text-[9px] font-mono text-zinc-400 border border-zinc-900 bg-[#09090b] p-1 rounded">
                                        [{new Date(clk.timestamp).toLocaleTimeString()}] {clk.label}
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-zinc-600 font-mono italic">Geen interacties</span>
                                )}
                              </td>

                              <td className="p-4 text-center">
                                <button
                                  onClick={() => removeSession(sess.id)}
                                  className="p-2 border border-transparent bg-zinc-900/50 rounded-xl hover:bg-black text-zinc-500 hover:text-red-500 transition-colors"
                                  title="Journaal permanent verwijderen"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      {sessions.length === 0 && (
                        <tr>
                          <td colSpan={6} className="text-center p-20 text-zinc-500 font-mono">
                            Er zijn momenteel geen actieve bezoekerssessies in de database.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 3: AGENDA BEHEER (EVENT EDITOR & CRUDS) */}
          {activeTab === 'agenda' && (
            <motion.div 
              key="agenda-tab" 
              initial={{ opacity: 0, y: 15 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -15 }}
              className="space-y-4"
            >
              
              <div className="flex justify-between items-center bg-zinc-950 p-4 border border-zinc-900 rounded-2xl">
                <div>
                  <h3 className="text-sm font-bold text-white">Shows & Agenda Beheer</h3>
                  <p className="text-xs text-zinc-500">Muteren, toevoegen en verwijderen van optredens</p>
                </div>
                {!editingItem && (
                  <button 
                    onClick={startAddAgenda}
                    className="flex items-center gap-1.5 bg-royal-gold text-deep-black font-extrabold px-4.5 py-2.5 rounded-xl hover:bg-white transition-colors text-xs font-mono uppercase tracking-wider"
                  >
                    <Plus size={16} /> Show Toevoegen
                  </button>
                )}
              </div>

              {editingItem ? (
                /* Edit Overlay inline form */
                <motion.div 
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-zinc-950 border border-royal-gold/30 p-8 rounded-3xl"
                >
                  <div className="flex justify-between items-center mb-6 border-b border-zinc-900 pb-3">
                    <h3 className="text-lg font-bold text-white italic tracking-wide">
                      {agenda.find(i => i.id === editingItem.id) ? 'Bestaand Optreden Wijzigen' : 'Nieuw Optreden Selecteren'}
                    </h3>
                    <button onClick={() => setEditingItem(null)} className="text-zinc-500 hover:text-white block p-1">
                      <X size={24} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-sans">
                    
                    {/* States selectors */}
                    <div className="md:col-span-2 flex gap-4">
                      <button 
                        onClick={() => setEditingItem({ ...editingItem, isVisible: !editingItem.isVisible })}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border transition-all text-xs uppercase tracking-wider font-semibold ${editingItem.isVisible ? 'bg-royal-gold/15 border-royal-gold/50 text-royal-gold' : 'bg-zinc-900/50 border-zinc-900 text-zinc-600'}`}
                      >
                        {editingItem.isVisible ? <Eye size={16} /> : <EyeOff size={16} />}
                        {editingItem.isVisible ? 'Publiek Zichtbaar' : 'Verborgen / Concept'}
                      </button>
                      <button 
                        onClick={() => setEditingItem({ ...editingItem, isSoldOut: !editingItem.isSoldOut })}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border transition-all text-xs uppercase tracking-wider font-semibold ${editingItem.isSoldOut ? 'bg-red-500/15 border-red-500/40 text-red-500' : 'bg-green-500/15 border-green-500/40 text-green-400'}`}
                      >
                        {editingItem.isSoldOut ? <XCircle size={16} /> : <CheckCircle2 size={16} />}
                        {editingItem.isSoldOut ? 'Uitverkocht!' : 'Tickets Beschikbaar'}
                      </button>
                    </div>

                    {/* Date picker */}
                    <div className="space-y-2">
                      <label className="block text-zinc-400 text-xs font-mono uppercase">Datum & Tijd optreden</label>
                      <input 
                        type="datetime-local" 
                        value={toLocalISO(editingItem.date)}
                        onChange={(e) => handleDateChange(e.target.value, 'date')}
                        style={{ colorScheme: 'dark' }}
                        className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-royal-gold outline-none transition-colors accent-royal-gold"
                      />
                    </div>

                    {/* VenueName */}
                    <div className="space-y-2">
                      <label className="block text-zinc-400 text-xs font-mono uppercase">Locatie of Zaalnaam</label>
                      <input 
                        type="text" 
                        value={editingItem.locationName}
                        onChange={(e) => setEditingItem({ ...editingItem, locationName: e.target.value })}
                        className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-royal-gold outline-none transition-colors"
                        placeholder="bijv. Chassé Theater, Breda"
                      />
                    </div>

                    {/* Address */}
                    <div className="space-y-2">
                      <label className="block text-zinc-400 text-xs font-mono uppercase">Adres</label>
                      <input 
                        type="text" 
                        value={editingItem.address || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, address: e.target.value })}
                        className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-royal-gold outline-none transition-colors"
                        placeholder="Straatnaam & nr."
                      />
                    </div>

                    {/* City */}
                    <div className="space-y-2">
                      <label className="block text-zinc-400 text-xs font-mono uppercase">Plaats / Stad</label>
                      <input 
                        type="text" 
                        value={editingItem.locationCity}
                        onChange={(e) => setEditingItem({ ...editingItem, locationCity: e.target.value })}
                        className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-royal-gold outline-none transition-colors"
                        placeholder="bijv. Breda"
                      />
                    </div>

                    {/* Price */}
                    <div className="space-y-2">
                      <label className="block text-zinc-400 text-xs font-mono uppercase">Ticket Prijs</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-zinc-500">€</span>
                        <input 
                          type="text" 
                          value={editingItem.ticketPrice}
                          onChange={(e) => setEditingItem({ ...editingItem, ticketPrice: e.target.value })}
                          className="w-full bg-black border border-zinc-800 rounded-xl pl-9 pr-4 py-3 text-white focus:border-royal-gold outline-none transition-colors"
                          placeholder="bijv. 17.50"
                        />
                      </div>
                    </div>

                    {/* Venue Link */}
                    <div className="space-y-2">
                      <label className="block text-zinc-400 text-xs font-mono uppercase">Informatie / Venue URL</label>
                      <input 
                        type="text" 
                        value={editingItem.infoLink}
                        onChange={(e) => setEditingItem({ ...editingItem, infoLink: e.target.value })}
                        className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-royal-gold outline-none transition-colors"
                        placeholder="https://..."
                      />
                    </div>

                    {/* Ticket Link */}
                    <div className="space-y-2 md:col-span-2">
                      <label className="block text-zinc-400 text-xs font-mono uppercase">Directe Kaartverkoop Link</label>
                      <input 
                        type="text" 
                        value={editingItem.ticketLink}
                        onChange={(e) => setEditingItem({ ...editingItem, ticketLink: e.target.value })}
                        className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-royal-gold outline-none transition-colors"
                        placeholder="https://..."
                      />
                    </div>

                    {/* Display From / Display Until scheduling */}
                    <div className="space-y-2">
                      <label className="block text-zinc-400 text-xs font-mono uppercase">Publicatiedatum Vanaf (Toon vanaf)</label>
                      <input 
                        type="datetime-local" 
                        value={toLocalISO(editingItem.displayFrom)}
                        onChange={(e) => handleDateChange(e.target.value, 'displayFrom')}
                        style={{ colorScheme: 'dark' }}
                        className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-royal-gold"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-zinc-400 text-xs font-mono uppercase">Publicatiedatum Tot (Toon tot)</label>
                      <input 
                        type="datetime-local" 
                        value={toLocalISO(editingItem.displayUntil)}
                        onChange={(e) => handleDateChange(e.target.value, 'displayUntil')}
                        style={{ colorScheme: 'dark' }}
                        className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-royal-gold"
                      />
                    </div>

                    {/* Comments */}
                    <div className="space-y-2 md:col-span-2">
                      <label className="block text-zinc-400 text-xs font-mono uppercase">Optionele Toelichting / Opmerkingen</label>
                      <textarea 
                        value={editingItem.comments || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, comments: e.target.value })}
                        rows={3}
                        className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-royal-gold resize-none outline-none"
                        placeholder="bijv. Support act aanwezig, zaal open om 19:30"
                      />
                    </div>

                  </div>

                  {/* Actions buttons */}
                  <div className="flex gap-4 mt-8 pt-4 border-t border-zinc-900 justify-end font-sans">
                    <button 
                      onClick={() => setEditingItem(null)}
                      className="px-6 py-3 border border-zinc-800 text-zinc-400 rounded-xl hover:bg-zinc-900 transition-colors text-xs uppercase"
                    >
                      Annuleren
                    </button>
                    <button 
                      onClick={saveAgendaItem}
                      disabled={isSaving}
                      className="px-8 py-3 bg-royal-gold text-black font-extrabold rounded-xl hover:bg-white transition-colors text-xs uppercase flex items-center gap-1.5"
                    >
                      {isSaving ? <RefreshCw className="animate-spin" size={14} /> : <Save size={14} />}
                      Opslaan
                    </button>
                  </div>
                </motion.div>
              ) : (
                /* List grid show items sorted by date */
                <div className="space-y-3">
                  {agenda.length === 0 && (
                    <div className="text-center py-20 bg-zinc-950/20 border border-zinc-900 rounded-3xl">
                      <p className="text-zinc-500 font-mono text-xs">Geen shows aangetroffen in de agenda. Voeg een show toe!</p>
                    </div>
                  )}

                  {agenda
                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                    .map((item) => (
                      <div 
                        key={item.id}
                        className="bg-zinc-950 border border-zinc-900 p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-royal-gold/30 transition-all font-sans"
                      >
                        <div className="flex flex-col md:flex-row md:items-center gap-6">
                          <div className="flex flex-col">
                            <span className="text-zinc-500 text-[10px] uppercase font-mono mb-0.5">DATUM</span>
                            <span className="text-white font-extrabold text-sm">
                              {new Date(item.date).toLocaleDateString('nl-NL', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </span>
                            <span className="text-royal-gold text-xs font-mono">
                              {new Date(item.date).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })} uur
                            </span>
                          </div>

                          <div>
                            <span className="text-zinc-500 text-[10px] uppercase font-mono block mb-0.5">LOCATIE & STAD</span>
                            <h4 className="text-white font-bold tracking-wide">{item.locationName}</h4>
                            <p className="text-zinc-450 text-xs flex items-center gap-1 mt-0.5">
                              <MapPin size={12} className="text-royal-gold" /> {item.locationCity} {item.address ? `• ${item.address}` : ''}
                            </p>
                          </div>

                          <div className="flex gap-1.5 flex-wrap">
                            {item.isVisible ? (
                              <span className="px-2 py-0.5 bg-green-500/10 text-green-400 text-[9px] uppercase font-mono font-bold rounded border border-green-500/20">Zichtbaar</span>
                            ) : (
                              <span className="px-2 py-0.5 bg-zinc-900 text-zinc-500 text-[9px] uppercase font-mono font-bold rounded border border-zinc-800">Concept</span>
                            )}
                            {item.isSoldOut && (
                              <span className="px-2 py-0.5 bg-red-500/15 text-red-500 text-[9px] uppercase font-mono font-bold rounded border border-red-500/25">Uitverkocht</span>
                            )}
                            {item.ticketPrice && (
                              <span className="px-2 py-0.5 bg-royal-gold/10 text-royal-gold text-[9px] uppercase font-mono font-bold rounded border border-royal-gold/25">€ {item.ticketPrice}</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 border-t border-zinc-900 pt-3 md:border-t-0 md:pt-0">
                          <button 
                            onClick={() => setEditingItem(item)}
                            className="p-3 bg-zinc-900 text-zinc-300 rounded-xl hover:bg-zinc-800 hover:text-white transition-colors"
                            title="Bewerken"
                          >
                            <Edit3 size={16} />
                          </button>
                          <button 
                            onClick={() => removeAgendaItem(item.id)}
                            className="p-3 bg-zinc-900/30 text-zinc-600 hover:bg-red-500/10 hover:text-red-500 rounded-xl transition-colors"
                            title="Verwijderen"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>

                      </div>
                    ))}
                </div>
              )}

            </motion.div>
          )}

          {/* TAB 4: NEWSLETTER */}
          {activeTab === 'newsletter' && (
            <motion.div 
              key="newsletter-tab" 
              initial={{ opacity: 0, y: 15 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              
              {/* Header inside the tab */}
              <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 bg-zinc-950 border border-zinc-900 p-6 rounded-2xl">
                <div>
                  <h3 className="text-zinc-500 text-xs uppercase tracking-widest font-mono">Nieuwsbrief Abonnees</h3>
                  <h4 className="text-royal-gold text-lg font-bold italic">Lijst van aanmeldingen ({subscribers.length})</h4>
                  <p className="text-[10px] text-zinc-500 font-mono mt-1">E-mailadressen van fans die zich hebben aangemeld voor de nieuwsbrief.</p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => {
                      if (subscribers.length === 0) return;
                      const emails = subscribers.map(s => s.email).join(', ');
                      navigator.clipboard.writeText(emails);
                      setIsCopying(true);
                      setSuccess('Alle e-mailadressen gekopieerd naar klembord!');
                      setTimeout(() => {
                        setIsCopying(false);
                        setSuccess('');
                      }, 3000);
                    }}
                    disabled={subscribers.length === 0}
                    className="px-4 py-2 bg-royal-gold text-black hover:bg-white disabled:opacity-50 transition-colors rounded-xl font-extrabold text-[11px] uppercase tracking-wider flex items-center gap-1.5"
                  >
                    {isCopying ? <Check size={14} /> : <Copy size={14} />}
                    {isCopying ? 'Gekopieerd!' : 'Kopieer Alle E-mails'}
                  </button>
                </div>
              </div>

              {/* Search filter input */}
              <div className="flex gap-4">
                <input
                  type="text"
                  placeholder="Zoek abonnee op e-mail..."
                  value={subscriberSearch}
                  onChange={(e) => setSubscriberSearch(e.target.value)}
                  className="w-full max-w-md bg-zinc-950/60 border border-zinc-900 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-royal-gold/60 transition-colors placeholder:text-zinc-650 font-mono text-sm"
                />
              </div>

              {/* Subscribers List / Table */}
              <div className="space-y-3">
                {subscribers.filter(s => s.email.toLowerCase().includes(subscriberSearch.toLowerCase())).length === 0 ? (
                  <div className="text-center py-20 bg-zinc-950/20 border border-zinc-900 rounded-3xl">
                    <p className="text-zinc-500 font-mono text-xs">
                      {subscribers.length === 0 ? 'Er zijn nog geen aanmeldingen voor de nieuwsbrief.' : 'Geen abonnees gevonden die voldoen aan je zoekopdracht.'}
                    </p>
                  </div>
                ) : (
                  subscribers
                    .filter(s => s.email.toLowerCase().includes(subscriberSearch.toLowerCase()))
                    .sort((a, b) => new Date(b.subscribedAt).getTime() - new Date(a.subscribedAt).getTime())
                    .map((sub, index) => (
                      <div 
                        key={sub.id || sub.email}
                        className="bg-zinc-950 border border-zinc-900 p-5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-royal-gold/20 transition-all font-mono"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4 md:gap-8">
                          <div className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded-full bg-zinc-900 flex items-center justify-center text-[10px] text-zinc-500 font-bold border border-zinc-800">
                              {index + 1}
                            </span>
                            <div>
                              <span className="text-zinc-500 text-[9px] uppercase font-mono block mb-0.5">E-MAILADRES</span>
                              <span className="text-white text-sm font-bold block select-all">{sub.email}</span>
                            </div>
                          </div>

                          <div>
                            <span className="text-zinc-500 text-[9px] uppercase font-mono block mb-0.5">AANMELDDATUM</span>
                            <span className="text-zinc-400 text-xs">
                              {sub.subscribedAt ? new Date(sub.subscribedAt).toLocaleDateString('nl-NL', { 
                                day: '2-digit', 
                                month: 'short', 
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              }) + ' uur' : 'Onbekend'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-end">
                          <button 
                            onClick={() => removeSubscriber(sub.docId || sub.email, sub.email)}
                            className="p-2.5 bg-zinc-900 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                            title="Abonnement Beëindigen"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))
                )}
              </div>

            </motion.div>
          )}

          {/* TAB 5: DOWNLOADS / MEDIA BESTANDEN */}
          {activeTab === 'downloads' && (
            <motion.div 
              key="downloads-tab" 
              initial={{ opacity: 0, y: 15 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 bg-zinc-950 border border-zinc-900 p-6 rounded-2xl">
                <div>
                  <h3 className="text-zinc-500 text-xs uppercase tracking-widest font-mono">Media & Downloads</h3>
                  <h4 className="text-royal-gold text-lg font-bold italic">Pers- en Promotiemateriaal</h4>
                  <p className="text-[10px] text-zinc-500 font-mono mt-1">Hier vind je de bestanden die worden gebruikt voor persberichten, promotie en websitebeheer.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Persfotos Card */}
                <div className="bg-zinc-950 border border-zinc-900 p-8 rounded-3xl relative overflow-hidden flex flex-col justify-between min-h-[320px]">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[radial-gradient(circle_at_top_right,rgba(212,175,55,0.08)_0%,transparent_70%)] pointer-events-none" />
                  
                  <div className="space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="p-4 bg-royal-gold/10 rounded-2xl text-royal-gold border border-royal-gold/20">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="text-xl font-bold text-white italic">Persfotos.zip</h4>
                        <p className="text-xs text-zinc-550 font-mono uppercase tracking-wider mt-0.5">ZIP Archief • Pers- & fotopakket</p>
                      </div>
                    </div>

                    <p className="text-sm text-zinc-400 leading-relaxed font-sans">
                      Dit pakket bevat professionele hoge resolutie persfoto's, logo's en promotiemateriaal van Queens & Ko. Uitermate geschikt voor kranten, tijdschriften, organisatoren en online media.
                    </p>

                    <div className="bg-black/60 border border-zinc-900 rounded-2xl p-4 space-y-2.5 font-mono text-xs">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-zinc-550 uppercase tracking-wider">Bestand:</span>
                        <span className="text-zinc-300 font-bold">Persfotos.zip</span>
                      </div>
                      <div className="flex justify-between items-center text-[11px] border-t border-zinc-900 pt-2.5">
                        <span className="text-zinc-550 uppercase tracking-wider">Pad op server:</span>
                        <span className="text-royal-gold font-bold">/pictures/Persfotos.zip</span>
                      </div>
                      <div className="flex justify-between items-center text-[11px] border-t border-zinc-900 pt-2.5">
                        <span className="text-zinc-550 uppercase tracking-wider">Doelgroep:</span>
                        <span className="text-zinc-350">Media, Organisatoren, Pers</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 mt-8 pt-4 border-t border-zinc-900">
                    <a
                      href="/pictures/Persfotos.zip"
                      download="Persfotos.zip"
                      className="flex-1 px-5 py-3.5 bg-royal-gold text-black font-extrabold rounded-xl hover:bg-white transition-colors text-xs uppercase tracking-widest text-center flex items-center justify-center gap-2 shadow-lg shadow-royal-gold/5"
                    >
                      <Download size={14} /> Direct Downloaden
                    </a>
                    <button
                      onClick={() => {
                        const downloadUrl = `${window.location.origin}/pictures/Persfotos.zip`;
                        navigator.clipboard.writeText(downloadUrl);
                        setSuccess('Directe download-link gekopieerd naar klembord!');
                        setTimeout(() => setSuccess(''), 3000);
                      }}
                      className="px-5 py-3.5 bg-zinc-900 text-zinc-300 hover:text-white transition-colors rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 border border-zinc-800"
                    >
                      <Copy size={14} /> Link Kopiëren
                    </button>
                  </div>
                </div>

                {/* Info & Instructie Card */}
                <div className="bg-zinc-950/40 border border-zinc-900 p-8 rounded-3xl flex flex-col justify-between">
                  <div className="space-y-6">
                    <h4 className="text-lg font-bold text-royal-gold italic flex items-center gap-2">
                      <Shield size={18} /> Instructies voor Persgebruik
                    </h4>
                    
                    <div className="space-y-4 text-sm text-zinc-400 leading-relaxed font-sans">
                      <p>
                        Wanneer u persfoto's deelt met journalisten of boekers, kunt u ze direct verwijzen naar deze download of de link delen.
                      </p>
                      <ul className="list-disc pl-5 space-y-2 text-zinc-500">
                        <li>De foto's in het ZIP-archief zijn rechtenvrij te gebruiken voor promotionele doeleinden omtrent Queens & Ko.</li>
                        <li>Bij publicatie wordt naamsvermelding van de fotograaf (indien vermeld in de bestandsnaam) zeer gewaardeerd.</li>
                        <li>Heeft de pers behoefte aan aanvullende informatie of specifieke formaten? Neem dan contact op via de contactpagina.</li>
                      </ul>
                    </div>
                  </div>

                  <div className="p-4 bg-zinc-900/40 border border-zinc-800/40 rounded-2xl mt-6">
                    <p className="text-xs font-mono text-zinc-500 leading-normal">
                      Systeemtip: Het ZIP-bestand is statisch gehost in de `/public/pictures/` map op de server. Dit garandeert maximale downloadsnelheid en compatibiliteit met mobiele apparaten.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 6: DEDICATED FULL PAGE VISITOR MAP */}
          {activeTab === 'map' && (
            <motion.div 
              key="map-tab" 
              initial={{ opacity: 0, y: 15 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 bg-zinc-950 border border-zinc-900 p-6 rounded-2xl">
                <div>
                  <h3 className="text-zinc-550 text-xs uppercase tracking-widest font-mono">Geografische Analyse</h3>
                  <h4 className="text-royal-gold text-lg font-bold italic">Interactieve Bezoekerskaart</h4>
                  <p className="text-[10px] text-zinc-500 font-mono mt-1">Real-time herkomst en schaling van unieke bezoekerssessies over heel Nederland.</p>
                </div>
              </div>

              <BeheerMap 
                sessions={sessions.map(s => ({ city: s.city, lat: s.latitude, lng: s.longitude, startedAt: s.startedAt }))} 
                isLarge={true} 
              />
            </motion.div>
          )}

          {/* TAB 7: SOCIAL MEDIA CHANNELS */}
          {activeTab === 'socials' && (
            <motion.div 
              key="socials-tab" 
              initial={{ opacity: 0, y: 15 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 bg-zinc-950 border border-zinc-900 p-6 rounded-2xl">
                <div>
                  <h3 className="text-zinc-500 text-xs uppercase tracking-widest font-mono">Sociale Kanalen</h3>
                  <h4 className="text-royal-gold text-lg font-bold italic">Social Media Beheer</h4>
                  <p className="text-[10px] text-zinc-500 font-mono mt-1">Directe snelkoppelingen naar de officiële kanalen van Queens & Ko.</p>
                </div>
              </div>

              {/* Informative Explanation Panel for Dummy Users */}
              <div className="p-6 bg-zinc-950 border border-zinc-900 rounded-3xl relative overflow-hidden space-y-4">
                <div className="absolute top-0 right-0 w-64 h-64 bg-royal-gold/5 blur-[100px] rounded-full pointer-events-none" />
                <div className="flex items-start gap-4 relative z-10">
                  <div className="p-3 bg-royal-gold/10 rounded-2xl text-royal-gold border border-royal-gold/15 shrink-0">
                    <Shield size={24} />
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-white text-base font-bold">Beveiliging & Automatisch Inloggen</h3>
                    <p className="text-sm text-zinc-300 leading-relaxed max-w-3xl">
                      Om uw account te beschermen, staan Facebook en Instagram (Meta) om veiligheids- en privacyredenen <strong className="text-amber-500">geen directe automatische wachtwoord-koppelingen</strong> van externe websites toe. 
                    </p>
                    <div className="p-4 bg-zinc-900/50 rounded-2xl border border-zinc-850 space-y-2 max-w-3xl">
                      <span className="text-[10px] text-royal-gold font-bold uppercase tracking-wider block">Hoe werkt het voor u?</span>
                      <ul className="text-xs text-zinc-400 space-y-2 list-disc pl-4 leading-relaxed">
                        <li>
                          Zodra u eenmalig bent ingelogd op uw beheeraccount op Facebook of Instagram in deze browser, onthoudt uw computer dit veilig.
                        </li>
                        <li>
                          Als u hieronder op <strong className="text-white font-medium">"Open Pagina"</strong> klikt, herkent de browser uw eerdere inlog en bent u <strong className="text-royal-gold font-semibold">direct automatisch ingelogd als administrator</strong> op de pagina van Queens & Ko!
                        </li>
                        <li>
                          <strong className="text-white font-medium">Tip:</strong> Vink bij het handmatig inloggen op Facebook/Instagram de optie <em className="italic">"Wachtwoord onthouden"</em> aan om deze automatische overgang te activeren.
                        </li>
                      </ul>
                    </div>

                    {/* Quick credentials copy box */}
                    <div className="p-4 bg-zinc-900/50 rounded-2xl border border-zinc-850 space-y-3 max-w-3xl">
                      <span className="text-[10px] text-royal-gold font-bold uppercase tracking-wider block">Snel Inloggegevens Kopiëren & Plakken</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Gebruikersnaam */}
                        <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-850 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <span className="text-[9px] text-zinc-500 block uppercase font-mono">Gebruikersnaam / E-mail</span>
                            <span className="text-xs text-white font-medium truncate block font-mono">QueensEnKo@gmail.com</span>
                          </div>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText('QueensEnKo@gmail.com');
                              setCopiedSocialField('username');
                              setTimeout(() => setCopiedSocialField(null), 3000);
                            }}
                            className="px-2.5 py-1.5 bg-zinc-900 hover:bg-royal-gold text-zinc-400 hover:text-black rounded-lg transition-all text-[10px] uppercase font-bold tracking-wider flex items-center gap-1 shrink-0"
                          >
                            {copiedSocialField === 'username' ? <Check size={10} /> : <Copy size={10} />}
                            {copiedSocialField === 'username' ? 'Gekopieerd!' : 'Kopieer'}
                          </button>
                        </div>

                        {/* Wachtwoord */}
                        <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-850 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <span className="text-[9px] text-zinc-500 block uppercase font-mono">Wachtwoord</span>
                            <span className="text-xs text-white font-medium truncate block font-mono">KillerQueen</span>
                          </div>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText('KillerQueen');
                              setCopiedSocialField('password');
                              setTimeout(() => setCopiedSocialField(null), 3000);
                            }}
                            className="px-2.5 py-1.5 bg-zinc-900 hover:bg-royal-gold text-zinc-400 hover:text-black rounded-lg transition-all text-[10px] uppercase font-bold tracking-wider flex items-center gap-1 shrink-0"
                          >
                            {copiedSocialField === 'password' ? <Check size={10} /> : <Copy size={10} />}
                            {copiedSocialField === 'password' ? 'Gekopieerd!' : 'Kopieer'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Grid of Social Channels */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Facebook Card */}
                <div className="bg-zinc-950 border border-zinc-900 p-6 md:p-8 rounded-3xl flex flex-col justify-between h-72 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 blur-[60px] rounded-full pointer-events-none" />
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="p-4 bg-blue-600/10 text-blue-500 rounded-2xl border border-blue-600/15">
                        <Facebook size={32} />
                      </div>
                      <span className="text-[10px] font-mono bg-blue-500/10 text-blue-400 px-2.5 py-1 rounded-full font-bold uppercase tracking-widest border border-blue-500/10">
                        Facebook Pagina
                      </span>
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors">Queens & Ko on Facebook</h4>
                      <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                        Beheer berichten, reageer op fans, bekijk paginastatistieken en plan evenementen direct op de officiële Facebook-tijdlijn.
                      </p>
                    </div>
                  </div>
                  <a 
                    href="https://www.facebook.com/profile.php?id=100007789546947&fref=ts"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full mt-4 px-5 py-3 bg-zinc-900 hover:bg-blue-600 text-zinc-300 hover:text-white font-bold text-xs rounded-xl transition-all duration-300 flex items-center justify-center gap-2 border border-zinc-800 hover:border-blue-500 transform active:scale-98"
                  >
                    Open Pagina <ExternalLink size={14} />
                  </a>
                </div>

                {/* Instagram Card */}
                <div className="bg-zinc-950 border border-zinc-900 p-6 md:p-8 rounded-3xl flex flex-col justify-between h-72 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-pink-600/5 blur-[60px] rounded-full pointer-events-none" />
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="p-4 bg-pink-600/10 text-pink-500 rounded-2xl border border-pink-600/15">
                        <Instagram size={32} />
                      </div>
                      <span className="text-[10px] font-mono bg-pink-500/10 text-pink-400 px-2.5 py-1 rounded-full font-bold uppercase tracking-widest border border-pink-500/10">
                        Instagram Account
                      </span>
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-white group-hover:text-pink-400 transition-colors">Queens & Ko on Instagram</h4>
                      <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                        Deel sfeerfoto's van optredens, plaats stories van de show, bekijk bereikstatistieken en verbind met de volgers van Queens & Ko.
                      </p>
                    </div>
                  </div>
                  <a 
                    href="https://www.instagram.com/queensenko/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full mt-4 px-5 py-3 bg-zinc-900 hover:bg-pink-600 text-zinc-300 hover:text-white font-bold text-xs rounded-xl transition-all duration-300 flex items-center justify-center gap-2 border border-zinc-800 hover:border-pink-500 transform active:scale-98"
                  >
                    Open Pagina <ExternalLink size={14} />
                  </a>
                </div>

              </div>
            </motion.div>
          )}

        </AnimatePresence>

        {/* Custom Database Consolidation Modal */}
        <AnimatePresence>
          {showCleanupModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.95, y: 15 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 15 }}
                className="bg-zinc-950 border border-zinc-900 w-full max-w-lg p-6 md:p-8 rounded-3xl shadow-2xl relative space-y-6"
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-zinc-900 pb-4">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-royal-gold/10 text-royal-gold rounded-lg">
                      <Database size={20} />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white tracking-tight">Database Consolideren & Opschonen</h3>
                      <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">Onderhoudstool</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowCleanupModal(false)}
                    className="text-zinc-500 hover:text-white p-1 hover:bg-zinc-900 rounded-lg transition-all"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Step 1: Password input */}
                {cleanupStep === 'password' && (
                  <div className="space-y-4">
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Om onbedoelde consolidatie te voorkomen, is deze bewerking beveiligd. Voer het onderhoudswachtwoord in om door te gaan.
                    </p>
                    <div className="space-y-2">
                      <label className="text-[10px] text-zinc-500 block uppercase font-mono tracking-wider">Wachtwoord</label>
                      <input
                        type="password"
                        value={cleanupPasswordInput}
                        onChange={(e) => setCleanupPasswordInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') verifyCleanupPassword();
                        }}
                        placeholder="Voer wachtwoord in..."
                        className="w-full bg-zinc-900/60 border border-zinc-800 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-royal-gold transition-colors font-mono text-center"
                        autoFocus
                      />
                      {cleanupModalError && (
                        <p className="text-red-500 text-[11px] font-mono text-center">{cleanupModalError}</p>
                      )}
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowCleanupModal(false)}
                        className="px-4 py-2.5 bg-zinc-900 text-zinc-400 hover:bg-zinc-800 rounded-xl text-xs font-mono font-bold uppercase transition-all"
                      >
                        Annuleren
                      </button>
                      <button
                        type="button"
                        onClick={verifyCleanupPassword}
                        className="px-5 py-2.5 bg-royal-gold text-black hover:bg-white rounded-xl text-xs font-mono font-bold uppercase transition-all"
                      >
                        Verifiëren
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 2: Explanation & Start Confirmation */}
                {cleanupStep === 'explanation' && (
                  <div className="space-y-4">
                    <div className="bg-royal-gold/5 border border-royal-gold/15 p-4 rounded-2xl space-y-3">
                      <p className="text-xs text-royal-gold font-bold flex items-center gap-1.5">
                        <Shield size={14} /> Wat houdt opschonen in?
                      </p>
                      <ul className="text-[11px] text-zinc-300 space-y-2 list-disc list-inside leading-relaxed">
                        <li>
                          Converteert alle individuele, oudere bezoekerssessies <strong className="text-white">(ouder dan 4 uur)</strong> naar geaggregeerde dagsamenvattingen.
                        </li>
                        <li>
                          Verzamelt statistieken zoals steden, apparaten, besturingssystemen en kliks, en voegt deze samen met bestaande dagsamenvattingen.
                        </li>
                        <li>
                          <strong className="text-red-400">Verwijdert vervolgens de raw individuele sessies</strong> uit de database om de MySQL-databasegroei te beperken en uw beheeromgeving razendsnel te houden.
                        </li>
                      </ul>
                    </div>

                    <div className="flex items-center justify-between bg-zinc-900/40 p-4 border border-zinc-900 rounded-2xl">
                      <div>
                        <span className="text-[9px] text-zinc-500 uppercase font-mono block">Te consolideren sessies</span>
                        <span className="text-sm font-bold text-white font-mono">{sessionsToConsolidateCount} sessies</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] text-zinc-500 uppercase font-mono block">Status</span>
                        <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full ${sessionsToConsolidateCount > 0 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/15' : 'bg-green-500/10 text-green-400 border border-green-500/15'}`}>
                          {sessionsToConsolidateCount > 0 ? 'Klaar voor consolidatie' : 'Reeds up-to-date'}
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowCleanupModal(false)}
                        className="px-4 py-2.5 bg-zinc-900 text-zinc-400 hover:bg-zinc-800 rounded-xl text-xs font-mono font-bold uppercase transition-all"
                      >
                        Annuleren
                      </button>
                      <button
                        type="button"
                        onClick={executeCleanup}
                        disabled={sessionsToConsolidateCount === 0}
                        className="px-5 py-2.5 bg-royal-gold text-black hover:bg-white disabled:opacity-50 disabled:hover:bg-royal-gold rounded-xl text-xs font-mono font-bold uppercase transition-all flex items-center gap-1.5"
                      >
                        <Play size={12} fill="currentColor" />
                        Start Opschonen
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 3: Progress indicator */}
                {cleanupStep === 'progress' && (
                  <div className="py-6 flex flex-col items-center justify-center space-y-4 text-center">
                    <RefreshCw className="animate-spin text-royal-gold" size={40} />
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-white">Database wordt opgeschoond...</h4>
                      <p className="text-xs text-zinc-400">Moment geduld, we verwerken de dagsamenvattingen en schonen de logs op.</p>
                    </div>
                  </div>
                )}

                {/* Step 4: Success message */}
                {cleanupStep === 'success' && (
                  <div className="space-y-4 py-2">
                    <div className="flex flex-col items-center justify-center text-center space-y-3">
                      <div className="w-12 h-12 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 flex flex-col items-center justify-center">
                        <Check size={24} />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-white">Consolidatie Voltooid!</h4>
                        <p className="text-xs text-zinc-400 font-mono">De database is succesvol opgeschoond en alle statistieken zijn veilig gearchiveerd.</p>
                      </div>
                    </div>
                    <div className="flex justify-center pt-2">
                      <button
                        type="button"
                        onClick={() => setShowCleanupModal(false)}
                        className="px-6 py-2.5 bg-royal-gold text-black hover:bg-white rounded-xl text-xs font-mono font-bold uppercase transition-all"
                      >
                        Sluiten
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
