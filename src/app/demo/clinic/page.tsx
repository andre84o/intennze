'use client';

import Navigation from './admin/components/Navigation';
import Hero from './admin/components/Hero';
import Services from './admin/components/Services';
import About from './admin/components/About';
import Testimonials from './admin/components/Testimonials';
import Team from './admin/components/Team';
import Contact from './admin/components/Contact';
import Footer from './admin/components/Footer';

export default function Home() {
  return (
    <main className="min-h-screen">
      <Navigation />
      <Hero />
      <Services />
      <About />
      <Team />
      <Testimonials />
      <Contact />
      <Footer />
    </main>
  );
}
