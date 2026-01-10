import Anthropic from '@anthropic-ai/sdk';
import type { ContentBlock, ToolUseBlock } from '@anthropic-ai/sdk/resources/messages';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import {
  SALES_AGENT_SYSTEM_PROMPT,
  SALES_AGENT_TOOLS,
} from '../config/prompts/salesAgent.js';
import type { ChatMessage } from '../types/salesChat.js';

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    const apiKey = config.anthropicApiKey;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is not configured');
    }
    client = new Anthropic({ apiKey });
  }
  return client;
}

export interface StreamCallbacks {
  onTextDelta: (text: string) => void;
  onToolUseStart: (name: string) => void;
  onToolUseComplete: (toolUse: ToolUseBlock) => Promise<string>;
  onError: (error: Error) => void;
  onComplete: () => void;
}

export async function streamSalesChat(
  messages: ChatMessage[],
  timezone: string,
  callbacks: StreamCallbacks
): Promise<void> {
  const anthropic = getClient();

  // Add current time context to system prompt
  const now = new Date();
  const timeContext = `\n\nCurrent date/time: ${now.toLocaleString('en-US', {
    timeZone: timezone,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  })}`;

  const systemPrompt = SALES_AGENT_SYSTEM_PROMPT + timeContext;

  try {
    // Convert messages to Anthropic format
    const anthropicMessages = messages.map((msg) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }));

    let pendingToolUses: ToolUseBlock[] = [];
    let currentToolUse: Partial<ToolUseBlock> | null = null;
    let inputJson = '';

    // Initial request
    const stream = anthropic.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      tools: SALES_AGENT_TOOLS,
      messages: anthropicMessages,
    });

    // Process the stream
    for await (const event of stream) {
      if (event.type === 'content_block_start') {
        if (event.content_block.type === 'tool_use') {
          currentToolUse = {
            type: 'tool_use',
            id: event.content_block.id,
            name: event.content_block.name,
          };
          inputJson = '';
          callbacks.onToolUseStart(event.content_block.name);
        }
      } else if (event.type === 'content_block_delta') {
        if (event.delta.type === 'text_delta') {
          callbacks.onTextDelta(event.delta.text);
        } else if (event.delta.type === 'input_json_delta') {
          inputJson += event.delta.partial_json;
        }
      } else if (event.type === 'content_block_stop') {
        if (currentToolUse && currentToolUse.name) {
          try {
            currentToolUse.input = inputJson ? JSON.parse(inputJson) : {};
          } catch {
            currentToolUse.input = {};
          }
          pendingToolUses.push(currentToolUse as ToolUseBlock);
          currentToolUse = null;
          inputJson = '';
        }
      } else if (event.type === 'message_stop') {
        // Process any pending tool uses
        if (pendingToolUses.length > 0) {
          const toolResults: Array<{
            type: 'tool_result';
            tool_use_id: string;
            content: string;
          }> = [];

          for (const toolUse of pendingToolUses) {
            const result = await callbacks.onToolUseComplete(toolUse);
            toolResults.push({
              type: 'tool_result',
              tool_use_id: toolUse.id,
              content: result,
            });
          }

          // Continue the conversation with tool results
          const continuationMessages = [
            ...anthropicMessages,
            {
              role: 'assistant' as const,
              content: pendingToolUses as ContentBlock[],
            },
            {
              role: 'user' as const,
              content: toolResults,
            },
          ];

          // Reset and continue streaming
          pendingToolUses = [];

          const continuationStream = anthropic.messages.stream({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1024,
            system: systemPrompt,
            tools: SALES_AGENT_TOOLS,
            messages: continuationMessages,
          });

          // Process continuation stream recursively
          for await (const contEvent of continuationStream) {
            if (contEvent.type === 'content_block_delta') {
              if (contEvent.delta.type === 'text_delta') {
                callbacks.onTextDelta(contEvent.delta.text);
              }
            }
          }
        }
      }
    }

    callbacks.onComplete();
  } catch (error) {
    logger.error({ error }, 'Claude API error');
    callbacks.onError(error instanceof Error ? error : new Error(String(error)));
  }
}
