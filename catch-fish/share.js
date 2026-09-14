/* 猫咪战报海报绘制 + 通用图片下载保存 */
(function () {
  "use strict";

  var W = 1080, H = 1440; // 3:4 经典竖屏海报比例

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y - 0.1, x + w, y, r);
    ctx.closePath();
  }

  function drawPoster(canvas, data) {
    var ctx = canvas.getContext("2d");
    var score = data.score || 0;
    var mode = data.mode || "fish";
    var catName = (data.catName && data.catName.trim()) ? data.catName.trim() : "猫主子";

    var modeNames = { fish: "小丑鱼 🐠", bird: "小黄鸡 🐥", mouse: "小仓鼠 🐹" };
    var modeName = modeNames[mode] || "小丑鱼 🐠";

    // 趣味评级与互动短评
    var rankTitle = "软萌见习捕手 🐾";
    var rankGrade = "A 级";
    var rankComment = "小肉垫轻轻一挥，可爱萌翻全场！";
    var agility = "88.5%";

    if (score >= 50) {
      rankTitle = "神级捕猎猫皇 👑";
      rankGrade = "SSS 级";
      rankComment = "屏幕都要被拍冒烟啦！无喵能敌的绝对统治力！";
      agility = "99.9%";
    } else if (score >= 25) {
      rankTitle = "神爪飞天捕快 ⚡️";
      rankGrade = "SS 级";
      rankComment = "眼疾爪快！猎物根本逃不出主子的粉红肉垫～";
      agility = "98.2%";
    } else if (score >= 10) {
      rankTitle = "敏捷喵星特工 🎖";
      rankGrade = "S 级";
      rankComment = "专注度拉满！小爪子啪啪拍得根本停不下来！";
      agility = "94.6%";
    }

    // 1. 全局背景：温暖奶油黄至草莓粉渐变
    var grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, "#fff5e6");
    grad.addColorStop(0.3, "#ffd3b6");
    grad.addColorStop(0.7, "#ffaaa5");
    grad.addColorStop(1, "#ff7b89");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // 背景装饰微光斑与小爪印
    ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
    var bgPaws = [
      { x: 90, y: 110, s: 0.8 }, { x: W - 100, y: 130, s: 0.85 },
      { x: 90, y: H - 140, s: 0.85 }, { x: W - 90, y: H - 150, s: 0.8 }
    ];
    for (var b = 0; b < bgPaws.length; b++) {
      var bp = bgPaws[b];
      ctx.beginPath();
      ctx.arc(bp.x, bp.y, 20 * bp.s, 0, Math.PI * 2);
      ctx.fill();
      for (var t = 0; t < 4; t++) {
        var ba = -0.7 + t * 0.46;
        ctx.beginPath();
        ctx.arc(bp.x + Math.sin(ba) * 30 * bp.s, bp.y - Math.cos(ba) * 30 * bp.s, 8 * bp.s, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 2. 主卡片 (3:4 竖版精致白卡)
    ctx.save();
    ctx.shadowColor = "rgba(180, 60, 60, 0.22)";
    ctx.shadowBlur = 40;
    ctx.shadowOffsetY = 20;
    ctx.fillStyle = "#ffffff";
    roundRect(ctx, 45, 45, W - 90, H - 90, 44);
    ctx.fill();
    ctx.restore();

    // 3. 顶部战报标签
    roundRect(ctx, W / 2 - 160, 32, 320, 52, 26);
    ctx.fillStyle = "#ff6b81";
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = "800 24px 'PingFang SC','Microsoft YaHei',sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("🐱 猫 咪 捕 猎 战 报 🐾", W / 2, 67);

    // 4. 猫咪名牌与主标题
    ctx.fillStyle = "#2d3436";
    ctx.font = "900 46px 'PingFang SC','Microsoft YaHei',sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("【 " + catName + " 】的今日大捷", W / 2, 145);

    ctx.fillStyle = "#ff7675";
    ctx.font = "600 22px 'PingFang SC','Microsoft YaHei',sans-serif";
    var now = new Date();
    var dateStr = now.getFullYear() + "年" + (now.getMonth() + 1) + "月" + now.getDate() + "日 捕猎认证";
    ctx.fillText(dateStr, W / 2, 185);

    // 5. 抓捕核心成就大圆环 (数据醒目展示)
    var circleY = 360;
    ctx.save();
    ctx.shadowColor = "rgba(255, 118, 117, 0.35)";
    ctx.shadowBlur = 30;
    ctx.beginPath();
    ctx.arc(W / 2, circleY, 135, 0, Math.PI * 2);
    ctx.fillStyle = "#fff0f0";
    ctx.fill();
    ctx.lineWidth = 10;
    ctx.strokeStyle = "#ff7675";
    ctx.stroke();
    ctx.restore();

    // 圆环内猎物大图标
    var modeEmojis = { fish: "🐠", bird: "🐥", mouse: "🐹" };
    ctx.font = "80px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(modeEmojis[mode] || "🐠", W / 2, circleY - 30);

    // 捕获数量大字
    ctx.fillStyle = "#ff4757";
    ctx.font = "900 68px 'PingFang SC','Microsoft YaHei',sans-serif";
    ctx.fillText(score, W / 2, circleY + 50);

    ctx.fillStyle = "#636e72";
    ctx.font = "700 22px 'PingFang SC','Microsoft YaHei',sans-serif";
    ctx.fillText("只" + modeName, W / 2, circleY + 86);

    // 6. 核心称号
    var badgeY = 580;
    roundRect(ctx, 80, badgeY, W - 160, 80, 40);
    ctx.fillStyle = "#fff9e6";
    ctx.fill();
    ctx.strokeStyle = "#ffeaa7";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = "#d63031";
    ctx.font = "900 36px 'PingFang SC','Microsoft YaHei',sans-serif";
    ctx.fillText(rankTitle, W / 2, badgeY + 54);

    // 7. 互动评价与战力徽章
    roundRect(ctx, 80, badgeY + 110, W - 160, 240, 24);
    ctx.fillStyle = "#f8f9fa";
    ctx.fill();

    // 评级大印章
    ctx.fillStyle = "#ff7675";
    ctx.font = "900 48px 'PingFang SC','Microsoft YaHei',sans-serif";
    ctx.fillText(rankGrade, W / 2, badgeY + 180);

    ctx.fillStyle = "#2d3436";
    ctx.font = "600 26px 'PingFang SC','Microsoft YaHei',sans-serif";
    ctx.fillText("“ " + rankComment + " ”", W / 2, badgeY + 230);

    // 勋章副信息条
    roundRect(ctx, 140, badgeY + 260, W - 280, 42, 21);
    ctx.fillStyle = "rgba(255, 118, 117, 0.12)";
    ctx.fill();
    ctx.fillStyle = "#e17055";
    ctx.font = "700 22px 'PingFang SC','Microsoft YaHei',sans-serif";
    ctx.fillText("🏅 官方捕猎大师勋章认证 · 战力拉满", W / 2, badgeY + 289);

    // 8. 猫咪互动抓捕实况报告小卡
    var statY = 960;
    roundRect(ctx, 80, statY, W - 160, 200, 28);
    ctx.fillStyle = "#fcfcfc";
    ctx.fill();
    ctx.strokeStyle = "#e9ecef";
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.fillStyle = "#2d3436";
    ctx.font = "800 28px 'PingFang SC','Microsoft YaHei',sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("🐾 互动抓捕实况报告", 120, statY + 50);

    ctx.fillStyle = "#636e72";
    ctx.font = "500 24px 'PingFang SC','Microsoft YaHei',sans-serif";
    ctx.fillText("• 成功制服：" + score + " 只" + modeName, 120, statY + 98);
    ctx.fillText("• 爪速超越：" + agility + " 的同期小猫咪", 120, statY + 140);
    ctx.fillText("• 主子心情：★★★★★（抓得超级尽兴！）", 120, statY + 182);

    // 9. 底部陪玩推荐与幽默护屏提醒
    roundRect(ctx, 75, 1180, W - 150, 110, 28);
    ctx.fillStyle = "rgba(255, 107, 129, 0.1)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 107, 129, 0.28)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // 推荐小徽章
    roundRect(ctx, 95, 1200, 140, 32, 16);
    ctx.fillStyle = "#ff5e7e";
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = "800 17px 'PingFang SC','Microsoft YaHei',sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("💖 陪玩推荐", 165, 1222);

    // 推荐引导正文
    ctx.fillStyle = "#2d3436";
    ctx.font = "700 22px 'PingFang SC','Microsoft YaHei',sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("平放在地毯上，和猫咪一起开启亲密互动抓捕吧 🐾", 250, 1223);

    // 幽默护屏提醒
    ctx.fillStyle = "#e17055";
    ctx.font = "600 19px 'PingFang SC','Microsoft YaHei',sans-serif";
    ctx.fillText("⚠️ 贴心提示：玩前务必确认屏幕已贴好钢化膜，别让屏幕扛下所有😂", 95, 1262);

    // 底部标识
    ctx.fillStyle = "#b2bec3";
    ctx.font = "500 20px 'PingFang SC','Microsoft YaHei',sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("猫咪抓鱼 · Cat Fishing Game", W / 2, 1340);
  }

  function makePosterImage(data) {
    var canvas = document.getElementById("share-canvas");
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.id = "share-canvas";
      canvas.width = W;
      canvas.height = H;
      canvas.style.display = "none";
      document.body.appendChild(canvas);
    }
    drawPoster(canvas, data);
    return canvas.toDataURL("image/png");
  }

  /* 通用浏览器海报下载 */
  function savePosterImage(data) {
    return new Promise(function (resolve, reject) {
      try {
        var dataUrl = makePosterImage(data);
        var catName = (data.catName && data.catName.trim()) ? data.catName.trim() : "猫主子";
        var fileName = catName + "的捕猎战报.png";

        var link = document.createElement("a");
        link.download = fileName;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        resolve({ success: true });
      } catch (err) {
        reject(err);
      }
    });
  }

  window.CatShare = {
    makePosterImage: makePosterImage,
    savePosterImage: savePosterImage
  };
})();
