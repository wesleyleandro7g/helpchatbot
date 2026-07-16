import React from 'react';
import { motion } from 'framer-motion';

interface FadeInProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  y?: number;
  x?: number;
  scale?: number;
  className?: string;
}

export default function FadeIn({
  children,
  delay = 0,
  duration = 0.8,
  y = 30,
  x = 0,
  scale = 1,
  className = ''
}: FadeInProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y, x, scale }}
      whileInView={{ opacity: 1, y: 0, x: 0, scale: 1 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{
        duration,
        delay,
        ease: [0.16, 1, 0.3, 1] // Custom cubic-bezier for smooth, premium animations
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
