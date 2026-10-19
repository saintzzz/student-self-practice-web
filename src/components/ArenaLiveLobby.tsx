import { useEffect, useRef, useState } from 'react';
import { CARD, BTN_EXAM, BTN_SECONDARY_NAVY } from '../lib/ui/tokens';
import { IconSwords, IconTrophy, IconX } from './icons';
import {
  liveRoomCreate,
  liveRoomJoin,
  liveRoomLeave,
  liveRoomStart,
  liveRoomState,
  subscribeLiveRoom,
  type LiveChannel,
  type LivePlayer,
  type LiveRoom,
} from '../lib/arenaLive';

/** CR-97: Live Arena lobby - create a room or join by code, watch the
 *  roster fill via Realtime presence, host broadcasts start -> every
 *  client races the same seeded set. Guests never reach this screen
 *  (ArenaCard only shows the button to logged-in students). */
export default function ArenaLiveLobby({
  gradeId,
  me,
  onStart,
  onClose,
}: {
  gradeId: string;
  me: { id: string; name: string };
  onStart: (ctx: { roomId: string; code: string; seed: string }) => void;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<'menu' | 'lobby'>('menu');
  const [code, setCode] = useState('');
  const [room, setRoom] = useState<LiveRoom | null>(null);
  const [roster, setRoster] = useState<LivePlayer[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<LiveChannel | null>(null);
  const isHostRef = useRef(false);
  const roomRef = useRef<LiveRoom | null>(null);

  // Cleanup subscription on unmount; leaving a waiting room also drops
  // the membership row so stale lobbies do not linger.
  useEffect(() => {
    return () => {
      channelRef.current?.unsubscribe();
      if (roomRef.current && roomRef.current.status === 'waiting') {
        void liveRoomLeave(roomRef.current.id);
      }
    };
  }, []);

  async function openChannel(r: LiveRoom, asHost: boolean): Promise<boolean> {
    const ch = await subscribeLiveRoom(r.id, me, {
      onRoster: (players) => {
        setRoster(players);
        // Host leaving a waiting room deletes it server-side - bounce
        // joiners back to the menu instead of a dead lobby. Compare by
        // host_id: display names collide.
        if (!asHost && r.hostId && !players.some((p) => p.id === r.hostId)) {
          setError('Chủ phòng đã rời - phòng đã đóng.');
          setRoom(null);
          setMode('menu');
          channelRef.current?.unsubscribe();
          channelRef.current = null;
        }
      },
      onStart: () => {
        // Mark the room racing BEFORE the parent unmounts us, or the
        // cleanup would run arena_live_leave and mark this joiner
        // "bỏ cuộc" the moment the race starts.
        roomRef.current = { ...r, status: 'racing' };
        // A broadcast 'start' is unverified (public channel) - confirm
        // the room really flipped to racing before launching the run.
        void liveRoomState(r.id).then((st) => {
          if (st?.status === 'racing') onStart({ roomId: r.id, code: r.code, seed: r.seed });
        });
      },
      onLeave: (id) => setRoster((cur) => cur.filter((p) => p.id !== id)),
    });
    if (!ch) return false;
    channelRef.current = ch;
    isHostRef.current = asHost;
    roomRef.current = r;
    return true;
  }

  async function handleCreate(): Promise<void> {
    setBusy(true);
    setError(null);
    const r = await liveRoomCreate(gradeId, 'english');
    if (!r) {
      setBusy(false);
      setError('Không tạo được phòng. Em đang có phòng mở hoặc mất mạng - thử lại nhé.');
      return;
    }
    r.hostName = me.name;
    if (!(await openChannel(r, true))) {
      setBusy(false);
      setError('Không kết nối được phòng realtime. Thử lại nhé.');
      return;
    }
    setRoom(r);
    setMode('lobby');
    setBusy(false);
  }

  async function handleJoin(): Promise<void> {
    if (code.trim().length !== 6) {
      setError('Mã phòng gồm 6 ký tự.');
      return;
    }
    setBusy(true);
    setError(null);
    const r = await liveRoomJoin(code);
    if (!r) {
      setBusy(false);
      setError('Không thấy phòng này - kiểm tra lại mã hoặc phòng đã đầy/bắt đầu.');
      return;
    }
    if (!(await openChannel(r, false))) {
      setBusy(false);
      setError('Không kết nối được phòng realtime. Thử lại nhé.');
      return;
    }
    setRoom(r);
    setMode('lobby');
    setBusy(false);
  }

  async function handleStart(): Promise<void> {
    if (!room) return;
    setBusy(true);
    const seed = await liveRoomStart(room.id);
    if (!seed) {
      setBusy(false);
      setError('Chỉ chủ phòng mới bắt đầu được (cần ít nhất 2 bạn).');
      return;
    }
    channelRef.current?.send({ type: 'start' });
    roomRef.current = { ...room, status: 'racing' };
    onStart({ roomId: room.id, code: room.code, seed });
  }

  const isHost = room ? room.hostId === me.id || isHostRef.current : false;

  return (
    <div
      data-testid="arena-live-lobby"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className={`${CARD} w-full max-w-md`}>
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-display text-xl font-extrabold text-amber-300">
            <IconSwords size={20} /> Đấu trực tiếp
          </h2>
          <button type="button" onClick={onClose} aria-label="Đóng" className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white">
            <IconX size={18} />
          </button>
        </div>
        <p className="mt-1 text-sm font-semibold text-slate-300">
          Cùng chơi một lúc - cùng 10 câu, ai nhiều điểm hơn thắng, hòa thì ai nhanh hơn thắng.
        </p>

        {mode === 'menu' && (
          <div className="mt-5 space-y-3">
            <button
              type="button"
              data-testid="arena-live-create"
              disabled={busy}
              onClick={handleCreate}
              className={`w-full ${BTN_EXAM} py-3 disabled:opacity-50`}
            >
              Tạo phòng mới
            </button>
            <div className="flex items-center gap-2">
              <input
                data-testid="arena-live-code-input"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
                placeholder="Nhập mã phòng (6 ký tự)"
                maxLength={6}
                className="min-w-0 flex-1 rounded-xl bg-[#16232e] px-3 py-3 text-center font-mono text-lg font-extrabold tracking-[0.3em] text-white ring-1 ring-white/10 placeholder:font-sans placeholder:text-sm placeholder:font-semibold placeholder:tracking-normal placeholder:text-slate-500"
              />
              <button
                type="button"
                data-testid="arena-live-join"
                disabled={busy || code.trim().length !== 6}
                onClick={handleJoin}
                className={`${BTN_SECONDARY_NAVY} px-4 py-3 disabled:opacity-50`}
              >
                Vào phòng
              </button>
            </div>
          </div>
        )}

        {mode === 'lobby' && room && (
          <div className="mt-5">
            <div className="rounded-xl bg-[#16232e] p-4 text-center ring-1 ring-amber-400/30">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Mã phòng - đọc cho bạn bè</div>
              <div data-testid="arena-live-code" className="mt-1 font-mono text-3xl font-extrabold tracking-[0.35em] text-amber-300">
                {room.code}
              </div>
            </div>
            <div className="mt-4">
              <div className="text-sm font-extrabold text-slate-300">
                Trong phòng ({roster.length}/6)
              </div>
              <ul className="mt-2 space-y-2" data-testid="arena-live-roster">
                {roster.map((p) => (
                  <li key={p.id} className="flex items-center justify-between rounded-xl bg-[#16232e] px-3 py-2 ring-1 ring-white/10">
                    <span className="truncate text-sm font-extrabold text-white">{p.name}</span>
                    {p.id === me.id && <span className="text-xs font-bold text-sky-300">Em</span>}
                    {room.hostId && p.id === room.hostId && (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-300"><IconTrophy size={12} /> Chủ phòng</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
            {isHost ? (
              <button
                type="button"
                data-testid="arena-live-start"
                disabled={busy || roster.length < 2}
                onClick={handleStart}
                className={`mt-4 w-full ${BTN_EXAM} py-3 disabled:opacity-50`}
              >
                {roster.length < 2 ? 'Chờ thêm bạn vào phòng...' : `Bắt đầu - ${roster.length} bạn cùng chơi`}
              </button>
            ) : (
              <p data-testid="arena-live-waiting" className="mt-4 text-center text-sm font-bold text-slate-300">
                Đang chờ {room.hostName || 'chủ phòng'} bắt đầu...
              </p>
            )}
          </div>
        )}

        {error && <p className="mt-3 text-center text-sm font-bold text-rose-300">{error}</p>}
      </div>
    </div>
  );
}
