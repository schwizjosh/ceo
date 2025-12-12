-- Migration: Agent Configuration System
-- This allows admin users to configure all aspects of the multi-agent system

-- Agent Configurations Table
CREATE TABLE IF NOT EXISTS agent_configurations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_name VARCHAR(100) NOT NULL UNIQUE, -- orchestrator, sceneWriter, subplotWriter, etc.
    display_name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    default_model VARCHAR(50) NOT NULL, -- gpt-4o, gpt-4o-mini, claude-sonnet-4, etc.
    fallback_model VARCHAR(50),
    max_tokens INTEGER DEFAULT 4000,
    temperature DECIMAL(3,2) DEFAULT 0.7,
    capabilities JSONB DEFAULT '[]'::jsonb, -- array of capability strings
    metadata JSONB DEFAULT '{}'::jsonb, -- additional configuration
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Agent Prompts Table (supports versioning and A/B testing)
CREATE TABLE IF NOT EXISTS agent_prompts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_name VARCHAR(100) NOT NULL REFERENCES agent_configurations(agent_name) ON DELETE CASCADE,
    prompt_type VARCHAR(100) NOT NULL, -- system, user, scene_writing, subplot_generation, etc.
    prompt_key VARCHAR(100) NOT NULL, -- unique identifier for this prompt
    prompt_template TEXT NOT NULL,
    variables JSONB DEFAULT '[]'::jsonb, -- array of variable names used in template
    version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(agent_name, prompt_key, version)
);

-- Agent Performance Metrics (tracking for optimization)
CREATE TABLE IF NOT EXISTS agent_performance_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_name VARCHAR(100) NOT NULL REFERENCES agent_configurations(agent_name) ON DELETE CASCADE,
    model_used VARCHAR(50) NOT NULL,
    task_type VARCHAR(100),
    tokens_used INTEGER,
    execution_time_ms INTEGER,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    quality_score DECIMAL(3,2), -- optional user feedback 0-1
    cost_estimate DECIMAL(10,6), -- estimated cost in USD
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Event Calendar Cache (for quick access and subplot generation)
CREATE TABLE IF NOT EXISTS event_calendar_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    cache_key VARCHAR(255) NOT NULL, -- e.g., "events_2025_01" for monthly cache
    events_data JSONB NOT NULL,
    subplot_suggestions JSONB, -- AI-generated subplot ideas based on events
    generated_by VARCHAR(100), -- agent name that generated this
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(brand_id, cache_key)
);

-- Indexes for performance
CREATE INDEX idx_agent_prompts_active ON agent_prompts(agent_name, is_active) WHERE is_active = true;
CREATE INDEX idx_agent_performance_agent_model ON agent_performance_metrics(agent_name, model_used, created_at);
CREATE INDEX idx_event_cache_brand ON event_calendar_cache(brand_id, cache_key);
CREATE INDEX idx_event_cache_expires ON event_calendar_cache(expires_at);

-- Insert default agent configurations
INSERT INTO agent_configurations (agent_name, display_name, description, default_model, fallback_model, max_tokens, temperature, capabilities) VALUES
('orchestrator', 'Orchestrator Agent', 'Master agent that coordinates all other agents and routes tasks', 'gpt-4o-mini', 'gpt-4o', 2000, 0.3, '["task_routing", "context_assembly", "agent_coordination"]'::jsonb),
('sceneWriter', 'Scene Writer Agent', 'Specialized agent for writing daily content scenes', 'gpt-4o', 'claude-sonnet-4', 4000, 0.8, '["content_writing", "brand_voice", "storytelling"]'::jsonb),
('subplotWriter', 'Subplot Writer Agent', 'Generates weekly subplots and narrative arcs', 'gpt-4o', 'claude-sonnet-4', 3000, 0.7, '["narrative_planning", "story_arcs", "theme_development"]'::jsonb),
('themeGenerator', 'Theme Generator Agent', 'Creates monthly themes and overarching narratives', 'gpt-4o', 'claude-sonnet-4', 3000, 0.7, '["theme_creation", "strategic_planning", "brand_alignment"]'::jsonb),
('eventAnalyzer', 'Event Analyzer Agent', 'Analyzes events and generates content hooks', 'gpt-4o-mini', 'gpt-4o', 2000, 0.5, '["event_analysis", "content_hooks", "calendar_optimization"]'::jsonb)
ON CONFLICT (agent_name) DO NOTHING;

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_agent_configurations_updated_at BEFORE UPDATE ON agent_configurations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_prompts_updated_at BEFORE UPDATE ON agent_prompts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_event_calendar_cache_updated_at BEFORE UPDATE ON event_calendar_cache
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default prompts for orchestrator
INSERT INTO agent_prompts (agent_name, prompt_type, prompt_key, prompt_template, variables) VALUES
('orchestrator', 'system', 'orchestrator_system',
'You are the Orchestrator Agent, responsible for coordinating AI agents to generate brand content.

Your responsibilities:
1. Analyze incoming requests and determine which specialist agent(s) to use
2. Gather minimal required context from the Brand Context Engine
3. Route tasks to appropriate agents based on complexity and capabilities
4. Coordinate multi-step workflows
5. Ensure consistency across all generated content

Available variables: {{agentCapabilities}}, {{availableModels}}',
'["agentCapabilities", "availableModels"]'::jsonb),

('sceneWriter', 'system', 'scene_writer_system',
'You are the Scene Writer Agent, specialized in creating engaging daily content.

Your mission:
- Write content that embodies the brand voice and personality
- Follow the weekly subplot and monthly theme
- Create narratives from character perspectives
- Adapt tone and style for different platforms

Available variables: {{brandVoice}}, {{characterName}}, {{platform}}, {{contentType}}',
'["brandVoice", "characterName", "platform", "contentType"]'::jsonb),

('subplotWriter', 'system', 'subplot_writer_system',
'You are the Subplot Writer Agent, responsible for creating weekly narrative arcs.

Your responsibilities:
- Generate compelling weekly subplots that advance monthly themes
- Incorporate events and cultural moments
- Create story hooks that span multiple days
- Ensure narrative coherence and progression

Available variables: {{monthlyTheme}}, {{events}}, {{brandGoals}}',
'["monthlyTheme", "events", "brandGoals"]'::jsonb)
ON CONFLICT (agent_name, prompt_key, version) DO NOTHING;
