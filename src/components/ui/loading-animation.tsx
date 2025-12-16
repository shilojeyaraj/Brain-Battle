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
          initial={{ y: 0, opacity: 0.3 }}
          animate={{
            y: [0, -12, 0],
            opacity: [0.3, 1, 0.3],
          }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            delay: index * 0.2,
            ease: [0.4, 0, 0.6, 1], // Custom cubic-bezier for smooth start
            type: "tween",
          }}
        />
      ))}
    </div>
  );
}

