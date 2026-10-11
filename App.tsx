import { StatusBar } from 'expo-status-bar';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  checkServiceReachability,
  getPlaylists,
  getTracks,
  isMockMode,
  listJobs,
  requestDownload,
  requestImport,
  requestUsbExport,
  updatePlaylist,
  type Job,
  type Playlist,
  type Track,
} from './src/api/client';
import { getCachedTracks, saveCachedTracks } from './src/connection/cache';
import { getServiceConfig, saveServiceConfig } from './src/connection/config';
import { tokens } from './src/theme/tokens';

type Tab = 'Library' | 'Playlists' | 'Jobs' | 'Settings';

const tabs: Tab[] = ['Library', 'Playlists', 'Jobs', 'Settings'];

export default function App() {
  const [tab, setTab] = useState<Tab>('Library');
  const [tracks, setTracks] = useState<Track[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [online, setOnline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [bpmMin, setBpmMin] = useState('');
  const [bpmMax, setBpmMax] = useState('');
  const [musicalKey, setMusicalKey] = useState('');
  const [camelot, setCamelot] = useState('');
  const [genre, setGenre] = useState('');
  const [tag, setTag] = useState('');
  const [hostUrl, setHostUrl] = useState('');
  const [token, setToken] = useState('');
  const [purchaseReference, setPurchaseReference] = useState('');
  const [overwrite, setOverwrite] = useState(false);

  const refresh = useCallback(async () => {
    const reachable = await checkServiceReachability();
    setOnline(reachable);
    if (!reachable) {
      try {
        const cached = await getCachedTracks();
        if (cached) {
          setTracks(cached);
        }
      } catch {
        setNotice('Offline. No cached library is available yet.');
      }
      setPlaylists([]);
      setJobs([]);
      return;
    }
    try {
      const [freshTracks, freshPlaylists, freshJobs] = await Promise.all([
        getTracks(),
        getPlaylists(),
        listJobs(),
      ]);
      setTracks(freshTracks);
      setPlaylists(freshPlaylists);
      setJobs(freshJobs);
      setNotice('');
      try {
        await saveCachedTracks(freshTracks);
      } catch {
        setNotice('Library loaded, but the offline cache could not be updated.');
      }
    } catch {
      setNotice('Could not load FableGear data. Check the connection in Settings.');
    }
  }, []);

  useEffect(() => {
    let active = true;
    const start = async () => {
      const config = await getServiceConfig().catch(() => null);
      if (active && config) {
        setHostUrl(config.baseUrl);
      }
      if (active) {
        await refresh();
        setLoading(false);
      }
    };
    void start();
    return () => {
      active = false;
    };
  }, [refresh]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (online) {
        void listJobs().then(setJobs).catch(() => setOnline(false));
      }
    }, 1800);
    return () => clearInterval(interval);
  }, [online]);

  const visibleTracks = useMemo(() => {
    const query = search.trim().toLowerCase();
    const min = bpmMin.trim() ? Number(bpmMin) : undefined;
    const max = bpmMax.trim() ? Number(bpmMax) : undefined;
    return tracks.filter((track) =>
      (!query || `${track.title} ${track.artist} ${track.record}`.toLowerCase().includes(query))
      && (min === undefined || (Number.isFinite(min) && track.bpm >= min))
      && (max === undefined || (Number.isFinite(max) && track.bpm <= max))
      && (!musicalKey.trim() || track.key.toLowerCase().includes(musicalKey.trim().toLowerCase()))
      && (!camelot.trim() || track.camelot.toLowerCase().includes(camelot.trim().toLowerCase()))
      && (!genre.trim() || track.genre.toLowerCase().includes(genre.trim().toLowerCase()))
      && (!tag.trim() || track.tags.some((item) => item.toLowerCase().includes(tag.trim().toLowerCase()))),
    );
  }, [tracks, search, bpmMin, bpmMax, musicalKey, camelot, genre, tag]);

  const updateJobList = useCallback(async () => {
    const freshJobs = await listJobs();
    setJobs(freshJobs);
  }, []);

  const savePlaylist = async (playlist: Playlist) => {
    if (!online) {
      setNotice('Connect to FableGear before editing playlists.');
      return;
    }
    try {
      const saved = await updatePlaylist(playlist.id, {
        name: playlist.name,
        trackIds: playlist.trackIds,
      });
      setPlaylists((items) => items.map((item) => item.id === saved.id ? saved : item));
      setNotice('Playlist updated.');
    } catch {
      setNotice('Playlist could not be updated.');
    }
  };

  const toggleTrack = (playlist: Playlist, trackId: string) => {
    const trackIds = playlist.trackIds.includes(trackId)
      ? playlist.trackIds.filter((id) => id !== trackId)
      : [...playlist.trackIds, trackId];
    void savePlaylist({ ...playlist, trackIds });
  };

  const queueDownload = async () => {
    const value = purchaseReference.trim();
    if (!online || !value) {
      setNotice(online ? 'Enter a purchase link or order reference.' : 'Connect before queuing a download.');
      return;
    }
    try {
      const job = await requestDownload(
        /^https:\/\//i.test(value) ? { purchaseUrl: value } : { orderReference: value },
      );
      setPurchaseReference('');
      await updateJobList();
      setNotice(`Download request accepted as ${job.id}.`);
    } catch {
      setNotice('Download request could not be queued.');
    }
  };

  const importCompletedDownload = async (downloadJobId: string) => {
    if (!online) {
      setNotice('Connect before starting an import.');
      return;
    }
    try {
      await requestImport(downloadJobId);
      await updateJobList();
      setNotice('Import request accepted.');
    } catch {
      setNotice('Import request could not be queued.');
    }
  };

  const runUsbExport = async (dryRun: boolean) => {
    if (!online) {
      setNotice('Connect before starting a USB export.');
      return;
    }
    const playlist = playlists[0];
    if (!playlist) {
      setNotice('Create a playlist before exporting.');
      return;
    }
    const start = async () => {
      try {
        const result = await requestUsbExport({
          playlistId: playlist.id,
          dryRun,
          overwrite,
          confirmed: dryRun || !overwrite,
        });
        if ('itemCount' in result) {
          setNotice(`Dry run complete: ${result.itemCount} tracks would be exported.`);
        } else {
          await updateJobList();
          setNotice(`USB export accepted as ${result.id}.`);
        }
      } catch {
        setNotice('USB export could not be started.');
      }
    };
    if (!dryRun && overwrite) {
      Alert.alert(
        'Confirm USB overwrite',
        'This export may replace files on the USB drive. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Continue',
            style: 'destructive',
            onPress: () => {
              void requestUsbExport({
                playlistId: playlist.id,
                dryRun: false,
                overwrite: true,
                confirmed: true,
              }).then(updateJobList).then(() => setNotice('USB export queued.')).catch(() => {
                setNotice('USB export could not be started.');
              });
            },
          },
        ],
      );
    } else {
      await start();
    }
  };

  const pairService = async () => {
    try {
      await saveServiceConfig(hostUrl, token);
      setToken('');
      setNotice('Pairing details stored securely. Checking the connection…');
      await refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Pairing details could not be saved.');
    }
  };

  return (
    <View style={styles.app}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>FABLE<Text style={styles.brandAccent}>GO</Text></Text>
          <Text style={styles.kicker}>RECORD ROOM</Text>
        </View>
        <View style={styles.connectionBadge}>
          <View style={[styles.connectionDot, online ? styles.onlineDot : styles.offlineDot]} />
          <Text style={styles.connectionText}>{online ? 'Connected' : 'Offline'}</Text>
        </View>
      </View>
      <View style={styles.pageTitleRow}>
        <Text style={styles.pageTitle}>{tab}</Text>
        {isMockMode && <Text style={styles.mockBadge}>MOCK</Text>}
      </View>
      {notice ? <Text accessibilityRole="alert" style={styles.notice}>{notice}</Text> : null}
      {loading ? (
        <View style={styles.loading}><ActivityIndicator color={tokens.color.accent} /></View>
      ) : (
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentInner}
          keyboardShouldPersistTaps="handled"
        >
          {tab === 'Library' && (
            <>
              <TextInput
                accessibilityLabel="Search library"
                placeholder="Search tracks, artists, records"
                placeholderTextColor={tokens.color.muted}
                value={search}
                onChangeText={setSearch}
                style={styles.input}
              />
              <View style={styles.filterGrid}>
                <TextInput accessibilityLabel="Minimum BPM" placeholder="BPM min" keyboardType="decimal-pad" value={bpmMin} onChangeText={setBpmMin} style={styles.filterInput} placeholderTextColor={tokens.color.muted} />
                <TextInput accessibilityLabel="Maximum BPM" placeholder="BPM max" keyboardType="decimal-pad" value={bpmMax} onChangeText={setBpmMax} style={styles.filterInput} placeholderTextColor={tokens.color.muted} />
                <TextInput accessibilityLabel="Musical key filter" placeholder="Musical key" value={musicalKey} onChangeText={setMusicalKey} style={styles.filterInput} placeholderTextColor={tokens.color.muted} />
                <TextInput accessibilityLabel="Camelot key filter" placeholder="Camelot" value={camelot} onChangeText={setCamelot} style={styles.filterInput} placeholderTextColor={tokens.color.muted} />
                <TextInput accessibilityLabel="Genre filter" placeholder="Genre" value={genre} onChangeText={setGenre} style={styles.filterInput} placeholderTextColor={tokens.color.muted} />
                <TextInput accessibilityLabel="Tag filter" placeholder="Tag" value={tag} onChangeText={setTag} style={styles.filterInput} placeholderTextColor={tokens.color.muted} />
              </View>
              <Text style={styles.resultCount}>{visibleTracks.length} TRACKS</Text>
              {visibleTracks.map((track) => <TrackCard key={track.id} track={track} />)}
              {!visibleTracks.length && <EmptyState text="No tracks match those filters." />}
            </>
          )}

          {tab === 'Playlists' && (
            playlists.length ? playlists.map((playlist) => (
              <View key={playlist.id} style={styles.section}>
                <Text style={styles.sectionTitle}>{playlist.name}</Text>
                <Text style={styles.mutedText}>{playlist.trackIds.length} tracks · Record Room</Text>
                {tracks.map((track) => {
                  const included = playlist.trackIds.includes(track.id);
                  return (
                    <View key={track.id} style={styles.playlistTrack}>
                      <View style={styles.trackText}>
                        <Text style={styles.trackTitle}>{track.title}</Text>
                        <Text style={styles.trackSubtitle}>{track.artist}</Text>
                      </View>
                      <ActionButton
                        label={included ? 'Remove' : 'Add'}
                        disabled={!online}
                        secondary={!included}
                        onPress={() => toggleTrack(playlist, track.id)}
                      />
                    </View>
                  );
                })}
              </View>
            )) : <EmptyState text="No playlists are available from Record Room." />
          )}

          {tab === 'Jobs' && (
            <>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Request a download</Text>
                <Text style={styles.mutedText}>Send a purchase link or order reference to your computer.</Text>
                <TextInput
                  accessibilityLabel="Purchase link or order reference"
                  placeholder="Purchase link or order reference"
                  placeholderTextColor={tokens.color.muted}
                  value={purchaseReference}
                  onChangeText={setPurchaseReference}
                  style={styles.input}
                  autoCapitalize="none"
                />
                <ActionButton label="Request download" disabled={!online} onPress={() => void queueDownload()} />
              </View>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>USB export</Text>
                <Text style={styles.mutedText}>Export a playlist using Chop Shop on your computer.</Text>
                <ActionButton label="Preview export (dry run)" secondary disabled={!online} onPress={() => void runUsbExport(true)} />
                <TouchableOpacity
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: overwrite, disabled: !online }}
                  onPress={() => setOverwrite((value) => !value)}
                  disabled={!online}
                  style={styles.overwriteRow}
                >
                  <View style={[styles.checkbox, overwrite && styles.checkedBox]}>
                    {overwrite && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text style={styles.bodyText}>Allow overwriting USB files</Text>
                </TouchableOpacity>
                <ActionButton label="Queue USB export" disabled={!online} onPress={() => void runUsbExport(false)} />
              </View>
              <Text style={styles.sectionTitle}>Computer jobs</Text>
              {jobs.map((job) => (
                <View key={job.id} style={styles.jobCard}>
                  <View style={styles.jobHeading}>
                    <Text style={styles.trackTitle}>{job.kind.replace('_', ' ')}</Text>
                    <Text style={[styles.jobStatus, job.status === 'done' ? styles.statusDone : styles.statusActive]}>
                      {job.status.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.mutedText}>{job.message ?? job.id}</Text>
                  {job.kind === 'download' && job.status === 'done' && (
                    <ActionButton label="Import into Record Room" disabled={!online} onPress={() => void importCompletedDownload(job.id)} />
                  )}
                </View>
              ))}
              {!jobs.length && <EmptyState text="Jobs from your computer will appear here." />}
            </>
          )}

          {tab === 'Settings' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Pair with FableGear</Text>
              <Text style={styles.mutedText}>
                Enter the HTTPS Tailscale address and service token. The token is stored in your device secure store.
              </Text>
              <Text style={styles.fieldLabel}>TAILSCALE SERVICE ADDRESS</Text>
              <TextInput
                accessibilityLabel="Tailscale service address"
                placeholder="https://computer.example.ts.net"
                placeholderTextColor={tokens.color.muted}
                value={hostUrl}
                onChangeText={setHostUrl}
                autoCapitalize="none"
                keyboardType="url"
                style={styles.input}
              />
              <Text style={styles.fieldLabel}>SERVICE TOKEN</Text>
              <TextInput
                accessibilityLabel="Service token"
                placeholder="Enter token (never displayed)"
                placeholderTextColor={tokens.color.muted}
                value={token}
                onChangeText={setToken}
                autoCapitalize="none"
                secureTextEntry
                style={styles.input}
              />
              <ActionButton label="Save and connect" onPress={() => void pairService()} />
              <ActionButton label="Check connection" secondary onPress={() => void refresh()} />
              <Text style={styles.connectionSummary}>
                {online ? 'Computer reachable over the tailnet.' : 'Computer unavailable. Cached library is read-only; new work is not queued.'}
              </Text>
              {isMockMode && <Text style={styles.mutedText}>Mock service is active. Set EXPO_PUBLIC_USE_MOCK_API=false to use a paired computer.</Text>}
            </View>
          )}
        </ScrollView>
      )}
      <View style={styles.tabBar}>
        {tabs.map((item) => (
          <TouchableOpacity
            key={item}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === item }}
            onPress={() => {
              setTab(item);
              setNotice('');
            }}
            style={styles.tabButton}
          >
            <Text style={[styles.tabText, tab === item && styles.activeTabText]}>{item}</Text>
            {tab === item && <View style={styles.activeIndicator} />}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function TrackCard({ track }: { track: Track }) {
  return (
    <View style={styles.trackCard}>
      <View style={styles.trackText}>
        <Text style={styles.trackTitle}>{track.title}</Text>
        <Text style={styles.trackSubtitle}>{track.artist} · {track.record}</Text>
        <Text style={styles.trackTags}>{track.genre}  ·  {track.tags.join('  ·  ')}</Text>
      </View>
      <View style={styles.trackMeta}>
        <Text style={styles.bpm}>{track.bpm}</Text>
        <Text style={styles.trackSubtitle}>{track.key} · {track.camelot}</Text>
      </View>
    </View>
  );
}

function ActionButton({
  label,
  onPress,
  disabled = false,
  secondary = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
}) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.actionButton, secondary && styles.secondaryButton, disabled && styles.disabledButton]}
    >
      <Text style={[styles.actionButtonText, secondary && styles.secondaryButtonText]}>{label}</Text>
    </TouchableOpacity>
  );
}

function EmptyState({ text }: { text: string }) {
  return <Text style={styles.emptyState}>{text}</Text>;
}

const styles = StyleSheet.create({
  app: {
    flex: 1,
    backgroundColor: tokens.color.background,
    paddingTop: 56,
  },
  header: {
    minHeight: 56,
    paddingHorizontal: tokens.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: {
    color: tokens.color.text,
    fontSize: tokens.type.label,
    fontWeight: tokens.type.weightBold,
    letterSpacing: 1.4,
  },
  brandAccent: { color: tokens.color.accent },
  kicker: {
    color: tokens.color.muted,
    fontSize: tokens.type.caption,
    letterSpacing: 1.3,
    marginTop: tokens.spacing.xxs,
  },
  connectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.xs,
    borderColor: tokens.color.border,
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: tokens.spacing.xs,
  },
  connectionDot: { width: 8, height: 8, borderRadius: 4 },
  onlineDot: { backgroundColor: tokens.color.success },
  offlineDot: { backgroundColor: tokens.color.warning },
  connectionText: { color: tokens.color.text, fontSize: tokens.type.caption },
  pageTitleRow: {
    paddingHorizontal: tokens.spacing.lg,
    paddingTop: tokens.spacing.lg,
    paddingBottom: tokens.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
  },
  pageTitle: { color: tokens.color.text, fontSize: tokens.type.title, fontWeight: tokens.type.weightBold },
  mockBadge: {
    color: tokens.color.accent,
    borderColor: tokens.color.accentStrong,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: tokens.spacing.xs,
    paddingVertical: tokens.spacing.xxs,
    fontSize: tokens.type.caption,
    fontWeight: tokens.type.weightBold,
  },
  notice: {
    color: tokens.color.accent,
    paddingHorizontal: tokens.spacing.lg,
    paddingBottom: tokens.spacing.xs,
    fontSize: tokens.type.caption,
  },
  content: { flex: 1 },
  contentInner: {
    paddingHorizontal: tokens.spacing.lg,
    paddingBottom: tokens.spacing.lg,
    gap: tokens.spacing.sm,
  },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  input: {
    minHeight: 52,
    color: tokens.color.text,
    backgroundColor: tokens.color.surface,
    borderColor: tokens.color.border,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: tokens.spacing.md,
    fontSize: tokens.type.body,
  },
  filterGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.spacing.xs },
  filterInput: {
    minWidth: '30%',
    flexGrow: 1,
    minHeight: 46,
    color: tokens.color.text,
    backgroundColor: tokens.color.surface,
    borderColor: tokens.color.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: tokens.spacing.sm,
    fontSize: tokens.type.caption,
  },
  resultCount: {
    color: tokens.color.muted,
    fontSize: tokens.type.caption,
    fontWeight: tokens.type.weightBold,
    letterSpacing: 1.1,
    marginTop: tokens.spacing.sm,
  },
  trackCard: {
    minHeight: 92,
    backgroundColor: tokens.color.surface,
    borderColor: tokens.color.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: tokens.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacing.sm,
  },
  trackText: { flex: 1, gap: tokens.spacing.xxs },
  trackTitle: { color: tokens.color.text, fontSize: tokens.type.label, fontWeight: tokens.type.weightMedium },
  trackSubtitle: { color: tokens.color.muted, fontSize: tokens.type.caption },
  trackTags: { color: tokens.color.accent, fontSize: tokens.type.caption },
  trackMeta: { alignItems: 'flex-end', gap: tokens.spacing.xxs },
  bpm: { color: tokens.color.accent, fontSize: tokens.type.heading, fontWeight: tokens.type.weightBold },
  section: {
    backgroundColor: tokens.color.surface,
    borderColor: tokens.color.border,
    borderWidth: 1,
    borderRadius: 18,
    padding: tokens.spacing.md,
    gap: tokens.spacing.sm,
  },
  sectionTitle: { color: tokens.color.text, fontSize: tokens.type.heading, fontWeight: tokens.type.weightBold },
  mutedText: { color: tokens.color.muted, fontSize: tokens.type.body, lineHeight: 21 },
  bodyText: { color: tokens.color.text, fontSize: tokens.type.body },
  playlistTrack: {
    minHeight: 64,
    borderTopWidth: 1,
    borderTopColor: tokens.color.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacing.xs,
  },
  actionButton: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: tokens.color.accent,
    paddingHorizontal: tokens.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButton: {
    backgroundColor: tokens.color.surfaceRaised,
    borderColor: tokens.color.border,
    borderWidth: 1,
  },
  actionButtonText: { color: tokens.color.background, fontSize: tokens.type.body, fontWeight: tokens.type.weightBold },
  secondaryButtonText: { color: tokens.color.text },
  disabledButton: { opacity: 0.42 },
  fieldLabel: { color: tokens.color.accent, fontSize: tokens.type.caption, fontWeight: tokens.type.weightBold },
  connectionSummary: { color: tokens.color.text, fontSize: tokens.type.body, lineHeight: 22 },
  overwriteRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 1,
    borderColor: tokens.color.muted,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkedBox: { backgroundColor: tokens.color.accent, borderColor: tokens.color.accent },
  checkmark: { color: tokens.color.background, fontWeight: tokens.type.weightBold },
  jobCard: {
    backgroundColor: tokens.color.surface,
    borderColor: tokens.color.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: tokens.spacing.md,
    gap: tokens.spacing.sm,
  },
  jobHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  jobStatus: { fontSize: tokens.type.caption, fontWeight: tokens.type.weightBold, letterSpacing: 0.6 },
  statusDone: { color: tokens.color.success },
  statusActive: { color: tokens.color.warning },
  emptyState: {
    color: tokens.color.muted,
    backgroundColor: tokens.color.surface,
    borderRadius: 16,
    padding: tokens.spacing.lg,
    textAlign: 'center',
    fontSize: tokens.type.body,
  },
  tabBar: {
    minHeight: 72,
    borderTopColor: tokens.color.border,
    borderTopWidth: 1,
    backgroundColor: tokens.color.surface,
    flexDirection: 'row',
    paddingBottom: tokens.spacing.xs,
  },
  tabButton: { flex: 1, minHeight: 64, alignItems: 'center', justifyContent: 'center', gap: tokens.spacing.xs },
  tabText: { color: tokens.color.tabInactive, fontSize: tokens.type.caption, fontWeight: tokens.type.weightMedium },
  activeTabText: { color: tokens.color.accent },
  activeIndicator: { position: 'absolute', top: 0, width: 28, height: 2, backgroundColor: tokens.color.accent },
});
