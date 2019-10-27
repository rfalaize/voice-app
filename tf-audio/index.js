let recognizer;

function predictWord() {
  console.log("predictWord...");
  // Array of words that the recognizer is trained to recognize.
  const words = recognizer.wordLabels();
  console.log("words=", words);
  recognizer.listen(
    ({ scores }) => {
      // Turn scores into a list of (score, word) pairs.
      scores = Array.from(scores).map((s, i) => ({ score: s, word: words[i] }));
      console.log("scores=", scores);
      // Find the most probable word.
      scores.sort((s1, s2) => s2.score - s1.score);
      document.querySelector("#console").textContent = scores[0].word;
    },
    { probabilityThreshold: 0.75 }
  );
}

async function app() {
  console.log("Loading speech commands model...");
  recognizer = speechCommands.create("BROWSER_FFT");
  await recognizer.ensureModelLoaded();
  console.log("done");
  predictWord();
}

app();
