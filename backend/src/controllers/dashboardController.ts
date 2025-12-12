import { FastifyReply, FastifyRequest } from 'fastify';
import pool from '../database/db';

interface DashboardSettings {
  briefsEnabled: boolean;
  briefInterval: number; // hours between briefs
  maxBriefsPerDay: number;
}

const DEFAULT_SETTINGS: DashboardSettings = {
  briefsEnabled: true,
  briefInterval: 8, // 3 times per day (every 8 hours)
  maxBriefsPerDay: 3,
};

export const getDashboardBrief = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const { brandId } = request.params as any;

    if (!brandId) {
      return reply.status(400).send({ error: 'Brand ID is required' });
    }

    // For now, return a sample brief
    // In the future, this would use the BriefWriterAgent
    const briefTypes = ['creative', 'strategic', 'playful', 'challenge'];
    const randomType = briefTypes[Math.floor(Math.random() * briefTypes.length)];

    const sampleBriefs = {
      creative: {
        title: 'Creative Spark',
        message: 'What if your brand was a character in a movie? Think about your origin story, the challenges you face, and the transformation you bring.',
        type: 'creative',
        actionable: true,
      },
      strategic: {
        title: 'Strategic Vision',
        message: 'Imagine your brand 10 years from now. What legacy does it leave? Work backwards from that vision to create content that builds toward your ultimate impact.',
        type: 'strategic',
        actionable: true,
      },
      playful: {
        title: 'Plot Twist',
        message: 'If your brand was a superhero, what would be its superpower? What villain does it fight? Use this metaphor to craft your next campaign.',
        type: 'playful',
        actionable: true,
      },
      challenge: {
        title: 'Brand Challenge',
        message: 'Challenge yourself: Tell your brand story in exactly 6 words. Now expand each word into a chapter. You just outlined your content strategy.',
        type: 'challenge',
        actionable: true,
      },
    };

    reply.send({
      brief: sampleBriefs[randomType as keyof typeof sampleBriefs],
      metadata: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error generating dashboard brief:', error);
    reply.status(500).send({ error: 'Failed to generate brief' });
  }
};

export const getDashboardInsights = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const { brandId } = request.params as any;

    if (!brandId) {
      return reply.status(400).send({ error: 'Brand ID is required' });
    }

    // Query brand data for insights
    const brandResult = await pool.query(
      'SELECT * FROM brands WHERE brand_id = $1',
      [brandId]
    );

    if (brandResult.rows.length === 0) {
      return reply.status(404).send({ error: 'Brand not found' });
    }

    const brand = brandResult.rows[0];

    // Generate insights based on brand data
    const insights = [];

    // Character count insight
    const characterCount = brand.cast_management?.length || 0;
    if (characterCount > 0) {
      insights.push({
        type: 'stat',
        title: 'Cast Ready',
        message: `Your ${characterCount}-character cast is ready to tell ${brand.brand_name}'s story. Each voice brings unique perspective to your narrative.`,
        icon: 'users',
        color: 'rose',
      });
    } else {
      insights.push({
        type: 'tip',
        title: 'Build Your Cast',
        message: 'Characters are the heart of great stories. Head to the Cast page to create voices that resonate.',
        icon: 'users',
        color: 'indigo',
      });
    }

    // Monthly themes insight
    const themeCount = Object.keys(brand.monthly_themes || {}).length;
    if (themeCount > 0) {
      insights.push({
        type: 'stat',
        title: 'Content Health',
        message: `You've mapped out ${themeCount} months of thematic content. Consistency is your superpower!`,
        icon: 'chart',
        color: 'emerald',
      });
    }

    // Channel insight
    const channelCount = brand.channels?.length || 0;
    if (channelCount > 0) {
      insights.push({
        type: 'tip',
        title: 'Multi-Channel Story',
        message: `Active on ${channelCount} channel${channelCount > 1 ? 's' : ''}. Pro tip: Tailor each character's voice to match the platform's energy!`,
        icon: 'target',
        color: 'indigo',
      });
    }

    // Season planning insight
    const seasonCount = Object.keys(brand.season_plans || {}).length;
    if (seasonCount > 0) {
      insights.push({
        type: 'insight',
        title: 'Strategic Thinking',
        message: 'Your seasonal planning shows long-term vision. Remember: each season builds on the last, creating continuous narrative flow.',
        icon: 'calendar',
        color: 'cyan',
      });
    }

    reply.send({ insights });
  } catch (error) {
    console.error('Error generating dashboard insights:', error);
    reply.status(500).send({ error: 'Failed to generate insights' });
  }
};

export const getDashboardSettings = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const userId = (request as any).user?.id;

    if (!userId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    // For now, return default settings
    // In the future, this could be stored in user preferences table
    reply.send(DEFAULT_SETTINGS);
  } catch (error) {
    console.error('Error fetching dashboard settings:', error);
    reply.status(500).send({ error: 'Failed to fetch settings' });
  }
};

export const updateDashboardSettings = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const userId = (request as any).user?.id;
    const { briefsEnabled, briefInterval, maxBriefsPerDay } = request.body as any;

    if (!userId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    // Validate settings
    const settings: DashboardSettings = {
      briefsEnabled: briefsEnabled ?? DEFAULT_SETTINGS.briefsEnabled,
      briefInterval: Math.max(1, Math.min(24, briefInterval ?? DEFAULT_SETTINGS.briefInterval)),
      maxBriefsPerDay: Math.max(1, Math.min(10, maxBriefsPerDay ?? DEFAULT_SETTINGS.maxBriefsPerDay)),
    };

    // In the future, save to database
    // For now, just return the validated settings

    reply.send(settings);
  } catch (error) {
    console.error('Error updating dashboard settings:', error);
    reply.status(500).send({ error: 'Failed to update settings' });
  }
};
