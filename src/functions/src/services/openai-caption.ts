import { AzureOpenAI } from 'openai';
import type { Logger } from 'pino';
import type {
  CaptionRequest,
  CaptionResult,
  ICaptionService,
} from './interfaces/ICaptionService';

export interface OpenAICaptionConfig {
  endpoint: string;
  apiKey: string;
  deployment: string;
  apiVersion: string;
}

const FALLBACK_CAPTION = 'A new memory.';

export class OpenAICaptionService implements ICaptionService {
  private readonly cfg: OpenAICaptionConfig | null;
  private readonly logger: Logger | undefined;
  private clientCache: AzureOpenAI | null | undefined;

  constructor(cfg: OpenAICaptionConfig | null, logger?: Logger) {
    this.cfg = cfg;
    this.logger = logger;
  }

  private getClient(): AzureOpenAI | null {
    if (this.clientCache !== undefined) return this.clientCache;
    if (!this.cfg) {
      this.clientCache = null;
      return null;
    }
    try {
      this.clientCache = new AzureOpenAI({
        endpoint: this.cfg.endpoint,
        apiKey: this.cfg.apiKey,
        apiVersion: this.cfg.apiVersion,
        deployment: this.cfg.deployment,
      });
    } catch (err) {
      this.logger?.warn({ err }, 'Failed to construct AzureOpenAI client');
      this.clientCache = null;
    }
    return this.clientCache;
  }

  async generate(request: CaptionRequest): Promise<CaptionResult> {
    const client = this.getClient();
    if (!client || !this.cfg) {
      return { caption: FALLBACK_CAPTION, fromModel: false };
    }
    try {
      const dataUrl = `data:${request.mimeType};base64,${request.bytes.toString('base64')}`;
      const completion = await client.chat.completions.create({
        model: this.cfg.deployment,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Write a short, warm one-sentence caption for this photo.',
              },
              { type: 'image_url', image_url: { url: dataUrl } },
            ],
          },
        ],
        max_tokens: 60,
      });
      const text = completion.choices[0]?.message?.content?.toString().trim();
      if (!text) return { caption: FALLBACK_CAPTION, fromModel: false };
      return { caption: text, fromModel: true };
    } catch (err) {
      this.logger?.warn({ err }, 'Caption generation failed');
      return { caption: FALLBACK_CAPTION, fromModel: false };
    }
  }

  async ping(): Promise<boolean> {
    return this.getClient() !== null;
  }
}
