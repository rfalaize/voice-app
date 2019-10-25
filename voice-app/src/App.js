import React from "react";

class App extends React.Component {
  constructor(props) {
    super(props);
    // state
    this.state = {};
    this.state.microphoneAvailable = false;
    this.state.recordingShouldStop = false;
    this.state.recordingStopped = true;
    this.state.blobs = [];
  }

  init() {
    navigator.permissions.query({ name: "microphone" }).then(function(result) {
      if (result.state === "granted") {
        this.setState({ microphoneAvailable: true });
      } else if (result.state === "prompt") {
      } else if (result.state === "denied") {
      }
    });
  }

  onStart = () => {
    const blob = "abcd";
    var newBlobs = [...this.state.blobs];
    newBlobs.push(blob);
    this.setState({ blobs: newBlobs });

    /*navigator.mediaDevices
      .getUserMedia({ audio: true, video: false })
      .then(this.startRecording)
      .catch(error => alert("Could not start recording:", error.message));*/
  };

  onStop = () => {
    this.stopRecording();
  };

  startRecording = stream => {
    this.setState({ recording: true });

    // see https://developers.google.com/web/fundamentals/media/recording-audio
    const options = { mimeType: "audio/webm" };
    const recordedChunks = [];
    const mediaRecorder = new MediaRecorder(stream, options);

    mediaRecorder.addEventListener("dataavailable", function(e) {
      if (e.data.size > 0) {
        recordedChunks.push(e.data);
      }

      if (
        this.state.recordingShouldStop === true &&
        this.state.recordingStopped === false
      ) {
        mediaRecorder.stop();
        this.setState({ recordingStopped: true });
      }
    });

    mediaRecorder.addEventListener("stop", function() {
      const blob = new Blob(recordedChunks);
      var newBlobs = this.state.blobs.copy();
      newBlobs.push(blob);
      this.setState({ blobs: newBlobs });
      console.log("blob added:", this.state.blobs);
    });

    mediaRecorder.start();
  };

  stopRecording = () => {
    this.setState({ blobs: [] });
    this.setState({ recordingShouldStop: true });
  };

  displayBlob(blog, id) {
    //return <li key={id}>{blog}</li>;
    return <audio key={id} controls></audio>;
  }

  render() {
    return (
      <div>
        <h1>Voice recording</h1>
        <button onClick={this.onStart}>Start</button>
        <button onClick={this.onStop}>Stop</button>
        <hr />
        <h1>Records</h1>
        <ul>
          {this.state.blobs.map((blob, index) => this.displayBlob(blob, index))}
        </ul>
      </div>
    );
  }
}

export default App;
