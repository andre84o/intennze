"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import DemoNavbar from "../components/DemoNavbar";
import DemoFooter from "../components/DemoFooter";


const projects = [
  {
    id: 1,
    title: "Lyxigt badrum i Östermalm",
    category: "Badrum",
    image: "/demos/bygg/chastity-cortijo-80c0YaiSFk4-unsplash.jpg",
    description: "Komplett badrumsrenovering med marmor och gulddetaljer",
  },
  {
    id: 2,
    title: "Modernt kök i Södermalm",
    category: "Kök",
    image: "/demos/bygg/milivoj-kuhar-Te48TPzdcU8-unsplash.jpg",
    description: "Öppen planlösning med köksö och integrerade vitvaror",
  },
  {
    id: 3,
    title: "Sekelskiftesvåning i Vasastan",
    category: "Totalrenovering",
    image: "/demos/bygg/steffen-lemmerzahl-XXanshmt5so-unsplash.jpg",
    description: "Renovering med bevarade originaldetaljer",
  },
  {
    id: 4,
    title: "Ekparkett i Bromma",
    category: "Golv",
    image: "/demos/bygg/nolan-issac-K5sjajgbTFw-unsplash.jpg",
    description: "120 kvm massiv ekparkett med golvvärme",
  },
  {
    id: 5,
    title: "Spa-badrum i Nacka",
    category: "Badrum",
    image: "/demos/bygg/steffen-lemmerzahl-yJpvGn5goGc-unsplash.jpg",
    description: "Dubbla handfat, walk-in dusch och bubbelbadkar",
  },
  {
    id: 6,
    title: "Kontorsrenovering i City",
    category: "Kontor",
    image: "/demos/bygg/im3rd-media-FJZtZldA-uE-unsplash.jpg",
    description: "400 kvm modernt kontorslandskap",
  },
];

const categories = ["Alla", "Badrum", "Kök", "Totalrenovering", "Golv", "Kontor"];

export default function ProjektPage() {
  const [activeCategory, setActiveCategory] = useState("Alla");

  const filteredProjects =
    activeCategory === "Alla"
      ? projects
      : projects.filter((project) => project.category === activeCategory);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-amber-500/30">
      <DemoNavbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800 via-slate-950 to-slate-950 opacity-40"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <h1 className="text-5xl md:text-7xl font-bold text-white tracking-tight mb-6">
            Våra <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600">Projekt</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Utforska vårt galleri av genomförda renoveringar. Vi kombinerar hantverksskicklighet med modern design.
          </p>
        </div>
      </section>

      {/* Filter & Grid Section */}
      <section className="py-12 pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Filter Buttons */}
          <div className="flex flex-wrap justify-center gap-3 mb-16">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-300 border ${
                  activeCategory === category
                    ? "bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-500/25"
                    : "bg-transparent border-slate-800 text-slate-400 hover:border-slate-600 hover:text-white"
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          {/* Projects Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-10">
            {filteredProjects.map((project) => (
              <div
                key={project.id}
                className="group flex flex-col gap-4"
              >
                {/* Image Container */}
                <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-slate-900 shadow-2xl shadow-black/20">
                  <Image
                    src={project.image}
                    alt={project.title}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-500"></div>
                </div>

                {/* Content */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold tracking-widest text-amber-500 uppercase">
                      {project.category}
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold text-white group-hover:text-amber-400 transition-colors duration-300">
                    {project.title}
                  </h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    {project.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Empty State */}
          {filteredProjects.length === 0 && (
            <div className="text-center py-20">
              <p className="text-slate-500 text-lg">Inga projekt hittades i denna kategori.</p>
            </div>
          )}
        </div>
      </section>

      {/* CTA Section - Minimalist */}
      <section className="py-24 bg-slate-900 border-t border-slate-800">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Redo att starta ditt nästa projekt?
          </h2>
          <p className="text-slate-400 mb-10 text-lg">
            Vi hjälper dig från idé till färdigt resultat. Kontakta oss för en förutsättningslös diskussion.
          </p>
          <Link
            href="/demos/bygg/kontakt"
            className="inline-flex items-center justify-center px-8 py-4 text-base font-bold text-slate-900 transition-all duration-200 bg-amber-500 rounded-full hover:bg-amber-400 hover:shadow-lg hover:shadow-amber-500/25 hover:-translate-y-1"
          >
            Kontakta oss
            <svg className="w-5 h-5 ml-2 -mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </section>

      <DemoFooter />
    </div>
  );
}
