import React, { useState } from 'react';
import { User, Brand, AIProvider, AIModel, PricingPlan, CurrencyCode, TeamMember, AccessLevel } from '../../types';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Plus, Crown, Sparkles, LogOut, Zap, Users, Trash2, Archive, ArchiveRestore, Link2, Copy, Check } from 'lucide-react';
import { PyAvatar } from '../common/PyAvatar';
import { ANDORA_PRICING_PLANS, DEFAULT_EXCHANGE_RATE } from '../../utils/constants';
import { COMMON_TIMEZONES } from '../../utils/timezones';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/api';

interface SettingsPageProps {
  user: User | null;
  brands: Brand[];
  currentBrandId: string | null;
  onBrandChange: (brandId: string) => void;
  onCreateBrand: (name: string) => void;
  onAIProviderChange: (provider: AIProvider) => void;
  onAIModelChange: (modelId: string) => void;
  onTimezoneChange?: (timezone: string) => void;
  availableModels: AIModel[];
  onLogout: () => void;
  pricingPlans: PricingPlan[];
  pricingCurrency: CurrencyCode;
  pricingExchangeRate: number;
  onBrandUpdate?: (updates: Partial<Brand>) => void;
  onBrandArchive?: (brandId: string, updatedBrand: Brand) => void;
  onBrandUnarchive?: (brandId: string, updatedBrand: Brand) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  user,
  brands,
  currentBrandId,
  onBrandChange,
  onCreateBrand,
  onAIProviderChange,
  onAIModelChange,
  onTimezoneChange,
  availableModels,
  onLogout,
  pricingPlans,
  pricingCurrency,
  pricingExchangeRate,
  onBrandUpdate,
  onBrandArchive,
  onBrandUnarchive
}) => {
  const navigate = useNavigate();
  const [newBrandName, setNewBrandName] = useState('');
  const [showCreateBrand, setShowCreateBrand] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [brandError, setBrandError] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [archivingBrandId, setArchivingBrandId] = useState<string | null>(null);
  const currentBrand = brands.find(brand => brand.brand_id === currentBrandId) || null;
  const teamMembers = currentBrand?.team_members ?? [];
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('Collaborator');
  const [newMemberIsAdmin, setNewMemberIsAdmin] = useState(false);

  // Filter active and archived brands
  const activeBrands = brands.filter(b => !b.archived_at);
  const archivedBrands = brands.filter(b => b.archived_at);
  const displayBrands = showArchived ? archivedBrands : activeBrands;

  const permissionAreas: Array<keyof TeamMember['permissions']> = ['configuration', 'plots', 'events', 'seasons', 'monthly', 'chat'];
  const permissionLabels: Record<typeof permissionAreas[number], string> = {
    configuration: 'Configuration',
    plots: 'Plots',
    events: 'Events',
    seasons: 'Seasons',
    monthly: 'Monthly Calendar',
    chat: 'AI Chat'
  };

  const createPermissionTemplate = (
    overrides: Partial<Record<typeof permissionAreas[number], AccessLevel>> = {}
  ) =>
    permissionAreas.reduce<Record<typeof permissionAreas[number], AccessLevel>>((acc, area) => {
      acc[area] = overrides[area] ?? 'none';
      return acc;
    }, {} as Record<typeof permissionAreas[number], AccessLevel>);

  const [isAssigningAccess, setIsAssigningAccess] = useState(false);
  const [pendingPermissions, setPendingPermissions] = useState(createPermissionTemplate());
  const [pendingPermissionError, setPendingPermissionError] = useState<string | null>(null);
  const [copiedInviteId, setCopiedInviteId] = useState<string | null>(null);

  if (!user) return null;

  const livePlans = pricingPlans.length > 0 ? pricingPlans : ANDORA_PRICING_PLANS;
  const currentPlan = livePlans.find(plan => plan.id === user.plan) || ANDORA_PRICING_PLANS.find(plan => plan.id === user.plan);
  const canCreateMoreBrands = (currentPlan?.max_brands === -1) || brands.length < (currentPlan?.max_brands || 1);
  const normalizedExchangeRate = pricingExchangeRate > 0 ? pricingExchangeRate : DEFAULT_EXCHANGE_RATE;

  const handleCreateBrand = async () => {
    if (newBrandName.trim() && !isCreating) {
      setIsCreating(true);
      setBrandError(null);
      try {
        await onCreateBrand(newBrandName.trim());
        setNewBrandName('');
        setShowCreateBrand(false);
      } catch (error) {
        console.error('Error creating brand:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to create brand. Please try again.';
        setBrandError(errorMessage);
      } finally {
        setIsCreating(false);
      }
    }
  };

  const handleArchiveBrand = async (brandId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent brand selection
    if (window.confirm('Are you sure you want to archive this brand? You can restore it later from the archived brands section.')) {
      setArchivingBrandId(brandId);
      try {
        const updatedBrand = await apiClient.archiveBrand(brandId);
        // Call the callback to update the brands list without reloading
        if (onBrandArchive) {
          onBrandArchive(brandId, updatedBrand);
        }
      } catch (error) {
        console.error('Error archiving brand:', error);
        alert('Failed to archive brand. Please try again.');
      } finally {
        setArchivingBrandId(null);
      }
    }
  };

  const handleUnarchiveBrand = async (brandId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent brand selection
    setArchivingBrandId(brandId);
    try {
      const updatedBrand = await apiClient.unarchiveBrand(brandId);
      // Call the callback to update the brands list without reloading
      if (onBrandUnarchive) {
        onBrandUnarchive(brandId, updatedBrand);
      }
    } catch (error) {
      console.error('Error unarchiving brand:', error);
      alert('Failed to unarchive brand. Please try again.');
    } finally {
      setArchivingBrandId(null);
    }
  };

  const updateTeamMembers = (members: TeamMember[]) => {
    if (onBrandUpdate) {
      onBrandUpdate({ team_members: members });
    }
  };

  const handleAddTeamMember = () => {
    if (!currentBrand || !isAssigningAccess) return;
    const trimmedEmail = newMemberEmail.trim();
    if (!trimmedEmail) {
      setPendingPermissionError('Enter an email address to continue.');
      return;
    }

    const emailExists = teamMembers.some(
      member => member.email.toLowerCase() === trimmedEmail.toLowerCase()
    );
    if (emailExists) {
      setPendingPermissionError('This collaborator already has access.');
      return;
    }

    const hasAccess = Object.values(pendingPermissions).some(level => level !== 'none');
    if (!hasAccess) {
      setPendingPermissionError('Select at least one section to assign.');
      return;
    }

    // Generate unique invite token
    const inviteToken = `${currentBrand?.brand_id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const newMember: TeamMember = {
      id: `team-${Date.now()}`,
      name: newMemberName.trim() || trimmedEmail,
      email: trimmedEmail,
      role: newMemberRole.trim() || 'Collaborator',
      is_admin: newMemberIsAdmin,
      permissions: pendingPermissions,
      invite_token: inviteToken,
      invite_accepted: false
    };

    updateTeamMembers([...teamMembers, newMember]);
    setNewMemberName('');
    setNewMemberEmail('');
    setNewMemberRole('Collaborator');
    setNewMemberIsAdmin(false);
    setPendingPermissions(createPermissionTemplate());
    setPendingPermissionError(null);
    setIsAssigningAccess(false);
  };

  const handleRemoveMember = (memberId: string) => {
    updateTeamMembers(teamMembers.filter(member => member.id !== memberId));
  };

  const handlePermissionChange = (memberId: string, area: keyof TeamMember['permissions'], level: AccessLevel) => {
    const updated = teamMembers.map(member =>
      member.id === memberId
        ? { ...member, permissions: { ...member.permissions, [area]: level } }
        : member
    );
    updateTeamMembers(updated);
  };

  const handleToggleAdmin = (memberId: string) => {
    const updated = teamMembers.map(member =>
      member.id === memberId
        ? { ...member, is_admin: !member.is_admin }
        : member
    );
    updateTeamMembers(updated);
  };

  const handlePendingPermissionChange = (area: keyof TeamMember['permissions'], level: AccessLevel) => {
    setPendingPermissions(prev => ({ ...prev, [area]: level }));
    if (pendingPermissionError) {
      setPendingPermissionError(null);
    }
  };

  const handleBeginAssignAccess = () => {
    if (!newMemberEmail.trim()) {
      setPendingPermissionError('Enter an email address to continue.');
      return;
    }
    setPendingPermissionError(null);
    setPendingPermissions(createPermissionTemplate());
    setIsAssigningAccess(true);
    setNewMemberName('');
    setNewMemberRole('Collaborator');
    setNewMemberIsAdmin(false);
  };

  const handleCancelAssign = () => {
    setIsAssigningAccess(false);
    setPendingPermissionError(null);
    setPendingPermissions(createPermissionTemplate());
    setNewMemberName('');
    setNewMemberRole('Collaborator');
    setNewMemberIsAdmin(false);
  };

  const applyEventsOnlyPreset = () => {
    setPendingPermissions(createPermissionTemplate({ events: 'edit' }));
    if (pendingPermissionError) {
      setPendingPermissionError(null);
    }
  };

  const copyInviteLink = async (member: TeamMember) => {
    if (!member.invite_token) return;

    const inviteUrl = `${window.location.origin}/invite/${member.invite_token}`;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopiedInviteId(member.id);
      setTimeout(() => setCopiedInviteId(null), 2000);
    } catch (err) {
      console.error('Failed to copy invite link:', err);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-primary-900 mb-2">Settings</h1>
        <p className="text-slate-600">Manage your account, preferences, and brand settings</p>
      </div>

      {/* Subscription Status */}
      <div className="neural-glow p-6 rounded-lg relative overflow-hidden border border-primary-500/30">
        <div className="absolute top-2 right-2">
          <PyAvatar size="sm" />
        </div>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Crown className="w-6 h-6 text-accent-400 mr-2" />
            <h3 className="text-lg font-semibold text-primary-900">Subscription Status</h3>
          </div>
        </div>

        {/* Token Usage Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Zap size={18} className="text-primary-600" />
              <span className="text-sm font-semibold text-primary-900">Token Usage</span>
            </div>
            <span className="text-sm font-bold text-primary-600">
              {user.tokens.toLocaleString()} / {currentPlan ? currentPlan.tokens.toLocaleString() : 'Unknown'}
            </span>
          </div>
          <div className="relative w-full h-3 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary-500 to-purple-500 rounded-full transition-all duration-500 shadow-sm"
              style={{ width: `${currentPlan ? Math.min((user.tokens / currentPlan.tokens) * 100, 100) : 0}%` }}
            />
          </div>
          <p className="text-xs text-slate-500 mt-2">
            {currentPlan ? ((user.tokens / currentPlan.tokens) * 100).toFixed(1) : '0.0'}% of plan limit used
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-slate-500">Plan:</span>
            <p className="font-semibold text-primary-800 capitalize">{user.plan}</p>
          </div>
          <div>
            <span className="text-slate-500">Max Brands:</span>
            <p className="font-semibold text-primary-800">
              {currentPlan?.max_brands === -1 ? 'Unlimited' : (currentPlan?.max_brands || 1)}
            </p>
          </div>
          {user.plan_expiry && (
            <div>
              <span className="text-slate-500">Expires:</span>
              <p className="font-semibold text-primary-800">
                {new Date(user.plan_expiry).toLocaleDateString()}
              </p>
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-col sm:flex-row gap-3">
          <Button
            onClick={() => navigate('/dashboard/tokens')}
            className="flex items-center justify-center"
            size="sm"
          >
            <Zap size={16} className="mr-2" />
            Buy More Tokens
          </Button>

          {user.plan === 'free' && (
            <div className="flex-1 p-3 glass-effect border border-accent-500/30 rounded-lg">
              <p className="text-sm text-accent-300">
                Upgrade to unlock more brands, higher token limits, and advanced features!
              </p>
            </div>
          )}
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Pricing defaults to {pricingCurrency === 'USD' ? 'US Dollars ($)' : 'Nigerian Naira (₦)'}.
          Current exchange rate: ₦{normalizedExchangeRate.toLocaleString()} ≈ $1.
        </p>
      </div>

      {/* Preferences */}
      <div className="glass-effect p-6 rounded-lg border border-primary-500/20">
        <div className="flex items-center space-x-2 mb-4">
          <Sparkles className="w-5 h-5 text-primary-400" />
          <h3 className="text-lg font-semibold text-primary-900">Preferences</h3>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-600 mb-2 block">Timezone</label>
            <select
              value={user.timezone || 'Africa/Lagos'}
              onChange={(e) => onTimezoneChange?.(e.target.value)}
              className="w-full bg-white/80 text-primary-900 p-3 rounded-lg border border-primary-200 focus:border-primary-400 outline-none transition-colors"
            >
              {COMMON_TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-600">AI Provider Override</label>
              <span className="text-xs text-slate-500 italic">Optional</span>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Andora intelligently selects the best model for each task. You can override this for specific fields.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {(['gemini', 'openai', 'claude', 'deepseek'] as AIProvider[]).map((provider) => (
                <button
                  key={provider}
                  onClick={() => onAIProviderChange(provider)}
                  className={`p-4 border-2 rounded-lg transition-all duration-300 glass-effect ${user.preferred_ai_provider === provider
                    ? 'border-primary-500 bg-primary-500/10'
                    : 'border-primary-200 hover:border-primary-400'
                    }`}
                >
                  <div className="text-left">
                    <h4 className="font-semibold text-primary-800 capitalize">{provider === 'gemini' ? 'Gemini (FREE)' : provider}</h4>
                  </div>
                </button>
              ))}
            </div>
            <div className="mt-4">
              <label className="text-sm font-medium text-slate-600 mb-2 block">AI Model Override</label>
              <select
                value={user.preferred_ai_model}
                onChange={(e) => onAIModelChange(e.target.value)}
                className="w-full bg-white/80 text-primary-900 p-3 rounded-lg border border-primary-200 focus:border-primary-400 outline-none transition-colors"
              >
                {availableModels
                  .filter((model) => model.provider === user.preferred_ai_provider)
                  .map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
              </select>
              <p className="text-xs text-slate-500 mt-2">
                Select your default model. This will be used for AI content generation when available.
              </p>
            </div>
          </div>
        </div>
      </div>

      {currentBrand && (
        <div className="glass-effect p-6 rounded-lg border border-primary-500/20">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-primary-400" />
              <h3 className="text-lg font-semibold text-primary-900">Team Access</h3>
            </div>
            <span className="text-xs text-slate-500">{teamMembers.length} member{teamMembers.length === 1 ? '' : 's'}</span>
          </div>

          <div className="space-y-4">
            {teamMembers.length ? (
              teamMembers.map((member) => (
                <div key={member.id} className="glass-effect border border-primary-500/20 rounded-lg p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold text-primary-900">{member.name}</h4>
                        {member.is_admin && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-orange-100 text-orange-800 border border-orange-300">
                            <Crown size={12} className="mr-1" />
                            Admin
                          </span>
                        )}
                        {!member.invite_accepted && member.invite_token && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-yellow-100 text-yellow-800 border border-yellow-300">
                            Pending
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">{member.email}</p>
                      <p className="text-xs text-primary-300 mt-1">Role: {member.role}</p>
                    </div>
                    <div className="flex items-center gap-2 self-start">
                      {member.invite_token && !member.invite_accepted && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyInviteLink(member)}
                          className="flex items-center text-primary-600 hover:text-primary-700"
                        >
                          {copiedInviteId === member.id ? (
                            <>
                              <Check size={14} className="mr-1" /> Copied!
                            </>
                          ) : (
                            <>
                              <Link2 size={14} className="mr-1" /> Copy invite link
                            </>
                          )}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveMember(member.id)}
                        className="text-red-400 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={!onBrandUpdate}
                      >
                        <Trash2 size={14} className="mr-1" /> Remove
                      </Button>
                    </div>
                  </div>

                  {/* Admin Toggle for Existing Members */}
                  <div className="flex items-center gap-3 p-2 rounded-lg bg-orange-50/30 border border-orange-100">
                    <input
                      type="checkbox"
                      id={`admin-toggle-${member.id}`}
                      checked={member.is_admin || false}
                      onChange={() => handleToggleAdmin(member.id)}
                      disabled={!onBrandUpdate}
                      className="w-4 h-4 text-orange-600 border-orange-300 rounded focus:ring-orange-500"
                    />
                    <label htmlFor={`admin-toggle-${member.id}`} className="flex-1 cursor-pointer">
                      <div className="text-xs font-medium text-orange-900">Admin Access</div>
                      <div className="text-xs text-orange-600">Can use your tokens and add team members</div>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {permissionAreas.map((area) => {
                      const level = member.permissions?.[area] || 'none';
                      const options: AccessLevel[] = ['none', 'view', 'edit'];
                      return (
                        <div key={`${member.id}-${area}`} className="space-y-1">
                          <p className="text-xs font-medium text-slate-500">{permissionLabels[area]}</p>
                          <div className="flex items-center gap-1">
                            {options.map(option => (
                              <button
                                key={option}
                                onClick={() => handlePermissionChange(member.id, area, option)}
                                className={`px-2 py-1 rounded-md text-xs border transition-colors ${level === option
                                  ? 'border-primary-400 bg-primary-500/20 text-primary-100'
                                  : 'border-primary-200 text-slate-500 hover:border-primary-300'
                                  }`}
                                disabled={!onBrandUpdate}
                              >
                                {option === 'none' ? 'None' : option === 'view' ? 'View' : 'Edit'}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2">
                    {permissionAreas.some(area => (member.permissions?.[area] || 'none') !== 'none') ? (
                      permissionAreas.map((area) => {
                        const level = member.permissions?.[area] || 'none';
                        if (level === 'none') return null;
                        return (
                          <span
                            key={`${member.id}-${area}-badge`}
                            className="px-2 py-1 text-xs rounded-full bg-primary-500/15 text-primary-200 border border-primary-500/30"
                          >
                            {permissionLabels[area]} • {level === 'edit' ? 'edit' : 'view'}
                          </span>
                        );
                      })
                    ) : (
                      <span className="text-xs text-slate-500">No sections assigned yet.</span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="glass-effect border border-primary-500/20 rounded-lg p-6 text-sm text-slate-500">
                Invite teammates to collaborate on configuration, planning, and approvals.
              </div>
            )}

            <div className="border-t border-primary-500/10 pt-4">
              <h4 className="text-sm font-medium text-primary-900 mb-3">Invite teammate</h4>
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-3">
                  <Input
                    placeholder="Collaborator email"
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                  />
                  <Button
                    size="sm"
                    className="flex items-center"
                    onClick={handleBeginAssignAccess}
                    disabled={!onBrandUpdate || !newMemberEmail.trim()}
                  >
                    <Sparkles size={16} className="mr-1" /> Assign sections
                  </Button>
                </div>

                {isAssigningAccess && (
                  <div className="glass-effect border border-primary-500/20 rounded-lg p-4 space-y-4">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Collaborator</p>
                      <p className="text-sm font-medium text-primary-900">{newMemberEmail}</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Input
                        placeholder="Name (optional)"
                        value={newMemberName}
                        onChange={(e) => setNewMemberName(e.target.value)}
                      />
                      <Input
                        placeholder="Role"
                        value={newMemberRole}
                        onChange={(e) => setNewMemberRole(e.target.value)}
                      />
                    </div>

                    {/* Admin Toggle */}
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-orange-50/50 border border-orange-200">
                      <input
                        type="checkbox"
                        id="admin-toggle"
                        checked={newMemberIsAdmin}
                        onChange={(e) => setNewMemberIsAdmin(e.target.checked)}
                        className="w-4 h-4 text-orange-600 border-orange-300 rounded focus:ring-orange-500"
                      />
                      <label htmlFor="admin-toggle" className="flex-1 cursor-pointer">
                        <div className="text-sm font-semibold text-orange-900">Make Admin</div>
                        <div className="text-xs text-orange-700">Can use your tokens and add other team members</div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Assign sections</p>
                      <button
                        type="button"
                        onClick={applyEventsOnlyPreset}
                        className="text-xs px-2 py-1 rounded-md border border-primary-300 text-primary-600 hover:border-primary-400"
                        disabled={!onBrandUpdate}
                      >
                        Events only shortcut
                      </button>
                    </div>
                    {pendingPermissionError && (
                      <div className="p-2 rounded-md bg-red-500/10 border border-red-400/40 text-xs text-red-300">
                        {pendingPermissionError}
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {permissionAreas.map((area) => {
                        const level = pendingPermissions[area];
                        const options: AccessLevel[] = ['none', 'view', 'edit'];
                        return (
                          <div key={`pending-${area}`} className="space-y-1">
                            <p className="text-xs font-medium text-slate-500">{permissionLabels[area]}</p>
                            <div className="flex items-center gap-1">
                              {options.map(option => (
                                <button
                                  key={option}
                                  onClick={() => handlePendingPermissionChange(area, option)}
                                  className={`px-2 py-1 rounded-md text-xs border transition-colors ${level === option
                                    ? 'border-primary-400 bg-primary-500/20 text-primary-100'
                                    : 'border-primary-200 text-slate-500 hover:border-primary-300'
                                    }`}
                                  disabled={!onBrandUpdate}
                                >
                                  {option === 'none' ? 'None' : option === 'view' ? 'View' : 'Edit'}
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <Button variant="ghost" size="sm" onClick={handleCancelAssign}>
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        className="flex items-center"
                        onClick={handleAddTeamMember}
                        disabled={!onBrandUpdate}
                      >
                        <Plus size={16} className="mr-1" /> Send invite
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Brand Management */}
      <div className="glass-effect p-6 rounded-lg border border-primary-500/20">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-primary-900">Brand Management</h3>
          {canCreateMoreBrands && (
            <Button
              size="sm"
              onClick={() => setShowCreateBrand(true)}
              className="flex items-center"
            >
              <Plus size={16} className="mr-1" />
              New Brand
            </Button>
          )}
        </div>

        {showCreateBrand && (
          <div className="mb-4 p-4 glass-effect rounded-lg">
            {brandError && (
              <div className="mb-3 p-2 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="text-red-400 text-sm">{brandError}</p>
              </div>
            )}
            <div className="flex space-x-2">
              <Input
                placeholder="Enter brand name"
                value={newBrandName}
                onChange={(e) => setNewBrandName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !isCreating && handleCreateBrand()}
                className="flex-1"
                disabled={isCreating}
              />
              <Button onClick={handleCreateBrand} size="sm" disabled={isCreating}>
                {isCreating ? 'Creating...' : 'Create'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowCreateBrand(false);
                  setNewBrandName('');
                  setBrandError(null);
                }}
                disabled={isCreating}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Toggle for archived brands */}
        {archivedBrands.length > 0 && (
          <div className="flex items-center justify-between mb-3">
            <Button
              onClick={() => setShowArchived(!showArchived)}
              variant="outline"
              size="sm"
              className="text-xs"
            >
              {showArchived ? 'Show Active' : `Show Archived (${archivedBrands.length})`}
            </Button>
          </div>
        )}

        <div className="space-y-2">
          {displayBrands.map((brand) => (
            <div
              key={brand.brand_id}
              className={`p-3 border rounded-lg transition-all duration-200 ${brand.brand_id === currentBrandId
                ? 'border-primary-500 bg-primary-500/10'
                : 'border-primary-200 hover:border-primary-500/50'
                } ${brand.archived_at ? 'opacity-60' : ''}`}
            >
              <div className="flex items-start justify-between">
                <div
                  className="flex-1 cursor-pointer"
                  onClick={() => !brand.archived_at && onBrandChange(brand.brand_id)}
                >
                  <h4 className="font-medium text-primary-800">
                    {brand.brand_name}
                    {brand.archived_at && (
                      <span className="ml-2 text-xs text-slate-500 italic">(Archived)</span>
                    )}
                  </h4>
                  <p className="text-sm text-slate-500 mt-1">
                    {brand.channels.length} channels • {brand.posting_frequency}x/week
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-3">
                  {brand.archived_at ? (
                    <button
                      onClick={(e) => handleUnarchiveBrand(brand.brand_id, e)}
                      disabled={archivingBrandId === brand.brand_id}
                      className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors disabled:opacity-50"
                      title="Restore brand"
                    >
                      <ArchiveRestore size={16} />
                    </button>
                  ) : (
                    <button
                      onClick={(e) => handleArchiveBrand(brand.brand_id, e)}
                      disabled={archivingBrandId === brand.brand_id}
                      className="p-1.5 text-slate-500 hover:bg-slate-100 rounded transition-colors disabled:opacity-50"
                      title="Archive brand"
                    >
                      <Archive size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {!canCreateMoreBrands && (
          <p className="text-sm text-slate-500 mt-2">
            You've reached the maximum number of brands for your plan.
            {user.plan === 'free' && ' Upgrade to manage more brands!'}
          </p>
        )}
      </div>

      {/* TODO: Teams Section - Will be added in future implementation */}

      {/* Account Section */}
      <div className="glass-effect p-6 rounded-lg border border-red-500/20">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-primary-900">Account</h3>
            <p className="text-sm text-slate-500 mt-1">Sign out of your Andora account</p>
          </div>
          <Button
            onClick={onLogout}
            variant="danger"
            className="flex items-center"
          >
            <LogOut size={16} className="mr-2" />
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
};
