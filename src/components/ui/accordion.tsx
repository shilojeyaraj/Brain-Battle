"use client"

import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "@/components/ui/motion"

interface AccordionItemProps {
  question: string
  answer: string
  isOpen: boolean
  onToggle: () => void
  index: number
}

export function AccordionItem({ question, answer, isOpen, onToggle, index }: AccordionItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-xl border border-slate-700/50 hover:border-orange-400/50 transition-all duration-300 overflow-hidden backdrop-blur-sm"
    >
      <button
        onClick={onToggle}
        className="w-full px-6 py-5 text-left flex items-center justify-between gap-4 focus:outline-none focus:ring-2 focus:ring-orange-400/50 rounded-xl group"
      >
        <h3 className="text-lg md:text-xl font-black text-orange-400 pr-4 transition-colors group-hover:text-orange-300">
          {question}
        </h3>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3 }}
          className="flex-shrink-0"
        >
          <ChevronDown className={`w-5 h-5 ${isOpen ? 'text-orange-400' : 'text-orange-400/70'} transition-colors`} strokeWidth={2.5} />
        </motion.div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-5 pt-0 border-t border-slate-700/50">
              <p className="text-base text-blue-100/70 leading-relaxed font-medium pt-4">{answer}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

interface AccordionProps {
  items: Array<{ question: string; answer: string }>
  className?: string
}

export function Accordion({ items, className }: AccordionProps) {
  const [openIndex, setOpenIndex] = React.useState<number | null>(null)

  const handleToggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  return (
    <div className={cn("space-y-3", className)}>
      {items.map((item, index) => (
        <AccordionItem
          key={index}
          question={item.question}
          answer={item.answer}
          isOpen={openIndex === index}
          onToggle={() => handleToggle(index)}
          index={index}
        />
      ))}
    </div>
  )
}

