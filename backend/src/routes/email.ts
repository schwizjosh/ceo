import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { emailService } from '../services/emailService';
import { authenticate } from '../middleware/auth';
import pool from '../database/db';

interface SendBriefRequest {
  teamMemberIds: string[];
  contentData: {
    title: string;
    channel: string;
    date: string;
    storyHook?: string;
    characterFocus?: string;
    emotionalBeat?: string;
    narrativePurpose?: string;
    mediaType?: string;
    callToAction?: string;
    brief: string;
    suggestedTime?: string;
  };
  brandName: string;
}

export default async function emailRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/email/send-brief
   * Send content brief to team members (supports both IDs and direct emails)
   */
  fastify.post('/send-brief', { preHandler: authenticate as any }, async (req: FastifyRequest, res: FastifyReply) => {
    try {
      const { teamMemberIds, teamMemberEmails, contentData, brandName } = (req.body as any) || {};

      if ((!teamMemberIds || teamMemberIds.length === 0) && (!teamMemberEmails || teamMemberEmails.length === 0)) {
        return res.status(400).send({ error: 'No team members or emails provided' });
      }

      if (!contentData) {
        return res.status(400).send({ error: 'Content data is required' });
      }

      let emails: string[] = [];
      let recipientNames = 'Team';

      // If teamMemberIds provided, fetch from database
      if (teamMemberIds && teamMemberIds.length > 0) {
        const query = `
          SELECT id, name, email
          FROM team_members
          WHERE id = ANY($1::uuid[])
        `;
        const result = await pool.query(query, [teamMemberIds]);

        if (result.rows.length === 0) {
          return res.status(404).send({ error: 'No team members found' });
        }

        emails = result.rows.map((member: any) => member.email);
        recipientNames = result.rows.map((member: any) => member.name).join(', ');
      }
      // Otherwise use direct emails
      else if (teamMemberEmails && teamMemberEmails.length > 0) {
        emails = teamMemberEmails;
        recipientNames = 'Recipient';
      }

      // Send email to all recipients
      const success = await emailService.sendContentBrief(emails, {
        recipientName: recipientNames,
        brandName,
        contentTitle: contentData.title,
        channel: contentData.channel,
        date: contentData.date,
        storyHook: contentData.storyHook,
        characterFocus: contentData.characterFocus,
        emotionalBeat: contentData.emotionalBeat,
        narrativePurpose: contentData.narrativePurpose,
        mediaType: contentData.mediaType,
        callToAction: contentData.callToAction,
        brief: contentData.brief,
        suggestedTime: contentData.suggestedTime,
      });

      if (success) {
        res.send({
          success: true,
          message: `Brief sent to ${emails.length} recipient(s)`,
          recipients: emails.map((email) => ({ email })),
        });
      } else {
        res.status(500).send({ error: 'Failed to send email' });
      }
    } catch (error) {
      console.error('Error sending brief:', error);
      res.status(500).send({ error: 'Failed to send brief email' });
    }
  });

  /**
   * GET /api/email/verify
   * Verify email service configuration
   */
  fastify.get('/verify', { preHandler: authenticate as any }, async (req: FastifyRequest, res: FastifyReply) => {
    try {
      const isConfigured = await emailService.verifyConnection();
      res.send({
        configured: isConfigured,
        message: isConfigured
          ? 'Email service is properly configured'
          : 'Email service configuration needs attention',
      });
    } catch (error) {
      res.status(500).send({
        configured: false,
        error: 'Failed to verify email configuration',
      });
    }
  });

  /**
   * POST /api/email/test
   * Send a test email to verify configuration
   */
  fastify.post('/test', { preHandler: authenticate as any }, async (req: FastifyRequest, res: FastifyReply) => {
    try {
      const { email } = (req.body as any) || {};

      if (!email) {
        return res.status(400).send({ error: 'Email address is required' });
      }

      // Send test content brief
      const success = await emailService.sendContentBrief([email], {
        recipientName: 'Test User',
        brandName: 'Andora Demo',
        contentTitle: 'Sample Content Brief - Instagram Post',
        channel: 'Instagram',
        date: new Date().toISOString().split('T')[0],
        storyHook: 'Behind the scenes of our latest product launch! See how we transformed an idea into reality.',
        characterFocus: 'Sarah Chen, our Creative Director, shares her journey',
        mediaType: 'Carousel Post (3-5 slides)',
        callToAction: 'Swipe to see the full story! Follow for more behind-the-scenes content.',
        brief: `🎨 **Visual Concept:**
Slide 1: Opening shot - Sarah sketching the initial concept
Slide 2: Team brainstorming session with sticky notes
Slide 3: First prototype on the table
Slide 4: Final product in all its glory
Slide 5: CTA - "Your turn! Tag us with your creative process"

📝 **Copy:**
"Every masterpiece starts with a single idea ✨

Swipe to see how @SarahChen turned a napkin sketch into our most loved product yet.

The journey wasn't easy, but the result? Worth every late night, every iteration, every 'what if?'

What's your creative process like? Drop it in the comments! 👇"

🎯 **Hashtags:**
#BehindTheScenes #CreativeProcess #ProductDevelopment #DesignThinking #Innovation`,
        suggestedTime: '10:00 AM',
      });

      if (success) {
        res.send({
          success: true,
          message: `Test email sent successfully to ${email}`,
        });
      } else {
        res.status(500).send({ error: 'Failed to send test email' });
      }
    } catch (error) {
      console.error('Error sending test email:', error);
      res.status(500).send({ error: 'Failed to send test email' });
    }
  });
}
