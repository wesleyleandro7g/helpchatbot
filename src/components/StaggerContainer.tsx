import React from 'react';
import { motion } from 'framer-motion';

interface StaggerContainerProps {
  children: React.ReactNode;
  delay?: number;
  staggerChildren?: number;
  className?: string;
}

export default function StaggerContainer({
  children,
  delay = 0,
  staggerChildren = 0.1,
  className = ''
}: StaggerContainerProps) {
  return (
    <motion.div
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-80px" }}
      variants={{
        hidden: {},
        show: {
          transition: {
            staggerChildren,
            delayChildren: delay
          }
        }
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

interface StaggerItemProps {
  children: React.ReactNode;
  y?: number;
  x?: number;
  scale?: number;
  duration?: number;
  className?: string;
}

export function StaggerItem({
  children,
  y = 30,
  x = 0,
  scale = 1,
  duration = 0.8,
  className = ''
}: StaggerItemProps) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y, x, scale },
        show: { 
          opacity: 1, 
          y: 0, 
          x: 0, 
          scale: 1,
          transition: {
            duration,
            ease: [0.16, 1, 0.3, 1]
          }
        }
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
