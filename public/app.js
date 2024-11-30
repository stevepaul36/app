const socket = io("https://app-qezv.onrender.com");  // Replace with your backend URL
let localStream;
let remoteStream;
let peerConnection;

const config = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" }, // Public STUN server
  ],
};

const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
const startCallButton = document.getElementById("startCall");
const endCallButton = document.getElementById("endCall");

// Dynamically set the targetId
let targetId; // To be set dynamically when connecting to a peer (add logic here)

// Start call button event
startCallButton.onclick = async () => {
  localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  localVideo.srcObject = localStream;

  peerConnection = new RTCPeerConnection(config);

  // Add local stream to peer connection
  localStream.getTracks().forEach((track) => peerConnection.addTrack(track, localStream));

  // Handle remote stream
  peerConnection.ontrack = (event) => {
    remoteStream = event.streams[0];
    remoteVideo.srcObject = remoteStream;
  };

  // Handle ICE candidates
  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit("ice-candidate", { target: targetId, candidate: event.candidate });
    }
  };

  // Create offer and send to signaling server
  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);

  socket.emit("offer", { target: targetId, offer });
};

// Listen for incoming offer
socket.on("offer", async (data) => {
  peerConnection = new RTCPeerConnection(config);

  // Add local stream to peer connection
  localStream.getTracks().forEach((track) => peerConnection.addTrack(track, localStream));

  // Handle remote stream
  peerConnection.ontrack = (event) => {
    remoteStream = event.streams[0];
    remoteVideo.srcObject = remoteStream;
  };

  // Handle ICE candidates
  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit("ice-candidate", { target: data.sender, candidate: event.candidate });
    }
  };

  // Set remote offer and create answer
  await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);

  socket.emit("answer", { target: data.sender, answer });
});

// Listen for incoming answer
socket.on("answer", async (data) => {
  await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
});

// Handle ICE candidate
socket.on("ice-candidate", (data) => {
  peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
});

// End call button event
endCallButton.onclick = () => {
  peerConnection.close();
  localStream.getTracks().forEach((track) => track.stop());
  remoteVideo.srcObject = null;
};
