import type {
  BlobInfo,
  IBlobStorageService,
  PutBlobOptions,
} from './interfaces/IBlobStorageService';

interface StoredBlob {
  bytes: Buffer;
  contentType: string;
  metadata: Record<string, string>;
}

export class MemoryBlobStorageService implements IBlobStorageService {
  private blobs: Map<string, StoredBlob> = new Map();

  async put(
    blobName: string,
    body: Buffer,
    options: PutBlobOptions,
  ): Promise<BlobInfo> {
    this.blobs.set(blobName, {
      bytes: Buffer.from(body),
      contentType: options.contentType,
      metadata: { ...(options.metadata ?? {}) },
    });
    return {
      blobName,
      url: `memory://photos/${blobName}`,
      sizeBytes: body.length,
    };
  }

  async get(blobName: string): Promise<Buffer> {
    const b = this.blobs.get(blobName);
    if (!b) throw new Error(`Blob not found: ${blobName}`);
    return Buffer.from(b.bytes);
  }

  async delete(blobName: string): Promise<void> {
    this.blobs.delete(blobName);
  }

  async ping(): Promise<boolean> {
    return true;
  }

  /** Test helper. */
  has(blobName: string): boolean {
    return this.blobs.has(blobName);
  }
}
