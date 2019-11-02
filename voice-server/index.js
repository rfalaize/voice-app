const express = require("express");
const bodyParser = require("body-parser");

// create express app
const app = express();

// parse requests of content-type - application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }));

// parse requests of content-type - application/json
app.use(bodyParser.json());

// **************************************************
// configuring the database
// **************************************************
const dbCreds = require("./config/database.credentials.json");
const mongoose = require("mongoose");
mongoose.Promise = global.Promise;
// load models
const HealthCheck = require("./model/healthCheck.js");
const VoiceSample = require("./model/voiceSample.js");

console.log("Connecting to mongodb...");
const uri = "mongodb+srv://" + dbCreds.mongoUser + ":" + dbCreds.mongoPassword + "@" + dbCreds.uri + "/voice-app?retryWrites=true&w=majority";
mongoose
    .connect(uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useFindAndModify: true
    })
    .then(() => {
        console.log("Successfully connected to the database");
    })
    .catch(err => {
        console.error("Could not connect to the database. Exiting now...", err);
        process.exit();
    });

// **************************************************
// routes
// **************************************************
app.get("/", (req, res) => {
    res.json({
        message: "Welcome to the voice app API"
    });
});

app.get("/health-check", (req, res) => {
    console.log("Get health check...");
    // query
    HealthCheck.find({})
        .limit(10)
        .exec(function(error, response) {
            if (error) {
                console.error("An error occurred during query:", error);
                res.json({
                    success: false,
                    errorMessage: error
                });
                return;
            }
            // success
            console.log("query response:", response);
            res.json({
                success: true,
                results: response
            });
        });
});

app.get("/voice-samples", (req, res) => {
    console.log("Fetching samples...");
    // query
    VoiceSample.find({})
        .limit(10)
        .exec(function(err, res) {
            if (err) {
                const message = "An error occurred during query: " + err.message;
                console.error(message);
                res.json({
                    success: false,
                    message: message
                });
                return;
            }
            // success
            console.log("query response:", res);
            res.json({
                success: true,
                results: res
            });
        });
});

app.post("/voice-sample/save", (req, res) => {
    const sample = new VoiceSample({
        ip: req.headers["x-forwarded-for"] || req.connection.remoteAddress,
        audio: req.body.audio
    });
    sample.save(function(err) {
        if (err) {
            console.log("An error occured while saving sample:", err);
            res.json({ status: "KO", errorMessage: err.message });
        }
        console.log("Success! document saved:", sample);
        res.json({ status: "OK", id: sample._id });
    });
});

app.delete("/voice-sample/delete/:id", (req, res) => {
    VoiceSample.findByIdAndRemove(req.params.id, function(err) {
        if (err) handleError(err, res);
        const message = "Document " + req.params.id + " deleted successfully.";
        console.log(message);
        res.json({ success: true, message: message });
    });
});

function handleError(err, res) {
    const message = "An error occurred: " + err.message;
    console.error(message);
    res.json({
        success: false,
        errorMessage: error
    });
}

// **************************************************
// listen for requests
// **************************************************
const PORT = process.env.PORT || 3300;
app.listen(PORT, () => {
    console.log("******************************************");
    console.log("Server is listening on port", PORT, ". Press CTRL+C to return...");
    console.log("******************************************");
});
