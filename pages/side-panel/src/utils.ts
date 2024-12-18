import type { ThreadData } from './types';

export const formatThreadForLLM = (threadData: ThreadData) => {
  return JSON.stringify(
    {
      channel: threadData.channel,
      messages: threadData.messages.map(message => ({
        user: message.user,
        content: message.text,
        timestamp: new Date(parseFloat(message.ts) * 1000).toISOString(),
        reactions:
          message.reactions?.map(reaction => ({
            emoji: reaction.name,
            count: reaction.count,
          })) || [],
      })),
    },
    null,
    2,
  );
};
