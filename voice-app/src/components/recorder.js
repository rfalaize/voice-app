import React from "react";
import "./recorder.css";
import createPlotlyComponent from "react-plotly.js/factory";
import AudioStoreApi from "../api/audioStoreApi";

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
        this.state.record = null;
        // categories
        this.state.ml = {};
        this.state.ml.questions = [
            { id: 0, text: "What time is it in" },
            { id: 1, text: "How is the weather in" },
            { id: 2, text: "How many people live in" },
            { id: 3, text: "Show me a picture of" }
        ];
        this.state.ml.cities = [{ id: 0, text: "Paris" }, { id: 1, text: "London" }, { id: 2, text: "New York" }, { id: 3, text: "Hong Kong" }];
        // ui helpers
        this.state.selectedQuestion = "What time is it in Paris?";
        this.state.buttonStartVisible = true;
        this.state.buttonStopVisible = false;
        this.state.userName = null;
        this.state.userEmailAddress = null;
        this.state.apiPwd = null;
        // save/delete
        this.state.recordSaved = null;
        // recorder helpers
        this.mediaRecorder = null;
        this.audioContext = null;
        this.audioContextSource = null;
        this.analyser = null;
        this.frameIntervalTask = null;
        // providers
        this.audioStoreApi = new AudioStoreApi();
    }

    handleChangeById = event => {
        this.setState({
            [event.target.id]: event.target.value
        });
    };

    validateUserInputs = () => {
        if (this.state.userName == null) return false;
        if (!this.validateEmail(this.state.userEmailAddress)) return false;
        return true;
    };

    validateEmail(email) {
        if (email == null) return false;
        var re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(String(email).toLowerCase());
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
            if (timeDomainDataArray[0] === -Infinity || frequenciesDataArray[0] === -Infinity) {
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
            const blob = new Blob(recordedChunks, { type: "audio/wav; codecs=0" });
            const blobUrl = URL.createObjectURL(blob);
            var newRecord = {
                question: parentComponent.state.selectedQuestion,
                blob: blob,
                url: blobUrl,
                timeDomainData: timeDomainData,
                frequenciesData: frequenciesData
            };
            parentComponent.setState({ record: newRecord });
        });

        this.mediaRecorder.start(200);
    };

    stopRecording = () => {
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
    saveRecord = record => {
        if (!this.validateUserInputs()) {
            alert("Please enter a user name, a valid email address, and the API password.");
            return;
        }
        this.audioStoreApi.saveRecord(this.state.userName, this.state.userEmailAddress, record, this.state.apiPwd).then(resp => {
            console.log(resp);
            this.setState({ recordSaved: resp });
        });
    };

    deleteRecord = () => {
        if (this.state.recordSaved == null) return;
        if (this.state.recordSaved.status === false) return;
        console.log("deleting record", this.state.recordSaved.id);
        this.audioStoreApi.deleteRecord(this.state.recordSaved.id, this.state.apiPwd).then(resp => {
            console.log(resp);
            if (resp.success !== true) {
                alert("An error occurred while deleting record: " + resp.errorMessage);
                return;
            }
            this.setState({ record: null, recordSaved: null });
        });
    };

    // ***********************************************************************
    // rendering
    // ***********************************************************************

    getQuestions = () => {
        const questions = [];
        for (const question of this.state.ml.questions) {
            for (const city of this.state.ml.cities) {
                questions.push(question.text + " " + city.text + "?");
            }
        }
        return questions;
    };

    displaySaveStatus = () => {
        if (this.state.recordSaved == null) return;
        if (this.state.recordSaved.success) {
            return (
                <div>
                    <p className="save-success">
                        Success! record saved successfully. Record ID: <strong> {this.state.recordSaved.id}</strong>
                    </p>
                </div>
            );
        } else {
            return (
                <div>
                    <p className="save-error">{"An error occurred while saving record: " + this.state.recordSaved.errorMessage}</p>
                </div>
            );
        }
    };

    displayRecord() {
        const record = this.state.record;
        if (record == null) return;
        var zValues = [];
        const numTimeSteps = record.frequenciesData.length;
        if (numTimeSteps === 0) return;
        const numFrequencies = record.frequenciesData[0].length;
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
            <div>
                <h1>Collected sample</h1>
                <div className="record-container">
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
                        <button className="button-green" onClick={() => this.saveRecord(record)}>
                            Save
                        </button>
                        <button className="button-red" onClick={() => this.deleteRecord(record)}>
                            Delete
                        </button>
                    </div>
                    <div className="record-item">{this.displaySaveStatus()}</div>
                </div>
            </div>
        );
    }

    render() {
        return (
            <div>
                <h1>Record audio</h1>
                <div>
                    <p>Choose a question and click on record to start collecting samples. These will later be used to train a neural network.</p>
                    <p>Note: it is recommended to grab at least 3 samples for each question for the model to learn properly.</p>
                </div>
                {/* email */}
                <div className="container">
                    <h3>Enter your email</h3>
                    <p> Model is customized for each user</p>
                    <input id="userName" placeholder="Choose a user name" onChange={this.handleChangeById} required />
                    <input id="userEmailAddress" type="email" placeholder="youremail@domain.com" onChange={this.handleChangeById} required />
                    <input id="apiPwd" type="password" placeholder="api secret key" onChange={this.handleChangeById} required />
                </div>
                {/* question selector */}
                <div>
                    <h3>Choose a question</h3>
                    <select id="selectedQuestion" className="form-control" value={this.state.selectedCategory} onChange={this.handleChangeById}>
                        {this.getQuestions().map((q, id) => (
                            <option key={id}>{q}</option>
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
                {/* sample */}
                <div>{this.displayRecord(this.state.record, 0)}</div>;{/* dialogs */}
            </div>
        );
    }
}

export default Recorder;
