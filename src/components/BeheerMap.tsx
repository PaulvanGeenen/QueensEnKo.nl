import { useState, useMemo, useEffect, useRef } from 'react';
import { 
  MapPin, Search, Globe, ZoomIn, ZoomOut, Compass, Layers, 
  ChevronLeft, ChevronRight, Calendar, RotateCcw, Clock
} from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface CityPoint {
  city: string;
  lat: number;
  lng: number;
  count: number;
}

interface BeheerMapProps {
  sessions: { city: string; lat: number; lng: number; startedAt: string }[];
  isLarge?: boolean;
}

type ZoomLevel = 'nl' | 'eu' | 'world';
type FilterMode = 'all' | 'week';

// Helper to determine Monday of the week for a given date
const getStartOfWeek = (date: Date) => {
  const d = new Date(date);
  const day = d.getDay();
  // Adjust when day is Sunday
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
};

export default function BeheerMap({ sessions, isLarge = false }: BeheerMapProps) {
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('nl');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [hoveredCity, setHoveredCity] = useState<CityPoint | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  // Week-by-week selection states
  const actualCurrentWeekStart = useMemo(() => getStartOfWeek(new Date()), []);
  const [selectedWeekStart, setSelectedWeekStart] = useState<Date>(actualCurrentWeekStart);

  const selectedWeekEnd = useMemo(() => {
    const end = new Date(selectedWeekStart);
    end.setDate(end.getDate() + 7);
    return end;
  }, [selectedWeekStart]);

  // Handler to navigate back 1 week
  const handlePrevWeek = () => {
    const prev = new Date(selectedWeekStart);
    prev.setDate(prev.getDate() - 7);
    setSelectedWeekStart(prev);
    setHoveredCity(null);
  };

  // Handler to navigate forward 1 week
  const handleNextWeek = () => {
    const next = new Date(selectedWeekStart);
    next.setDate(next.getDate() + 7);
    if (next <= actualCurrentWeekStart) {
      setSelectedWeekStart(next);
      setHoveredCity(null);
    }
  };

  // Reset to the current actual week
  const handleResetToCurrentWeek = () => {
    setSelectedWeekStart(actualCurrentWeekStart);
    setHoveredCity(null);
  };

  const isNextWeekDisabled = useMemo(() => {
    return selectedWeekStart.getTime() >= actualCurrentWeekStart.getTime();
  }, [selectedWeekStart, actualCurrentWeekStart]);

  // Format the selected week for a premium Dutch experience
  const formattedWeekRange = useMemo(() => {
    const startStr = selectedWeekStart.toLocaleDateString('nl-NL', { day: '2-digit', month: 'short' });
    const sunday = new Date(selectedWeekStart);
    sunday.setDate(sunday.getDate() + 6);
    const endStr = sunday.toLocaleDateString('nl-NL', { day: '2-digit', month: 'short', year: 'numeric' });
    
    const isCurrent = selectedWeekStart.getTime() === actualCurrentWeekStart.getTime();
    return `${startStr} t/m ${endStr} ${isCurrent ? '(Huidige Week)' : ''}`;
  }, [selectedWeekStart, actualCurrentWeekStart]);

  // Filter raw sessions based on selected mode
  const sessionsToDisplay = useMemo(() => {
    if (filterMode === 'all') {
      return sessions;
    }
    return sessions.filter(s => {
      if (!s.startedAt) return false;
      const time = new Date(s.startedAt).getTime();
      return time >= selectedWeekStart.getTime() && time < selectedWeekEnd.getTime();
    });
  }, [sessions, filterMode, selectedWeekStart, selectedWeekEnd]);

  // Geographic coordinates for zoom buttons
  const viewports = {
    nl: {
      center: [52.1326, 5.2913] as [number, number],
      zoom: 8,
      title: "Nederland",
      desc: "Gedetailleerde herkomst binnen Nederland"
    },
    eu: {
      center: [50.0, 10.0] as [number, number],
      zoom: 4,
      title: "Europa",
      desc: "Herkomst over het Europese continent"
    },
    world: {
      center: [30.0, 0.0] as [number, number],
      zoom: 2,
      title: "Wereld",
      desc: "Mondiale herkomst van bezoekers"
    }
  };

  // Process filtered sessions into unique city points with user count and sort descending by count
  const sortedCityPoints = useMemo(() => {
    const points: CityPoint[] = [];
    sessionsToDisplay.forEach(s => {
      if (!s.city || s.city === 'Onbekend') return;
      
      const existing = points.find(p => p.city.toLowerCase() === s.city.toLowerCase());
      if (existing) {
        existing.count += 1;
      } else {
        points.push({
          city: s.city,
          lat: s.lat,
          lng: s.lng,
          count: 1
        });
      }
    });
    return points.sort((a, b) => b.count - a.count);
  }, [sessionsToDisplay]);

  // Filter cities by search query
  const filteredCities = useMemo(() => {
    return sortedCityPoints.filter(p => {
      return p.city.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [sortedCityPoints, searchQuery]);

  // Handle map initialization and cleanup
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize map
    const activeVp = viewports[zoomLevel];
    const map = L.map(mapContainerRef.current, {
      center: activeVp.center,
      zoom: activeVp.zoom,
      zoomControl: false, // We render custom stylish React-based zoom buttons
      attributionControl: false // Keep the map extremely clean
    });

    mapInstanceRef.current = map;

    // Use a premium Dark Mode tile layer that beautifully labels countries, cities, and streets in detail
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
    }).addTo(map);

    // Create a layer group to hold our custom glowing visitor markers
    const markersLayer = L.layerGroup().addTo(map);
    markersLayerRef.current = markersLayer;

    // Invalidate map size to make sure it fills the container perfectly on render
    setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 150);

    // Cleanup on unmount
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Use a ResizeObserver to perfectly keep the Leaflet map sized when the tab animations or resizes occur
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const observer = new ResizeObserver(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    });

    observer.observe(mapContainerRef.current);

    return () => {
      observer.disconnect();
    };
  }, []);

  // Sync map view with the zoom level
  useEffect(() => {
    if (mapInstanceRef.current) {
      const activeVp = viewports[zoomLevel];
      mapInstanceRef.current.setView(activeVp.center, activeVp.zoom, {
        animate: true,
        duration: 1
      });
    }
  }, [zoomLevel]);

  // Recalculate size when display state transitions or modes switch
  useEffect(() => {
    if (mapInstanceRef.current) {
      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 200);
    }
  }, [filterMode]);

  // Render glowing visitor pins on the map
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;

    // Clear existing markers
    markersLayerRef.current.clearLayers();

    // Add new markers
    sortedCityPoints.forEach(pt => {
      if (pt.lat === 0 && pt.lng === 0) return;

      // Dynamic sizing based on visitors count
      const size = Math.max(20, Math.min(48, 20 + pt.count * 3));
      const pingSize = size + 12;

      // Custom HTML Marker using pure Tailwind (no broken image assets!)
      const customIcon = L.divIcon({
        className: 'custom-visitor-marker',
        html: `
          <div class="relative flex items-center justify-center" style="width: ${size}px; height: ${size}px;">
            <div class="absolute rounded-full bg-royal-gold/20 animate-ping" style="width: ${pingSize}px; height: ${pingSize}px; animation-duration: 2.5s;"></div>
            <div class="absolute rounded-full bg-royal-gold/45 border-2 border-royal-gold shadow-lg shadow-royal-gold/20" style="width: ${size}px; height: ${size}px;"></div>
            <div class="w-2.5 h-2.5 rounded-full bg-white shadow-md z-10"></div>
          </div>
        `,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2]
      });

      const marker = L.marker([pt.lat, pt.lng], { icon: customIcon });

      // Interactive popup with professional layout
      const popupContent = `
        <div class="font-mono text-zinc-950 p-1.5" style="min-width: 130px;">
          <p class="font-black text-xs text-amber-600 uppercase tracking-wider">${pt.city}</p>
          <p class="text-[11px] font-bold text-zinc-700 mt-1">Bezoeken: <span class="text-zinc-900 font-extrabold">${pt.count}</span></p>
          <p class="text-[9px] text-zinc-400 mt-0.5">${pt.lat.toFixed(4)}°N, ${pt.lng.toFixed(4)}°E</p>
        </div>
      `;

      marker.bindPopup(popupContent, {
        closeButton: false,
        className: 'custom-leaflet-popup'
      });

      // Hover feedback integration
      marker.on('mouseover', () => {
        setHoveredCity(pt);
        marker.openPopup();
      });

      marker.on('mouseout', () => {
        setHoveredCity(null);
        marker.closePopup();
      });

      marker.on('click', () => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([pt.lat, pt.lng], Math.max(11, mapInstanceRef.current.getZoom()), {
            animate: true
          });
        }
      });

      markersLayerRef.current?.addLayer(marker);
    });
  }, [sortedCityPoints]);

  // Fly map to selected city from list
  const handleFlyToCity = (pt: CityPoint) => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([pt.lat, pt.lng], 11, {
        animate: true,
        duration: 1.5
      });
    }
  };

  return (
    <div className={`grid grid-cols-1 ${isLarge ? 'lg:grid-cols-12' : ''} gap-8 items-stretch`}>
      {/* Real Interactive Map Column with Perfect Full-Bleed Frame */}
      <div className={`${isLarge ? 'lg:col-span-7 h-[680px]' : 'h-[520px]'} bg-zinc-950 border border-zinc-900 rounded-3xl relative flex flex-col overflow-hidden group transition-all duration-300`}>
        
        {/* Actual Leaflet Map Canvas Container - Full bleed behind overlays */}
        <div 
          ref={mapContainerRef} 
          className="absolute inset-0 w-full h-full z-0 rounded-3xl" 
          style={{ background: '#09090b' }} 
        />

        {/* Map Header Overlay (Placed above map with high z-index) */}
        <div className="absolute top-5 left-5 z-[2000] space-y-1 select-none pointer-events-none">
          <div className="pointer-events-auto bg-zinc-950/90 border border-zinc-900/80 px-4 py-3 rounded-2xl backdrop-blur-md shadow-2xl max-w-[280px] md:max-w-[320px]">
            <span className="text-zinc-400 text-[10px] uppercase tracking-widest font-mono flex items-center gap-1.5">
              <Compass size={12} className="text-royal-gold animate-spin" style={{ animationDuration: '6s' }} /> 
              Geo-tracker • {viewports[zoomLevel].title}
            </span>
            <h4 className="text-white text-base md:text-lg font-bold italic mt-0.5">Visueel Verspreidingsgebied</h4>
            <p className="text-[10px] text-zinc-500 font-mono mt-1 leading-relaxed">
              {filterMode === 'all' 
                ? 'Alle historische websitebezoeken' 
                : `Weergave voor week: ${formattedWeekRange}`}
            </p>
          </div>
        </div>

        {/* Floating Top Center Mode Selector & Week Controller */}
        <div className="absolute top-5 right-5 md:right-auto md:left-1/2 md:-translate-x-1/2 z-[2000] pointer-events-auto flex flex-col gap-2 items-center">
          {/* Main filter mode switcher */}
          <div className="bg-zinc-950/90 border border-zinc-900 p-1 rounded-2xl flex gap-1.5 backdrop-blur-md shadow-2xl">
            <button
              onClick={() => {
                setFilterMode('all');
                setHoveredCity(null);
              }}
              className={`px-3.5 py-1.5 rounded-xl font-mono text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                filterMode === 'all'
                  ? 'bg-royal-gold text-black font-black shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Globe size={11} /> Alle Bezoeken
            </button>
            <button
              onClick={() => {
                setFilterMode('week');
                setHoveredCity(null);
              }}
              className={`px-3.5 py-1.5 rounded-xl font-mono text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                filterMode === 'week'
                  ? 'bg-royal-gold text-black font-black shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Calendar size={11} /> Per Week
            </button>
          </div>

          {/* Week navigation (only displays in 'week' filterMode) */}
          {filterMode === 'week' && (
            <div className="bg-zinc-950/95 border border-royal-gold/25 p-1.5 rounded-xl flex items-center gap-1.5 backdrop-blur-md shadow-2xl animate-fade-in">
              <button
                onClick={handlePrevWeek}
                className="p-1.5 bg-zinc-900 hover:bg-white text-zinc-400 hover:text-black rounded-lg transition-all"
                title="Vorige week"
              >
                <ChevronLeft size={13} />
              </button>
              
              <div className="flex items-center gap-1 px-1.5 text-center min-w-[170px] justify-center">
                <Clock size={11} className="text-royal-gold shrink-0 animate-pulse" />
                <span className="text-[9px] md:text-[10px] font-mono font-bold text-zinc-200 select-none whitespace-nowrap">
                  {formattedWeekRange}
                </span>
              </div>

              <button
                onClick={handleNextWeek}
                disabled={isNextWeekDisabled}
                className="p-1.5 bg-zinc-900 hover:bg-white text-zinc-400 hover:text-black disabled:opacity-30 disabled:hover:bg-zinc-900 disabled:hover:text-zinc-400 rounded-lg transition-all"
                title="Volgende week"
              >
                <ChevronRight size={13} />
              </button>

              {!isNextWeekDisabled && (
                <button
                  onClick={handleResetToCurrentWeek}
                  className="p-1.5 bg-zinc-900 hover:bg-royal-gold text-zinc-400 hover:text-black rounded-lg transition-all border border-zinc-800"
                  title="Terug naar huidige week"
                >
                  <RotateCcw size={11} />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Hover City Tooltip */}
        {hoveredCity && (
          <div className="absolute top-[180px] right-5 z-[2000] bg-zinc-950/95 border border-royal-gold/40 text-white text-xs px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-md animate-fade-in font-mono min-w-[150px] pointer-events-auto">
            <p className="font-extrabold text-royal-gold uppercase tracking-wider text-[12px]">{hoveredCity.city}</p>
            <div className="mt-1.5 space-y-1 text-zinc-300">
              <p className="flex justify-between gap-4"><span>Bezoeken:</span> <span className="text-white font-black">{hoveredCity.count}</span></p>
              <p className="text-[9px] text-zinc-500 italic font-sans">{hoveredCity.lat.toFixed(4)}°N, {hoveredCity.lng.toFixed(4)}°E</p>
            </div>
          </div>
        )}

        {/* Floating Zoom Controls (Bottom Right) */}
        <div className="absolute bottom-5 right-5 z-[2000] flex flex-col gap-2.5 pointer-events-auto">
          <button 
            onClick={() => {
              if (mapInstanceRef.current) mapInstanceRef.current.zoomIn();
            }}
            className="p-3 bg-zinc-950/90 hover:bg-white text-zinc-400 hover:text-black border border-zinc-900 rounded-xl transition-all shadow-lg backdrop-blur-md"
            title="Inzoomen"
          >
            <ZoomIn size={15} />
          </button>
          <button 
            onClick={() => {
              if (mapInstanceRef.current) mapInstanceRef.current.zoomOut();
            }}
            className="p-3 bg-zinc-950/90 hover:bg-white text-zinc-400 hover:text-black border border-zinc-900 rounded-xl transition-all shadow-lg backdrop-blur-md"
            title="Uitzoomen"
          >
            <ZoomOut size={15} />
          </button>
        </div>

        {/* Floating Geography Quick-Links (Bottom Left) */}
        <div className="absolute bottom-5 left-5 z-[2000] bg-zinc-950/95 border border-zinc-900 p-1 rounded-2xl flex gap-1 backdrop-blur-md shadow-2xl pointer-events-auto">
          {(['nl', 'eu', 'world'] as ZoomLevel[]).map((level) => (
            <button
              key={level}
              onClick={() => setZoomLevel(level)}
              className={`px-3.5 py-2 rounded-xl font-mono text-[10px] font-bold uppercase tracking-wider transition-all ${
                zoomLevel === level 
                  ? 'bg-royal-gold text-black shadow-md shadow-royal-gold/5 font-black' 
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {level === 'nl' ? 'Nederland' : level === 'eu' ? 'Europa' : 'Wereld'}
            </button>
          ))}
        </div>

        {/* Map Styles Custom Injections */}
        <style dangerouslySetInnerHTML={{ __html: `
          .leaflet-popup-content-wrapper {
            background: rgba(255, 255, 255, 0.98) !important;
            border-radius: 12px !important;
            border: 1px solid rgba(212, 175, 55, 0.4) !important;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3) !important;
          }
          .leaflet-popup-tip {
            background: rgba(255, 255, 255, 0.98) !important;
            border: 1px solid rgba(212, 175, 55, 0.4) !important;
          }
        ` }} />
      </div>

      {/* Details & List Column */}
      {isLarge && (
        <div className="lg:col-span-5 flex flex-col justify-between h-[680px]">
          <div className="bg-zinc-950 border border-zinc-900 rounded-3xl p-6 flex flex-col h-full overflow-hidden">
            <div className="space-y-4 pb-4 border-b border-zinc-900">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-royal-gold/10 rounded-2xl text-royal-gold border border-royal-gold/15">
                  <Globe size={18} />
                </div>
                <div>
                  <h4 className="text-white text-base font-bold">Demografische Herkomst</h4>
                  <p className="text-[10px] text-zinc-550 font-mono uppercase tracking-wider">
                    {filterMode === 'all' ? 'Alle historische data' : 'Gefilterd op geselecteerde week'}
                  </p>
                </div>
              </div>

              {/* Styled search input */}
              <div className="relative">
                <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Zoek stad..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-zinc-900/60 border border-zinc-850 hover:border-zinc-800 focus:border-royal-gold rounded-xl py-2.5 pl-10 pr-4 text-xs font-mono text-zinc-200 placeholder-zinc-500 focus:outline-none transition-all"
                />
              </div>
            </div>

            {/* Scrollable list of visitors matching search query */}
            <div className="flex-1 overflow-y-auto pr-1 py-4 space-y-3 scrollbar-custom">
              {filteredCities.map((pt, idx) => {
                const total = sortedCityPoints.reduce((sum, p) => sum + p.count, 0) || 1;
                const percentage = ((pt.count / total) * 100).toFixed(1);
                const isHovered = hoveredCity?.city === pt.city;

                return (
                  <div
                    key={idx}
                    onMouseEnter={() => setHoveredCity(pt)}
                    onMouseLeave={() => setHoveredCity(null)}
                    onClick={() => handleFlyToCity(pt)}
                    className={`p-4 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col gap-2.5 ${
                      isHovered
                        ? 'bg-royal-gold/10 border-royal-gold/45 shadow-lg shadow-royal-gold/5'
                        : 'bg-zinc-900/30 border-zinc-900 hover:bg-zinc-900/60 hover:border-zinc-800'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <MapPin size={12} className={isHovered ? 'text-royal-gold animate-bounce' : 'text-zinc-500'} />
                        <span className={`text-xs font-extrabold font-mono uppercase tracking-wider ${isHovered ? 'text-royal-gold' : 'text-zinc-300'}`}>
                          {pt.city}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 font-mono">
                        <span className="text-zinc-500 text-[10px]">{percentage}%</span>
                        <span className="text-[11px] font-extrabold text-white bg-zinc-850 px-2 py-0.5 rounded-md">
                          {pt.count} {pt.count === 1 ? 'bezoek' : 'bezoeken'}
                        </span>
                      </div>
                    </div>

                    {/* Styled progress/intensity bar */}
                    <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-royal-gold rounded-full transition-all duration-550"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}

              {filteredCities.length === 0 && (
                <div className="text-center py-16">
                  <p className="text-zinc-500 text-xs font-mono">
                    {filterMode === 'all' 
                      ? 'Geen bezoeken gevonden.' 
                      : 'Geen bezoeken gevonden in deze week.'}
                  </p>
                </div>
              )}
            </div>

            {/* Quick Metrics of the selection */}
            <div className="border-t border-zinc-900 pt-4 grid grid-cols-3 gap-3 font-mono">
              <div className="bg-zinc-900/30 p-3 rounded-2xl border border-zinc-900/60 flex flex-col justify-between">
                <p className="text-zinc-500 text-[8px] md:text-[9px] uppercase tracking-wider leading-none">Unieke Steden</p>
                <p className="text-white text-sm md:text-base font-extrabold mt-1.5">{filteredCities.length}</p>
              </div>
              <div className="bg-zinc-900/30 p-3 rounded-2xl border border-zinc-900/60 flex flex-col justify-between">
                <p className="text-zinc-550 text-[8px] md:text-[9px] uppercase tracking-wider leading-none text-royal-gold font-bold">Totaal Bezoeken</p>
                <p className="text-white text-sm md:text-base font-black mt-1.5">{sortedCityPoints.reduce((sum, p) => sum + p.count, 0)}</p>
              </div>
              <div className="bg-zinc-900/30 p-3 rounded-2xl border border-zinc-900/60 flex flex-col justify-between">
                <p className="text-zinc-500 text-[8px] md:text-[9px] uppercase tracking-wider leading-none">Populairste</p>
                <p className="text-royal-gold text-[10px] md:text-xs font-bold truncate mt-1.5">
                  {filteredCities[0]?.city ? filteredCities[0].city.toUpperCase() : 'GEEN'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
