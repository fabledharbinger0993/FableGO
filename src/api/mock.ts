import type { components } from './schema';

export type Track = components['schemas']['Track'];
export type Playlist = components['schemas']['Playlist'];
export type Job = components['schemas']['Job'];

const initialTracks: Track[] = [
  {
    id: 'track-1',
    title: 'Midnight Signal',
    artist: 'Nova Pulse',
    record: 'After Hours EP',
    bpm: 124,
    key: 'A minor',
    camelot: '8A',
    genre: 'House',
    tags: ['warm-up', 'vocal'],
  },
  {
    id: 'track-2',
    title: 'Blue Current',
    artist: 'Lumen',
    record: 'Tidal Patterns',
    bpm: 126,
    key: 'D minor',
    camelot: '7A',
    genre: 'Deep House',
    tags: ['deep', 'groove'],
  },
  {
    id: 'track-3',
    title: 'First Light',
    artist: 'Nova Pulse',
    record: 'After Hours EP',
    bpm: 128,
    key: 'F major',
    camelot: '7B',
    genre: 'House',
    tags: ['closing', 'bright'],
  },
];

const initialPlaylists: Playlist[] = [
  { id: 'playlist-1', name: 'Afterhours set', trackIds: ['track-1', 'track-2'] },
];

let tracks: Track[] = structuredClone(initialTracks);
let playlists: Playlist[] = structuredClone(initialPlaylists);
let jobs: Job[] = [];
let nextJobId = 1;

export function resetMockData(): void {
  tracks = structuredClone(initialTracks);
  playlists = structuredClone(initialPlaylists);
  jobs = [];
  nextJobId = 1;
}

export async function mockGetTracks(): Promise<Track[]> {
  return structuredClone(tracks);
}

export async function mockUpdateTrackTags(trackId: string, tags: string[]): Promise<Track> {
  const index = tracks.findIndex((track) => track.id === trackId);
  if (index === -1) {
    throw new Error('Track not found');
  }
  tracks[index] = { ...tracks[index], tags: [...tags] };
  return structuredClone(tracks[index]);
}

export async function mockGetPlaylists(): Promise<Playlist[]> {
  return structuredClone(playlists);
}

export async function mockUpdatePlaylist(
  playlistId: string,
  update: components['schemas']['PlaylistUpdate'],
): Promise<Playlist> {
  const index = playlists.findIndex((playlist) => playlist.id === playlistId);
  if (index === -1) {
    throw new Error('Playlist not found');
  }
  const updated = { ...playlists[index], ...structuredClone(update) };
  playlists[index] = updated;
  return structuredClone(updated);
}

function startJob(kind: Job['kind']): Job {
  const job: Job = {
    id: `mock-job-${nextJobId++}`,
    kind,
    status: 'queued',
    message: 'Queued on this computer',
  };
  jobs = [job, ...jobs];
  setTimeout(() => {
    jobs = jobs.map((item) =>
      item.id === job.id ? { ...item, status: 'running', message: 'Running on this computer' } : item,
    );
    setTimeout(() => {
      jobs = jobs.map((item) =>
        item.id === job.id ? { ...item, status: 'done', message: 'Finished successfully' } : item,
      );
    }, 1100);
  }, 500);
  return structuredClone(job);
}

export async function mockRequestDownload(): Promise<Job> {
  return startJob('download');
}

export async function mockRequestImport(): Promise<Job> {
  return startJob('import');
}

export async function mockRequestUsbExport(): Promise<Job> {
  return startJob('usb_export');
}

export async function mockGetJob(jobId: string): Promise<Job> {
  const job = jobs.find((item) => item.id === jobId);
  if (!job) {
    throw new Error('Job not found');
  }
  return structuredClone(job);
}

export async function mockListJobs(): Promise<Job[]> {
  return structuredClone(jobs);
}
