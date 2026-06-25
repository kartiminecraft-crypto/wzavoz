import { useRef, useState, useEffect, useCallback } from 'react';
import { HeroCanvas, type ModelType } from './components/HeroCanvas';
import { HeroBackground } from './components/HeroBackground';
import { Cpu, Zap, Layers, MousePointer2, Volume2, VolumeX, ChevronRight, Bot, Grid, ArrowLeft, ChevronUp, ChevronDown } from 'lucide-react';
import { ImageWithFallback } from './components/figma/ImageWithFallback';
import logoImg from '../imports/outwest-studio-logo.png';

const BACKGROUND_MUSIC_URL = 'https://pub-e50338d48b204131aeae0f592bb26589.r2.dev/zelya2.mp3';

type ViewMode = 'EXTERIOR' | 'WIREFRAME';

const FEATURES = [
  { icon: Cpu,           label: 'Precision Engineering' },
  { icon: Zap,           label: 'Real-time Rendering'   },
  { icon: Layers,        label: 'Modular Design'         },
  { icon: MousePointer2, label: 'Interactive 3D'         },
];


const PAD = 48;
const PAD_INNER = 88; // left/right content blocks — pulled inward from edge

// Build transition strings that COMBINE the centering transform with the
// entrance slide — never overwrite one with the other.
function uiVisibility(entered: boolean, isExperienceStarted: boolean, delay = 0): React.CSSProperties {
  if (isExperienceStarted) {
    return {
      opacity: 0,
      filter: 'blur(12px)',
      pointerEvents: 'none',
      transition: 'opacity 0.8s ease, filter 0.8s ease',
    };
  }
  return {
    opacity: entered ? 1 : 0,
    filter: 'blur(0px)',
    transition: `opacity 0.75s ease ${delay}s, filter 0.75s ease ${delay}s`,
  };
}

function persistentVisibility(entered: boolean, isExperienceStarted: boolean, delay = 0): React.CSSProperties {
  return {
    opacity: entered ? 1 : 0,
    color: isExperienceStarted ? '#ffffff' : undefined, // Override color to white when experience starts
    transition: `opacity 0.75s ease ${delay}s, color 0.8s ease`,
  };
}

function ModelButton({ m, isActive, onClick }: { m: ModelType; isActive: boolean; onClick: () => void }) {
  const [isHovered, setIsHovered] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const Icon = m === 'Gandon' ? Bot : Grid;

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    buttonRef.current.style.setProperty('--mouse-x', `${x}px`);
    buttonRef.current.style.setProperty('--mouse-y', `${y}px`);
  };

  const contentColor = isHovered && !isActive ? '#0774C4' : '#0F172A';

  return (
    <button
      ref={buttonRef}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseMove={handleMouseMove}
      style={{
        position: 'relative',
        overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        width: '100%', height: 64, padding: '0 20px',
        borderRadius: 999,
        backgroundColor: isActive ? 'rgba(232, 236, 250, 0.85)' : (isHovered ? 'rgba(255, 255, 255, 0.65)' : 'rgba(232, 236, 250, 0.45)'),
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: isActive ? '1px solid rgba(15,23,42,0.1)' : '1px solid rgba(255,255,255,0.4)',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        transform: isHovered && !isActive ? 'translateY(-2px)' : 'translateY(0)',
      }}
    >
      {/* Dynamic Glow Layer */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          opacity: isHovered ? 1 : 0,
          transition: 'opacity 0.3s ease',
          background: 'radial-gradient(45px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(7, 116, 196, 0.15), transparent 100%)',
          zIndex: 0,
        }}
      />
      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 14 }}>
        <Icon size={22} color={contentColor} strokeWidth={1.5} style={{ transition: 'color 0.3s ease' }} />
        <span style={{
          fontFamily: "'Manrope', sans-serif",
          fontSize: '16px', fontWeight: 500,
          color: contentColor,
          transition: 'color 0.3s ease'
        }}>{m}</span>
      </div>
      <div style={{
         position: 'relative', zIndex: 1,
         transition: 'transform 0.3s ease, color 0.3s ease',
         transform: isHovered ? 'translateX(4px)' : 'translateX(0)',
      }}>
        <ChevronRight size={20} color={contentColor} strokeWidth={1.5} style={{ transition: 'color 0.3s ease' }} />
      </div>
    </button>
  );
}

export default function App() {
  const [mode, setMode]       = useState<ViewMode>('EXTERIOR');
  const [activeModel, setActiveModel] = useState<ModelType>('Gandon');
  const [sound, setSound]     = useState(false);
  const [volume, setVolume]   = useState(0.7);
  const [entered, setEntered] = useState(false);
  const [ctaHovered, setCtaHovered] = useState(false);
  const [isExperienceStarted, setIsExperienceStarted] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showLoader, setShowLoader] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const modeRef  = useRef<ViewMode>('EXTERIOR');
  const mouseRef = useRef({ x: 0, y: 0 });
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialise audio element once
  useEffect(() => {
    const audio = new Audio(BACKGROUND_MUSIC_URL);
    audio.loop = true;
    audio.volume = 0.7;
    audioRef.current = audio;
    return () => { audio.pause(); audio.src = ''; };
  }, []);

  // Keep volume in sync
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  // Handlers that touch audio directly (within the user-gesture call stack)
  const handleStartExperience = useCallback(() => {
    setIsExperienceStarted(true);
    setSound(true);
    audioRef.current?.play().catch(() => {});
  }, []);

  const handleGoBack = useCallback(() => {
    setIsExperienceStarted(false);
    setSound(false);
    setIsMobileMenuOpen(false); // Close bottom menu when returning to main screen
    
    setActiveModel(prev => {
      if (prev !== 'Gandon') {
        setIsLoaded(false);
        setLoadProgress(0);
        return 'Gandon';
      }
      return prev;
    });
    
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
  }, []);

  const handleSoundToggle = useCallback(() => {
    setSound(prev => {
      const next = !prev;
      if (next) audioRef.current?.play().catch(() => {});
      else audioRef.current?.pause();
      return next;
    });
  }, []);

  useEffect(() => { modeRef.current = mode; }, [mode]);
  
  // UI Entrance: only trigger after loader finishes and model emerges
  useEffect(() => {
    if (isLoaded) {
      const t = setTimeout(() => setEntered(true), 800); // Wait for model emergence
      return () => clearTimeout(t);
    }
  }, [isLoaded]);

  useEffect(() => {
    if (isLoaded) {
      // Allow fade-out animation to complete before unmounting loader
      const t = setTimeout(() => setShowLoader(false), 1200);
      return () => clearTimeout(t);
    }
  }, [isLoaded]);

  const handleLoaded = useCallback(() => setIsLoaded(true), []);
  const handleProgress = useCallback((p: number) => setLoadProgress(p), []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    const { clientX, clientY, currentTarget } = e;
    const { width, height } = (currentTarget as HTMLElement).getBoundingClientRect();
    mouseRef.current = { x: (clientX / width) * 2 - 1, y: (clientY / height) * 2 - 1 };
  }, []);
  const onMouseLeave = useCallback(() => { mouseRef.current = { x: 0, y: 0 }; }, []);

  return (
    <div
      className="relative w-full h-screen overflow-hidden select-none"
      style={{ fontFamily: "'Manrope', sans-serif" }}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    >
      {/* Animated iridescent background + parallax bokeh */}
      <HeroBackground mouseRef={mouseRef} />

      {/* Loading Screen Overlay */}
      {showLoader && (
        <div 
          className="absolute inset-0 z-50 flex items-center justify-center overflow-hidden"
          style={{
            pointerEvents: isLoaded ? 'none' : 'auto',
            opacity: isLoaded ? 0 : 1,
            transition: 'opacity 1s ease-in-out',
          }}
        >
          {/* Main Background shown behind everything so we can reveal it */}
          <div className="absolute inset-0">
             <HeroBackground mouseRef={mouseRef} />
          </div>

          {/* Layer 1: Radial Gradient (White edges, blue middle). Fades out as progress goes up. */}
          <div 
            className="absolute inset-0"
            style={{
              background: 'radial-gradient(circle, #93B6F0 0%, #FFFFFF 100%)',
              opacity: Math.max(0, 1 - loadProgress * 2), // Fully opaque at 0%, 0 at 50%
              transition: 'opacity 0.2s linear',
            }}
          />
          
          {/* Layer 2: Solid Pink. Fades in at 50%, then fades out at 100% to reveal main background. */}
          <div 
            className="absolute inset-0"
            style={{
              background: '#E3D9F0',
              opacity: loadProgress < 0.5 ? 0 : (loadProgress >= 1 ? 0 : (loadProgress - 0.5) * 2),
              transition: 'opacity 0.2s linear',
            }}
          />

          <div 
            className="relative z-10 flex flex-col items-center justify-center"
            style={{
              opacity: isLoaded ? 0 : 1,
              transform: isLoaded ? 'scale(0.95)' : 'scale(1)',
              transition: 'opacity 0.8s ease-in-out, transform 1s ease-in-out',
            }}
          >
            <div style={{
              width: 240, height: 240, marginBottom: 24,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <ImageWithFallback src={logoImg} alt="Outwest Studio Logo" className="w-full h-full object-contain" />
            </div>
            
            <div className="w-48 h-1.5 bg-white/20 rounded-full overflow-hidden relative">
              <div 
                className="absolute top-0 left-0 bottom-0 bg-white rounded-full transition-all duration-300 ease-out"
                style={{ width: `${Math.max(5, loadProgress * 100)}%` }}
              />
            </div>
            
            <span style={{
              marginTop: 12,
              fontFamily: "'Manrope', sans-serif",
              fontSize: '0.85rem', fontWeight: 600,
              letterSpacing: '0.15em',
              color: '#ffffff',
            }}>
              {Math.floor(loadProgress * 100)}%
            </span>
          </div>
        </div>
      )}

      {/* 3D Canvas — blurs in from transparent as model emerges after load */}
      <div
        className="absolute inset-0"
        style={{
          opacity:    isLoaded ? 1 : 0,
          filter:     isLoaded ? 'blur(0px)' : 'blur(18px)',
          transition: 'opacity 1.4s ease 0.4s, filter 1.4s ease 0.4s',
        }}
      >
        <HeroCanvas modeRef={modeRef} mouseRef={mouseRef} isExperienceStarted={isExperienceStarted} onLoaded={handleLoaded} onProgress={handleProgress} activeModel={activeModel} />
      </div>

      {/* Inline Loader for Model Switching */}
      <div
        className="absolute inset-0 pointer-events-none flex items-center justify-center"
        style={{
          opacity: isExperienceStarted && !isLoaded ? 1 : 0,
          transition: 'opacity 0.4s ease',
          zIndex: 5,
        }}
      >
        <div className="flex flex-col items-center justify-center gap-4 px-8 py-6 rounded-2xl" style={{
          backgroundColor: 'rgba(205,212,238,0.5)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          border: '1px solid rgba(185,194,228,0.38)',
          boxShadow: '0 2px 16px rgba(100,110,190,0.1)',
          width: '260px',
          boxSizing: 'border-box'
        }}>
          <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white animate-spin" />
          <span style={{
            fontFamily: "'Manrope', sans-serif",
            fontSize: '0.75rem', fontWeight: 600,
            letterSpacing: '0.15em', textTransform: 'uppercase',
            color: '#ffffff',
            textAlign: 'center',
            fontVariantNumeric: 'tabular-nums'
          }}>
            Loading {activeModel}... {Math.floor(loadProgress * 100)}%
          </span>
        </div>
      </div>

      {/* ── LEFT: logo + headline — vertically centered ────��─────────
          transform keeps translateY(-50%) at all times; opacity fades in. */}
      {/* ── MOBILE SHADING: Improves text readability on mobile ──────── */}
      <div
        className="absolute bottom-0 left-0 w-full h-[360px] pointer-events-none md:hidden"
        style={{
          background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 45%, transparent 100%)',
          ...uiVisibility(entered, isExperienceStarted, 0),
          zIndex: 0,
        }}
      />
      <div
        className="absolute pointer-events-auto left-1/2 bottom-[140px] -translate-x-1/2 flex flex-col items-center md:items-start md:left-[88px] md:top-1/2 md:bottom-auto md:translate-x-0 md:-translate-y-1/2 w-[90%] md:w-auto"
        style={{
          ...uiVisibility(entered, isExperienceStarted, 0),
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <div style={{ width: 28, height: 28, flexShrink: 0 }}>
            <ImageWithFallback src={logoImg} alt="Outwest Studio" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
          </div>
          <span className="text-[0.9rem] md:text-[0.72rem]" style={{
            fontFamily: "'Manrope', sans-serif",
            fontWeight: 600,
            letterSpacing: '0.1em', textTransform: 'uppercase' as const,
            color: '#ffffff', lineHeight: 1,
          }}>Outwest Studio</span>
        </div>

        <style>{`
          @keyframes textWater {
            0% { background-position: 0% center; }
            100% { background-position: 200% center; }
          }
          .shimmer-text {
            background-image: linear-gradient(
              to right,
              #F4F7FD 0%,
              #EAEFFF 25%,
              #F4F7FD 50%,
              #EAEFFF 75%,
              #F4F7FD 100%
            );
            background-size: 200% auto;
            animation: textWater 7s linear infinite;
            -webkit-background-clip: text;
            background-clip: text;
            -webkit-text-fill-color: transparent;
            color: transparent;
          }
        `}</style>
        <h1 className="shimmer-text text-center md:text-left text-[3.8rem] leading-[1.05] md:text-[clamp(2.4rem,4.4vw,4.2rem)] md:leading-[1.15]" style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontWeight: 500,
          letterSpacing: '-0.025em',
          margin: 0,
          paddingBottom: '0.12em', // prevents descenders (g, y) from being clipped by background-clip:text
        }}>
          <span className="hidden md:inline">Roblox<br />Binance</span>
          <span className="inline md:hidden">Binance<br />Roblox</span>
        </h1>
      </div>

      {/* ── TOP-LEFT: Go Back button ── */}
      <div
        className="absolute left-[16px] md:left-[88px]"
        style={{
          top: PAD,
          opacity: isExperienceStarted ? 1 : 0,
          pointerEvents: isExperienceStarted ? 'auto' : 'none',
          transition: 'opacity 0.8s ease, transform 0.8s ease',
          transform: isExperienceStarted ? 'translateY(0)' : 'translateY(-20px)',
          zIndex: 10,
        }}
      >
        <button
          className="hidden md:block"
          style={{
            fontFamily: "'Manrope', sans-serif",
            fontSize: '0.75rem',
            fontWeight: 600,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: '#ffffff',
            padding: '10px 20px',
            borderRadius: 999,
            border: '1px solid rgba(255,255,255,0.25)',
            cursor: 'pointer',
            backgroundColor: 'rgba(255,255,255,0.1)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            transition: 'background-color 0.2s ease, border-color 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)';
          }}
          onClick={handleGoBack}
        >
          Go Back
        </button>

        {/* Mobile Go Back Circle (matches navbar style/size) */}
        <button
          className="md:hidden flex items-center justify-center"
          style={{
            width: 52,
            height: 52,
            borderRadius: 999,
            backgroundColor: 'rgba(205,212,238,0.5)',
            backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
            border: '1px solid rgba(185,194,228,0.38)',
            boxShadow: '0 2px 16px rgba(100,110,190,0.1)',
            cursor: 'pointer',
          }}
          onClick={handleGoBack}
        >
          <ArrowLeft size={20} color="#fff" />
        </button>
      </div>

      {/* ── TOP-CENTER: view toggle — exactly centered with translateX(-50%) ── */}
      <div
        className="absolute pointer-events-auto"
        style={{
          top: PAD,
          left: '50%',
          transform: 'translateX(-50%)',   // never overwritten
          ...persistentVisibility(entered, isExperienceStarted, 0.12),
        }}
      >
        <div style={{
          display: 'inline-flex', alignItems: 'center',
          backgroundColor: 'rgba(205,212,238,0.5)',
          backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
          border: '1px solid rgba(185,194,228,0.38)',
          borderRadius: 999, padding: '3px',
          boxShadow: '0 2px 16px rgba(100,110,190,0.1)',
          gap: 2,
        }}>
          {(['EXTERIOR', 'WIREFRAME'] as ViewMode[]).map((v) => (
            <button key={v} onClick={() => setMode(v)} style={{
              fontFamily: "'Manrope', sans-serif",
              fontSize: '0.6rem', fontWeight: 500,
              letterSpacing: '0.1em', textTransform: 'uppercase' as const,
              padding: '6px 18px', minHeight: 44,
              borderRadius: 999, border: 'none', cursor: 'pointer',
              transition: 'all 0.25s ease',
              backgroundColor: mode === v ? '#0774C4' : 'transparent',
              color: '#ffffff',
              boxShadow: mode === v ? '0 4px 12px rgba(7, 116, 196, 0.4)' : 'none',
              textShadow: mode === v ? '0 0 8px rgba(255, 255, 255, 0.5)' : 'none',
            }}
            onMouseEnter={(e) => {
              if (mode !== v) {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)';
                e.currentTarget.style.boxShadow = '0 0 15px rgba(255, 255, 255, 0.3)';
              }
            }}
            onMouseLeave={(e) => {
              if (mode !== v) {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.boxShadow = 'none';
              }
            }}
            >{v}</button>
          ))}
        </div>
      </div>

      {/* ── RIGHT: feature list — vertically centered with translateY(-50%) ── */}
      <div
        className="absolute pointer-events-auto hidden md:block"
        style={{
          right: PAD_INNER,
          top: '50%',
          transform: 'translateY(-50%)',   // never overwritten
          ...uiVisibility(entered, isExperienceStarted, 0.22),
        }}
      >
        {FEATURES.map((f, i) => {
          const Icon = f.icon;
          return (
            <div key={f.label}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 0' }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  backgroundColor: '#A7BDF8',
                }}>
                  <Icon size={15} strokeWidth={1.5} style={{ color: '#ffffff' }} />
                </div>
                <span style={{
                  fontFamily: "'Manrope', sans-serif",
                  fontSize: '0.82rem', fontWeight: 500,
                  letterSpacing: '0.06em', textTransform: 'uppercase' as const,
                  color: '#ffffff', whiteSpace: 'nowrap',
                }}>{f.label}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── RIGHT: Model Selector (Desktop) — visible when experience is active ── */}
      <div
        className="hidden md:flex absolute flex-col"
        style={{
          right: PAD_INNER,
          top: '50%',
          transform: 'translateY(-50%)',
          opacity: isExperienceStarted ? 1 : 0,
          pointerEvents: isExperienceStarted ? 'auto' : 'none',
          transition: 'opacity 0.8s ease 0.4s',
          gap: 12,
          zIndex: 10,
          width: 260,
          padding: 16,
          borderRadius: 24,
          backgroundColor: 'rgba(255,255,255,0.05)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <span style={{
          fontFamily: "'Manrope', sans-serif",
          fontSize: '0.65rem', fontWeight: 600,
          letterSpacing: '0.15em', textTransform: 'uppercase' as const,
          color: 'rgba(255,255,255,0.7)', marginBottom: 4,
          textAlign: 'center',
          display: 'block'
        }}>Select Model</span>
        {(['Gandon', 'Fence', 'Paul'] as ModelType[]).map((m) => (
          <ModelButton
            key={m}
            m={m}
            isActive={activeModel === m}
            onClick={() => {
              if (activeModel !== m) {
                setIsLoaded(false);
                setLoadProgress(0);
                setActiveModel(m);
              }
            }}
          />
        ))}
      </div>

      {/* ── MOBILE: Bottom Sheet Overlay (closes menu) ── */}
      <div
        className="md:hidden absolute inset-0 z-30"
        style={{ 
          backgroundColor: 'rgba(0,0,0,0.4)', 
          opacity: isMobileMenuOpen ? 1 : 0,
          pointerEvents: isMobileMenuOpen ? 'auto' : 'none',
          transition: 'opacity 0.4s ease'
        }}
        onClick={() => setIsMobileMenuOpen(false)}
      />

      {/* ── MOBILE: Bottom Sheet Model Selector ── */}
      <div
        className="md:hidden absolute left-0 w-full"
        style={{
          bottom: 0,
          transform: isExperienceStarted ? 'translateY(0)' : 'translateY(100%)',
          pointerEvents: isExperienceStarted ? 'auto' : 'none',
          transition: `transform 0.8s cubic-bezier(0.32, 0.72, 0, 1) 0s`,
          zIndex: 40,
        }}
      >
        <div
          style={{
            backgroundColor: 'rgba(255,255,255,0.05)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: '20px 24px',
            boxShadow: '0 -4px 32px rgba(0,0,0,0.15)',
            display: 'flex',
            flexDirection: 'column',
            transform: 'translateZ(0)',
            WebkitTransform: 'translateZ(0)',
            willChange: 'transform',
          }}
        >
          {/* Header */}
          <div 
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', height: 32 }}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <span style={{
              fontFamily: "'Manrope', sans-serif",
              fontSize: '0.9rem', fontWeight: 600,
              letterSpacing: '0.15em', textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.7)',
            }}>SELECT MODEL</span>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              backgroundColor: 'rgba(255,255,255,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transform: isMobileMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.4s cubic-bezier(0.32, 0.72, 0, 1)'
            }}>
              <ChevronUp size={20} color="#ffffff" />
            </div>
          </div>

          {/* Expanded Content */}
          <div style={{
            display: 'grid',
            gridTemplateRows: isMobileMenuOpen ? '1fr' : '0fr',
            opacity: isMobileMenuOpen ? 1 : 0,
            transition: 'grid-template-rows 0.4s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.4s ease',
          }}>
            <div style={{ overflow: 'hidden' }}>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                paddingTop: 24, // spacing from header
                paddingBottom: 4, // slight bottom padding inside safe area
              }}>
                {(['Gandon', 'Fence', 'Paul'] as ModelType[]).map((m) => (
                  <ModelButton
                    key={m}
                    m={m}
                    isActive={activeModel === m}
                    onClick={() => {
                      if (activeModel !== m) {
                        setIsLoaded(false);
                        setLoadProgress(0);
                        setActiveModel(m);
                        setIsMobileMenuOpen(false);
                      }
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── BOTTOM-LEFT: sound toggle + volume slider ── */}
      <style>{`
        .vol-slider { -webkit-appearance:none; appearance:none; width:84px; height:3px;
          border-radius:999px; background:rgba(255,255,255,0.28); outline:none; cursor:pointer; }
        .vol-slider::-webkit-slider-thumb { -webkit-appearance:none; width:13px; height:13px;
          border-radius:50%; background:#fff; cursor:pointer; box-shadow:0 1px 4px rgba(0,0,0,0.18); }
        .vol-slider::-moz-range-thumb { width:13px; height:13px; border-radius:50%;
          background:#fff; cursor:pointer; border:none; }
      `}</style>
      <div
        className="absolute pointer-events-auto hidden md:flex"
        style={{
          bottom: PAD - 8, left: PAD,
          alignItems: 'center', gap: 8,
          ...persistentVisibility(entered, isExperienceStarted, 0.3),
        }}
      >
        <button
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '10px 15px', borderRadius: 999, border: 'none', cursor: 'pointer',
            backgroundColor: '#88AAFB',
            backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
            boxShadow: '0 1px 8px rgba(100,110,180,0.08)',
            minHeight: 44,
          }}
          onClick={handleSoundToggle}
        >
          {sound
            ? <Volume2 size={12} strokeWidth={1.5} style={{ color: '#ffffff' }} />
            : <VolumeX  size={12} strokeWidth={1.5} style={{ color: '#ffffff' }} />
          }
          <span style={{
            fontFamily: "'Manrope', sans-serif",
            fontSize: '0.6rem', fontWeight: 500,
            letterSpacing: '0.1em', textTransform: 'uppercase' as const,
            color: '#ffffff',
          }}>{sound ? 'Sound On' : 'Sound Off'}</span>
        </button>

        {/* Volume slider — slides in when experience is active */}
        <div style={{
          overflow: 'hidden',
          width: sound ? 108 : 0,
          opacity: sound ? 1 : 0,
          transition: 'width 0.45s cubic-bezier(0.4,0,0.2,1), opacity 0.35s ease',
          display: 'flex', alignItems: 'center',
          backgroundColor: 'rgba(136,170,251,0.55)',
          backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
          borderRadius: 999,
          padding: sound ? '10px 14px' : '10px 0',
          boxSizing: 'border-box',
          minHeight: 44,
          whiteSpace: 'nowrap',
        }}>
          <input
            className="vol-slider"
            type="range"
            min={0} max={1} step={0.01}
            value={volume}
            onChange={e => setVolume(parseFloat(e.target.value))}
          />
        </div>
      </div>

      {/* ── BOTTOM-CENTER: CTA — text rolls down on hover ── */}
      <div
        className="absolute pointer-events-auto bottom-[40px] left-1/2 -translate-x-1/2"
        style={{
          ...uiVisibility(entered, isExperienceStarted, 0.3),
        }}
      >
        {/* Outer diffuse halo — intensifies on hover */}
        <div style={{
          position: 'relative',
          display: 'inline-flex',
          borderRadius: 999,
          padding: 0,
        }}>
          {/* Halo glow layer */}
          <div style={{
            position: 'absolute',
            inset: -22,
            borderRadius: 999,
            backgroundImage: ctaHovered
              ? 'radial-gradient(ellipse at center, rgba(7,116,196,0.35) 0%, rgba(7,116,196,0.14) 45%, transparent 70%)'
              : 'radial-gradient(ellipse at center, rgba(140,162,228,0.22) 0%, rgba(140,162,228,0.08) 50%, transparent 72%)',
            transition: 'background-image 0.35s ease',
            pointerEvents: 'none',
          }} />
          {/* Inner ring */}
          <div style={{
            position: 'absolute',
            inset: -5,
            borderRadius: 999,
            border: ctaHovered
              ? '1.5px solid rgba(7,116,196,0.55)'
              : '1.5px solid rgba(155,175,230,0.3)',
            transition: 'border-color 0.35s ease',
            pointerEvents: 'none',
          }} />

          {/* Pulse layer */}
          <style>{`
            @keyframes ctaPulse {
              0% { box-shadow: 0 0 0 0 rgba(136, 170, 251, 0.6); }
              70% { box-shadow: 0 0 0 25px rgba(136, 170, 251, 0); }
              100% { box-shadow: 0 0 0 0 rgba(136, 170, 251, 0); }
            }
          `}</style>
          <div style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 999,
            pointerEvents: 'none',
            animation: 'ctaPulse 2s infinite',
            zIndex: 0,
          }} />

          <button
            style={{
              fontFamily: "'Manrope', sans-serif",
              fontSize: '0.9rem', fontWeight: 700,
              letterSpacing: '0.06em',
              color: '#0774C4',
              padding: '21px 42px',
              borderRadius: 999,
              border: ctaHovered
                ? '1px solid rgba(7,116,196,0.45)'
                : '1px solid rgba(175,195,235,0.55)',
              cursor: 'pointer',
              minHeight: 44,
              backgroundColor: 'rgba(255,255,255,0.92)',
              backdropFilter: 'blur(18px)',
              WebkitBackdropFilter: 'blur(18px)',
              boxShadow: ctaHovered
                ? '0 6px 32px rgba(7,116,196,0.22), 0 2px 10px rgba(7,116,196,0.12)'
                : '0 4px 24px rgba(100,130,210,0.14), 0 1px 6px rgba(100,130,210,0.08)',
              transition: 'box-shadow 0.35s ease, border-color 0.35s ease',
              position: 'relative',
            }}
            onMouseEnter={() => setCtaHovered(true)}
            onMouseLeave={() => setCtaHovered(false)}
            onClick={handleStartExperience}
          >
            {/*
              Letter-by-letter stair-step animation.
              Splits "Start Experience" and applies staggered delay to each character's transform.
            */}
            <div style={{ position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: '1.2' }}>
              {"Start Experience".split('').map((char, i) => (
                <span key={i} style={{ position: 'relative', display: 'inline-block' }}>
                  <span style={{
                    display: 'inline-block',
                    whiteSpace: 'pre',
                    transform: ctaHovered ? 'translateY(150%)' : 'translateY(0%)',
                    transition: `transform 0.4s cubic-bezier(0.4, 0, 0.2, 1) ${i * 0.02}s`,
                  }}>
                    {char}
                  </span>
                  <span style={{
                    position: 'absolute',
                    top: 0, left: 0,
                    display: 'inline-block',
                    whiteSpace: 'pre',
                    transform: ctaHovered ? 'translateY(0%)' : 'translateY(-150%)',
                    transition: `transform 0.4s cubic-bezier(0.4, 0, 0.2, 1) ${i * 0.02}s`,
                  }}>
                    {char}
                  </span>
                </span>
              ))}
            </div>
          </button>
        </div>
      </div>

      {/* ── BOTTOM-RIGHT: credit ── */}
      <p className="absolute hidden md:block" style={{
        bottom: PAD - 8, right: PAD,
        fontFamily: "'Manrope', sans-serif",
        fontSize: '0.58rem', fontWeight: 500,
        letterSpacing: '0.1em', textTransform: 'uppercase' as const,
        color: '#ffffff',
        transition: 'color 0.8s ease',
        margin: 0,
        opacity: entered ? 1 : 0,
      }}>
        Created by Studio Outwest
      </p>

    </div>
  );
}
