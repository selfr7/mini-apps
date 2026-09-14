/* 猫咪抓鱼 - 应用层逻辑：HUD 管理、设置弹窗、模式切换与战报生成 */
(function () {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };

  var STORAGE_KEY = "cat_game_prefs_v1";

  var prefs = {
    catName: "咪咪",
    mode: "fish",
    skin: "white",
    speed: 1,
    count: 6,
    sound: true
  };

  function loadPrefs() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        for (var k in parsed) {
          if (Object.prototype.hasOwnProperty.call(parsed, k)) {
            prefs[k] = parsed[k];
          }
        }
      }
    } catch (e) {}
  }

  function savePrefs() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch (e) {}
  }

  var toastTimer = null;
  function showToast(msg) {
    var el = $("toast");
    if (!el) return;
    el.textContent = msg;
    el.hidden = false;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      el.hidden = true;
    }, 2000);
  }

  function updateHUDScore(score) {
    var el = $("hud-score");
    if (el) el.textContent = score;
  }

  function applySettings() {
    window.CatGame.setMode(prefs.mode);
    window.CatGame.setPawSkin(prefs.skin);
    window.CatGame.setSpeed(prefs.speed);
    window.CatGame.setCount(prefs.count);
    window.GameAudio.setMuted(!prefs.sound);

    // 更新底部 Tab
    var tabs = document.querySelectorAll(".mode-tab");
    for (var i = 0; i < tabs.length; i++) {
      var t = tabs[i];
      if (t.getAttribute("data-mode") === prefs.mode) {
        t.classList.add("active");
      } else {
        t.classList.remove("active");
      }
    }

    // 更新静音按钮图标
    var soundBtn = $("btn-sound");
    if (soundBtn) {
      soundBtn.textContent = prefs.sound ? "🔔" : "🔕";
    }
  }

  function openSettingsModal() {
    $("inp-cat-name").value = prefs.catName;

    // 选中对应的按钮
    var updateSeg = function (containerId, val) {
      var container = $(containerId);
      if (!container) return;
      var btns = container.querySelectorAll(".seg-btn");
      for (var j = 0; j < btns.length; j++) {
        var b = btns[j];
        if (b.getAttribute("data-v") === String(val)) {
          b.classList.add("active");
        } else {
          b.classList.remove("active");
        }
      }
    };

    updateSeg("seg-skin", prefs.skin);
    updateSeg("seg-speed", prefs.speed);
    updateSeg("seg-count", prefs.count);

    $("modal-settings").hidden = false;
  }

  function openReportModal() {
    var score = window.CatGame.getScore();
    var curMode = window.CatGame.getMode();

    var data = {
      score: score,
      mode: curMode,
      catName: prefs.catName || "猫主子"
    };

    var imgUrl = window.CatShare.makePosterImage(data);
    $("poster-img").src = imgUrl;
    $("modal-report").hidden = false;
  }

  function bindEvents() {
    // 底部模式快速切换
    var tabs = document.querySelectorAll(".mode-tab");
    for (var i = 0; i < tabs.length; i++) {
      (function (tab) {
        tab.addEventListener("click", function () {
          var m = tab.getAttribute("data-mode");
          prefs.mode = m;
          savePrefs();
          applySettings();
          showToast("已切换为" + (m === "fish" ? "抓小丑鱼 🐠" : (m === "bird" ? "抓小黄鸡 🐥" : "抓仓鼠 🐹")));
        });
      })(tabs[i]);
    }

    // 静音切换
    $("btn-sound").addEventListener("click", function () {
      prefs.sound = !prefs.sound;
      savePrefs();
      applySettings();
      showToast(prefs.sound ? "已开启音效 🔔" : "已静音 🔕");
    });

    // 打开设置
    $("btn-settings").addEventListener("click", function () {
      openSettingsModal();
    });

    // 关闭设置
    $("btn-close-settings").addEventListener("click", function () {
      $("modal-settings").hidden = true;
    });

    // 保存设置
    $("btn-save-settings").addEventListener("click", function () {
      var name = $("inp-cat-name").value.trim() || "猫主子";
      prefs.catName = name;
      savePrefs();
      applySettings();
      $("modal-settings").hidden = true;
      showToast("设置已保存 ✨");
    });

    // 设置项中的 seg 点击 (即时生效)
    var setupSegClicks = function (containerId, key, isNumber) {
      var container = $(containerId);
      if (!container) return;
      container.addEventListener("click", function (e) {
        var btn = e.target.closest(".seg-btn");
        if (!btn) return;
        var btns = container.querySelectorAll(".seg-btn");
        for (var j = 0; j < btns.length; j++) {
          btns[j].classList.remove("active");
        }
        btn.classList.add("active");
        var val = btn.getAttribute("data-v");
        prefs[key] = isNumber ? Number(val) : val;
        applySettings();
      });
    };

    setupSegClicks("seg-skin", "skin", false);
    setupSegClicks("seg-speed", "speed", true);
    setupSegClicks("seg-count", "count", true);

    // 打开战报
    $("btn-report").addEventListener("click", function () {
      openReportModal();
    });

    // 关闭战报
    $("btn-close-report").addEventListener("click", function () {
      $("modal-report").hidden = true;
    });

    // 保存海报到相册 / 下载
    $("btn-save-album").addEventListener("click", function () {
      var score = window.CatGame.getScore();
      var curMode = window.CatGame.getMode();
      var data = {
        score: score,
        mode: curMode,
        catName: prefs.catName || "猫主子"
      };

      window.CatShare.savePosterImage(data).then(function () {
        showToast("海报已生成并触发下载 💾");
      }).catch(function (err) {
        showToast("保存失败：" + ((err && err.message) || "请直接长按图片保存"));
      });
    });

    // 重置计分
    $("btn-reset-score").addEventListener("click", function () {
      window.CatGame.resetScore();
      updateHUDScore(0);
      showToast("计分已重置 🔄");
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    loadPrefs();
    var canvas = $("game-canvas");
    window.CatGame.init(canvas, {
      onScore: function (score) {
        updateHUDScore(score);
      }
    });

    applySettings();
    bindEvents();
  });
})();
