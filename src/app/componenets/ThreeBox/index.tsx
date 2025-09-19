// Fil: app/componenets/ThreeBox.tsx
"use client";

// Svensk kommentar: Tre lika breda rutor i rad; staplas på mobil.
const ThreeBox = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 items-stretch w-full gap-7 h-100 p-4 rounded">
      <div className="rounded bg-white/90 p-4 text-center">Test</div>
      <div className="rounded bg-white/90 p-4 text-center">Test2</div>
      <div className="rounded bg-white/90 p-4 text-center">Test3</div>
    </div>
  );
};

export default ThreeBox;
