window.AudioContext = window.AudioContext || window.webkitAudioContext;
let ctx;

const StartButton = document.querySelector('button');
const oscillators = {};
let gainKnob = 50, // Initialize with a default value
  freqKnob = 50, // Initialize with a default value
  waveKnob = 'sine', // Initialize with a default waveform
  delayKnob = 0.0, // Initialize with a default delay
  attackKnob = 0.1; // Initialize with a default attack
let note = null;

StartButton.addEventListener('click', () => {
  ctx = new AudioContext();
  console.log(ctx);
});

function midiToFreq(number) {
  const a = 440;
  return (a / 32) * 2 ** ((number - 9) / 12);
}

navigator.requestMIDIAccess().then(onMidiSuccess, onMidiFailure);

function onMidiSuccess(midiAccess) {
  console.log(midiAccess);

  for (let input of midiAccess.inputs.values()) {
    input.onmidimessage = getMIDIMessage;
  }
}

function getMIDIMessage(message) {
  let command = message.data[0] & 0xf0; // Ignore channel
  let channel = message.data[0] & 0x0f; // Get channel
  note = message.data[1];
  let velocity = message.data.length > 2 ? message.data[2] : 0;

  console.log(
    `Command: ${command}, Channel: ${channel}, Note: ${note}, Velocity: ${velocity}`
  );

  switch (command) {
    case 144: // Note On
      if (velocity > 0) {
        noteOn(note, velocity);
      } else {
        noteOff(note);
      }
      break;
    case 128: // Note Off
      noteOff(note);
      break;
    case 176: // Control Change
      handleMIDIControlChange(message);
      break;
    default:
      console.log(`Unhandled command: ${command}`);
      break;
  }
}

function handleMIDIControlChange(message) {
  const [status, data1, data2] = message.data;
  let gainProgress = document.getElementById('gainProgress');
  let wave = document.getElementById('wave');
  let delayProgress = document.getElementById('delayProgress');
  let freqProgress = document.getElementById('freqProgress');

  switch (data1) {
    case 9:
      console.log('Knob value A:', data2);
      gainKnob = data2;
      gainProgress.value = data2;
      break;
    case 10:
      console.log('Knob value B:', data2);
      freqKnob = data2;
      freqProgress.value = data2;
      break;
    case 11:
      console.log('Knob value C:', data2);
      if (data2 < 40) {
        waveKnob = 'sine';
        wave.value = 0;
      } else if (data2 >= 40 && data2 <= 90) {
        waveKnob = 'square';
        wave.value = 50;
      } else {
        waveKnob = 'triangle';
        wave.value = 100;
      }
      break;
    case 12:
      console.log('Knob value D:', data2);
      delayKnob = parseFloat(data2) / 100; // Assuming data2 ranges from 0 to 100
      if (!Number.isFinite(delayKnob)) {
        delayKnob = 0.5; // Fallback value
      }
      delayProgress.value = data2;
      break;
    case 7:
      console.log('Knob value E:', data2);
      attackKnob = parseFloat(data2 / 100);
      if (!Number.isFinite(attackKnob)) {
        attackKnob = 0.1;
      }
      break;
    default:
      console.log(`Unhandled Control Change: ${data1}, Value: ${data2}`);
      break;
  }
}

function noteOn(note, vel) {
  const osc = ctx.createOscillator();
  const oscGain = ctx.createGain();
  const velocityGainAmnt = (1 / 127) * vel;
  const velocityGain = ctx.createGain();

  // Set up nodes
  osc.type = waveKnob;
  osc.frequency.value = (midiToFreq(note) * freqKnob) / 100;
  oscGain.gain.value = 0;

  // Connect nodes
  osc.connect(oscGain);
  oscGain.connect(velocityGain);
  velocityGain.connect(ctx.destination);

  // Apply gain envelope
  const now = ctx.currentTime;
  oscGain.gain.setValueAtTime(0, now);
  oscGain.gain.linearRampToValueAtTime(
    (0.5 * gainKnob) / 100,
    now + attackKnob
  );

  // Start oscillator
  osc.start();

  // Store oscillator
  oscillators[note.toString()] = { osc, oscGain, startTime: now };

  // Change key color
  const keyElement = document.querySelector(`.key[data-note="${note}"]`);
  if (keyElement) {
    keyElement.style.backgroundColor = '#67BFF0'; // Change to desired color
  }
}

function noteOff(note) {
  const oscData = oscillators[note.toString()];
  if (!oscData) return; // Check if the oscillator exists

  const { osc, oscGain } = oscData;
  const now = ctx.currentTime;

  // Fade out gain
  oscGain.gain.setValueAtTime(oscGain.gain.value, now);
  oscGain.gain.linearRampToValueAtTime(0, now + delayKnob); // Fade out over delayKnob time

  // Stop oscillator after delayKnob time
  setTimeout(() => {
    osc.stop();
    osc.disconnect();
    delete oscillators[note.toString()];
  }, delayKnob * 1000); // Convert delayKnob to milliseconds

  // Revert key color
  const keyElement = document.querySelector(`.key[data-note="${note}"]`);
  if (keyElement) {
    keyElement.style.backgroundColor = ''; // Revert to original color
  }
}

function onMidiFailure() {
  console.log('Could not access your MIDI devices.');
}

const pianoContainer = document.getElementsByClassName('piano-container')[0];
const base = './audio/';
const whiteKeys = [1, 3, 5, 6, 8, 10, 12, 13, 15, 17, 18, 20, 22, 24, 25];
const blackKeys = [2, 4, 7, 9, 11, 14, 16, 19, 21, 23];

window.onload = () => {
  let midiNote = 60; // Starting from C4
  for (let index = 1; index <= 25; index++) {
    let div = document.createElement('div');
    if (whiteKeys.includes(index)) {
      div.classList.add('key', 'white-key');
      pianoContainer.appendChild(div);
    } else {
      div.classList.add('key', 'black-key');
      div.style.left = `${(index - Math.floor(index / 7) - 1) * 41 + 30}px`;
      pianoContainer.appendChild(div);
    }
    div.dataset.note = midiNote;
    midiNote++;
    const number = index <= 9 ? '0' + index : index;
    div.addEventListener('click', () => {
      new Audio(`${base}key${number}.mp3`).play();
    });
  }
};
