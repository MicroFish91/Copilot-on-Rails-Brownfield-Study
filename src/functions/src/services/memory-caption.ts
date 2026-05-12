import { createHash } from 'node:crypto';
import type {
  CaptionRequest,
  CaptionResult,
  ICaptionService,
} from './interfaces/ICaptionService';

export class MemoryCaptionService implements ICaptionService {
  async generate(request: CaptionRequest): Promise<CaptionResult> {
    const hash = createHash('sha1').update(request.bytes).digest('hex').slice(0, 6);
    return { caption: `Memory ${hash}`, fromModel: false };
  }

  async ping(): Promise<boolean> {
    return true;
  }
}
