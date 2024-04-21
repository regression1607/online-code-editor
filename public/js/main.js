var socket = io();

// Store the names of connected users
let users = [];

// When the user enters their name
socket.emit('name', 'Ekansh');

// When a new user connects
socket.on('user connected', (name) => {
    console.log(name + ' has connected');
    users.push(name);
    updateUsers();
});

// When a user disconnects
socket.on('user disconnected', (name) => {
    console.log(name + ' has disconnected');
    users = users.filter(user => user !== name);
    updateUsers();
});

// Update the list of connected users
function updateUsers() {
    const userList = document.getElementById('userList');
    userList.innerHTML = users.join(', ');
}

document.getElementById('code').addEventListener('input', function (e) {
    socket.emit('code', e.target.value);
});

document.getElementById('compile').addEventListener('click', function () {
    socket.emit('compile', document.getElementById('code').value);
});

socket.on('code', function (msg) {
    document.getElementById('code').value = msg;
});

socket.on('output', function (msg) {
    document.getElementById('output').textContent = msg;
});

document.getElementById('compile').addEventListener('click', function () {
    socket.emit('compile', {
        language: document.getElementById('language').value,
        className: document.getElementById('className').value,
        code: document.getElementById('code').value
    });
});

document.getElementById('language').addEventListener('change', function () {
    var classNameInput = document.getElementById('className');
    if (this.value === 'java') {
        classNameInput.style.display = 'block';
    } else {
        classNameInput.style.display = 'none';
    }
});