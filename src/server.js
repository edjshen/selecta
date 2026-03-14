const express = require('express');
const cors = require('cors');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { AccessToken } = require('livekit-server-sdk');
require('dotenv').config();

const prisma = new PrismaClient();
const app = express();

app.use(cors());
app.use(express.json());

// Serve static React build
app.use(express.static(path.join(__dirname, '../client/build')));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'selecta-radio' });
});

// Get all vibes (the dial frequencies)
app.get('/vibes', async (req, res) => {
  const vibes = await prisma.vibe.findMany({
    orderBy: { frequency: 'asc' }
  });
  res.json(vibes);
});

// Get what's live on a specific vibe
app.get('/vibes/:slug/live', async (req, res) => {
  const { slug } = req.params;
  
  const vibe = await prisma.vibe.findUnique({ where: { slug } });
  if (!vibe) return res.status(404).json({ error: 'Frequency not found' });

  const broadcast = await prisma.broadcast.findFirst({
    where: { vibeId: vibe.id, endedAt: null },
    include: {
      station: true,
      episode: true
    },
    orderBy: { startedAt: 'desc' }
  });

  res.json({ 
    vibe, 
    live: !!broadcast,
    broadcast: broadcast || null
  });
});

// Get all stations (curators)
app.get('/stations', async (req, res) => {
  const stations = await prisma.station.findMany({
    orderBy: { name: 'asc' }
  });
  res.json(stations);
});

// Get station with shows
app.get('/stations/:slug', async (req, res) => {
  const { slug } = req.params;
  
  const station = await prisma.station.findUnique({
    where: { slug },
    include: {
      shows: {
        include: { vibes: { include: { vibe: true } } }
      },
      broadcasts: {
        where: { endedAt: null },
        include: { vibe: true }
      }
    }
  });

  if (!station) return res.status(404).json({ error: 'Station not found' });
  res.json(station);
});

// Get now playing across all vibes
app.get('/now-playing', async (req, res) => {
  const nowPlaying = await prisma.nowPlaying.findUnique({
    where: { id: 'singleton' },
    include: { vibe: true }
  });

  // Get live broadcasts for all vibes
  const liveBroadcasts = await prisma.broadcast.findMany({
    where: { endedAt: null },
    include: { vibe: true, station: true, episode: true }
  });

  res.json({
    dial: nowPlaying,
    live: liveBroadcasts
  });
});

// Start broadcast (station goes live)
app.post('/broadcast/start', async (req, res) => {
  const { stationId, vibeSlug, episodeTitle } = req.body;

  const station = await prisma.station.findUnique({ where: { id: stationId } });
  if (!station) return res.status(404).json({ error: 'Station not found' });

  const vibe = await prisma.vibe.findUnique({ where: { slug: vibeSlug } });
  if (!vibe) return res.status(404).json({ error: 'Vibe not found' });

  // Create episode
  const episode = await prisma.episode.create({
    data: {
      title: episodeTitle || `${station.name} Live`,
      show: {
        connectOrCreate: {
          where: { id: `live-${station.id}` },
          create: {
            id: `live-${station.id}`,
            title: 'Live Broadcasts',
            stationId: station.id
          }
        }
      }
    }
  });

  // Create broadcast
  const broadcast = await prisma.broadcast.create({
    data: {
      roomName: `${vibe.slug}-${Date.now()}`,
      stationId: station.id,
      vibeId: vibe.id,
      episodeId: episode.id
    }
  });

  // Mark station live
  await prisma.station.update({
    where: { id: stationId },
    data: { isLive: true }
  });

  // Generate LiveKit token for broadcaster
  const token = new AccessToken(
    process.env.LIVEKIT_API_KEY,
    process.env.LIVEKIT_API_SECRET,
    { identity: station.livekitIdentity || `station-${station.id}` }
  );

  token.addGrant({
    roomJoin: true,
    room: broadcast.roomName,
    canPublish: true,
    canSubscribe: false
  });

  res.json({
    broadcast,
    token: token.toJwt(),
    livekitUrl: process.env.LIVEKIT_URL
  });
});

// Join broadcast (listener tunes in)
app.post('/broadcast/join', async (req, res) => {
  const { roomName } = req.body;

  const broadcast = await prisma.broadcast.findFirst({
    where: { roomName, endedAt: null },
    include: { vibe: true, station: true }
  });

  if (!broadcast) {
    return res.status(404).json({ error: 'Broadcast not live' });
  }

  // Generate LiveKit token for listener
  const token = new AccessToken(
    process.env.LIVEKIT_API_KEY,
    process.env.LIVEKIT_API_SECRET,
    { identity: `listener-${Date.now()}` }
  );

  token.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: false,
    canSubscribe: true
  });

  // Log tune-in
  await prisma.tuneIn.create({
    data: {
      vibeId: broadcast.vibeId,
      stationId: broadcast.stationId
    }
  });

  res.json({
    broadcast,
    token: token.toJwt(),
    livekitUrl: process.env.LIVEKIT_URL
  });
});

// End broadcast
app.post('/broadcast/:id/end', async (req, res) => {
  const { id } = req.params;

  const broadcast = await prisma.broadcast.update({
    where: { id },
    data: { endedAt: new Date() }
  });

  // Archive episode
  await prisma.episode.update({
    where: { id: broadcast.episodeId },
    data: { 
      status: 'ARCHIVED',
      endedAt: new Date()
    }
  });

  // Check if station has other live broadcasts
  const otherBroadcasts = await prisma.broadcast.count({
    where: { stationId: broadcast.stationId, endedAt: null }
  });

  if (otherBroadcasts === 0) {
    await prisma.station.update({
      where: { id: broadcast.stationId },
      data: { isLive: false }
    });
  }

  res.json({ success: true });
});

// Set dial position
app.post('/dial', async (req, res) => {
  const { vibeId } = req.body;

  const updated = await prisma.nowPlaying.update({
    where: { id: 'singleton' },
    data: { 
      vibeId,
      updatedAt: new Date()
    },
    include: { vibe: true }
  });

  res.json(updated);
});

// Serve React app for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`📻 Selecta on ${PORT}`);
});
