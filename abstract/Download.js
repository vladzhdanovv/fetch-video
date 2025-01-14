const EventEmitter = require('events');
const fs = require('fs');
const progress = require('progress-stream');
class Download extends EventEmitter {
  constructor(source, out, options) {
    super();
    this.source = source;
    this.out = out;
    this.options = options || {};
    this.progress = -1;
  }
  updateProgress(transferred, length) {
    const newProgress = Math.floor((transferred / length) * 100);
    if (newProgress <= this.progress) return;
    this.progress = newProgress;
    this.emit('progress', newProgress);
  }
  go() {
    return new Promise(async (resolve, reject) => {
      try {
        const stream = await this._getStream();
        const progressDuplex = progress({ time: 500});
        progressDuplex.on('progress', ({ transferred, length, speed }) => {
          this.emit('speed', parseInt(speed, 10));
          if (length) this.updateProgress(transferred, length);
        });
        stream.on('error', reject);
        stream.on('response', res => {
          if (!res || !res.headers) return;
          if (res.headers['content-encoding'] === 'gzip') return;
          if (res.headers['content-length']) return progressDuplex.setLength(parseInt(res.headers['content-length'], 10));
        });
        const outStream = fs.createWriteStream(this.out);
        outStream.on('finish', resolve);
        outStream.on('error', reject);
        stream
            .pipe(progressDuplex)
            .pipe(outStream);
      } catch (e) {
        reject(e);
      }
    });
  }

}
module.exports = Download;