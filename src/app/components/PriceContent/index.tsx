"use client";
import { useState } from "react";
import { useLanguage } from "@/app/i18n/LanguageProvider";
import ContactForm from "../contactForm";

export default function PriceContent() {
  const { lang } = useLanguage();
  const sv = lang === "sv";
  const [showContactModal, setShowContactModal] = useState(false);

  const T = {
    subtitle: sv ? "Tjänster" : "Services",
    title: sv ? "Allt ni behöver för en framgångsrik webbnärvaro" : "Everything you need for a successful web presence",
    intro: sv
      ? "Från första idé till färdig webbplats och vidare. Vi tar hand om hela processen så att ni kan fokusera på er kärnverksamhet."
      : "From initial idea to finished website and beyond. We handle the entire process so you can focus on your core business.",

    offerings: sv
      ? [
          { icon: "design", title: "Strategi & Design", desc: "Vi analyserar er marknad och målgrupp för att skapa en design som konverterar besökare till kunder." },
          { icon: "code", title: "Utveckling", desc: "Moderna webbplatser byggda med Next.js och React för maximal prestanda och sökmotoroptimering." },
          { icon: "rocket", title: "Lansering", desc: "Vi hanterar hela lanseringsprocessen inklusive domän, hosting och säkerhet." },
          { icon: "support", title: "Löpande support", desc: "Proaktivt underhåll, uppdateringar och support så att er webbplats alltid är i toppform." },
        ]
      : [
          { icon: "design", title: "Strategy & Design", desc: "We analyze your market and audience to create a design that converts visitors into customers." },
          { icon: "code", title: "Development", desc: "Modern websites built with Next.js and React for maximum performance and SEO." },
          { icon: "rocket", title: "Launch", desc: "We handle the entire launch process including domain, hosting and security." },
          { icon: "support", title: "Ongoing support", desc: "Proactive maintenance, updates and support to keep your website in top shape." },
        ],

    processTitle: sv ? "Så här arbetar vi" : "How we work",
    process: sv
      ? [
          { step: "01", title: "Samtal", desc: "Vi börjar med ett kostnadsfritt samtal för att förstå era behov och mål." },
          { step: "02", title: "Förslag", desc: "Ni får ett skräddarsytt förslag baserat på era specifika krav." },
          { step: "03", title: "Utveckling", desc: "Vi bygger er lösning med regelbundna avstämningar under processen." },
          { step: "04", title: "Lansering", desc: "Er webbplats lanseras och vi säkerställer att allt fungerar perfekt." },
        ]
      : [
          { step: "01", title: "Consultation", desc: "We start with a free consultation to understand your needs and goals." },
          { step: "02", title: "Proposal", desc: "You receive a tailored proposal based on your specific requirements." },
          { step: "03", title: "Development", desc: "We build your solution with regular check-ins throughout the process." },
          { step: "04", title: "Launch", desc: "Your website launches and we ensure everything works perfectly." },
        ],

    ctaTitle: sv ? "Redo att komma igång?" : "Ready to get started?",
    ctaText: sv
      ? "Boka ett kostnadsfritt samtal så diskuterar vi hur vi kan hjälpa er att nå era digitala mål."
      : "Book a free consultation and we'll discuss how we can help you achieve your digital goals.",
    ctaBtn: sv ? "Boka samtal" : "Book consultation",
  };

  const iconMap: Record<string, React.ReactNode> = {
    design: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 22s3-1 5-3 3-5 3-5l7-7a3 3 0 1 0-4-4l-7 7s-3 1-5 3-3 5-3 5" /></svg>,
    code: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>,
    rocket: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" /><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" /></svg>,
    support: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>,
  };

  return (
    <main className="min-h-screen w-full bg-slate-950 text-white overflow-x-hidden">
      {/* Hero */}
      <section className="relative pt-32 md:pb-20 px-6">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-40 left-20 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />

        <div className="relative max-w-4xl mx-auto text-center">
          <span className="inline-block px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-full text-sm text-purple-400 font-mono mb-6">
            {T.subtitle}
          </span>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
            {T.title}
          </h1>
          <p className="mt-6 text-lg text-slate-400 leading-relaxed max-w-2xl mx-auto">
            {T.intro}
          </p>
        </div>
      </section>

      {/* Offerings */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {T.offerings.map((item, i) => (
              <div key={i} className="group p-6 bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl hover:border-purple-500/50 transition-all duration-300 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500/20 to-transparent rounded-2xl text-purple-400 mb-4">
                  {iconMap[item.icon]}
                </div>
                <h3 className="text-xl font-bold">{item.title}</h3>
                <p className="mt-3 text-slate-400 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Technologies */}
      <section className="py-24 px-6 bg-slate-900/30">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-6">
            {sv ? "Tekniker & Verktyg" : "Technologies & Tools"}
          </h2>
          <p className="text-slate-400 text-center max-w-2xl mx-auto mb-16">
            {sv
              ? "Vi använder moderna och beprövade teknologier för att bygga snabba, säkra och skalbara webbplatser."
              : "We use modern and proven technologies to build fast, secure and scalable websites."}
          </p>

          <div className="space-y-16">
            {/* Front-end */}
            <div>
              <h3 className="text-xl font-semibold text-center mb-2 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
                Front-end
              </h3>
              <p className="text-slate-400 text-center text-sm mb-8 max-w-xl mx-auto">
                {sv
                  ? "Vi bygger moderna, responsiva gränssnitt med React och Next.js för optimal prestanda och användarupplevelse."
                  : "We build modern, responsive interfaces with React and Next.js for optimal performance and user experience."}
              </p>
              <div className="flex flex-wrap justify-center gap-8 md:gap-12">
                {/* React */}
                <div className="flex flex-col items-center gap-2 group">
                  <div className="w-16 h-16 flex items-center justify-center bg-slate-800/50 rounded-xl border border-slate-700 group-hover:border-cyan-500/50 transition-colors">
                    <svg viewBox="0 0 24 24" className="w-10 h-10" fill="#61DAFB">
                      <path d="M12 10.11c1.03 0 1.87.84 1.87 1.89 0 1-.84 1.85-1.87 1.85S10.13 13 10.13 12c0-1.05.84-1.89 1.87-1.89M7.37 20c.63.38 2.01-.2 3.6-1.7-.52-.59-1.03-1.23-1.51-1.9a22.7 22.7 0 01-2.4-.36c-.51 2.14-.32 3.61.31 3.96m.71-5.74l-.29-.51c-.11.29-.22.58-.29.86.27.06.57.11.88.16l-.3-.51m6.54-.76l.81-1.5-.81-1.5c-.3-.53-.62-1-.91-1.47C13.17 9 12.6 9 12 9c-.6 0-1.17 0-1.71.03-.29.47-.61.94-.91 1.47L8.57 12l.81 1.5c.3.53.62 1 .91 1.47.54.03 1.11.03 1.71.03.6 0 1.17 0 1.71-.03.29-.47.61-.94.91-1.47M12 6.78c-.19.22-.39.45-.59.72h1.18c-.2-.27-.4-.5-.59-.72m0 10.44c.19-.22.39-.45.59-.72h-1.18c.2.27.4.5.59.72M16.62 4c-.62-.38-2 .2-3.59 1.7.52.59 1.03 1.23 1.51 1.9.82.08 1.63.2 2.4.36.51-2.14.32-3.61-.32-3.96m-.7 5.74l.29.51c.11-.29.22-.58.29-.86-.27-.06-.57-.11-.88-.16l.3.51m1.45-7.05c1.47.84 1.63 3.05 1.01 5.63 2.54.75 4.37 1.99 4.37 3.68 0 1.69-1.83 2.93-4.37 3.68.62 2.58.46 4.79-1.01 5.63-1.46.84-3.45-.12-5.37-1.95-1.92 1.83-3.91 2.79-5.38 1.95-1.46-.84-1.62-3.05-1-5.63-2.54-.75-4.37-1.99-4.37-3.68 0-1.69 1.83-2.93 4.37-3.68-.62-2.58-.46-4.79 1-5.63 1.47-.84 3.46.12 5.38 1.95 1.92-1.83 3.91-2.79 5.37-1.95M17.08 12c.34.75.64 1.5.89 2.26 2.1-.63 3.28-1.53 3.28-2.26 0-.73-1.18-1.63-3.28-2.26-.25.76-.55 1.51-.89 2.26M6.92 12c-.34-.75-.64-1.5-.89-2.26-2.1.63-3.28 1.53-3.28 2.26 0 .73 1.18 1.63 3.28 2.26.25-.76.55-1.51.89-2.26m9 2.26l-.3.51c.31-.05.61-.1.88-.16-.07-.28-.18-.57-.29-.86l-.29.51m-2.89 4.04c1.59 1.5 2.97 2.08 3.59 1.7.64-.35.83-1.82.32-3.96-.77.16-1.58.28-2.4.36-.48.67-.99 1.31-1.51 1.9M8.08 9.74l.3-.51c-.31.05-.61.1-.88.16.07.28.18.57.29.86l.29-.51m2.89-4.04C9.38 4.2 8 3.62 7.37 4c-.63.35-.82 1.82-.31 3.96a22.7 22.7 0 012.4-.36c.48-.67.99-1.31 1.51-1.9z"/>
                    </svg>
                  </div>
                  <span className="text-sm text-slate-400">React</span>
                </div>

                {/* Next.js */}
                <div className="flex flex-col items-center gap-2 group">
                  <div className="w-16 h-16 flex items-center justify-center bg-slate-800/50 rounded-xl border border-slate-700 group-hover:border-cyan-500/50 transition-colors">
                    <svg viewBox="0 0 24 24" className="w-10 h-10" fill="white">
                      <path d="M11.572 0c-.176 0-.31.001-.358.007a19.76 19.76 0 01-.364.033C7.443.346 4.25 2.185 2.228 5.012a11.875 11.875 0 00-2.119 5.243c-.096.659-.108.854-.108 1.747s.012 1.089.108 1.748c.652 4.506 3.86 8.292 8.209 9.695.779.251 1.6.422 2.534.525.363.04 1.935.04 2.299 0 1.611-.178 2.977-.577 4.323-1.264.207-.106.247-.134.219-.158-.02-.013-.9-1.193-1.955-2.62l-1.919-2.592-2.404-3.558a338.739 338.739 0 00-2.422-3.556c-.009-.002-.018 1.579-.023 3.51-.007 3.38-.01 3.515-.052 3.595a.426.426 0 01-.206.214c-.075.037-.14.044-.495.044H7.81l-.108-.068a.438.438 0 01-.157-.171l-.05-.106.006-4.703.007-4.705.072-.092a.645.645 0 01.174-.143c.096-.047.134-.051.54-.051.478 0 .558.018.682.154.035.038 1.337 1.999 2.895 4.361a10760.433 10760.433 0 004.735 7.17l1.9 2.879.096-.063a12.317 12.317 0 002.466-2.163 11.944 11.944 0 002.824-6.134c.096-.66.108-.854.108-1.748 0-.893-.012-1.088-.108-1.747-.652-4.506-3.859-8.292-8.208-9.695a12.597 12.597 0 00-2.499-.523A33.119 33.119 0 0011.572 0zm4.069 7.217c.347 0 .408.005.486.047a.473.473 0 01.237.277c.018.06.023 1.365.018 4.304l-.006 4.218-.744-1.14-.746-1.14v-3.066c0-1.982.01-3.097.023-3.15a.478.478 0 01.233-.296c.096-.05.13-.054.5-.054z"/>
                    </svg>
                  </div>
                  <span className="text-sm text-slate-400">Next.js</span>
                </div>

                {/* TypeScript */}
                <div className="flex flex-col items-center gap-2 group">
                  <div className="w-16 h-16 flex items-center justify-center bg-slate-800/50 rounded-xl border border-slate-700 group-hover:border-cyan-500/50 transition-colors">
                    <svg viewBox="0 0 24 24" className="w-10 h-10" fill="#3178C6">
                      <path d="M1.125 0C.502 0 0 .502 0 1.125v21.75C0 23.498.502 24 1.125 24h21.75c.623 0 1.125-.502 1.125-1.125V1.125C24 .502 23.498 0 22.875 0zm17.363 9.75c.612 0 1.154.037 1.627.111a6.38 6.38 0 011.306.34v2.458a3.95 3.95 0 00-.643-.361 5.093 5.093 0 00-.717-.26 5.453 5.453 0 00-1.426-.2c-.3 0-.573.028-.819.086a2.1 2.1 0 00-.623.242c-.17.104-.3.229-.393.374a.888.888 0 00-.14.49c0 .196.053.373.156.529.104.156.252.304.443.444s.423.276.696.41c.273.135.582.274.926.416.47.197.892.407 1.266.628.374.222.695.473.963.753.268.279.472.598.614.957.142.359.214.776.214 1.253 0 .657-.125 1.21-.373 1.656a3.033 3.033 0 01-1.012 1.085 4.38 4.38 0 01-1.487.596c-.566.12-1.163.18-1.79.18a9.916 9.916 0 01-1.84-.164 5.544 5.544 0 01-1.512-.493v-2.63a5.033 5.033 0 003.237 1.2c.333 0 .624-.03.872-.09.249-.06.456-.144.623-.25.166-.108.29-.234.373-.38a1.023 1.023 0 00-.074-1.089 2.12 2.12 0 00-.537-.5 5.597 5.597 0 00-.807-.444 27.72 27.72 0 00-1.007-.436c-.918-.383-1.602-.852-2.053-1.405-.45-.553-.676-1.222-.676-2.005 0-.614.123-1.141.369-1.582.246-.441.58-.804 1.004-1.089a4.494 4.494 0 011.47-.629 7.536 7.536 0 011.77-.201zm-15.113.188h9.563v2.166H9.506v9.646H6.789v-9.646H3.375z"/>
                    </svg>
                  </div>
                  <span className="text-sm text-slate-400">TypeScript</span>
                </div>

                {/* jQuery */}
                <div className="flex flex-col items-center gap-2 group">
                  <div className="w-16 h-16 flex items-center justify-center bg-slate-800/50 rounded-xl border border-slate-700 group-hover:border-cyan-500/50 transition-colors">
                    <svg viewBox="0 0 24 24" className="w-10 h-10" fill="#0769AD">
                      <path d="M1.525 13.099c-.044.072-.052.104-.052.104s.26-.028.694-.16c.111-.025.222-.064.34-.103-.322.407-.693.89-.981 1.256v.007c1.334-.098 2.376-.457 3.174-.927-.02-.04-.04-.079-.054-.122-.468.203-1.096.396-1.992.477 0 0 .494-.529 1.058-1.302l-.002-.005c-.09.031-.181.06-.272.086-.63.168-1.307.224-1.307.224s.108-.02.233-.073c.1-.04.206-.097.312-.16-.16.184-.492.476-.963.635-.032.019-.057.038-.097.063h-.09zM4.507 5.067c.19-.242.451-.44.762-.575.19-.087.4-.138.62-.153a1.496 1.496 0 0 1 .656.087c.212.074.402.191.563.341.08.072.15.152.215.238.065.086.123.177.175.274.101.193.176.402.22.622.044.22.06.45.048.686-.006.118-.018.238-.037.36-.019.123-.043.247-.076.374a4.663 4.663 0 0 1-.508 1.211 6.042 6.042 0 0 1-.418.625 7.299 7.299 0 0 1-.52.58c-.184.188-.382.367-.59.539-.21.172-.428.335-.655.493-.909.63-1.922 1.17-2.966 1.618.014.019.026.04.04.06.44-.174.876-.36 1.299-.565a11.18 11.18 0 0 0 1.866-1.104c.147-.11.29-.225.43-.346.14-.12.276-.245.41-.375.267-.26.517-.542.746-.848.115-.153.223-.312.326-.477.102-.166.198-.339.283-.52.17-.363.3-.763.362-1.19.062-.427.056-.883-.047-1.318a2.37 2.37 0 0 0-.191-.52 2.243 2.243 0 0 0-.302-.454 2.034 2.034 0 0 0-.39-.359 1.982 1.982 0 0 0-.459-.252 2.125 2.125 0 0 0-.51-.134 2.13 2.13 0 0 0-.266-.021c-.09 0-.179.006-.268.017-.178.022-.354.065-.522.128a2.058 2.058 0 0 0-.863.593c.11.047.219.103.323.166.047-.082.1-.16.159-.232zm1.073 6.558c.043-.035.086-.069.128-.105.159-.133.31-.274.457-.42.293-.293.563-.611.805-.956a5.35 5.35 0 0 0 .585-1.152c.148-.408.247-.843.274-1.29.027-.448-.018-.908-.156-1.332-.068-.212-.16-.413-.277-.596a2.15 2.15 0 0 0-.188-.27 2.1 2.1 0 0 0-.223-.234c-.16-.147-.34-.268-.535-.365a2.156 2.156 0 0 0-.303-.122c-.052-.018-.106-.032-.158-.047a1.632 1.632 0 0 1 .164.224c.154.236.27.497.349.774.157.553.177 1.155.074 1.723-.052.284-.133.562-.24.83-.108.27-.24.53-.393.779a6.217 6.217 0 0 1-.521.726c-.094.115-.191.227-.293.336-.203.218-.42.423-.648.618-.458.39-.959.737-1.487 1.039a12.556 12.556 0 0 1-1.64.794c.016.02.032.041.05.061a11.27 11.27 0 0 0 1.62-.78 9.623 9.623 0 0 0 1.556-1.135zm1.68-3.14c.144-.312.258-.648.328-1.003.07-.354.097-.73.064-1.1-.032-.369-.125-.732-.28-1.06a2.324 2.324 0 0 0-.273-.442 2.167 2.167 0 0 0-.175-.211 1.896 1.896 0 0 0-.193-.175 1.733 1.733 0 0 0-.422-.268 1.757 1.757 0 0 0-.467-.147 1.687 1.687 0 0 0-.126-.02c.03.026.062.05.093.077a1.9 1.9 0 0 1 .376.41c.1.146.182.305.247.472.128.334.193.698.193 1.063 0 .365-.064.731-.19 1.078a4.032 4.032 0 0 1-.52.962c-.22.3-.478.57-.76.81-.284.24-.59.454-.912.642a9.698 9.698 0 0 1-1.992.871c.016.017.03.036.047.054a8.972 8.972 0 0 0 2.02-.9c.33-.19.65-.407.948-.65.299-.243.579-.512.828-.809a4.6 4.6 0 0 0 .668-1.003c.098-.18.185-.367.258-.56.038-.095.072-.194.104-.293.018-.046.033-.091.049-.14l.012-.046-.015.032a.214.214 0 0 1-.005.012 2.42 2.42 0 0 0 .145-.362 4.6 4.6 0 0 0 .15-.644zm6.556 8.393c-1.063-.67-2.319-.929-3.582-.994-.632-.033-1.266-.003-1.893.057a13.25 13.25 0 0 0-1.859.309c-.302.068-.6.15-.895.241a9.152 9.152 0 0 0-.863.298c-.093.021-.174.047-.28.077.203-.102.387-.19.57-.272.247-.113.497-.217.751-.312a12.41 12.41 0 0 1 1.553-.46 12.3 12.3 0 0 1 1.596-.263c.538-.06 1.082-.084 1.626-.07.544.015 1.088.067 1.622.162a8.53 8.53 0 0 1 1.563.409c.124.046.247.095.369.147-.18-.14-.371-.267-.567-.38a6.59 6.59 0 0 0-1.26-.563 7.93 7.93 0 0 0-1.36-.303 11.33 11.33 0 0 0-1.4-.101c-.47-.008-.94.017-1.407.065a11.87 11.87 0 0 0-2.747.547 10.165 10.165 0 0 0-1.302.5c-.422.196-.834.42-1.23.673l-.02.013c.123-.154.26-.297.398-.437a6.6 6.6 0 0 1 1.796-1.296 7.828 7.828 0 0 1 2.082-.744 10.2 10.2 0 0 1 1.108-.176c.187-.02.375-.034.563-.042.375-.017.752-.01 1.128.02.375.03.75.082 1.12.157.186.037.37.082.552.132.183.05.363.107.54.171.355.126.697.282 1.02.466.163.093.32.194.472.302.077.054.152.111.225.169.073.059.146.119.215.182.14.125.272.256.395.395.061.07.122.14.18.213.028.037.057.074.083.112l.04.057c.014.02.029.04.042.061.057.084.112.17.162.258.05.089.097.18.14.272.022.046.042.093.062.14a2.49 2.49 0 0 1 .055.143c.036.096.068.193.095.292.027.1.05.2.068.3.018.103.032.205.042.309.01.103.014.207.014.31 0 .068-.002.136-.006.204a2.693 2.693 0 0 1-.062.4c-.027.133-.063.265-.107.393a2.883 2.883 0 0 1-.158.378c.129-.065.254-.14.372-.224.237-.166.454-.368.635-.604.09-.117.172-.242.243-.374.035-.066.067-.133.096-.202.014-.034.029-.07.041-.104.013-.036.025-.071.036-.108.022-.072.042-.146.057-.22.016-.075.028-.15.037-.227a3.2 3.2 0 0 0 .022-.461c-.005-.155-.018-.31-.041-.463a3.396 3.396 0 0 0-.098-.448 3.306 3.306 0 0 0-.152-.426 3.255 3.255 0 0 0-.103-.213 3.084 3.084 0 0 0-.116-.201c-.042-.065-.086-.129-.132-.19a3.22 3.22 0 0 0-.288-.337c-.051-.053-.106-.103-.16-.153-.056-.05-.113-.098-.171-.144a3.786 3.786 0 0 0-.369-.26 4.567 4.567 0 0 0-.39-.218 5.528 5.528 0 0 0-.813-.335 7.284 7.284 0 0 0-.856-.233 9.19 9.19 0 0 0-.886-.142 11.4 11.4 0 0 0-.901-.061 13.296 13.296 0 0 0-1.37.033c.218-.014.436-.02.654-.02.656.002 1.314.051 1.963.151.325.05.647.115.963.195.317.08.629.175.933.285.304.111.6.237.884.38.142.072.28.15.416.232.136.082.268.17.396.263.256.187.497.394.718.622l.002.002z"/>
                    </svg>
                  </div>
                  <span className="text-sm text-slate-400">jQuery</span>
                </div>
              </div>
            </div>

            {/* Back-end */}
            <div>
              <h3 className="text-xl font-semibold text-center mb-2 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
                Back-end
              </h3>
              <p className="text-slate-400 text-center text-sm mb-8 max-w-xl mx-auto">
                {sv
                  ? "Säker datahantering och snabba databaser för att driva era webbapplikationer."
                  : "Secure data handling and fast databases to power your web applications."}
              </p>
              <div className="flex flex-wrap justify-center gap-8 md:gap-12">
                {/* SQL/MySQL */}
                <div className="flex flex-col items-center gap-2 group">
                  <div className="w-16 h-16 flex items-center justify-center bg-slate-800/50 rounded-xl border border-slate-700 group-hover:border-purple-500/50 transition-colors">
                    <svg viewBox="0 0 24 24" className="w-10 h-10" fill="#4479A1">
                      <path d="M16.405 5.501c-.115 0-.193.014-.274.033v.013h.014c.054.104.146.18.214.273.054.107.1.214.154.32l.014-.015c.094-.066.14-.172.14-.333-.04-.047-.046-.094-.08-.14-.04-.067-.126-.1-.18-.153zM5.77 18.695h-.927a50.854 50.854 0 00-.27-4.41h-.008l-1.41 4.41H2.45l-1.4-4.41h-.01a72.892 72.892 0 00-.195 4.41H0c.055-1.966.192-3.81.41-5.53h1.15l1.335 4.064h.008l1.347-4.063h1.095c.242 2.015.384 3.86.428 5.53zm4.017-4.08c-.378 2.045-.876 3.533-1.492 4.46-.482.716-1.01 1.073-1.583 1.073-.153 0-.34-.046-.566-.138v-.494c.11.017.24.026.386.026.268 0 .483-.075.647-.222.197-.18.295-.382.295-.605 0-.155-.077-.47-.23-.944L6.23 14.615h.91l.727 2.36c.164.536.233.91.205 1.123.4-1.064.678-2.227.835-3.483zm12.325 4.08h-2.63v-5.53h.885v4.85h1.745zm-3.32.135l-1.016-.5c.09-.076.177-.158.255-.25.433-.506.648-1.258.648-2.253 0-1.83-.718-2.746-2.155-2.746-.704 0-1.254.232-1.65.697-.43.508-.646 1.256-.646 2.245 0 .972.19 1.686.574 2.14.35.41.877.615 1.583.615.264 0 .506-.033.725-.098l1.325.772.36-.623zM15.5 17.588c-.225-.36-.337-.94-.337-1.736 0-1.393.424-2.09 1.27-2.09.443 0 .77.167.977.5.224.362.336.936.336 1.723 0 1.404-.424 2.108-1.27 2.108-.445 0-.77-.167-.978-.5zm-1.658-.425c0 .47-.172.856-.516 1.156-.344.3-.803.45-1.384.45-.543 0-1.064-.172-1.573-.515l.237-.476c.438.22.833.328 1.19.328.332 0 .593-.073.783-.22a.754.754 0 00.3-.615c0-.33-.23-.61-.648-.845-.388-.213-1.163-.657-1.163-.657-.422-.307-.632-.636-.632-1.177 0-.45.157-.81.47-1.085.315-.278.72-.415 1.22-.415.512 0 .98.136 1.4.41l-.213.476a2.726 2.726 0 00-1.064-.23c-.283 0-.502.068-.654.206a.685.685 0 00-.248.524c0 .328.234.61.666.85.393.215 1.187.67 1.187.67.433.305.648.63.648 1.168zm9.382-5.852c-.535-.014-.95.04-1.297.188-.1.04-.26.04-.274.167.055.053.063.14.11.214.08.134.218.313.346.407.14.11.28.216.427.31.26.16.555.255.81.416.145.094.293.213.44.313.073.05.12.14.214.172v-.02c-.046-.06-.06-.147-.105-.214-.067-.067-.134-.127-.2-.193a3.223 3.223 0 00-.695-.675c-.214-.146-.682-.35-.77-.595l-.013-.014c.146-.013.32-.066.46-.106.227-.06.435-.047.67-.106.106-.027.213-.06.32-.094v-.06c-.12-.12-.21-.283-.334-.395a8.867 8.867 0 00-1.104-.823c-.21-.134-.476-.22-.697-.334-.08-.04-.214-.06-.26-.127-.12-.146-.19-.34-.275-.514a17.69 17.69 0 01-.547-1.163c-.12-.262-.193-.523-.34-.763-.69-1.137-1.437-1.826-2.586-2.5-.247-.14-.543-.2-.856-.274-.167-.008-.334-.02-.5-.027-.11-.047-.216-.174-.31-.235-.38-.24-1.364-.76-1.644-.072-.18.434.267.862.422 1.082.115.153.26.328.34.5.047.116.06.235.107.356.106.294.207.622.347.897.073.14.153.287.247.413.054.073.146.107.167.227-.094.136-.1.334-.154.5-.24.757-.146 1.693.194 2.25.107.166.362.534.703.393.3-.12.234-.5.32-.835.02-.08.007-.133.048-.187v.015c.094.188.188.367.274.555.206.328.566.668.867.895.16.12.287.328.487.402v-.02h-.015c-.043-.058-.1-.086-.154-.133a3.445 3.445 0 01-.35-.4 8.76 8.76 0 01-.747-1.218c-.11-.21-.202-.436-.29-.643-.04-.08-.04-.2-.107-.24-.1.146-.247.273-.32.453-.127.288-.14.642-.188 1.01-.027.007-.014 0-.027.014-.214-.052-.287-.274-.367-.46-.2-.475-.233-1.238-.06-1.785.047-.14.247-.582.167-.716-.042-.127-.174-.2-.247-.303a2.478 2.478 0 01-.24-.427c-.16-.374-.24-.788-.414-1.162-.08-.173-.22-.354-.334-.513-.127-.18-.267-.307-.368-.52-.033-.073-.08-.194-.027-.274.014-.054.042-.075.094-.09.088-.072.335.022.422.062.238.107.435.2.64.327.094.073.194.22.307.247h.134c.208.047.442.014.636.068.347.1.656.253.942.42.883.51 1.607 1.238 2.1 2.11.082.14.12.28.2.427.16.295.36.595.52.883.16.287.315.58.528.814.11.12.535.182.727.246.14.048.36.1.488.16.257.123.508.27.757.41.125.067.503.213.522.36z"/>
                    </svg>
                  </div>
                  <span className="text-sm text-slate-400">MySQL</span>
                </div>
              </div>
            </div>

            {/* WordPress & WooCommerce */}
            <div>
              <h3 className="text-xl font-semibold text-center mb-2 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
                WordPress & E-handel
              </h3>
              <p className="text-slate-400 text-center text-sm mb-8 max-w-xl mx-auto">
                {sv
                  ? "Behöver ni en enkel webbplats eller webshop? Vi bygger även skräddarsydda lösningar med WordPress och WooCommerce."
                  : "Need a simple website or webshop? We also build tailored solutions with WordPress and WooCommerce."}
              </p>
              <div className="flex flex-wrap justify-center gap-8 md:gap-12">
                {/* WordPress */}
                <div className="flex flex-col items-center gap-2 group">
                  <div className="w-16 h-16 flex items-center justify-center bg-slate-800/50 rounded-xl border border-slate-700 group-hover:border-fuchsia-500/50 transition-colors">
                    <svg viewBox="0 0 24 24" className="w-10 h-10" fill="#21759B">
                      <path d="M21.469 6.825c.84 1.537 1.318 3.3 1.318 5.175 0 3.979-2.156 7.456-5.363 9.325l3.295-9.527c.615-1.54.82-2.771.82-3.864 0-.405-.026-.78-.07-1.11m-7.981.105c.647-.034 1.232-.105 1.232-.105.582-.07.514-.925-.068-.892 0 0-1.749.138-2.877.138-.962 0-2.584-.138-2.584-.138-.582-.034-.649.856-.066.891 0 0 .549.07 1.127.103l1.674 4.576-2.35 7.05-3.911-11.626c.648-.034 1.233-.105 1.233-.105.583-.07.514-.925-.066-.892 0 0-1.749.138-2.878.138-.202 0-.443-.005-.693-.014C3.87 3.406 7.633 1.22 12 1.22c3.254 0 6.22 1.246 8.442 3.284-.054-.003-.108-.008-.163-.008-1.053 0-1.797.921-1.797 1.909 0 .887.513 1.637 1.058 2.523.411.72.887 1.645.887 2.981 0 .924-.358 1.994-.831 3.487l-1.086 3.632-3.933-11.696zm-7.963 17.2l3.381-9.825 3.461 9.484c.023.054.049.104.078.152-2.082.756-4.329.986-6.92.186zm-2.269-.7c-4.047-1.852-6.443-5.883-6.443-10.43 0-1.953.492-3.79 1.351-5.399l3.726 10.205 1.366 3.624z"/>
                    </svg>
                  </div>
                  <span className="text-sm text-slate-400">WordPress</span>
                </div>

                {/* WooCommerce */}
                <div className="flex flex-col items-center gap-2 group">
                  <div className="w-16 h-16 flex items-center justify-center bg-slate-800/50 rounded-xl border border-slate-700 group-hover:border-fuchsia-500/50 transition-colors">
                    <svg viewBox="0 0 24 24" className="w-10 h-10" fill="#96588A">
                      <path d="M2.227 4.857A2.228 2.228 0 000 7.094v7.457c0 1.236 1.001 2.237 2.237 2.237h9.253l4.229 2.355-.962-2.355h7.006c1.236 0 2.237-1 2.237-2.237V7.094c0-1.236-1-2.237-2.237-2.237zm-.33 1.678h20.178c.31 0 .559.249.559.559v7.457c0 .31-.249.559-.559.559h-7.006c-.372 0-.693.263-.762.629l-.269 1.029-2.012-1.121a.756.756 0 00-.368-.097H2.227a.558.558 0 01-.559-.559V7.094c0-.31.248-.559.559-.559zm2.559 1.469c-.735 0-1.343.578-1.467 1.393-.14.913.113 1.678.703 2.193.42.368 1.03.564 1.735.564.09 0 .182-.003.275-.012l-.062.349a.372.372 0 00.368.449h.022a.374.374 0 00.365-.293l.275-1.205a2.53 2.53 0 001.118-1.049c.174-.307.279-.647.307-1.001a.373.373 0 00-.33-.407.376.376 0 00-.407.33 1.79 1.79 0 01-.209.678 1.767 1.767 0 01-.84.746l.187-.824a.374.374 0 00-.736-.127l-.275 1.205c-.059.007-.115.01-.17.01-.53 0-.968-.151-1.236-.426-.365-.378-.523-.877-.434-1.453.072-.473.362-.826.738-.826.14 0 .361.048.542.323a.373.373 0 10.622-.411c-.348-.526-.813-.706-1.184-.706zm6.283.002c-.735 0-1.343.578-1.467 1.393-.14.913.113 1.678.703 2.193.42.368 1.03.564 1.735.564.09 0 .182-.003.275-.012l-.062.349a.371.371 0 00.367.449h.023a.374.374 0 00.365-.293l.274-1.205a2.53 2.53 0 001.119-1.049c.174-.307.279-.647.307-1.001a.373.373 0 00-.33-.407.376.376 0 00-.407.33 1.79 1.79 0 01-.209.678 1.768 1.768 0 01-.84.746l.188-.824a.373.373 0 10-.736-.127l-.275 1.205c-.059.007-.115.01-.17.01-.53 0-.968-.151-1.236-.426-.365-.378-.523-.877-.434-1.453.072-.473.362-.826.738-.826.14 0 .361.048.542.323a.372.372 0 10.621-.411c-.348-.526-.812-.706-1.183-.706zm5.875.008a.932.932 0 00-.728.347c-.213.265-.295.615-.229.982.067.372.27.682.558.856.144.087.302.13.467.13.099 0 .201-.017.307-.052l-.021.121a.373.373 0 00.737.126l.315-1.838a.373.373 0 00-.737-.127l-.048.276a.83.83 0 00-.152-.335c-.139-.19-.309-.297-.469-.486zm3.28 0a.932.932 0 00-.728.347c-.213.265-.295.615-.229.982.067.372.27.682.558.856.144.087.302.13.467.13.099 0 .201-.017.307-.052l-.021.121a.373.373 0 00.737.126l.315-1.838a.373.373 0 00-.737-.127l-.048.276a.83.83 0 00-.152-.335c-.139-.19-.309-.297-.469-.486z"/>
                    </svg>
                  </div>
                  <span className="text-sm text-slate-400">WooCommerce</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">{T.processTitle}</h2>
          <div className="grid md:grid-cols-4 gap-8">
            {T.process.map((item, i) => (
              <div key={i} className="relative">
                {i < T.process.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-full w-full h-px bg-gradient-to-r from-purple-500/50 to-transparent" />
                )}
                <div className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
                  {item.step}
                </div>
                <h3 className="mt-4 text-xl font-semibold">{item.title}</h3>
                <p className="mt-2 text-slate-400 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-fuchsia-400">
              {T.ctaTitle}
            </span>
          </h2>
          <p className="mt-6 text-slate-400 text-lg max-w-xl mx-auto">{T.ctaText}</p>
          <button
            onClick={() => setShowContactModal(true)}
            className="mt-10 inline-flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full font-bold text-lg hover:scale-105 transition-transform"
          >
            {T.ctaBtn}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </section>

      {/* Contact Modal */}
      {showContactModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setShowContactModal(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" />

          {/* Modal */}
          <div
            className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setShowContactModal(false)}
              className="absolute -top-12 right-0 p-2 text-slate-400 hover:text-white transition-colors"
              aria-label={sv ? "Stäng" : "Close"}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>

            <ContactForm onSent={() => setShowContactModal(false)} />
          </div>
        </div>
      )}
    </main>
  );
}
