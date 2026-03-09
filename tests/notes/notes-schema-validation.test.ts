/**
 * @jest-environment node
 * 
 * Tests that validate notes generation output against the notesSchema.
 * These are structural validation tests that ensure generated notes
 * conform to the expected shape without needing real AI calls.
 */

import { notesSchema, type StudyNotes } from '@/lib/schemas/notes-schema'

function validateNotesStructure(notes: any): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  const required = notesSchema.required as readonly string[]

  for (const field of required) {
    if (notes[field] === undefined || notes[field] === null) {
      errors.push(`Missing required field: ${field}`)
    }
  }

  if (notes.title && typeof notes.title !== 'string') {
    errors.push('title must be a string')
  }

  if (notes.subject && typeof notes.subject !== 'string') {
    errors.push('subject must be a string')
  }

  const validEducationLevels = ['elementary', 'middle_school', 'high_school', 'college', 'graduate', 'professional']
  if (notes.education_level && !validEducationLevels.includes(notes.education_level)) {
    errors.push(`education_level must be one of: ${validEducationLevels.join(', ')}`)
  }

  const validDifficulty = ['beginner', 'intermediate', 'advanced']
  if (notes.difficulty_level && !validDifficulty.includes(notes.difficulty_level)) {
    errors.push(`difficulty_level must be one of: ${validDifficulty.join(', ')}`)
  }

  if (notes.complexity_analysis) {
    const ca = notes.complexity_analysis
    if (!ca.vocabulary_level || !['basic', 'intermediate', 'advanced', 'expert'].includes(ca.vocabulary_level)) {
      errors.push('complexity_analysis.vocabulary_level invalid')
    }
    if (!ca.concept_sophistication || !['concrete', 'abstract', 'theoretical', 'research'].includes(ca.concept_sophistication)) {
      errors.push('complexity_analysis.concept_sophistication invalid')
    }
    if (!Array.isArray(ca.prerequisite_knowledge)) {
      errors.push('complexity_analysis.prerequisite_knowledge must be an array')
    }
    if (!ca.reasoning_level || !['memorization', 'comprehension', 'application', 'analysis', 'synthesis', 'evaluation'].includes(ca.reasoning_level)) {
      errors.push('complexity_analysis.reasoning_level invalid')
    }
  }

  if (notes.outline) {
    if (!Array.isArray(notes.outline)) {
      errors.push('outline must be an array')
    } else if (notes.outline.length < 3) {
      errors.push(`outline should have at least 3 items, got ${notes.outline.length}`)
    }
  }

  if (notes.key_terms) {
    if (!Array.isArray(notes.key_terms)) {
      errors.push('key_terms must be an array')
    } else {
      for (let i = 0; i < notes.key_terms.length; i++) {
        const kt = notes.key_terms[i]
        if (!kt.term) errors.push(`key_terms[${i}] missing term`)
        if (!kt.definition) errors.push(`key_terms[${i}] missing definition`)
        if (!kt.importance || !['high', 'medium', 'low'].includes(kt.importance)) {
          errors.push(`key_terms[${i}] invalid importance`)
        }
      }
    }
  }

  if (notes.concepts) {
    if (!Array.isArray(notes.concepts)) {
      errors.push('concepts must be an array')
    } else {
      for (let i = 0; i < notes.concepts.length; i++) {
        const c = notes.concepts[i]
        if (!c.heading) errors.push(`concepts[${i}] missing heading`)
        if (!Array.isArray(c.bullets) || c.bullets.length === 0) {
          errors.push(`concepts[${i}] must have at least one bullet`)
        }
      }
    }
  }

  if (notes.diagrams) {
    if (!Array.isArray(notes.diagrams)) {
      errors.push('diagrams must be an array')
    } else {
      for (let i = 0; i < notes.diagrams.length; i++) {
        const d = notes.diagrams[i]
        if (!d.source || !['file', 'web'].includes(d.source)) {
          errors.push(`diagrams[${i}] invalid source`)
        }
        if (!d.title) errors.push(`diagrams[${i}] missing title`)
        if (!d.caption) errors.push(`diagrams[${i}] missing caption`)
      }
    }
  }

  if (notes.practice_questions) {
    if (!Array.isArray(notes.practice_questions)) {
      errors.push('practice_questions must be an array')
    } else {
      const validTypes = ['multiple_choice', 'open_ended', 'true_false', 'fill_blank']
      const validDiff = ['easy', 'medium', 'hard']
      for (let i = 0; i < notes.practice_questions.length; i++) {
        const pq = notes.practice_questions[i]
        if (!pq.question) errors.push(`practice_questions[${i}] missing question`)
        if (!pq.answer) errors.push(`practice_questions[${i}] missing answer`)
        if (!pq.type || !validTypes.includes(pq.type)) {
          errors.push(`practice_questions[${i}] invalid type`)
        }
        if (!pq.difficulty || !validDiff.includes(pq.difficulty)) {
          errors.push(`practice_questions[${i}] invalid difficulty`)
        }
        if (!pq.explanation) errors.push(`practice_questions[${i}] missing explanation`)
        if (!pq.topic) errors.push(`practice_questions[${i}] missing topic`)
        if (pq.type === 'multiple_choice' && (!Array.isArray(pq.options) || pq.options.length < 2)) {
          errors.push(`practice_questions[${i}] multiple_choice needs at least 2 options`)
        }
      }
    }
  }

  if (notes.resources) {
    const r = notes.resources
    if (!Array.isArray(r.links)) errors.push('resources.links must be an array')
    if (!Array.isArray(r.videos)) errors.push('resources.videos must be an array')
    if (!Array.isArray(r.simulations)) errors.push('resources.simulations must be an array')
  }

  if (notes.study_tips) {
    if (!Array.isArray(notes.study_tips)) {
      errors.push('study_tips must be an array')
    }
  }

  if (notes.common_misconceptions) {
    if (!Array.isArray(notes.common_misconceptions)) {
      errors.push('common_misconceptions must be an array')
    } else {
      for (let i = 0; i < notes.common_misconceptions.length; i++) {
        const cm = notes.common_misconceptions[i]
        if (!cm.misconception) errors.push(`common_misconceptions[${i}] missing misconception`)
        if (!cm.correction) errors.push(`common_misconceptions[${i}] missing correction`)
        if (!cm.why_common) errors.push(`common_misconceptions[${i}] missing why_common`)
      }
    }
  }

  return { valid: errors.length === 0, errors }
}

const MOCK_VALID_NOTES: StudyNotes = {
  title: 'Introduction to Digital Logic: Latches and Flip-Flops',
  subject: 'Computer Engineering',
  education_level: 'college',
  difficulty_level: 'intermediate',
  complexity_analysis: {
    vocabulary_level: 'advanced',
    concept_sophistication: 'abstract',
    prerequisite_knowledge: ['Boolean algebra', 'Logic gates', 'Binary number system'],
    reasoning_level: 'application',
  },
  outline: [
    'SR Latch: Truth table and characteristic equation Q+ = S + R\'Q (p. 3)',
    'D Latch: Level-triggered operation using SR latch with enable (p. 5)',
    'D Flip-Flop: Edge-triggered design using master-slave configuration (p. 8)',
    'Setup and Hold Time: Critical timing parameters for reliable operation (p. 10)',
    'Clock edge detection: Rising vs falling edge trigger mechanisms (p. 12)',
  ],
  key_terms: [
    { term: 'Latch', definition: 'A level-sensitive bistable element that stores one bit of data', importance: 'high' },
    { term: 'Flip-Flop', definition: 'An edge-triggered bistable element that captures input only on clock transitions', importance: 'high' },
    { term: 'Setup Time', definition: 'Minimum time data must be stable before the clock edge', importance: 'high' },
    { term: 'Hold Time', definition: 'Minimum time data must be stable after the clock edge', importance: 'high' },
    { term: 'Propagation Delay', definition: 'Time from input change to output change', importance: 'medium' },
    { term: 'Metastability', definition: 'Unstable state when setup/hold times are violated', importance: 'medium' },
    { term: 'Enable Signal', definition: 'Control signal that allows a latch to pass data', importance: 'medium' },
    { term: 'Master-Slave', definition: 'Two-latch configuration that creates edge-triggered behavior', importance: 'high' },
  ],
  concepts: [
    {
      heading: 'SR Latch Operation',
      bullets: [
        'Set (S=1, R=0) forces Q=1 regardless of previous state',
        'Reset (S=0, R=1) forces Q=0 regardless of previous state',
        'Hold (S=0, R=0) maintains current state via feedback',
        'S=R=1 creates forbidden/invalid state (both outputs same)',
      ],
      examples: ['NOR-gate SR latch used in keyboard debouncing circuits'],
      connections: ['Foundation for D latch and all flip-flop designs'],
    },
    {
      heading: 'D Flip-Flop Edge Triggering',
      bullets: [
        'Captures D input only at the rising (or falling) clock edge',
        'Immune to input changes during the rest of the clock cycle',
        'Master latch captures during opposite phase, slave outputs on active edge',
      ],
      examples: ['Register files in processors use arrays of D flip-flops'],
      connections: ['Building block for registers, counters, state machines'],
    },
    {
      heading: 'Timing Constraints',
      bullets: [
        'Setup time (tsu): data stable before clock edge',
        'Hold time (th): data stable after clock edge',
        'Violation causes metastability - output oscillates unpredictably',
      ],
      examples: ['At 1 GHz clock, setup time might be 50ps requiring careful routing'],
      connections: ['Determines maximum clock frequency of synchronous circuits'],
    },
    {
      heading: 'Level vs Edge Triggering',
      bullets: [
        'Level-triggered (latch): transparent while enable is active',
        'Edge-triggered (flip-flop): captures only at clock transition',
        'Edge triggering prevents races in synchronous pipelines',
      ],
    },
  ],
  diagrams: [
    { source: 'web', title: 'SR Latch Circuit Diagram', caption: 'NOR-gate implementation of SR latch showing cross-coupled feedback', keywords: ['SR latch NOR gate circuit diagram'] },
    { source: 'web', title: 'D Flip-Flop Timing Diagram', caption: 'Clock, D input, and Q output waveforms showing edge-triggered capture', keywords: ['D flip-flop timing diagram waveform'] },
    { source: 'web', title: 'Master-Slave Configuration', caption: 'Two D latches connected as master and slave with inverted clock', keywords: ['master slave flip-flop circuit'] },
  ],
  practice_questions: [
    {
      question: 'What is the characteristic equation of an SR latch?',
      answer: "Q+ = S + R'Q",
      type: 'open_ended',
      difficulty: 'medium',
      explanation: "The characteristic equation Q+ = S + R'Q describes the next state: Set forces Q=1, and when S=0, the current state is held if R=0 (feedback through R'Q).",
      topic: 'SR Latch',
    },
    {
      question: 'What happens when both S and R are 1 in an SR latch?',
      answer: 'The outputs become invalid/forbidden (both Q and Q\' go to the same value)',
      type: 'open_ended',
      difficulty: 'easy',
      explanation: 'With S=R=1, both NOR gates output 0 (or both NAND gates output 1), violating the Q/Q\' complement requirement.',
      topic: 'SR Latch',
    },
    {
      question: 'Which of the following is edge-triggered?',
      answer: 'D Flip-Flop',
      type: 'multiple_choice',
      options: ['SR Latch', 'D Latch', 'D Flip-Flop', 'JK Latch'],
      difficulty: 'easy',
      explanation: 'Latches are level-triggered; flip-flops are edge-triggered. The D flip-flop captures data only at clock transitions.',
      topic: 'Edge Triggering',
    },
    {
      question: 'Setup time violation can cause _____ in a flip-flop.',
      answer: 'metastability',
      type: 'fill_blank',
      difficulty: 'medium',
      explanation: 'When data changes too close to the clock edge, the flip-flop may enter a metastable state where the output oscillates before settling.',
      topic: 'Timing Constraints',
    },
    {
      question: 'A D latch is transparent when the enable signal is active.',
      answer: 'True',
      type: 'true_false',
      difficulty: 'easy',
      explanation: 'When enable is high, the D latch output directly follows the D input. It only latches (holds) when enable goes low.',
      topic: 'D Latch',
    },
    {
      question: 'What advantage does edge triggering have over level triggering in synchronous circuits?',
      answer: 'Edge triggering prevents race conditions by capturing data only at discrete clock moments',
      type: 'open_ended',
      difficulty: 'hard',
      explanation: 'Level-triggered latches can cause races where output changes propagate through combinational logic and feed back before the enable deactivates.',
      topic: 'Level vs Edge Triggering',
    },
    {
      question: 'How many D latches are needed to build a master-slave D flip-flop?',
      answer: '2',
      type: 'multiple_choice',
      options: ['1', '2', '3', '4'],
      difficulty: 'easy',
      explanation: 'A master-slave D flip-flop uses two D latches: the master captures on one phase, and the slave outputs on the opposite phase.',
      topic: 'D Flip-Flop',
    },
    {
      question: 'The hold time is the minimum time data must be stable _____ the clock edge.',
      answer: 'after',
      type: 'fill_blank',
      difficulty: 'medium',
      explanation: 'Hold time (th) specifies how long the data input must remain stable after the active clock edge to ensure reliable capture.',
      topic: 'Timing Constraints',
    },
  ],
  resources: {
    links: [
      { title: 'MIT OpenCourseWare: Digital Systems', url: 'https://ocw.mit.edu/courses/6-111-introductory-digital-systems-laboratory/', description: 'Complete digital logic course with labs', type: 'article', relevance: 'high' },
      { title: 'All About Circuits: Latches', url: 'https://www.allaboutcircuits.com/textbook/digital/', description: 'Interactive textbook covering latch fundamentals', type: 'textbook', relevance: 'high' },
      { title: 'FPGA Flip-Flop Tutorial', url: 'https://nandland.com/d-flip-flop/', description: 'Practical flip-flop implementations in HDL', type: 'interactive', relevance: 'medium' },
      { title: 'Timing Analysis Guide', url: 'https://www.xilinx.com/support/documentation/', description: 'Setup and hold time analysis for FPGA designs', type: 'article', relevance: 'medium' },
      { title: 'Digital Logic Simulation', url: 'https://circuitverse.org/', description: 'Build and simulate logic circuits online', type: 'simulation', relevance: 'high' },
    ],
    videos: [
      { title: 'Latches and Flip-Flops Explained', url: 'https://www.youtube.com/watch?v=example1', description: 'Visual walkthrough of SR, D, JK latches and flip-flops', duration: '15 min', platform: 'YouTube', relevance: 'high' },
      { title: 'Setup and Hold Time', url: 'https://www.youtube.com/watch?v=example2', description: 'Timing constraints with waveform analysis', duration: '10 min', platform: 'YouTube', relevance: 'high' },
      { title: 'Master-Slave Flip-Flop', url: 'https://www.youtube.com/watch?v=example3', description: 'Step-by-step master-slave construction', duration: '12 min', platform: 'YouTube', relevance: 'medium' },
    ],
    simulations: [
      { title: 'CircuitVerse SR Latch', url: 'https://circuitverse.org/simulator', description: 'Interactive SR latch simulation', type: 'circuit', relevance: 'high' },
      { title: 'Falstad D Flip-Flop', url: 'https://falstad.com/circuit/', description: 'Animated D flip-flop with timing', type: 'circuit', relevance: 'high' },
    ],
  },
  study_tips: [
    'Draw timing diagrams by hand for each latch/flip-flop type to build intuition',
    'Memorize characteristic equations: SR (Q+=S+R\'Q), D (Q+=D), JK (Q+=JQ\'+K\'Q)',
    'Practice converting between truth tables, excitation tables, and characteristic equations',
    'Build SR and D latches in a circuit simulator to observe race conditions',
    'Focus on setup/hold time violations - they appear frequently in exams',
  ],
  common_misconceptions: [
    {
      misconception: 'Flip-flops and latches are the same thing',
      correction: 'Latches are level-triggered (transparent while enabled), flip-flops are edge-triggered (capture only on clock transitions)',
      why_common: 'Both store one bit and have similar inputs, so students conflate the terms',
    },
    {
      misconception: 'The D flip-flop output changes immediately when D changes',
      correction: 'The output only updates at the clock edge; D changes between edges are ignored',
      why_common: 'Students confuse D flip-flop with D latch, which is transparent when enabled',
    },
    {
      misconception: 'S=R=1 is just another valid input for an SR latch',
      correction: 'S=R=1 creates a forbidden state where both Q and Q\' become the same value',
      why_common: 'Students assume all input combinations produce useful outputs',
    },
  ],
}

describe('Notes Schema Validation', () => {
  it('validates a complete well-formed notes object', () => {
    const { valid, errors } = validateNotesStructure(MOCK_VALID_NOTES)
    expect(errors).toEqual([])
    expect(valid).toBe(true)
  })

  it('rejects notes with missing required fields', () => {
    const incomplete = { title: 'Test' }
    const { valid, errors } = validateNotesStructure(incomplete)
    expect(valid).toBe(false)
    expect(errors.length).toBeGreaterThan(5)
    expect(errors.some(e => e.includes('outline'))).toBe(true)
    expect(errors.some(e => e.includes('key_terms'))).toBe(true)
  })

  it('rejects invalid education_level enum', () => {
    const bad = { ...MOCK_VALID_NOTES, education_level: 'kindergarten' }
    const { errors } = validateNotesStructure(bad)
    expect(errors.some(e => e.includes('education_level'))).toBe(true)
  })

  it('rejects invalid difficulty_level enum', () => {
    const bad = { ...MOCK_VALID_NOTES, difficulty_level: 'expert' }
    const { errors } = validateNotesStructure(bad)
    expect(errors.some(e => e.includes('difficulty_level'))).toBe(true)
  })

  it('rejects key_terms without required sub-fields', () => {
    const bad = {
      ...MOCK_VALID_NOTES,
      key_terms: [{ term: 'test' }], // missing definition, importance
    }
    const { errors } = validateNotesStructure(bad)
    expect(errors.some(e => e.includes('key_terms[0] missing definition'))).toBe(true)
  })

  it('rejects practice_questions with invalid type', () => {
    const bad = {
      ...MOCK_VALID_NOTES,
      practice_questions: [{
        question: 'Q?', answer: 'A', type: 'essay',
        difficulty: 'easy', explanation: 'E', topic: 'T',
      }],
    }
    const { errors } = validateNotesStructure(bad)
    expect(errors.some(e => e.includes('invalid type'))).toBe(true)
  })

  it('rejects multiple_choice questions without options', () => {
    const bad = {
      ...MOCK_VALID_NOTES,
      practice_questions: [{
        question: 'Q?', answer: 'A', type: 'multiple_choice',
        difficulty: 'easy', explanation: 'E', topic: 'T',
      }],
    }
    const { errors } = validateNotesStructure(bad)
    expect(errors.some(e => e.includes('at least 2 options'))).toBe(true)
  })

  it('rejects concepts without bullets', () => {
    const bad = {
      ...MOCK_VALID_NOTES,
      concepts: [{ heading: 'Test', bullets: [] }],
    }
    const { errors } = validateNotesStructure(bad)
    expect(errors.some(e => e.includes('at least one bullet'))).toBe(true)
  })

  it('rejects common_misconceptions missing fields', () => {
    const bad = {
      ...MOCK_VALID_NOTES,
      common_misconceptions: [{ misconception: 'wrong' }],
    }
    const { errors } = validateNotesStructure(bad)
    expect(errors.some(e => e.includes('missing correction'))).toBe(true)
    expect(errors.some(e => e.includes('missing why_common'))).toBe(true)
  })
})

describe('Notes Quality Assertions', () => {
  it('outline items should be document-specific, not generic', () => {
    for (const item of MOCK_VALID_NOTES.outline) {
      expect(item.length).toBeGreaterThan(20)
      const genericPhrases = ['introduction to the topic', 'summary of key points', 'conclusion']
      for (const phrase of genericPhrases) {
        expect(item.toLowerCase()).not.toBe(phrase)
      }
    }
  })

  it('key_terms should have substantial definitions', () => {
    for (const kt of MOCK_VALID_NOTES.key_terms) {
      expect(kt.definition.length).toBeGreaterThan(10)
      expect(kt.term.length).toBeGreaterThan(1)
    }
  })

  it('concepts should have detailed bullets', () => {
    for (const concept of MOCK_VALID_NOTES.concepts) {
      expect(concept.bullets.length).toBeGreaterThanOrEqual(2)
      for (const bullet of concept.bullets) {
        expect(bullet.length).toBeGreaterThan(15)
      }
    }
  })

  it('practice_questions should have mixed types', () => {
    const types = new Set(MOCK_VALID_NOTES.practice_questions.map(q => q.type))
    expect(types.size).toBeGreaterThanOrEqual(2)
  })

  it('practice_questions should have mixed difficulties', () => {
    const diffs = new Set(MOCK_VALID_NOTES.practice_questions.map(q => q.difficulty))
    expect(diffs.size).toBeGreaterThanOrEqual(2)
  })

  it('practice_questions should have explanations longer than 20 chars', () => {
    for (const q of MOCK_VALID_NOTES.practice_questions) {
      expect(q.explanation.length).toBeGreaterThan(20)
    }
  })

  it('resources should have valid structure', () => {
    expect(MOCK_VALID_NOTES.resources.links.length).toBeGreaterThanOrEqual(3)
    expect(MOCK_VALID_NOTES.resources.videos.length).toBeGreaterThanOrEqual(2)
    for (const link of MOCK_VALID_NOTES.resources.links) {
      expect(link.url).toMatch(/^https?:\/\//)
    }
  })

  it('study_tips should be specific, not single words', () => {
    for (const tip of MOCK_VALID_NOTES.study_tips) {
      expect(tip.split(' ').length).toBeGreaterThanOrEqual(5)
    }
  })
})
