import Image from "next/image";

export default function Home() {
  return (
    <div className="min-h-screen bg-stone-50 font-sans text-stone-800">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <a href="#" className="text-2xl font-serif font-bold text-amber-700">
              Guld & Grönt
            </a>
            <div className="hidden md:flex space-x-8">
              <a href="#meny" className="text-stone-600 hover:text-amber-700 transition-colors">Meny</a>
              <a href="#oppettider" className="text-stone-600 hover:text-amber-700 transition-colors">Öppettider</a>
              <a href="#boka" className="text-stone-600 hover:text-amber-700 transition-colors">Boka Bord</a>
              <a href="#allergener" className="text-stone-600 hover:text-amber-700 transition-colors">Allergener</a>
              <a href="#hitta" className="text-stone-600 hover:text-amber-700 transition-colors">Hitta Hit</a>
              <a href="#recensioner" className="text-stone-600 hover:text-amber-700 transition-colors">Recensioner</a>
            </div>
            <a
              href="#boka"
              className="bg-amber-700 text-white px-4 py-2 rounded-lg hover:bg-amber-800 transition-colors"
            >
              Boka Bord
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center">
        <div className="absolute inset-0">
          <Image
            src="/demos/restaurang/jay-wennington-N_Y88TWmGwA-unsplash.jpg"
            alt="Restaurangmiljö"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-black/50" />
        </div>
        <div className="relative z-10 text-center text-white px-4">
          <h1 className="text-5xl md:text-7xl font-serif font-bold mb-6">
            Guld & Grönt
          </h1>
          <p className="text-xl md:text-2xl mb-8 max-w-2xl mx-auto">
            Upplev svensk matkultur på sitt bästa. Färska råvaror, unika smaker och en varm atmosfär.
          </p>
          <a
            href="#boka"
            className="inline-block bg-amber-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-amber-700 transition-colors"
          >
            Boka Ditt Bord
          </a>
        </div>
      </section>

      {/* Meny Section */}
      <section id="meny" className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-serif font-bold text-center mb-4">Vår Meny</h2>
          <p className="text-center text-stone-600 mb-12 max-w-2xl mx-auto">
            Vi använder endast de finaste lokala råvarorna för att skapa rätter som berör alla sinnen.
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Förrätter */}
            <div className="bg-stone-50 rounded-2xl p-6 shadow-lg">
              <div className="relative h-48 mb-4 rounded-xl overflow-hidden">
                <Image
                  src="/demos/restaurang/casey-lee-awj7sRviVXo-unsplash.jpg"
                  alt="Förrätter"
                  fill
                  className="object-cover"
                />
              </div>
              <h3 className="text-2xl font-serif font-bold mb-4 text-amber-700">Förrätter</h3>
              <ul className="space-y-3">
                <li className="flex justify-between">
                  <span>Toast Skagen</span>
                  <span className="text-amber-700 font-semibold">145 kr</span>
                </li>
                <li className="flex justify-between">
                  <span>Gravad lax med hovmästarsås</span>
                  <span className="text-amber-700 font-semibold">135 kr</span>
                </li>
                <li className="flex justify-between">
                  <span>Sparrissoppa med brynt smör</span>
                  <span className="text-amber-700 font-semibold">95 kr</span>
                </li>
                <li className="flex justify-between">
                  <span>Västkustsallad</span>
                  <span className="text-amber-700 font-semibold">155 kr</span>
                </li>
              </ul>
            </div>

            {/* Huvudrätter */}
            <div className="bg-stone-50 rounded-2xl p-6 shadow-lg">
              <div className="relative h-48 mb-4 rounded-xl overflow-hidden">
                <Image
                  src="/demos/restaurang/joseph-gonzalez-zcUgjyqEwe8-unsplash.jpg"
                  alt="Huvudrätter"
                  fill
                  className="object-cover"
                />
              </div>
              <h3 className="text-2xl font-serif font-bold mb-4 text-amber-700">Huvudrätter</h3>
              <ul className="space-y-3">
                <li className="flex justify-between">
                  <span>Oxfilé med rödvinssky</span>
                  <span className="text-amber-700 font-semibold">345 kr</span>
                </li>
                <li className="flex justify-between">
                  <span>Halstrad piggvar</span>
                  <span className="text-amber-700 font-semibold">295 kr</span>
                </li>
                <li className="flex justify-between">
                  <span>Älggryta med lingon</span>
                  <span className="text-amber-700 font-semibold">275 kr</span>
                </li>
                <li className="flex justify-between">
                  <span>Vegetarisk Wellington</span>
                  <span className="text-amber-700 font-semibold">225 kr</span>
                </li>
              </ul>
            </div>

            {/* Efterrätter */}
            <div className="bg-stone-50 rounded-2xl p-6 shadow-lg">
              <div className="relative h-48 mb-4 rounded-xl overflow-hidden">
                <Image
                  src="/demos/restaurang/alex-munsell-Yr4n8O_3UPc-unsplash.jpg"
                  alt="Efterrätter"
                  fill
                  className="object-cover"
                />
              </div>
              <h3 className="text-2xl font-serif font-bold mb-4 text-amber-700">Efterrätter</h3>
              <ul className="space-y-3">
                <li className="flex justify-between">
                  <span>Chokladfondant</span>
                  <span className="text-amber-700 font-semibold">95 kr</span>
                </li>
                <li className="flex justify-between">
                  <span>Pannacotta med bär</span>
                  <span className="text-amber-700 font-semibold">85 kr</span>
                </li>
                <li className="flex justify-between">
                  <span>Äppelpaj med vaniljsås</span>
                  <span className="text-amber-700 font-semibold">75 kr</span>
                </li>
                <li className="flex justify-between">
                  <span>Osttallrik</span>
                  <span className="text-amber-700 font-semibold">125 kr</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Öppettider Section */}
      <section id="oppettider" className="py-20 px-4 bg-amber-50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-serif font-bold mb-12">Öppettider</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white rounded-2xl p-8 shadow-lg">
              <h3 className="text-xl font-semibold mb-4 text-amber-700">Lunch</h3>
              <ul className="space-y-2 text-stone-600">
                <li className="flex justify-between">
                  <span>Måndag - Fredag</span>
                  <span>11:00 - 14:00</span>
                </li>
                <li className="flex justify-between">
                  <span>Lördag - Söndag</span>
                  <span>12:00 - 15:00</span>
                </li>
              </ul>
            </div>
            <div className="bg-white rounded-2xl p-8 shadow-lg">
              <h3 className="text-xl font-semibold mb-4 text-amber-700">Middag</h3>
              <ul className="space-y-2 text-stone-600">
                <li className="flex justify-between">
                  <span>Måndag - Torsdag</span>
                  <span>17:00 - 22:00</span>
                </li>
                <li className="flex justify-between">
                  <span>Fredag - Lördag</span>
                  <span>17:00 - 23:00</span>
                </li>
                <li className="flex justify-between">
                  <span>Söndag</span>
                  <span>17:00 - 21:00</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Boka Bord Section */}
      <section id="boka" className="py-20 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-serif font-bold text-center mb-4">Boka Bord</h2>
          <p className="text-center text-stone-600 mb-12">
            Reservera ditt bord för en oförglömlig matupplevelse
          </p>

          <form className="bg-stone-50 rounded-2xl p-8 shadow-lg">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Namn
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-3 rounded-lg border border-stone-300 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all"
                  placeholder="Ditt namn"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  E-post
                </label>
                <input
                  type="email"
                  className="w-full px-4 py-3 rounded-lg border border-stone-300 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all"
                  placeholder="din@email.se"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Telefon
                </label>
                <input
                  type="tel"
                  className="w-full px-4 py-3 rounded-lg border border-stone-300 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all"
                  placeholder="070-123 45 67"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Antal gäster
                </label>
                <select className="w-full px-4 py-3 rounded-lg border border-stone-300 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all">
                  <option>1 person</option>
                  <option>2 personer</option>
                  <option>3 personer</option>
                  <option>4 personer</option>
                  <option>5 personer</option>
                  <option>6+ personer</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Datum
                </label>
                <input
                  type="date"
                  className="w-full px-4 py-3 rounded-lg border border-stone-300 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Tid
                </label>
                <select className="w-full px-4 py-3 rounded-lg border border-stone-300 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all">
                  <option>17:00</option>
                  <option>17:30</option>
                  <option>18:00</option>
                  <option>18:30</option>
                  <option>19:00</option>
                  <option>19:30</option>
                  <option>20:00</option>
                  <option>20:30</option>
                  <option>21:00</option>
                </select>
              </div>
            </div>
            <div className="mt-6">
              <label className="block text-sm font-medium text-stone-700 mb-2">
                Meddelande (valfritt)
              </label>
              <textarea
                rows={3}
                className="w-full px-4 py-3 rounded-lg border border-stone-300 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all"
                placeholder="Allergier, specialönskemål, firande..."
              />
            </div>
            <button
              type="submit"
              className="mt-6 w-full bg-amber-700 text-white py-4 rounded-lg text-lg font-semibold hover:bg-amber-800 transition-colors"
            >
              Skicka Bokningsförfrågan
            </button>
          </form>
        </div>
      </section>

      {/* Allergener Section */}
      <section id="allergener" className="py-20 px-4 bg-stone-100">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-serif font-bold text-center mb-4">Allergeninformation</h2>
          <p className="text-center text-stone-600 mb-12">
            Vi tar allergier på största allvar. Informera alltid personalen om eventuella allergier.
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { name: "Gluten", icon: "🌾", info: "Finns i pasta, bröd, såser" },
              { name: "Laktos", icon: "🥛", info: "Finns i gräddsåser, desserter" },
              { name: "Nötter", icon: "🥜", info: "Kan finnas i desserter, pesto" },
              { name: "Skaldjur", icon: "🦐", info: "Toast Skagen, Västkustsallad" },
              { name: "Fisk", icon: "🐟", info: "Gravad lax, Piggvar" },
              { name: "Ägg", icon: "🥚", info: "Hovmästarsås, bakverk" },
              { name: "Selleri", icon: "🥬", info: "I vissa såser och soppor" },
              { name: "Senap", icon: "🟡", info: "Hovmästarsås, dressingar" },
            ].map((allergen) => (
              <div
                key={allergen.name}
                className="bg-white rounded-xl p-4 text-center shadow-md hover:shadow-lg transition-shadow"
              >
                <span className="text-3xl mb-2 block">{allergen.icon}</span>
                <h3 className="font-semibold text-stone-800">{allergen.name}</h3>
                <p className="text-sm text-stone-500 mt-1">{allergen.info}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 bg-amber-100 rounded-xl p-6 text-center">
            <p className="text-amber-800">
              <strong>OBS!</strong> Alla rätter kan anpassas efter allergier.
              Vänligen informera vår personal vid bokning eller beställning.
            </p>
          </div>
        </div>
      </section>

      {/* Hitta Hit / Karta Section */}
      <section id="hitta" className="py-20 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-serif font-bold text-center mb-4">Hitta Hit</h2>
          <p className="text-center text-stone-600 mb-12">
            Vi finns i hjärtat av Stockholms Gamla Stan
          </p>

          <div className="grid lg:grid-cols-2 gap-8">
            <div className="bg-stone-50 rounded-2xl p-8">
              <h3 className="text-xl font-semibold mb-4 text-amber-700">Kontaktuppgifter</h3>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <span className="text-2xl">📍</span>
                  <div>
                    <strong>Adress</strong>
                    <p className="text-stone-600">Stortorget 5, 111 29 Stockholm</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-2xl">📞</span>
                  <div>
                    <strong>Telefon</strong>
                    <p className="text-stone-600">08-123 45 67</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-2xl">✉️</span>
                  <div>
                    <strong>E-post</strong>
                    <p className="text-stone-600">info@intenzze.com</p>
                  </div>
                </li>
              </ul>

              <div className="mt-8">
                <h4 className="font-semibold mb-2">Kollektivtrafik</h4>
                <p className="text-stone-600 text-sm">
                  Tunnelbana: Gamla Stan (röd/grön linje)<br />
                  Buss: Linje 2, 43, 55, 76 till Slottsbacken
                </p>
              </div>
            </div>

            <div className="rounded-2xl overflow-hidden shadow-lg h-[400px]">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2035.5889891089473!2d18.0707!3d59.3252!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x465f9d5e7d2d7a7b%3A0x0!2sStortorget%2C%20Stockholm!5e0!3m2!1ssv!2sse!4v1234567890"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Recensioner Section */}
      <section id="recensioner" className="py-20 px-4 bg-amber-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-serif font-bold text-center mb-4">Vad våra gäster säger</h2>
          <p className="text-center text-stone-600 mb-12">
            Vi är stolta över våra gästers upplevelser
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: "Anna Svensson",
                rating: 5,
                text: "Fantastisk upplevelse! Maten var utsökt och servicen var i världsklass. Oxfilén smälte i munnen. Kommer definitivt tillbaka!",
                date: "November 2024"
              },
              {
                name: "Erik Lindqvist",
                rating: 5,
                text: "Perfekt ställe för en romantisk middag. Atmosfären är magisk och personalen är otroligt tillmötesgående. Toast Skagen var den bästa jag ätit.",
                date: "Oktober 2024"
              },
              {
                name: "Maria Andersson",
                rating: 5,
                text: "Som vegetarian uppskattade jag verkligen deras anpassningsförmåga. Vegetarisk Wellington var en dröm! Dessutom tog de mina allergier på stort allvar.",
                date: "September 2024"
              },
            ].map((review, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl p-6 shadow-lg"
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(review.rating)].map((_, i) => (
                    <span key={i} className="text-amber-500 text-xl">★</span>
                  ))}
                </div>
                <p className="text-stone-600 mb-4 italic">&ldquo;{review.text}&rdquo;</p>
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-stone-800">{review.name}</span>
                  <span className="text-sm text-stone-400">{review.date}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <div className="inline-flex items-center gap-2 bg-white px-6 py-3 rounded-full shadow-md">
              <span className="text-amber-500 text-2xl">★</span>
              <span className="text-2xl font-bold text-stone-800">4.9</span>
              <span className="text-stone-500">/ 5 baserat på 247 recensioner</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-stone-900 text-white py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-2xl font-serif font-bold text-amber-500 mb-4">Guld & Grönt</h3>
              <p className="text-stone-400">
                Svensk matkultur på sitt bästa sedan 2015.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Snabblänkar</h4>
              <ul className="space-y-2 text-stone-400">
                <li><a href="#meny" className="hover:text-amber-500 transition-colors">Meny</a></li>
                <li><a href="#boka" className="hover:text-amber-500 transition-colors">Boka Bord</a></li>
                <li><a href="#hitta" className="hover:text-amber-500 transition-colors">Hitta Hit</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Öppettider</h4>
              <ul className="space-y-2 text-stone-400 text-sm">
                <li>Mån-Fre: 11-14, 17-22</li>
                <li>Lör: 12-15, 17-23</li>
                <li>Sön: 12-15, 17-21</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Följ Oss</h4>
              <div className="flex gap-4">
                <a href="https://www.instagram.com/intenzzewebbstudio" target="_blank" rel="noopener noreferrer" className="text-2xl hover:text-amber-500 transition-colors">📷</a>
                <a href="https://www.facebook.com/intenzzeweb" target="_blank" rel="noopener noreferrer" className="text-2xl hover:text-amber-500 transition-colors">📘</a>
                <a href="https://x.com" target="_blank" rel="noopener noreferrer" className="text-2xl hover:text-amber-500 transition-colors">𝕏</a>
              </div>
            </div>
          </div>
          <div className="border-t border-stone-700 mt-8 pt-8 text-center text-stone-500 text-sm">
            <p>&copy; 2024 Guld & Grönt. Alla rättigheter förbehållna.</p>
            <p className="mt-2">Design & development by <a href="https://www.intenzze.com" target="_blank" rel="noopener noreferrer" className="text-amber-500 hover:text-amber-400 transition-colors">Intenzze</a></p>
          </div>
        </div>
      </footer>
    </div>
  );
}
