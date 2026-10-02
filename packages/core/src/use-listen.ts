/** Listen to a live call through a hidden, receive-only LiveKit seat. */

import { Room, RoomEvent, Track, type RemoteTrack } from "livekit-client";
import { useCallback, useEffect, useRef, useState } from "react";

import { useCredentials } from "./credentials";
import { seatIn } from "./seat";

/** `off`: not in the room; `muted`: joined but silent; `on`: audible. */
export type Listening = "off" | "joining" | "muted" | "on" | "failed";

/** Listening state and controls. */
export interface Ear {
  listening: Listening;
  error: string | null;
  /** Join the room muted. */
  join: () => Promise<void>;
  /** Mute or unmute without leaving. */
  hear: (audible: boolean) => void;
  leave: () => Promise<void>;
}

/** Listen in on one call. */
export function useListen(call: string): Ear {
  const credentials = useCredentials();
  const [listening, setListening] = useState<Listening>("off");
  const [error, setError] = useState<string | null>(null);
  const room = useRef<Room | null>(null);
  const speakers = useRef<HTMLMediaElement[]>([]);
  // Read by tracks that subscribe after an unmute: the agent's track can arrive seconds after the
  // caller's, and must not start muted.
  const audible = useRef(false);

  const join = useCallback(async (): Promise<void> => {
    setListening("joining");
    setError(null);
    try {
      const seat = await seatIn(credentials, call, "listen");
      const joined = new Room();
      room.current = joined;
      // Attached to the document: detached media elements are subject to autoplay blocking.
      joined.on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
        if (track.kind !== Track.Kind.Audio) return;
        const element = track.attach();
        element.muted = !audible.current;
        element.style.display = "none";
        document.body.append(element);
        speakers.current.push(element);
      });
      joined.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
        for (const element of track.detach()) {
          element.remove();
          speakers.current = speakers.current.filter((kept) => kept !== element);
        }
      });
      joined.on(RoomEvent.Disconnected, () => setListening("off"));
      await joined.connect(seat.server_url, seat.participant_token);
      setListening("muted");
    } catch (failed) {
      setError(failed instanceof Error ? failed.message : String(failed));
      setListening("failed");
    }
  }, [call, credentials]);

  const hear = useCallback((hearing: boolean): void => {
    audible.current = hearing;
    for (const element of speakers.current) element.muted = !hearing;
    setListening(hearing ? "on" : "muted");
  }, []);

  const leave = useCallback(async (): Promise<void> => {
    await room.current?.disconnect();
    room.current = null;
  }, []);

  // Leave the room on unmount.
  useEffect(() => {
    return () => {
      void room.current?.disconnect();
    };
  }, []);

  return { listening, error, join, hear, leave };
}
