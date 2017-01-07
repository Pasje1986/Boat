var localVideo;
var remoteVideo;
var peerConnection;
var uuid;
var text;
var bericht;
var userstream;

// Get the modal
var modal = document.getElementById('myModal');

// Get the button that opens the modal
var btn = document.getElementById("myBtn");

// Get the <span> element that closes the modal
var span = document.getElementsByClassName("close")[0];

//get icon eye
var eye = document.getElementById("topIconsEye");

//get icon Listing
var Listing = document.getElementById("topIconsListing");

// When the user clicks the button, open the modal
btn.onclick = function() {
    modal.style.display = "block";
}

// When the user clicks on <span> (x), close the modal
span.onclick = function() {
    modal.style.display = "none";
    remoteVideo.src = '';
}

var peerConnectionConfig = {
    'iceServers': [
        {'urls': 'stun:stun.services.mozilla.com'},
        {'urls': 'stun:stun.l.google.com:19302'},
    ]
};

function pageReady() {
    uuid = uuid();

    //localVideo = document.getElementById('localVideo');
    remoteVideo = document.getElementById('remoteVideo');

    serverConnection = new WebSocket('wss://' + window.location.hostname + ':8443');
    //serverConnection = new WebSocket('wss://213.125.24.100:8443');
    serverConnection.onmessage = gotMessageFromServer;

    Listing.style.display = "block";

    var constraints = {
        video: true,
        audio: true,
    };

    if(navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia(constraints).then(getUserMediaSuccess).catch(errorHandler);
    //} if(navigator.mozGetUserMedia){
    //    navigator.mozGetUserMedia(constraints).then(getUserMediaSuccess).catch(errorHandler);
    } else {
        alert('Your browser does not support getUserMedia API');
    }
}

function getUserMediaSuccess(stream) {
    userstream = stream;
    //localVideo.src = window.URL.createObjectURL(stream);
}

function start(isCaller) {
    peerConnection = new RTCPeerConnection(peerConnectionConfig);
    peerConnection.onicecandidate = gotIceCandidate;
    peerConnection.onaddstream = gotRemoteStream;
    peerConnection.addStream(userstream);

    if(isCaller) {
        peerConnection.createOffer().then(createdDescription).catch(errorHandler);
        modal.style.display = "none";
        var elem = document.getElementById("remoteVideo");
            if (elem.requestFullscreen) {
              elem.requestFullscreen();
            } else if (elem.mozRequestFullScreen) {
              elem.mozRequestFullScreen();
           } else if (elem.webkitRequestFullscreen) {
             elem.webkitRequestFullscreen();
           }
    }
}

function forced(isCaller) {
    peerConnection = new RTCPeerConnection(peerConnectionConfig);
    peerConnection.onicecandidate = gotIceCandidate;
    peerConnection.onaddstream = gotRemoteStream;
    peerConnection.addStream(userstream);

    if (isCaller) {
        peerConnection.createOffer().then(createdForcedDescription).catch(errorHandler);
        eye.style.display = "block";
    }
}

function startAudio(isCaller) {
    // delete video from stream
    var videoTrack = userstream.getVideoTracks();
    userstream.removeTrack(videoTrack[0]);

    peerConnection = new RTCPeerConnection(peerConnectionConfig);
    peerConnection.onicecandidate = gotIceCandidate;
    peerConnection.onaddstream = gotRemoteStream;
    peerConnection.addStream(userstream);

    if(isCaller) {
        peerConnection.createOffer().then(createdDescription).catch(errorHandler);
        modal.style.display = "none";
    }
}

function red(isCaller, txt) {
    peerConnection = new RTCPeerConnection(peerConnectionConfig);
    peerConnection.onicecandidate = gotIceCandidate;

    if (isCaller) {
        text = txt;
        peerConnection.createOffer().then(createdRedDescription).catch(errorHandler);
    }
}

function cancelled(isCaller) {
    peerConnection = new RTCPeerConnection(peerConnectionConfig);
    peerConnection.onicecandidate = gotIceCandidate;

    if (isCaller) {
        peerConnection.createOffer().then(createdCancelledDescription).catch(errorHandler);
    }
}

function Bericht(isCaller, msg) {
    peerConnection = new RTCPeerConnection(peerConnectionConfig);
    peerConnection.onicecandidate = gotIceCandidate;

    if (isCaller) {
        bericht = msg;
        peerConnection.createOffer().then(createdBerichtDescription).catch(errorHandler);
    }
}

function gotMessageFromServer(message) {
    if(!peerConnection) start(false);

    var signal = JSON.parse(message.data);

    // Ignore messages from ourself
    if(signal.uuid == uuid) return;

    if(signal.sdp) {
        peerConnection.setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(function() {
            // Only create answers in response to offers
            if(signal.sdp.type == 'offer') {
                peerConnection.createAnswer().then(createdDescription).catch(errorHandler);
                if(signal.info == 'forced'){
                    var audio = new Audio('sounds/Emergency-alarm.mp3');
                    audio.volume = .8
                    audio.play();
                    //wait 3 sec, beter voor server afhandeling is async!!
                    sleep(3000);
                    forced(true);
                    eye.style.display = "block";
                }else if (signal.info == 'bericht') {
                    if (signal.text == 'Video gestopt') {
                        location.reload();
                    }
                }else{
                    var audio = new Audio('sounds/RingSound.mp3');
                    audio.volume = .4
                    audio.play();
                    modal.style.display = "block";
                }
            }
        }).catch(errorHandler);
    } else if(signal.ice) {
        peerConnection.addIceCandidate(new RTCIceCandidate(signal.ice)).catch(errorHandler);
    }
}

function gotIceCandidate(event) {
    if(event.candidate != null) {
        serverConnection.send(JSON.stringify({'ice': event.candidate, 'uuid': uuid}));
    }
}

function createdDescription(description) {
    console.log('got description');

    peerConnection.setLocalDescription(description).then(function() {
        serverConnection.send(JSON.stringify({'sdp': peerConnection.localDescription, 'uuid': uuid}));
    }).catch(errorHandler);
}

function createdForcedDescription(description) {
    console.log('got description');
    peerConnection.setLocalDescription(description).then(function () {
        serverConnection.send(JSON.stringify({ 'sdp': peerConnection.localDescription, 'uuid': uuid, 'info': 'forced' }));
    }).catch(errorHandler);
}

function createdRedDescription(description) {
    console.log('got description');
    peerConnection.setLocalDescription(description).then(function () {
        serverConnection.send(JSON.stringify({ 'sdp': peerConnection.localDescription, 'uuid': uuid, 'info': 'red', 'text': text }));
    }).catch(errorHandler);
}

function createdCancelledDescription(description) {
    console.log('got description');
    peerConnection.setLocalDescription(description).then(function () {
        serverConnection.send(JSON.stringify({ 'sdp': peerConnection.localDescription, 'uuid': uuid, 'info': 'canc', 'text': "video geweigerd" }));
    }).catch(errorHandler);
}

function createdBerichtDescription(description) {
    console.log('got description');
    peerConnection.setLocalDescription(description).then(function () {
        serverConnection.send(JSON.stringify({ 'sdp': peerConnection.localDescription, 'uuid': uuid, 'info': 'bericht', 'text': bericht }));
    }).catch(errorHandler);
}

function gotRemoteStream(event) {
    console.log('got remote stream');
    remoteVideo.src = window.URL.createObjectURL(event.stream);
}

function errorHandler(error) {
    console.log(error);
}

// Taken from http://stackoverflow.com/a/105074/515584
// Strictly speaking, it's not a real UUID, but it gets the job done here
function uuid() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  }

  return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}

function sleep(delay) {
    var start = new Date().getTime();
    while (new Date().getTime() < start + delay);
  }



