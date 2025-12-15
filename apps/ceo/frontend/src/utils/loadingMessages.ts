/**
 * Loading Messages Configuration
 *
 * Chatty, friendly messages that show what Andora is doing.
 * Makes the user feel in sync and cooperation with Andora.
 */

export type LoadingMessageType =
  | 'ai_prefill_narrative'
  | 'ai_refine_narrative'
  | 'ai_generate_cast'
  | 'ai_generate_theme'
  | 'ai_generate_weekly_subplot'
  | 'ai_generate_calendar'
  | 'ai_generate_content_day'
  | 'ai_generate_content_week'
  | 'ai_generate_content_month'
  | 'ai_regenerate_content'
  | 'ai_refine_content'
  | 'ai_resolve_cast'
  | 'ai_train_cast'
  | 'ai_save_brand'
  | 'ai_processing'
  | 'ai_analyzing';

export const loadingMessages: Record<LoadingMessageType, string[]> = {
  ai_prefill_narrative: [
    "I'm diving deep into your brand's soul...",
    "I'm weaving your brand story with care...",
    "I'm crafting narrative magic just for you...",
    "I'm discovering the heart of your story...",
    "I'm painting your brand's unique picture...",
  ],
  ai_refine_narrative: [
    "I'm polishing your narrative with care...",
    "I'm enhancing your story's emotional impact...",
    "I'm adding storytelling depth to your words...",
    "I'm refining your brand's message...",
    "I'm elevating your narrative to the next level...",
  ],
  ai_generate_cast: [
    "I'm bringing your characters to life...",
    "I'm creating compelling personas for your brand...",
    "I'm sculpting voices that will tell your story...",
    "I'm designing personalities that resonate...",
    "I'm giving life to your brand's storytellers...",
  ],
  ai_generate_theme: [
    "I'm weaving monthly story themes...",
    "I'm creating narrative threads that connect...",
    "I'm designing your content compass...",
    "I'm crafting themes that guide your message...",
    "I'm building the framework for your stories...",
  ],
  ai_generate_weekly_subplot: [
    "I'm creating weekly story arcs...",
    "I'm building narrative tension and flow...",
    "I'm designing your week's journey...",
    "I'm crafting subplots that unfold beautifully...",
    "I'm mapping out your story's progression...",
  ],
  ai_generate_calendar: [
    "I'm building your story-driven content calendar...",
    "I'm creating narrative flow across your timeline...",
    "I'm putting together your content plan...",
    "I'm designing your strategic content journey...",
    "I'm weaving stories throughout your schedule...",
  ],
  ai_generate_content_day: [
    "I'm crafting today's story scene...",
    "I'm selecting the perfect character for this moment...",
    "I'm weaving your weekly subplot into today's content...",
    "I'm creating scroll-stopping content for today...",
    "I'm designing your content brief with creative precision...",
    "I'm mapping out today's narrative beat...",
  ],
  ai_generate_content_week: [
    "I'm building a week of story-driven content...",
    "I'm lining up your week's story...",
    "I'm creating content flow across the week...",
    "I'm designing 7 days of compelling storytelling...",
    "I'm weaving your subplot through the week...",
    "I'm mapping weekly content with character precision...",
  ],
  ai_generate_content_month: [
    "I'm building a month of narrative-driven content...",
    "I'm piecing together 30 days of stories...",
    "I'm creating your monthly content masterpiece...",
    "I'm designing a full month of story arcs...",
    "I'm weaving themes throughout your month...",
    "I'm mapping your entire monthly journey...",
  ],
  ai_regenerate_content: [
    "I'm reimagining this content scene...",
    "I'm creating a fresh take on this story beat...",
    "I'm rethinking character and format choices...",
    "I'm crafting a new creative direction...",
    "I'm finding a better angle for this moment...",
    "I'm redesigning this content with fresh eyes...",
  ],
  ai_refine_content: [
    "I'm adding story magic to your content...",
    "I'm enhancing narrative flow and impact...",
    "I'm polishing your message to perfection...",
    "I'm infusing your content with brand essence...",
    "I'm fine-tuning every word to resonate...",
  ],
  ai_resolve_cast: [
    "I'm understanding your vision for the cast...",
    "I'm refining character profiles with your input...",
    "I'm harmonizing your ideas with brand essence...",
    "I'm bringing clarity to your character lineup...",
    "I'm shaping personas that match your vision...",
  ],
  ai_train_cast: [
    "I'm learning your character voices...",
    "I'm absorbing your cast's unique personalities...",
    "I'm training on your brand storytellers...",
    "I'm internalizing character essence...",
    "I'm getting ready to speak in their voices...",
  ],
  ai_save_brand: [
    "Got it, I'm saving your updates...",
    "I'm locking in your latest changes...",
    "I'm capturing your brand story...",
    "I've got this saved for you...",
  ],
  ai_processing: [
    "I'm on it...",
    "I'm cooking up something good...",
    "I'm making magic happen...",
    "I'm bringing your ideas to life...",
    "Give me just a moment...",
  ],
  ai_analyzing: [
    "I'm reading between the lines...",
    "I'm getting to know your brand's essence...",
    "I'm exploring your story's potential...",
    "I'm finding the perfect narrative angle...",
    "I'm tuning into your unique voice...",
  ],
};

/**
 * Get a random loading message for a specific operation
 */
export const getLoadingMessage = (type: LoadingMessageType): string => {
  const messages = loadingMessages[type];

  // Defensive: return the type as-is if it's not in our predefined messages
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    console.warn(`[getLoadingMessage] Invalid or missing type: "${type}"`);
    return String(type);
  }

  return messages[Math.floor(Math.random() * messages.length)];
};

/**
 * Get a loading message with rotation (cycles through messages)
 * Useful for operations that take a while
 */
let messageIndices: Record<LoadingMessageType, number> = {} as any;

export const getRotatingLoadingMessage = (type: LoadingMessageType): string => {
  if (!messageIndices[type]) {
    messageIndices[type] = 0;
  }

  const messages = loadingMessages[type];
  const message = messages[messageIndices[type]];

  // Move to next message for next call
  messageIndices[type] = (messageIndices[type] + 1) % messages.length;

  return message;
};

/**
 * Reset message rotation for a specific type
 */
export const resetMessageRotation = (type?: LoadingMessageType): void => {
  if (type) {
    messageIndices[type] = 0;
  } else {
    messageIndices = {} as any;
  }
};
