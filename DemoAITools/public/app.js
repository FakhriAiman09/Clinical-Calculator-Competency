let recorder;
let audioBlob;

const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
recorder = new MediaRecorder(stream);
let chunks = [];

recorder.ondataavailable = e => chunks.push(e.data);


recorder.onstop = () => {
  audioBlob = new Blob(chunks, { type: "audio/wav" });
  chunks = [];
};

document.getElementById("record").onclick = () => recorder.start();
document.getElementById("stop").onclick = () => recorder.stop();

function send(type) {
  const formData = new FormData();
  formData.append("audio", audioBlob);

  fetch(`/${type}`, { method: "POST", body: formData })
    .then(r => r.json())
    .then(d => document.getElementById(type).value = d.text);
}
