import React from "react";
import "./Recorder.css";
import createPlotlyComponent from "react-plotly.js/factory";

const Plotly = window.Plotly;
const Plot = createPlotlyComponent(Plotly);

class Recorder extends React.Component {
  constructor(props) {
    super(props);
    // state
    this.state = {};
    this.state.microphoneAvailable = false;
    this.state.recordingShouldStop = false;
    this.state.recordingStopped = true;
    this.state.records = [];
    // categories
    this.state.ml = {};
    this.state.ml.questions = [
      { id: 0, text: "What time is it in", samples: [] },
      { id: 1, text: "How is the weather in", samples: [] },
      { id: 2, text: "How many people live in", samples: [] },
      { id: 3, text: "Show me a picture of", samples: [] }
    ];
    this.state.ml.cities = [
      { id: 0, text: "Paris", samples: [] },
      { id: 1, text: "London", samples: [] },
      { id: 2, text: "New York", samples: [] },
      { id: 3, text: "Hong Kong", samples: [] }
    ];
    // UI helpers
    this.state.selectedCategory = "questions";
    this.state.selectedValue = this.state.ml[
      this.state.selectedCategory
    ][0].text;
    this.state.buttonStartVisible = true;
    this.state.buttonStopVisible = false;
  }

  // ***********************************************************************
  // text recording
  // ***********************************************************************
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
    this.setState({ buttonStartVisible: false, buttonStopVisible: true });
    navigator.mediaDevices
      .getUserMedia({ audio: true, video: false })
      .then(this.startRecording)
      .catch(error => alert("Could not start recording:", error.message));
  };

  onStop = () => {
    this.stopRecording();
  };

  startRecording = stream => {
    // console.log("start recording...");
    this.setState({
      recording: true,
      recordingShouldStop: false,
      recordingStopped: false
    });

    // see https://developers.google.com/web/fundamentals/media/recording-audio
    const options = { mimeType: "audio/webm" };
    const recordedChunks = [];
    const mediaRecorder = new MediaRecorder(stream, options);

    // console.log("media recorder created.");
    var recorderComponent = this;

    mediaRecorder.addEventListener("dataavailable", function(e) {
      // console.log("dataavailable", e);
      if (e.data.size > 0) {
        recordedChunks.push(e.data);
      }
      if (
        recorderComponent.state.recordingShouldStop === true &&
        recorderComponent.state.recordingStopped === false
      ) {
        mediaRecorder.stop();
        recorderComponent.setState({ recordingStopped: true });
      }
    });

    mediaRecorder.addEventListener("stop", function() {
      // console.log("stopped recording. creating new blob...");
      const blob = new Blob(recordedChunks);
      // const blob = new Blob(recordedChunks, { type: "audio/wav; codecs=0" });
      var newRecords = [...recorderComponent.state.records];
      var newRecord = {
        category: recorderComponent.state.selectedCategory,
        value: recorderComponent.state.selectedValue,
        blob: blob,
        url: URL.createObjectURL(blob)
      };
      console.log("new record=", newRecord);
      // add to collected records
      newRecords.push(newRecord);
      recorderComponent.setState({ records: newRecords });
    });

    mediaRecorder.start();
  };

  stopRecording = () => {
    // console.log("stopRecording clicked");
    this.setState({
      recordingShouldStop: true,
      buttonStartVisible: true,
      buttonStopVisible: false
    });
  };

  // ***********************************************************************
  // data storage
  // ***********************************************************************
  saveRecord = (url, id) => {
    console.log("record ", id, "saved.");
  };

  saveAllRecords = () => {};

  deleteRecord = id => {
    var newRecords = [...this.state.records];
    newRecords.splice(id, 1);
    this.setState({ records: newRecords });
  };

  // ***********************************************************************
  // rendering
  // ***********************************************************************

  displayRecord(record, id) {
    return (
      <div key={id} className="record-container">
        <div className="record-item">
          <p>{record.value}</p>
        </div>
        <div className="record-item">
          <audio src={record.url} controls></audio>
        </div>
        <div className="record-item">
          <Plot
            data={[
              {
                x: Array.from(Array(200).keys()).map(x => 0.05 * x),
                y: Array.from(Array(200).keys()).map(x => Math.cos(0.05 * x)),
                type: "scatter",
                mode: "lines"
              }
            ]}
            layout={{
              width: "100%",
              height: "100%",
              title: "Signal amplitude",
              plot_bgcolor: "black",
              paper_bgcolor: "black"
            }}
          />
        </div>
        <div className="record-item">
          <button className="button-red" onClick={() => this.deleteRecord(id)}>
            Delete
          </button>
        </div>
      </div>
    );
  }

  displaySaveAll() {
    if (this.state.records.length > 0)
      return (
        <div>
          <h1>Save all samples </h1>
          <p>for future use...</p>
          <button>Save All</button>
        </div>
      );
  }

  handleChangeById = event => {
    this.setState({
      [event.target.id]: event.target.value
    });
  };

  render() {
    return (
      <div>
        <h1>Record audio</h1>
        <div>
          <p>
            Choose a category and click on record to start collecting samples.
            These will later be used to train the model.
          </p>
          <p>
            Note: it is recommended to grab at least 3 samples for each
            question, and 3 for each city, for the model to learn properly.
          </p>
        </div>
        {/* category selector */}
        <div>
          <h3>Please choose a category... </h3>
          <select
            id="selectedCategory"
            className="form-control"
            value={this.state.selectedCategory}
            onChange={this.handleChangeById}
          >
            <option>questions</option>
            <option>cities</option>
          </select>
        </div>
        {/* value selector */}
        <div>
          <h3>... and record the phrase below:</h3>
          <select
            id="selectedValue"
            className="form-control"
            value={this.state.selectedValue}
            onChange={this.handleChangeById}
          >
            {this.state.ml[this.state.selectedCategory].map((selection, id) => (
              <option key={id}>{selection.text}</option>
            ))}
          </select>
        </div>
        {/* buttons */}
        <br />
        <div>
          <button
            onClick={this.onStart}
            style={{
              visibility: this.state.buttonStartVisible ? "visible" : "hidden"
            }}
          >
            Record
          </button>
          <button
            onClick={this.onStop}
            className="button-red"
            style={{
              visibility: this.state.buttonStopVisible ? "visible" : "hidden"
            }}
          >
            Stop
          </button>
        </div>
        {/* samples */}
        <h1>Collected samples</h1>
        <div>
          {this.state.records.map((record, index) =>
            this.displayRecord(record, index)
          )}
        </div>
        {/* save */}
        {this.displaySaveAll()}
      </div>
    );
  }
}

export default Recorder;
