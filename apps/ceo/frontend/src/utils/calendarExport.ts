import { Brand, CalendarItem } from '../types';

interface ExportOptions {
  brand: Brand;
  calendar: { items: CalendarItem[] };
  month: string;
  monthTheme?: string;
  events?: any[];
  weeklySubplots?: Record<number, { subplot: string; perfect: boolean }>;
}

export const exportCalendarToText = ({
  brand,
  calendar,
  month,
  monthTheme,
  events = [],
  weeklySubplots = {}
}: ExportOptions): string => {
  const [year, monthNum] = month.split('-');
  const monthName = new Date(parseInt(year), parseInt(monthNum) - 1, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  });

  let output = '';

  // Header
  output += '═'.repeat(80) + '\n';
  output += `${brand.name.toUpperCase()} - CONTENT CALENDAR\n`;
  output += `${monthName}\n`;
  output += '═'.repeat(80) + '\n\n';

  // Brand Info
  output += '*BRAND OVERVIEW*\n';
  output += '─'.repeat(80) + '\n';
  output += `Tagline: _"${brand.tagline}"_\n`;
  if (brand.industry) output += `Industry: ${brand.industry}\n`;
  if (brand.vision) output += `Vision: ${brand.vision}\n`;
  output += '\n';

  // Monthly Theme
  if (monthTheme) {
    output += '*MONTHLY THEME*\n';
    output += '─'.repeat(80) + '\n';
    output += `${monthTheme}\n\n`;
  }

  // Weekly Subplots
  const subplotEntries = Object.entries(weeklySubplots);
  if (subplotEntries.length > 0) {
    output += '*WEEKLY SUBPLOTS*\n';
    output += '─'.repeat(80) + '\n';
    subplotEntries
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
      .forEach(([week, data]) => {
        const perfectMark = data.perfect ? ' ★' : '';
        output += `\nWeek ${week}${perfectMark}:\n`;
        output += `${data.subplot}\n`;
      });
    output += '\n';
  }

  // Events Summary
  if (events.length > 0) {
    output += '*SCHEDULED EVENTS*\n';
    output += '─'.repeat(80) + '\n';
    events.forEach(event => {
      const eventDate = new Date(event.date + 'T12:00:00Z').toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC'
      });
      const embeddedMark = event.embedded_in_subplot ? ' [Embedded]' : '';
      output += `• ${eventDate}: ${event.title}${embeddedMark}\n`;
      if (event.description) {
        output += `  ${event.description}\n`;
      }
    });
    output += '\n';
  }

  // Content Calendar by Week
  output += '*CONTENT CALENDAR*\n';
  output += '═'.repeat(80) + '\n\n';

  // Group content by week
  const contentByWeek: Record<number, CalendarItem[]> = {};
  calendar.items.forEach(item => {
    const date = new Date(item.date + 'T12:00:00Z');
    const weekNum = Math.ceil(date.getUTCDate() / 7);
    if (!contentByWeek[weekNum]) contentByWeek[weekNum] = [];
    contentByWeek[weekNum].push(item);
  });

  // Sort and output by week
  Object.entries(contentByWeek)
    .sort(([a], [b]) => parseInt(a) - parseInt(b))
    .forEach(([week, items]) => {
      output += `┌${'─'.repeat(78)}┐\n`;
      output += `│ WEEK ${week}${' '.repeat(72 - week.length)}│\n`;
      output += `└${'─'.repeat(78)}┘\n\n`;

      // Sort items by date
      const sortedItems = items.sort((a, b) => a.date.localeCompare(b.date));

      sortedItems.forEach(item => {
        const date = new Date(item.date + 'T12:00:00Z');
        const dayName = date.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
        const dateStr = date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          timeZone: 'UTC'
        });

        const perfectMark = item.is_perfect ? ' ★' : '';
        const channelEmoji = getChannelEmoji(item.channel);

        output += `┌─ ${dayName}, ${dateStr} ${channelEmoji} ${item.channel}${perfectMark}\n`;
        output += `│\n`;

        // Title
        output += `│ *${item.title}*\n`;
        output += `│\n`;

        // Character & Format
        if (item.character_name || item.format_style) {
          output += `│ `;
          if (item.character_name) output += `Character: _${item.character_name}_`;
          if (item.character_name && item.format_style) output += ' | ';
          if (item.format_style) output += `Format: _${item.format_style}_`;
          output += '\n│\n';
        }

        // Posting time
        if (item.suggested_posting_time) {
          output += `│ ⏰ ${item.suggested_posting_time}\n│\n`;
        }

        // Brief
        if (item.brief) {
          output += `│ BRIEF:\n`;
          const briefLines = item.brief.split('\n');
          briefLines.forEach(line => {
            if (line.trim()) {
              output += `│ ${line}\n`;
            }
          });
          output += `│\n`;
        }

        // Final content
        const finalContent = item.user_revision || item.final_brief || item.expanded_brief;
        if (finalContent) {
          output += `│ CONTENT:\n`;
          // Strip HTML tags and format
          const cleanContent = finalContent
            .replace(/<h[1-6][^>]*>/gi, '\n│ *')
            .replace(/<\/h[1-6]>/gi, '*\n│\n')
            .replace(/<strong[^>]*>/gi, '*')
            .replace(/<\/strong>/gi, '*')
            .replace(/<em[^>]*>/gi, '_')
            .replace(/<\/em>/gi, '_')
            .replace(/<p[^>]*>/gi, '\n│ ')
            .replace(/<\/p>/gi, '\n')
            .replace(/<br\s*\/?>/gi, '\n│ ')
            .replace(/<li[^>]*>/gi, '\n│ • ')
            .replace(/<\/li>/gi, '')
            .replace(/<ul[^>]*>|<\/ul>/gi, '\n')
            .replace(/<[^>]+>/g, '') // Remove any remaining HTML tags
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"');

          const contentLines = cleanContent.split('\n');
          contentLines.forEach(line => {
            if (line.trim()) {
              // Wrap long lines
              const wrappedLines = wrapText(line.replace(/^│\s*/, ''), 75);
              wrappedLines.forEach(wrappedLine => {
                output += `│ ${wrappedLine}\n`;
              });
            }
          });
          output += `│\n`;
        }

        // Hashtags
        if (item.hashtags && item.hashtags.length > 0) {
          output += `│ ${item.hashtags.join(' ')}\n│\n`;
        }

        // Comments
        if (item.comments) {
          output += `│ 💬 TEAM NOTES:\n`;
          const commentLines = item.comments.split('\n');
          commentLines.forEach(line => {
            if (line.trim()) {
              output += `│    ${line}\n`;
            }
          });
          output += `│\n`;
        }

        output += `└${'─'.repeat(78)}\n\n`;
      });
    });

  // Footer
  output += '═'.repeat(80) + '\n';
  output += `Generated by Andora - ${new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })}\n`;
  output += '═'.repeat(80) + '\n';

  return output;
};

// Helper function to get channel emoji
const getChannelEmoji = (channel: string): string => {
  const channelMap: Record<string, string> = {
    'instagram': '📸',
    'facebook': '📘',
    'twitter': '🐦',
    'linkedin': '💼',
    'tiktok': '🎵',
    'youtube': '📺',
    'blog': '📝',
    'email': '✉️',
    'website': '🌐'
  };
  return channelMap[channel.toLowerCase()] || '📢';
};

// Helper function to wrap text to specified width
const wrapText = (text: string, maxWidth: number): string[] => {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  words.forEach(word => {
    if ((currentLine + word).length > maxWidth) {
      if (currentLine) lines.push(currentLine.trim());
      currentLine = word + ' ';
    } else {
      currentLine += word + ' ';
    }
  });

  if (currentLine.trim()) lines.push(currentLine.trim());
  return lines;
};

// Function to trigger download
export const downloadCalendarExport = (content: string, filename: string) => {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
