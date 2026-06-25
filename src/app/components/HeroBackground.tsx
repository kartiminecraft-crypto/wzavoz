import { useEffect, useRef } from 'react';

// Bokeh blobs — soft filled circles
const BOKEH: {
  x: number; y: number; size: number; op: number;
  blur: number; depth: number; dur: number; del: number; color: string;
}[] = [
  // deep (depth 0.3)
  { x: 72, y: 12, size: 180, op: 0.18, blur: 40, depth: 0.3, dur: 18, del: 0,  color: '#91B5F0' },
  { x: 18, y: 35, size: 140, op: 0.15, blur: 35, depth: 0.3, dur: 22, del: 3,  color: '#E4DAEF' },
  { x: 55, y: 68, size: 160, op: 0.14, blur: 45, depth: 0.3, dur: 20, del: 6,  color: '#A8C2F5' },
  { x: 88, y: 58, size: 120, op: 0.16, blur: 32, depth: 0.3, dur: 25, del: 9,  color: '#DDD0F4' },
  { x: 32, y: 80, size: 100, op: 0.12, blur: 38, depth: 0.3, dur: 19, del: 4,  color: '#91B5F0' },
  // mid (depth 0.6)
  { x: 60, y: 22, size: 72,  op: 0.18, blur: 22, depth: 0.6, dur: 14, del: 1,  color: '#E4DAEF' },
  { x: 25, y: 55, size: 55,  op: 0.16, blur: 18, depth: 0.6, dur: 16, del: 5,  color: '#91B5F0' },
  { x: 80, y: 40, size: 65,  op: 0.17, blur: 20, depth: 0.6, dur: 13, del: 7,  color: '#C8D8F8' },
  { x: 42, y: 88, size: 50,  op: 0.13, blur: 16, depth: 0.6, dur: 18, del: 2,  color: '#E4DAEF' },
  { x: 10, y: 15, size: 45,  op: 0.15, blur: 14, depth: 0.6, dur: 15, del: 8,  color: '#91B5F0' },
  { x: 90, y: 80, size: 58,  op: 0.12, blur: 19, depth: 0.6, dur: 17, del: 11, color: '#D0C8F2' },
  // near (depth 1.0)
  { x: 48, y: 30, size: 28,  op: 0.22, blur: 8,  depth: 1.0, dur: 10, del: 0,  color: '#F0EAFF' },
  { x: 15, y: 72, size: 22,  op: 0.20, blur: 6,  depth: 1.0, dur: 12, del: 3,  color: '#E4DAEF' },
  { x: 78, y: 18, size: 32,  op: 0.19, blur: 10, depth: 1.0, dur: 11, del: 6,  color: '#91B5F0' },
  { x: 65, y: 82, size: 18,  op: 0.21, blur: 5,  depth: 1.0, dur:  9, del: 2,  color: '#EAE0FC' },
  { x: 35, y: 10, size: 24,  op: 0.18, blur: 7,  depth: 1.0, dur: 13, del: 8,  color: '#C8E0FF' },
];

// Outline ring circles — water drops matching the reference screenshot
const RINGS: {
  x: number; y: number; size: number; op: number; depth: number; dur: number; del: number;
}[] = [
  // deep layer
  { x: 82, y: 8,  size: 32, op: 0.25, depth: 0.3, dur: 20, del: 0  },
  { x: 12, y: 45, size: 24, op: 0.20, depth: 0.3, dur: 24, del: 4  },
  { x: 65, y: 75, size: 36, op: 0.15, depth: 0.3, dur: 18, del: 8  },
  { x: 45, y: 15, size: 20, op: 0.22, depth: 0.3, dur: 22, del: 2  },
  // mid layer
  { x: 28, y: 20, size: 18, op: 0.28, depth: 0.6, dur: 15, del: 1  },
  { x: 73, y: 50, size: 14, op: 0.22, depth: 0.6, dur: 17, del: 5  },
  { x: 55, y: 88, size: 22, op: 0.20, depth: 0.6, dur: 19, del: 7  },
  { x: 90, y: 25, size: 12, op: 0.25, depth: 0.6, dur: 14, del: 3  },
  { x: 8,  y: 78, size: 16, op: 0.18, depth: 0.6, dur: 16, del: 9  },
  // near layer
  { x: 38, y: 60, size: 12, op: 0.32, depth: 1.0, dur: 11, del: 0  },
  { x: 88, y: 68, size: 14, op: 0.28, depth: 1.0, dur: 13, del: 6  },
  { x: 22, y: 90, size: 10, op: 0.35, depth: 1.0, dur: 10, del: 3  },
  { x: 60, y: 38, size: 15, op: 0.30, depth: 1.0, dur: 12, del: 8  },
];

interface Props {
  mouseRef: React.RefObject<{ x: number; y: number }>;
}

export function HeroBackground({ mouseRef }: Props) {
  const baseRef      = useRef<HTMLDivElement>(null);
  const bloom1Ref    = useRef<HTMLDivElement>(null);
  const bloom2Ref    = useRef<HTMLDivElement>(null);
  const bloom3Ref    = useRef<HTMLDivElement>(null);
  // separate parallax wrappers per depth
  const layerDeepRef = useRef<HTMLDivElement>(null);
  const layerMidRef  = useRef<HTMLDivElement>(null);
  const layerNearRef = useRef<HTMLDivElement>(null);
  const rDeepRef     = useRef<HTMLDivElement>(null);
  const rMidRef      = useRef<HTMLDivElement>(null);
  const rNearRef     = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let rafId: number;
    let smx = 0, smy = 0;
    let time = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      time += dt;

      const mx = mouseRef.current?.x ?? 0;
      const my = mouseRef.current?.y ?? 0;
      smx += (mx - smx) * 0.035;
      smy += (my - smy) * 0.035;

      // Parallax multipliers per depth
      const bx = -smx * 3.0,  by = -smy * 2.4;   // blooms — most movement
      const dx = -smx * 1.2,  dy = -smy * 0.9;   // deep
      const mx2 = -smx * 2.2, my2 = -smy * 1.8;  // mid
      const nx = -smx * 3.8,  ny = -smy * 3.0;   // near

      // Animated drift for blooms
      const d1x = Math.sin(time * 0.18) * 3,  d1y = Math.cos(time * 0.13) * 2;
      const d2x = Math.cos(time * 0.14) * 4,  d2y = Math.sin(time * 0.10) * 3;
      const d3x = Math.sin(time * 0.11 + 1.5) * 5, d3y = Math.cos(time * 0.16 + 0.8) * 3;

      const p1 = 0.85 + Math.sin(time * 0.22) * 0.15;
      const p2 = 0.80 + Math.cos(time * 0.17 + 1) * 0.20;
      const p3 = 0.75 + Math.sin(time * 0.19 + 2) * 0.25;

      if (bloom1Ref.current) {
        bloom1Ref.current.style.transform = `translate(calc(-50% + ${bx + d1x}%), calc(-50% + ${by + d1y}%))`;
        bloom1Ref.current.style.opacity = String(p1);
      }
      if (bloom2Ref.current) {
        bloom2Ref.current.style.transform = `translate(calc(-50% + ${bx * 0.6 + d2x}%), calc(-50% + ${by * 0.6 + d2y}%))`;
        bloom2Ref.current.style.opacity = String(p2);
      }
      if (bloom3Ref.current) {
        bloom3Ref.current.style.transform = `translate(calc(-50% + ${bx * 0.4 + d3x}%), calc(-50% + ${by * 0.4 + d3y}%))`;
        bloom3Ref.current.style.opacity = String(p3);
      }

      const applyT = (el: HTMLDivElement | null, x: number, y: number) => {
        if (el) el.style.transform = `translate(${x}%, ${y}%)`;
      };
      applyT(layerDeepRef.current, dx, dy);
      applyT(layerMidRef.current, mx2, my2);
      applyT(layerNearRef.current, nx, ny);
      applyT(rDeepRef.current, dx * 0.8, dy * 0.8);
      applyT(rMidRef.current, mx2 * 0.9, my2 * 0.9);
      applyT(rNearRef.current, nx * 1.0, ny * 1.0);

      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [mouseRef]);

  const deepBokeh  = BOKEH.filter(p => p.depth === 0.3);
  const midBokeh   = BOKEH.filter(p => p.depth === 0.6);
  const nearBokeh  = BOKEH.filter(p => p.depth === 1.0);
  const deepRings  = RINGS.filter(r => r.depth === 0.3);
  const midRings   = RINGS.filter(r => r.depth === 0.6);
  const nearRings  = RINGS.filter(r => r.depth === 1.0);

  const renderWaterDrop = (r: typeof RINGS[0], i: number) => {
    const animName = `rFloat${(i % 3) + 1}`;
    return (
      <div key={`rd${r.x}${r.y}`} className="absolute rounded-full" style={{
        left: `${r.x}%`, top: `${r.y}%`,
        width: r.size, height: r.size,
        background: 'radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0.05) 25%, rgba(255, 255, 255, 0) 60%, rgba(255, 255, 255, 0.15) 100%)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        border: '1px solid rgba(255, 255, 255, 0.4)',
        boxShadow: 'inset -2px -2px 6px rgba(255, 255, 255, 0.2), inset 2px 2px 6px rgba(255, 255, 255, 0.5), 0 8px 16px rgba(0, 0, 0, 0.06)',
        opacity: Math.min(r.op * 1.8, 1),
        animation: `${animName} ${r.dur}s ${r.del}s ease-in-out infinite alternate`,
        transform: 'translate(-50%,-50%)',
      }}>
        {/* Specular Glint */}
        <div className="absolute rounded-full" style={{
          top: '12%', left: '18%', width: '25%', height: '20%',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0) 100%)',
          transform: 'rotate(-30deg)'
        }} />
      </div>
    );
  };

  return (
    <div className="absolute inset-0 overflow-hidden" style={{ zIndex: 0 }}>
      <style>{`
        @keyframes aurora1 {
          0%   { transform: translate(0%, 0%) scale(1) rotate(0deg); opacity: 0.5; }
          50%  { transform: translate(15%, -15%) scale(1.5) rotate(20deg); opacity: 0.95; }
          100% { transform: translate(-10%, 10%) scale(1.2) rotate(-15deg); opacity: 0.6; }
        }
        @keyframes aurora2 {
          0%   { transform: translate(-15%, 15%) scale(1.2) rotate(0deg); opacity: 0.9; }
          50%  { transform: translate(10%, -10%) scale(1) rotate(-20deg); opacity: 0.4; }
          100% { transform: translate(5%, 20%) scale(1.4) rotate(15deg); opacity: 0.8; }
        }
        @keyframes aurora3 {
          0%   { transform: translate(20%, -10%) scale(1.1) rotate(0deg); opacity: 0.4; }
          50%  { transform: translate(-15%, 15%) scale(1.6) rotate(25deg); opacity: 0.85; }
          100% { transform: translate(0%, 5%) scale(1.3) rotate(-10deg); opacity: 0.5; }
        }
        @keyframes aurora4 {
          0%   { transform: translate(-10%, -20%) scale(1.5) rotate(0deg); opacity: 0.7; }
          50%  { transform: translate(20%, 10%) scale(1.2) rotate(-15deg); opacity: 0.4; }
          100% { transform: translate(-5%, -5%) scale(1.4) rotate(10deg); opacity: 0.95; }
        }
        @keyframes bFloat {
          from { transform: translate(-50%, -50%) translateY(0px); }
          to   { transform: translate(-50%, -50%) translateY(-26px); }
        }
        @keyframes rFloat1 {
          0%   { transform: translate(-50%, -50%); }
          33%  { transform: translate(calc(-50% + 20px), calc(-50% - 30px)); }
          66%  { transform: translate(calc(-50% - 15px), calc(-50% + 20px)); }
          100% { transform: translate(-50%, -50%); }
        }
        @keyframes rFloat2 {
          0%   { transform: translate(-50%, -50%); }
          33%  { transform: translate(calc(-50% - 25px), calc(-50% - 15px)); }
          66%  { transform: translate(calc(-50% + 20px), calc(-50% + 25px)); }
          100% { transform: translate(-50%, -50%); }
        }
        @keyframes rFloat3 {
          0%   { transform: translate(-50%, -50%); }
          33%  { transform: translate(calc(-50% + 30px), calc(-50% + 15px)); }
          66%  { transform: translate(calc(-50% - 20px), calc(-50% - 25px)); }
          100% { transform: translate(-50%, -50%); }
        }
      `}</style>

      {/* Base background with softly appearing/disappearing shimmering auroras */}
      <div className="absolute inset-0" style={{ backgroundColor: '#93B6F0', overflow: 'hidden' }}>
        <div ref={baseRef} className="absolute inset-0 pointer-events-none">
          <div style={{
            position: 'absolute',
            width: '160vw', height: '160vh',
            left: '-30%', top: '-30%',
            background: 'radial-gradient(ellipse at center, rgba(227, 217, 240, 1) 0%, rgba(227, 217, 240, 0.7) 35%, rgba(227, 217, 240, 0) 70%)',
            animation: 'aurora1 24s cubic-bezier(0.4, 0, 0.2, 1) infinite alternate',
            transformOrigin: 'center center',
          }} />
          <div style={{
            position: 'absolute',
            width: '150vw', height: '150vh',
            left: '10%', top: '-20%',
            background: 'radial-gradient(circle at center, rgba(227, 217, 240, 0.95) 0%, rgba(227, 217, 240, 0.6) 40%, rgba(227, 217, 240, 0) 75%)',
            animation: 'aurora2 28s cubic-bezier(0.4, 0, 0.2, 1) infinite alternate-reverse',
            transformOrigin: 'center center',
          }} />
          <div style={{
            position: 'absolute',
            width: '180vw', height: '140vh',
            left: '-30%', top: '20%',
            background: 'radial-gradient(ellipse at center, rgba(227, 217, 240, 0.9) 0%, rgba(227, 217, 240, 0.65) 45%, rgba(227, 217, 240, 0) 80%)',
            animation: 'aurora3 32s cubic-bezier(0.4, 0, 0.2, 1) infinite alternate',
            transformOrigin: 'center center',
          }} />
          <div style={{
            position: 'absolute',
            width: '140vw', height: '160vh',
            left: '10%', top: '10%',
            background: 'radial-gradient(circle at center, rgba(227, 217, 240, 0.85) 0%, rgba(227, 217, 240, 0.5) 40%, rgba(227, 217, 240, 0) 70%)',
            animation: 'aurora4 26s cubic-bezier(0.4, 0, 0.2, 1) infinite alternate-reverse',
            transformOrigin: 'center center',
          }} />
        </div>
      </div>

      {/* Bloom 1 — top-center light highlight */}
      <div ref={bloom1Ref} className="absolute" style={{
        left: '58%', top: '10%',
        width: '70vw', height: '60vh',
        background: 'radial-gradient(ellipse at center, rgba(228,218,239,0.88) 0%, rgba(180,210,248,0.45) 40%, transparent 70%)',
        borderRadius: '50%', filter: 'blur(30px)', willChange: 'transform,opacity',
      }} />

      {/* Bloom 2 — left lavender */}
      <div ref={bloom2Ref} className="absolute" style={{
        left: '18%', top: '62%',
        width: '52vw', height: '48vh',
        background: 'radial-gradient(ellipse at center, rgba(228,218,239,0.55) 0%, rgba(145,181,240,0.25) 50%, transparent 72%)',
        borderRadius: '50%', filter: 'blur(38px)', willChange: 'transform,opacity',
      }} />

      {/* Bloom 3 — right blue */}
      <div ref={bloom3Ref} className="absolute" style={{
        left: '82%', top: '40%',
        width: '38vw', height: '42vh',
        background: 'radial-gradient(ellipse at center, rgba(145,181,240,0.55) 0%, rgba(174,202,248,0.22) 50%, transparent 72%)',
        borderRadius: '50%', filter: 'blur(34px)', willChange: 'transform,opacity',
      }} />

      {/* Vignette */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 90% 88% at 50% 50%, transparent 50%, rgba(100,120,190,0.22) 100%)',
      }} />

      {/* ── Bokeh layers ── */}
      <div ref={layerDeepRef} className="absolute inset-0" style={{ willChange: 'transform' }}>
        {deepBokeh.map(p => (
          <div key={`bd${p.x}${p.y}`} className="absolute rounded-full" style={{
            left: `${p.x}%`, top: `${p.y}%`,
            width: p.size, height: p.size,
            background: `radial-gradient(circle, ${p.color} 0%, transparent 70%)`,
            opacity: p.op, filter: `blur(${p.blur}px)`,
            animation: `bFloat ${p.dur}s ${p.del}s ease-in-out infinite alternate`,
            transform: 'translate(-50%,-50%)',
          }} />
        ))}
      </div>
      <div ref={layerMidRef} className="absolute inset-0" style={{ willChange: 'transform' }}>
        {midBokeh.map(p => (
          <div key={`bm${p.x}${p.y}`} className="absolute rounded-full" style={{
            left: `${p.x}%`, top: `${p.y}%`,
            width: p.size, height: p.size,
            background: `radial-gradient(circle, ${p.color} 0%, transparent 70%)`,
            opacity: p.op, filter: `blur(${p.blur}px)`,
            animation: `bFloat ${p.dur}s ${p.del}s ease-in-out infinite alternate`,
            transform: 'translate(-50%,-50%)',
          }} />
        ))}
      </div>
      <div ref={layerNearRef} className="absolute inset-0" style={{ willChange: 'transform' }}>
        {nearBokeh.map(p => (
          <div key={`bn${p.x}${p.y}`} className="absolute rounded-full" style={{
            left: `${p.x}%`, top: `${p.y}%`,
            width: p.size, height: p.size,
            background: `radial-gradient(circle, ${p.color} 0%, transparent 70%)`,
            opacity: p.op, filter: `blur(${p.blur}px)`,
            animation: `bFloat ${p.dur}s ${p.del}s ease-in-out infinite alternate`,
            transform: 'translate(-50%,-50%)',
          }} />
        ))}
      </div>

      {/* ── Outline ring circles (reference style) ── */}
      <div ref={rDeepRef} className="absolute inset-0" style={{ willChange: 'transform' }}>
        {deepRings.map(renderWaterDrop)}
      </div>
      <div ref={rMidRef} className="absolute inset-0" style={{ willChange: 'transform' }}>
        {midRings.map(renderWaterDrop)}
      </div>
      <div ref={rNearRef} className="absolute inset-0" style={{ willChange: 'transform' }}>
        {nearRings.map(renderWaterDrop)}
      </div>
    </div>
  );
}
