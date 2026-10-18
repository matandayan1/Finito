import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MIN_SCALE = 1;
const MAX_SCALE = 5;

export default function ImageLightbox({ url, onClose, alt }) {
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const pointersRef = useRef({});
  const pinchStartRef = useRef(null);
  const dragStartRef = useRef(null);
  const tapRef = useRef({ x: 0, y: 0, t: 0, moved: false });
  const lastTapRef = useRef(0);

  // Reset transform whenever the image changes / closes
  useEffect(() => {
    setScale(1);
    setPos({ x: 0, y: 0 });
  }, [url]);

  // Close on Escape
  useEffect(() => {
    if (!url) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [url, onClose]);

  const clampPos = useCallback((x, y, s) => {
    if (s <= 1) return { x: 0, y: 0 };
    const maxX = ((s - 1) / 2) * window.innerWidth;
    const maxY = ((s - 1) / 2) * window.innerHeight;
    return {
      x: Math.max(-maxX, Math.min(maxX, x)),
      y: Math.max(-maxY, Math.min(maxY, y)),
    };
  }, []);

  const applyZoom = useCallback((next) => {
    setScale(prev => {
      const s = Math.max(MIN_SCALE, Math.min(MAX_SCALE, next));
      if (s === 1) setPos({ x: 0, y: 0 });
      return s;
    });
  }, []);

  const onWheel = (e) => {
    e.preventDefault();
    const factor = -e.deltaY * 0.0015;
    setScale(prev => {
      const s = Math.max(MIN_SCALE, Math.min(MAX_SCALE, prev + prev * factor));
      if (s === 1) setPos({ x: 0, y: 0 });
      return s;
    });
  };

  const onPointerDown = (e) => {
    pointersRef.current[e.pointerId] = { x: e.clientX, y: e.clientY };
    const count = Object.keys(pointersRef.current).length;
    if (count === 2) {
      const pts = Object.values(pointersRef.current);
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      pinchStartRef.current = { dist, scale };
    } else if (count === 1) {
      dragStartRef.current = scale > 1 ? { x: e.clientX - pos.x, y: e.clientY - pos.y } : null;
      tapRef.current = { x: e.clientX, y: e.clientY, t: Date.now(), moved: false };
    }
  };

  const onPointerMove = (e) => {
    if (!pointersRef.current[e.pointerId]) return;
    pointersRef.current[e.pointerId] = { x: e.clientX, y: e.clientY };
    const pts = Object.values(pointersRef.current);

    if (pts.length >= 2 && pinchStartRef.current) {
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const ratio = dist / pinchStartRef.current.dist;
      applyZoom(pinchStartRef.current.scale * ratio);
    } else if (dragStartRef.current && scale > 1) {
      const dx = e.clientX - tapRef.current.x;
      const dy = e.clientY - tapRef.current.y;
      if (Math.hypot(dx, dy) > 8) tapRef.current.moved = true;
      setPos(clampPos(e.clientX - dragStartRef.current.x, e.clientY - dragStartRef.current.y, scale));
    } else {
      const dx = e.clientX - tapRef.current.x;
      const dy = e.clientY - tapRef.current.y;
      if (Math.hypot(dx, dy) > 8) tapRef.current.moved = true;
    }
  };

  const onPointerUp = (e) => {
    delete pointersRef.current[e.pointerId];
    const count = Object.keys(pointersRef.current).length;
    if (count < 2) pinchStartRef.current = null;
    if (count === 0) {
      // Tap detection: close on a clean tap (no drag) when not zoomed
      const dt = Date.now() - tapRef.current.t;
      if (!tapRef.current.moved && dt < 300 && scale <= 1) {
        const now = Date.now();
        if (now - lastTapRef.current < 320) {
          applyZoom(2.5); // double tap → zoom in
          lastTapRef.current = 0;
        } else {
          lastTapRef.current = now;
          // single tap closes after a short delay if no second tap
          setTimeout(() => {
            if (lastTapRef.current && Date.now() - lastTapRef.current >= 300 && scale <= 1) {
              onClose?.();
            }
          }, 300);
        }
      }
      dragStartRef.current = null;
    }
  };

  if (!url) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[70] bg-black/90 flex items-center justify-center touch-none select-none"
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {/* Close button */}
        <button
          onClick={(e) => { e.stopPropagation(); onClose?.(); }}
          onPointerDown={(e) => e.stopPropagation()}
          className="absolute top-4 right-4 z-10 h-11 w-11 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-colors"
          aria-label="סגור"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Zoom controls */}
        <div
          className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 bg-white/15 rounded-full px-3 py-2 backdrop-blur-sm"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <button onClick={() => applyZoom(scale - 0.5)} className="h-9 w-9 rounded-full bg-white/15 hover:bg-white/30 flex items-center justify-center text-white transition-colors" aria-label="הקטן">
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="text-white text-xs font-medium w-12 text-center">{Math.round(scale * 100)}%</span>
          <button onClick={() => applyZoom(scale + 0.5)} className="h-9 w-9 rounded-full bg-white/15 hover:bg-white/30 flex items-center justify-center text-white transition-colors" aria-label="הגדל">
            <ZoomIn className="h-4 w-4" />
          </button>
          <button onClick={() => { setScale(1); setPos({ x: 0, y: 0 }); }} className="h-9 w-9 rounded-full bg-white/15 hover:bg-white/30 flex items-center justify-center text-white transition-colors" aria-label="אפס">
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>

        <motion.img
          key={url}
          src={url}
          alt={alt || ''}
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-[92vw] max-h-[88vh] object-contain rounded-lg shadow-2xl pointer-events-none"
          style={{
            transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`,
            transformOrigin: 'center center',
            transition: dragStartRef.current ? 'none' : 'transform 0.12s ease-out',
          }}
          draggable={false}
        />
      </motion.div>
    </AnimatePresence>
  );
}