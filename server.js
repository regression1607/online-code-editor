const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const { spawn } = require('child_process');
const fs = require('fs').promises;
const app = express();
const server = http.createServer(app);
const io = socketIO(server);
const axios = require('axios');
const shell = require('shelljs');
const path = require('path');
require('dotenv').config();
// Set EJS as view engine
app.set('view engine', 'ejs');
// Set the views directory
app.set('views', path.join(__dirname, 'views'));

// Serve static files from the "public" directory
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.get('/', (req, res) => {
    res.render('name');
});
app.post('/index', (req, res) => {
    const name = req.body.name;
    res.render('index', { name });
});
let users = {};
io.on('connection', (socket) => {
    console.log('a user connected');
    // When a user sends their name
    socket.on('name', (name) => {
        users[socket.id] = name;
        // Broadcast the new user's name to all other users
        socket.broadcast.emit('user connected', name);
    });

    socket.on('compile', async ({ language, className, code }) => {
        let process;
        switch (language) {
            case 'javascript':
                process = spawn('node', ['-e', code]);
                break;
            case 'python':
                process = spawn('python', ['-c', code]);
                break;
            case 'java':
                try {
                    await fs.writeFile(`${className}.java`, code);
                    process = spawn('javac', [`${className}.java`]);
                    process.on('close', (code) => {
                        if (code === 0) {
                            const run = spawn('java', [className]);
                            run.stdout.on('data', (data) => {
                                io.emit('output', data.toString());
                            });
                            run.stderr.on('data', (data) => {
                                io.emit('output', data.toString());
                            });
                        }
                    });
                } catch (error) {
                    io.emit('output', error.toString());
                }
                break;
            case 'c':
                try {
                    const response = await axios.post('https://api.jdoodle.com/v1/execute', {
                        clientId: process.env.JD_CLIENT_ID,
                        clientSecret: process.env.JD_CLIENT_SECRET,
                        script: code,
                        language: 'c',
                        versionIndex: '0',
                    });
                    io.emit('output', response.data.output);
                } catch (error) {
                    io.emit('output', error.toString());
                }
                break;
            case 'c++':
                try {
                    const response = await axios.post('https://api.jdoodle.com/v1/execute', {
                        clientId: process.env.JD_CLIENT_ID,
                        clientSecret: process.env.JD_CLIENT_SECRET,
                        script: code,
                        language: 'cpp14',
                        versionIndex: '0',
                    });
                    io.emit('output', response.data.output);
                } catch (error) {
                    io.emit('output', error.toString());
                }
                break;
            case 'bash':
                try {
                    let output = shell.exec(code);
                    if (output.code !== 0) {
                        io.emit('output', output.stderr);
                    } else {
                        io.emit('output', output.stdout);
                    }
                } catch (error) {
                    io.emit('output', error.toString());
                }
                break;
        }
        if (process) {
            process.stdout.on('data', (data) => {
                io.emit('output', data.toString());
            });
            process.stderr.on('data', (data) => {
                io.emit('output', data.toString());
            });
        }
        // When a user disconnects
        socket.on('disconnect', () => {
            console.log('user disconnected');
            // Broadcast the disconnected user's name to all other users
            io.emit('user disconnected', users[socket.id]);
            // Remove the disconnected user from the users list
            delete users[socket.id];
        });
    });
});

server.listen(3000, () => {
    console.log('listening on *:3000');
});
// Add this closing parenthesis
