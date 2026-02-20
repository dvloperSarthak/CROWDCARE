"use client";

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ShieldAlert } from 'lucide-react';

export function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          setTimeout(onComplete, 800);
          return 100;
        }
        return prev + 4;
      });
    }, 80);
    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center p-6 text-white overflow-hidden">
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex flex-col items-center gap-8 text-center"
      >
        <div className="relative">
          <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center border-4 border-primary animate-pulse">
            <ShieldAlert className="w-12 h-12 text-primary" />
          </div>
          <motion.div 
            className="absolute inset-0 border-4 border-primary/20 rounded-full"
            animate={{ scale: [1, 1.8], opacity: [0.6, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </div>

        <div className="space-y-4">
          <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tighter">CrowdCare Guardian</h1>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 animate-pulse">Node Tactical Initializing</p>
        </div>

        <div className="w-64 space-y-3">
          <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ ease: "linear" }}
            />
          </div>
          <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-slate-400">
            <span>{progress}% Signal Link</span>
            <span>Auth: Syncing</span>
          </div>
        </div>
      </motion.div>

      {/* Background Decorative Grid */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ 
        backgroundImage: 'linear-gradient(to right, #1e293b 1px, transparent 1px), linear-gradient(to bottom, #1e293b 1px, transparent 1px)',
        backgroundSize: '40px 40px'
      }} />
    </div>
  );
}
