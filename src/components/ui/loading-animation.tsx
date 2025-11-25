"use client"

import React from 'react';
import { motion } from 'framer-motion';

export function LoadingAnimation() {
  return (
    <div className="flex gap-2">
      {[0, 1, 2].map((index) => (
        <motion.div
          key={index}
          className="w-3 h-3 bg-[#4A9EFF] rounded-full"
          animate={{
            y: [0, -12, 0],
            opacity: [1, 0.5, 1],
          }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            delay: index * 0.2,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

