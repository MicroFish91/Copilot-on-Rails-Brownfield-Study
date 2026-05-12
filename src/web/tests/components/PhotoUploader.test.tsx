import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { PhotoUploader } from '../../src/components/PhotoUploader';

function getInput(container: HTMLElement): HTMLInputElement {
  const input = container.querySelector('input[type="file"]');
  if (!(input instanceof HTMLInputElement)) {
    throw new Error('file input not found');
  }
  return input;
}

function setFiles(input: HTMLInputElement, files: File[]) {
  // Bypass jsdom "accept" filtering — we are testing the component's own
  // validation, not the browser's.
  Object.defineProperty(input, 'files', {
    configurable: true,
    value: files,
  });
  fireEvent.change(input);
}

describe('PhotoUploader', () => {
  it('rejects unsupported MIME types', async () => {
    const onUpload = vi.fn();
    const { container } = render(
      <PhotoUploader
        maxBytes={10_000}
        allowedMime={['image/jpeg']}
        onUpload={onUpload}
      />,
    );
    setFiles(getInput(container), [new File(['x'], 'doc.txt', { type: 'text/plain' })]);
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/Unsupported file type/);
    });
    expect(onUpload).not.toHaveBeenCalled();
  });

  it('rejects files larger than maxBytes', async () => {
    const onUpload = vi.fn();
    const { container } = render(
      <PhotoUploader maxBytes={5} allowedMime={['image/jpeg']} onUpload={onUpload} />,
    );
    setFiles(getInput(container), [new File([new Uint8Array(20)], 'huge.jpg', { type: 'image/jpeg' })]);
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/too large/i);
    });
    expect(onUpload).not.toHaveBeenCalled();
  });

  it('calls onUpload for an allowed file', async () => {
    const onUpload = vi.fn().mockResolvedValue(undefined);
    const { container } = render(
      <PhotoUploader maxBytes={10_000} allowedMime={['image/jpeg']} onUpload={onUpload} />,
    );
    setFiles(getInput(container), [new File(['hello'], 'pic.jpg', { type: 'image/jpeg' })]);
    await waitFor(() => expect(onUpload).toHaveBeenCalledTimes(1));
    expect(onUpload.mock.calls[0]?.[0]).toBeInstanceOf(File);
  });
});
