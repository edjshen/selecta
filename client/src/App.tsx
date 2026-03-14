import React, { useState, useEffect, useRef } from 'react';
import { Room, RoomEvent } from 'livekit-client';
import { Howl } from 'howler';
import './App.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

interface Vibe {
  id: string;
  name: string;
  slug: string;
  frequency: number;
  color: string;
}

interface Broadcast {
  id: string;
  roomName: string;
  station: {
    name: string;
    slug: string;
  };
}

function App() {
  const [vibes, setVibes] = useState<Vibe[]>([]);
  const [selectedVibe, setSelectedVibe] = useState<Vibe | null>(null);
  const [liveBroadcast, setLiveBroadcast] = useState<Broadcast | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const roomRef = useRef<Room | null>(null);
  const audioRef = useRef<Howl | null>(null);

  // Fetch vibes on mount
  useEffect(() => {
    fetch(`${API_URL}/vibes`)
      .then(r => r.json())
      .then(setVibes);
  }, []);

  // Check what's live when vibe changes
  useEffect(() => {
    if (!selectedVibe) return;

    fetch(`${API_URL}/vibes/${selectedVibe.slug}/live`)
      .then(r => r.json())
      .then(data => {
        setLiveBroadcast(data.live ? data.broadcast : null);
      });
  }, [selectedVibe]);

  const joinBroadcast = async () => {
    if (!liveBroadcast) return;

    // Get LiveKit token
    const res = await fetch(`${API_URL}/broadcast/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomName: liveBroadcast.roomName })
    });
    const { token, livekitUrl } = await res.json();

    // Connect to LiveKit
    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
    });

    room.on(RoomEvent.Connected, () => {
      setIsConnected(true);
      setIsPlaying(true);
    });

    room.on(RoomEvent.Disconnected, () => {
      setIsConnected(false);
      setIsPlaying(false);
    });

    room.on(RoomEvent.TrackSubscribed, (track) => {
      if (track.kind === 'audio') {
        const element = track.attach();
        element.play();
      }
    });

    await room.connect(livekitUrl, token);
    roomRef.current = room;
  };

  const leaveBroadcast = () => {
    roomRef.current?.disconnect();
    roomRef.current = null;
    setIsConnected(false);
    setIsPlaying(false);
  };

  return (
    <div className="App">
      <header className="header">
        <h1>📻 SELECTA</h1>
        <p>Modern radio. Human curation.</p>
      </header>

      <div className="dial">
        <h2>Tune the Dial</h2>
        <div className="frequencies">
          {vibes.map(vibe => (
            <button
              key={vibe.id}
              className={`frequency ${selectedVibe?.id === vibe.id ? 'active' : ''}`}
              style={{ '--vibe-color': vibe.color } as React.CSSProperties}
              onClick={() => setSelectedVibe(vibe)}
            >
              <span className="freq-num">{vibe.frequency}</span>
              <span className="freq-name">{vibe.name}</span>
            </button>
          ))}
        </div>
      </div>

      {selectedVibe && (
        <div className="now-playing">
          <h3>Now on {selectedVibe.frequency} FM</h3>
          
          {liveBroadcast ? (
            <div className="live-broadcast">
              <div className="live-badge">🔴 LIVE</div>
              <h4>{liveBroadcast.station.name}</h4>
              <p>Broadcasting on {selectedVibe.name}</p>
              
              {!isConnected ? (
                <button className="tune-in-btn" onClick={joinBroadcast}>
                  Tune In
                </button>
              ) : (
                <button className="leave-btn" onClick={leaveBroadcast}>
                  Leave Broadcast
                </button>
              )}
            </div>
          ) : (
            <div className="static">
              <p>📡 No broadcast on this frequency</p>
              <p className="static-noise">*static*</p>
            </div>
          )}
        </div>
      )}

      <footer className="footer">
        <p>{isConnected ? '🔊 Connected' : '🔇 Disconnected'}</p>
      </footer>
    </div>
  );
}

export default App;
