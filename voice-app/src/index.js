import React from "react";
import ReactDOM from "react-dom";
import Recorder from "./Recorder";
import * as serviceWorker from "./serviceWorker";

ReactDOM.render(<Recorder />, document.getElementById("root"));

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note that this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
