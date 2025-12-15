import React, { useState, useEffect } from 'react';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Modal } from '../common/Modal';
import { apiClient } from '../../lib/api';
import {
  Save,
  RefreshCw,
  Edit3,
  Plus,
  Activity,
  BarChart,
  Zap,
  Clock,
  DollarSign,
  Settings,
  Brain,
  Sparkles
} from 'lucide-react';

interface AgentConfig {
  id: string;
  agentName: string;
  displayName: string;
  description?: string;
  isActive: boolean;
  defaultModel: string;
  fallbackModel?: string;
  maxTokens: number;
  temperature: number;
  capabilities: string[];
  metadata?: Record<string, any>;
}

interface AgentPrompt {
  id: string;
  agentName: string;
  promptType: string;
  promptKey: string;
  promptTemplate: string;
  variables: string[];
  version: number;
  isActive: boolean;
  notes?: string;
}

interface PerformanceAnalytics {
  totalCalls: number;
  successRate: number;
  avgExecutionTime: number;
  avgTokensUsed: number;
  totalCost: number;
  modelBreakdown: Record<string, number>;
}

// Helper function to get variable descriptions
const getVariableDescription = (variable: string): string => {
  const descriptions: Record<string, string> = {
    brandName: 'The name of the brand',
    industry: 'The industry/sector the brand operates in',
    tone: 'The desired tone of voice (e.g., professional, casual)',
    targetAudience: 'Who the content is for',
    characterName: 'Name of the brand character/persona',
    platform: 'Social media platform (e.g., Instagram, LinkedIn)',
    date: 'Current or target date',
    theme: 'Monthly or weekly theme',
    eventTitle: 'Name of the event',
    personality: 'Brand personality traits',
    voice: "Character's unique voice attributes",
    contentType: 'Type of content (post, story, video)',
    monthlyTheme: 'The overarching monthly theme',
    weeklySubplot: 'The weekly storyline',
    brandGoals: "Brand's objectives and goals",
    channels: 'Active marketing channels',
    agentCapabilities: 'List of available agent capabilities',
    availableModels: 'AI models available for use'
  };

  return descriptions[variable] || 'Custom variable';
};

export const AgentConfigTab: React.FC = () => {
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<AgentConfig | null>(null);
  const [prompts, setPrompts] = useState<AgentPrompt[]>([]);
  const [performance, setPerformance] = useState<PerformanceAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<AgentPrompt | null>(null);
  const [daysBack, setDaysBack] = useState(7);

  useEffect(() => {
    loadAgents();
  }, []);

  useEffect(() => {
    if (selectedAgent) {
      loadAgentPrompts(selectedAgent.agentName);
      loadPerformanceAnalytics(selectedAgent.agentName, daysBack);
    }
  }, [selectedAgent, daysBack]);

  const loadAgents = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/agent-config');
      setAgents(response);
      if (response.length > 0 && !selectedAgent) {
        setSelectedAgent(response[0]);
      }
    } catch (error) {
      console.error('Error loading agents:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAgentPrompts = async (agentName: string) => {
    try {
      const response = await apiClient.get(`/agent-config/${agentName}/prompts`);
      setPrompts(response);
    } catch (error) {
      console.error('Error loading prompts:', error);
    }
  };

  const loadPerformanceAnalytics = async (agentName: string, days: number) => {
    try {
      const response = await apiClient.get(`/agent-config/${agentName}/performance?daysBack=${days}`);
      setPerformance(response);
    } catch (error) {
      console.error('Error loading performance:', error);
    }
  };

  const handleSaveAgentConfig = async () => {
    if (!selectedAgent) return;

    try {
      await apiClient.put(`/agent-config/${selectedAgent.agentName}`, {
        displayName: selectedAgent.displayName,
        description: selectedAgent.description,
        isActive: selectedAgent.isActive,
        defaultModel: selectedAgent.defaultModel,
        fallbackModel: selectedAgent.fallbackModel,
        maxTokens: selectedAgent.maxTokens,
        temperature: selectedAgent.temperature,
        capabilities: selectedAgent.capabilities,
        metadata: selectedAgent.metadata
      });

      alert('Agent configuration saved successfully!');
      setIsEditModalOpen(false);
      loadAgents();
    } catch (error) {
      console.error('Error saving agent config:', error);
      alert('Failed to save agent configuration');
    }
  };

  const handleSavePrompt = async () => {
    if (!editingPrompt) return;

    try {
      await apiClient.post(`/agent-config/${editingPrompt.agentName}/prompts`, {
        promptKey: editingPrompt.promptKey,
        promptTemplate: editingPrompt.promptTemplate,
        promptType: editingPrompt.promptType,
        variables: editingPrompt.variables,
        notes: editingPrompt.notes,
        createNewVersion: false
      });

      alert('Prompt saved successfully!');
      setIsPromptModalOpen(false);
      setEditingPrompt(null);
      if (selectedAgent) {
        loadAgentPrompts(selectedAgent.agentName);
      }
    } catch (error) {
      console.error('Error saving prompt:', error);
      alert('Failed to save prompt');
    }
  };

  const handleClearCache = async () => {
    try {
      await apiClient.post('/agent-config/cache/clear');
      alert('All caches cleared successfully!');
    } catch (error) {
      console.error('Error clearing cache:', error);
      alert('Failed to clear caches');
    }
  };

  // Get default agent descriptions
  const getDefaultAgentDescription = (agentName: string): string => {
    const descriptions: Record<string, string> = {
      orchestrator: 'Master agent that coordinates all other agents and routes tasks to specialist agents based on complexity and capabilities. Handles multi-step workflows and ensures consistency across generated content.',
      sceneWriter: 'Specialized agent for writing engaging daily content scenes. Creates narratives from character perspectives, follows weekly subplots and monthly themes, and adapts tone for different platforms.',
      subplotWriter: 'Generates compelling weekly subplots and narrative arcs. Incorporates events and cultural moments to create story hooks that span multiple days while advancing monthly themes.',
      themeGenerator: 'Creates monthly themes and overarching narratives aligned with brand strategy. Develops compelling narratives that resonate with target audience and support brand goals.',
      eventAnalyzer: 'Analyzes events and generates creative content hooks. Identifies relevant events for brand storytelling and optimizes calendar planning based on event significance and audience appeal.',
      characterGenerator: 'Generates brand characters and personas. Creates diverse character profiles with unique personalities, voices, and perspectives that align with brand identity.',
      calendarGenerator: 'Plans and generates content calendars. Distributes content across channels and dates while balancing themes, events, and narrative arcs.',
      weeklyDistribution: 'Distributes weekly content across days and platforms. Ensures optimal posting schedule and balances content types for maximum engagement.',
      seasonPlot: 'Creates seasonal narrative arcs and long-term storylines. Plans multi-month story progressions that align with brand evolution and market trends.'
    };

    return descriptions[agentName] || 'AI agent for automated content generation and brand storytelling tasks.';
  };

  // Get default prompt template based on agent type
  const getDefaultPromptTemplate = (agentName: string, promptType: string): string => {
    const defaults: Record<string, Record<string, string>> = {
      orchestrator: {
        system: `You are the Orchestrator Agent, responsible for coordinating AI agents to generate brand content.

Your responsibilities:
1. Analyze incoming requests and determine which specialist agent(s) to use
2. Gather minimal required context from the Brand Context Engine
3. Route tasks to appropriate agents based on complexity and capabilities
4. Coordinate multi-step workflows
5. Ensure consistency across all generated content

Brand: {{brandName}}
Available Agents: {{agentCapabilities}}
Available Models: {{availableModels}}`,
        user: `Task: {{taskDescription}}

Context:
- Brand: {{brandName}}
- Industry: {{industry}}
- Target Audience: {{targetAudience}}

Please analyze this request and determine the best approach.`
      },
      sceneWriter: {
        system: `You are the Scene Writer Agent, specialized in creating engaging daily content.

Your mission:
- Write content that embodies the brand voice and personality
- Follow the weekly subplot and monthly theme
- Create narratives from character perspectives
- Adapt tone and style for different platforms

Brand Voice: {{brandVoice}}
Character: {{characterName}}
Platform: {{platform}}
Content Type: {{contentType}}`,
        user: `Create content for:

Date: {{date}}
Theme: {{monthlyTheme}}
Subplot: {{weeklySubplot}}
Event: {{eventTitle}}

Character Perspective: {{characterName}}
Platform: {{platform}}
Tone: {{tone}}

Generate engaging content that follows the theme and subplot while incorporating the event.`
      },
      subplotWriter: {
        system: `You are the Subplot Writer Agent, responsible for creating weekly narrative arcs.

Your responsibilities:
- Generate compelling weekly subplots that advance monthly themes
- Incorporate events and cultural moments
- Create story hooks that span multiple days
- Ensure narrative coherence and progression

Monthly Theme: {{monthlyTheme}}
Brand: {{brandName}}
Events: {{events}}`,
        user: `Generate a weekly subplot for:

Week: {{weekNumber}}
Monthly Theme: {{monthlyTheme}}
Key Events: {{events}}
Brand Goals: {{brandGoals}}

Create a narrative arc that ties events together and advances the monthly theme.`
      },
      themeGenerator: {
        system: `You are the Theme Generator Agent, creating monthly themes and overarching narratives.

Your mission:
- Develop compelling monthly themes aligned with brand strategy
- Create narratives that resonate with target audience
- Consider seasonal trends and cultural moments
- Ensure themes support brand goals

Brand: {{brandName}}
Industry: {{industry}}
Personality: {{personality}}`,
        user: `Generate a monthly theme for:

Month: {{month}}
Brand Goals: {{brandGoals}}
Target Audience: {{targetAudience}}
Key Events: {{events}}

Create a compelling theme that aligns with brand strategy and resonates with the audience.`
      },
      eventAnalyzer: {
        system: `You are the Event Analyzer Agent, analyzing events and generating content hooks.

Your capabilities:
- Identify relevant events for brand storytelling
- Generate creative content hooks from events
- Analyze event significance and audience appeal
- Optimize calendar planning

Brand: {{brandName}}
Industry: {{industry}}`,
        user: `Analyze these events and generate content hooks:

Events: {{events}}
Brand: {{brandName}}
Target Audience: {{targetAudience}}
Channels: {{channels}}

Provide content ideas and recommendations.`
      },
      characterGenerator: {
        system: `You are the Character Generator Agent, creating brand characters and personas.

Your mission:
- Generate diverse character profiles that embody brand values
- Create unique personalities, voices, and perspectives
- Ensure characters align with brand identity and target audience
- Develop memorable, relatable personas for storytelling

Brand: {{brandName}}
Industry: {{industry}}
Personality: {{personality}}`,
        user: `Generate brand characters for:

Brand: {{brandName}}
Industry: {{industry}}
Target Audience: {{targetAudience}}
Brand Personality: {{personality}}
Number of Characters: {{characterCount}}

Create diverse, engaging characters that can tell the brand story from different perspectives.`
      },
      calendarGenerator: {
        system: `You are the Calendar Generator Agent, planning content distribution.

Your responsibilities:
- Create balanced content calendars across channels
- Distribute themes, subplots, and events optimally
- Ensure consistent posting schedule
- Balance content types and formats

Brand: {{brandName}}
Channels: {{channels}}`,
        user: `Generate a content calendar for:

Month: {{month}}
Channels: {{channels}}
Monthly Theme: {{monthlyTheme}}
Key Events: {{events}}
Posting Frequency: {{frequency}}

Create an optimized posting schedule that maximizes engagement.`
      },
      weeklyDistribution: {
        system: `You are the Weekly Distribution Agent, scheduling content across days.

Your mission:
- Distribute weekly content across optimal posting times
- Balance content types (educational, entertaining, promotional)
- Ensure narrative flow throughout the week
- Maximize audience engagement

Weekly Subplot: {{weeklySubplot}}
Platforms: {{platforms}}`,
        user: `Distribute content for this week:

Week: {{weekNumber}}
Subplot: {{weeklySubplot}}
Events: {{events}}
Platforms: {{platforms}}
Brand: {{brandName}}

Create a posting schedule that tells a cohesive weekly story.`
      },
      seasonPlot: {
        system: `You are the Season Plot Agent, creating long-term narrative arcs.

Your capabilities:
- Design multi-month story progressions
- Plan seasonal themes and transitions
- Align narratives with brand evolution
- Consider market trends and audience needs

Brand: {{brandName}}
Industry: {{industry}}`,
        user: `Create a seasonal plot for:

Season/Quarter: {{season}}
Brand Goals: {{brandGoals}}
Market Trends: {{trends}}
Previous Season Summary: {{previousSeason}}

Develop a compelling multi-month narrative arc.`
      }
    };

    return defaults[agentName]?.[promptType] || `You are an AI assistant for {{brandName}}.

Your task: {{taskDescription}}

Brand Context:
- Industry: {{industry}}
- Target Audience: {{targetAudience}}
- Tone: {{tone}}

Provide helpful, brand-aligned output.`;
  };

  const modelOptions = [
    'gpt-4o',
    'gpt-4o-mini',
    'gpt-5',
    'claude-sonnet-4',
    'claude-sonnet-4.5',
    'claude-opus-4',
    'claude-haiku-3.5'
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl sm:text-2xl font-bold text-primary-900">Agent Configuration</h2>
        <div className="flex items-center space-x-2">
          <Button onClick={handleClearCache} size="sm" variant="outline">
            <RefreshCw size={16} className="mr-2" />
            Clear Caches
          </Button>
          <Button onClick={loadAgents} loading={loading} size="sm">
            <RefreshCw size={16} className="mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agent List */}
        <div className="glass-effect p-6 rounded-lg border border-primary-500/20">
          <h3 className="text-lg font-semibold text-primary-900 mb-4">AI Agents</h3>
          <div className="space-y-2">
            {agents.map((agent) => (
              <button
                key={agent.id}
                onClick={() => setSelectedAgent(agent)}
                className={`w-full text-left p-3 rounded-lg transition-all ${
                  selectedAgent?.id === agent.id
                    ? 'bg-gradient-to-r from-primary-600 to-purple-600 text-white'
                    : 'bg-white/60 hover:bg-white/80 text-primary-900'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{agent.displayName}</div>
                    <div className="text-xs opacity-80">{agent.agentName}</div>
                  </div>
                  {!agent.isActive && (
                    <span className="text-xs px-2 py-1 bg-red-500/20 rounded">Disabled</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Agent Details */}
        {selectedAgent && (
          <div className="lg:col-span-2 space-y-6">
            {/* Configuration */}
            <div className="glass-effect p-6 rounded-lg border border-primary-500/20">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-primary-900">Configuration</h3>
                <Button
                  size="sm"
                  onClick={() => setIsEditModalOpen(true)}
                >
                  <Edit3 size={16} className="mr-2" />
                  Edit
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-500">Status:</span>
                  <span className={`ml-2 font-medium ${selectedAgent.isActive ? 'text-green-600' : 'text-red-600'}`}>
                    {selectedAgent.isActive ? 'Active' : 'Disabled'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Default Model:</span>
                  <span className="ml-2 font-medium text-primary-900">{selectedAgent.defaultModel}</span>
                </div>
                <div>
                  <span className="text-slate-500">Fallback Model:</span>
                  <span className="ml-2 font-medium text-primary-900">{selectedAgent.fallbackModel || 'None'}</span>
                </div>
                <div>
                  <span className="text-slate-500">Max Tokens:</span>
                  <span className="ml-2 font-medium text-primary-900">{selectedAgent.maxTokens}</span>
                </div>
                <div>
                  <span className="text-slate-500">Temperature:</span>
                  <span className="ml-2 font-medium text-primary-900">{selectedAgent.temperature}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500">Capabilities:</span>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedAgent.capabilities.map((cap, index) => (
                      <span key={index} className="px-2 py-1 bg-primary-100 text-primary-800 rounded text-xs">
                        {cap}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {selectedAgent.description && (
                <p className="mt-4 text-sm text-slate-600 italic">{selectedAgent.description}</p>
              )}
            </div>

            {/* Performance Analytics */}
            {performance && (
              <div className="glass-effect p-6 rounded-lg border border-primary-500/20">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-primary-900">Performance Analytics</h3>
                  <select
                    value={daysBack}
                    onChange={(e) => setDaysBack(parseInt(e.target.value))}
                    className="px-3 py-1 glass-effect rounded text-sm"
                  >
                    <option value="7">Last 7 days</option>
                    <option value="30">Last 30 days</option>
                    <option value="90">Last 90 days</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="glass-effect p-4 rounded border border-primary-200/40">
                    <div className="flex items-center space-x-2 mb-2">
                      <Activity className="w-4 h-4 text-primary-600" />
                      <span className="text-xs text-slate-500">Total Calls</span>
                    </div>
                    <div className="text-xl font-bold text-primary-900">{performance.totalCalls}</div>
                  </div>

                  <div className="glass-effect p-4 rounded border border-green-200/40">
                    <div className="flex items-center space-x-2 mb-2">
                      <BarChart className="w-4 h-4 text-green-600" />
                      <span className="text-xs text-slate-500">Success Rate</span>
                    </div>
                    <div className="text-xl font-bold text-green-900">
                      {(performance.successRate * 100).toFixed(1)}%
                    </div>
                  </div>

                  <div className="glass-effect p-4 rounded border border-accent-200/40">
                    <div className="flex items-center space-x-2 mb-2">
                      <Clock className="w-4 h-4 text-accent-600" />
                      <span className="text-xs text-slate-500">Avg Time</span>
                    </div>
                    <div className="text-xl font-bold text-accent-900">
                      {performance.avgExecutionTime.toFixed(0)}ms
                    </div>
                  </div>

                  <div className="glass-effect p-4 rounded border border-purple-200/40">
                    <div className="flex items-center space-x-2 mb-2">
                      <DollarSign className="w-4 h-4 text-purple-600" />
                      <span className="text-xs text-slate-500">Total Cost</span>
                    </div>
                    <div className="text-xl font-bold text-purple-900">
                      ${performance.totalCost.toFixed(4)}
                    </div>
                  </div>
                </div>

                {Object.keys(performance.modelBreakdown).length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-slate-600 mb-2">Model Usage</h4>
                    <div className="space-y-2">
                      {Object.entries(performance.modelBreakdown).map(([model, count]) => (
                        <div key={model} className="flex items-center justify-between text-sm">
                          <span className="text-primary-800">{model}</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-32 h-2 bg-white/40 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-primary-500 to-purple-500"
                                style={{ width: `${(count / performance.totalCalls) * 100}%` }}
                              />
                            </div>
                            <span className="text-slate-500 w-12 text-right">{count}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Prompts */}
            <div className="glass-effect p-6 rounded-lg border border-primary-500/20">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-primary-900">Prompts</h3>
                <Button
                  size="sm"
                  onClick={() => {
                    const defaultTemplate = getDefaultPromptTemplate(selectedAgent.agentName, 'system');
                    // Auto-detect variables from default template
                    const matches = defaultTemplate.match(/\{\{([^}]+)\}\}/g);
                    const detectedVars = matches
                      ? [...new Set(matches.map(m => m.replace(/[{}]/g, '').trim()))]
                      : [];

                    setEditingPrompt({
                      id: '',
                      agentName: selectedAgent.agentName,
                      promptType: 'system',
                      promptKey: '',
                      promptTemplate: defaultTemplate,
                      variables: detectedVars,
                      version: 1,
                      isActive: true
                    });
                    setIsPromptModalOpen(true);
                  }}
                >
                  <Plus size={16} className="mr-2" />
                  Add Prompt
                </Button>
              </div>

              <div className="space-y-3">
                {prompts.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-4">No prompts configured</p>
                ) : (
                  prompts.map((prompt) => (
                    <div key={prompt.id} className="glass-effect p-4 rounded border border-primary-200/40">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h4 className="font-medium text-primary-900">{prompt.promptKey}</h4>
                            <span className="text-xs text-slate-500">v{prompt.version}</span>
                            <span className="text-xs px-2 py-0.5 bg-primary-100 text-primary-800 rounded">
                              {prompt.promptType}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 line-clamp-2">{prompt.promptTemplate}</p>
                          {prompt.variables.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {prompt.variables.map((v, i) => (
                                <span key={i} className="text-xs px-1.5 py-0.5 bg-accent-100 text-accent-800 rounded font-mono">
                                  {`{{${v}}}`}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingPrompt(prompt);
                            setIsPromptModalOpen(true);
                          }}
                        >
                          <Edit3 size={14} />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Edit Agent Config Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Agent Configuration"
        size="lg"
      >
        {selectedAgent && (
          <div className="space-y-5">
            {/* Info Banner */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-slate-800 mb-2 flex items-center">
                <Settings className="w-4 h-4 mr-2 text-blue-600" />
                Agent Settings
              </h4>
              <p className="text-xs text-slate-600">
                Configure how this AI agent behaves. Changes take effect immediately for new requests.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Display Name
              </label>
              <Input
                value={selectedAgent.displayName}
                onChange={(e) => setSelectedAgent({ ...selectedAgent, displayName: e.target.value })}
                placeholder="e.g., Scene Writer Agent"
              />
              <p className="text-xs text-slate-500 mt-1">Friendly name shown in the interface</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
              <textarea
                value={selectedAgent.description || getDefaultAgentDescription(selectedAgent.agentName)}
                onChange={(e) => setSelectedAgent({ ...selectedAgent, description: e.target.value })}
                className="w-full px-3 py-2 glass-effect rounded-lg text-primary-900 focus:outline-none focus:ring-2 focus:ring-primary-500 border border-primary-200"
                rows={3}
                placeholder={getDefaultAgentDescription(selectedAgent.agentName)}
              />
              <p className="text-xs text-slate-500 mt-1">Help others understand this agent's purpose and capabilities</p>
            </div>

            <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-4">
              <h4 className="font-semibold text-slate-800 mb-3 flex items-center">
                <Brain className="w-4 h-4 mr-2 text-purple-600" />
                AI Model Configuration
              </h4>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Default Model <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedAgent.defaultModel}
                    onChange={(e) => setSelectedAgent({ ...selectedAgent, defaultModel: e.target.value })}
                    className="w-full px-3 py-2 glass-effect rounded-lg border border-purple-200 focus:border-purple-500"
                  >
                    {modelOptions.map((model) => (
                      <option key={model} value={model}>{model}</option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-600 mt-1">
                    💡 <strong>gpt-4o</strong> = balanced, <strong>gpt-4o-mini</strong> = fast/cheap
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Fallback Model
                  </label>
                  <select
                    value={selectedAgent.fallbackModel || ''}
                    onChange={(e) => setSelectedAgent({ ...selectedAgent, fallbackModel: e.target.value || undefined })}
                    className="w-full px-3 py-2 glass-effect rounded-lg border border-purple-200 focus:border-purple-500"
                  >
                    <option value="">None</option>
                    {modelOptions.map((model) => (
                      <option key={model} value={model}>{model}</option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-600 mt-1">Used if default model fails</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-4">
              <h4 className="font-semibold text-slate-800 mb-3 flex items-center">
                <Zap className="w-4 h-4 mr-2 text-amber-600" />
                Performance Settings
              </h4>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Max Tokens
                  </label>
                  <Input
                    type="number"
                    value={selectedAgent.maxTokens}
                    onChange={(e) => setSelectedAgent({ ...selectedAgent, maxTokens: parseInt(e.target.value) || 0 })}
                    min="100"
                    max="200000"
                    step="100"
                  />
                  <p className="text-xs text-slate-600 mt-1">
                    Maximum length of AI response (~4 chars = 1 token)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Temperature
                  </label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="2"
                    value={selectedAgent.temperature}
                    onChange={(e) => setSelectedAgent({ ...selectedAgent, temperature: parseFloat(e.target.value) || 0 })}
                  />
                  <p className="text-xs text-slate-600 mt-1">
                    <strong>0 = focused</strong>, <strong>1 = balanced</strong>, <strong>2 = creative</strong>
                  </p>
                </div>
              </div>
            </div>

            <label className="flex items-center space-x-3 p-3 bg-green-50 border border-green-200 rounded-lg">
              <input
                type="checkbox"
                checked={selectedAgent.isActive}
                onChange={(e) => setSelectedAgent({ ...selectedAgent, isActive: e.target.checked })}
                className="rounded border-green-300 bg-white text-green-600 focus:ring-green-500 w-5 h-5"
              />
              <div>
                <span className="text-sm font-medium text-slate-800">Agent is Active</span>
                <p className="text-xs text-slate-600">Enable this agent to handle requests</p>
              </div>
            </label>

            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button variant="ghost" onClick={() => setIsEditModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveAgentConfig}>
                <Save size={16} className="mr-2" />
                Save Configuration
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Prompt Modal */}
      <Modal
        isOpen={isPromptModalOpen}
        onClose={() => {
          setIsPromptModalOpen(false);
          setEditingPrompt(null);
        }}
        title={editingPrompt?.id ? 'Edit Prompt' : 'Add New Prompt'}
        size="xl"
      >
        {editingPrompt && (
          <div className="space-y-6">
            {/* Info Banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2">📝 How Prompts Work</h4>
              <p className="text-sm text-blue-800 mb-2">
                Prompts are instructions sent to AI models. Use <code className="px-1.5 py-0.5 bg-blue-100 rounded text-xs">{'{{variableName}}'}</code> to insert dynamic content.
              </p>
              <p className="text-xs text-blue-700">
                <strong>Example:</strong> "Generate content for <code className="px-1 bg-blue-100 rounded">{'{{brandName}}'}</code> in the <code className="px-1 bg-blue-100 rounded">{'{{industry}}'}</code> industry."
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Prompt Key <span className="text-red-500">*</span>
                </label>
                <Input
                  value={editingPrompt.promptKey}
                  onChange={(e) => setEditingPrompt({ ...editingPrompt, promptKey: e.target.value })}
                  placeholder="e.g., system_prompt, scene_instruction"
                  disabled={!!editingPrompt.id}
                />
                <p className="text-xs text-slate-500 mt-1">Unique identifier for this prompt</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Prompt Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={editingPrompt.promptType}
                  onChange={(e) => {
                    const newType = e.target.value;
                    // If creating a new prompt (no ID) and template is still default, update it
                    if (!editingPrompt.id || !editingPrompt.promptTemplate) {
                      const newTemplate = getDefaultPromptTemplate(editingPrompt.agentName, newType);
                      const matches = newTemplate.match(/\{\{([^}]+)\}\}/g);
                      const detectedVars = matches
                        ? [...new Set(matches.map(m => m.replace(/[{}]/g, '').trim()))]
                        : [];
                      setEditingPrompt({
                        ...editingPrompt,
                        promptType: newType,
                        promptTemplate: newTemplate,
                        variables: detectedVars
                      });
                    } else {
                      setEditingPrompt({ ...editingPrompt, promptType: newType });
                    }
                  }}
                  className="w-full px-3 py-2 glass-effect rounded-lg border border-primary-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
                >
                  <option value="system">System - Sets AI behavior/role</option>
                  <option value="user">User - Main task instruction</option>
                  <option value="custom">Custom - Special purpose</option>
                </select>
                <p className="text-xs text-slate-500 mt-1">How the prompt is used. Changing this will load a template example.</p>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-slate-700">
                  Prompt Template <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      const defaultTemplate = getDefaultPromptTemplate(editingPrompt.agentName, editingPrompt.promptType);
                      const matches = defaultTemplate.match(/\{\{([^}]+)\}\}/g);
                      const detectedVars = matches
                        ? [...new Set(matches.map(m => m.replace(/[{}]/g, '').trim()))]
                        : [];
                      setEditingPrompt({
                        ...editingPrompt,
                        promptTemplate: defaultTemplate,
                        variables: detectedVars
                      });
                    }}
                    className="text-xs px-2 py-1 bg-primary-100 hover:bg-primary-200 text-primary-700 rounded transition-colors"
                  >
                    Load Default Template
                  </button>
                  <span className="text-xs text-slate-500">
                    {editingPrompt.promptTemplate.length} characters
                  </span>
                </div>
              </div>
              <div className="relative">
                <textarea
                  value={editingPrompt.promptTemplate}
                  onChange={(e) => {
                    setEditingPrompt({ ...editingPrompt, promptTemplate: e.target.value });
                    // Auto-detect variables
                    const matches = e.target.value.match(/\{\{([^}]+)\}\}/g);
                    if (matches) {
                      const detectedVars = matches.map(m => m.replace(/[{}]/g, '').trim());
                      const uniqueVars = [...new Set(detectedVars)];
                      setEditingPrompt({
                        ...editingPrompt,
                        promptTemplate: e.target.value,
                        variables: uniqueVars
                      });
                    }
                  }}
                  className="w-full px-4 py-3 glass-effect rounded-lg text-primary-900 focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono text-sm border border-primary-200"
                  rows={12}
                  placeholder="You are an AI assistant helping with {{taskType}}.&#10;&#10;Brand: {{brandName}}&#10;Industry: {{industry}}&#10;Tone: {{tone}}&#10;&#10;Your task: {{userRequest}}"
                />
                <div className="absolute top-2 right-2 bg-white/80 backdrop-blur-sm px-2 py-1 rounded text-xs text-slate-600">
                  Use {'{{variable}}'} for dynamic content
                </div>
              </div>
              <p className="text-xs text-slate-600 mt-2">
                💡 <strong>Tip:</strong> Variables are automatically detected! Type <code className="px-1 bg-slate-100 rounded">{'{{variableName}}'}</code> and it will be added to the list below.
              </p>
            </div>

            {/* Variables Section */}
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-slate-800 flex items-center">
                  <Sparkles className="w-4 h-4 mr-2 text-purple-600" />
                  Variables Found in Prompt
                </h4>
                <span className="text-xs px-2 py-1 bg-purple-100 text-purple-800 rounded">
                  {editingPrompt.variables.length} variable{editingPrompt.variables.length !== 1 ? 's' : ''}
                </span>
              </div>

              {editingPrompt.variables.length > 0 ? (
                <div className="space-y-2">
                  {editingPrompt.variables.map((variable, index) => (
                    <div key={index} className="flex items-center justify-between bg-white rounded px-3 py-2 border border-purple-200">
                      <div className="flex items-center space-x-2">
                        <code className="text-sm font-mono text-purple-700 bg-purple-50 px-2 py-1 rounded">
                          {'{{' + variable + '}}'}
                        </code>
                        <span className="text-xs text-slate-600">
                          {getVariableDescription(variable)}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          const newVars = editingPrompt.variables.filter((_, i) => i !== index);
                          setEditingPrompt({ ...editingPrompt, variables: newVars });
                        }}
                        className="text-red-500 hover:text-red-700 text-xs"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-slate-500 text-sm">
                  No variables detected. Add {'{{variableName}}'} to your prompt template above.
                </div>
              )}

              <div className="mt-3 pt-3 border-t border-purple-200">
                <p className="text-xs text-slate-600 mb-2">
                  <strong>Common variables you can use:</strong>
                </p>
                <div className="flex flex-wrap gap-2">
                  {['brandName', 'industry', 'tone', 'targetAudience', 'characterName', 'platform', 'date', 'theme', 'eventTitle'].map((common) => (
                    <button
                      key={common}
                      onClick={() => {
                        const cursorPos = document.querySelector('textarea')?.selectionStart || editingPrompt.promptTemplate.length;
                        const before = editingPrompt.promptTemplate.substring(0, cursorPos);
                        const after = editingPrompt.promptTemplate.substring(cursorPos);
                        const newTemplate = before + `{{${common}}}` + after;
                        setEditingPrompt({
                          ...editingPrompt,
                          promptTemplate: newTemplate,
                          variables: [...new Set([...editingPrompt.variables, common])]
                        });
                      }}
                      className="text-xs px-2 py-1 bg-white border border-purple-200 text-purple-700 hover:bg-purple-50 rounded transition-colors"
                    >
                      + {common}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Notes (Optional)
              </label>
              <textarea
                value={editingPrompt.notes || ''}
                onChange={(e) => setEditingPrompt({ ...editingPrompt, notes: e.target.value })}
                className="w-full px-3 py-2 glass-effect rounded-lg text-primary-900 focus:outline-none focus:ring-2 focus:ring-primary-500 border border-primary-200"
                rows={2}
                placeholder="Add any notes about when to use this prompt or how it works..."
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button variant="ghost" onClick={() => {
                setIsPromptModalOpen(false);
                setEditingPrompt(null);
              }}>
                Cancel
              </Button>
              <Button
                onClick={handleSavePrompt}
                disabled={!editingPrompt.promptKey || !editingPrompt.promptTemplate}
              >
                <Save size={16} className="mr-2" />
                Save Prompt
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
