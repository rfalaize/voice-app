console.log("start");

const AudioContext = window.AudioContext || window.webkitAudioContext;

// create new audio context
const audioContext = new AudioContext();

// get the audio element
const audioElement = document.getElementById("electroAudio");
console.log("audioElement=", audioElement);

// pass it into the audio context
const track = audioContext.createMediaElementSource(audioElement);

// play/pause
var dataset = { playing: false };
function onPlayClick() {
  console.log("audioContext=", audioContext);
  // check if context is in suspended state (autoplay policy)
  if (audioContext.state === "suspended") {
    audioContext.resume();
  }

  // play or pause track depending on state
  if (this.dataset.playing === false) {
    console.log("play...");
    audioElement.play();
    this.dataset.playing = true;
  } else if (this.dataset.playing === true) {
    console.log("pause...");
    audioElement.pause();
    this.dataset.playing = false;
  }
}

// gain element
const gainNode = audioContext.createGain();

const volumeControl = document.querySelector("#volume");
volumeControl.addEventListener(
  "input",
  function() {
    gainNode.gain.value = this.value;
  },
  false
);

// stereo
const pannerOptions = { pan: 0 };
const stereoPannerNode = new StereoPannerNode(audioContext, pannerOptions);

const pannerControl = document.querySelector("#panner");
pannerControl.addEventListener(
  "input",
  function() {
    stereoPannerNode.pan.value = this.value;
  },
  false
);

// connect track to nodes, then to audio context
// track.connect(audioContext.destination);
// track.connect(gainNode).connect(audioContext.destination);
track
  .connect(gainNode)
  .connect(stereoPannerNode)
  .connect(audioContext.destination);

console.log("end");
