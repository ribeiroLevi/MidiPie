window.AudioContext;
let ctx;

const StartButton = document.querySelector('button');
const oscilattors = {};
let gainKnob = 50, // Initialize with a default value
  freqKnob = 50, // Initialize with a default value
  waveKnob = 'sine', // Initialize with a default waveform
  delayKnob = 0.5, // Initialize with a default delay
  attackKnob = 0.1; // Initialize with a default attack

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
  let note = message.data[1];
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
  const [data1, data2] = message.data;

  switch (data1) {
    case 9:
      console.log('Knob value A:', data2);
      gainKnob = data2;
      break;
    case 10:
      console.log('Knob value B:', data2);
      freqKnob = data2;
      break;
    case 11:
      console.log('Knob value C:', data2);
      if (data2 < 40) {
        waveKnob = 'sine';
      } else if (data2 >= 41 && data2 <= 90) {
        waveKnob = 'square';
      } else {
        waveKnob = 'triangle';
      }
      break;
    case 12:
      console.log('Knob value D:', data2);
      delayKnob = parseFloat(data2);
      if (!Number.isFinite(delayKnob)) {
        delayKnob = 0.5;
      }
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

  oscGain.gain.value = 0;

  const delayNode = ctx.createDelay(2);
  delayNode.delayTime.value = delayKnob;

  const velocityGainAmnt = (1 / 127) * vel;
  const velocityGain = ctx.createGain();
  velocityGain.gain.value = velocityGainAmnt;

  osc.type = waveKnob;
  osc.frequency.value = (midiToFreq(note) * freqKnob) / 100;

  osc.gain = oscGain;
  osc.connect(oscGain);
  oscGain.connect(delayNode);
  delayNode.connect(velocityGain);
  velocityGain.connect(ctx.destination);

  const now = ctx.currentTime;
  oscGain.gain.setValueAtTime(0, now);
  oscGain.gain.linearRampToValueAtTime(
    (0.5 * gainKnob) / 100,
    now + attackKnob
  );

  osc.start();
  console.log(osc);

  oscilattors[note.toString()] = osc;
}

function noteOff(note) {
  const osc = oscilattors[note.toString()];
  const oscGain = osc.gain;

  oscGain.gain.setValueAtTime(oscGain.gain.value, ctx.currentTime);
  oscGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.03);

  setTimeout(() => {
    osc.stop();
    osc.disconnect();
  }, 20);

  delete oscilattors[note.toString()];
}

function onMidiFailure() {
  console.log('Could not access your MIDI devices.');
}
