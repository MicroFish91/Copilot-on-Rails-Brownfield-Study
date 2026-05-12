import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ScrapbookCard } from '../../src/components/ScrapbookCard';
import type { Photo, User } from '@duo-scrapbook/shared';

const photo: Photo = {
  id: 'p1',
  coupleId: 'c1',
  uploadedByUserId: 'u1',
  blobName: 'demo.jpg',
  blobUrl: 'https://example.com/demo.jpg',
  mimeType: 'image/jpeg',
  sizeBytes: 1234,
  caption: 'A caption',
  captionStatus: 'ready',
  takenAt: '2025-09-12T19:11:00.000Z',
  createdAt: '2025-09-12T19:14:21.000Z',
  updatedAt: '2025-09-12T19:14:25.000Z',
};

const uploader: User = {
  id: 'u1',
  email: 'u1@example.com',
  displayName: 'Avery',
  avatarUrl: null,
  coupleId: 'c1',
  createdAt: photo.createdAt,
  updatedAt: photo.updatedAt,
};

describe('ScrapbookCard', () => {
  it('renders the caption and the uploader display name', () => {
    render(
      <ScrapbookCard
        photo={photo}
        uploader={uploader}
        isMine
        onClick={() => undefined}
        onDelete={() => undefined}
        onRegenerate={() => undefined}
      />,
    );
    expect(screen.getByText('A caption')).toBeInTheDocument();
    expect(screen.getByText('Avery')).toBeInTheDocument();
  });

  it('shows the delete button only when the photo is mine', () => {
    const { rerender } = render(
      <ScrapbookCard
        photo={photo}
        uploader={uploader}
        isMine
        onClick={() => undefined}
        onDelete={() => undefined}
        onRegenerate={() => undefined}
      />,
    );
    expect(screen.queryByText('Delete')).toBeInTheDocument();
    rerender(
      <ScrapbookCard
        photo={photo}
        uploader={uploader}
        isMine={false}
        onClick={() => undefined}
        onDelete={() => undefined}
        onRegenerate={() => undefined}
      />,
    );
    expect(screen.queryByText('Delete')).not.toBeInTheDocument();
  });

  it('confirms before invoking onDelete', async () => {
    const onDelete = vi.fn();
    vi.spyOn(window, 'confirm').mockReturnValueOnce(true);
    render(
      <ScrapbookCard
        photo={photo}
        uploader={uploader}
        isMine
        onClick={() => undefined}
        onDelete={onDelete}
        onRegenerate={() => undefined}
      />,
    );
    await userEvent.click(screen.getByText('Delete'));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('does not invoke onDelete if confirm is cancelled', async () => {
    const onDelete = vi.fn();
    vi.spyOn(window, 'confirm').mockReturnValueOnce(false);
    render(
      <ScrapbookCard
        photo={photo}
        uploader={uploader}
        isMine
        onClick={() => undefined}
        onDelete={onDelete}
        onRegenerate={() => undefined}
      />,
    );
    await userEvent.click(screen.getByText('Delete'));
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('invokes onClick when the photo is clicked', () => {
    const onClick = vi.fn();
    render(
      <ScrapbookCard
        photo={photo}
        uploader={uploader}
        isMine={false}
        onClick={onClick}
        onDelete={() => undefined}
        onRegenerate={() => undefined}
      />,
    );
    fireEvent.click(screen.getByLabelText(/Open photo/));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('invokes onRegenerate from the button', async () => {
    const onRegenerate = vi.fn();
    render(
      <ScrapbookCard
        photo={photo}
        uploader={uploader}
        isMine={false}
        onClick={() => undefined}
        onDelete={() => undefined}
        onRegenerate={onRegenerate}
      />,
    );
    await userEvent.click(screen.getByText('Regenerate caption'));
    expect(onRegenerate).toHaveBeenCalledTimes(1);
  });
});
