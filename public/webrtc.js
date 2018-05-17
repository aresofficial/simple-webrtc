(function ($, windowObject, navigatorObject) {
    var socket = io(),
        entry,
        chatMessage,
        connectedOrDisconnected = $("#connectedOrDisconnected"),
        welcomeID = $("#welcome"),
        chatTextField = document.getElementById("chatTextField"),
        chatMessagesList = document.getElementById("chatMessagesList"),
        startButton = $("#startButton"),
        stopButton = $("#stopButton"),
        makeConnectionForm = $("#makeConnectionForm"),
        localVideo,
        remoteVideo,
        peerConnection,
        peerConnectionConfig = {
            'iceServers': [{
                'urls': 'stun:stun.services.mozilla.com'
            }, {
                'urls': 'stun:stun.l.google.com:19302'
            }]
        };
    navigatorObject.getUserMedia = navigatorObject.getUserMedia ||
        navigatorObject.mozGetUserMedia ||
        navigatorObject.webkitGetUserMedia;
    windowObject.RTCPeerConnection = windowObject.RTCPeerConnection ||
        windowObject.mozRTCPeerConnection ||
        windowObject.webkitRTCPeerConnection;
    windowObject.RTCIceCandidate = windowObject.RTCIceCandidate ||
        windowObject.mozRTCIceCandidate ||
        windowObject.webkitRTCIceCandidate;
    windowObject.RTCSessionDescription = windowObject.RTCSessionDescription ||
        windowObject.mozRTCSessionDescription ||
        windowObject.webkitRTCSessionDescription;
    var Functions = {
        pageReady: () => {
            var constraints = {
                video: true,
                audio: true,
            };

            localVideo = document.getElementById('localVideo');
            remoteVideo = document.getElementById('remoteVideo');

            socket.on('rtcMessage', (msg) => Functions.gotMessageFromServer(msg));
            socket.on('chatMessage', (msg) => Functions.appendChat("Кто-то: " + msg));
            socket.on('welcome', (msg) => Functions.welcome(msg));
            socket.on('disconnected', (msg) => Functions.disconnected(msg));
            socket.on('connected', (msg) => Functions.connected(msg));

            if (navigatorObject.mediaDevices.getUserMedia) {
                navigatorObject.mediaDevices.getUserMedia(constraints)
                    .then((stream) => {
                        localStream = stream;
                        localVideo.srcObject = stream;
                    })
                    .catch((error) => console.log(error));
            } else {
                alert('Ваш браузер не поддерживает звонки!');
            }
        },
        stop: () => peerConnection.close(),
        start: (isCaller) => {
            console.log("Начало звонка");
            startButton.val("Идет вызов...");
            peerConnection = new RTCPeerConnection(peerConnectionConfig);
            peerConnection.onicecandidate = Functions.gotIceCandidate;
            peerConnection.onaddstream = Functions.gotRemoteStream;
            peerConnection.addStream(localStream);
            if (isCaller) {
                peerConnection.createOffer()
                    .then((desc) => Functions.gotDescription(desc))
                    .catch(Functions.createOfferError);
                console.log("Offer создан");
            }
            startButton.prop('disabled', true);
        },
        gotDescription: (description) => {
            peerConnection.setLocalDescription(description)
                .then(() => {
                    socket.emit('rtcMessage', JSON.stringify({
                        'sdp': description
                    }));
                });
        },
        gotIceCandidate: (event) => {
            if (event.candidate != null) {
                socket.emit('rtcMessage', JSON.stringify({
                    'ice': event.candidate
                }));
            }
        },
        gotRemoteStream: (event) => {
            console.log("Получение удаленного потока...");
            remoteVideo.srcObject = event.stream;
            startButton.val("Соединено");
            startButton.prop('disabled', true);
        },
        createOfferError: (error) => console.log(`Ошибка создания Offer-а: ${error}`),
        gotMessageFromServer: (message) => {
            if (!peerConnection) {
                Functions.start(false);
            }
            var offer = JSON.parse(message);
            if (offer.sdp) {
                peerConnection.setRemoteDescription(offer.sdp)
                    .then(() => peerConnection.createAnswer())
                    .then((desc) => Functions.gotDescription(desc))
                    .catch(Functions.createAnswerError);
                console.log("Ответ создан");
            } else if (offer.ice) {
                peerConnection.addIceCandidate(offer.ice);
                console.log("Ice Candidate добавлен");
            }
        },
        createAnswerError: (error) => console.log(`Ошибка создания ответа: ${error}`),

        appendChat: (chat) => {
            entry = document.createElement('li');
            entry.appendChild(document.createTextNode(chat));
            chatMessagesList.appendChild(entry);
        },

        sendChat: () => {
            chatMessage = chatTextField.value;
            chatTextField.value = "";
            socket.emit('chatMessage', chatMessage);
            Functions.appendChat("Вы: " + chatMessage);
        },

        welcome: (message) => {
            welcomeID.text("Твой ID: " + message);
        },
        connected: (message) => {
            makeConnectionForm.hide();
            welcomeID.hide();
            connectedOrDisconnected.text("Соединено с: " + message);
            startButton.prop('disabled', false);
            stopButton.prop('disabled', false);
        },
        disconnected: (message) => {
            makeConnectionForm.show();
            welcomeID.show();
            connectedOrDisconnected.text("Отключено от: " + message);
            startButton.val("Вызов");
        },
        makeConnection: () => {
            var id = $("#makeConnectionInputField").val();
            if (id.length == 20) {
                socket.emit('makeConnection', id);
            } else {
                console.log("Неверный ID");
            }
        },
        init: () => {
            startButton.prop('disabled', true);
            stopButton.prop('disabled', true);
        }
    };
    $(startButton).click(() => Functions.start(true));
    $(stopButton).click(() => Functions.stop());

    $("#typeMessagesForm").submit(() => {
        Functions.sendChat();
        return false;
    });
    makeConnectionForm.submit(() => {
        Functions.makeConnection();
        return false;
    });
    $(document).ready(() => {
        Functions.init();
        Functions.pageReady();
    });
}(jQuery, window, navigator));