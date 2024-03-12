window.AudioContext;
let ctx;

const StartButton = document.querySelector('button');
const oscilattors = {};
let gainKnob, freqKnob, waveKnob, delayKnob, attackKnob;

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
  let velocity = message.data.length > 2 ? message.data[2] : 0;

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
    case 176:
      handleMIDIMessage(message);
      break;
  }
}

function handleMIDIMessage(message) {
  const [status, data1, data2] = message.data;
  if (status === 176) {
    switch (data1) {
      case 70:
        console.log('Knob value A:', data2);
        gainKnob = data2;
        break;
      case 71:
        console.log('Knob value B:', data2);
        freqKnob = data2;
        break;
      case 72:
        console.log('Knob value C:', data2);
        console.log(waveKnob);
        if (data2 < 40) {
          waveKnob = 'sine';
        } else if (data2 >= 41 && data2 <= 90) {
          waveKnob = 'square';
        } else if (data2 > 90) {
          waveKnob = 'triangle';
        }
        break;
      case 73:
        console.log('Knob value D:', data2);
        delayKnob = parseFloat(data2);
        if (!Number.isFinite(delayKnob)) {
          delayKnob = 0;
        }
        break;
      case 74:
        console.log('Knob value E:', data2);
        attackKnob = parseFloat(data2 / 100);
        if (!Number.isFinite(attackKnob)) {
          attackKnob = 0;
          break;
        }
    }
  }
}
function noteOn(note, vel) {
  const osc = ctx.createOscillator();
  const oscGain = ctx.createGain(); //

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
  console.log('Não foi possível acessar o dispositivo MIDI');
}
