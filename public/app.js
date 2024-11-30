const socket = io();
let localStream;
let remoteStream;
let peerConnection;
let targetId = null;

const config = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" }, // Public STUN server
  ],
};

// Selectors
const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
const startCallButton = document.getElementById("startCall");
const endCallButton = document.getElementById("endCall");
const targetSelect = document.getElementById("targetIdSelect");

// Populate user list dynamically
socket.on("update-users", (users) => {
  console.log("Received user list:", users);

  targetSelect.innerHTML = "<option value=''>Select a user</option>"; // Reset dropdown
  users.forEach((user) => {
    if (user.id !== socket.id) { // Exclude self from the list
      const option = document.createElement("option");
      option.value = user.id;
      option.textContent = user.id;
      targetSelect.appendChild(option);
    }
  });
});

// Set the target user for the call
targetSelect.onchange = (e) => {
  targetId = e.target.value;
  console.log("Selected targetId:", targetId);
};

// Start the call
startCallButton.onclick = async () => {
  if (!targetId) {
    alert("Please select a user to call.");
    return;
  }

  // Access local media
  localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  localVideo.srcObject = localStream;

  // Initialize PeerConnection
  peerConnection = new RTCPeerConnection(config);
  localStream.getTracks().forEach((track) => peerConnection.addTrack(track, localStream));

  peerConnection.ontrack = (event) => {
    remoteStream = event.streams[0];
    remoteVideo.srcObject = remoteStream;
  };

  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit("ice-candidate", { target: targetId, candidate: event.candidate });
    }
  };

  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);

  socket.emit("offer", { target: targetId, offer });
};

// Handle incoming offer
socket.on("offer", async (data) => {
  targetId = data.sender;

  peerConnection = new RTCPeerConnection(config);
  localStream.getTracks().forEach((track) => peerConnection.addTrack(track, localStream));

  peerConnection.ontrack = (event) => {
    remoteStream = event.streams[0];
    remoteVideo.srcObject = remoteStream;
  };

  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit("ice-candidate", { target: data.sender, candidate: event.candidate });
    }
  };

  await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);

  socket.emit("answer", { target: data.sender, answer });
});

// Handle incoming answer
socket.on("answer", async (data) => {
  await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
});

// Handle incoming ICE candidate
socket.on("ice-candidate", (data) => {
  peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
});

// End the call
endCallButton.onclick = () => {
  if (peerConnection) {
    peerConnection.close();
    localStream.getTracks().forEach((track) => track.stop());
    remoteVideo.srcObject = null;
    alert("Call ended.");
  }
};
