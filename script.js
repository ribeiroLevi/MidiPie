window.AudioContext;
let ctx;

const StartButton = document.querySelector('button');
const oscilattors = {};
StartButton.addEventListener('click', () => {
  ctx = new AudioContext();
  console.log(ctx);
});

function midiToFreq(number) {
  const a = 440;
  return (a / 32) * 2 ** ((number - 9) / 12);
}

navigator.requestMIDIAccess().then(onMidiSucess, onMidiFailure);

function onMidiSucess(midiAccess) {
  console.log(midiAccess);

  let inputs = midiAccess.inputs;
  let outputs = midiAccess.outputs;

  for (let input of midiAccess.inputs.values()) {
    input.onmidimessage = getMIDIMessage;
  }
}
function getMIDIMessage(message) {
  let command = message.data[0];
  let note = message.data[1];
  let velocity = message.data.length > 2 ? message.data[2] : 0; // a velocity value might not be included with a noteOff command

  switch (command) {
    case 144: // noteOn
      if (velocity > 0) {
        noteOn(note, velocity);
      } else {
        noteOff(note);
      }
      break;
    case 128: // noteOff
      noteOff(note);
      break;
    // we could easily expand this switch statement to cover other types of commands such as controllers or sysex
  }
}

function noteOn(note, vel) {
  const osc = ctx.createOscillator();
  const oscGain = ctx.createGain();

  oscGain.gain.value = 0.33;

  const velocityGainAmnt = (1 / 127) * vel;
  const velocityGain = ctx.createGain();
  velocityGain.gain.value = velocityGainAmnt;

  osc.type = 'sine';
  osc.frequency.value = midiToFreq(note);

  osc.gain = oscGain;
  osc.connect(oscGain);
  oscGain.connect(velocityGain);
  velocityGain.connect(ctx.destination);

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
  console.log('Não foi possível acessar o dispositivo MIDI');
}
