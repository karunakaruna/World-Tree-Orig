//main.js
const http = require("http");
const express = require("express");
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;
const server = http.createServer(app);
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const { addDummyProfileRow, getPostgresVersion } = require('./util/db-actions');

//server.js (passport logic)

const session = require('express-session');
const flash = require('express-flash');
const passport = require('passport');
const initializePassport = require('./util/passportConfig');
        initializePassport(passport);
const bodyParser = require('body-parser');
const { checkAuthenticated, checkNotAuthenticated } = require('./util/auth');

//ENVIRONMENT VARIABLES
require("dotenv").config();
const sessionsecret = process.env.SECRET;







const WebSocket = require("ws");



const wss = process.env.NODE_ENV === "production"
      ? new WebSocket.Server({ server })
      : new WebSocket.Server({ port: 5001 });


// const homerouter = require('./routes/router');



//CORS
const allowedOrigins = ['https://monaverse.com', 'https://hyperfy.io', 'http://localhost','http://localhost:4000','http://localhost:3000'];
const corsOptions = {
  origin: function (origin, callback) {
    console.log("Incoming origin:", origin);  // Log the incoming origin

    if (allowedOrigins.includes(origin) || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  optionsSuccessStatus: 204,
  credentials: true, // This allows cookies and headers to be sent/received
  allowedHeaders: ['Content-Type', 'Authorization'] // Additional headers can be added here
};


//app use
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public", { "extensions": ["html", "css", "js"] }));
app.use(cors(corsOptions));
app.options('/unity-endpoint', cors(corsOptions));

//app use from passport-sql-login
app.use(bodyParser.json());
app.set('view engine', 'ejs');
app.use(session({  
    secret: sessionsecret, //ENV FILE
    resave: false,
    saveUninitialized: false
}));
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(__dirname + '/public'));





//Routes
const homerouter = require('./routes/router');
const accountRouter = require('./routes/account');
const modalsRouter = require('./routes/modals');


//Use Routes
app.use('/', homerouter);
app.use('/account', accountRouter);
app.use('/modals', modalsRouter);



//Home Index from metacarta
// app.get('/', (req, res) => {
//     res.sendFile(__dirname + '/index.html');
// });

//Homepage
app.get('/', checkNotAuthenticated, (req, res) => {
    res.render('index.ejs');
    }); 

//Redirects
app.get('/users/register'  , checkAuthenticated, (req, res) => {
    res.render('register');
    }
);

app.get('/users/login'  , checkAuthenticated, (req, res) => {
    res.render('login');
    }
);

app.get('/users/dashboard' , checkNotAuthenticated, (req, res) => {
    res.render('dashboard', {user: req.user.name})
    }
    
);



//Spinning sphere home page
app.get('/loading-home', (req, res) => {
    try {
        const data = {
            title: 'Modal Title',
            content: 'Content for the modal'
        };
        res.render('loading.ejs', data);
    } catch (error) {
        console.error("Error rendering EJS:", error);
        res.status(500).send('Server Error');
    }
});








let users = {};      
getPostgresVersion();

//Websockets
wss.on("connection", function (ws, req) {
  console.log("Connection Opened");
  console.log("Client size: ", wss.clients.size);

  const userID = uuidv4();  // Generate a UUID for each connected user
      users[userID] = {
        position: { x: 0, y: 0, z: 0 } // default position
    };

  // Send the assigned user ID to the connected client
  ws.send(JSON.stringify({ type: 'assignUserID', userID: userID }));

  onUserConnect(userID);
  broadcast(null, JSON.stringify({ type: 'userCount', value: wss.clients.size }), true);

  if (wss.clients.size === 1) {
    console.log("first connection. starting keepalive");
    keepServerAlive();
  }
ws.on("message", (data) => {
    if (isJSON(data)) {
        const currData = JSON.parse(data);

        //Ping
        if(currData.type === 'ping') {
            console.log('Received a server heartbeat ping');

        //Location update
        } else if(currData.type === 'loc') {
            onUserPositionUpdate(userID, currData.position);
            broadcast(ws, currData, false);
        } else if (currData.type === 'init') {
            console.log('welcome new user!')
            sendToUser(userID, { type: 'hello' }); // send 'hello' to the user

        //Bookmark
        } else if (currData.type === 'bookmark') {
            console.log(`Received a bookmark from user: ${currData.userID} for URL: ${currData.url}`);
            addDummyProfileRow();  // call the bookmark function

        //Entrance
        } else if (currData.type === 'entrance') {
            console.log(`Received an entrance ping for object: ${currData.objectName} at x:${currData.position.x} y:${currData.position.y} z:${currData.position.z}`);
            broadcast(ws, currData, false);
        }

        //String
    } else if(typeof data === 'string') {
        if(data === 'pong') {
            console.log('keepAlive');
            return;
        }
    } else {
        console.error('malformed message', data);
    }
});

  // Close connection
  ws.on("close", (data) => {
      console.log("closing connection");
      onUserDisconnect(userID);
      broadcast(null, JSON.stringify({ type: 'userCount', value: wss.clients.size }), true);

      if (wss.clients.size === 0) {
          console.log("last client disconnected, stopping keepAlive interval");
          clearInterval(keepAliveId);
      }
  });
});




    const isJSON = (message) => {
        try {
            const obj = JSON.parse(message);
            return obj && typeof obj === "object";
        } catch (err) {
            return false;
        }
    };

    const keepServerAlive = () => {
        keepAliveId = setInterval(() => {
            wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ type: 'ping'}));
                }
            });
        }, 50000);
    };

    function onUserConnect(userID) {
        if (!users[userID].position) {
            users[userID].position = { x: 0, y: 0, z: 0 };
        }
        broadcast(null, JSON.stringify({
            type: 'initUsers',
            userID: userID,
            users: users
        }),false);
    }

    function onUserPositionUpdate(userID, position) {
        users[userID].position = position;
        broadcast(null, {
            type: 'userPositionUpdate',
            userID: userID,
            position: position
        }, false);
    }

    function onUserDisconnect(userID) {
        delete users[userID];
        broadcast(null, JSON.stringify({
            type: 'userDisconnected',
            userID: userID
        }), true);
        console.log(userID);
    }

    function sendToUser(userID, message) {
        wss.clients.forEach(client => {
            if (client.userID === userID) {
                client.send(JSON.stringify(message));
            }
        });
    }

    function sendToAllUsers(userID, message) {
        wss.clients.forEach(client => {
            if (client.userID === userID) {
                client.send(JSON.stringify(message));
            }
        });
    }

    const broadcast = (ws, message, includeSelf) => {
        const stringifiedMessage = typeof message === 'string' ? message : JSON.stringify(message);
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN && (includeSelf || client !== ws)) {
                client.send(stringifiedMessage);
            }
        });
    };


    module.exports = { broadcast };


//Start Server    
server.listen(port, () => {
  console.log(`Server started on port ${port}`);
});
console.log(`Server started on port ${process.env.PORT} in stage ${process.env.NODE_ENV}`);
