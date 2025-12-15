import React, { useState } from 'react';
import { Character } from '../../types';
import { Input } from '../common/Input';
import { Textarea } from '../common/Textarea';
import { Button } from '../common/Button';
import { Check, X, Edit3, Star, Sparkles, ChevronDown, ChevronUp, Volume2, VolumeX } from 'lucide-react';
import { cn } from '../../utils/cn';

interface CharacterCardProps {
  character: Character;
  onUpdate: (updates: Partial<Character>) => void;
  onDelete: () => void;
  onAIHelp?: (character: Character) => void;
  onToggleMute?: () => void;
}

export const CharacterCard: React.FC<CharacterCardProps> = ({
  character,
  onUpdate,
  onDelete,
  onAIHelp,
  onToggleMute
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(character);
  const [isExpanded, setIsExpanded] = useState(!character.isPerfect); // Collapse perfect characters by default

  const handleSave = () => {
    onUpdate(editData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditData(character);
    setIsEditing(false);
  };

  const togglePerfect = () => {
    onUpdate({ isPerfect: !character.isPerfect });
  };

  const handleAIHelpClick = () => {
    if (onAIHelp) {
      onAIHelp(editData);
    }
  };

  return (
    <div className={cn(
      'glass-effect border-2 rounded-lg transition-all duration-200',
      character.is_muted
        ? 'border-slate-300/50 bg-slate-100/30 opacity-60'
        : character.isPerfect
        ? 'border-green-400/50 bg-green-500/10'
        : 'border-primary-200/60 hover:border-primary-400/50'
    )}>
      {/* Header - Always Visible */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3 flex-1">
          <button
            onClick={togglePerfect}
            className={cn(
              'p-1 rounded-full transition-all duration-200',
              character.isPerfect
                ? 'text-green-400 hover:bg-green-500/20'
                : 'text-slate-500 hover:text-yellow-400 hover:bg-yellow-500/20'
            )}
            title={character.isPerfect ? 'Mark as imperfect' : 'Mark as perfect'}
          >
            <Star size={16} className={character.isPerfect ? 'fill-current' : ''} />
          </button>

          {onToggleMute && (
            <button
              onClick={onToggleMute}
              className={cn(
                'p-1 rounded-full transition-all duration-200',
                character.is_muted
                  ? 'text-slate-400 hover:bg-slate-500/20'
                  : 'text-slate-500 hover:text-slate-600 hover:bg-slate-500/20'
              )}
              title={character.is_muted ? 'Include in story' : 'Exclude from story'}
            >
              {character.is_muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
          )}

          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className={cn(
                "font-semibold",
                character.is_muted ? "text-slate-500" : "text-slate-900"
              )}>
                {character.real_name || character.business_role}
              </h3>
              {character.isPerfect && (
                <span className="text-xs text-green-600 font-medium bg-green-100 px-2 py-0.5 rounded-full">Perfect</span>
              )}
              {character.is_muted && (
                <span className="text-xs text-slate-600 font-medium bg-slate-200 px-2 py-0.5 rounded-full">Muted</span>
              )}
            </div>
            {!isExpanded && (
              <p className="text-xs text-slate-500 mt-0.5">{character.business_role}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          {character.isPerfect && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 text-slate-500 hover:text-primary-600 transition-colors"
              title={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
          )}
          <button
            onClick={() => {
              setIsEditing(!isEditing);
              if (!isExpanded) setIsExpanded(true);
            }}
            className="p-1 text-slate-500 hover:text-primary-800 transition-colors"
          >
            <Edit3 size={16} />
          </button>
          <button
            onClick={onDelete}
            className="p-1 text-slate-500 hover:text-red-400 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Collapsible Content */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-slate-200/50 pt-3">
          {isEditing ? (
        <div className="space-y-3">
          <Input
            label="Real Name (Optional)"
            value={editData.real_name || ''}
            onChange={(e) => setEditData({ ...editData, real_name: e.target.value })}
            placeholder="Actual person's name"
          />

          <Input
            label="Business Role"
            value={editData.business_role}
            onChange={(e) => setEditData({ ...editData, business_role: e.target.value })}
            placeholder="CEO, Marketing Lead, Sales Manager, etc."
          />


          <Textarea
            label="About"
            value={editData.description}
            onChange={(e) => setEditData({ ...editData, description: e.target.value })}
            placeholder="Rich description that brings out the drama... (e.g., 'Visionary leader and the Boss who guides with wisdom and faith.')"
            rows={3}
          />

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-2">Work Mode</label>
            <div className="flex items-center space-x-2">
              <Button
                type="button"
                variant={editData.work_mode === 'on-site' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setEditData({ ...editData, work_mode: 'on-site' })}
              >
                🏢 On-site
              </Button>
              <Button
                type="button"
                variant={editData.work_mode === 'remote' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setEditData({ ...editData, work_mode: 'remote' })}
              >
                💻 Remote
              </Button>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              For location-aware content orchestration
            </p>
          </div>

          <div className="flex space-x-2 pt-2 border-t border-slate-200">
            {onAIHelp && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAIHelpClick}
                className="flex items-center text-primary-600"
              >
                <Sparkles size={14} className="mr-1" />
                Help with this
              </Button>
            )}
            <div className="flex-1"></div>
            <Button size="sm" onClick={handleSave} className="flex items-center">
              <Check size={14} className="mr-1" />
              Save
            </Button>
            <Button variant="ghost" size="sm" onClick={handleCancel}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Name Field */}
          {character.real_name && (
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Name</label>
              <p className="text-sm text-slate-800 font-medium">{character.real_name}</p>
            </div>
          )}

          {/* Role Field */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Role</label>
            <p className="text-sm text-primary-700 font-medium">{character.business_role}</p>
          </div>

          {/* Location Field */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Location</label>
            <p className="text-sm text-slate-700 flex items-center gap-1">
              {character.work_mode === 'on-site' ? '🏢' : '💻'}
              <span className="font-medium">{character.work_mode === 'on-site' ? 'On-site' : 'Remote'}</span>
            </p>
          </div>

          {/* About Field */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">About</label>
            <p className="text-sm text-slate-700 leading-relaxed">{character.description}</p>
          </div>
        </div>
          )}
        </div>
      )}
    </div>
  );
};
