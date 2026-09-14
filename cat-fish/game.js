/* 游戏主引擎：小动物实体、多点触控、猫爪动画、粒子特效与 Canvas 2D 渲染 */
(function () {
  "use strict";

  var canvas, ctx;
  var width = 0, height = 0, dpr = 1;
  var mode = "fish"; // "fish" | "bird" | "mouse"
  var pawSkin = "orange"; // "orange" | "white" | "black" | "calico"
  var speedLevel = 1; // 0.7(慢), 1(中), 1.4(快)
  var countTarget = 6; // 屏幕中小动物数量

  var entities = [];
  var paws = [];
  var particles = [];
  var ripples = [];
  var lastTime = 0;
  var isRunning = true;
  var score = 0;
  var onScoreCallback = null;

  /* 颜色与样式表 */
  var THEMES = {
    fish: {
      bgTop: "#bbf2f6",
      bgBottom: "#68c5db",
      accent: "#2ea1b8",
      particleColor: "rgba(255,255,255,0.7)"
    },
    bird: {
      bgTop: "#ebf9db",
      bgBottom: "#aee282",
      accent: "#6da83b",
      particleColor: "rgba(255,248,180,0.8)"
    },
    mouse: {
      bgTop: "#f9ebd2",
      bgBottom: "#dfbe99",
      accent: "#a97843",
      particleColor: "rgba(255,230,150,0.8)"
    }
  };

  /* 实体基类 / 构造 */
  function createEntity(type) {
    var size = 44 + Math.random() * 16;
    var x = Math.random() * (width - size * 2) + size;
    var y = Math.random() * (height - size * 2) + size;
    var angle = Math.random() * Math.PI * 2;
    var baseSpeed = (1.2 + Math.random() * 1.5) * speedLevel;
    if (type === "fish") baseSpeed *= 1.0;
    if (type === "bird") baseSpeed *= 1.35;
    if (type === "mouse") baseSpeed *= 1.25;

    var colors = {
      fish: [
        { body: "#ff5e36", stripe: "#ffffff", fin: "#ff3838", border: "rgba(180, 40, 20, 0.45)", eye: "#3d1c16" }, // 经典元气亮橙
        { body: "#ffa801", stripe: "#ffffff", fin: "#ff8200", border: "rgba(180, 80, 0, 0.45)", eye: "#3d2600" },  // 阳光金黄
        { body: "#ff5e7e", stripe: "#ffffff", fin: "#ff3f6c", border: "rgba(180, 30, 70, 0.45)", eye: "#3d1020" },  // 珊瑚粉桃
        { body: "#00d2d3", stripe: "#ffffff", fin: "#01a3a4", border: "rgba(0, 120, 130, 0.45)", eye: "#052e33" },  // 薄荷青蓝
        { body: "#a55eea", stripe: "#ffffff", fin: "#8854d0", border: "rgba(90, 40, 140, 0.45)", eye: "#26113d" }   // 梦幻紫罗兰
      ],
      bird: [
        { body: "#ffd32a", belly: "#fff4b8", wing: "#ffc048", beak: "#ff5e36", comb: "#ff4757", eye: "#2b2320" }, // 经典小黄鸡
        { body: "#ffbe76", belly: "#fff0df", wing: "#f0932b", beak: "#eb4d4b", comb: "#ff3838", eye: "#2b2320" }, // 暖橙雏鸡
        { body: "#badc58", belly: "#f6fae8", wing: "#6ab04c", beak: "#e67e22", comb: "#eb4d4b", eye: "#1b2816" }, // 抹茶小鸡
        { body: "#ffb8b8", belly: "#fff0f0", wing: "#ff9f9f", beak: "#ff5e36", comb: "#ff4757", eye: "#3d1020" }, // 蜜桃粉小鸡
        { body: "#ffffff", belly: "#fff8f8", wing: "#dcdde1", beak: "#f0932b", comb: "#eb4d4b", eye: "#2f3640" }  // 纯白雪花鸡
      ],
      mouse: [
        { body: "#f5c494", belly: "#fff7ee", ear: "#ff9eb5", eye: "#2b2320" }, // 奶茶金仓鼠
        { body: "#d5c9c4", belly: "#ffffff", ear: "#ffaec0", eye: "#2b2320" }, // 银灰糯米鼠
        { body: "#ffffff", belly: "#fff0f5", ear: "#ff94ab", eye: "#201a18" }, // 纯白雪球鼠
        { body: "#e8a87c", belly: "#fff5eb", ear: "#ff8fa3", eye: "#201a18" }, // 焦糖胖胖鼠
        { body: "#ffc2a1", belly: "#fff2e8", ear: "#ff8fa3", eye: "#2b2320" }  // 蜜桃布丁鼠
      ]
    };

    var typeColors = colors[type] || colors.fish;
    var colorIdx = Math.floor(Math.random() * typeColors.length);

    return {
      type: type,
      x: x,
      y: y,
      vx: Math.cos(angle) * baseSpeed,
      vy: Math.sin(angle) * baseSpeed,
      angle: angle,
      targetAngle: angle,
      speed: baseSpeed,
      baseSpeed: baseSpeed,
      size: size,
      color: typeColors[colorIdx],
      animTime: Math.random() * 100,
      turnTimer: 0,
      scaredTimer: 0,
      state: "normal", // "normal" | "flee" | "pause"
      pauseTimer: 0
    };
  }

  /* 粒子构造 */
  function addBubble(x, y, vx, vy, r, life) {
    particles.push({
      type: "bubble",
      x: x,
      y: y,
      vx: vx || (Math.random() - 0.5) * 0.5,
      vy: vy || -0.8 - Math.random() * 1.2,
      r: r || 3 + Math.random() * 5,
      alpha: 0.8,
      life: life || 1.0,
      decay: 0.015 + Math.random() * 0.01
    });
  }

  function addStar(x, y, color) {
    for (var i = 0; i < 7; i++) {
      var a = (Math.PI * 2 / 7) * i + Math.random() * 0.4;
      var spd = 2 + Math.random() * 3.5;
      particles.push({
        type: "star",
        x: x,
        y: y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        size: 5 + Math.random() * 5,
        alpha: 1,
        color: color || "#ffeb3b",
        decay: 0.03 + Math.random() * 0.02,
        rot: Math.random() * Math.PI,
        vRot: (Math.random() - 0.5) * 0.2
      });
    }
  }

  function addFeather(x, y, color) {
    for (var i = 0; i < 4; i++) {
      var a = Math.random() * Math.PI * 2;
      var spd = 1 + Math.random() * 2;
      particles.push({
        type: "feather",
        x: x,
        y: y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd - 0.5,
        size: 8 + Math.random() * 8,
        alpha: 0.9,
        color: color || "#fff",
        decay: 0.02,
        rot: Math.random() * Math.PI,
        vRot: (Math.random() - 0.5) * 0.1
      });
    }
  }

  function addHeart(x, y) {
    for (var i = 0; i < 3; i++) {
      var a = (Math.PI * 2 / 3) * i + Math.random() * 0.5;
      var spd = 1.2 + Math.random() * 2.0;
      particles.push({
        type: "heart",
        x: x + (Math.random() - 0.5) * 20,
        y: y + (Math.random() - 0.5) * 20,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd - 0.8,
        size: 7 + Math.random() * 5,
        alpha: 1,
        color: "#ff758f",
        decay: 0.025,
        rot: (Math.random() - 0.5) * 0.4,
        vRot: (Math.random() - 0.5) * 0.05
      });
    }
  }

  function addRipple(x, y, maxR) {
    ripples.push({
      x: x,
      y: y,
      r: 6,
      maxR: maxR || 55,
      alpha: 0.8,
      speed: 2.2
    });
  }

  /* 猫爪扑击 */
  function addPaw(x, y) {
    // 爪子永远从屏幕下方（玩家视角）扑向目标点，绝不从顶部倒挂
    var startY = height + 180;
    // 爪根根据目标点在左右两侧自然倾斜
    var startX = x + (x - width * 0.5) * 0.3;

    var reachAngle = Math.atan2(y - startY, x - startX);

    paws.push({
      targetX: x,
      targetY: y,
      curX: startX,
      curY: startY,
      startX: startX,
      startY: startY,
      angle: reachAngle + Math.PI / 2, // 爪尖朝向目标点，手臂在后方
      skin: pawSkin,
      progress: 0, // 0 -> 1 (扑下) -> 2 (收回)
      state: "striking", // "striking" | "holding" | "retracting"
      holdTime: 0,
      hitProcessed: false
    });
  }

  /* 实体更新 */
  function updateEntities(dt) {
    // 确保实体数量与 countTarget 一致
    while (entities.length < countTarget) {
      entities.push(createEntity(mode));
    }
    while (entities.length > countTarget) {
      entities.pop();
    }

    for (var i = 0; i < entities.length; i++) {
      var e = entities[i];
      e.animTime += dt;
      e.turnTimer -= dt;

      // 状态逻辑
      if (e.type === "mouse") {
        if (e.state === "pause") {
          e.pauseTimer -= dt;
          if (e.pauseTimer <= 0) {
            e.state = "normal";
            e.targetAngle += (Math.random() - 0.5) * 1.8;
            e.speed = e.baseSpeed * (1 + Math.random() * 0.6);
          }
        } else {
          // 偶尔停下来探头
          if (Math.random() < 0.006 && e.turnTimer <= 0) {
            e.state = "pause";
            e.pauseTimer = 0.4 + Math.random() * 0.8;
          }
        }
      } else if (e.type === "bird") {
        // 小黄鸡走走停停、低头啄米行为
        if (e.state === "peck") {
          e.pauseTimer -= dt;
          if (e.pauseTimer <= 0) {
            e.state = "normal";
            e.targetAngle += (Math.random() - 0.5) * 1.5;
            e.speed = e.baseSpeed * (1 + Math.random() * 0.5);
          }
        } else {
          // 跑动中偶尔停下欢快啄米
          if (Math.random() < 0.008 && e.turnTimer <= 0) {
            e.state = "peck";
            e.pauseTimer = 0.35 + Math.random() * 0.45;
          }
        }
      }

      if (e.turnTimer <= 0 && e.state !== "peck" && e.state !== "pause") {
        e.turnTimer = 0.8 + Math.random() * 1.5;
        e.targetAngle += (Math.random() - 0.5) * 1.2;
      }

      // 平滑转向 (限制最大转向速度，保证永远朝前走)
      var diff = e.targetAngle - e.angle;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      e.angle += diff * 0.1;

      // 移动速度
      var isStopped = (e.state === "pause" || e.state === "peck");
      var currentSpeed = isStopped ? 0 : e.speed;
      e.vx = Math.cos(e.angle) * currentSpeed;
      e.vy = Math.sin(e.angle) * currentSpeed;

      e.x += e.vx;
      e.y += e.vy;

      // 边界圆弧平滑转向屏幕中央 (绝无生硬倒退或倒飞)
      var pad = e.size + 15;
      if (e.x < pad || e.x > width - pad || e.y < pad || e.y > height - pad) {
        // 靠近边界时，目标角度自然指向屏幕中心
        var toCenterX = width * 0.5 - e.x;
        var toCenterY = height * 0.5 - e.y;
        e.targetAngle = Math.atan2(toCenterY, toCenterX) + (Math.random() - 0.5) * 0.6;
        e.turnTimer = 0.6;
        // 限制在边界内
        e.x = Math.max(pad, Math.min(width - pad, e.x));
        e.y = Math.max(pad, Math.min(height - pad, e.y));
      }

      // 小鱼偶尔吐泡泡
      if (e.type === "fish" && Math.random() < 0.015) {
        addBubble(e.x + Math.cos(e.angle) * (e.size * 0.5), e.y + Math.sin(e.angle) * (e.size * 0.5));
      }
    }
  }

  /* 猫爪更新与碰撞判定 */
  function updatePaws(dt) {
    for (var i = paws.length - 1; i >= 0; i--) {
      var p = paws[i];

      if (p.state === "striking") {
        p.progress += dt * 5.0; // 扑击极快
        if (p.progress >= 1.0) {
          p.progress = 1.0;
          p.curX = p.targetX;
          p.curY = p.targetY;
          p.state = "holding";
          p.holdTime = 0.12; // 拍在地上停留片刻

          // 触发落地冲击
          addRipple(p.targetX, p.targetY, 70);
          addHeart(p.targetX, p.targetY);
          if (mode === "fish") {
            window.GameAudio.bubble();
            for (var b = 0; b < 6; b++) {
              addBubble(p.targetX + (Math.random() - 0.5) * 40, p.targetY + (Math.random() - 0.5) * 40);
            }
          }

          // 抓捕碰撞判定
          checkHit(p.targetX, p.targetY);
        } else {
          // 缓动到达
          var t = p.progress;
          var ease = 1 - Math.pow(1 - t, 3);
          p.curX = p.startX + (p.targetX - p.startX) * ease;
          p.curY = p.startY + (p.targetY - p.startY) * ease;
        }
      } else if (p.state === "holding") {
        p.holdTime -= dt;
        if (p.holdTime <= 0) {
          p.state = "retracting";
        }
      } else if (p.state === "retracting") {
        p.progress -= dt * 3.5;
        if (p.progress <= 0) {
          paws.splice(i, 1);
          continue;
        }
        var t2 = p.progress;
        p.curX = p.startX + (p.targetX - p.startX) * t2;
        p.curY = p.startY + (p.targetY - p.startY) * t2;
      }
    }
  }

  /* 抓捕判定 */
  function checkHit(hitX, hitY) {
    var hitRadius = 65;
    var hitCount = 0;

    for (var i = 0; i < entities.length; i++) {
      var e = entities[i];
      var dx = e.x - hitX;
      var dy = e.y - hitY;
      var dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < hitRadius + e.size * 0.4) {
        // 抓到了！
        hitCount++;
        score++;
        if (onScoreCallback) onScoreCallback(score, mode);

        // 特效
        if (mode === "fish") {
          addStar(e.x, e.y, "#ffe066");
          for (var k = 0; k < 8; k++) addBubble(e.x, e.y);
        } else if (mode === "bird") {
          addFeather(e.x, e.y, e.color.wing);
          addStar(e.x, e.y, "#ffcc00");
          window.GameAudio.birdChirp();
        } else if (mode === "mouse") {
          addStar(e.x, e.y, "#ffd166");
          window.GameAudio.mouseSqueak();
        }

        // 音效
        window.GameAudio.hit(mode);

        // 重生在屏幕远处边缘
        var side = Math.floor(Math.random() * 4);
        if (side === 0) { e.x = Math.random() * width; e.y = -30; e.angle = Math.PI / 2; }
        else if (side === 1) { e.x = width + 30; e.y = Math.random() * height; e.angle = Math.PI; }
        else if (side === 2) { e.x = Math.random() * width; e.y = height + 30; e.angle = -Math.PI / 2; }
        else { e.x = -30; e.y = Math.random() * height; e.angle = 0; }
        e.targetAngle = e.angle + (Math.random() - 0.5) * 0.5;
        e.speed = e.baseSpeed * 1.5; // 重生后加速冲出
      }
    }

    if (hitCount === 0) {
      window.GameAudio.slap();
    }
  }

  /* 粒子与涟漪更新 */
  function updateParticles(dt) {
    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= p.decay;
      if (p.rot !== undefined) p.rot += p.vRot;
      if (p.alpha <= 0) {
        particles.splice(i, 1);
      }
    }

    for (var j = ripples.length - 1; j >= 0; j--) {
      var r = ripples[j];
      r.r += r.speed;
      r.alpha = Math.max(0, 1 - (r.r / r.maxR));
      if (r.r >= r.maxR || r.alpha <= 0) {
        ripples.splice(j, 1);
      }
    }
  }

  /* ========== 绘制部分 ========== */

  /* 绘制背景 */
  function drawBackground() {
    var theme = THEMES[mode] || THEMES.fish;
    var grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, theme.bgTop);
    grad.addColorStop(1, theme.bgBottom);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    if (mode === "fish") {
      // 水面波光浮动
      ctx.save();
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      var time = Date.now() * 0.001;
      for (var i = 0; i < 4; i++) {
        ctx.beginPath();
        var cy = (height * 0.25 * i + Math.sin(time + i) * 20) % height;
        ctx.ellipse(width * 0.3 + (i * 90) % width, cy, 140, 50, time * 0.2 + i, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    } else if (mode === "bird") {
      // 阳光草地与可爱小雏菊花朵
      ctx.save();
      // 小草点缀
      ctx.fillStyle = "rgba(100, 160, 50, 0.15)";
      for (var g = 0; g < 6; g++) {
        var gx = (width * 0.15 + g * 140) % width;
        var gy = (height * 0.2 + g * 180) % height;
        ctx.beginPath();
        ctx.arc(gx, gy, 18, 0, Math.PI * 2);
        ctx.arc(gx + 12, gy - 6, 14, 0, Math.PI * 2);
        ctx.fill();
      }
      // 小雏菊花瓣
      var flowers = [
        { x: width * 0.25, y: height * 0.3 },
        { x: width * 0.75, y: height * 0.25 },
        { x: width * 0.35, y: height * 0.75 },
        { x: width * 0.8, y: height * 0.7 }
      ];
      for (var f = 0; f < flowers.length; f++) {
        var fl = flowers[f];
        // 白色花瓣
        ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
        for (var p = 0; p < 5; p++) {
          var fa = (Math.PI * 2 / 5) * p;
          ctx.beginPath();
          ctx.arc(fl.x + Math.cos(fa) * 7, fl.y + Math.sin(fa) * 7, 4.5, 0, Math.PI * 2);
          ctx.fill();
        }
        // 黄色花心
        ctx.fillStyle = "#ffd32a";
        ctx.beginPath();
        ctx.arc(fl.x, fl.y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    } else if (mode === "mouse") {
      // 地板木纹微弱格线
      ctx.save();
      ctx.strokeStyle = "rgba(140,90,40,0.08)";
      ctx.lineWidth = 2;
      var step = 80;
      for (var y = step; y < height; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  /* 绘制小丑鱼 (尼莫：经典黑边白斑条纹 + 圆润扇形鳍 + 水汪汪大眼) */
  function drawFish(e) {
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.rotate(e.angle);

    var len = e.size;
    var w = e.size * 0.58; // 圆润饱满身躯
    var tailWag = Math.sin(e.animTime * 14) * 0.32;
    var finWag = Math.sin(e.animTime * 10) * 0.28;

    var c = e.color;

    // 1. 波浪小背鳍 (背部上方)
    ctx.save();
    ctx.fillStyle = c.fin;
    ctx.beginPath();
    ctx.moveTo(-len * 0.2, -w * 0.42);
    ctx.quadraticCurveTo(-len * 0.05, -w * 0.85, len * 0.15, -w * 0.4);
    ctx.closePath();
    ctx.fill();
    // 背鳍黑白包边
    ctx.strokeStyle = c.border;
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.restore();

    // 2. 腹鳍 (下方小鳍)
    ctx.save();
    ctx.fillStyle = c.fin;
    ctx.beginPath();
    ctx.moveTo(-len * 0.1, w * 0.42);
    ctx.quadraticCurveTo(0, w * 0.72, len * 0.1, w * 0.4);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = c.border;
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.restore();

    // 3. 大扇形摆动尾鳍
    ctx.save();
    ctx.translate(-len * 0.44, 0);
    ctx.rotate(tailWag);

    // 尾鳍主色
    ctx.fillStyle = c.fin;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-len * 0.25, -w * 0.7, -len * 0.48, -w * 0.5);
    ctx.quadraticCurveTo(-len * 0.32, 0, -len * 0.48, w * 0.5);
    ctx.quadraticCurveTo(-len * 0.25, w * 0.7, 0, 0);
    ctx.fill();

    // 尾鳍白色过渡弧带
    ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
    ctx.beginPath();
    ctx.moveTo(-len * 0.2, -w * 0.35);
    ctx.quadraticCurveTo(-len * 0.35, 0, -len * 0.2, w * 0.35);
    ctx.quadraticCurveTo(-len * 0.28, 0, -len * 0.2, -w * 0.35);
    ctx.fill();

    // 尾鳍黑色外轮廓
    ctx.strokeStyle = c.border;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    // 4. 胖胖小丑鱼主身躯 (饱满椭圆)
    ctx.fillStyle = c.body;
    ctx.beginPath();
    ctx.ellipse(0, 0, len * 0.48, w * 0.48, 0, 0, Math.PI * 2);
    ctx.fill();

    // 5. 经典小丑鱼 3 道黑边白斑纹 (White Clownfish Stripes)
    // 头部第一道白斑纹 (弧形环带)
    ctx.save();
    ctx.fillStyle = c.stripe;
    ctx.strokeStyle = c.border;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.ellipse(len * 0.15, 0, len * 0.08, w * 0.46, 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 身体中部第二道白斑纹 (中间微带小尖角)
    ctx.beginPath();
    ctx.moveTo(-len * 0.08, -w * 0.45);
    ctx.quadraticCurveTo(-len * 0.02, 0, -len * 0.08, w * 0.45);
    ctx.lineTo(-len * 0.18, w * 0.42);
    ctx.quadraticCurveTo(-len * 0.12, 0, -len * 0.18, -w * 0.42);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 尾柄第三道白斑纹 (细环带)
    ctx.beginPath();
    ctx.ellipse(-len * 0.34, 0, len * 0.045, w * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // 6. 扇动的小胸鳍 (带黑白边)
    ctx.save();
    ctx.translate(len * 0.06, w * 0.12);
    ctx.rotate(finWag + 0.2);
    ctx.fillStyle = c.fin;
    ctx.beginPath();
    ctx.ellipse(0, 0, len * 0.18, w * 0.14, 0.2, 0, Math.PI * 2);
    ctx.fill();
    // 胸鳍白尖与黑边
    ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
    ctx.beginPath();
    ctx.arc(len * 0.08, 0, w * 0.06, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = c.border;
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.restore();

    // 7. 萌系水汪汪大眼睛 (大黑眼珠 + 双层闪亮高光)
    var eyeX = len * 0.27;
    var eyeY = -w * 0.18;
    var eyeR = w * 0.22;

    // 白眼底
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(eyeX, eyeY, eyeR, 0, Math.PI * 2);
    ctx.fill();

    // 瞳孔
    ctx.fillStyle = c.eye || "#201a18";
    ctx.beginPath();
    ctx.arc(eyeX + 1.5, eyeY, eyeR * 0.72, 0, Math.PI * 2);
    ctx.fill();

    // 主反光大高光
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(eyeX + eyeR * 0.35, eyeY - eyeR * 0.3, eyeR * 0.38, 0, Math.PI * 2);
    ctx.fill();

    // 次小高光
    ctx.beginPath();
    ctx.arc(eyeX - eyeR * 0.2, eyeY + eyeR * 0.25, eyeR * 0.2, 0, Math.PI * 2);
    ctx.fill();

    // 8. 嘟嘟小嘴唇 (游动时萌萌吐泡泡)
    ctx.fillStyle = c.fin;
    ctx.beginPath();
    ctx.arc(len * 0.46, 0, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = c.border;
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // 9. 腮红
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    ctx.beginPath();
    ctx.arc(len * 0.16, w * 0.16, w * 0.14, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  /* 绘制小黄鸡 (俯瞰视角：圆滚滚毛绒小雏鸡 + 碎步扑翅 + 啄米) */
  function drawBird(e) {
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.rotate(e.angle);

    var len = e.size;
    var w = e.size * 0.74; // 胖圆小鸡身材
    var c = e.color;

    var isPecking = (e.state === "peck");
    var walkCycle = Math.sin(e.animTime * 20);
    var peckNod = isPecking ? Math.sin(e.animTime * 28) * 4 : 0;
    var wingFlap = isPecking ? Math.sin(e.animTime * 24) * 0.35 : walkCycle * 0.25;

    // 1. 两只橙色小鸡爪 (草地上吧嗒吧嗒小碎步)
    ctx.fillStyle = c.beak;
    var footDist = w * 0.32;
    var footStep1 = isPecking ? 0 : walkCycle * 4;
    var footStep2 = isPecking ? 0 : -walkCycle * 4;
    // 左脚爪
    ctx.beginPath();
    ctx.ellipse(-len * 0.12 + footStep1, -footDist, 4.5, 3, -0.2, 0, Math.PI * 2);
    ctx.fill();
    // 右脚爪
    ctx.beginPath();
    ctx.ellipse(-len * 0.12 + footStep2, footDist, 4.5, 3, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // 2. 俏皮翘起的小尾羽
    ctx.fillStyle = c.wing;
    ctx.beginPath();
    ctx.moveTo(-len * 0.4, 0);
    ctx.lineTo(-len * 0.62, -w * 0.18);
    ctx.lineTo(-len * 0.52, 0);
    ctx.lineTo(-len * 0.62, w * 0.18);
    ctx.closePath();
    ctx.fill();

    // 3. 胖乎乎圆滚滚小鸡身体 (嫩黄小绒球)
    ctx.fillStyle = c.body;
    ctx.beginPath();
    ctx.ellipse(0, 0, len * 0.46, w * 0.48, 0, 0, Math.PI * 2);
    ctx.fill();

    // 4. 软糯浅色小肚腩
    ctx.fillStyle = c.belly;
    ctx.beginPath();
    ctx.ellipse(len * 0.08, 0, len * 0.32, w * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();

    // 5. 两侧扑扇的小翅膀
    // 左翅
    ctx.save();
    ctx.translate(-len * 0.05, -w * 0.38);
    ctx.rotate(wingFlap - 0.2);
    ctx.fillStyle = c.wing;
    ctx.beginPath();
    ctx.ellipse(0, 0, len * 0.2, w * 0.16, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 右翅
    ctx.save();
    ctx.translate(-len * 0.05, w * 0.38);
    ctx.rotate(-wingFlap + 0.2);
    ctx.fillStyle = c.wing;
    ctx.beginPath();
    ctx.ellipse(0, 0, len * 0.2, w * 0.16, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 6. 头顶萌萌小鸡冠 / 呆毛
    ctx.fillStyle = c.comb;
    ctx.beginPath();
    ctx.arc(len * 0.12, 0, 4.5, 0, Math.PI * 2);
    ctx.arc(len * 0.22, 0, 4, 0, Math.PI * 2);
    ctx.fill();

    // 7. 三角形嫩橙小鸡喙 (带啄米点动)
    ctx.fillStyle = c.beak;
    var beakX = len * 0.44 + peckNod;
    ctx.beginPath();
    ctx.moveTo(beakX - 2, -w * 0.1);
    ctx.lineTo(beakX + 8, 0);
    ctx.lineTo(beakX - 2, w * 0.1);
    ctx.closePath();
    ctx.fill();

    // 8. 水汪汪黑葡萄大眼睛 (两颗圆溜溜大眼 + 漫画闪亮高光)
    var eyeX = len * 0.25;
    var eyeY = w * 0.22;
    var eyeR = w * 0.12;

    var eyes = [-eyeY, eyeY];
    for (var i = 0; i < eyes.length; i++) {
      var ey = eyes[i];
      // 白眼底
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(eyeX, ey, eyeR + 1, 0, Math.PI * 2);
      ctx.fill();

      // 黑瞳孔
      ctx.fillStyle = c.eye;
      ctx.beginPath();
      ctx.arc(eyeX, ey, eyeR, 0, Math.PI * 2);
      ctx.fill();

      // 大高光
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(eyeX + eyeR * 0.35, ey - eyeR * 0.3, eyeR * 0.4, 0, Math.PI * 2);
      ctx.fill();

      // 小高光
      ctx.beginPath();
      ctx.arc(eyeX - eyeR * 0.2, ey + eyeR * 0.3, eyeR * 0.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // 9. 两颗粉嫩大腮红
    ctx.fillStyle = "rgba(255, 100, 130, 0.45)";
    ctx.beginPath();
    ctx.arc(len * 0.18, -w * 0.32, 5.5, 0, Math.PI * 2);
    ctx.arc(len * 0.18, w * 0.32, 5.5, 0, Math.PI * 2);
    ctx.fill();

    // 10. 如果正在啄米，地上冒出两颗微小米粒/小星星
    if (isPecking) {
      ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
      ctx.beginPath();
      ctx.arc(beakX + 12, -4, 1.8, 0, Math.PI * 2);
      ctx.arc(beakX + 15, 3, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  /* 绘制小老鼠 (超圆滚滚 Q 萌卡通奶茶仓鼠球) */
  function drawMouse(e) {
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.rotate(e.angle);

    var len = e.size;
    var w = e.size * 0.78; // 更胖更圆
    var bounce = Math.sin(e.animTime * 22) * 2; // 跑步时 Q 弹抖动
    var wiggle = Math.sin(e.animTime * 16);

    // 1. 短圆毛球小尾巴 (像小棉花糖，不再是细长怪尾巴)
    ctx.save();
    var tailX = -len * 0.44;
    var tailWag = Math.sin(e.animTime * 14) * 3;
    ctx.fillStyle = e.color.ear;
    ctx.beginPath();
    ctx.arc(tailX - 2, tailWag, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 120, 150, 0.4)";
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();

    // 2. 两个短短的小后脚脚
    ctx.fillStyle = e.color.ear;
    ctx.beginPath();
    ctx.ellipse(-len * 0.2, -w * 0.46, 5, 3.5, -0.3, 0, Math.PI * 2);
    ctx.ellipse(-len * 0.2, w * 0.46, 5, 3.5, 0.3, 0, Math.PI * 2);
    ctx.fill();

    // 3. 圆滚滚胖胖身体 (近乎圆形的大团子)
    ctx.fillStyle = e.color.body;
    ctx.beginPath();
    ctx.ellipse(0, 0, len * 0.46 + bounce * 0.3, w * 0.48 - bounce * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();

    // 4. 软白圆肚腩
    ctx.fillStyle = e.color.belly;
    ctx.beginPath();
    ctx.ellipse(len * 0.08, 0, len * 0.34, w * 0.36, 0, 0, Math.PI * 2);
    ctx.fill();

    // 5. 圆圆大耳朵 (两只像马卡龙的大耳朵)
    var earR = w * 0.3;
    var earY = w * 0.46;
    // 上耳
    ctx.fillStyle = e.color.body;
    ctx.beginPath();
    ctx.arc(-len * 0.1, -earY, earR, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = e.color.ear;
    ctx.beginPath();
    ctx.arc(-len * 0.08, -earY, earR * 0.65, 0, Math.PI * 2);
    ctx.fill();

    // 下耳
    ctx.fillStyle = e.color.body;
    ctx.beginPath();
    ctx.arc(-len * 0.1, earY, earR, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = e.color.ear;
    ctx.beginPath();
    ctx.arc(-len * 0.08, earY, earR * 0.65, 0, Math.PI * 2);
    ctx.fill();

    // 6. 两个短短的小前手手
    ctx.fillStyle = e.color.ear;
    var handWiggle = Math.sin(e.animTime * 20) * 2;
    ctx.beginPath();
    ctx.arc(len * 0.2 + handWiggle, -w * 0.28, 4, 0, Math.PI * 2);
    ctx.arc(len * 0.2 - handWiggle, w * 0.28, 4, 0, Math.PI * 2);
    ctx.fill();

    // 7. 水汪汪卡通萌系大眼睛 (两颗黑葡萄大眼 + 漫画闪亮高光)
    var eyeX = len * 0.24;
    var eyeY = w * 0.22;
    var eyeR = w * 0.13;

    // 左眼与右眼
    var eyes = [-eyeY, eyeY];
    for (var i = 0; i < eyes.length; i++) {
      var ey = eyes[i];
      // 眼白微底
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(eyeX, ey, eyeR + 1, 0, Math.PI * 2);
      ctx.fill();

      // 纯黑大瞳孔
      ctx.fillStyle = e.color.eye;
      ctx.beginPath();
      ctx.arc(eyeX, ey, eyeR, 0, Math.PI * 2);
      ctx.fill();

      // 主大高光
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(eyeX + eyeR * 0.35, ey - eyeR * 0.3, eyeR * 0.42, 0, Math.PI * 2);
      ctx.fill();

      // 次小高光
      ctx.beginPath();
      ctx.arc(eyeX - eyeR * 0.25, ey + eyeR * 0.3, eyeR * 0.22, 0, Math.PI * 2);
      ctx.fill();
    }

    // 8. 两个粉红大腮红 (超治愈)
    ctx.fillStyle = "rgba(255, 110, 140, 0.45)";
    ctx.beginPath();
    ctx.ellipse(len * 0.2, -w * 0.34, 6.5, 4.5, 0.2, 0, Math.PI * 2);
    ctx.ellipse(len * 0.2, w * 0.34, 6.5, 4.5, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // 9. 粉嫩倒三角小鼻子
    ctx.fillStyle = "#ff758f";
    ctx.beginPath();
    var noseX = len * 0.45;
    ctx.moveTo(noseX, -3);
    ctx.lineTo(noseX + 4, 0);
    ctx.lineTo(noseX, 3);
    ctx.closePath();
    ctx.fill();

    // 10. 可爱的 "ω" 微笑嘴巴
    ctx.strokeStyle = "#8b5e3c";
    ctx.lineWidth = 1.3;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(noseX - 2, -2.5, 3, 0.2, Math.PI * 0.9);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(noseX - 2, 2.5, 3, -Math.PI * 0.9, -0.2);
    ctx.stroke();

    // 11. 柔软短胡须 (微翘两对)
    ctx.strokeStyle = "rgba(100, 70, 50, 0.35)";
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    var hW = wiggle * 1.5;
    // 上侧胡须
    ctx.moveTo(noseX - 3, -4); ctx.lineTo(noseX + 8, -14 + hW);
    ctx.moveTo(noseX - 2, -3); ctx.lineTo(noseX + 11, -6 + hW);
    // 下侧胡须
    ctx.moveTo(noseX - 2, 3); ctx.lineTo(noseX + 11, 6 - hW);
    ctx.moveTo(noseX - 3, 4); ctx.lineTo(noseX + 8, 14 - hW);
    ctx.stroke();

    ctx.restore();
  }

  /* 绘制猫爪 (逗猫弹力线 + 独立软萌肉垫小爪爪，根据皮肤动态换色) */
  function drawPaw(p) {
    var skin = p.skin || pawSkin || "white";

    var pawFur = "#ffffff";     // 纯白爪爪
    var pawShadow = "#f0dede";  // 淡粉柔和毛绒阴影
    var padMain = "#ff8fa3";    // 樱花果冻粉肉垫
    var padGlow = "#ffb3c1";    // 亮粉高光
    var padBorder = "#ff758f";  // 肉垫边缘
    var stringColor = "rgba(255, 182, 193, 0.85)";

    if (skin === "orange") {
      pawFur = "#ffa834";
      pawShadow = "#e67e22";
      padMain = "#ff6b81";
      padGlow = "#ffa8ba";
      padBorder = "#ee5253";
      stringColor = "rgba(255, 168, 52, 0.85)";
    } else if (skin === "black") {
      pawFur = "#2f3542";
      pawShadow = "#1e272e";
      padMain = "#ff6b81";     // 黑猫配反差萌粉红肉垫
      padGlow = "#ff9ff3";
      padBorder = "#ff4757";
      stringColor = "rgba(100, 110, 130, 0.85)";
    } else if (skin === "calico") {
      pawFur = "#f8f9fa";
      pawShadow = "#dfe4ea";
      padMain = "#ff7979";
      padGlow = "#ffbe76";
      padBorder = "#eb4d4b";
      stringColor = "rgba(240, 147, 43, 0.85)";
    }

    // 1. 绘制弹力连接细线 (从底部发射点连到爪爪尾部)
    ctx.save();
    var tailOffset = 24;
    var tailX = p.curX + Math.sin(p.angle) * tailOffset;
    var tailY = p.curY + Math.cos(p.angle) * tailOffset;

    // 弹力绳：平滑贝塞尔曲线
    var midX = (p.startX + tailX) * 0.5 + (p.targetX - p.startX) * 0.08;
    var midY = (p.startY + tailY) * 0.5;

    ctx.strokeStyle = stringColor;
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(p.startX, p.startY);
    ctx.quadraticCurveTo(midX, midY, tailX, tailY);
    ctx.stroke();

    // 细线白色反光层
    ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(p.startX, p.startY);
    ctx.quadraticCurveTo(midX, midY, tailX, tailY);
    ctx.stroke();
    ctx.restore();

    // 2. 绘制独立猫爪主体
    ctx.save();
    ctx.translate(p.curX, p.curY);
    ctx.rotate(p.angle);

    // 爪爪尾部小线扣/金铃铛 (超可爱细节)
    ctx.fillStyle = "#ffd166";
    ctx.beginPath();
    ctx.arc(0, 24, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#e09f3e";
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // 爪子主体阴影
    ctx.save();
    ctx.shadowColor = (skin === "black") ? "rgba(0, 0, 0, 0.35)" : "rgba(255, 143, 163, 0.4)";
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 3;

    // 圆润独立白爪掌心球
    ctx.fillStyle = pawFur;
    ctx.beginPath();
    ctx.ellipse(0, 4, 34, 28, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;

    // 如果是三花猫，在掌心球上绘制一块橘斑和一块黑斑
    if (skin === "calico") {
      ctx.fillStyle = "#f0932b";
      ctx.beginPath();
      ctx.arc(-14, 2, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#2f3542";
      ctx.beginPath();
      ctx.arc(16, 10, 12, 0, Math.PI * 2);
      ctx.fill();
    } else if (skin === "orange") {
      // 橘猫的虎斑小纹路
      ctx.fillStyle = "#e67e22";
      ctx.beginPath();
      ctx.ellipse(-14, 8, 4, 10, -0.3, 0, Math.PI * 2);
      ctx.ellipse(14, 8, 4, 10, 0.3, 0, Math.PI * 2);
      ctx.fill();
    }

    // 边缘轮廓
    ctx.strokeStyle = pawShadow;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.restore();

    // 4 个圆滚滚的凸起小脚趾肉球
    var toeConfig = [
      { angle: -0.65, dist: 35, r: 11 },
      { angle: -0.22, dist: 40, r: 12 },
      { angle: 0.22, dist: 40, r: 12 },
      { angle: 0.65, dist: 35, r: 11 }
    ];

    for (var i = 0; i < toeConfig.length; i++) {
      var tc = toeConfig[i];
      var tx = Math.sin(tc.angle) * tc.dist;
      var ty = -Math.cos(tc.angle) * tc.dist + 2;

      // 脚趾毛球
      var toeFur = pawFur;
      if (skin === "calico") {
        if (i === 0) toeFur = "#f0932b";
        else if (i === 3) toeFur = "#2f3542";
      }

      ctx.fillStyle = toeFur;
      ctx.beginPath();
      ctx.arc(tx, ty, tc.r + 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = pawShadow;
      ctx.lineWidth = 1.8;
      ctx.stroke();

      // 粉嫩小脚趾肉垫
      var toeGrad = ctx.createRadialGradient(tx - 2, ty - 2, 1, tx, ty, tc.r);
      toeGrad.addColorStop(0, padGlow);
      toeGrad.addColorStop(1, padMain);

      ctx.fillStyle = toeGrad;
      ctx.beginPath();
      ctx.arc(tx, ty, tc.r, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = padBorder;
      ctx.lineWidth = 1.4;
      ctx.stroke();

      // 水晶白高光
      ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
      ctx.beginPath();
      ctx.arc(tx - tc.r * 0.35, ty - tc.r * 0.35, tc.r * 0.35, 0, Math.PI * 2);
      ctx.fill();
    }

    // 中央倒心形/三叶草大掌心肉垫
    ctx.save();
    var palmGrad = ctx.createRadialGradient(-2, -4, 3, 0, 4, 24);
    palmGrad.addColorStop(0, padGlow);
    palmGrad.addColorStop(1, padMain);

    ctx.fillStyle = palmGrad;
    ctx.beginPath();
    ctx.moveTo(0, 16);
    ctx.bezierCurveTo(-24, 16, -26, -15, -10, -15);
    ctx.bezierCurveTo(-4, -15, -1, -9, 0, -6);
    ctx.bezierCurveTo(1, -9, 4, -15, 10, -15);
    ctx.bezierCurveTo(26, -15, 24, 16, 0, 16);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = padBorder;
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // 大肉垫双高光
    ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
    ctx.beginPath();
    ctx.ellipse(-7, -7, 6, 4, -0.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(9, -6, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.restore();
  }

  /* 绘制粒子与涟漪 */
  function drawParticles() {
    // 涟漪
    for (var i = 0; i < ripples.length; i++) {
      var r = ripples[i];
      ctx.save();
      ctx.strokeStyle = "rgba(255,255,255," + r.alpha + ")";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 粒子
    for (var j = 0; j < particles.length; j++) {
      var p = particles[j];
      ctx.save();
      if (p.type === "bubble") {
        ctx.strokeStyle = "rgba(255,255,255," + p.alpha + ")";
        ctx.fillStyle = "rgba(255,255,255," + (p.alpha * 0.25) + ")";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // 气泡反光
        ctx.fillStyle = "rgba(255,255,255," + p.alpha + ")";
        ctx.beginPath();
        ctx.arc(p.x - p.r * 0.3, p.y - p.r * 0.3, p.r * 0.25, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === "star") {
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        for (var s = 0; s < 5; s++) {
          var a1 = (Math.PI * 2 / 5) * s;
          var a2 = a1 + Math.PI / 5;
          ctx.lineTo(Math.cos(a1) * p.size, Math.sin(a1) * p.size);
          ctx.lineTo(Math.cos(a2) * (p.size * 0.45), Math.sin(a2) * (p.size * 0.45));
        }
        ctx.closePath();
        ctx.fill();
      } else if (p.type === "feather") {
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size, p.size * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === "heart") {
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        var s = p.size;
        ctx.moveTo(0, s * 0.3);
        ctx.bezierCurveTo(-s * 0.5, -s * 0.3, -s, s * 0.3, 0, s);
        ctx.bezierCurveTo(s, s * 0.3, s * 0.5, -s * 0.3, 0, s * 0.3);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  /* 主渲染循环 */
  function render(timestamp) {
    if (!isRunning) return;
    if (!lastTime) lastTime = timestamp;
    var dt = (timestamp - lastTime) / 1000;
    if (dt > 0.1) dt = 0.1; // 限制单步防跳帧
    lastTime = timestamp;

    updateEntities(dt);
    updatePaws(dt);
    updateParticles(dt);

    ctx.clearRect(0, 0, width, height);
    drawBackground();

    // 绘制实体
    for (var i = 0; i < entities.length; i++) {
      var e = entities[i];
      if (e.type === "fish") drawFish(e);
      else if (e.type === "bird") drawBird(e);
      else if (e.type === "mouse") drawMouse(e);
    }

    drawParticles();

    // 绘制猫爪（最上层）
    for (var p = 0; p < paws.length; p++) {
      drawPaw(paws[p]);
    }

    requestAnimationFrame(render);
  }

  /* 触摸/点击交互（支持多点触控并发！） */
  function handleInput(clientX, clientY) {
    window.GameAudio.init();
    var rect = canvas.getBoundingClientRect();
    var x = clientX - rect.left;
    var y = clientY - rect.top;
    addPaw(x, y);
  }

  function resize() {
    dpr = window.devicePixelRatio || 1;
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function init(canvasEl, options) {
    canvas = canvasEl;
    ctx = canvas.getContext("2d");
    if (options && options.onScore) onScoreCallback = options.onScore;

    resize();
    window.addEventListener("resize", resize);

    // 多点触控监听
    canvas.addEventListener("pointerdown", function (e) {
      e.preventDefault();
      handleInput(e.clientX, e.clientY);
    });

    // 备用 touchstart 保证多点快速拍击兼容
    canvas.addEventListener("touchstart", function (e) {
      e.preventDefault();
      for (var i = 0; i < e.changedTouches.length; i++) {
        var t = e.changedTouches[i];
        handleInput(t.clientX, t.clientY);
      }
    }, { passive: false });

    // 初始化小动物
    entities = [];
    for (var i = 0; i < countTarget; i++) {
      entities.push(createEntity(mode));
    }

    requestAnimationFrame(render);
  }

  function setMode(newMode) {
    mode = newMode;
    entities = [];
    for (var i = 0; i < countTarget; i++) {
      entities.push(createEntity(mode));
    }
  }

  function setPawSkin(skin) {
    pawSkin = skin;
  }

  function setSpeed(speed) {
    speedLevel = speed;
    for (var i = 0; i < entities.length; i++) {
      entities[i].baseSpeed = (1.2 + Math.random() * 1.5) * speedLevel;
      entities[i].speed = entities[i].baseSpeed;
    }
  }

  function setCount(count) {
    countTarget = count;
  }

  function getScore() {
    return score;
  }

  function resetScore() {
    score = 0;
  }

  window.CatGame = {
    init: init,
    setMode: setMode,
    setPawSkin: setPawSkin,
    setSpeed: setSpeed,
    setCount: setCount,
    getScore: getScore,
    resetScore: resetScore,
    getMode: function () { return mode; },
    getPawSkin: function () { return pawSkin; }
  };
})();
