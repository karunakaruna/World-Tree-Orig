const http = require("http");
const express = require("express");
const { v4: uuidv4 } = require("uuid");
const WebSocket = require("ws");
const fs = require("fs");
const crypto = require('crypto'); // Add crypto for secure random generation

const app = express();
app.use(express.static("public"));

// Get port from environment variable
const serverPort = process.env.PORT || 3000;

// Add a health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Create HTTP server
const server = http.createServer(app);

// Configure WebSocket server
const wss = new WebSocket.Server({ 
  server,
  perMessageDeflate: false, // Disable per-message deflate to reduce latency
  maxPayload: 65536 // Limit payload size to 64KB
});

// Track connection attempts and errors
wss.on('error', (error) => {
  console.error('WebSocket Server Error:', error);
});

// Log all WebSocket events for debugging
wss.on('listening', () => {
  console.log('WebSocket server is listening');
});

wss.on('headers', (headers, request) => {
  console.log('WebSocket headers:', headers);
});

// In-memory storage for user metadata and WebSocket clients
const users = {};
let numUsers = 0;

// Efficient client lookup using a Map
const clientMap = new Map();
const userSecrets = new Map(); // Store user secrets and their associated UUIDs
const uuidBySecret = new Map(); // Reverse lookup: secret -> UUID
const secretTimestamps = new Map(); // Track when secrets were last used

// Secret expiration time (24 hours in milliseconds)
const SECRET_EXPIRATION_TIME = 24 * 60 * 60 * 1000;



// Function to get CSV file info // Not used currently
function getCsvInfo() {
    // Default CSV paths to check
    const csvPaths = ['data.csv', 'output.csv', 'coordinates.csv'].filter(path => {
        try {
            return fs.existsSync(path);
        } catch (error) {
            return false;
        }
    });

    if (csvPaths.length === 0) {
        return {
            modifiedTime: null,
            size: 0,
            rows: 0,
            exists: false
        };
    }

    // Get the most recently modified CSV
    const mostRecentCsv = csvPaths.reduce((latest, current) => {
        const currentStats = fs.statSync(current);
        if (!latest || currentStats.mtime > fs.statSync(latest).mtime) {
            return current;
        }
        return latest;
    }, null);

    try {
        const stats = fs.statSync(mostRecentCsv);
        
        // Only read file content if it's not too large (e.g., < 10MB)
        let rowCount = 0;
        if (stats.size < 10 * 1024 * 1024) {
            const fileContent = fs.readFileSync(mostRecentCsv, 'utf8');
            rowCount = fileContent.split('\n').length - 1; // -1 for header
        }
        
        return {
            modifiedTime: stats.mtime,
            size: stats.size,
            rows: rowCount,
            exists: true,
            path: mostRecentCsv
        };
    } catch (error) {
        console.error('Error reading CSV file:', error);
        return {
            modifiedTime: null,
            size: 0,
            rows: 0,
            exists: false
        };
    }
}

// Track CSV state
let lastCsvState = getCsvInfo();

// Check for CSV updates periodically
setInterval(() => {
    const currentState = getCsvInfo();
    if (currentState.exists && 
        (!lastCsvState.exists || 
         currentState.modifiedTime?.getTime() !== lastCsvState.modifiedTime?.getTime() ||
         currentState.size !== lastCsvState.size)) {
        
        lastCsvState = currentState;
        broadcastCsvUpdate();
    }
}, 5000); // Check every 5 seconds

// Broadcast CSV update to all clients
function broadcastCsvUpdate() {
    const csvInfo = getCsvInfo();
    const message = JSON.stringify({
        type: 'csvinfo',
        info: csvInfo
    });
    
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

// Function to generate a shorter, readable secret
function generateUserSecret() {
  // Generate an 8-character secret using only alphanumeric characters
  return crypto.randomBytes(4).toString('hex');
}

// Function to clean up expired secrets
function cleanupExpiredSecrets() {
  const now = Date.now();
  for (const [secret, lastUsed] of secretTimestamps.entries()) {
    if (now - lastUsed > SECRET_EXPIRATION_TIME) {
      const userId = uuidBySecret.get(secret);
      if (userId) {
        userSecrets.delete(userId);
        uuidBySecret.delete(secret);
        secretTimestamps.delete(secret);
        console.log(`Cleaned up expired secret for user: ${userId}`);
      }
    }
  }
}

// Run secret cleanup every hour
setInterval(cleanupExpiredSecrets, 60 * 60 * 1000);

// Start the server
server.listen(serverPort, '0.0.0.0', () => {
  console.log(`Server started on port ${serverPort}`);
  console.log(`WebSocket server is running at ws://0.0.0.0:${serverPort}`);
});

// Function to broadcast user updates to all connected clients
function broadcastUserUpdate() {
  const userList = Object.values(users)
    .filter(user => clientMap.has(user.id)) // Only include users with active connections
    .map((user) => ({
      id: user.id,
      username: user.username || "Unnamed",
      description: user.description || "",
      tx: user.tx || 0,
      ty: user.ty || 0,
      tz: user.tz || 0,
      afk: user.afk || false,
      textstream: user.textstream || "",
    }));

  const message = JSON.stringify({
    type: "userupdate",
    numUsers,
    users: userList,
  });

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
};

// Efficiently update user data
const updateUserData = (userId, data) => {
  if (!users[userId]) return;

  Object.keys(data).forEach((key) => {
    if (key in users[userId] && users[userId][key] !== data[key]) {
      users[userId][key] = data[key];
    }
  });
};

// Broadcast coordinate updates
const broadcastCoordinates = (senderId, coordinates) => {
  const message = JSON.stringify({
    type: "usercoordinateupdate",
    from: senderId,
    coordinates,
  });

  wss.clients.forEach((client) => {
    if (
      client.readyState === WebSocket.OPEN &&
      users[client.userId] &&
      client.userId !== senderId
    ) {
      client.send(message);
    }
  });
};

// Ping heartbeat function
const startHeartbeat = () => {
  setInterval(() => {
    const currentTime = new Date().toISOString();
    console.log(`[PING HEARTBEAT] Time: ${currentTime}, Connected Users: ${numUsers}`);
    
    Object.entries(users).forEach(([userId, user]) => {
      console.log(`User ${user.username} (${userId}) is listening to:`, user.listeningTo);
    });

    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(
          JSON.stringify({
            type: "ping", 
            time: currentTime,
            numUsers,
          })
        );
      }
    });
  }, 5000);
};

// WebSocket connection handler
wss.on("connection", (ws) => {
  console.log("New WebSocket connection established");
  numUsers++;
  
  // We don't initialize the user immediately anymore
  // Instead, we wait for either:
  // 1. A reconnect message with a valid secret (restores existing user)
  // 2. A reconnect message with invalid/no secret (creates new user)
  
  // Handle messages
  ws.on("message", (data) => {
    let message;
    try {
      message = JSON.parse(data);
    } catch (err) {
      console.error("Error parsing message:", err);
      return;
    }

    // console.log("Received message type:", message.type);

    switch (message.type) {
      case "reconnect":
        console.log("=== Reconnection Attempt ===");
        console.log("Received secret:", message.secret);
        console.log("Current secrets in system:", Array.from(uuidBySecret.keys()));
        
        const secret = message.secret;
        const username = message.username;
        
        if (secret && uuidBySecret.has(secret)) {
          const existingUserId = uuidBySecret.get(secret);
          console.log(`Valid reconnection: Secret ${secret} matches user ${existingUserId}`);
          console.log(`Previous user data:`, users[existingUserId]);
          
          // Update the secret's last used timestamp
          secretTimestamps.set(secret, Date.now());
          
          // Update the WebSocket connection for this user
          ws.userId = existingUserId;
          clientMap.set(existingUserId, ws);
          
          // Send welcome message with existing ID
          ws.send(JSON.stringify({
            type: "welcome",
            id: existingUserId,
            secret: secret
          }));
          
          // If user data exists, restore it
          if (users[existingUserId]) {
            console.log(`Restoring existing user data for ${existingUserId}`);
            // Update username if provided in reconnect
            if (username) {
              users[existingUserId].username = username;
            }
          } else {
            // Initialize new user data if none exists
            users[existingUserId] = {
              id: existingUserId,
              username: username || `User_${existingUserId.slice(0, 5)}`,
              listeningTo: [],
              description: "",
              tx: 0,
              ty: 0,
              tz: 0,
              afk: false,
              textstream: "",
            };
          }
          
          // Broadcast updated user list
          broadcastUserUpdate();
        } else {
          // If no secret or invalid, create new user
          const newUserId = uuidv4();
          const newSecret = generateUserSecret();
          console.log(`Invalid reconnection attempt, creating new user: ${newUserId}`);
          console.log(`Generated new secret for ${newUserId}: ${newSecret}`);
          
          ws.userId = newUserId;
          users[newUserId] = {
            id: newUserId,
            username: username || `User_${newUserId.slice(0, 5)}`,
            listeningTo: [],
            description: "",
            tx: 0,
            ty: 0,
            tz: 0,
            afk: false,
            textstream: "",
          };

          // Store the WebSocket connection and secret info
          clientMap.set(newUserId, ws);
          userSecrets.set(newUserId, newSecret);
          uuidBySecret.set(newSecret, newUserId);
          secretTimestamps.set(newSecret, Date.now());
          
          ws.send(JSON.stringify({
            type: "welcome",
            id: newUserId,
            secret: newSecret
          }));
        }

        // Send initial CSV info in both cases
        const initialCsvInfo = getCsvInfo();
        if (initialCsvInfo) {
          ws.send(JSON.stringify({
            type: 'csvinfo',
            info: initialCsvInfo
          }));
        }

        // Broadcast user update in both cases
        broadcastUserUpdate();
        break;

      case "requestCsvInfo":
        // Silently handle CSV info requests
        const csvInfo = getCsvInfo();
        if (csvInfo) {
          ws.send(JSON.stringify({
            type: 'csvinfo',
            info: csvInfo
          }));
        }
        break;

      case "metadata":
      case "status":
      case "rename":
      case "connect":
      case "disconnect":
        // Only broadcast these types of messages
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: 'serverlog',
              message: message.message,
              logType: message.type
            }));
          }
        });
        break;

      case "pong":
        console.log(`Pong received from user: ${ws.userId}`);
        break;

      case "updatemetadata":
        if (message.data) {
          updateUserData(ws.userId, message.data);
          broadcastUserUpdate();
        } else {
          console.error(`Invalid metadata update from user ${ws.userId}:`, message.data);
        }
        break;

      case "updatelisteningto":
        console.log(`User ${ws.userId} updating listening list to:`, message.newListeningTo);

        if (Array.isArray(message.newListeningTo)) {
          if (users[ws.userId]) {
            const filteredListeningTo = message.newListeningTo.filter(
              (listeningId) => listeningId !== ws.userId
            );

            if (
              JSON.stringify(users[ws.userId].listeningTo) ===
              JSON.stringify(filteredListeningTo)
            ) {
              console.log(`No change in listeningTo for user ${ws.userId}.`);
              return;
            }

            users[ws.userId].listeningTo = filteredListeningTo;

            console.log(
              `Updated listeningTo for user ${ws.userId} (filtered):`,
              users[ws.userId].listeningTo
            );

            broadcastUserUpdate();
          } else {
            console.error(`User ${ws.userId} not found for listeningTo update.`);
          }
        } else {
          console.error(
            `Invalid listeningTo data from user ${ws.userId}:`,
            message.newListeningTo
          );
        }
        break;

      case "usercoordinate":
        // Only process coordinates if we have a valid userId and user data
        if (!ws.userId) {
          console.log("Received coordinates before user initialization - waiting for reconnect");
          return;
        }
        const { coordinates } = message;
        if (coordinates && users[ws.userId]) {
          updateUserData(ws.userId, coordinates);
          broadcastCoordinates(ws.userId, coordinates);
        } else {
          console.error(
            `Invalid coordinates or user not found for user ${ws.userId}:`,
            coordinates
          );
        }
        break;

      case "clearlist":
        console.log(`Clearing listening list for user: ${ws.userId}`);
        if (users[ws.userId]) {
          users[ws.userId].listeningTo = [];
          broadcastUserUpdate();
        } else {
          console.error(`User ${ws.userId} not found for clearlist.`);
        }
        break;

        case "data":
          const { data: payload } = message;
        
          if (payload) {
            // Iterate through all users to find who is listening to the sender (ws.userId)
            Object.entries(users).forEach(([recipientId, recipientData]) => {
              if (
                Array.isArray(recipientData.listeningTo) &&
                recipientData.listeningTo.includes(ws.userId)
              ) {
                const recipientClient = clientMap.get(recipientId);
        
                if (recipientClient && recipientClient.readyState === WebSocket.OPEN) {
                  recipientClient.send(
                    JSON.stringify({
                      type: "data",
                      from: ws.userId,
                      data: payload,
                    })
                  );
                  // console.log(`Data sent from user ${ws.userId} to ${recipientId}:`, payload);
                } else {
                  console.warn(
                    `Recipient ${recipientId} not found or not connected for data message from user ${ws.userId}.`
                  );
                }
              }
            });
          } else {
            console.error(
              `Invalid data payload for user ${ws.userId}:`,
              payload
            );
          }
          break;

      default:
        console.error(`Unhandled message type "${message.type}" from user ${ws.userId}:`, message);
    }
  });

  // Handle disconnection
  ws.on("close", () => {
    console.log(`User disconnected: ${ws.userId}`);
    if (ws.userId in users) {
      delete users[ws.userId];
    }
    clientMap.delete(ws.userId);
    // Update last used timestamp on disconnect
    const secret = userSecrets.get(ws.userId);
    if (secret) {
      secretTimestamps.set(secret, Date.now());
    }
    numUsers = Math.max(0, numUsers - 1);
    broadcastUserUpdate(); // This will now only show connected users
  });
});

// Start the ping heartbeat
startHeartbeat();

// Express route for debugging
app.get("/", (req, res) => {
  res.send(`
    <html>
      <head><title>Server Status</title></head>
      <body>
        <h1>Server Status</h1>
        <p>Number of connected users: ${numUsers}</p>
        <pre>${JSON.stringify(users, null, 2)}</pre>
      </body>
    </html>
  `);
});
