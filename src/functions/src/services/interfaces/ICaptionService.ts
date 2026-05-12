/**
 * Caption service interface — abstracts the AI caption generator.
 * Concrete impls: openai-caption (Azure OpenAI GPT-4o vision) and memory-caption (placeholder).
 *
 * Classified as Enhancement: constructors MUST NOT throw; failures fall back
 * to a placeholder caption and are surfaced via captionStatus = 'failed'.
 */

export interface CaptionRequest {
  /** Raw image bytes. */
  bytes: Buffer;
  /** MIME type, e.g. image/jpeg. */
  mimeType: string;
  /** Optional context to nudge the caption (e.g. taken-at, uploader name). */
  hints?: {
    takenAt?: string;
    uploaderDisplayName?: string;
  };
}

export interface CaptionResult {
  caption: string;
  /** Whether this came from the model (`true`) or the placeholder fallback (`false`). */
  fromModel: boolean;
}

export interface ICaptionService {
  generate(request: CaptionRequest): Promise<CaptionResult>;
  /** Health probe — `true` if the caption backend is reachable + configured. */
  ping(): Promise<boolean>;
}
