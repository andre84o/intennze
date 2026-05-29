import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-red-100">
        <div className="w-full px-4 md:px-6 lg:px-12 py-3 md:py-4 flex items-center justify-between">
          <Link href="/">
            <Image
              src="/demos/mugg/logomugg.png"
              alt="MuggButiken"
              width={140}
              height={46}
              className="h-15 md:h-18 w-auto"
              priority
            />
          </Link>
          <nav className="flex items-center gap-4 md:gap-8">
            <Link
              href="#story"
              className="hidden md:block text-sm font-medium text-gray-600 hover:text-red-600 transition-colors"
            >
              Our Story
            </Link>
            <Link
              href="#why"
              className="hidden md:block text-sm font-medium text-gray-600 hover:text-red-600 transition-colors"
            >
              Why Us
            </Link>
            <Link
              href="/product/mugg"
              className="bg-red-600 text-white px-4 md:px-5 py-2 md:py-2.5 rounded-full text-sm font-medium hover:bg-red-700 transition-colors"
            >
              Shop Now
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 bg-gradient-to-b from-red-50 to-white">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-red-100 text-red-700 px-4 py-2 rounded-full text-sm font-medium mb-8">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
              Handcrafted with love
            </div>

            <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6 leading-tight">
              Joy in Every
              <span className="text-red-600"> Cup</span>
            </h1>

            <p className="text-xl text-gray-600 mb-10 leading-relaxed max-w-2xl mx-auto">
              Start your morning right with a mug that brings a smile to your
              face. Our carefully designed mugs are more than just drinkware —
              they're daily companions that make every sip special.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/product/mugg"
                className="group inline-flex items-center gap-3 bg-red-600 text-white px-8 py-4 rounded-full font-semibold text-lg hover:bg-red-700 transition-all hover:shadow-lg hover:shadow-red-200"
              >
                Discover Our Mug
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-5 h-5 group-hover:translate-x-1 transition-transform"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
                  />
                </svg>
              </Link>
              <Link
                href="#story"
                className="inline-flex items-center gap-2 text-gray-600 font-medium hover:text-red-600 transition-colors"
              >
                Learn more
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-4 h-4"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m19.5 8.25-7.5 7.5-7.5-7.5"
                  />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Story Section */}
      <section id="story" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <span className="text-red-600 font-semibold text-sm uppercase tracking-wider">
                Our Story
              </span>
              <h2 className="text-4xl font-bold text-gray-900 mt-3 mb-6">
                More Than Just a Mug
              </h2>
              <div className="space-y-4 text-gray-600 text-lg leading-relaxed">
                <p>
                  We believe that the little things in life matter. That first
                  cup of coffee in the morning, the afternoon tea break, the
                  late-night hot chocolate — these moments deserve something
                  special.
                </p>
                <p>
                  That's why we created MuggButiken. Our mugs are designed to
                  bring joy to your daily routine. Each mug is crafted with
                  care, featuring cheerful designs that remind you to smile,
                  even on the busiest days.
                </p>
                <p>
                  Because happiness shouldn't be complicated — sometimes it just
                  takes the right cup.
                </p>
              </div>
            </div>
            <div className="relative">
              <div className="aspect-square bg-gradient-to-br from-red-100 to-red-50 rounded-3xl flex items-center justify-center">
                <Image
                  src="/demos/mugg/logomugg.png"
                  alt="MuggButiken"
                  width={300}
                  height={300}
                  className="w-2/3 h-auto drop-shadow-xl"
                />
              </div>
              <div className="absolute -bottom-6 -right-6 bg-white rounded-2xl shadow-xl p-6 max-w-xs">
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex -space-x-2">
                    <div className="w-8 h-8 rounded-full bg-red-200 flex items-center justify-center text-xs">
                      ☕
                    </div>
                    <div className="w-8 h-8 rounded-full bg-red-300 flex items-center justify-center text-xs">
                      ❤️
                    </div>
                    <div className="w-8 h-8 rounded-full bg-red-400 flex items-center justify-center text-xs">
                      😊
                    </div>
                  </div>
                  <span className="text-sm text-gray-500">Happy customers</span>
                </div>
                <p className="text-sm text-gray-600">
                  "Best mug I've ever owned!"
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Us Section */}
      <section id="why" className="py-24 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-red-600 font-semibold text-sm uppercase tracking-wider">
              Why Choose Us
            </span>
            <h2 className="text-4xl font-bold text-gray-900 mt-3">
              What Makes Us Special
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-14 h-14 bg-red-100 rounded-xl flex items-center justify-center mb-6">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-7 h-7 text-red-600"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Premium Quality
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Made from high-quality ceramic that keeps your drinks at the
                perfect temperature and feels great in your hands.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-14 h-14 bg-red-100 rounded-xl flex items-center justify-center mb-6">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-7 h-7 text-red-600"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Designed with Love
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Every design is created to bring positivity to your day. Our
                cheerful mugs are guaranteed to make you smile.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-14 h-14 bg-red-100 rounded-xl flex items-center justify-center mb-6">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-7 h-7 text-red-600"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Fast Delivery
              </h3>
              <p className="text-gray-600 leading-relaxed">
                We ship quickly and carefully package each mug to ensure it
                arrives safely at your doorstep.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Ready to Start Your Day
            <span className="text-red-600"> Right?</span>
          </h2>
          <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
            Join thousands of happy customers who've made their mornings
            brighter with our mugs. Your perfect cup is waiting.
          </p>
          <Link
            href="/product/mugg"
            className="group inline-flex items-center gap-3 bg-red-600 text-white px-10 py-5 rounded-full font-semibold text-lg hover:bg-red-700 transition-all hover:shadow-xl hover:shadow-red-200"
          >
            Shop Now
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-5 h-5 group-hover:translate-x-1 transition-transform"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
              />
            </svg>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-12 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <Image
              src="/demos/mugg/logomugg.png"
              alt="MuggButiken"
              width={120}
              height={40}
              className="h-10 md:h-14 lg:h-16 w-auto"
            />
            <div className="flex items-center gap-8 text-sm text-gray-500">
              <Link
                href="#story"
                className="hover:text-red-600 transition-colors"
              >
                Our Story
              </Link>
              <Link
                href="#why"
                className="hover:text-red-600 transition-colors"
              >
                Why Us
              </Link>
              <Link
                href="/product/mugg"
                className="hover:text-red-600 transition-colors"
              >
                Shop
              </Link>
            </div>
            <div className="text-sm text-gray-400 text-center md:text-right">
              <p>
                &copy; {new Date().getFullYear()} MuggButiken. All rights
                reserved.
              </p>
              <p className="mt-1">
                Design & development by{" "}
                <a
                  href="https://intenzze.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-red-600 hover:text-red-700 transition-colors"
                >
                  Intenzze
                </a>
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
