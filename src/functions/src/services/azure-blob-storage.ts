import {
  BlobServiceClient,
  RestError,
  type ContainerClient,
} from '@azure/storage-blob';
import type {
  BlobInfo,
  IBlobStorageService,
  PutBlobOptions,
} from './interfaces/IBlobStorageService';

export class AzureBlobStorageService implements IBlobStorageService {
  private readonly container: ContainerClient;
  private initialized = false;

  constructor(input: { connectionString: string; containerName: string }) {
    const service = BlobServiceClient.fromConnectionString(input.connectionString);
    this.container = service.getContainerClient(input.containerName);
  }

  private async ensureContainer(): Promise<void> {
    if (this.initialized) return;
    await this.container.createIfNotExists();
    this.initialized = true;
  }

  async put(
    blobName: string,
    body: Buffer,
    options: PutBlobOptions,
  ): Promise<BlobInfo> {
    await this.ensureContainer();
    const blockBlob = this.container.getBlockBlobClient(blobName);
    await blockBlob.uploadData(body, {
      blobHTTPHeaders: { blobContentType: options.contentType },
      metadata: options.metadata,
    });
    return {
      blobName,
      url: blockBlob.url,
      sizeBytes: body.length,
    };
  }

  async get(blobName: string): Promise<Buffer> {
    const blockBlob = this.container.getBlockBlobClient(blobName);
    const buf = await blockBlob.downloadToBuffer();
    return buf;
  }

  async delete(blobName: string): Promise<void> {
    try {
      await this.container.deleteBlob(blobName);
    } catch (err) {
      if (err instanceof RestError && err.code === 'BlobNotFound') return;
      throw err;
    }
  }

  async ping(): Promise<boolean> {
    try {
      await this.container.getProperties();
      return true;
    } catch {
      return false;
    }
  }
}
