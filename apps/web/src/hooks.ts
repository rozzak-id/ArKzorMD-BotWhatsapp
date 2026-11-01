import { useEffect, useState } from 'preact/hooks';
import { api } from './api';
import type { StatusResponse } from './types';

export interface AsyncState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  reload: () => void;
}

/** Helper fetch sederhana dengan state loading/error dan tombol muat ulang. */
export function useAsync<T>(loader: () => Promise<T>, deps: readonly unknown[] = []): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    loader()
      .then((value) => {
        if (!alive) return;
        setData(value);
        setError(null);
      })
      .catch((reason: unknown) => {
        if (!alive) return;
        setError(reason instanceof Error ? reason.message : String(reason));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  return { data, error, loading, reload: () => setNonce((value) => value + 1) };
}

/**
 * Status real-time lewat WebSocket, dengan polling sebagai fallback
 * (berguna saat reverse proxy belum meneruskan upgrade).
 */
export function useLiveStatus(): { status: StatusResponse | null; error: string | null } {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    let socket: WebSocket | null = null;

    const load = () => {
      api
        .status()
        .then((next) => {
          if (!alive) return;
          setStatus(next);
          setError(null);
        })
        .catch((reason: unknown) => {
          if (!alive) return;
          setError(reason instanceof Error ? reason.message : String(reason));
        });
    };

    load();
    const timer = window.setInterval(load, 3_000);

    try {
      const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
      socket = new WebSocket(`${protocol}://${location.host}/ws`);
      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(String(event.data)) as {
            type?: string;
            data?: StatusResponse;
          };
          if (payload.type === 'status' && payload.data && alive) {
            setStatus(payload.data);
            setError(null);
          }
        } catch {
          // abaikan frame yang tidak dikenal
        }
      };
      socket.onerror = () => socket?.close();
    } catch {
      // polling tetap berjalan
    }

    return () => {
      alive = false;
      window.clearInterval(timer);
      socket?.close();
    };
  }, []);

  return { status, error };
}
