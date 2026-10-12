import {
  mockGetJob,
  mockGetPlaylists,
  mockGetTracks,
  mockRequestUsbExport,
  mockUpdatePlaylist,
  mockUpdateTrackTags,
  resetMockData,
} from './mock';

describe('FableGear mock API', () => {
  beforeEach(() => {
    resetMockData();
  });

  it('edits playlist membership in Record Room', async () => {
    const [playlist] = await mockGetPlaylists();
    const updated = await mockUpdatePlaylist(playlist.id, {
      name: playlist.name,
      trackIds: ['track-1', 'track-3'],
    });

    expect(updated.trackIds).toEqual(['track-1', 'track-3']);
    expect((await mockGetPlaylists())[0].trackIds).toEqual(['track-1', 'track-3']);
  });

  it('updates track tags in Record Room metadata', async () => {
    const updated = await mockUpdateTrackTags('track-1', ['warm-up', 'favorite']);

    expect(updated.tags).toEqual(['warm-up', 'favorite']);
    expect((await mockGetTracks())[0].tags).toEqual(['warm-up', 'favorite']);
  });

  it('reports USB export as queued, running, then done', async () => {
    jest.useFakeTimers();
    try {
      const job = await mockRequestUsbExport();
      expect(job.status).toBe('queued');

      jest.advanceTimersByTime(500);
      expect((await mockGetJob(job.id)).status).toBe('running');

      jest.advanceTimersByTime(1100);
      expect((await mockGetJob(job.id)).status).toBe('done');
    } finally {
      jest.useRealTimers();
    }
  });
});
