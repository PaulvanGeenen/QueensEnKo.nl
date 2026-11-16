import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import { MediaProvider } from './context/MediaContext';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import SlideshowSection from './components/SlideshowSection';
import Agenda from './components/Agenda';
import Band from './components/Band';
import Live from './components/Live';
import AudioPlayer from './components/AudioPlayer';
import Setlist from './components/Setlist';
import History from './components/History';
import Media from './components/Media';
import Contact from './components/Contact';
import Footer from './components/Footer';
import BeheerDashboard from './components/BeheerDashboard';
import TrackerManager from './components/TrackerManager';
import { db, collection, getDocs, query, where, limit } from './lib/firebase';
import { filterActiveAgendaItems } from './lib/agendaFilter';
import { AgendaItem } from './types';

function MainContent({ showAgenda }: { showAgenda: boolean }) {
  return (
    <>
      <Navbar showAgenda={showAgenda} />
      <main>
        <Hero showAgenda={showAgenda} />
        <SlideshowSection />
        {showAgenda && <Agenda />}
        <Band />
        <Live />
        <AudioPlayer />
        <Setlist />
        <History />
        <Media />
        <Contact />
      </main>
      <Footer />
    </>
  );
}

function RoutesWrapper() {
  const [hasItems, setHasItems] = useState(false);
  const location = useLocation();

  const checkAgenda = async () => {
    try {
      const q = query(
        collection(db, 'agenda'), 
        where('isVisible', '==', true),
        limit(1)
      );
      const snapshot = await getDocs(q);
      const raw = snapshot.docs.map(doc => ({ ...doc.data() } as AgendaItem));
      const activeItems = filterActiveAgendaItems(raw);
      setHasItems(activeItems.length > 0);
    } catch (err) {
      console.error('[App] Check agenda error:', err);
      setHasItems(false);
    }
  };

  // Re-check when location changes (e.g. returning from Admin)
  useEffect(() => {
    checkAgenda();
  }, [location.pathname]);

  return (
    <MediaProvider>
      <div className="bg-deep-black min-h-screen selection:bg-royal-gold selection:text-deep-black">
      <Helmet>
        <title>Queens & Ko | De Ultieme Queen Tribute Rock-Opera</title>
        <meta name="description" content="Ervaar 50 jaar Queen met Queens & Ko. Geen imitaties, maar een theatrale reis door rock, blues en vaudeville." />
        <meta name="google-site-verification" content="g8qteHSF06-m_3wkwhuZkjFmstgyweO3eba4Rrky2Pw" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://queensenko.nl/" />
        <meta property="og:title" content="Queens & Ko | De Ultieme Queen Tribute Rock-Opera" />
        <meta property="og:description" content="Ervaar 50 jaar Queen met Queens & Ko op een spectaculaire en theatrale wijze." />
        <meta property="og:image" content="https://queensenko.nl/slideshow/Slideshow001.jpg" />

        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://queensenko.nl/" />
        <meta property="twitter:title" content="Queens & Ko | De Ultieme Queen Tribute Rock-Opera" />
        <meta property="twitter:description" content="Ervaar 50 jaar Queen met Queens & Ko op een spectaculaire en theatrale wijze." />
        <meta property="twitter:image" content="https://queensenko.nl/slideshow/Slideshow001.jpg" />
      </Helmet>

      <div className="atmospheric-bg" />
      <TrackerManager />

      <Routes>
        <Route path="/beheer" element={<BeheerDashboard />} />
        <Route path="/" element={<MainContent showAgenda={hasItems} />} />
      </Routes>
    </div>
    </MediaProvider>
  );
}

export default function App() {
  return (
    <HelmetProvider>
      <Router>
        <RoutesWrapper />
      </Router>
    </HelmetProvider>
  );
}
