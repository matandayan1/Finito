import React from 'react';
import HeroSection from '@/components/home/HeroSection';
import BrandStorySection from '@/components/home/BrandStorySection';

export default function Home() {
  return (
    <div className="min-h-screen">
      <HeroSection />
      <BrandStorySection />
    </div>
  );
}