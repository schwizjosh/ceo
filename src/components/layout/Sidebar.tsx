import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Home, Sliders, Pen, Calendar, Wand2, CalendarDays,
  MessageCircle, User, X, ChevronRight, Shield
} from 'lucide-react';
import { Page, AccessLevel } from '../../types';
import { cn } from '../../utils/cn';

interface SidebarProps {
  permissions?: Record<'configuration' | 'plots' | 'events' | 'seasons' | 'monthly' | 'chat', AccessLevel>;
  onClose?: () => void;
  isOpen?: boolean;
  onToggle?: (open: boolean) => void;
  isAdmin?: boolean;
}

const navigationItems = [
  { id: 'dashboard' as Page, label: 'Dashboard', icon: Home, description: 'Your creative workspace' },
  { id: 'config' as Page, label: 'Profile', icon: Sliders, description: 'Brand identity & setup' },
  { id: 'plot' as Page, label: 'Cast', icon: Pen, description: 'Story & characters' },
  { id: 'events' as Page, label: 'Events', icon: Calendar, description: 'Timeline calendar' },
  { id: 'season' as Page, label: 'Seasons', icon: Wand2, description: 'Long-term strategy' },
  { id: 'monthly' as Page, label: 'Monthly', icon: CalendarDays, description: 'Content calendar' },
  { id: 'chat' as Page, label: 'AI Chat', icon: MessageCircle, description: 'Creative assistant' },
  { id: 'settings' as Page, label: 'Account', icon: User, description: 'Settings & preferences' },
];

const navigationPermissions: Partial<Record<Page, keyof SidebarProps['permissions']>> = {
  config: 'configuration',
  plot: 'plots',
  events: 'events',
  season: 'seasons',
  monthly: 'monthly',
  chat: 'chat'
};

const defaultPermissions: Record<'configuration' | 'plots' | 'events' | 'seasons' | 'monthly' | 'chat', AccessLevel> = {
  configuration: 'edit',
  plots: 'edit',
  events: 'edit',
  seasons: 'edit',
  monthly: 'edit',
  chat: 'edit'
};

export const Sidebar: React.FC<SidebarProps> = ({ permissions, onClose, isOpen: externalIsOpen, onToggle, isAdmin = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [internalIsOpen, setInternalIsOpen] = React.useState(false);
  const [touchStart, setTouchStart] = React.useState(0);
  const [touchEnd, setTouchEnd] = React.useState(0);
  const sidebarRef = React.useRef<HTMLDivElement>(null);

  const currentPage = (location.pathname.split('/').pop() || 'dashboard') as Page;
  const effectivePermissions = permissions ?? defaultPermissions;

  // Use external isOpen if provided, otherwise use internal state
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
  const setIsOpen = (open: boolean) => {
    if (onToggle) {
      onToggle(open);
    } else {
      setInternalIsOpen(open);
    }
  };

  // Desktop: hover trigger
  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Open on hover at left edge (within 20px)
      if (e.clientX < 20 && !isOpen) {
        setIsOpen(true);
      }
    };

    // Only add listener on desktop
    if (window.innerWidth >= 768) {
      window.addEventListener('mousemove', handleMouseMove);
      return () => window.removeEventListener('mousemove', handleMouseMove);
    }
  }, [isOpen]);

  // Close on click outside
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node) && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Mobile: swipe gesture
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (touchStart < 50 && touchEnd > touchStart + 50) {
      // Swipe right from left edge
      setIsOpen(true);
    } else if (touchStart > 200 && touchEnd < touchStart - 50) {
      // Swipe left to close
      setIsOpen(false);
    }
  };

  React.useEffect(() => {
    const touchArea = document.getElementById('touch-trigger-area');
    if (touchArea) {
      touchArea.addEventListener('touchstart', handleTouchStart as any);
      touchArea.addEventListener('touchmove', handleTouchMove as any);
      touchArea.addEventListener('touchend', handleTouchEnd);

      return () => {
        touchArea.removeEventListener('touchstart', handleTouchStart as any);
        touchArea.removeEventListener('touchmove', handleTouchMove as any);
        touchArea.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [touchStart, touchEnd]);

  const handleNavigate = (page: Page) => {
    navigate(`/dashboard/${page}`);
    setIsOpen(false);
    onClose?.();
  };

  return (
    <>
      {/* Mobile touch trigger area (invisible) */}
      <div
        id="touch-trigger-area"
        className="md:hidden fixed left-0 top-0 bottom-0 w-8 z-40 pointer-events-auto"
        style={{ touchAction: 'none' }}
      />

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        ref={sidebarRef}
        className={cn(
          'fixed left-0 top-0 bottom-0 w-72 bg-gradient-to-br from-slate-50 via-white to-primary-50/30',
          'shadow-2xl border-r border-slate-200/50 z-50',
          'transition-transform duration-300 ease-out',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-200/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src="/andora-logo.png"
                alt="Andora"
                className="w-10 h-10 rounded-lg shadow-sm"
              />
              <div>
                <h2 className="text-xl font-bold bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent">
                  Andora
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">AI Brand Storytelling</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X size={20} className="text-slate-400" />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            const requiredPermission = navigationPermissions[item.id];
            const accessLevel = requiredPermission ? effectivePermissions[requiredPermission] : 'edit';
            const isDisabled = accessLevel === 'none';
            const isViewOnly = accessLevel === 'view';

            return (
              <button
                key={item.id}
                onClick={() => !isDisabled && handleNavigate(item.id)}
                disabled={isDisabled}
                className={cn(
                  'w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-200 group',
                  isActive && !isDisabled
                    ? 'bg-gradient-to-r from-primary-500 to-purple-500 text-white shadow-lg shadow-primary-500/25'
                    : isDisabled
                    ? 'opacity-40 cursor-not-allowed'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                  isViewOnly && !isActive && 'opacity-70'
                )}
              >
                <div className={cn(
                  'p-2 rounded-lg transition-colors',
                  isActive && !isDisabled
                    ? 'bg-white/20'
                    : 'bg-slate-100 group-hover:bg-slate-200'
                )}>
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                </div>

                <div className="flex-1 text-left">
                  <div className={cn(
                    'font-semibold text-sm',
                    isActive ? 'text-white' : ''
                  )}>
                    {item.label}
                  </div>
                  <div className={cn(
                    'text-xs mt-0.5',
                    isActive ? 'text-white/80' : 'text-slate-500'
                  )}>
                    {item.description}
                  </div>
                </div>

                <ChevronRight
                  size={16}
                  className={cn(
                    'transition-transform',
                    isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                  )}
                />
              </button>
            );
          })}

          {/* Admin menu item - only visible to admins */}
          {isAdmin && (
            <button
              onClick={() => handleNavigate('admin' as Page)}
              className={cn(
                'w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-200 group',
                currentPage === 'admin'
                  ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-lg shadow-red-500/25'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              )}
            >
              <div className={cn(
                'p-2 rounded-lg transition-colors',
                currentPage === 'admin'
                  ? 'bg-white/20'
                  : 'bg-slate-100 group-hover:bg-slate-200'
              )}>
                <Shield size={20} strokeWidth={currentPage === 'admin' ? 2.5 : 2} />
              </div>

              <div className="flex-1 text-left">
                <div className={cn(
                  'font-semibold text-sm',
                  currentPage === 'admin' ? 'text-white' : ''
                )}>
                  Admin
                </div>
                <div className={cn(
                  'text-xs mt-0.5',
                  currentPage === 'admin' ? 'text-white/80' : 'text-slate-500'
                )}>
                  System administration
                </div>
              </div>

              <ChevronRight
                size={16}
                className={cn(
                  'transition-transform',
                  currentPage === 'admin' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                )}
              />
            </button>
          )}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200/50">
          <div className="text-xs text-center text-slate-400">
            Made with creativity
          </div>
        </div>
      </aside>

      {/* Edge indicator (shows when sidebar is closed) */}
      {!isOpen && (
        <div className="fixed left-0 top-1/2 -translate-y-1/2 w-1 h-20 bg-gradient-to-b from-primary-500/0 via-primary-500/50 to-primary-500/0 rounded-r-full z-30 pointer-events-none" />
      )}
    </>
  );
};
