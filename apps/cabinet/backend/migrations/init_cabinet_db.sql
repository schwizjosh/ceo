-- Cabinet Database Schema
-- PostgreSQL with pgvector extension for semantic search
-- All user_id fields reference andora_db.users(id) (cross-database)

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- Categories Table
-- System and user-defined categories for organizing transcripts
-- ============================================================
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#6366f1',
    icon VARCHAR(50) DEFAULT 'folder',
    is_system BOOLEAN DEFAULT false,
    user_id UUID, -- NULL for system categories, references andora_db.users(id)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(name, user_id)
);

-- Insert default system categories
INSERT INTO categories (name, description, color, icon, is_system) VALUES
('Meeting', 'Team meetings and discussions', '#3b82f6', 'users', true),
('Interview', 'Job interviews and candidate screenings', '#8b5cf6', 'user-check', true),
('Lecture', 'Educational content and training', '#10b981', 'book-open', true),
('Podcast', 'Podcast episodes and audio content', '#f59e0b', 'mic', true),
('Call', 'Phone and video calls', '#ef4444', 'phone', true),
('Presentation', 'Presentations and demos', '#ec4899', 'presentation', true),
('Brainstorm', 'Brainstorming and ideation sessions', '#06b6d4', 'lightbulb', true),
('Other', 'Uncategorized transcripts', '#6b7280', 'file-text', true);

-- ============================================================
-- Meetings Table
-- Group related transcripts together
-- ============================================================
CREATE TABLE meetings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL, -- References andora_db.users(id)
    title VARCHAR(255) NOT NULL,
    description TEXT,
    meeting_type VARCHAR(50) DEFAULT 'general',
    scheduled_date TIMESTAMP WITH TIME ZONE,
    attendees JSONB DEFAULT '[]'::jsonb,
    tags TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_meetings_user_id ON meetings(user_id);
CREATE INDEX idx_meetings_scheduled_date ON meetings(scheduled_date);
CREATE INDEX idx_meetings_tags ON meetings USING GIN(tags);

-- ============================================================
-- Transcripts Table
-- Core table for storing transcript data
-- ============================================================
CREATE TABLE transcripts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL, -- References andora_db.users(id)
    meeting_id UUID REFERENCES meetings(id) ON DELETE SET NULL,
    
    -- Basic info
    title VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Source information
    source_type VARCHAR(20) NOT NULL CHECK (source_type IN ('audio', 'video', 'text', 'paste')),
    source_filename VARCHAR(255),
    source_url TEXT,
    file_size_bytes BIGINT,
    duration_seconds FLOAT,
    
    -- Transcription data
    full_text TEXT,
    language VARCHAR(10) DEFAULT 'en',
    confidence_score FLOAT,
    word_count INTEGER,
    
    -- AI Analysis results
    ai_summary TEXT,
    key_insights JSONB DEFAULT '[]'::jsonb,
    sentiment VARCHAR(20) CHECK (sentiment IN ('positive', 'neutral', 'negative', 'mixed')),
    sentiment_score FLOAT CHECK (sentiment_score >= -1.0 AND sentiment_score <= 1.0),
    topics JSONB DEFAULT '[]'::jsonb,
    tags TEXT[] DEFAULT '{}',
    
    -- Category assignment
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    auto_categories JSONB DEFAULT '[]'::jsonb,
    
    -- Status tracking
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'archived')),
    processing_error TEXT,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    is_favorite BOOLEAN DEFAULT false,
    is_archived BOOLEAN DEFAULT false,
    
    -- Timestamps
    transcribed_at TIMESTAMP WITH TIME ZONE,
    analyzed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_transcripts_user_id ON transcripts(user_id);
CREATE INDEX idx_transcripts_meeting_id ON transcripts(meeting_id);
CREATE INDEX idx_transcripts_category_id ON transcripts(category_id);
CREATE INDEX idx_transcripts_status ON transcripts(status);
CREATE INDEX idx_transcripts_source_type ON transcripts(source_type);
CREATE INDEX idx_transcripts_created_at ON transcripts(created_at DESC);
CREATE INDEX idx_transcripts_sentiment ON transcripts(sentiment);
CREATE INDEX idx_transcripts_tags ON transcripts USING GIN(tags);
CREATE INDEX idx_transcripts_is_favorite ON transcripts(is_favorite) WHERE is_favorite = true;

-- Full-text search index
CREATE INDEX idx_transcripts_fulltext ON transcripts 
    USING GIN(to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(full_text, '') || ' ' || COALESCE(ai_summary, '')));

-- Trigram index for fuzzy search
CREATE INDEX idx_transcripts_title_trgm ON transcripts USING GIN(title gin_trgm_ops);

-- ============================================================
-- Transcript Chunks Table
-- Chunked text with vector embeddings for semantic search
-- ============================================================
CREATE TABLE transcript_chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transcript_id UUID NOT NULL REFERENCES transcripts(id) ON DELETE CASCADE,
    
    -- Chunk data
    chunk_index INTEGER NOT NULL,
    chunk_text TEXT NOT NULL,
    start_char INTEGER,
    end_char INTEGER,
    
    -- Vector embedding (1536 dimensions for text-embedding-ada-002)
    embedding vector(1536),
    
    -- Metadata
    token_count INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_chunks_transcript_id ON transcript_chunks(transcript_id);
CREATE INDEX idx_chunks_chunk_index ON transcript_chunks(transcript_id, chunk_index);

-- Vector similarity index using HNSW (faster than IVFFlat for most use cases)
CREATE INDEX idx_chunks_embedding ON transcript_chunks 
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- ============================================================
-- Action Items Table
-- Extracted tasks and action items from transcripts
-- ============================================================
CREATE TABLE action_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transcript_id UUID NOT NULL REFERENCES transcripts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL, -- Owner, references andora_db.users(id)
    
    -- Action item details
    description TEXT NOT NULL,
    context TEXT, -- Surrounding text from transcript
    
    -- Assignment
    assigned_to VARCHAR(255), -- Name or email from transcript
    assigned_to_user_id UUID, -- If matched to a user
    
    -- Scheduling
    due_date DATE,
    due_date_confidence FLOAT, -- AI confidence in extracted date
    
    -- Priority and status
    priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    
    -- AI metadata
    confidence_score FLOAT, -- AI confidence in extraction
    source_text TEXT, -- Original text that generated this item
    
    -- Timestamps
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_action_items_transcript_id ON action_items(transcript_id);
CREATE INDEX idx_action_items_user_id ON action_items(user_id);
CREATE INDEX idx_action_items_status ON action_items(status);
CREATE INDEX idx_action_items_priority ON action_items(priority);
CREATE INDEX idx_action_items_due_date ON action_items(due_date);
CREATE INDEX idx_action_items_assigned_to_user ON action_items(assigned_to_user_id);

-- ============================================================
-- Processing Jobs Table
-- Track background processing tasks
-- ============================================================
CREATE TABLE processing_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transcript_id UUID REFERENCES transcripts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL, -- References andora_db.users(id)
    
    -- Job type and status
    job_type VARCHAR(50) NOT NULL CHECK (job_type IN ('transcription', 'analysis', 'embedding', 'full_pipeline')),
    status VARCHAR(20) DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'cancelled')),
    
    -- Progress tracking
    progress_percent INTEGER DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
    current_step VARCHAR(100),
    steps_completed JSONB DEFAULT '[]'::jsonb,
    
    -- Input/Output
    input_file_path TEXT,
    output_data JSONB,
    
    -- Error handling
    error_message TEXT,
    error_details JSONB,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    
    -- Timing
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_jobs_transcript_id ON processing_jobs(transcript_id);
CREATE INDEX idx_jobs_user_id ON processing_jobs(user_id);
CREATE INDEX idx_jobs_status ON processing_jobs(status);
CREATE INDEX idx_jobs_job_type ON processing_jobs(job_type);
CREATE INDEX idx_jobs_created_at ON processing_jobs(created_at DESC);

-- ============================================================
-- Search History Table
-- Track user searches for analytics
-- ============================================================
CREATE TABLE search_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL, -- References andora_db.users(id)
    
    -- Search details
    query_text TEXT NOT NULL,
    search_type VARCHAR(20) NOT NULL CHECK (search_type IN ('semantic', 'keyword', 'combined')),
    
    -- Results
    results_count INTEGER DEFAULT 0,
    result_ids UUID[] DEFAULT '{}',
    
    -- Performance
    execution_time_ms INTEGER,
    
    -- Filters applied
    filters JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_search_history_user_id ON search_history(user_id);
CREATE INDEX idx_search_history_created_at ON search_history(created_at DESC);
CREATE INDEX idx_search_history_search_type ON search_history(search_type);

-- ============================================================
-- User Preferences Table
-- Cabinet-specific user settings (supplements andora_db.users)
-- ============================================================
CREATE TABLE user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE, -- References andora_db.users(id)
    
    -- AI preferences
    preferred_ai_model VARCHAR(50) DEFAULT 'gpt-4o',
    auto_analyze BOOLEAN DEFAULT true,
    auto_extract_actions BOOLEAN DEFAULT true,
    
    -- Display preferences
    default_view VARCHAR(20) DEFAULT 'list',
    transcripts_per_page INTEGER DEFAULT 20,
    
    -- Notification settings
    notify_on_completion BOOLEAN DEFAULT true,
    email_notifications BOOLEAN DEFAULT false,
    
    -- Storage
    storage_used_bytes BIGINT DEFAULT 0,
    storage_limit_bytes BIGINT DEFAULT 5368709120, -- 5GB default
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_user_prefs_user_id ON user_preferences(user_id);

-- ============================================================
-- API Usage Table
-- Track API calls for rate limiting and billing
-- ============================================================
CREATE TABLE api_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL, -- References andora_db.users(id)
    
    -- API details
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    
    -- AI service usage
    ai_service VARCHAR(50), -- 'openai', 'anthropic'
    ai_model VARCHAR(50),
    tokens_used INTEGER,
    cost_cents INTEGER,
    
    -- Request info
    request_size_bytes INTEGER,
    response_size_bytes INTEGER,
    response_time_ms INTEGER,
    status_code INTEGER,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_api_usage_user_id ON api_usage(user_id);
CREATE INDEX idx_api_usage_created_at ON api_usage(created_at DESC);
CREATE INDEX idx_api_usage_endpoint ON api_usage(endpoint);
CREATE INDEX idx_api_usage_ai_service ON api_usage(ai_service);

-- Partition by month for efficient querying (optional, for high-volume)
-- CREATE INDEX idx_api_usage_month ON api_usage(date_trunc('month', created_at));

-- ============================================================
-- Triggers for auto-updating timestamps
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_categories_updated_at
    BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meetings_updated_at
    BEFORE UPDATE ON meetings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transcripts_updated_at
    BEFORE UPDATE ON transcripts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_action_items_updated_at
    BEFORE UPDATE ON action_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_processing_jobs_updated_at
    BEFORE UPDATE ON processing_jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Utility Functions
-- ============================================================

-- Function to calculate word count
CREATE OR REPLACE FUNCTION calculate_word_count(text_content TEXT)
RETURNS INTEGER AS $$
BEGIN
    IF text_content IS NULL OR text_content = '' THEN
        RETURN 0;
    END IF;
    RETURN array_length(regexp_split_to_array(trim(text_content), '\s+'), 1);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger to auto-calculate word count on transcript insert/update
CREATE OR REPLACE FUNCTION update_transcript_word_count()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.full_text IS DISTINCT FROM OLD.full_text THEN
        NEW.word_count = calculate_word_count(NEW.full_text);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_word_count
    BEFORE INSERT OR UPDATE ON transcripts
    FOR EACH ROW EXECUTE FUNCTION update_transcript_word_count();

-- ============================================================
-- Views for common queries
-- ============================================================

-- View: Transcripts with category info
CREATE VIEW transcripts_with_category AS
SELECT 
    t.*,
    c.name as category_name,
    c.color as category_color,
    c.icon as category_icon
FROM transcripts t
LEFT JOIN categories c ON t.category_id = c.id;

-- View: User transcript stats
CREATE VIEW user_transcript_stats AS
SELECT 
    user_id,
    COUNT(*) as total_transcripts,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_transcripts,
    COUNT(*) FILTER (WHERE status = 'processing') as processing_transcripts,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_transcripts,
    SUM(COALESCE(duration_seconds, 0)) as total_duration_seconds,
    SUM(COALESCE(word_count, 0)) as total_words,
    SUM(COALESCE(file_size_bytes, 0)) as total_file_size_bytes,
    AVG(sentiment_score) as avg_sentiment_score,
    MAX(created_at) as last_transcript_at
FROM transcripts
GROUP BY user_id;

-- View: Pending action items
CREATE VIEW pending_action_items AS
SELECT 
    ai.*,
    t.title as transcript_title
FROM action_items ai
JOIN transcripts t ON ai.transcript_id = t.id
WHERE ai.status IN ('pending', 'in_progress')
ORDER BY 
    CASE ai.priority 
        WHEN 'urgent' THEN 1 
        WHEN 'high' THEN 2 
        WHEN 'medium' THEN 3 
        WHEN 'low' THEN 4 
    END,
    ai.due_date NULLS LAST;

-- ============================================================
-- Grant permissions (adjust for your setup)
-- ============================================================
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO andora_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO andora_user;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO andora_user;

COMMENT ON TABLE transcripts IS 'Core table storing transcript data and AI analysis results';
COMMENT ON TABLE transcript_chunks IS 'Chunked text with vector embeddings for semantic search';
COMMENT ON TABLE action_items IS 'AI-extracted action items from transcripts';
COMMENT ON TABLE processing_jobs IS 'Background job tracking for async processing';
COMMENT ON TABLE categories IS 'System and user-defined categories for organization';
COMMENT ON TABLE meetings IS 'Group related transcripts together';
