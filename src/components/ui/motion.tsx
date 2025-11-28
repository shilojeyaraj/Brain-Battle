/**
 * Framer Motion Wrapper
 * 
 * Centralized import point for Framer Motion to improve compilation performance.
 * This reduces the number of direct imports from framer-motion across the codebase.
 */
export { motion, AnimatePresence, MotionConfig } from "framer-motion"
export type { MotionProps, Variants } from "framer-motion"
