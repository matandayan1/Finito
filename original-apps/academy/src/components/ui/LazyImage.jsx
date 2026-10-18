import React, { useState } from 'react';

export default function LazyImage({ src, alt, className = '', containerClassName = '' }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  if (!src || error) {
    return (
      <div className={`bg-neutral-100 flex items-center justify-center ${containerClassName}`}>
        <span className="text-4xl opacity-30">🍽️</span>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${containerClassName}`}>
      {/* Skeleton shown until image loads */}
      {!loaded && (
        <div className="absolute inset-0 bg-neutral-100 animate-pulse" />
      )}
      <img
        src={src}
        alt={alt}
        loading="eager"
        decoding="async"
        fetchPriority="high"
        className={`${className} transition-opacity duration-150 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
      />
    </div>
  );
}