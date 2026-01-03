/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/**
 * Analyser class for live audio visualisation.
 */
export class Analyser {
  private analyser: AnalyserNode;
  private bufferLength = 0;
  private dataArray: Uint8Array;

  constructor(node: AudioNode) {
    this.analyser = node.context.createAnalyser();
    this.analyser.fftSize = 32;
    this.bufferLength = this.analyser.frequencyBinCount;
    this.dataArray = new Uint8Array(this.bufferLength);
    node.connect(this.analyser);
  }

  update() {
    this.analyser.getByteFrequencyData(this.dataArray);
  }

  get data() {
    return this.dataArray;
  }
}


// /**
//  * @license
//  * SPDX-License-Identifier: Apache-2.0
// */

// /**
//  * Analyser class for live audio visualisation.
//  */
// export class Analyser {
//   private analyser: AnalyserNode;
//   private dataArray: Uint8Array;

//   constructor(node: AudioNode) {
//     this.analyser = node.context.createAnalyser();
//     this.analyser.fftSize = 32;

//     // The fix is here: Be explicit about the buffer type
//     const bufferLength = this.analyser.frequencyBinCount;
//     const buffer = new ArrayBuffer(bufferLength);
//     this.dataArray = new Uint8Array(buffer);
    
//     node.connect(this.analyser);
//   }

//   update() {
//     // This call will now pass the type check
//     this.analyser.getByteFrequencyData(this.dataArray);
//   }

//   get data() {
//     return this.dataArray;
//   }
// }
