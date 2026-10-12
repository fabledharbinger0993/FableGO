import type { components, paths } from './schema';
import {
  mockGetJob,
  mockGetPlaylists,
  mockGetTracks,
  mockListJobs,
  mockRequestDownload,
  mockRequestImport,
  mockRequestUsbExport,
  mockUpdateTrackTags,
  mockUpdatePlaylist,
  type Job,
  type Playlist,
  type Track,
} from './mock';
import { getServiceConfig } from '../connection/config';

export type { Job, Playlist, Track };
export const isMockMode = process.env.EXPO_PUBLIC_USE_MOCK_API !== 'false';

type TrackQuery = {
  q?: string;
  bpmMin?: number;
  bpmMax?: number;
  key?: string;
  camelot?: string;
  genre?: string;
  tag?: string;
};

type DownloadRequest = {
  purchaseUrl?: string;
  orderReference?: string;
  dryRun?: boolean;
};

type ExportRequest = {
  playlistId: string;
  dryRun: boolean;
  overwrite: boolean;
  confirmed: boolean;
};

async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const config = await getServiceConfig();
  if (!config) {
    throw new Error('Pair with a FableGear computer in Settings first');
  }
  const response = await fetch(`${config.baseUrl}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      Authorization: 'Bearer ' + config.token,
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
  });
  if (!response.ok) {
    throw new Error(`FableGear request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

export async function getTracks(query: TrackQuery = {}): Promise<Track[]> {
  if (isMockMode) {
    const result = await mockGetTracks();
    return result.filter((track) =>
      (!query.q || `${track.title} ${track.artist} ${track.record}`.toLowerCase().includes(query.q.toLowerCase()))
      && (query.bpmMin === undefined || track.bpm >= query.bpmMin)
      && (query.bpmMax === undefined || track.bpm <= query.bpmMax)
      && (!query.key || track.key.toLowerCase() === query.key.toLowerCase())
      && (!query.camelot || track.camelot.toLowerCase() === query.camelot.toLowerCase())
      && (!query.genre || track.genre.toLowerCase().includes(query.genre.toLowerCase()))
      && (!query.tag || track.tags.some((tag) => tag.toLowerCase().includes(query.tag!.toLowerCase()))),
    );
  }
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      params.set(key, String(value));
    }
  });
  const suffix = params.size ? `?${params.toString()}` : '';
  const response = await request<paths['/library/tracks']['get']['responses'][200]['content']['application/json']>(
    `/library/tracks${suffix}`,
  );
  return response.tracks;
}

export async function getPlaylists(): Promise<Playlist[]> {
  if (isMockMode) {
    return mockGetPlaylists();
  }
  const response = await request<components['schemas']['Playlist'][] | { playlists: Playlist[] }>(
    '/playlists',
  );
  return Array.isArray(response) ? response : response.playlists;
}

export async function updateTrackTags(trackId: string, tags: string[]): Promise<Track> {
  if (isMockMode) {
    return mockUpdateTrackTags(trackId, tags);
  }
  return request<Track>(`/library/tracks/${encodeURIComponent(trackId)}/tags`, {
    method: 'PUT',
    body: JSON.stringify({ tags }),
  });
}

export async function updatePlaylist(
  playlistId: string,
  update: components['schemas']['PlaylistUpdate'],
): Promise<Playlist> {
  if (isMockMode) {
    return mockUpdatePlaylist(playlistId, update);
  }
  return request<Playlist>(`/playlists/${encodeURIComponent(playlistId)}`, {
    method: 'PUT',
    body: JSON.stringify(update),
  });
}

export async function requestDownload(input: DownloadRequest): Promise<Job> {
  if (isMockMode) {
    return mockRequestDownload();
  }
  return request<Job>('/downloads', { method: 'POST', body: JSON.stringify(input) });
}

export async function requestImport(downloadJobId: string, dryRun = false): Promise<Job> {
  if (isMockMode) {
    return mockRequestImport();
  }
  return request<Job>('/imports', {
    method: 'POST',
    body: JSON.stringify({ downloadJobId, dryRun }),
  });
}

export async function requestUsbExport(input: ExportRequest): Promise<Job | { dryRun: true; itemCount: number }> {
  if (!input.dryRun && !input.confirmed) {
    throw new Error('Confirm the USB export before starting it');
  }
  if (isMockMode) {
    return input.dryRun ? { dryRun: true, itemCount: 3 } : mockRequestUsbExport();
  }
  return request('/exports/usb', { method: 'POST', body: JSON.stringify(input) });
}

export async function getJob(jobId: string): Promise<Job> {
  if (isMockMode) {
    return mockGetJob(jobId);
  }
  return request<Job>(`/jobs/${encodeURIComponent(jobId)}`);
}

export async function listJobs(): Promise<Job[]> {
  if (isMockMode) {
    return mockListJobs();
  }
  const response = await request<components['schemas']['Job'][] | { jobs: Job[] }>('/jobs');
  return Array.isArray(response) ? response : response.jobs;
}

export async function checkServiceReachability(): Promise<boolean> {
  if (isMockMode) {
    return true;
  }
  try {
    await request<unknown>('/health');
    return true;
  } catch {
    return false;
  }
}
