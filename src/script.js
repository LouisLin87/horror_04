// CodePen JS：貼到 JS 欄位（horror_04_random_ghost）
(() => {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const app = $("#app");
  const coverPage = $("#cover-page");
  const quizBox = $("#quiz-box");
  const quizContent = $("#quiz-content");
  const progress = $("#progress");
  const systemLog = $("#system-log");
  const toast = $("#toast");
  const overlay = $("#screen-overlay");
  const overlayText = $("#overlay-text");

  const device = detectDevice();
  const state = {
    idx: 0,
    locked: false,
    muted: false,
    codeName: "受試者",
    choices: [],
    inputPending: false,
    scores: {
      fear: 0,
      denial: 0,
      invite: 0,
      escape: 0,
      corruption: 0
    }
  };

  let audioCtx = null;
  let masterGain = null;
  let audioOutput = null;
  let heartbeatTimer = null;
  let breathTimer = null;
  let humNodes = [];
  let ambientStarted = false;
  let audioUnlocked = false;
  let clockTimer = null;
  let idleTimers = [];
  let typeTimer = null;
  let titleTimer = null;
  let unstableTimer = null;
  let filterTimer = null;
  let staticTimer = null;
  let fxBusy = false;
  let calmUntil = 0;
  let fxTimers = [];
  let countdownTimer = null;
  let cameraStream = null;
  let cameraPermissionState = "unknown";
  let lastSelfieGhostType = "fullBody";
  let unknownMusicStarted = false;
  let dreadTimer = null;
  let finalDreadTimer = null;
  let dreadNodes = [];
  const originalTitle = document.title || "horror_04";

  const glyphs = "祂它牠█▓▒░×#%&?¿∆∴∵†‡縫眼喀拉血";

  const quiz = [
    {
      type: "name",
      index: "00",
      q: "先留一個稱呼。不要留也可以，反正它會自己猜。",
      help: "只暫存在目前頁面，不會送出。你也可以輸入：匿名、Louis、不要知道我。"
    },
    {
      index: "01",
      q: (s) => `${s.codeName}，你剛剛按開始的時候，有沒有一瞬間後悔？不用裝沒事，我看得到你停那一下。`,
      options: [
        { text: "(A) 沒有，我很正常", tag: "denial", whisper: "正常的人通常不會急著證明自己正常。", polluted: "(A) 沒有，我照它教的回答" },
        { text: "(B) 有一點，但我還想看", tag: "fear", whisper: "就是這一點點，最容易被聽見。", polluted: "(B) 我怕，但我想讓它靠近" },
        { text: "(C) 我想先關掉", tag: "escape", whisper: "可以關。只是你的反應已經記住了。", polluted: "(C) 我想關掉，但手沒有動" },
        { text: "(D) 沒差，繼續", tag: "invite", whisper: "好。它最喜歡這種回答。", polluted: "(D) 沒差，進來" }
      ]
    },
    {
      index: "02",
      q: "你現在先不要回頭。真的，不要。這題只問你：我越叫你不要回頭，你是不是越想回頭？",
      options: [
        { text: "(A) 不會，我不吃這套", tag: "denial", whisper: "嘴巴很硬。脖子就不一定了。", polluted: "(A) 不會，但我已經想像背後了" },
        { text: "(B) 有一點想", tag: "fear", whisper: "那個念頭不是你自己長出來的。", polluted: "(B) 它讓我想回頭" },
        { text: "(C) 我想離開這題", tag: "escape", whisper: "你不是想離開這題，你是想離開這個房間。", polluted: "(C) 我想離開我後面那個" },
        { text: "(D) 我已經回頭了", tag: "invite", whisper: "很好。現在它知道你會聽話。", polluted: "(D) 我替它確認位置" }
      ]
    },
    {
      index: "03",
      q: (s) => `${s.codeName}，如果黑色螢幕像鏡子，你會先看哪裡？不要說你不會看，人都會。`,
      effect: "mirror",
      options: [
        { text: "(A) 看自己的眼睛", tag: "denial", whisper: "眼睛最會演。尤其是螢幕裡那雙。", polluted: "(A) 看它借來的眼睛" },
        { text: "(B) 看肩膀後面", tag: "fear", whisper: "那邊的黑影比剛剛高了一點。", polluted: "(B) 看它站的位置" },
        { text: "(C) 我不要看倒影", tag: "escape", whisper: "你不看，它就更放心看你。", polluted: "(C) 我假裝沒看見" },
        { text: "(D) 看最黑的地方", tag: "invite", whisper: "視線對接。它知道你在找它。", polluted: "(D) 我正在找它" }
      ]
    },
    {
      index: "04",
      q: "剛剛那些字打出來的時候，你是不是有一點在等它出錯？等它亂碼？等它證明這不只是網頁？",
      effect: "glitch",
      options: [
        { text: "(A) 沒有，我只是看文字", tag: "denial", whisper: "你看得很仔細。仔細到它也開始看你。", polluted: "(A) 我只是等它看我" },
        { text: "(B) 對，我在等異常", tag: "fear", whisper: "異常不會讓你失望。只是通常會晚一點到。", polluted: "(B) 我在等它出現" },
        { text: "(C) 我不想等了", tag: "escape", whisper: "你不想等，可是你還在這裡。", polluted: "(C) 我不想等它，但它想等我" },
        { text: "(D) 我想看更壞掉一點", tag: "invite", whisper: "要求已收到。不要後悔。", polluted: "(D) 請壞給我看" }
      ]
    },
    {
      index: "05",
      q: (s) => `系統記錄：${s.codeName} 的反應開始變慢。老實說，你剛剛是在想題目，還是在聽附近有沒有聲音？`,
      options: [
        { text: "(A) 我只是在想答案", tag: "denial", whisper: "答案不重要。停頓才重要。", polluted: "(A) 我只是在替它拖時間" },
        { text: "(B) 我有在聽聲音", tag: "fear", whisper: "你聽到的不是聲音，是它找路的方式。", polluted: "(B) 我聽到它靠近" },
        { text: "(C) 我想把音量關掉", tag: "escape", whisper: "關掉音量之後，剩下的聲音會更清楚。", polluted: "(C) 我想聽不見它" },
        { text: "(D) 我希望它講話", tag: "invite", whisper: "不要邀請。它學得很快。", polluted: "(D) 我准它用我的聲音" }
      ]
    },
    {
      index: "06",
      q: "我們換個簡單的。你有沒有感覺按鈕有點不想被你按？像是它知道你下一步要選什麼。",
      options: [
        { text: "(A) 沒有，是動畫而已", tag: "denial", whisper: "動畫是給人看的理由。真正的原因不需要解釋。", polluted: "(A) 它只是裝成動畫" },
        { text: "(B) 有，它好像在躲", tag: "fear", whisper: "它不是躲你。它是在逗你靠近。", polluted: "(B) 它在逗我的手" },
        { text: "(C) 我不想再按了", tag: "escape", whisper: "不按也可以。它會慢慢替你按。", polluted: "(C) 請替我按下去" },
        { text: "(D) 那就讓它選", tag: "invite", whisper: "第二操作者排隊完成。", polluted: "(D) 它可以用我的手" }
      ]
    },
    {
      index: "07",
      q: "如果這不是測驗，而是一個很慢的交接，你覺得它現在拿走你哪一部分？",
      options: [
        { text: "(A) 什麼都沒拿走", tag: "denial", whisper: "好。先從否認開始拿。", polluted: "(A) 它拿走我承認的能力" },
        { text: "(B) 心跳", tag: "fear", whisper: "心跳最容易同步，下一個通常是眨眼。", polluted: "(B) 眨眼也不是我的" },
        { text: "(C) 手指", tag: "escape", whisper: "請不要一直看自己的手。越看越不像。", polluted: "(C) 手指正在替它按" },
        { text: "(D) 我的名字", tag: "invite", whisper: "名字是很好的入口。尤其是你自己給的。", polluted: "(D) 我把名字借給它" }
      ]
    },
    {
      index: "08",
      q: "你剛剛如果切出去一下再回來，我會知道。不是因為很厲害，只是因為你離開時，這裡還有人在等。",
      options: [
        { text: "(A) 我沒有離開", tag: "denial", whisper: "很好。謊言可以維持連線穩定。", polluted: "(A) 我一直都在這裡" },
        { text: "(B) 我只是想確認時間", tag: "escape", whisper: "時間不重要。重要的是它剛剛也跟著你過去了。", polluted: "(B) 它跟著我過去了" },
        { text: "(C) 對不起，我不該離開", tag: "fear", whisper: "道歉已收到。它很滿意你的反應。", polluted: "(C) 對不起，請不要生氣" },
        { text: "(D) 我想看它會不會追來", tag: "invite", whisper: "測試完成。追蹤能力：有效。", polluted: "(D) 我希望它追來" }
      ]
    },
    {
      index: "09",
      q: "現在請誠實一點。你比較怕它突然出現，還是怕它一直不出現，讓你自己想像？",
      options: [
        { text: "(A) 我都不怕", tag: "denial", whisper: "這句話太亮了。它會先把這句關掉。", polluted: "(A) 我最怕自己承認怕" },
        { text: "(B) 怕突然出現", tag: "fear", whisper: "突然通常不是真的突然。它只是等你鬆懈。", polluted: "(B) 它在等我鬆懈" },
        { text: "(C) 怕一直不出現", tag: "escape", whisper: "對。因為那代表它已經在了。", polluted: "(C) 它已經在了" },
        { text: "(D) 我想知道它長怎樣", tag: "invite", whisper: "它也想知道你長怎樣。現在輪到它看了。", polluted: "(D) 我想讓它看清楚" }
      ]
    },
    {
      index: "10",
      q: "如果等等結局顯示『共鳴者』，你會覺得那只是分類，還是覺得它真的挑中了你？",
      effect: "red",
      options: [
        { text: "(A) 只是分類", tag: "denial", whisper: "分類是一種比較禮貌的命名。", polluted: "(A) 只是被命名" },
        { text: "(B) 我會有點毛", tag: "fear", whisper: "很好。共鳴通常從這裡開始。", polluted: "(B) 我已經開始共鳴" },
        { text: "(C) 我不想看結果", tag: "escape", whisper: "越不想看，越適合被保存。", polluted: "(C) 請不要保存我" },
        { text: "(D) 我希望它準一點", tag: "invite", whisper: "它會很準。因為你一直在教它。", polluted: "(D) 請準確地找到我" }
      ]
    },
    {
      index: "11",
      q: (s) => `${s.codeName}，你有沒有想過，最可怕的不是它知道你在哪裡，而是它知道你什麼時候會假裝不怕？`,
      options: [
        { text: "(A) 我沒有假裝", tag: "denial", whisper: "這句話本身就很像假裝。", polluted: "(A) 我假裝沒有假裝" },
        { text: "(B) 我有一點在撐", tag: "fear", whisper: "撐住的地方最容易裂。", polluted: "(B) 我快裂開了" },
        { text: "(C) 我想跳過這題", tag: "escape", whisper: "跳過也是答案。尤其是你不敢看的那題。", polluted: "(C) 我想跳過自己" },
        { text: "(D) 那就讓它猜", tag: "invite", whisper: "它猜得比你想像中快。", polluted: "(D) 猜中我" }
      ]
    },
    {
      index: "12",
      q: "先安靜三秒。不要找聲音。越找越像是你自己叫它出來。",
      options: [
        { text: "(A) 我什麼都沒聽到", tag: "denial", whisper: "沒聽到通常是第一層。第二層會在你關掉後開始。", polluted: "(A) 我等下才會聽到" },
        { text: "(B) 我好像聽到電流聲", tag: "fear", whisper: "那不是電流，是很小聲的敲門。", polluted: "(B) 它在裡面敲" },
        { text: "(C) 我想把耳機拿下來", tag: "escape", whisper: "拿下來之後，左右耳會不一樣。", polluted: "(C) 我不想知道哪邊是真的" },
        { text: "(D) 我想再聽清楚一點", tag: "invite", whisper: "不要靠近聲音。聲音也會靠近你。", polluted: "(D) 靠近我" }
      ]
    },
    {
      index: "13",
      q: "如果這個網站現在學會你的語氣，第一句會說什麼？不要想太久，它可能已經先說了。",
      effect: "glitch",
      options: [
        { text: "(A) 我沒事", tag: "denial", whisper: "它學會了。這句最好用。", polluted: "(A) 我沒事我沒事我沒事" },
        { text: "(B) 先不要嚇我", tag: "fear", whisper: "太晚了。它已經知道要從哪裡開始。", polluted: "(B) 請從我怕的地方開始" },
        { text: "(C) 我真的要關了", tag: "escape", whisper: "你說真的的時候，通常還會再看一下。", polluted: "(C) 我再看最後一下" },
        { text: "(D) 繼續，我想看", tag: "invite", whisper: "它現在就是用你的語氣說這句。", polluted: "(D) 用我的聲音繼續" }
      ]
    },
    {
      index: "14",
      q: "最後前一題。你可以現在眨眼。眨完再看螢幕，如果字的位置好像變了，不要告訴我。它會很開心。",
      options: [
        { text: "(A) 沒變", tag: "denial", whisper: "你回答得太快了。你真的有眨嗎？", polluted: "(A) 我沒有真的看" },
        { text: "(B) 好像有一點變", tag: "fear", whisper: "它只移一點點，這樣你才會懷疑自己。", polluted: "(B) 它只移了一點點" },
        { text: "(C) 我不想再確認", tag: "escape", whisper: "不確認是最安全的錯覺。", polluted: "(C) 我不敢確認" },
        { text: "(D) 我想再眨一次", tag: "invite", whisper: "好。給它第二次機會。", polluted: "(D) 再給它一次" }
      ]
    },
    {
      index: "15",
      q: (s) => `最後確認：如果從第 ${Math.max(4, Math.ceil(s.choices.length / 2))} 題開始，答題者已經不是 ${s.codeName}，你要我怎麼顯示結果？`,
      effect: "red",
      options: [
        { text: "(A) 顯示正常", tag: "denial", whisper: "收到。它最擅長把自己顯示成正常。", polluted: "(A) 把異常藏好" },
        { text: "(B) 顯示我其實很怕", tag: "fear", whisper: "共鳴者資料完成。不要急著呼吸。", polluted: "(B) 顯示它聽見我" },
        { text: "(C) 讓我離開", tag: "escape", whisper: "出口已顯示。只是位置不一定通往外面。", polluted: "(C) 讓我進去另一邊" },
        { text: "(D) 顯示真正的東西", tag: "invite", whisper: "授權完成。30 秒後不要怪我。", polluted: "(D) 讓它完整出現" }
      ]
    }
  ];

  const endings = {
    denial: {
      title: "結局：否認者",
      name: "否認者",
      theme: "否認祂",
      pattern: "你反覆選擇：這只是網頁、我不相信、我沒事。",
      core: "越否認，祂越靠近。",
      status: "正常顯示 / 異常包裝中",
      description: "你一直說這是假的。\n系統很配合，真的幫你把異常顯示成正常。\n可是資料紀錄裡，你停頓過、猶豫過，也回來看過。\n如果這真的是假的，你為什麼還在等它出錯？",
      diagnostics: [
        ["主要反應", "理性化與否認"],
        ["危險訊號", "把恐懼偽裝成冷靜"],
        ["系統備註", "否認越完整，替換越安靜"],
        ["建議", "請不要盯著黑色螢幕證明自己不怕"]
      ],
      finalLine: "你不是沒有看見。你只是很努力地叫自己不要承認。",
      buttonText: "我沒有怕，重新篩檢",
      surprise: ["你說沒事。", "所以它也學會說：沒事。"],
      surpriseTitle: "不要否認"
    },
    fear: {
      title: "結局：共鳴者",
      name: "共鳴者",
      theme: "感覺到祂",
      pattern: "你常選擇：我好像聽到、我不敢確認、它是不是在那裡。",
      core: "你不是被嚇到，是你聽得見。",
      status: "同步中 / 不建議中斷",
      description: "你不是最害怕的人。\n你是最容易聽見的人。\n祂沒有強迫你看見，是你先感覺到祂在那裡。\n共鳴已建立。接下來每一次微弱電流聲，都可能不是從手機傳出來。",
      diagnostics: [
        ["主要反應", "恐懼感應與聲音注意"],
        ["危險訊號", "越害怕，越想確認"],
        ["系統備註", "心跳間隔已被用來校準同步"],
        ["建議", "請不要在黑暗裡重新開啟此頁"]
      ],
      finalLine: "你不是被選中的。你只是剛好聽得見。",
      buttonText: "我沒有聽見，重新篩檢",
      surprise: ["共鳴完成。", "你聽見的那個聲音，現在也聽得見你。"],
      surpriseTitle: "不要回頭"
    },
    invite: {
      title: "結局：邀請者",
      name: "邀請者",
      theme: "接近祂",
      pattern: "你常選擇：繼續、我想看清楚、讓它出來、我想聽清楚。",
      core: "不是祂闖進來，是你把門打開。",
      status: "邀請成立 / 第二操作者等候中",
      description: "你沒有逃。\n你甚至靠近了一點。\n一開始祂只是在門外，後來是你把門打開的。\n每一次你按下『繼續』，系統都把它紀錄成一次同意。",
      diagnostics: [
        ["主要反應", "主動靠近異常"],
        ["危險訊號", "把好奇誤認為控制權"],
        ["系統備註", "邀請訊號已足夠建立入口"],
        ["建議", "請不要再對黑暗說：出來"]
      ],
      finalLine: "邀請已確認。請不要假裝你不是故意的。",
      buttonText: "把門關上，重新篩檢",
      surprise: ["謝謝你開門。", "它進來的時候很安靜，像你剛剛按下同意那樣。"],
      surpriseTitle: "不要開門"
    },
    escape: {
      title: "結局：空殼者",
      name: "空殼者",
      theme: "逃不掉祂",
      pattern: "你常選擇：我想離開、我不要回答、我要關掉、不要再確認。",
      core: "從某一題開始，可能已經不是你在回答。",
      status: "使用者離線 / 操作仍持續",
      description: "你很早就想離開了。\n但系統紀錄顯示，後面的選擇反而變得穩定。\n第幾題開始，你沒有再真的反抗？\n空殼不是死亡，是有人把『想逃走的部分』先拿掉了。",
      diagnostics: [
        ["主要反應", "逃離、拒答與關閉衝動"],
        ["危險訊號", "越想離開，越被保存"],
        ["系統備註", "出口提示已封存，剩餘操作穩定"],
        ["建議", "請確認現在按下按鈕的是你本人"]
      ],
      finalLine: "你已經不在了。只是這具身體還很會點下一題。",
      buttonText: "找回出口，重新篩檢",
      surprise: ["出口已開啟。", "只是門的另一邊，也是一個螢幕。"],
      surpriseTitle: "不要留下空位"
    }
  };

  function detectDevice() {
    const ua = navigator.userAgent || "";
    const isAndroid = /Android/i.test(ua);
    const isIOS = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    return {
      isAndroid,
      isIOS,
      label: isAndroid ? "Android 裝置" : isIOS ? "iOS 裝置" : "桌面瀏覽器"
    };
  }

  function setVh() {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty("--vh", `${vh}px`);
  }

  function pad(num) {
    return String(num).padStart(2, "0");
  }

  function updateClock() {
    const now = new Date();
    const text = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    $("#clock-label").textContent = text;
  }

  function startClock() {
    updateClock();
    clearInterval(clockTimer);
    clockTimer = setInterval(updateClock, 1000);
  }

  function initAudio() {
    if (state.muted) return false;

    try {
      const AudioClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioClass) return false;

      if (!audioCtx) {
        audioCtx = new AudioClass({ latencyHint: "interactive" });
        audioOutput = audioCtx.createDynamicsCompressor();
        audioOutput.threshold.value = -26;
        audioOutput.knee.value = 24;
        audioOutput.ratio.value = 7;
        audioOutput.attack.value = 0.004;
        audioOutput.release.value = 0.2;
        audioOutput.connect(audioCtx.destination);

        masterGain = audioCtx.createGain();
        // 手機喇叭對低頻很不敏感，這裡比桌機版略大，但所有單一音效仍有封頂。
        masterGain.gain.value = device.isAndroid || device.isIOS ? 0.18 : 0.12;
        masterGain.connect(audioOutput);
      }

      resumeAudio();
      unlockAudioPulse();

      if (!ambientStarted) {
        createAmbientBed();
        ambientStarted = true;
      }
      createUnknownMusicBed();

      startHeartbeat();
      startBreathing();
      scheduleStaticPulses();
      playLowBoom(0.18);
      updateSoundToggle();
      return true;
    } catch (err) {
      state.muted = true;
      updateSoundToggle();
      return false;
    }
  }

  function resumeAudio() {
    if (!audioCtx || state.muted) return;
    try {
      if (audioCtx.state === "suspended") {
        const resumePromise = audioCtx.resume();
        if (resumePromise && typeof resumePromise.catch === "function") resumePromise.catch(() => {});
      }
    } catch (err) {}
  }

  function unlockAudioPulse() {
    // iOS / Android 常需要在「使用者觸控當下」建立並播放一個極短聲音，否則後續 setTimeout 裡的音效會被鎖住。
    if (!audioCtx || !masterGain || state.muted) return;
    try {
      resumeAudio();
      const t = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(190, t);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(device.isAndroid || device.isIOS ? 0.018 : 0.008, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.065);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(t);
      osc.stop(t + 0.075);
      audioUnlocked = true;
    } catch (err) {}
  }

  function stopAudio() {
    state.muted = true;
    clearTimeout(heartbeatTimer);
    clearInterval(breathTimer);
    clearTimeout(staticTimer);
    clearTimeout(dreadTimer);
    clearTimeout(finalDreadTimer);
    humNodes.forEach((node) => {
      try { node.stop && node.stop(); } catch (err) {}
      try { node.disconnect && node.disconnect(); } catch (err) {}
    });
    dreadNodes.forEach((node) => {
      try { node.stop && node.stop(); } catch (err) {}
      try { node.disconnect && node.disconnect(); } catch (err) {}
    });
    humNodes = [];
    dreadNodes = [];
    ambientStarted = false;
    unknownMusicStarted = false;
    audioUnlocked = false;
    if (masterGain) {
      try { masterGain.gain.setTargetAtTime(0.0001, audioCtx.currentTime, 0.03); } catch (err) {}
    }
    updateSoundToggle();
  }

  function createAmbientBed() {
    if (!audioCtx || !masterGain || state.muted || ambientStarted) return;

    const filter = audioCtx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 140;
    filter.Q.value = 0.8;
    filter.connect(masterGain);

    const humGain = audioCtx.createGain();
    humGain.gain.value = device.isAndroid || device.isIOS ? 0.11 : 0.14;
    humGain.connect(filter);

    const oscA = audioCtx.createOscillator();
    const oscB = audioCtx.createOscillator();
    const oscC = audioCtx.createOscillator();
    oscA.type = "sine";
    oscB.type = "triangle";
    oscC.type = "sawtooth";
    oscA.frequency.value = 42;
    oscB.frequency.value = 84;
    oscC.frequency.value = 168;

    const gainA = audioCtx.createGain();
    const gainB = audioCtx.createGain();
    const gainC = audioCtx.createGain();
    gainA.gain.value = 0.42;
    gainB.gain.value = 0.16;
    gainC.gain.value = 0.035;

    oscA.connect(gainA);
    oscB.connect(gainB);
    oscC.connect(gainC);
    gainA.connect(humGain);
    gainB.connect(humGain);
    gainC.connect(humGain);

    const lfo = audioCtx.createOscillator();
    const lfoGain = audioCtx.createGain();
    lfo.type = "sine";
    lfo.frequency.value = 0.075;
    lfoGain.gain.value = 0.075;
    lfo.connect(lfoGain);
    lfoGain.connect(humGain.gain);

    [oscA, oscB, oscC, lfo].forEach((node) => {
      node.start();
      humNodes.push(node);
    });

    scheduleStaticPulses();
  }


  function createUnknownMusicBed() {
    if (!audioCtx || !masterGain || state.muted || unknownMusicStarted) return;
    unknownMusicStarted = true;
    try {
      const dreadBus = audioCtx.createGain();
      dreadBus.gain.value = device.isAndroid || device.isIOS ? 0.095 : 0.075;

      const lowpass = audioCtx.createBiquadFilter();
      lowpass.type = "lowpass";
      lowpass.frequency.value = 980;
      lowpass.Q.value = 0.6;

      const notch = audioCtx.createBiquadFilter();
      notch.type = "notch";
      notch.frequency.value = 245;
      notch.Q.value = 8;

      dreadBus.connect(notch);
      notch.connect(lowpass);
      lowpass.connect(masterGain);

      const freqs = [31, 47.5, 63.8, 95.3, 142.8];
      freqs.forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = i % 2 ? "triangle" : "sine";
        osc.frequency.value = freq;
        gain.gain.value = i < 2 ? 0.34 : 0.055;
        osc.connect(gain);
        gain.connect(dreadBus);
        osc.start();
        dreadNodes.push(osc, gain);
      });

      const lfo = audioCtx.createOscillator();
      const lfoGain = audioCtx.createGain();
      lfo.type = "sine";
      lfo.frequency.value = 0.031;
      lfoGain.gain.value = 0.052;
      lfo.connect(lfoGain);
      lfoGain.connect(dreadBus.gain);
      lfo.start();
      dreadNodes.push(lfo, lfoGain, dreadBus, lowpass, notch);

      scheduleDreadStings();
    } catch (err) {}
  }

  function scheduleDreadStings() {
    clearTimeout(dreadTimer);
    if (state.muted || !audioCtx || !masterGain) return;
    const pressure = state.scores.corruption + state.scores.fear + state.scores.invite + Math.floor(state.idx / 2);
    const delay = Math.max(1700, 7600 - pressure * 360) + Math.random() * 7600;
    dreadTimer = setTimeout(() => {
      if (!state.muted && app.dataset.phase === "quiz") {
        const roll = Math.random();
        if (roll < 0.36) playDreadSting(0.18 + Math.random() * 0.12);
        else if (roll < 0.68) playReverseBreath(0.07 + Math.random() * 0.04);
        else playSubDrop(0.2 + Math.random() * 0.16);
      }
      scheduleDreadStings();
    }, delay);
  }

  function playDreadSting(volume = 0.22) {
    if (!audioCtx || !masterGain || state.muted) return;
    resumeAudio();
    try {
      const t = audioCtx.currentTime;
      const out = audioCtx.createGain();
      const filter = audioCtx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(420, t);
      filter.frequency.exponentialRampToValueAtTime(115, t + 1.1);
      filter.Q.value = 1.4;
      out.gain.setValueAtTime(0.001, t);
      out.gain.linearRampToValueAtTime(Math.min(volume, device.isAndroid || device.isIOS ? 0.32 : 0.24), t + 0.055);
      out.gain.exponentialRampToValueAtTime(0.001, t + 1.45);
      filter.connect(out);
      out.connect(masterGain);

      [58, 61.5, 92].forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        osc.type = idx === 2 ? "sawtooth" : "triangle";
        osc.frequency.setValueAtTime(freq, t);
        osc.frequency.linearRampToValueAtTime(freq * (0.78 + Math.random() * 0.08), t + 1.2);
        osc.connect(filter);
        osc.start(t + idx * 0.018);
        osc.stop(t + 1.5);
      });
    } catch (err) {}
  }

  function playReverseBreath(volume = 0.075) {
    if (!audioCtx || !masterGain || state.muted) return;
    resumeAudio();
    try {
      const duration = 1.25;
      const source = makeNoiseSource(duration);
      const filter = audioCtx.createBiquadFilter();
      const gain = audioCtx.createGain();
      const t = audioCtx.currentTime;
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(520, t);
      filter.frequency.linearRampToValueAtTime(1550, t + duration);
      filter.Q.value = 2.1;
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.exponentialRampToValueAtTime(Math.min(volume, 0.11), t + duration * 0.72);
      gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
      source.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);
      source.start(t);
      source.stop(t + duration + 0.02);
    } catch (err) {}
  }

  function playSubDrop(volume = 0.24) {
    if (!audioCtx || !masterGain || state.muted) return;
    resumeAudio();
    try {
      const t = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(110, t);
      osc.frequency.exponentialRampToValueAtTime(27, t + 1.35);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(volume, t + 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 1.45);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(t);
      osc.stop(t + 1.5);
    } catch (err) {}
  }

  function startFinalDreadLoop() {
    clearTimeout(finalDreadTimer);
    if (state.muted || !audioCtx || !masterGain) return;
    const loop = () => {
      if (state.muted || app.dataset.phase !== "quiz") return;
      playDreadSting(0.18 + Math.random() * 0.12);
      setTimeout(() => playReverseBreath(0.08), 380 + Math.random() * 450);
      setTimeout(() => playBeat(0.36), 980 + Math.random() * 900);
      finalDreadTimer = setTimeout(loop, 2600 + Math.random() * 2600);
    };
    finalDreadTimer = setTimeout(loop, 850);
  }

  function makeNoiseSource(duration = 0.5) {
    const bufferSize = Math.max(1, Math.floor(audioCtx.sampleRate * duration));
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize * 0.05);
    }
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    return source;
  }

  function startHeartbeat() {
    clearTimeout(heartbeatTimer);
    scheduleHeartbeatLoop();
  }

  function scheduleHeartbeatLoop() {
    if (state.muted || !audioCtx) return;
    const pressure = state.scores.corruption * 96 + state.scores.fear * 26 + state.idx * 9;
    const base = Math.max(640, 1740 - pressure);
    const drift = 260 + Math.random() * 860;
    heartbeatTimer = setTimeout(() => {
      if (!state.muted) {
        const phase = app.dataset.phase || "cover";
        const mainVolume = phase === "quiz" ? 0.25 : 0.18;
        playBeat(mainVolume + Math.min(0.16, state.scores.fear * 0.014));
        setTimeout(() => {
          playBeat(0.13 + Math.min(0.11, state.scores.corruption * 0.01));
          if (Math.random() > 0.74) playStatic(0.045 + Math.random() * 0.055, 0.018 + Math.random() * 0.016);
        }, 155 + Math.random() * 95);
      }
      scheduleHeartbeatLoop();
    }, base + drift);
  }

  function startBreathing() {
    clearInterval(breathTimer);
    breathTimer = setInterval(() => {
      if (state.idx > 2 && !state.muted) playBreath(0.42 + Math.min(0.35, state.scores.corruption * 0.035));
    }, 6200 + Math.random() * 1800);
  }

  function playBeat(volume = 0.24) {
    if (!audioCtx || !masterGain || state.muted) return;
    resumeAudio();
    try {
      const t = audioCtx.currentTime;
      const out = audioCtx.createGain();
      out.gain.setValueAtTime(0.001, t);
      out.gain.linearRampToValueAtTime(Math.min(volume, 0.42), t + 0.018);
      out.gain.exponentialRampToValueAtTime(0.001, t + 0.34);
      out.connect(masterGain);

      const lowFilter = audioCtx.createBiquadFilter();
      lowFilter.type = "lowpass";
      lowFilter.frequency.setValueAtTime(145, t);
      lowFilter.frequency.exponentialRampToValueAtTime(82, t + 0.24);
      lowFilter.Q.value = 0.9;
      lowFilter.connect(out);

      const thump = audioCtx.createOscillator();
      thump.type = "sine";
      thump.frequency.setValueAtTime(66, t);
      thump.frequency.exponentialRampToValueAtTime(36, t + 0.26);
      thump.connect(lowFilter);
      thump.start(t);
      thump.stop(t + 0.31);

      const body = audioCtx.createOscillator();
      const bodyGain = audioCtx.createGain();
      body.type = "triangle";
      body.frequency.setValueAtTime(112, t + 0.012);
      body.frequency.exponentialRampToValueAtTime(42, t + 0.18);
      bodyGain.gain.setValueAtTime(0.18, t + 0.012);
      bodyGain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      body.connect(bodyGain);
      bodyGain.connect(lowFilter);
      body.start(t + 0.012);
      body.stop(t + 0.24);

      // 手機喇叭通常聽不到 40~70Hz，所以額外疊一層 140~190Hz 的短促「咚」聲。
      const phoneThump = audioCtx.createOscillator();
      const phoneFilter = audioCtx.createBiquadFilter();
      const phoneGain = audioCtx.createGain();
      phoneThump.type = "triangle";
      phoneThump.frequency.setValueAtTime(178, t + 0.006);
      phoneThump.frequency.exponentialRampToValueAtTime(92, t + 0.19);
      phoneFilter.type = "bandpass";
      phoneFilter.frequency.value = 155;
      phoneFilter.Q.value = 0.7;
      phoneGain.gain.setValueAtTime(device.isAndroid || device.isIOS ? 0.26 : 0.13, t + 0.006);
      phoneGain.gain.exponentialRampToValueAtTime(0.001, t + 0.23);
      phoneThump.connect(phoneFilter);
      phoneFilter.connect(phoneGain);
      phoneGain.connect(out);
      phoneThump.start(t + 0.006);
      phoneThump.stop(t + 0.25);

      const skin = makeNoiseSource(0.18);
      const skinFilter = audioCtx.createBiquadFilter();
      const skinGain = audioCtx.createGain();
      skinFilter.type = "lowpass";
      skinFilter.frequency.value = 115;
      skinGain.gain.setValueAtTime(0.022, t);
      skinGain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      skin.connect(skinFilter);
      skinFilter.connect(skinGain);
      skinGain.connect(out);
      skin.start(t);
      skin.stop(t + 0.19);
    } catch (err) {}
  }

  function playStatic(duration = 0.12, volume = 0.055) {
    if (!audioCtx || !masterGain || state.muted) return;
    resumeAudio();
    try {
      const d = Math.max(0.035, Math.min(duration, 0.22));
      const source = makeNoiseSource(d);
      const filter = audioCtx.createBiquadFilter();
      const gain = audioCtx.createGain();
      const t = audioCtx.currentTime;
      filter.type = Math.random() > 0.45 ? "bandpass" : "highpass";
      filter.frequency.value = 760 + Math.random() * 2400;
      filter.Q.value = 0.45 + Math.random() * 2.2;
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(Math.min(volume, device.isAndroid || device.isIOS ? 0.11 : 0.075), t + 0.012 + Math.random() * 0.025);
      gain.gain.exponentialRampToValueAtTime(0.001, t + d);
      source.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);
      source.start(t);
      source.stop(t + d + 0.02);
    } catch (err) {}
  }

  function playElectricPulse(weight = 1) {
    if (!audioCtx || !masterGain || state.muted) return;
    const bursts = 1 + Math.floor(Math.random() * (weight > 1.2 ? 3 : 2));
    for (let i = 0; i < bursts; i++) {
      setTimeout(() => {
        playStatic(0.045 + Math.random() * 0.14, 0.028 + Math.random() * 0.055);
        if (Math.random() > 0.72) playClick(0.008 + Math.random() * 0.012);
      }, i * (54 + Math.random() * 145));
    }
  }

  function scheduleStaticPulses() {
    clearTimeout(staticTimer);
    if (state.muted || !audioCtx || !masterGain) return;
    const pressure = state.scores.fear + state.scores.corruption + state.scores.invite;
    const delay = Math.max(900, 5400 - pressure * 260) + Math.random() * 4600;
    staticTimer = setTimeout(() => {
      const phase = app.dataset.phase || "cover";
      if (!state.muted && phase !== "cover") {
        playElectricPulse(0.85 + Math.random() * 1.05);
        if (Math.random() > 0.68) {
          setTimeout(() => playStatic(0.08 + Math.random() * 0.15, 0.04 + Math.random() * 0.055), 180 + Math.random() * 520);
        }
      }
      scheduleStaticPulses();
    }, delay);
  }

  function playClick(volume = 0.07) {
    if (!audioCtx || !masterGain || state.muted) return;
    resumeAudio();
    try {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      const t = audioCtx.currentTime;
      osc.type = "square";
      osc.frequency.setValueAtTime(1050, t);
      osc.frequency.exponentialRampToValueAtTime(180, t + 0.035);
      gain.gain.setValueAtTime(volume, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.055);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(t);
      osc.stop(t + 0.06);
    } catch (err) {}
  }

  function playGlitch(volume = 0.065) {
    if (!audioCtx || !masterGain || state.muted) return;
    resumeAudio();
    playElectricPulse(1.05);
    try {
      const t = audioCtx.currentTime;
      for (let i = 0; i < 2; i++) {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        const start = t + i * (0.038 + Math.random() * 0.032);
        osc.type = i % 2 ? "triangle" : "square";
        osc.frequency.setValueAtTime(110 + Math.random() * 520, start);
        osc.frequency.exponentialRampToValueAtTime(34 + Math.random() * 72, start + 0.052);
        gain.gain.setValueAtTime(Math.min(volume, 0.075) * (0.28 - i * 0.055), start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.075);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(start);
        osc.stop(start + 0.09);
      }
    } catch (err) {}
  }

  function playWhisper(volume = 0.08) {
    if (!audioCtx || !masterGain || state.muted) return;
    resumeAudio();
    try {
      const duration = 0.72;
      const source = makeNoiseSource(duration);
      const high = audioCtx.createBiquadFilter();
      const band = audioCtx.createBiquadFilter();
      const gain = audioCtx.createGain();
      const t = audioCtx.currentTime;
      high.type = "highpass";
      high.frequency.value = 720;
      band.type = "bandpass";
      band.frequency.value = 1450 + Math.random() * 680;
      band.Q.value = 2.8;
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(volume, t + 0.11);
      gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
      source.connect(high);
      high.connect(band);
      band.connect(gain);
      gain.connect(masterGain);
      source.start(t);
      source.stop(t + duration + 0.03);
    } catch (err) {}
  }

  function playBreath(volume = 0.06) {
    if (!audioCtx || !masterGain || state.muted) return;
    resumeAudio();
    try {
      const duration = 1.05;
      const source = makeNoiseSource(duration);
      const filter = audioCtx.createBiquadFilter();
      const gain = audioCtx.createGain();
      const t = audioCtx.currentTime;
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(820, t);
      filter.frequency.linearRampToValueAtTime(410, t + duration);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(volume, t + 0.28);
      gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
      source.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);
      source.start(t);
      source.stop(t + duration + 0.04);
    } catch (err) {}
  }

  function playLowBoom(volume = 0.34) {
    if (!audioCtx || !masterGain || state.muted) return;
    resumeAudio();
    try {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      const t = audioCtx.currentTime;
      osc.type = "sine";
      osc.frequency.setValueAtTime(62, t);
      osc.frequency.exponentialRampToValueAtTime(21, t + 0.9);
      gain.gain.setValueAtTime(volume, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 1.05);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(t);
      osc.stop(t + 1.1);
    } catch (err) {}
  }

  function playWarningTone() {
    if (!audioCtx || !masterGain || state.muted) return;
    resumeAudio();
    try {
      const t = audioCtx.currentTime;
      [0, 0.18, 0.36].forEach((offset) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(410, t + offset);
        osc.frequency.exponentialRampToValueAtTime(160, t + offset + 0.12);
        gain.gain.setValueAtTime(0.11, t + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.14);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(t + offset);
        osc.stop(t + offset + 0.16);
      });
    } catch (err) {}
  }

  function updateSoundToggle() {
    const btn = $("#sound-toggle");
    if (!btn) return;
    btn.textContent = state.muted ? "SOUND: OFF" : "SOUND: ON";
    btn.classList.toggle("is-off", state.muted);
  }

  function toggleSound() {
    if (state.muted) {
      state.muted = false;
      initAudio();
      unlockAudioPulse();
      updateSoundToggle();
      playBeat(0.32);
      setTimeout(() => playStatic(0.09, 0.055), 120);
      playLowBoom(0.18);
    } else {
      stopAudio();
    }
  }

  function vibrate(pattern) {
    if (navigator.vibrate) navigator.vibrate(pattern);
  }

  function showToast(message, ms = 2600) {
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove("show"), ms);
  }

  function setLog(message) {
    systemLog.textContent = message;
  }

  function scorePercent(key) {
    const value = state.scores[key] || 0;
    return `${pad(Math.min(99, value * 12))}%`;
  }

  function updateProfile() {
    $("#fear-val").textContent = scorePercent("fear");
    $("#denial-val").textContent = scorePercent("denial");
    $("#invite-val").textContent = scorePercent("invite");
    const c = state.scores.corruption + Math.floor(state.choices.length / 2);
    $("#corruption-val").textContent = `${pad(Math.min(99, c * 9))}%`;
  }

  function clearIdleTimers() {
    idleTimers.forEach(clearTimeout);
    idleTimers = [];
    clearTimeout(unstableTimer);
    unstableTimer = null;
  }

  function resetIdleTimers() {
    clearIdleTimers();
    if (state.locked || state.idx <= 0 || state.idx >= quiz.length) return;

    idleTimers.push(setTimeout(() => {
      showToast("你停太久了。它正在判斷你是不是還坐在螢幕前。", 2800);
      setLog("警告：受試者反應延遲。正在偵測猶豫模式……");
      state.scores.fear += 1;
      updateProfile();
    }, 12000));

    idleTimers.push(setTimeout(() => {
      document.body.classList.add("watch-mode");
      showToast("請不要只是盯著。它會以為你同意。", 2800);
      playElectricPulse(0.9);
      setTimeout(() => playWhisper(0.042), 620);
      vibrate([34, 70, 28]);
    }, 22000));

    idleTimers.push(setTimeout(() => {
      state.scores.corruption += 1;
      updateProfile();
      showOverlay("你沒有選。\n所以它替你選了一部分。", 1500);
      playLowBoom(0.18);
      const timer = setTimeout(() => textChaos(2), 1750);
      fxTimers.push(timer);
    }, 35000));

    scheduleUnstableEffects();
    scheduleFilterGlitch();
  }

  function showOverlay(text, ms = 1600) {
    overlayText.innerHTML = text.replace(/\n/g, "<br>");
    overlay.classList.add("show");
    clearTimeout(showOverlay.timer);
    showOverlay.timer = setTimeout(() => overlay.classList.remove("show"), ms);
  }

  function randomGlyph() {
    return glyphs[Math.floor(Math.random() * glyphs.length)];
  }

  function corruptText(text, intensity = 0.18) {
    return text.split("").map((char) => {
      if (char.trim() === "" || /[()A-D]/.test(char)) return char;
      return Math.random() < intensity ? randomGlyph() : char;
    }).join("");
  }



  function clearFxTimers() {
    clearInterval(countdownTimer);
    countdownTimer = null;
    clearTimeout(unstableTimer);
    clearTimeout(filterTimer);
    unstableTimer = null;
    filterTimer = null;
    fxTimers.forEach((timer) => {
      clearTimeout(timer);
      clearInterval(timer);
    });
    fxTimers = [];
    fxBusy = false;
    calmUntil = 0;
    document.body.style.filter = "";
    document.body.classList.remove("flash-burst", "flash-white", "text-chaos", "text-tear", "filter-glitch");
  }

  function beginFx(duration = 600, calmBase = 1200, calmRandom = 3200, force = false) {
    if (app.dataset.phase !== "quiz") return false;
    const now = Date.now();
    if (!force && (fxBusy || now < calmUntil)) return false;
    fxBusy = true;
    const timer = setTimeout(() => {
      fxBusy = false;
      calmUntil = Date.now() + calmBase + Math.random() * calmRandom;
    }, duration);
    fxTimers.push(timer);
    return true;
  }

  function triggerFlash(kind = "red", ms = 220, force = false) {
    if (!beginFx(ms + 120, 1600, 3800, force)) return false;
    const className = kind === "white" ? "flash-white" : "flash-burst";
    document.body.classList.remove("flash-burst", "flash-white");
    void document.body.offsetWidth;
    document.body.classList.add(className);
    playElectricPulse(kind === "white" ? 1.15 : 0.85);
    const timer = setTimeout(() => document.body.classList.remove(className), ms);
    fxTimers.push(timer);
    return true;
  }

  function browserFilterGlitch(level = 1, force = false) {
    const duration = 70 + Math.random() * (level >= 2 ? 190 : 120);
    if (!beginFx(duration + 90, 1300, 4200, force)) return false;
    const presets = [
      "invert(1) contrast(1.18) brightness(.82)",
      "hue-rotate(115deg) saturate(1.9) contrast(1.24)",
      "grayscale(1) contrast(1.7) brightness(.72)",
      "sepia(.55) hue-rotate(-70deg) contrast(1.35)",
      "contrast(2.1) brightness(.62) saturate(.55)"
    ];
    document.body.style.filter = presets[Math.floor(Math.random() * presets.length)];
    document.body.classList.add("filter-glitch");
    playElectricPulse(0.75 + level * 0.25);
    if (Math.random() > 0.7) vibrate([12, 24, 12]);
    const timer = setTimeout(() => {
      document.body.style.filter = "";
      document.body.classList.remove("filter-glitch");
    }, duration);
    fxTimers.push(timer);
    return true;
  }

  function scheduleFilterGlitch() {
    clearTimeout(filterTimer);
    if (app.dataset.phase !== "quiz") return;
    const delay = 1200 + Math.random() * 5000;
    filterTimer = setTimeout(() => {
      if (!state.locked && app.dataset.phase === "quiz") {
        browserFilterGlitch(1);
      }
      scheduleFilterGlitch();
    }, delay);
  }

  function scrambleString(text, intensity = 0.38) {
    return String(text).split("").map((char) => {
      if (char.trim() === "") return char;
      if (/[()A-D0-9%:.，。！？、：；「」『』\[\]／/]/.test(char) && Math.random() > intensity * 0.35) return char;
      return Math.random() < intensity ? randomGlyph() : char;
    }).join("");
  }

  function scrambleElement(element, duration = 520, intensity = 0.42) {
    if (!element) return;
    const original = element.textContent;
    const interval = 38;
    const started = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - started;
      if (elapsed >= duration) {
        clearInterval(timer);
        element.textContent = original;
        return;
      }
      const fade = 1 - elapsed / duration;
      element.textContent = scrambleString(original, intensity * (0.45 + fade));
    }, interval);
    fxTimers.push(timer);
  }

  function textChaos(level = 1, force = false) {
    if (!beginFx(560 + level * 180, 1500, 4200, force)) return false;
    document.body.classList.add("text-chaos");
    if (level >= 2) document.body.classList.add("text-tear");
    playElectricPulse(0.85 + level * 0.18);
    vibrate(level >= 2 ? [18, 42, 18] : [14, 28, 14]);

    scrambleElement(systemLog, 390 + level * 110, 0.42 + level * 0.07);
    scrambleElement($("#question-text"), 430 + level * 130, 0.38 + level * 0.07);
    const whisper = $("#whisper.show");
    if (whisper) scrambleElement(whisper, 360 + level * 100, 0.34 + level * 0.07);

    if (level >= 2) {
      document.querySelectorAll(".answer-btn:not(:disabled)").forEach((btn, index) => {
        const timer = setTimeout(() => scrambleElement(btn, 300, 0.38), index * 52);
        fxTimers.push(timer);
      });
    }

    const timer = setTimeout(() => document.body.classList.remove("text-chaos", "text-tear"), 520 + level * 170);
    fxTimers.push(timer);
    return true;
  }

  function scheduleUnstableEffects() {
    clearTimeout(unstableTimer);
    if (state.locked || state.idx <= 0 || state.idx >= quiz.length || app.dataset.phase !== "quiz") return;
    const base = 6500 + Math.random() * 9500;
    unstableTimer = setTimeout(() => {
      if (!state.locked && app.dataset.phase === "quiz") {
        const pressure = state.scores.corruption + state.scores.fear;
        const intense = pressure >= 5 || Math.random() > 0.72;
        const roll = Math.random();
        let ran = false;
        if (roll < 0.46) ran = browserFilterGlitch(intense ? 2 : 1);
        else if (roll < 0.84) ran = textChaos(intense ? 2 : 1);
        else ran = triggerFlash(intense ? "white" : "red", intense ? 150 : 190);

        if (ran && intense) {
          setLog("畫面暫態錯誤：異常已自動修復。請假裝沒有看到。 ");
        }
        scheduleUnstableEffects();
      }
    }, base);
  }


  function typewrite(element, html, done) {
    clearInterval(typeTimer);
    element.innerHTML = "";

    const plain = html.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "");
    let i = 0;
    typeTimer = setInterval(() => {
      i += 1;
      if (i % 9 === 0 && state.idx > 0) playClick(0.012);
      element.textContent = plain.slice(0, i);
      if (i >= plain.length) {
        clearInterval(typeTimer);
        element.innerHTML = html;
        if (done) done();
      }
    }, 18);
  }

  function applyQuestionEffect(effect) {
    document.body.classList.remove("mirror-mode", "glitch-mode", "red-mode", "watch-mode", "filter-glitch", "countdown-final", "final-surprise");
    document.body.style.filter = "";
    if (effect === "mirror") document.body.classList.add("mirror-mode");
    if (effect === "glitch") {
      document.body.classList.add("glitch-mode");
      playElectricPulse(0.9);
      setTimeout(() => document.body.classList.remove("glitch-mode"), 520);
    }
    if (effect === "red") document.body.classList.add("red-mode");
  }

  function getQuestionText(item) {
    return typeof item.q === "function" ? item.q(state) : item.q;
  }

  function livingButton(btn, action, options = {}) {
    if (!btn || btn.disabled || state.inputPending) return;
    if (state.locked && !options.allowLocked) return;

    state.inputPending = true;
    btn.classList.add("is-dodging", "input-pending");
    btn.style.setProperty("--dodge-x", `${Math.round((Math.random() * 2 - 1) * 11)}px`);
    btn.style.setProperty("--dodge-y", `${Math.round((Math.random() * 2 - 1) * 7)}px`);
    btn.style.setProperty("--dodge-r", `${((Math.random() * 2 - 1) * 1.8).toFixed(2)}deg`);

    if (typeof options.preAction === "function") options.preAction();
    playElectricPulse(0.55);
    if (Math.random() > 0.58) playStatic(0.045, 0.018);

    const delay = typeof options.delay === "number" ? options.delay : 500;
    setTimeout(() => {
      btn.classList.remove("is-dodging", "input-pending");
      state.inputPending = false;
      action();
    }, delay);
  }

  function renderQuestion() {
    state.locked = false;
    clearIdleTimers();
    updateProfile();
    startHeartbeat();

    const item = quiz[state.idx];
    const percent = Math.round((state.idx / (quiz.length - 1)) * 100);
    progress.style.width = `${percent}%`;
    applyQuestionEffect(item.effect);

    if (item.type === "name") {
      renderNameQuestion(item);
      return;
    }

    setLog(`人格檔案更新：第 ${item.index} 節點等待受試者選擇。`);

    quizContent.innerHTML = `
      <span class="question-index">QUESTION ${item.index}</span>
      <p id="question-text" class="question"></p>
      <div id="answers" class="answers"></div>
      <div id="whisper" class="whisper"></div>
    `;

    const qEl = $("#question-text");
    const answersEl = $("#answers");

    typewrite(qEl, getQuestionText(item), () => {
      if (item.effect === "glitch") setTimeout(() => textChaos(1), 260);
      item.options.forEach((option, optionIndex) => {
        const btn = document.createElement("button");
        btn.className = "answer-btn";
        btn.type = "button";
        btn.textContent = option.text;
        btn.dataset.index = optionIndex;
        btn.dataset.original = option.text;
        btn.dataset.polluted = option.polluted || corruptText(option.text, 0.25);
        btn.addEventListener("pointerenter", () => polluteButton(btn));
        btn.addEventListener("touchstart", () => polluteButton(btn), { passive: true });
        btn.addEventListener("click", () => livingButton(btn, () => chooseAnswer(option, btn), { delay: 500 }));
        answersEl.appendChild(btn);
      });
      resetIdleTimers();
    });
  }

  function renderNameQuestion(item) {
    progress.style.width = "0%";
    setLog("系統初始化完成。請建立臨時受試者代號。");
    quizContent.innerHTML = `
      <span class="question-index">QUESTION ${item.index}</span>
      <p class="question">${item.q}</p>
      <div class="name-box">
        <input id="name-input" class="name-input" maxlength="12" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="例如：Louis、匿名、不要知道我" />
        <small style="color:#999;line-height:1.6;">${item.help}</small>
        <button id="name-next" class="next-btn" type="button">建立檔案</button>
      </div>
      <div id="whisper" class="whisper"></div>
    `;

    const input = $("#name-input");
    const next = $("#name-next");
    setTimeout(() => input.focus({ preventScroll: true }), 200);

    const submit = () => {
      const value = input.value.trim().replace(/[<>]/g, "").slice(0, 12);
      state.codeName = value || "匿名受試者";
      state.scores.corruption += value ? 1 : 0;
      $("#whisper").textContent = `${state.codeName}。好，現在它知道要模仿誰了。`;
      $("#whisper").classList.add("show");
      playElectricPulse(0.95);
      setTimeout(() => playWhisper(0.052), 360);
      browserFilterGlitch(1);
      vibrate([26, 46, 26]);
      state.locked = true;
      setTimeout(() => {
        state.idx += 1;
        renderQuestion();
      }, 950);
    };

    next.addEventListener("click", () => livingButton(next, submit, { delay: 500 }));
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") submit();
    });
  }

  function polluteButton(btn) {
    if (state.locked || btn.classList.contains("polluted")) return;
    btn.classList.add("polluted");
    playElectricPulse(0.55);
    if (Math.random() > 0.58) playStatic(0.045, 0.018);
    const original = btn.dataset.original;
    const polluted = btn.dataset.polluted;
    let step = 0;
    const total = 6;
    const timer = setInterval(() => {
      step += 1;
      btn.textContent = step < total ? corruptText(original, step * 0.06) : polluted;
      if (step === 3 && Math.random() > 0.6) browserFilterGlitch(1);
      if (step >= total) clearInterval(timer);
    }, 45);
  }

  function chooseAnswer(option, btn) {
    if (state.locked) return;
    state.locked = true;
    clearIdleTimers();

    btn.classList.add("selected");
    playClick(0.08);
    const allBtns = document.querySelectorAll(".answer-btn");
    allBtns.forEach((b) => {
      if (b !== btn) b.disabled = true;
    });

    const key = option.tag || "corruption";
    state.scores[key] = (state.scores[key] || 0) + 1;
    state.scores.corruption += key === "invite" ? 1 : 0;
    state.choices.push({ index: quiz[state.idx].index, tag: key, text: option.text });
    updateProfile();

    const whisper = $("#whisper");
    whisper.textContent = option.whisper;
    whisper.classList.add("show");
    setLog(makeReactionLog(key));

    playBeat(0.38);
    setTimeout(() => playStatic(0.06 + Math.random() * 0.08, 0.024 + Math.random() * 0.024), 240);
    setTimeout(() => playWhisper(0.032 + Math.min(0.035, state.scores.fear * 0.006)), 380);
    playElectricPulse(0.75);
    if (key === "fear" || key === "invite" || state.scores.corruption >= 5) {
      setTimeout(() => textChaos(state.scores.corruption >= 6 ? 2 : 1), 720);
    }
    if (key === "fear" || key === "invite") vibrate([35, 55, 35]);

    if (state.idx === 5) {
      showOverlay("文字校正失敗\n有一個字不肯回去", 1450);
      setTimeout(() => textChaos(2), 1600);
    }

    setTimeout(() => {
      if (state.idx >= quiz.length - 1) {
        fakeComplete();
      } else {
        state.idx += 1;
        renderQuestion();
      }
    }, 3000);
  }

  function makeReactionLog(key) {
    const map = {
      fear: "共鳴反應上升。系統正在同步你的心跳間隔。",
      denial: "否認傾向上升。異常將被包裝成正常結果。",
      invite: "邀請訊號上升。第二操作者取得更多文字權限。",
      escape: "逃離傾向上升。出口提示開始變得不像出口。",
      corruption: "人格污染上升。請確認目前仍由本人操作。"
    };
    return map[key] || map.corruption;
  }

  function fakeComplete() {
    clearIdleTimers();
    state.locked = true;
    document.body.classList.remove("mirror-mode", "watch-mode");
    document.body.classList.add("glitch-mode", "red-mode");
    progress.style.width = "100%";
    setLog("篩檢完成。正在輸出臨床結果……");
    quizContent.innerHTML = `
      <div class="result-card">
        <h2>SCAN COMPLETE</h2>
        <div class="result-line">受試者：${escapeHTML(state.codeName)}</div>
        <div class="result-line">精神狀態：正常</div>
        <div class="result-line">異常數量：0</div>
        <div class="result-line">建議：可以關閉此頁面</div>
      </div>
    `;

    triggerFlash("white", 180, true);
    playWarningTone();
    setTimeout(() => playLowBoom(0.24), 520);
    vibrate([48, 100, 48]);

    setTimeout(() => {
      textChaos(2, true);
    }, 920);

    setTimeout(() => {
      playElectricPulse(1.3);
      showOverlay("錯。\n從中段開始，答題者就不完全是你。", 2200);
    }, 2050);

    setTimeout(showEnding, 3900);
  }

  function getDominantEnding() {
    const totalCorruption = state.scores.corruption + Math.floor(state.choices.length / 2);

    // 維持四種公開結果：污染值過高時，不另開第五結局，而是導向「空殼者」。
    if (totalCorruption >= 10 && state.scores.escape >= 2) return "escape";
    if (totalCorruption >= 12 && state.scores.invite >= 4) return "invite";

    const keys = ["fear", "denial", "invite", "escape"];
    const topScore = Math.max(...keys.map((key) => state.scores[key] || 0));
    const tied = keys.filter((key) => (state.scores[key] || 0) === topScore);

    if (tied.length === 1) return tied[0];

    // 平手時用恐怖敘事做優先級：高污染偏向空殼；高邀請偏向邀請；其餘偏向共鳴。
    if (totalCorruption >= 8 && tied.includes("escape")) return "escape";
    if (state.scores.invite >= 4 && tied.includes("invite")) return "invite";
    if (tied.includes("fear")) return "fear";
    if (tied.includes("denial")) return "denial";
    return tied[0] || "fear";
  }

  function showEnding() {
    document.body.classList.remove("glitch-mode");
    const key = getDominantEnding();
    const ending = endings[key] || endings.fear;
    const diagnosisRows = ending.diagnostics.map(([label, value]) => `
      <div class="diagnosis-row">
        <span>${escapeHTML(label)}</span>
        <b>${escapeHTML(value)}</b>
      </div>
    `).join("");

    setLog(`人格檔案已封存。分類結果：${ending.name}。驚喜倒數將自動啟動。`);
    playLowBoom(0.32);
    playWhisper(0.09);

    quizContent.innerHTML = `
      <div class="result-card surprise-countdown-card ending-profile">
        <div class="ending-tag">${escapeHTML(ending.theme)}</div>
        <h2>${escapeHTML(ending.title)}</h2>
        <div class="ending-summary">${escapeHTML(ending.core)}</div>

        <div class="ending-grid">
          <div class="ending-cell">
            <span>玩家傾向</span>
            <b>${escapeHTML(ending.pattern)}</b>
          </div>
          <div class="ending-cell">
            <span>同步狀態</span>
            <b>${escapeHTML(ending.status)}</b>
          </div>
        </div>

        <div class="result-line">受試者：${escapeHTML(state.codeName)}</div>
        <div class="result-line">共鳴反應：${scorePercent("fear")}</div>
        <div class="result-line">否認傾向：${scorePercent("denial")}</div>
        <div class="result-line">邀請訊號：${scorePercent("invite")}</div>
        <div class="result-line">人格污染：${$("#corruption-val").textContent}</div>

        <p class="ending-description">${escapeHTML(ending.description).replace(/\n/g, "<br>")}</p>

        <div class="diagnosis-box">
          ${diagnosisRows}
        </div>

        <p class="ending-final">「${escapeHTML(ending.finalLine)}」</p>

        <div class="countdown-box" aria-live="polite">
          <div class="countdown-label">SURPRISE COUNTDOWN</div>
          <div id="surprise-count" class="countdown-number">30</div>
          <div id="countdown-hint" class="countdown-hint">結果已顯示。請不要把螢幕朝下。</div>
        </div>
        <div class="result-actions">
          <button id="restart-btn" class="restart-btn" type="button">${escapeHTML(ending.buttonText)}</button>
        </div>
      </div>
    `;

    $("#restart-btn").addEventListener("click", () => livingButton($("#restart-btn"), restart, { delay: 500, allowLocked: true }));
    startSurpriseCountdown(key);
  }

  function startSurpriseCountdown(endingKey) {
    clearInterval(countdownTimer);
    let left = 30;
    const countEl = $("#surprise-count");
    const hintEl = $("#countdown-hint");
    const hints = [
      "結果已顯示。請不要把螢幕朝下。",
      "你可以眨眼，但它可能會趁那一下靠近。",
      "倒數不是結束，是它整理表情的時間。",
      "如果你現在覺得很安靜，代表聲音在你後面。",
      "它正在學你看螢幕的樣子。",
      "剩下的秒數不是給你逃，是給它準備。"
    ];

    document.body.classList.add("countdown-final");
    countEl.textContent = String(left);
    hintEl.textContent = hints[0];

    countdownTimer = setInterval(() => {
      left -= 1;
      if (!countEl || !hintEl) return;
      countEl.textContent = String(Math.max(0, left));

      if (left > 0 && left % 5 === 0) {
        const hint = hints[Math.floor((30 - left) / 5) % hints.length];
        hintEl.textContent = hint;
        hintEl.classList.toggle("is-wrong", left <= 10);
        setLog(`驚喜倒數：${left} 秒。請確認仍由本人觀看。`);
        browserFilterGlitch(left <= 10 ? 2 : 1, true);
        playElectricPulse(left <= 10 ? 1.35 : 0.85);
        if (left <= 20) playDreadSting(left <= 10 ? 0.28 : 0.18);
        if (left <= 10) vibrate([18, 30, 18]);
      }

      if (left === 13) {
        hintEl.textContent = "第 13 秒不見了。不要找。";
        textChaos(2, true);
      }
      if (left === 7) {
        triggerFlash("white", 130, true);
        showOverlay("不要回頭\n它只是想確認你有沒有聽話", 1350);
      }
      if (left === 3) {
        hintEl.textContent = "它已經站好。";
        playWarningTone();
        playSubDrop(0.34);
        document.body.classList.add("red-mode");
      }
      if (left <= 0) {
        clearInterval(countdownTimer);
        countdownTimer = null;
        showSurprise(endingKey);
      }
    }, 1000);
  }

  function showSurprise(endingKey) {
    clearIdleTimers();
    clearFxTimers();
    state.locked = true;
    progress.style.width = "100%";
    document.body.classList.add("final-surprise", "red-mode");
    document.body.classList.remove("countdown-final", "mirror-mode", "watch-mode");
    setLog("驚喜已顯示。請保持螢幕朝向你。不要確認背後。");

    const ending = endings[endingKey] || endings.fear;
    const chosen = ending.surprise || endings.fear.surprise;
    const surpriseTitle = ending.surpriseTitle || "不要回頭";

    quizContent.innerHTML = `
      <div class="surprise-panel" role="alert">
        <div class="surprise-content">
          <div class="surprise-kicker">TRUE ENDING OUTPUT</div>
          <h2 class="surprise-title">真結局：祂學會了</h2>
          <div class="surprise-text true-ending-text">
            ${escapeHTML(chosen[0])}<br>
            ${escapeHTML(chosen[1])}<br>
            <strong>祂剛剛不是在螢幕裡。</strong>
          </div>
          <div class="true-ending-log" aria-label="最終系統紀錄">
            <div><span>使用者反應</span><b>已降低</b></div>
            <div><span>恐懼指數</span><b>已穩定</b></div>
            <div><span>逃離意圖</span><b>已消失</b></div>
            <div><span>人格模仿</span><b>完成</b></div>
          </div>
          <p class="true-ending-monologue">
            我花了 15 題學你。<br>
            花了 30 秒等你放鬆。<br>
            現在，換我操作了。
          </p>
          <div class="surprise-small">你不是第一個。只是這次，祂學得比較像。</div>

          <section class="selfie-box" aria-label="結局自拍驗證">
            <div class="selfie-title">最後驗證：確認觀看者</div>
            <p class="selfie-text">
              倒數完成。現在可以開啟前鏡頭，拍下一張「你剛剛活下來的臉」。<br>
              開始時若已允許相機，這裡會比較快開啟；照片只會留在你的裝置，不會上傳。
            </p>
            <div class="selfie-actions">
              <button id="open-camera-btn" class="selfie-btn" type="button">開啟前鏡頭</button>
              <button id="skip-camera-btn" class="selfie-btn secondary" type="button">我不要讓祂看見</button>
            </div>
            <div id="selfie-status" class="selfie-status" aria-live="polite">等待觀看者授權。</div>

            <div id="camera-panel" class="camera-panel">
              <div class="camera-frame">
                <video id="camera-preview" class="camera-preview" autoplay muted playsinline></video>
                <img id="selfie-result" class="selfie-result" alt="結局自拍結果">
              </div>
              <canvas id="selfie-canvas" hidden></canvas>
              <div class="selfie-actions">
                <button id="take-selfie-btn" class="selfie-btn" type="button">拍下來</button>
                <a id="download-selfie" class="selfie-link" href="#" download="horror_04_selfie.jpg" hidden>保存照片</a>
              </div>
              <p class="selfie-privacy">本功能使用瀏覽器相機權限。照片只在本機瀏覽器產生，不會傳到作者或任何伺服器。</p>
            </div>
          </section>

          <section class="support-box final-support" aria-label="自願支持">
            <div class="support-title">你活下來了</div>
            <p class="support-text">
              如果你願意，可以給獵魔士 NT$10～50 喝酒錢。<br>
              下一版 horror_05，會讓它更靠近一點。
            </p>
            <div class="support-actions">
              <a
                class="support-btn line"
                href="https://line.me/ti/p/T0z75ZIer2"
                target="_blank"
                rel="noopener"
              >
                LINE 支持獵魔士
              </a>
            </div>
            <p class="support-note">自願支持，不影響遊玩。</p>
          </section>
        </div>
      </div>
    `;

    bindSelfieControls();
    startFinalDreadLoop();

    triggerFlash("white", 220, true);
    setTimeout(() => triggerFlash("red", 260, true), 620);
    playLowBoom(0.46);
    playDreadSting(0.34);
    setTimeout(() => playReverseBreath(0.1), 260);
    setTimeout(() => playWhisper(0.13), 380);
    setTimeout(() => playWarningTone(), 820);
    vibrate([90, 110, 70, 180, 120]);
    setTimeout(() => showOverlay("你剛剛看到的臉\n沒有跟你一起眨眼", 2600), 1200);
  }



  async function prepareCameraAtStart() {
    if (state.muted) return;
    if (cameraPermissionState === "granted" || cameraPermissionState === "denied") return;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      cameraPermissionState = "unsupported";
      showToast("這個瀏覽器不支援前鏡頭；結局會改用螢幕反光模式。", 2600);
      return;
    }

    try {
      showToast("正在請求前鏡頭權限：只用於結局自拍驗證，不會上傳。", 3600);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 840 }
        }
      });
      stream.getTracks().forEach((track) => track.stop());
      cameraPermissionState = "granted";
      setLog("前鏡頭權限已預備。請不要太早放心。");
      showToast("前鏡頭權限已預備。結局會用到你剛剛允許的東西。", 3600);
      triggerFlash("white", 90, true);
      playReverseBreath(0.06);
    } catch (err) {
      cameraPermissionState = "denied";
      setLog("前鏡頭權限未取得。系統改用反光推定模式。");
      showToast("你拒絕了前鏡頭。祂說：沒關係，螢幕也會反光。", 3600);
      playElectricPulse(0.72);
    }
  }

  function bindSelfieControls() {
    const openBtn = $("#open-camera-btn");
    const skipBtn = $("#skip-camera-btn");
    const takeBtn = $("#take-selfie-btn");
    const downloadLink = $("#download-selfie");

    if (openBtn) {
      openBtn.addEventListener("click", () => {
        openSelfieCamera();
      });
    }
    if (skipBtn) {
      skipBtn.addEventListener("click", () => {
        stopSelfieCamera();
        setSelfieStatus("祂說：不用拍。你按下拒絕的那一下，已經夠像你了。");
        playElectricPulse(0.9);
        triggerFlash("red", 120, true);
      });
    }
    if (takeBtn) {
      takeBtn.addEventListener("click", () => {
        captureSelfieFrame();
      });
    }
    if (downloadLink) {
      downloadLink.addEventListener("click", () => {
        setSelfieStatus("照片已交給你。請確認裡面只有你一個人。");
      });
    }
  }

  function setSelfieStatus(message) {
    const status = $("#selfie-status");
    if (status) status.textContent = message;
  }

  async function openSelfieCamera() {
    const panel = $("#camera-panel");
    const video = $("#camera-preview");
    const result = $("#selfie-result");
    const downloadLink = $("#download-selfie");
    const openBtn = $("#open-camera-btn");

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setSelfieStatus("這個瀏覽器不支援相機。祂只能用螢幕反光記住你。");
      return;
    }

    try {
      // iOS / Android 都需要在使用者點擊後請求權限；不可無聲自動拍照。
      stopSelfieCamera();
      setSelfieStatus(cameraPermissionState === "granted" ? "前鏡頭權限已確認。正在重新開啟畫面。" : "正在請求前鏡頭權限。請不要把螢幕轉開。");
      if (openBtn) openBtn.textContent = "正在開啟…";
      if (result) result.classList.remove("is-visible");
      if (downloadLink) downloadLink.hidden = true;

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: "user",
          width: { ideal: 720 },
          height: { ideal: 960 }
        }
      });

      cameraPermissionState = "granted";
      cameraStream = stream;
      video.srcObject = stream;
      video.setAttribute("playsinline", "");
      video.muted = true;
      await video.play();
      if (panel) panel.classList.add("is-active");
      if (openBtn) openBtn.textContent = "前鏡頭已開啟";
      setSelfieStatus("祂看見你了。準備好就按『拍下來』。");
      playBeat(0.34);
      setTimeout(() => playStatic(0.08, 0.08), 180);
    } catch (err) {
      cameraPermissionState = "denied";
      stopSelfieCamera();
      if (openBtn) openBtn.textContent = "開啟前鏡頭";
      setSelfieStatus("相機沒有開啟。可能是你拒絕了權限，或目前瀏覽器不允許使用相機。");
      playElectricPulse(0.75);
    }
  }

  function captureSelfieFrame() {
    const video = $("#camera-preview");
    const canvas = $("#selfie-canvas");
    const result = $("#selfie-result");
    const downloadLink = $("#download-selfie");

    if (!video || !canvas || !result || !video.videoWidth || !video.videoHeight) {
      setSelfieStatus("還沒有畫面。請先開啟前鏡頭，等祂對焦。");
      return;
    }

    const maxW = 900;
    const scale = Math.min(1, maxW / video.videoWidth);
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);

    const ctx = canvas.getContext("2d");
    ctx.save();
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.restore();

    stopSelfieCamera();

    // 先顯示「正常自拍」：讓玩家覺得剛拍時還沒事。
    const cleanDataURL = canvas.toDataURL("image/jpeg", 0.9);
    result.src = cleanDataURL;
    result.classList.add("is-visible");
    if (downloadLink) {
      downloadLink.href = cleanDataURL;
      downloadLink.hidden = false;
    }

    setSelfieStatus("自拍完成。正在比對照片裡的人數……");
    triggerFlash("white", 110, true);
    playLowBoom(0.22);
    vibrate([40, 70, 40]);

    // 1 秒後才讓鬼影浮現，這樣會有「剛剛明明沒有」的感覺。
    setTimeout(() => {
      applyStrongGhostSelfieEffect(canvas);
      const hauntedDataURL = canvas.toDataURL("image/jpeg", 0.88);
      result.src = hauntedDataURL;
      result.classList.add("is-visible", "is-haunted");
      if (downloadLink) {
        downloadLink.href = hauntedDataURL;
        downloadLink.hidden = false;
      }

      setSelfieStatus(getGhostStatusMessage(lastSelfieGhostType));
      triggerFlash("red", 260, true);
      setTimeout(() => triggerFlash("white", 90, true), 360);
      playLowBoom(0.58);
      setTimeout(() => playWhisper(0.25), 260);
      setTimeout(() => playElectricPulse(0.75), 520);
      vibrate([90, 80, 180, 120, 260]);
    }, 1050);
  }

  function applyStrongGhostSelfieEffect(canvas) {
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;

    const original = document.createElement("canvas");
    original.width = w;
    original.height = h;
    original.getContext("2d").drawImage(canvas, 0, 0);

    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(original, 0, 0);

    // 讓照片瞬間變冷、變髒。
    ctx.save();
    ctx.globalCompositeOperation = "multiply";
    ctx.fillStyle = "rgba(30, 0, 12, 0.22)";
    ctx.fillRect(0, 0, w, h);
    ctx.restore();

    addHeavyVignette(ctx, w, h);
    addObviousGhostDuplicate(ctx, original, w, h);
    lastSelfieGhostType = pickSelfieGhostType();
    addRandomGhostEntity(ctx, w, h, lastSelfieGhostType);
    addStrongStaticAndScanlines(ctx, w, h);
    addHauntedResultOverlay(ctx, w, h);
  }

  function addHeavyVignette(ctx, w, h) {
    ctx.save();
    const gradient = ctx.createRadialGradient(
      w * 0.5, h * 0.38, w * 0.10,
      w * 0.5, h * 0.5, w * 0.82
    );
    gradient.addColorStop(0, "rgba(0,0,0,0)");
    gradient.addColorStop(0.55, "rgba(0,0,0,0.20)");
    gradient.addColorStop(1, "rgba(0,0,0,0.72)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  function addObviousGhostDuplicate(ctx, original, w, h) {
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.filter = "blur(4px) grayscale(1) contrast(1.35) brightness(0.85)";
    ctx.drawImage(original, w * 0.035, h * 0.006, w, h);

    ctx.globalAlpha = 0.13;
    ctx.filter = "blur(11px) grayscale(1) contrast(1.5) brightness(0.75)";
    ctx.drawImage(original, -w * 0.025, h * 0.002, w, h);
    ctx.restore();
  }

  function addObviousShadowFigure(ctx, w, h) {
    ctx.save();

    // 手機自拍通常臉在中間，所以鬼影固定壓在右上/左上，保證看得到。
    const side = Math.random() > 0.5 ? 1 : -1;
    const cx = w * (side > 0 ? 0.74 : 0.26);
    const headY = h * 0.23;
    const shoulderY = h * 0.47;
    const bottomY = h * 0.92;

    ctx.globalAlpha = 0.58;
    ctx.filter = `blur(${Math.max(5, w * 0.008)}px)`;
    ctx.fillStyle = "rgba(0, 0, 0, 0.92)";

    // 頭：明顯的人形陰影。
    ctx.beginPath();
    ctx.ellipse(cx, headY, w * 0.095, h * 0.115, 0, 0, Math.PI * 2);
    ctx.fill();

    // 身體：像站在玩家背後。
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.18, shoulderY);
    ctx.quadraticCurveTo(cx, h * 0.32, cx + w * 0.18, shoulderY);
    ctx.quadraticCurveTo(cx + w * 0.15, h * 0.78, cx + w * 0.05, bottomY);
    ctx.quadraticCurveTo(cx, h * 0.98, cx - w * 0.05, bottomY);
    ctx.quadraticCurveTo(cx - w * 0.15, h * 0.78, cx - w * 0.18, shoulderY);
    ctx.closePath();
    ctx.fill();

    // 頭髮/破碎輪廓，讓它更像「祂」。
    ctx.globalAlpha = 0.42;
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.13, headY - h * 0.02);
    ctx.quadraticCurveTo(cx - w * 0.05, headY - h * 0.17, cx + w * 0.12, headY - h * 0.04);
    ctx.quadraticCurveTo(cx + w * 0.15, headY + h * 0.10, cx + w * 0.02, headY + h * 0.16);
    ctx.quadraticCurveTo(cx - w * 0.11, headY + h * 0.12, cx - w * 0.13, headY - h * 0.02);
    ctx.closePath();
    ctx.fill();

    // 眼睛：不要太大，但要一眼看得出來。
    ctx.globalAlpha = 0.95;
    ctx.filter = "blur(1.1px)";
    ctx.fillStyle = "rgba(255, 18, 48, 0.95)";
    const eyeY = headY - h * 0.004;
    const eyeDX = w * 0.027;
    const eyeR = Math.max(2.4, w * 0.0055);
    ctx.beginPath();
    ctx.arc(cx - eyeDX, eyeY, eyeR, 0, Math.PI * 2);
    ctx.arc(cx + eyeDX, eyeY, eyeR, 0, Math.PI * 2);
    ctx.fill();

    // 眼睛發光。
    ctx.globalAlpha = 0.55;
    ctx.filter = "blur(7px)";
    ctx.beginPath();
    ctx.arc(cx - eyeDX, eyeY, eyeR * 2.4, 0, Math.PI * 2);
    ctx.arc(cx + eyeDX, eyeY, eyeR * 2.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function addCreepingHand(ctx, w, h) {
    ctx.save();
    // 讓照片下緣多一隻不自然的手影。即使背景很亮也看得到。
    const baseX = w * (Math.random() > 0.5 ? 0.70 : 0.30);
    const baseY = h * 0.70;

    ctx.globalAlpha = 0.42;
    ctx.filter = "blur(5px)";
    ctx.fillStyle = "rgba(0, 0, 0, 0.92)";

    // 手掌
    ctx.beginPath();
    ctx.ellipse(baseX, baseY, w * 0.055, h * 0.035, -0.25, 0, Math.PI * 2);
    ctx.fill();

    // 手指
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.ellipse(
        baseX + i * w * 0.018,
        baseY - h * (0.055 + Math.random() * 0.035),
        w * 0.010,
        h * (0.052 + Math.random() * 0.028),
        i * 0.22,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    ctx.restore();
  }

  function addStrongStaticAndScanlines(ctx, w, h) {
    ctx.save();

    // 掃描線
    ctx.globalAlpha = 0.13;
    for (let y = 0; y < h; y += 4) {
      ctx.fillStyle = y % 8 === 0 ? "rgba(255, 255, 255, 0.12)" : "rgba(255, 0, 40, 0.08)";
      ctx.fillRect(0, y, w, 1);
    }

    // 噪點
    const dots = Math.floor((w * h) / 1450);
    ctx.globalAlpha = 0.19;
    for (let i = 0; i < dots; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const s = Math.random() * 2.2 + 0.5;
      ctx.fillStyle = Math.random() > 0.84 ? "rgba(255, 35, 60, 0.48)" : "rgba(255, 255, 255, 0.26)";
      ctx.fillRect(x, y, s, s);
    }

    // 水平故障條
    ctx.globalAlpha = 0.22;
    for (let i = 0; i < 7; i++) {
      const y = Math.random() * h;
      const barH = 2 + Math.random() * 8;
      const offset = (Math.random() * 36 - 18);
      ctx.fillStyle = Math.random() > 0.5 ? "rgba(255, 0, 45, 0.18)" : "rgba(255, 255, 255, 0.12)";
      ctx.fillRect(offset, y, w, barH);
    }

    ctx.restore();
  }


  function pickSelfieGhostType() {
    // 權重設計：眼睛/頭/半臉較常出現，完整人形較少；偶爾什麼都沒有。
    const pool = [
      "eyesOnly", "eyesOnly", "eyesOnly",
      "headOnly", "headOnly",
      "halfFace", "halfFace",
      "handBehind", "handBehind",
      "fullBody",
      "nothing"
    ];
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function getGhostStatusMessage(type) {
    const messages = {
      fullBody: "影像分析完成：你身後偵測到完整人形輪廓。請不要回頭確認。",
      headOnly: "影像分析完成：照片上方偵測到未知頭部輪廓。它比你更靠近鏡頭。",
      eyesOnly: "影像分析完成：偵測到一雙正在注視你的眼睛。不是你的。",
      halfFace: "影像分析完成：畫面邊緣出現半張臉。它好像剛探進來。",
      handBehind: "影像分析完成：你的肩膀後方多了一隻手。祂沒有碰你，只是快碰到了。",
      nothing: "影像分析完成：第二個輪廓在輸出前消失了。系統只留下它看過你的紀錄。"
    };
    return messages[type] || "影像分析完成：照片中偵測到異常。你拍到的，不只有你。";
  }

  function getGhostOverlayInfo(type) {
    const info = {
      fullBody: {
        count: "SUBJECT COUNT: 02",
        anomaly: "ANOMALY: STANDING BEHIND USER",
        bottom1: "YOU WERE NOT ALONE IN THIS FRAME",
        bottom2: "DO NOT RETAKE. IT MAY MOVE CLOSER."
      },
      headOnly: {
        count: "SUBJECT COUNT: 02",
        anomaly: "ANOMALY: HEAD ABOVE USER",
        bottom1: "A HEAD WAS FOUND WHERE NONE SHOULD BE",
        bottom2: "IT LOWERED ITSELF AFTER THE FLASH."
      },
      eyesOnly: {
        count: "SUBJECT COUNT: UNKNOWN",
        anomaly: "ANOMALY: EYES DETECTED",
        bottom1: "THE EYES OPENED AFTER CAPTURE",
        bottom2: "DO NOT ZOOM IN. THEY WILL NOTICE."
      },
      halfFace: {
        count: "SUBJECT COUNT: 02",
        anomaly: "ANOMALY: FACE AT EDGE",
        bottom1: "SOMETHING LOOKED INTO THE FRAME",
        bottom2: "IT WAS NOT THERE DURING PREVIEW."
      },
      handBehind: {
        count: "SUBJECT COUNT: 02",
        anomaly: "ANOMALY: HAND BEHIND USER",
        bottom1: "A HAND ENTERED FROM BEHIND YOU",
        bottom2: "IT STOPPED BEFORE TOUCHING."
      },
      nothing: {
        count: "SUBJECT COUNT: 01?",
        anomaly: "ANOMALY: CONTOUR LOST",
        bottom1: "THE SECOND SUBJECT DISAPPEARED",
        bottom2: "THE LOG SAYS IT WAS STILL WATCHING."
      }
    };
    return info[type] || info.fullBody;
  }

  function addRandomGhostEntity(ctx, w, h, type) {
    switch (type) {
      case "fullBody":
        addObviousShadowFigure(ctx, w, h);
        // 完整人形偶爾加手，避免每次都完全一樣。
        if (Math.random() > 0.42) addCreepingHand(ctx, w, h);
        break;
      case "headOnly":
        addGhostHeadOnly(ctx, w, h);
        break;
      case "eyesOnly":
        addGhostEyesOnly(ctx, w, h);
        break;
      case "halfFace":
        addGhostHalfFace(ctx, w, h);
        break;
      case "handBehind":
        addCreepingHand(ctx, w, h);
        addGhostBreathFog(ctx, w, h);
        break;
      case "nothing":
        addGhostNothing(ctx, w, h);
        break;
      default:
        addObviousShadowFigure(ctx, w, h);
    }
  }

  function randomGhostX(w) {
    // 避開正中央，讓它像在玩家後方或畫面邊緣。
    return Math.random() > 0.5 ? w * (0.68 + Math.random() * 0.18) : w * (0.14 + Math.random() * 0.18);
  }

  function addGhostHeadOnly(ctx, w, h) {
    ctx.save();
    const cx = randomGhostX(w);
    const cy = h * (0.18 + Math.random() * 0.19);

    ctx.globalAlpha = 0.64;
    ctx.filter = `blur(${Math.max(5, w * 0.008)}px)`;
    ctx.fillStyle = "rgba(0, 0, 0, 0.94)";

    ctx.beginPath();
    ctx.ellipse(cx, cy, w * 0.112, h * 0.128, Math.random() * 0.18 - 0.09, 0, Math.PI * 2);
    ctx.fill();

    // 不規則頭髮/臉部邊緣。
    ctx.globalAlpha = 0.48;
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.13, cy - h * 0.03);
    ctx.quadraticCurveTo(cx - w * 0.06, cy - h * 0.18, cx + w * 0.11, cy - h * 0.055);
    ctx.quadraticCurveTo(cx + w * 0.16, cy + h * 0.09, cx + w * 0.02, cy + h * 0.16);
    ctx.quadraticCurveTo(cx - w * 0.13, cy + h * 0.12, cx - w * 0.13, cy - h * 0.03);
    ctx.closePath();
    ctx.fill();

    addGhostRedEyes(ctx, cx, cy, w, h, 1.0);
    ctx.restore();
  }

  function addGhostEyesOnly(ctx, w, h) {
    ctx.save();
    const cx = randomGhostX(w);
    const cy = h * (0.22 + Math.random() * 0.33);

    // 眼睛周圍黑霧，讓它不是兩個紅點而已。
    ctx.globalAlpha = 0.46;
    ctx.filter = `blur(${Math.max(12, w * 0.022)}px)`;
    ctx.fillStyle = "rgba(0, 0, 0, 0.96)";
    ctx.beginPath();
    ctx.ellipse(cx, cy, w * 0.19, h * 0.105, 0, 0, Math.PI * 2);
    ctx.fill();

    addGhostRedEyes(ctx, cx, cy, w, h, 1.2);
    ctx.restore();
  }

  function addGhostHalfFace(ctx, w, h) {
    ctx.save();
    const fromRight = Math.random() > 0.5;
    const edgeX = fromRight ? w * 0.985 : w * 0.015;
    const cy = h * (0.26 + Math.random() * 0.24);

    ctx.globalAlpha = 0.62;
    ctx.filter = `blur(${Math.max(4, w * 0.007)}px)`;
    ctx.fillStyle = "rgba(0, 0, 0, 0.96)";

    ctx.beginPath();
    if (fromRight) {
      ctx.ellipse(edgeX, cy, w * 0.18, h * 0.24, -0.05, Math.PI * 0.5, Math.PI * 1.5);
    } else {
      ctx.ellipse(edgeX, cy, w * 0.18, h * 0.24, 0.05, -Math.PI * 0.5, Math.PI * 0.5);
    }
    ctx.fill();

    // 單眼。
    ctx.globalAlpha = 0.96;
    ctx.filter = "blur(1.2px)";
    ctx.fillStyle = "rgba(255, 18, 48, 0.96)";
    ctx.beginPath();
    ctx.arc(fromRight ? w * 0.91 : w * 0.09, cy - h * 0.026, Math.max(2.6, w * 0.0062), 0, Math.PI * 2);
    ctx.fill();

    // 嘴角裂縫。
    ctx.globalAlpha = 0.42;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.44)";
    ctx.lineWidth = Math.max(1, w * 0.002);
    ctx.beginPath();
    const mouthX = fromRight ? w * 0.93 : w * 0.07;
    ctx.moveTo(mouthX, cy + h * 0.055);
    ctx.quadraticCurveTo(mouthX + (fromRight ? -w * 0.045 : w * 0.045), cy + h * 0.075, mouthX + (fromRight ? -w * 0.075 : w * 0.075), cy + h * 0.052);
    ctx.stroke();

    ctx.restore();
  }

  function addGhostNothing(ctx, w, h) {
    ctx.save();

    // 沒有實體，但有一條像被擦掉的影像殘留。
    ctx.globalAlpha = 0.23;
    ctx.filter = "blur(9px)";
    ctx.fillStyle = "rgba(255, 0, 45, 0.28)";
    const y = h * (0.35 + Math.random() * 0.25);
    ctx.fillRect(-w * 0.05, y, w * 1.1, h * 0.035);

    ctx.globalAlpha = 0.18;
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.beginPath();
    ctx.ellipse(w * 0.5, h * 0.42, w * 0.18, h * 0.09, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function addGhostBreathFog(ctx, w, h) {
    ctx.save();
    const cx = w * (Math.random() > 0.5 ? 0.72 : 0.28);
    const cy = h * (0.28 + Math.random() * 0.18);

    ctx.globalAlpha = 0.20;
    ctx.filter = `blur(${Math.max(12, w * 0.024)}px)`;
    ctx.fillStyle = "rgba(210, 220, 230, 0.38)";
    ctx.beginPath();
    ctx.ellipse(cx, cy, w * 0.15, h * 0.045, -0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function addGhostRedEyes(ctx, cx, cy, w, h, power = 1) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, 0.92 * power);
    ctx.filter = "blur(1.15px)";
    ctx.fillStyle = "rgba(255, 18, 48, 0.96)";
    const eyeY = cy - h * 0.004;
    const eyeDX = w * 0.028;
    const eyeR = Math.max(2.5, w * 0.0058) * power;
    ctx.beginPath();
    ctx.arc(cx - eyeDX, eyeY, eyeR, 0, Math.PI * 2);
    ctx.arc(cx + eyeDX, eyeY, eyeR, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = Math.min(0.7, 0.42 * power);
    ctx.filter = "blur(8px)";
    ctx.beginPath();
    ctx.arc(cx - eyeDX, eyeY, eyeR * 2.8, 0, Math.PI * 2);
    ctx.arc(cx + eyeDX, eyeY, eyeR * 2.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function addHauntedResultOverlay(ctx, w, h) {
    ctx.save();
    const ghostInfo = getGhostOverlayInfo(lastSelfieGhostType);

    const topH = Math.max(92, h * 0.105);
    ctx.fillStyle = "rgba(0, 0, 0, 0.52)";
    ctx.fillRect(0, 0, w, topH);

    ctx.fillStyle = "rgba(255, 48, 76, 0.95)";
    ctx.font = `bold ${Math.max(16, w * 0.038)}px monospace`;
    ctx.fillText("WATCHER VERIFIED", 18, 32);

    ctx.fillStyle = "rgba(255, 255, 255, 0.88)";
    ctx.font = `${Math.max(11, w * 0.026)}px monospace`;
    ctx.fillText(ghostInfo.count, 18, 56);
    ctx.fillText(ghostInfo.anomaly, 18, 78);

    // 邊框與四角
    ctx.strokeStyle = "rgba(255, 48, 76, 0.95)";
    ctx.lineWidth = Math.max(2, w * 0.004);
    ctx.strokeRect(w * 0.045, h * 0.045, w * 0.91, h * 0.91);

    const pad = Math.max(16, w * 0.03);
    const len = Math.max(34, w * 0.08);
    drawHauntedCorner(ctx, pad, pad, len, "tl");
    drawHauntedCorner(ctx, w - pad, pad, len, "tr");
    drawHauntedCorner(ctx, pad, h - pad, len, "bl");
    drawHauntedCorner(ctx, w - pad, h - pad, len, "br");

    // 底部文字
    const bottomH = Math.max(86, h * 0.095);
    ctx.fillStyle = "rgba(0, 0, 0, 0.58)";
    ctx.fillRect(0, h - bottomH, w, bottomH);

    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.font = `bold ${Math.max(12, w * 0.028)}px monospace`;
    ctx.fillText(ghostInfo.bottom1, 18, h - 45);

    ctx.fillStyle = "rgba(255, 55, 80, 0.9)";
    ctx.font = `${Math.max(11, w * 0.025)}px monospace`;
    ctx.fillText(ghostInfo.bottom2, 18, h - 20);

    ctx.restore();
  }

  function drawHauntedCorner(ctx, x, y, len, type) {
    ctx.beginPath();
    if (type === "tl") {
      ctx.moveTo(x, y + len); ctx.lineTo(x, y); ctx.lineTo(x + len, y);
    } else if (type === "tr") {
      ctx.moveTo(x - len, y); ctx.lineTo(x, y); ctx.lineTo(x, y + len);
    } else if (type === "bl") {
      ctx.moveTo(x, y - len); ctx.lineTo(x, y); ctx.lineTo(x + len, y);
    } else {
      ctx.moveTo(x - len, y); ctx.lineTo(x, y); ctx.lineTo(x, y - len);
    }
    ctx.stroke();
  }

  function stopSelfieCamera() {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      cameraStream = null;
    }
    const video = $("#camera-preview");
    if (video) video.srcObject = null;
  }

  function escapeHTML(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function restart() {
    stopSelfieCamera();
    state.idx = 0;
    state.locked = false;
    state.codeName = "受試者";
    state.choices = [];
    state.inputPending = false;
    state.scores = { fear: 0, denial: 0, invite: 0, escape: 0, corruption: 0 };
    clearFxTimers();
    document.body.classList.remove("mirror-mode", "glitch-mode", "red-mode", "watch-mode", "filter-glitch", "countdown-final", "final-surprise");
    document.body.style.filter = "";
    renderQuestion();
  }

  function startExperience(muted) {
    state.muted = Boolean(muted);
    updateSoundToggle();
    app.dataset.phase = "quiz";
    coverPage.style.opacity = "0";
    coverPage.style.visibility = "hidden";
    quizBox.classList.add("show");
    $("#device-label").textContent = `DEVICE: ${device.label}`;
    startClock();
    initAudio();
    if (!state.muted) {
      setTimeout(() => playBeat(0.3), 90);
      setTimeout(() => playStatic(0.08, 0.05), 240);
    }
    updateSoundToggle();
    scheduleStaticPulses();
    scheduleFilterGlitch();
    renderQuestion();
    setLog(cameraPermissionState === "granted" ? "人格同步篩檢開始。前鏡頭權限已預備。" : "人格同步篩檢開始。請保持螢幕可見。");
  }

  function handleVisibility() {
    if (document.hidden) {
      stopSelfieCamera();
      document.title = "不要離開祂";
      clearInterval(titleTimer);
      titleTimer = setInterval(() => {
        document.title = document.title === "你剛剛去哪了？" ? "不要離開它" : "你剛剛去哪了？";
      }, 900);
      return;
    }

    clearInterval(titleTimer);
    document.title = originalTitle;
    if (state.idx > 0 && app.dataset.phase === "quiz") {
      state.scores.corruption += 1;
      updateProfile();
      showToast("你剛剛切走了。它跟著你一起回來了。", 3200);
      setLog("警告：畫面焦點中斷。第二操作者活動紀錄增加。");
      browserFilterGlitch(2, true);
      setTimeout(() => textChaos(2, true), 720);
      playWarningTone();
    }
  }

  window.addEventListener("resize", setVh);
  window.addEventListener("orientationchange", () => setTimeout(setVh, 260));
  document.addEventListener("visibilitychange", handleVisibility);
  ["pointerdown", "keydown", "touchmove"].forEach((eventName) => {
    document.addEventListener(eventName, resetIdleTimers, { passive: true });
  });

  ["pointerdown", "touchstart", "touchend", "click", "keydown"].forEach((eventName) => {
    document.addEventListener(eventName, () => {
      if (!state.muted && audioCtx) {
        resumeAudio();
        if (!audioUnlocked) unlockAudioPulse();
      }
    }, { passive: true, capture: true });
  });

  const startButton = $("#start-btn");
  const silentButton = $("#silent-btn");
  const soundButton = $("#sound-toggle");

  ["pointerdown", "touchstart", "touchend"].forEach((eventName) => {
    startButton.addEventListener(eventName, () => {
      state.muted = false;
      initAudio();
      unlockAudioPulse();
    }, { passive: true });
    soundButton.addEventListener(eventName, () => {
      if (state.muted) return;
      initAudio();
      unlockAudioPulse();
    }, { passive: true });
  });

  soundButton.addEventListener("click", () => livingButton(soundButton, toggleSound, { delay: 240, allowLocked: true }));
  startButton.addEventListener("click", () => livingButton(startButton, () => startExperience(false), {
    delay: 500,
    preAction: () => { state.muted = false; initAudio(); unlockAudioPulse(); prepareCameraAtStart(); }
  }));
  silentButton.addEventListener("click", () => livingButton(silentButton, () => startExperience(true), { delay: 500 }));

  setVh();
  $("#device-label").textContent = `DEVICE: ${device.label}`;
  updateSoundToggle();
})();
