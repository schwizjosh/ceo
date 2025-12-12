import React, { useState } from 'react';
import { Brand } from '../../types';
import { Button } from '../common/Button';
import { Textarea } from '../common/Textarea';
import { AndoraAvatar } from '../common/AndoraAvatar';
import { NotificationBubble } from '../common/NotificationBubble';
import { AIModelSwitcher } from '../common/AIModelSwitcher';
import { useAIModelPreference } from '../../hooks/useAIModelPreference';
import { aiService } from '../../services/aiService';
import { MessageCircle, Send, Bot, User, Sparkles } from 'lucide-react';

interface ChatPageProps {
  brand: Brand;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export const ChatPage: React.FC<ChatPageProps> = ({ brand }) => {
  const [selectedModel, setSelectedModel] = useAIModelPreference('gemini-2.5-flash');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Hello! I'm Andora, your storytelling companion for ${brand.brand_name}. I have complete awareness of your brand narrative, character cast, and strategic context. How can I help bring your story to life today?`,
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleSendMessage = async () => {
    if (!input.trim() || isGenerating) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsGenerating(true);

    try {
      // Call aiService.chatResponse with correct parameter order: message, brand, characters, model
      const response = await aiService.chatResponse(
        input.trim(),
        brand,
        brand.cast_management || [],
        selectedModel
      );

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error getting AI response:', error);
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'I apologize, but I encountered a temporary glitch in my neural pathways. Please try again, and I\'ll be right back to help you craft amazing content!',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 space-y-3 sm:space-y-4 md:space-y-6 relative floating-particles min-w-0 overflow-x-hidden">
      <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <AndoraAvatar size="lg" className="shrink-0" />
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold shimmer-text truncate">Chat with Andora</h1>
            <div className="flex items-center gap-1 sm:gap-2 mt-1">
              <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-primary-400 shrink-0" />
              <p className="text-slate-500 text-xs sm:text-sm lg:text-base truncate">Your storytelling companion for {brand.brand_name}</p>
            </div>
          </div>
        </div>
        <div className="flex-shrink-0 w-full sm:w-auto">
          <AIModelSwitcher
            value={selectedModel}
            onChange={setSelectedModel}
          />
        </div>
      </div>

      {/* Brand Context Info */}
      <div className="neural-glow p-4 rounded-lg border border-primary-500/30">
        <h3 className="font-medium text-primary-300 mb-2">My Knowledge Base:</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-4 text-sm text-slate-600">
          <div>
            <span className="font-medium">Brand Story:</span> Complete narrative framework
          </div>
          <div>
            <span className="font-medium">Characters:</span> {brand.cast_management?.length || 0} cast members
          </div>
          <div>
            <span className="font-medium">Channels:</span> {brand.channels.join(', ')}
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="glass-effect rounded-lg h-[500px] sm:h-[600px] flex flex-col border border-primary-500/20">
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex items-start space-x-2 sm:space-x-3 ${
                message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
              }`}
            >
              <div className="flex-shrink-0">
                {message.role === 'user' ? (
                  <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-r from-primary-600 to-purple-600 flex items-center justify-center">
                    <User size={16} className="text-white" />
                  </div>
                ) : (
                  <AndoraAvatar size="sm" />
                )}
              </div>
              
              <div className={`flex-1 max-w-[85%] sm:max-w-[70%] ${
                message.role === 'user' ? 'text-right' : 'text-left'
              }`}>
                <div className={`inline-block px-3 sm:px-4 py-2 sm:py-3 rounded-lg text-sm sm:text-base ${
                  message.role === 'user'
                    ? 'bg-gradient-to-r from-primary-600 to-purple-600 text-white'
                    : 'conversation-bubble text-slate-600'
                }`}>
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
                <div className="text-xs text-slate-500 mt-2">
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
          
          {isGenerating && (
            <div className="flex items-start space-x-3">
              <AndoraAvatar size="sm" animate />
              <div className="flex-1">
                <div className="inline-block px-3 sm:px-4 py-2 sm:py-3 conversation-bubble">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-accent-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Chat Input */}
        <div className="border-t border-primary-200/60 p-4">
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Ask me about content strategy, character development, seasonal themes, or anything about your brand story..."
              rows={2}
              className="flex-1 resize-none text-sm"
              disabled={isGenerating}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!input.trim() || isGenerating}
              className="flex items-center self-end sm:self-end"
              size="sm"
            >
              <Send size={16} className="mr-1" />
              <span className="hidden sm:inline">Send</span>
            </Button>
          </div>
          <p className="text-xs text-slate-500 mt-2 flex items-center justify-center sm:justify-start">
            <Sparkles size={12} className="mr-1" />
            <span className="hidden sm:inline">Press Enter to send • Shift+Enter for new line</span>
            <span className="sm:hidden">Enter to send • Shift+Enter for new line</span>
          </p>
        </div>
      </div>
    </div>
  );
};