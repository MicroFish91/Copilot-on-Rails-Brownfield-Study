/**
 * Blob storage interface — abstracts the photo-bytes store.
 * Concrete impls: azure-blob-storage (Azure SDK) and memory-blob-storage (in-memory fake).
 */

export interface PutBlobOptions {
  contentType: string;
  /** Optional metadata key/values stored alongside the blob. */
  metadata?: Record<string, string>;
}

export interface BlobInfo {
  blobName: string;
  url: string;
  sizeBytes: number;
}

export interface IBlobStorageService {
  /** Upload bytes; returns the resulting blob URL and size. */
  put(blobName: string, body: Buffer, options: PutBlobOptions): Promise<BlobInfo>;

  /** Download bytes for a blob. Throws if missing. */
  get(blobName: string): Promise<Buffer>;

  /** Delete a blob. Idempotent — missing blobs do not throw. */
  delete(blobName: string): Promise<void>;

  /** Health probe — `true` if the container is reachable. */
  ping(): Promise<boolean>;
}
