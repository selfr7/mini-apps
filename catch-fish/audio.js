/* 纯合成 Web Audio 音效系统：完全离线，不依赖任何外部音频文件 */
(function () {
  "use strict";

  var ctx = null;
  var isMuted = false;

  function getContext() {
    if (!ctx) {
      var AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        ctx = new AudioCtx();
      }
    }
    if (ctx && ctx.state === "suspended") {
      ctx.resume().catch(function () {});
    }
    return ctx;
  }

  /* 泡泡音效 (水下小鱼) */
  function playBubble() {
    if (isMuted) return;
    var ac = getContext();
    if (!ac) return;
    try {
      var now = ac.currentTime;
      var osc = ac.createOscillator();
      var gain = ac.createGain();

      osc.type = "sine";
      var startFreq = 300 + Math.random() * 200;
      var endFreq = startFreq + 350 + Math.random() * 200;
      osc.frequency.setValueAtTime(startFreq, now);
      osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.12);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc.connect(gain);
      gain.connect(ac.destination);

      osc.start(now);
      osc.stop(now + 0.15);
    } catch (e) {}
  }

  /* 拍击 / 抓挠音效 */
  function playSlap() {
    if (isMuted) return;
    var ac = getContext();
    if (!ac) return;
    try {
      var now = ac.currentTime;
      // 噪音缓冲
      var bufferSize = Math.floor(ac.sampleRate * 0.1);
      var buffer = ac.createBuffer(1, bufferSize, ac.sampleRate);
      var output = buffer.getChannelData(0);
      for (var i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      var whiteNoise = ac.createBufferSource();
      whiteNoise.buffer = buffer;

      // 滤波
      var filter = ac.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(800, now);
      filter.frequency.exponentialRampToValueAtTime(120, now + 0.09);

      var gain = ac.createGain();
      gain.gain.setValueAtTime(0.6, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(ac.destination);

      whiteNoise.start(now);
      whiteNoise.stop(now + 0.1);

      // 叠加一点低音咚
      var osc = ac.createOscillator();
      var oscGain = ac.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.08);
      oscGain.gain.setValueAtTime(0.5, now);
      oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.09);

      osc.connect(oscGain);
      oscGain.connect(ac.destination);
      osc.start(now);
      osc.stop(now + 0.09);
    } catch (e) {}
  }

  /* 小鸟啾啾声 */
  function playBirdChirp() {
    if (isMuted) return;
    var ac = getContext();
    if (!ac) return;
    try {
      var now = ac.currentTime;
      var osc = ac.createOscillator();
      var gain = ac.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(2200, now);
      osc.frequency.exponentialRampToValueAtTime(3200, now + 0.04);
      osc.frequency.exponentialRampToValueAtTime(2400, now + 0.09);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

      osc.connect(gain);
      gain.connect(ac.destination);

      osc.start(now);
      osc.stop(now + 0.1);
    } catch (e) {}
  }

  /* 小老鼠吱吱声 */
  function playMouseSqueak() {
    if (isMuted) return;
    var ac = getContext();
    if (!ac) return;
    try {
      var now = ac.currentTime;
      var osc = ac.createOscillator();
      var gain = ac.createGain();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(3200, now);
      osc.frequency.exponentialRampToValueAtTime(4500, now + 0.03);
      osc.frequency.exponentialRampToValueAtTime(2800, now + 0.07);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

      osc.connect(gain);
      gain.connect(ac.destination);

      osc.start(now);
      osc.stop(now + 0.08);
    } catch (e) {}
  }

  /* 抓获命中成功声（清脆提示音） */
  function playHit(type) {
    if (isMuted) return;
    playSlap();
    var ac = getContext();
    if (!ac) return;
    try {
      var now = ac.currentTime;
      var osc = ac.createOscillator();
      var gain = ac.createGain();

      osc.type = "sine";
      var f1 = 523.25; // C5
      var f2 = 659.25; // E5
      if (type === "bird") { f1 = 783.99; f2 = 1046.50; }
      if (type === "mouse") { f1 = 659.25; f2 = 880.00; }

      osc.frequency.setValueAtTime(f1, now);
      osc.frequency.setValueAtTime(f2, now + 0.05);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc.connect(gain);
      gain.connect(ac.destination);

      osc.start(now);
      osc.stop(now + 0.18);
    } catch (e) {}
  }

  function setMuted(val) {
    isMuted = !!val;
  }

  function toggleMuted() {
    isMuted = !isMuted;
    return isMuted;
  }

  window.GameAudio = {
    init: getContext,
    bubble: playBubble,
    slap: playSlap,
    birdChirp: playBirdChirp,
    mouseSqueak: playMouseSqueak,
    hit: playHit,
    setMuted: setMuted,
    toggleMuted: toggleMuted,
    isMuted: function () { return isMuted; }
  };
})();
