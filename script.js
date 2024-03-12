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
    case 176: // control change
      handleMIDIMessage(message);
      break;
    // we could easily expand this switch statement to cover other types of commands such as sysex
  }
}

function handleMIDIMessage(message) {
  const [status, data1, data2] = message.data;
  // Check if it's a control change message (status 0xB0)
  if (status === 176) {
    // Check if it's the knob you're interested in (CC number 71)
    if (data1 === 70) {
      // React to knob input (data2 contains the value)
      console.log('Knob value A:', data2);
      gainKnob = data2;
      // You can update UI, adjust parameters, etc. here
    }
    if (data1 === 71) {
      // React to knob input (data2 contains the value)
      console.log('Knob value B:', data2);
      freqKnob = data2;
      // You can update UI, adjust parameters, etc. here
    }
    if (data1 === 72) {
      // React to knob input (data2 contains the value)
      console.log('Knob value C:', data2);
      console.log(waveKnob);
      if (data2 < 40) {
        waveKnob = 'sine';
      } else if (data2 >= 41 && data2 <= 90) {
        waveKnob = 'square';
      } else if (data2 > 90) {
        waveKnob = 'triangle';
      }
      // You can update UI, adjust parameters, etc. here
    }
    if (data1 === 73) {
      // React to knob input (data2 contains the value)
      console.log('Knob value D:', data2);
      delayKnob = parseFloat(data2);
      if (!Number.isFinite(delayKnob)) {
        delayKnob = 0.5; // Assign a default value if the incoming value is invalid
      }
      // You can update UI, adjust parameters, etc. here
    }
    if (data1 === 74) {
      // React to knob input (data2 contains the value)
      console.log('Knob value E:', data2);
      attackKnob = parseFloat(data2 / 100);
      if (!Number.isFinite(attackKnob)) {
        attackKnob = 0.1; // Assign a default value if the incoming value is invalid
      }
      // You can update UI, adjust parameters, etc. here
    }
    if (data1 === 75) {
      // React to knob input (data2 contains the value)
      console.log('Knob value F:', data2);
      // You can update UI, adjust parameters, etc. here
    }
    if (data1 === 76) {
      // React to knob input (data2 contains the value)
      console.log('Knob value G:', data2);
      // You can update UI, adjust parameters, etc. here
    }
    if (data1 === 77) {
      // React to knob input (data2 contains the value)
      console.log('Knob value H:', data2);
      // You can update UI, adjust parameters, etc. here
    }
  }
}

function noteOn(note, vel) {
  const osc = ctx.createOscillator();
  const oscGain = ctx.createGain(); // Adjust this value to control attack time (in seconds)

  oscGain.gain.value = 0; // Set initial gain to 0

  const delayNode = ctx.createDelay(2); // 2 seconds of max delay
  delayNode.delayTime.value = delayKnob; // Set delay time to 0.5 second

  const velocityGainAmnt = (1 / 127) * vel;
  const velocityGain = ctx.createGain();
  velocityGain.gain.value = velocityGainAmnt;

  osc.type = waveKnob;
  osc.frequency.value = (midiToFreq(note) * freqKnob) / 100;

  osc.gain = oscGain;
  osc.connect(oscGain);
  oscGain.connect(delayNode); // Connect oscillator to delay node
  delayNode.connect(velocityGain); // Connect delay node to velocity gain
  velocityGain.connect(ctx.destination); // Connect velocity gain to destination

  // Apply attack to gain
  const now = ctx.currentTime;
  oscGain.gain.setValueAtTime(0, now); // Start from 0
  oscGain.gain.linearRampToValueAtTime(
    (0.5 * gainKnob) / 100,
    now + attackKnob
  ); // Attack to desired gain value

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
