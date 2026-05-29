import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Service {
  id: string;
  title: string;
  description: string;
  price: string;
  duration: string;
  image: string;
  category: string;
}

export interface Testimonial {
  id: string;
  name: string;
  text: string;
  rating: number;
  image: string;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  image: string;
  bio: string;
}

export interface SiteContent {
  // Hero Section
  heroTitle: string;
  heroSubtitle: string;
  heroImage: string;
  heroCTA: string;
  showHeroBadge: boolean;
  heroBadgeTitle: string;
  heroBadgeText: string;

  // About Section
  aboutTitle: string;
  aboutText: string;
  aboutImage: string;
  aboutStats: { label: string; value: string }[];

  // Services
  servicesTitle: string;
  servicesSubtitle: string;
  services: Service[];

  // Testimonials
  testimonialsTitle: string;
  testimonials: Testimonial[];

  // Team
  teamTitle: string;
  teamSubtitle: string;
  team: TeamMember[];

  // Contact/Booking
  contactTitle: string;
  contactSubtitle: string;
  address: string;
  phone: string;
  email: string;
  openingHours: { day: string; hours: string }[];

  // Footer
  footerText: string;
  socialLinks: { platform: string; url: string }[];

  // General
  siteName: string;
  siteTagline: string;
}

const defaultContent: SiteContent = {
  siteName: "Lumière",
  siteTagline: "Skönhet & Välmående",

  heroTitle: "Upptäck din naturliga skönhet",
  heroSubtitle: "Vi kombinerar vetenskap och natur för att ge dig den bästa hudvården. Välkommen till en oas av avkoppling och förnyelse.",
  heroImage: "/demos/clinic/portrait-beautiful-woman-with-clear-skin-posing-with-baby-s-breath-flowers.jpg",
  heroCTA: "Boka tid",
  showHeroBadge: true,
  heroBadgeTitle: "Boka idag",
  heroBadgeText: "20% rabatt",

  aboutTitle: "Om Lumière",
  aboutText: "Med över 10 års erfarenhet inom skönhetsbranschen erbjuder vi skräddarsydda behandlingar för att framhäva din naturliga skönhet. Vårt team av certifierade hudterapeuter använder de senaste teknikerna och högkvalitativa produkter för att ge dig bästa möjliga resultat.",
  aboutImage: "/demos/clinic/look-studio-HtXyytr9304-unsplash.jpg",
  aboutStats: [
    { label: "Nöjda kunder", value: "2000+" },
    { label: "År av erfarenhet", value: "10+" },
    { label: "Behandlingar", value: "50+" },
    { label: "Certifierade terapeuter", value: "8" }
  ],

  servicesTitle: "Våra Behandlingar",
  servicesSubtitle: "Upptäck vårt utbud av lyxiga behandlingar",
  services: [
    {
      id: "1",
      title: "Ansiktsbehandling Deluxe",
      description: "En djupgående ansiktsbehandling som rengör, återfuktar och förnyar din hud.",
      price: "1295 kr",
      duration: "75 min",
      image: "/demos/clinic/kimia-zarifi-x4J_92kJBoY-unsplash.jpg",
      category: "Ansiktsbehandlingar"
    },
    {
      id: "2",
      title: "Kemisk Peeling",
      description: "Förfina hudstrukturen och minska pigmentfläckar med vår skonsamma kemiska peeling.",
      price: "1495 kr",
      duration: "60 min",
      image: "/demos/clinic/no-make-up-filters-photo-half-face-healthy-green-eyed-woman-with-cream-skin.jpg",
      category: "Ansiktsbehandlingar"
    },
    {
      id: "3",
      title: "Kroppsbehandling",
      description: "En avkopplande helkroppsbehandling som återställer balansen i kropp och sinne.",
      price: "1695 kr",
      duration: "90 min",
      image: "/demos/clinic/humphrey-m-NfpkqJ9314E-unsplash.jpg",
      category: "Kroppsbehandlingar"
    },
    {
      id: "4",
      title: "Massage & Aromaterapi",
      description: "Upplev total avkoppling med vår kombination av massage och aromaterapeutiska oljor.",
      price: "995 kr",
      duration: "60 min",
      image: "/demos/clinic/enecta-cannabis-extracts-80wCkpt-IKE-unsplash.jpg",
      category: "Massage"
    },
    {
      id: "5",
      title: "Microneedling",
      description: "Stimulera hudens naturliga kollagenproduktion för en fastare och jämnare hud.",
      price: "1995 kr",
      duration: "45 min",
      image: "/demos/clinic/close-up-smiley-woman-with-beauty-tools.jpg",
      category: "Avancerade behandlingar"
    },
    {
      id: "6",
      title: "CBD Wellness",
      description: "Njut av en lugnande behandling med CBD-infunderade produkter för ultimat avkoppling.",
      price: "1395 kr",
      duration: "60 min",
      image: "/demos/clinic/rosa-rafael-Pe9IXUuC6QU-unsplash.jpg",
      category: "Wellness"
    }
  ],

  testimonialsTitle: "Vad våra kunder säger",
  testimonials: [
    {
      id: "1",
      name: "Emma Lindström",
      text: "Fantastisk upplevelse! Personalen är otroligt kunnig och behandlingen gav synliga resultat direkt.",
      rating: 5,
      image: "/demos/clinic/oliver-johnson-yH0dth2yEQE-unsplash.jpg"
    },
    {
      id: "2",
      name: "Sofia Andersson",
      text: "Lumière är min go-to klinik för all hudvård. Professionell service och härlig atmosfär.",
      rating: 5,
      image: "/demos/clinic/sam-moghadam-l9VjM-Pp7-M-unsplash.jpg"
    },
    {
      id: "3",
      name: "Maria Karlsson",
      text: "Efter bara några behandlingar såg jag en enorm förbättring av min hud. Rekommenderas varmt!",
      rating: 5,
      image: "/demos/clinic/look-studio-HtXyytr9304-unsplash.jpg"
    }
  ],

  teamTitle: "Möt Vårt Team",
  teamSubtitle: "Erfarna och certifierade hudterapeuter",
  team: [
    {
      id: "1",
      name: "Anna Johansson",
      role: "Klinikchef & Hudterapeut",
      image: "/demos/clinic/oliver-johnson-yH0dth2yEQE-unsplash.jpg",
      bio: "Med över 15 års erfarenhet inom skönhetsbranschen leder Anna vårt team med passion och expertis."
    },
    {
      id: "2",
      name: "Lisa Eriksson",
      role: "Senior Hudterapeut",
      image: "/demos/clinic/sam-moghadam-l9VjM-Pp7-M-unsplash.jpg",
      bio: "Lisa är specialist på avancerade ansiktsbehandlingar och har utbildat sig i Paris."
    },
    {
      id: "3",
      name: "Karin Svensson",
      role: "Massageterapeut",
      image: "/demos/clinic/look-studio-HtXyytr9304-unsplash.jpg",
      bio: "Karin kombinerar traditionella massagetekniker med moderna wellness-metoder."
    }
  ],

  contactTitle: "Boka Din Tid",
  contactSubtitle: "Ta första steget mot en strålande hud",
  address: "Strandvägen 42, 114 56 Stockholm",
  phone: "+46 8 123 45 67",
  email: "info@intenzze.com",
  openingHours: [
    { day: "Måndag - Fredag", hours: "09:00 - 19:00" },
    { day: "Lördag", hours: "10:00 - 17:00" },
    { day: "Söndag", hours: "Stängt" }
  ],

  footerText: "© 2025 Lumière. Alla rättigheter förbehållna.",
  socialLinks: [
    { platform: "Instagram", url: "https://www.instagram.com/intenzzewebbstudio" },
    { platform: "Facebook", url: "https://www.facebook.com/intenzzeweb" },
    { platform: "X", url: "https://x.com" }
  ]
};

interface CMSStore {
  content: SiteContent;
  isEditing: boolean;
  setContent: (content: Partial<SiteContent>) => void;
  setIsEditing: (isEditing: boolean) => void;
  resetContent: () => void;
  addService: (service: Service) => void;
  updateService: (id: string, service: Partial<Service>) => void;
  deleteService: (id: string) => void;
  addTestimonial: (testimonial: Testimonial) => void;
  updateTestimonial: (id: string, testimonial: Partial<Testimonial>) => void;
  deleteTestimonial: (id: string) => void;
  addTeamMember: (member: TeamMember) => void;
  updateTeamMember: (id: string, member: Partial<TeamMember>) => void;
  deleteTeamMember: (id: string) => void;
}

export const useCMSStore = create<CMSStore>()(
  persist(
    (set) => ({
      content: defaultContent,
      isEditing: false,

      setContent: (newContent) =>
        set((state) => ({
          content: { ...state.content, ...newContent }
        })),

      setIsEditing: (isEditing) => set({ isEditing }),

      resetContent: () => set({ content: defaultContent }),

      addService: (service) =>
        set((state) => ({
          content: {
            ...state.content,
            services: [...state.content.services, service]
          }
        })),

      updateService: (id, service) =>
        set((state) => ({
          content: {
            ...state.content,
            services: state.content.services.map((s) =>
              s.id === id ? { ...s, ...service } : s
            )
          }
        })),

      deleteService: (id) =>
        set((state) => ({
          content: {
            ...state.content,
            services: state.content.services.filter((s) => s.id !== id)
          }
        })),

      addTestimonial: (testimonial) =>
        set((state) => ({
          content: {
            ...state.content,
            testimonials: [...state.content.testimonials, testimonial]
          }
        })),

      updateTestimonial: (id, testimonial) =>
        set((state) => ({
          content: {
            ...state.content,
            testimonials: state.content.testimonials.map((t) =>
              t.id === id ? { ...t, ...testimonial } : t
            )
          }
        })),

      deleteTestimonial: (id) =>
        set((state) => ({
          content: {
            ...state.content,
            testimonials: state.content.testimonials.filter((t) => t.id !== id)
          }
        })),

      addTeamMember: (member) =>
        set((state) => ({
          content: {
            ...state.content,
            team: [...state.content.team, member]
          }
        })),

      updateTeamMember: (id, member) =>
        set((state) => ({
          content: {
            ...state.content,
            team: state.content.team.map((m) =>
              m.id === id ? { ...m, ...member } : m
            )
          }
        })),

      deleteTeamMember: (id) =>
        set((state) => ({
          content: {
            ...state.content,
            team: state.content.team.filter((m) => m.id !== id)
          }
        }))
    }),
    {
      name: 'clinic-cms-storage'
    }
  )
);
