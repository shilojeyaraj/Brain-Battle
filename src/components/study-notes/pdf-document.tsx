/**
 * PDF Document Component
 * Creates a beautifully formatted PDF from study notes using React-PDF
 */

import React from 'react'
import { Document, Page, Text, View, StyleSheet, Image, Link } from '@react-pdf/renderer'
import { StudyNotes } from '@/lib/schemas/notes-schema'

// Define styles for the PDF
const styles = StyleSheet.create({
  page: {
    padding: 40,
    backgroundColor: '#ffffff',
    fontFamily: 'Helvetica',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#1e3a8a',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 30,
    textAlign: 'center',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#1e40af',
    borderBottomWidth: 2,
    borderBottomColor: '#3b82f6',
    paddingBottom: 5,
  },
  subsectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 8,
    color: '#1e3a8a',
  },
  paragraph: {
    fontSize: 11,
    lineHeight: 1.6,
    marginBottom: 8,
    color: '#1f2937',
  },
  bulletPoint: {
    fontSize: 11,
    lineHeight: 1.6,
    marginBottom: 6,
    marginLeft: 15,
    color: '#1f2937',
  },
  bulletMarker: {
    fontSize: 11,
    color: '#3b82f6',
    marginRight: 5,
  },
  outlineItem: {
    fontSize: 11,
    lineHeight: 1.6,
    marginBottom: 8,
    marginLeft: 15,
    color: '#1f2937',
    fontWeight: 'bold',
  },
  conceptHeading: {
    fontSize: 13,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 6,
    color: '#1e40af',
  },
  formulaBox: {
    backgroundColor: '#f1f5f9',
    border: '1 solid #cbd5e1',
    borderRadius: 4,
    padding: 12,
    marginVertical: 8,
    fontFamily: 'Courier',
    fontSize: 12,
    textAlign: 'center',
    color: '#0f172a',
  },
  formulaName: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 6,
    color: '#1e3a8a',
  },
  formulaText: {
    fontSize: 12,
    fontFamily: 'Courier',
    color: '#0f172a',
    marginBottom: 4,
  },
  variableItem: {
    fontSize: 10,
    marginBottom: 4,
    marginLeft: 15,
    color: '#475569',
  },
  variableSymbol: {
    fontFamily: 'Courier',
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  questionBox: {
    backgroundColor: '#f8fafc',
    border: '1 solid #e2e8f0',
    borderRadius: 4,
    padding: 12,
    marginVertical: 10,
  },
  questionNumber: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: 6,
  },
  questionText: {
    fontSize: 11,
    marginBottom: 8,
    color: '#1f2937',
    fontWeight: 'bold',
  },
  option: {
    fontSize: 10,
    marginBottom: 4,
    marginLeft: 15,
    color: '#475569',
  },
  answerBox: {
    backgroundColor: '#dcfce7',
    border: '1 solid #86efac',
    borderRadius: 4,
    padding: 10,
    marginTop: 8,
  },
  answerLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#166534',
    marginBottom: 4,
  },
  answerText: {
    fontSize: 10,
    color: '#166534',
  },
  explanation: {
    fontSize: 10,
    fontStyle: 'italic',
    color: '#64748b',
    marginTop: 6,
  },
  diagramBox: {
    backgroundColor: '#fef3c7',
    border: '1 solid #fcd34d',
    borderRadius: 4,
    padding: 10,
    marginVertical: 8,
  },
  diagramTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#92400e',
    marginBottom: 4,
  },
  diagramCaption: {
    fontSize: 10,
    color: '#78350f',
    marginBottom: 4,
  },
  pageNumber: {
    fontSize: 10,
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  metadata: {
    fontSize: 10,
    color: '#64748b',
    marginBottom: 4,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    marginVertical: 15,
  },
  link: {
    color: '#3b82f6',
    textDecoration: 'underline',
  },
  badge: {
    backgroundColor: '#dbeafe',
    color: '#1e40af',
    fontSize: 9,
    padding: '4 8',
    borderRadius: 4,
    marginRight: 6,
    marginBottom: 4,
  },
  tipBox: {
    backgroundColor: '#fef3c7',
    border: '1 solid #fcd34d',
    borderRadius: 4,
    padding: 10,
    marginVertical: 6,
  },
  tipText: {
    fontSize: 10,
    color: '#78350f',
  },
})

interface PDFDocumentProps {
  notes: StudyNotes
  fileNames?: string[]
}

export const StudyNotesPDFDocument: React.FC<PDFDocumentProps> = ({ notes, fileNames }) => {
  const renderOutline = () => {
    if (!notes.outline || notes.outline.length === 0) return null

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Study Outline</Text>
        {notes.outline.map((item, index) => (
          <Text key={index} style={styles.outlineItem}>
            {index + 1}. {item}
          </Text>
        ))}
      </View>
    )
  }

  const renderConcepts = () => {
    if (!notes.concepts || notes.concepts.length === 0) return null

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Key Concepts</Text>
        {notes.concepts.map((concept, index) => (
          <View key={index} style={{ marginBottom: 15 }}>
            <Text style={styles.conceptHeading}>{concept.heading}</Text>
            {concept.bullets && concept.bullets.map((bullet, bulletIndex) => (
              <Text key={bulletIndex} style={styles.bulletPoint}>
                <Text style={styles.bulletMarker}>• </Text>
                {bullet}
              </Text>
            ))}
            {concept.examples && concept.examples.length > 0 && (
              <View style={{ marginTop: 8 }}>
                <Text style={styles.subsectionTitle}>Examples:</Text>
                {concept.examples.map((example, exampleIndex) => (
                  <Text key={exampleIndex} style={styles.paragraph}>
                    {example}
                  </Text>
                ))}
              </View>
            )}
          </View>
        ))}
      </View>
    )
  }

  const renderFormulas = () => {
    if (!notes.formulas || notes.formulas.length === 0) return null

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Formula Sheet</Text>
        {notes.formulas.map((formula, index) => (
          <View key={index} style={styles.formulaBox}>
            <Text style={styles.formulaName}>{formula.name}</Text>
            <Text style={styles.formulaText}>{formula.formula}</Text>
            {formula.description && (
              <Text style={styles.paragraph}>{formula.description}</Text>
            )}
            {formula.variables && formula.variables.length > 0 && (
              <View style={{ marginTop: 8 }}>
                <Text style={styles.subsectionTitle}>Variables:</Text>
                {formula.variables.map((variable, varIndex) => (
                  <Text key={varIndex} style={styles.variableItem}>
                    <Text style={styles.variableSymbol}>{variable.symbol}</Text>: {variable.meaning}
                  </Text>
                ))}
              </View>
            )}
            {formula.example && (
              <View style={{ marginTop: 8 }}>
                <Text style={styles.subsectionTitle}>Example:</Text>
                <Text style={styles.paragraph}>{formula.example}</Text>
              </View>
            )}
            {formula.page && (
              <Text style={styles.pageNumber}>Page {formula.page}</Text>
            )}
          </View>
        ))}
      </View>
    )
  }

  const renderDiagrams = () => {
    if (!notes.diagrams || notes.diagrams.length === 0) return null

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Diagrams & Figures</Text>
        {notes.diagrams.map((diagram, index) => (
          <View key={index} style={styles.diagramBox}>
            <Text style={styles.diagramTitle}>
              {index + 1}. {diagram.title || `Diagram ${index + 1}`}
            </Text>
            {diagram.caption && (
              <Text style={styles.diagramCaption}>{diagram.caption}</Text>
            )}
            {diagram.page && (
              <Text style={styles.pageNumber}>Page {diagram.page}</Text>
            )}
            {diagram.keywords && diagram.keywords.length > 0 && (
              <View style={{ marginTop: 6, flexDirection: 'row', flexWrap: 'wrap' }}>
                {diagram.keywords.map((keyword, kwIndex) => (
                  <Text key={kwIndex} style={styles.badge}>
                    {keyword}
                  </Text>
                ))}
              </View>
            )}
          </View>
        ))}
      </View>
    )
  }

  const renderPracticeQuestions = () => {
    if (!notes.practice_questions || notes.practice_questions.length === 0) return null

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Practice Questions</Text>
        {notes.practice_questions.map((qa, index) => (
          <View key={index} style={styles.questionBox}>
            <Text style={styles.questionNumber}>
              Q{index + 1} ({qa.type?.replace('_', ' ')} - {qa.difficulty})
            </Text>
            <Text style={styles.questionText}>{qa.question}</Text>
            {qa.options && qa.options.length > 0 && (
              <View style={{ marginTop: 6 }}>
                {qa.options.map((option, optIndex) => (
                  <Text key={optIndex} style={styles.option}>
                    {String.fromCharCode(65 + optIndex)}) {option}
                  </Text>
                ))}
              </View>
            )}
            <View style={styles.answerBox}>
              <Text style={styles.answerLabel}>Answer:</Text>
              <Text style={styles.answerText}>{qa.answer}</Text>
            </View>
            {qa.explanation && (
              <Text style={styles.explanation}>Explanation: {qa.explanation}</Text>
            )}
            {qa.topic && (
              <Text style={styles.pageNumber}>Topic: {qa.topic}</Text>
            )}
          </View>
        ))}
      </View>
    )
  }

  const renderKeyTerms = () => {
    if (!notes.key_terms || notes.key_terms.length === 0) return null

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Key Terms</Text>
        {notes.key_terms.map((term, index) => (
          <View key={index} style={{ marginBottom: 10 }}>
            <Text style={styles.subsectionTitle}>{term.term}</Text>
            <Text style={styles.paragraph}>{term.definition}</Text>
          </View>
        ))}
      </View>
    )
  }

  const renderResources = () => {
    const hasVideos = notes.resources?.videos && notes.resources.videos.length > 0
    const hasLinks = notes.resources?.links && notes.resources.links.length > 0

    if (!hasVideos && !hasLinks) return null

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Additional Resources</Text>
        {hasVideos && (
          <View style={{ marginBottom: 12 }}>
            <Text style={styles.subsectionTitle}>Videos</Text>
            {notes.resources!.videos!.map((video, index) => (
              <View key={index} style={{ marginBottom: 6 }}>
                <Link src={video.url} style={styles.link}>
                  {video.title || 'Video Link'}
                </Link>
                {video.description && (
                  <Text style={styles.paragraph}>{video.description}</Text>
                )}
              </View>
            ))}
          </View>
        )}
        {hasLinks && (
          <View>
            <Text style={styles.subsectionTitle}>Links</Text>
            {notes.resources!.links!.map((link, index) => (
              <View key={index} style={{ marginBottom: 6 }}>
                <Link src={link.url} style={styles.link}>
                  {link.title || 'Link'}
                </Link>
                {link.description && (
                  <Text style={styles.paragraph}>{link.description}</Text>
                )}
              </View>
            ))}
          </View>
        )}
      </View>
    )
  }

  const renderStudyTips = () => {
    if (!notes.study_tips || notes.study_tips.length === 0) return null

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Study Tips</Text>
        {notes.study_tips.map((tip, index) => (
          <View key={index} style={styles.tipBox}>
            <Text style={styles.tipText}>💡 {tip}</Text>
          </View>
        ))}
      </View>
    )
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <Text style={styles.title}>{notes.title || 'Study Notes'}</Text>
        {fileNames && fileNames.length > 0 && (
          <Text style={styles.subtitle}>
            Generated from {fileNames.length} document{fileNames.length > 1 ? 's' : ''}
          </Text>
        )}
        
        {/* Metadata */}
        {(notes.subject || notes.education_level || notes.difficulty_level) && (
          <View style={{ marginBottom: 20 }}>
            {notes.subject && (
              <Text style={styles.metadata}>Subject: {notes.subject}</Text>
            )}
            {notes.education_level && (
              <Text style={styles.metadata}>
                Education Level: {notes.education_level.replace('_', ' ')}
              </Text>
            )}
            {notes.difficulty_level && (
              <Text style={styles.metadata}>Difficulty: {notes.difficulty_level}</Text>
            )}
          </View>
        )}

        <View style={styles.divider} />

        {/* Content Sections */}
        {renderOutline()}
        {renderConcepts()}
        {renderKeyTerms()}
        {renderFormulas()}
        {renderDiagrams()}
        {renderPracticeQuestions()}
        {renderStudyTips()}
        {renderResources()}
      </Page>
    </Document>
  )
}

