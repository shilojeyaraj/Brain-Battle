-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create document_embeddings table for storing vector embeddings
CREATE TABLE IF NOT EXISTS document_embeddings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    document_id UUID, -- Reference to documents table if you have one
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    chunk_text TEXT NOT NULL,
    chunk_metadata JSONB DEFAULT '{}',
    embedding vector(1536), -- OpenAI ada-002 embeddings are 1536 dimensions
    subject_tags TEXT[] DEFAULT '{}', -- Auto-detected subject tags
    course_topics TEXT[] DEFAULT '{}', -- Auto-detected course topics
    difficulty_level TEXT DEFAULT 'medium', -- Auto-detected difficulty
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_document_embeddings_user_id ON document_embeddings(user_id);
CREATE INDEX IF NOT EXISTS idx_document_embeddings_document_id ON document_embeddings(document_id);
CREATE INDEX IF NOT EXISTS idx_document_embeddings_file_name ON document_embeddings(file_name);
CREATE INDEX IF NOT EXISTS idx_document_embeddings_subject_tags ON document_embeddings USING GIN(subject_tags);
CREATE INDEX IF NOT EXISTS idx_document_embeddings_course_topics ON document_embeddings USING GIN(course_topics);

-- Create vector similarity search index (HNSW for fast approximate nearest neighbor search)
CREATE INDEX IF NOT EXISTS idx_document_embeddings_vector_cosine 
ON document_embeddings USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Create vector similarity search index (IVFFlat for exact nearest neighbor search)
CREATE INDEX IF NOT EXISTS idx_document_embeddings_vector_ivfflat 
ON document_embeddings USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_document_embeddings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_document_embeddings_updated_at
    BEFORE UPDATE ON document_embeddings
    FOR EACH ROW
    EXECUTE FUNCTION update_document_embeddings_updated_at();

-- Create a function for semantic search
CREATE OR REPLACE FUNCTION search_documents_by_similarity(
    query_embedding vector(1536),
    user_id_param UUID,
    similarity_threshold FLOAT DEFAULT 0.7,
    max_results INTEGER DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    file_name TEXT,
    chunk_text TEXT,
    chunk_metadata JSONB,
    subject_tags TEXT[],
    course_topics TEXT[],
    difficulty_level TEXT,
    similarity_score FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        de.id,
        de.file_name,
        de.chunk_text,
        de.chunk_metadata,
        de.subject_tags,
        de.course_topics,
        de.difficulty_level,
        1 - (de.embedding <=> query_embedding) AS similarity_score
    FROM document_embeddings de
    WHERE de.user_id = user_id_param
        AND 1 - (de.embedding <=> query_embedding) > similarity_threshold
    ORDER BY de.embedding <=> query_embedding
    LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

-- Create a function to find similar documents by topic
CREATE OR REPLACE FUNCTION find_similar_documents_by_topic(
    topic_query TEXT,
    user_id_param UUID,
    max_results INTEGER DEFAULT 5
)
RETURNS TABLE (
    file_name TEXT,
    chunk_text TEXT,
    subject_tags TEXT[],
    course_topics TEXT[],
    similarity_score FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        de.file_name,
        de.chunk_text,
        de.subject_tags,
        de.course_topics,
        ts_rank(
            to_tsvector('english', de.chunk_text || ' ' || array_to_string(de.subject_tags, ' ') || ' ' || array_to_string(de.course_topics, ' ')),
            plainto_tsquery('english', topic_query)
        ) AS similarity_score
    FROM document_embeddings de
    WHERE de.user_id = user_id_param
        AND (
            to_tsvector('english', de.chunk_text) @@ plainto_tsquery('english', topic_query)
            OR de.subject_tags && string_to_array(topic_query, ' ')
            OR de.course_topics && string_to_array(topic_query, ' ')
        )
    ORDER BY similarity_score DESC
    LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

-- Create a function to get document statistics
CREATE OR REPLACE FUNCTION get_document_statistics(user_id_param UUID)
RETURNS TABLE (
    total_documents INTEGER,
    total_chunks INTEGER,
    subjects TEXT[],
    topics TEXT[],
    file_types TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(DISTINCT file_name)::INTEGER as total_documents,
        COUNT(*)::INTEGER as total_chunks,
        ARRAY_AGG(DISTINCT unnest(subject_tags)) as subjects,
        ARRAY_AGG(DISTINCT unnest(course_topics)) as topics,
        ARRAY_AGG(DISTINCT file_type) as file_types
    FROM document_embeddings
    WHERE user_id = user_id_param;
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security
ALTER TABLE document_embeddings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own document embeddings" ON document_embeddings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own document embeddings" ON document_embeddings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own document embeddings" ON document_embeddings
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own document embeddings" ON document_embeddings
    FOR DELETE USING (auth.uid() = user_id);

-- Insert sample data for testing (optional)
-- This will be populated when users upload documents
