const socket = io("https://app-qezv.onrender.com");

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
const targetIdInput = document.getElementById("targetId");
const startCallButton = document.getElementById("startCall");
const endCallButton = document.getElementById("endCall");

startCallButton.onclick = async () => {
  const targetId = targetIdInput.value.trim();
  if (!targetId) {
    alert("Please enter the Target ID");
    return;
  }

  // Get user media
  localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  localVideo.srcObject = localStream;

  // Create peer connection
  peerConnection = new RTCPeerConnection(config);

  // Add local tracks to the peer connection
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

  // Create and send an offer
  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);

  socket.emit("offer", { target: targetId, offer });
};

socket.on("offer", async (data) => {
  const { sender, offer } = data;

  // Create peer connection
  peerConnection = new RTCPeerConnection(config);

  // Add local tracks to the peer connection
  localStream.getTracks().forEach((track) => peerConnection.addTrack(track, localStream));

  // Handle remote stream
  peerConnection.ontrack = (event) => {
    remoteStream = event.streams[0];
    remoteVideo.srcObject = remoteStream;
  };

  // Handle ICE candidates
  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit("ice-candidate", { target: sender, candidate: event.candidate });
    }
  };

  // Set remote offer and create answer
  await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);

  socket.emit("answer", { target: sender, answer });
});

socket.on("answer", async (data) => {
  await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
});

socket.on("ice-candidate", (data) => {
  peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
});

endCallButton.onclick = () => {
  if (peerConnection) peerConnection.close();
  if (localStream) localStream.getTracks().forEach((track) => track.stop());
  remoteVideo.srcObject = null;
};
