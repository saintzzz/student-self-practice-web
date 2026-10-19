import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ArenaLiveLobby from './ArenaLiveLobby';
import type { LiveRoom } from '../lib/arenaLive';

vi.mock('../lib/arenaLive', () => ({
  liveRoomCreate: vi.fn(),
  liveRoomJoin: vi.fn(),
  liveRoomLeave: vi.fn(),
  liveRoomStart: vi.fn(),
  liveRoomState: vi.fn(),
  subscribeLiveRoom: vi.fn(),
}));
import {
  liveRoomCreate,
  liveRoomJoin,
  liveRoomLeave,
  liveRoomStart,
  liveRoomState,
  subscribeLiveRoom,
} from '../lib/arenaLive';

const ME = { id: 'me-id', name: 'Minh' };
const ROOM: LiveRoom = {
  id: 'room-1',
  code: 'ABC123',
  seed: 'live-ABC123-1',
  status: 'waiting',
  hostName: '',
  hostId: 'me-id',
  gradeId: 'grade-3',
  programId: 'english',
};

type Handlers = Parameters<typeof subscribeLiveRoom>[2];
let handlers: Handlers | null = null;
const fakeChannel = { send: vi.fn(), sendProgress: vi.fn(), sendFinish: vi.fn(), unsubscribe: vi.fn() };

beforeEach(() => {
  vi.clearAllMocks();
  handlers = null;
  vi.mocked(subscribeLiveRoom).mockImplementation(async (_id, _me, h) => {
    handlers = h;
    return fakeChannel;
  });
  // Default 'waiting' - the joiner reconciliation poll is always ticking,
  // so a racing default would launch onStart mid-test.
  vi.mocked(liveRoomState).mockResolvedValue({ status: 'waiting', hostId: 'me-id', players: [] });
});

describe('ArenaLiveLobby (CR-97)', () => {
  it('menu: create + join controls render; join needs a 6-char code', async () => {
    render(<ArenaLiveLobby gradeId="grade-3" me={ME} onStart={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByTestId('arena-live-lobby')).toBeInTheDocument();
    expect(screen.getByTestId('arena-live-join')).toBeDisabled();
    fireEvent.change(screen.getByTestId('arena-live-code-input'), { target: { value: 'abc123' } });
    expect(screen.getByTestId('arena-live-join')).toBeEnabled();
  });

  it('create -> lobby shows code, roster, host start control', async () => {
    vi.mocked(liveRoomCreate).mockResolvedValue({ ...ROOM });
    render(<ArenaLiveLobby gradeId="grade-3" me={ME} onStart={vi.fn()} onClose={vi.fn()} />);
    fireEvent.click(screen.getByTestId('arena-live-create'));
    await waitFor(() => expect(screen.getByTestId('arena-live-code')).toHaveTextContent('ABC123'));
    expect(screen.getByTestId('arena-live-start')).toHaveTextContent('Chờ thêm bạn vào phòng');
    // A second presence entry unlocks the start button.
    handlers?.onRoster?.([
      { id: 'me-id', name: 'Minh', score: null, timeMs: null, finished: false },
      { id: 'p2', name: 'Lan', score: null, timeMs: null, finished: false },
    ]);
    await waitFor(() => expect(screen.getByTestId('arena-live-start')).toHaveTextContent('2 bạn cùng chơi'));
  });

  it('joiner sees the waiting hint and not the start button', async () => {
    vi.mocked(liveRoomJoin).mockResolvedValue({ ...ROOM, hostId: 'host-id', hostName: 'An' });
    render(<ArenaLiveLobby gradeId="grade-3" me={ME} onStart={vi.fn()} onClose={vi.fn()} />);
    fireEvent.change(screen.getByTestId('arena-live-code-input'), { target: { value: 'ABC123' } });
    fireEvent.click(screen.getByTestId('arena-live-join'));
    await waitFor(() => expect(screen.getByTestId('arena-live-waiting')).toBeInTheDocument());
    expect(screen.queryByTestId('arena-live-start')).not.toBeInTheDocument();
  });

  it('host start: RPC + broadcast + onStart launch', async () => {
    vi.mocked(liveRoomCreate).mockResolvedValue({ ...ROOM });
    vi.mocked(liveRoomStart).mockResolvedValue(ROOM.seed);
    const onStart = vi.fn();
    render(<ArenaLiveLobby gradeId="grade-3" me={ME} onStart={onStart} onClose={vi.fn()} />);
    fireEvent.click(screen.getByTestId('arena-live-create'));
    await waitFor(() => expect(screen.getByTestId('arena-live-code')).toBeInTheDocument());
    handlers?.onRoster?.([
      { id: 'me-id', name: 'Minh', score: null, timeMs: null, finished: false },
      { id: 'p2', name: 'Lan', score: null, timeMs: null, finished: false },
    ]);
    await waitFor(() => expect(screen.getByTestId('arena-live-start')).toBeEnabled());
    fireEvent.click(screen.getByTestId('arena-live-start'));
    await waitFor(() => expect(onStart).toHaveBeenCalledWith({ roomId: 'room-1', code: 'ABC123', seed: ROOM.seed, gradeId: 'grade-3' }));
    expect(liveRoomStart).toHaveBeenCalledWith('room-1');
    expect(fakeChannel.send).toHaveBeenCalledWith({ type: 'start' });
  });

  it('joiner launch waits for the racing state check (fake-start shield)', async () => {
    vi.mocked(liveRoomJoin).mockResolvedValue({ ...ROOM, hostId: 'host-id', hostName: 'An' });
    vi.mocked(liveRoomState).mockResolvedValue({ status: 'waiting', hostId: 'host-id', players: [] });
    const onStart = vi.fn();
    const { unmount } = render(<ArenaLiveLobby gradeId="grade-3" me={ME} onStart={onStart} onClose={vi.fn()} />);
    fireEvent.change(screen.getByTestId('arena-live-code-input'), { target: { value: 'ABC123' } });
    fireEvent.click(screen.getByTestId('arena-live-join'));
    await waitFor(() => expect(screen.getByTestId('arena-live-waiting')).toBeInTheDocument());
    handlers?.onStart?.();
    await waitFor(() => expect(liveRoomState).toHaveBeenCalledWith('room-1'));
    expect(onStart).not.toHaveBeenCalled();
    // A forged start must NOT have flipped roomRef to 'racing' - closing
    // the lobby still releases the waiting-room membership.
    unmount();
    expect(liveRoomLeave).toHaveBeenCalledWith('room-1');
  });

  it('joiner launches from the reconciliation poll even if the broadcast is lost', { timeout: 15_000 }, async () => {
    vi.mocked(liveRoomJoin).mockResolvedValue({ ...ROOM, hostId: 'host-id', hostName: 'An' });
    const onStart = vi.fn();
    render(<ArenaLiveLobby gradeId="grade-3" me={ME} onStart={onStart} onClose={vi.fn()} />);
    fireEvent.change(screen.getByTestId('arena-live-code-input'), { target: { value: 'ABC123' } });
    fireEvent.click(screen.getByTestId('arena-live-join'));
    await waitFor(() => expect(screen.getByTestId('arena-live-waiting')).toBeInTheDocument());
    // No broadcast arrives; the poll (4s interval, real timers) alone
    // must find 'racing' and launch.
    vi.mocked(liveRoomState).mockResolvedValue({ status: 'racing', hostId: 'host-id', players: [] });
    await waitFor(
      () => expect(onStart).toHaveBeenCalledWith({ roomId: 'room-1', code: 'ABC123', seed: ROOM.seed, gradeId: 'grade-3' }),
      { timeout: 10_000 },
    );
  });

  it('a failed channel subscribe releases the persisted membership', async () => {
    vi.mocked(liveRoomCreate).mockResolvedValue({ ...ROOM });
    vi.mocked(subscribeLiveRoom).mockResolvedValue(null);
    render(<ArenaLiveLobby gradeId="grade-3" me={ME} onStart={vi.fn()} onClose={vi.fn()} />);
    fireEvent.click(screen.getByTestId('arena-live-create'));
    await waitFor(() => expect(liveRoomLeave).toHaveBeenCalledWith('room-1'));
    expect(screen.getByText(/Không kết nối được/)).toBeInTheDocument();
  });

  it('host leaving the waiting room bounces the joiner to the menu', async () => {
    vi.mocked(liveRoomJoin).mockResolvedValue({ ...ROOM, hostId: 'host-id', hostName: 'An' });
    render(<ArenaLiveLobby gradeId="grade-3" me={ME} onStart={vi.fn()} onClose={vi.fn()} />);
    fireEvent.change(screen.getByTestId('arena-live-code-input'), { target: { value: 'ABC123' } });
    fireEvent.click(screen.getByTestId('arena-live-join'));
    await waitFor(() => expect(screen.getByTestId('arena-live-waiting')).toBeInTheDocument());
    handlers?.onRoster?.([{ id: 'me-id', name: 'Minh', score: null, timeMs: null, finished: false }]);
    await waitFor(() => expect(screen.getByTestId('arena-live-create')).toBeInTheDocument());
    expect(screen.getByText(/Chủ phòng đã rời/)).toBeInTheDocument();
  });

  it('unmount in the waiting room releases the membership row', async () => {
    vi.mocked(liveRoomCreate).mockResolvedValue({ ...ROOM });
    const { unmount } = render(<ArenaLiveLobby gradeId="grade-3" me={ME} onStart={vi.fn()} onClose={vi.fn()} />);
    fireEvent.click(screen.getByTestId('arena-live-create'));
    await waitFor(() => expect(screen.getByTestId('arena-live-code')).toBeInTheDocument());
    unmount();
    expect(liveRoomLeave).toHaveBeenCalledWith('room-1');
    expect(fakeChannel.unsubscribe).toHaveBeenCalled();
  });
});
