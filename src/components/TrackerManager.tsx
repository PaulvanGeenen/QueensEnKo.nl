import { useEffect } from 'react';
import { initializeTracker, setTrackedSection } from '../lib/tracker';

export default function TrackerManager() {
  useEffect(() => {
    // Initiate session tracking
    initializeTracker();

    const sectionIds = ['home', 'agenda', 'band', 'live', 'setlist', 'verhaal', 'media', 'contact'];
    const observedElements = new Set<Element>();

    const observerOptions = {
      root: null,
      rootMargin: '-25% 0px -25% 0px', // Focus middle 50% of the screen
      threshold: 0.1,
    };

    const handleIntersection = (entries: IntersectionObserverEntry[]) => {
      // Find currently intersecting elements
      const activeEntries = entries.filter(e => e.isIntersecting);
      if (activeEntries.length > 0) {
        // Find highest ratio, use that section
        const topSection = activeEntries.reduce((prev, cur) => 
          (prev.intersectionRatio > cur.intersectionRatio) ? prev : cur
        );
        setTrackedSection(topSection.target.id);
      }
    };

    const observer = new IntersectionObserver(handleIntersection, observerOptions);

    // Function to search and bind layout targets
    const bindSections = () => {
      sectionIds.forEach(id => {
        const el = document.getElementById(id);
        if (el && !observedElements.has(el)) {
          observer.observe(el);
          observedElements.add(el);
        }
      });
    };

    bindSections();
    const checkInterval = setInterval(bindSections, 3000); // Check for newly loaded sections (e.g. Agenda)

    return () => {
      observer.disconnect();
      clearInterval(checkInterval);
    };
  }, []);

  return null;
}
