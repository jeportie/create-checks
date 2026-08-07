import { useState } from 'react';

import reactLogo from './assets/react.svg';
import tailwindLogo from './assets/tailwind.svg';
import viteLogo from './assets/vite.svg';

export default function Welcome() {
  const [count, setCount] = useState(0);

  return (
    <div className="min-h-screen bg-gray-200 text-black flex flex-col items-center font-sans">
      <div className="mt-16 flex gap-8">
        <a
          href="https://vite.dev"
          target="_blank"
          rel="noreferrer"
          className="transition-[filter] duration-300 hover:drop-shadow-[0_0_2em_#646cffff]"
        >
          <img src={viteLogo} className="h-24 p-6 animate-pulse motion-reduce:animate-none" alt="Vite logo" />
        </a>
        <a
          href="https://react.dev"
          target="_blank"
          rel="noreferrer"
          className="transition-[filter] duration-300 hover:drop-shadow-[0_0_2em_#FF9944ff]"
        >
          <img
            src={reactLogo}
            className="h-24 p-6 px-8 animate-[spin_5s_linear_infinite] motion-reduce:animate-none"
            alt="React logo"
          />
        </a>
        <a
          href="https://tailwindcss.com"
          target="_blank"
          rel="noreferrer"
          className="transition-[filter] duration-300 hover:drop-shadow-[0_0_4em_#646cffff]"
        >
          <img
            src={tailwindLogo}
            className="h-24 p-6 animate-[pulse_2s_linear_infinite] motion-reduce:animate-none"
            alt="Tailwind logo"
          />
        </a>
      </div>
      <h1 className="animate-bounce text-4xl font-bold leading-tight my-4">Vite + React + Tailwind</h1>
      <div className="p-8 border-black border-solid border-2 rounded-lg flex flex-col items-center">
        <button
          type="button"
          onClick={() => setCount((prev) => prev + 1)}
          className="
            text-white rounded-lg border border-amber-600
            px-5 py-2.5 text-base font-medium
            bg-emerald-800 cursor-pointer transition-colors
            hover:border-sky-400"
        >
          count is {count}
        </button>
        <p className="mt-4">
          Edit <code className="font-mono bg-gray-300">src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="text-[#888]">Click on the Vite and React logos to learn more</p>
    </div>
  );
}
