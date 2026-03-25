/**
 * PeerManager — PeerJS connection setup and room management
 */

/**
 * Generate a short room code (6 uppercase alphanumeric chars).
 * @returns {string}
 */
function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const array = new Uint32Array(6);
  crypto.getRandomValues(array);
  return Array.from(array).map(n => chars[n % chars.length]).join('');
}

/**
 * Initialize a host peer and generate a room code.
 * @returns {Promise<{ peer: object, roomCode: string }>}
 */
export async function createRoom() {
  const { Peer } = await import('peerjs');
  const roomCode = generateRoomCode();
  return new Promise((resolve, reject) => {
    const peer = new Peer(roomCode, {
      debug: 0,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
      },
    });

    peer.on('open', id => {
      resolve({ peer, roomCode: id });
    });

    peer.on('error', err => {
      // If room code is taken, try a new one
      if (err.type === 'unavailable-id') {
        peer.destroy();
        createRoom().then(resolve).catch(reject);
      } else {
        reject(err);
      }
    });

    setTimeout(() => reject(new Error('PeerJS connection timeout')), 15000);
  });
}

/**
 * Connect to an existing room as a player.
 * @param {string} roomCode
 * @returns {Promise<{ peer: object, hostConnection: object }>}
 */
export async function joinRoom(roomCode) {
  const { Peer } = await import('peerjs');
  return new Promise((resolve, reject) => {
    const peer = new Peer(undefined, {
      debug: 0,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
      },
    });

    peer.on('open', () => {
      const hostConnection = peer.connect(roomCode, { reliable: true });

      hostConnection.on('open', () => {
        resolve({ peer, hostConnection });
      });

      hostConnection.on('error', err => {
        reject(err);
      });

      setTimeout(() => reject(new Error('Could not connect to room. Check the room code.')), 15000);
    });

    peer.on('error', err => {
      reject(err);
    });
  });
}

/**
 * Broadcast a message to all connected peers.
 * @param {object[]} connections - Array of DataConnection objects
 * @param {object} message
 */
export function broadcast(connections, message) {
  const data = JSON.stringify(message);
  for (const conn of connections) {
    if (conn && conn.open) {
      try {
        conn.send(data);
      } catch (err) {
        console.warn('broadcast: send failed for connection', conn.peer, err);
      }
    }
  }
}

/**
 * Send a message to a specific peer.
 * @param {object} connection - DataConnection object
 * @param {object} message
 */
export function sendTo(connection, message) {
  if (connection && connection.open) {
    try {
      connection.send(JSON.stringify(message));
    } catch (err) {
      console.warn('sendTo: send failed', err);
    }
  }
}

/**
 * Destroy the peer connection and clean up.
 * @param {object} peer
 */
export function destroyPeer(peer) {
  if (peer && !peer.destroyed) {
    peer.destroy();
  }
}
