var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.use(express.static(__dirname + '/public'));

io.on('connection', function (socket) {
    console.log('Подключился:' + socket.id);
    io.to(socket.id).emit('welcome', socket.id);

    socket.on('rtcMessage', (msg) => sendMessage(socket, 'rtcMessage', msg));

    socket.on('chatMessage', (chat) => sendMessage(socket, 'chatMessage', chat));

    socket.on('makeConnection', (id) => {
        console.log("Запрос соединения: " + id);
        if (id != socket.id) {
            makeConnection(socket.id, id);
        }
    });
    socket.on('disconnect', () => {
        console.log(socket.id + " отключен");
        sendMessage(socket, 'disconnected', socket.id);
        closeConnection(socket.id);
    });
});

function sendMessage(socket, symbol, message) {
    var client = getClient(socket.id);
    if (client != null) {
        io.to(client).emit(symbol, message);
    }
}
var ConnectionPair = function (client1, client2) {
    var clientSource = client1;
    var clientDestination = client2;
    this.getDestinationClient = function (sourceClient) {
        if (clientSource == sourceClient) {
            return clientDestination;
        } else if (clientDestination == sourceClient) {
            return clientSource;
        } else {
            return null;
        }
    }
}

var pairArray = [];

var makeConnection = function (client1, client2) {
    var connectionPair = new ConnectionPair(client1, client2);
    pairArray.push(connectionPair);
    io.to(client1).emit("connected", client2);
    io.to(client2).emit("connected", client1);
}
var closeConnection = function (client) {
    var i, length = pairArray.length;
    for (i = 0; i < length; i++) {
        if (pairArray[i].getDestinationClient(client) != null) {
            pairArray.splice(i, 1);
            break;
        }
    }
}

var getClient = function (source) {
    var i, length = pairArray.length,
        client;
    for (i = 0; i < length; i++) {
        client = pairArray[i].getDestinationClient(source);
        if (client != null) {
            return client;
        }
    }
}
http.listen(3500, function () {
    console.log('Запущено на: *80');
});