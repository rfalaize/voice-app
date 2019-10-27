import React from "react";
import "./Recorder.css";
import createPlotlyComponent from "react-plotly.js/factory";

const AudioContext = window.AudioContext || window.webkitAudioContext;
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
    // recorder helpers
    this.mediaRecorder = null;
    this.audioContext = null;
    this.audioContextSource = null;
    this.analyser = null;
    this.frameIntervalTask = null;
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
      .catch(error => alert("Could not start recording: " + error.message));
  };

  onStop = () => {
    this.stopRecording();
  };

  startRecording = stream => {
    console.log("Start recording...");
    if (this.frameIntervalTask != null) {
      console.warn("Recording was already started.");
      return;
    }
    this.setState({
      recording: true,
      recordingShouldStop: false,
      recordingStopped: false
    });

    // create media recorder to get audio input in webm format
    // see https://developers.google.com/web/fundamentals/media/recording-audio
    const options = { mimeType: "audio/webm" };
    const recordedChunks = [];
    this.mediaRecorder = new MediaRecorder(stream, options);
    // create audio context
    this.audioContext = new AudioContext();
    this.audioContextSource = this.audioContext.createMediaStreamSource(stream);
    // create analyser node to get frequency and time-domain data
    // see https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048;
    this.audioContextSource.connect(this.analyser);
    const bufferLength = this.analyser.frequencyBinCount;
    const sampleRateHz = 44100;
    const timeDomainData = [];
    const frequenciesData = [];

    // grab state, to use it in child functions
    var parentComponent = this;

    // start collecting numerical signal, at a frequency defined by sampleRateHz
    this.frameIntervalTask = setInterval(function() {
      console.log("--> collecting samples...");
      var timeDomainDataArray = new Float32Array(bufferLength);
      var frequenciesDataArray = new Float32Array(bufferLength);
      parentComponent.analyser.getFloatTimeDomainData(timeDomainDataArray);
      parentComponent.analyser.getFloatFrequencyData(frequenciesDataArray);
      if (
        timeDomainDataArray[0] === -Infinity ||
        frequenciesDataArray[0] === -Infinity
      ) {
        // don't record empty signals
        return;
      }
      timeDomainData.push(timeDomainDataArray);
      frequenciesData.push(frequenciesDataArray);
    }, (this.analyser.fftSize / sampleRateHz) * 1000);

    this.mediaRecorder.addEventListener("dataavailable", function(e) {
      console.log(">> data available");
      if (e.data.size > 0 && !parentComponent.state.recordingStopped) {
        recordedChunks.push(e.data);
      }
    });

    this.mediaRecorder.addEventListener("stop", function() {
      console.log("stopped recording. creating new blob...");
      // const blob = new Blob(recordedChunks);
      const blob = new Blob(recordedChunks, { type: "audio/wav; codecs=0" });
      const blobUrl = URL.createObjectURL(blob);
      var newRecords = [...parentComponent.state.records];
      //

      //window.RhomeDataSample = [timeDomainDataArray, frequenciesDataArray];
      console.log("dataArrays", window.RhomeDataSample);
      console.log("---------------------------------------");
      var newRecord = {
        category: parentComponent.state.selectedCategory,
        value: parentComponent.state.selectedValue,
        blob: blob,
        url: blobUrl,
        timeDomainData: timeDomainData,
        frequenciesData: frequenciesData
      };
      console.log("new record=", newRecord);
      // add to collected records
      newRecords.push(newRecord);
      parentComponent.setState({ records: newRecords });
    });

    this.mediaRecorder.start(200);
  };

  stopRecording = () => {
    console.log("stopRecording clicked");

    clearInterval(this.frameIntervalTask); // stop collection of numerical data
    this.frameIntervalTask = null;
    this.mediaRecorder.stop();
    this.analyser.disconnect();
    this.audioContext.close();

    this.setState({
      recordingStopped: true,
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
    var zValues = [];
    const numFrequencies = record.frequenciesData[0].length;
    const numTimeSteps = record.frequenciesData.length;
    for (var f = 0; f < numFrequencies; f++) {
      // 1 row per frequency
      var timeValues = [];
      // 1 col per time step
      for (var t = 0; t < numTimeSteps; t++) {
        timeValues.push(record.frequenciesData[t][f]);
      }
      zValues.push(timeValues);
    }
    return (
      <div key={id} className="record-container">
        <div className="record-item">
          <p>{record.value}</p>
        </div>
        <div className="record-item">
          <audio src={record.url} controls></audio>
        </div>
        <div className="record-item">
          {/* <Plot
            data={[
              {
                x: record.frequenciesData[0].keys(),
                y: record.frequenciesData[0],
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
          /> */}
          <Plot
            data={[
              {
                z: zValues,
                type: "heatmap",
                colorscale: "Viridis"
              }
            ]}
            layout={{
              width: "100%",
              height: "100%",
              title: "FFT Spectogram (decibels)",
              plot_bgcolor: "black",
              paper_bgcolor: "black",
              xaxis: {
                title: { text: "Time step" }
              },
              yaxis: {
                title: { text: "Frequency bucket" }
              }
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
