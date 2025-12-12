import React from 'react';
import { useLocation } from 'react-router-dom';
import { Settings, Zap, Sparkles, MessageCircle, Sliders, Pen, Calendar, Wand2, CalendarDays, Menu } from 'lucide-react';
import { AccessLevel, Page, User, Brand } from '../../types';
import { AndoraAvatar } from '../common/AndoraAvatar';
import { BrandSwitcher } from '../common/BrandSwitcher';
import { Sidebar } from './Sidebar';
import { cn } from '../../utils/cn';

interface NavBarProps {
  onPageChange: (page: Page) => void;
  onLogout: () => void;
  user: User | null;
  permissions?: Record<'configuration' | 'plots' | 'events' | 'seasons' | 'monthly' | 'chat', AccessLevel>;
  hideFooter?: boolean;
  isAdmin?: boolean;
  brands?: Brand[];
  currentBrandId?: string | null;
  onBrandChange?: (brandId: string) => void;
}

const navigationItems = [
  { id: 'config' as Page, label: 'Profile', icon: Sliders, description: 'Brand Identity' },
  { id: 'plot' as Page, label: 'Plot', icon: Pen, description: 'Story & Characters' },
  { id: 'events' as Page, label: 'Events', icon: Calendar, description: 'Timeline Calendar', featured: true },
  { id: 'season' as Page, label: 'Season', icon: Wand2, description: 'Content Strategy' },
  { id: 'monthly' as Page, label: 'Monthly', icon: CalendarDays, description: 'Content Calendar' }
];

const navigationPermissions: Partial<Record<Page, keyof NavBarProps['permissions']>> = {
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

export const NavBar: React.FC<NavBarProps> = ({
  onPageChange,
  onLogout,
  user,
  permissions,
  hideFooter = false,
  isAdmin = false,
  brands = [],
  currentBrandId = null,
  onBrandChange
}) => {
  const location = useLocation();
  const currentPage = (location.pathname.split('/').pop() || 'config') as Page;
  const effectivePermissions = permissions ?? defaultPermissions;
  const [showSidebar, setShowSidebar] = React.useState(false);

  // Scroll-aware footer visibility
  const [showFooterOnScroll, setShowFooterOnScroll] = React.useState(false);
  const [lastScrollY, setLastScrollY] = React.useState(0);
  const [hasModalOpen, setHasModalOpen] = React.useState(false);

  React.useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // Show footer when scrolling up, hide when scrolling down
      if (currentScrollY < lastScrollY || currentScrollY < 50) {
        setShowFooterOnScroll(true);
      } else if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setShowFooterOnScroll(false);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  // Check for modal-open class on body to hide footer
  React.useEffect(() => {
    const checkModalOpen = () => {
      setHasModalOpen(document.body.classList.contains('modal-open'));
    };

    // Check initially
    checkModalOpen();

    // Set up mutation observer to watch for class changes
    const observer = new MutationObserver(checkModalOpen);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, []);

  return (
    <>
      <Sidebar
        permissions={effectivePermissions}
        isOpen={showSidebar}
        onToggle={setShowSidebar}
        isAdmin={isAdmin}
      />

      {/* Top Header */}
      <header className="glass-effect border-b border-primary-200/50 px-4 sm:px-6 py-3 relative floating-particles">
        <div className="flex items-center justify-between">
          {/* Logo & Menu */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="p-2 hover:bg-white/70 rounded-lg transition-colors"
              title="Menu"
            >
              <Menu size={20} className="text-slate-600" />
            </button>
            <AndoraAvatar size="sm" className="mr-2" />
            <div>
              <h1 className="text-base sm:text-lg font-bold shimmer-text">Andora</h1>
            </div>
          </div>

          {/* Center - Brand Switcher */}
          <div className="flex-1 flex justify-center">
            {brands.length > 0 && currentBrandId && onBrandChange && (
              <BrandSwitcher
                brands={brands}
                currentBrandId={currentBrandId}
                onBrandChange={onBrandChange}
              />
            )}
          </div>

          {/* Right Side - Chat */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Chat Button */}
            <button
              onClick={() => onPageChange('chat' as Page)}
              className={cn(
                'p-2 rounded-lg transition-all duration-300',
                effectivePermissions.chat === 'none' && 'opacity-40 cursor-not-allowed pointer-events-none',
                currentPage === 'chat' && effectivePermissions.chat !== 'none'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-white/70'
              )}
              title={effectivePermissions.chat === 'none' ? 'Access restricted' : 'Chat with Andora'}
              disabled={effectivePermissions.chat === 'none'}
            >
              <MessageCircle size={20} />
            </button>
          </div>
        </div>
      </header>

    </>
  );
};