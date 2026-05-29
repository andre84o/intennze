'use client';

import { useState } from 'react';

export default function BookingModal({ 
  className = "inline-block px-12 py-5 bg-sage-600 text-white text-sm font-medium tracking-wider uppercase hover:bg-sage-700 transition-all duration-300 cursor-pointer",
  text = "Boka konsultation",
  onOpen,
  isOpen: controlledIsOpen,
  onClose: controlledOnClose
}: { 
  className?: string;
  text?: string;
  onOpen?: () => void;
  isOpen?: boolean;
  onClose?: () => void;
}) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [step, setStep] = useState(1);

  const dates = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i + 1);
    return d;
  });

  const timeSlots = [
    "09:00", "10:00", "11:00", "13:00", "14:00", "15:00"
  ];

  const handleBook = () => {
    setStep(3);
  };
  
  const isModalOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
  
  const handleOpen = () => {
    if (onOpen) onOpen();
    if (controlledIsOpen === undefined) setInternalIsOpen(true);
  };

  const handleClose = () => {
    if (controlledOnClose) controlledOnClose();
    if (controlledIsOpen === undefined) {
      setInternalIsOpen(false);
      setStep(1);
      setSelectedDate(null);
      setSelectedTime(null);
    }
  };

  const reset = () => {
    handleClose();
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className={className}
      >
        {text}
      </button>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto p-4 py-8 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-sm shadow-2xl max-w-2xl w-full overflow-hidden relative animate-in zoom-in-95 duration-200 my-auto">
            <button 
              onClick={reset}
              className="absolute top-4 right-4 text-sage-400 hover:text-sage-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="p-8 md:p-10">
              {step === 1 && (
                <>
                  <span className="text-gold text-xs tracking-[0.2em] uppercase block mb-2">Boka tid</span>
                  <h3 className="text-3xl font-light text-sage-800 mb-8">Välj ett datum</h3>
                  
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-2 mb-8">
                    {dates.map((date, i) => (
                      <button
                        key={i}
                        onClick={() => setSelectedDate(i)}
                        className={`p-3 rounded-sm text-center text-sm transition-all duration-200 border ${
                          selectedDate === i
                            ? 'bg-sage-800 text-white border-sage-800'
                            : 'border-sage-100 hover:border-gold/50 text-sage-600 hover:bg-sage-50'
                        }`}
                      >
                        <div className="font-medium text-xs uppercase mb-1 opacity-80">{date.toLocaleDateString('sv-SE', { weekday: 'short' }).replace('.', '')}</div>
                        <div className="text-xl font-light">{date.getDate()}</div>
                      </button>
                    ))}
                  </div>
                  
                  {selectedDate !== null && (
                    <div className="animate-in slide-in-from-bottom-4 duration-300">
                      <h4 className="text-lg font-light text-sage-800 mb-4">Tillgängliga tider</h4>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                        {timeSlots.map((time) => (
                          <button
                            key={time}
                            onClick={() => {
                              setSelectedTime(time);
                              setStep(2);
                            }}
                            className="py-3 px-4 border border-sage-200 rounded-sm hover:border-gold hover:text-gold text-sage-600 transition-all duration-200 text-sm tracking-wider"
                          >
                            {time}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {step === 2 && (
                <div className="text-center animate-in slide-in-from-right-8 duration-300">
                  <span className="text-gold text-xs tracking-[0.2em] uppercase block mb-2">Bekräfta</span>
                  <h3 className="text-3xl font-light text-sage-800 mb-2">Dina uppgifter</h3>
                  <p className="text-sage-500 mb-8 font-light">
                    Du bokar en konsultation den <span className="font-medium text-sage-800">{dates[selectedDate!].toLocaleDateString('sv-SE')}</span> kl <span className="font-medium text-sage-800">{selectedTime}</span>.
                  </p>
                  
                  <form className="max-w-sm mx-auto space-y-5 mb-8" onSubmit={(e) => { e.preventDefault(); handleBook(); }}>
                    <div className="text-left">
                      <label className="block text-xs uppercase tracking-wider text-sage-500 mb-2">Namn</label>
                      <input type="text" required className="w-full p-3 bg-sage-50 border border-sage-200 rounded-sm focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/20 transition-all" placeholder="Ditt namn" />
                    </div>
                    <div className="text-left">
                      <label className="block text-xs uppercase tracking-wider text-sage-500 mb-2">E-post</label>
                      <input type="email" required className="w-full p-3 bg-sage-50 border border-sage-200 rounded-sm focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/20 transition-all" placeholder="din@email.com" />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-4 bg-sage-800 text-white font-medium tracking-wider uppercase hover:bg-sage-700 transition-all duration-300 mt-4"
                    >
                      Bekräfta bokning
                    </button>
                  </form>
                  
                  <button onClick={() => setStep(1)} className="text-xs text-sage-400 hover:text-sage-800 uppercase tracking-wider transition-colors">
                    ← Gå tillbaka
                  </button>
                </div>
              )}

              {step === 3 && (
                <div className="text-center py-8 animate-in zoom-in-95 duration-300">
                  <div className="w-20 h-20 bg-sage-50 text-sage-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-3xl font-light text-sage-800 mb-4">Tack för din bokning!</h3>
                  <p className="text-sage-600 mb-8 max-w-md mx-auto leading-relaxed">
                    Vi har tagit emot din bokning och skickat en bekräftelse till din e-post. Vi ser fram emot att träffa dig!
                  </p>
                  <button
                    onClick={reset}
                    className="px-10 py-4 border border-sage-300 text-sage-600 hover:bg-sage-800 hover:text-white hover:border-sage-800 transition-all duration-300 uppercase text-sm tracking-wider font-medium"
                  >
                    Stäng fönstret
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
