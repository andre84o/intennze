"use client";
import React from "react";



const ThreeBox = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 items-stretch w-full gap-7 h-100 p-4 rounded">
      <div className="rounded bg-white/90 p-4 text-center"></div>
      <div className="rounded bg-white/90 p-4 text-center"></div>
      <div className="rounded bg-white/90 p-4 text-center"></div>
    </div>
  );
};

export default ThreeBox;
