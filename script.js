let voiceRecorder;
let musicChunks = [];
let voiceChunks = [];
let instrumentalAudio = null;

const quotes = [
  "O futuro nasce na voz de quem canta.",
  "Nenhuma cultura morre enquanto houver quem a grave.",
  "Tu és a memória que caminha.",
  "Angola canta, Angola grava.",
  "O microfone é a nova chavala de guerra.",
  "Não depende só de mim… mas de nós."
];

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("inspirationQuote").textContent = 
    quotes[Math.floor(Math.random() * quotes.length)];

  const recordVoiceBtn = document.getElementById("recordVoiceBtn");
  const stopVoiceBtn = document.getElementById("stopVoiceBtn");
  const recordMusicBtn = document.getElementById("recordMusicBtn");
  const stopMusicBtn = document.getElementById("stopMusicBtn");
  const instrumentalFile = document.getElementById("instrumentalFile");
  const storyList = document.getElementById("storyList");
  const lyricsBox = document.getElementById("lyricsBox");
  const saveLyricsBtn = document.getElementById("saveLyricsBtn");

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("service-worker.js");
  }

  // === GRAVAR VOZ ===
  recordVoiceBtn.addEventListener("click", async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      voiceRecorder = new MediaRecorder(stream);
      voiceChunks = [];

      voiceRecorder.ondataavailable = e => voiceChunks.push(e.data);
      voiceRecorder.onstop = () => saveAudio(voiceChunks, "voz");

      voiceRecorder.start();
      recordVoiceBtn.style.display = "none";
      stopVoiceBtn.style.display = "inline-block";
    } catch (err) {
      alert("Erro ao acessar o microfone: " + err.message);
    }
  });

  stopVoiceBtn.addEventListener("click", () => {
    voiceRecorder.stop();
    recordVoiceBtn.style.display = "inline-block";
    stopVoiceBtn.style.display = "none";
  });

  // === GRAVAÇÃO DE MÚSICA COM INSTRUMENTAL ===
  recordMusicBtn.addEventListener("click", async () => {
    if (!instrumentalFile.files.length) {
      alert("Por favor, escolha um instrumental primeiro.");
      return;
    }

    const instrumentalBlob = instrumentalFile.files[0];
    const instrumentalUrl = URL.createObjectURL(instrumentalBlob);

    instrumentalAudio = new Audio(instrumentalUrl);
    instrumentalAudio.loop = false;
    instrumentalAudio.play();

    instrumentalAudio.onplay = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        voiceRecorder = new MediaRecorder(stream);
        musicChunks = [];

        voiceRecorder.ondataavailable = e => musicChunks.push(e.data);
        voiceRecorder.onstop = () => saveAudio(musicChunks, "musica", instrumentalUrl);

        voiceRecorder.start();
        recordMusicBtn.style.display = "none";
        stopMusicBtn.style.display = "inline-block";
      } catch (err) {
        alert("Erro ao acessar o microfone: " + err.message);
      }
    };
  });

  stopMusicBtn.addEventListener("click", () => {
    voiceRecorder.stop();
    if (instrumentalAudio) {
      instrumentalAudio.pause();
      instrumentalAudio.currentTime = 0;
    }
    recordMusicBtn.style.display = "inline-block";
    stopMusicBtn.style.display = "none";
  });

  // === BLOCO DE NOTAS ===
  saveLyricsBtn.addEventListener("click", () => {
    const lyrics = lyricsBox.value.trim();
    if (!lyrics) {
      alert("Escreva algo primeiro.");
      return;
    }

    let stories = JSON.parse(localStorage.getItem("stories") || "[]");
    stories.push({
      id: Date.now(),
      type: "letra",
      lyrics: lyrics,
      timestamp: new Date().toLocaleString("pt-ao"),
      name: "Letra guardada",
    });
    localStorage.setItem("stories", JSON.stringify(stories));
    lyricsBox.value = "";
    renderStories();
  });

  renderStories();
});

function saveAudio(chunks, type, instrumentalUrl = null) {
  const audioBlob = new Blob(chunks, { type: "audio/wav" });
  const audioUrl = URL.createObjectURL(audioBlob);

  let stories = JSON.parse(localStorage.getItem("stories") || "[]");
  const now = new Date().toLocaleString("pt-ao");

  stories.push({
    id: Date.now(),
    type: type,
    audioUrl: audioUrl,
    instrumentalUrl: instrumentalUrl,
    timestamp: now,
    name: type === "voz" ? "Voz gravada" : "Voz + Instrumental",
    favorite: false,
  });

  localStorage.setItem("stories", JSON.stringify(stories));
  renderStories();
}

function renderStories() {
  const storyList = document.getElementById("storyList");
  let stories = JSON.parse(localStorage.getItem("stories") || "[]");
  storyList.innerHTML = "";

  if (stories.length === 0) {
    storyList.innerHTML = "<li style='text-align:center; color:#777;'>Nenhuma gravação ou letra ainda. Comece agora!</li>";
    return;
  }

  stories.forEach(story => {
    const li = document.createElement("li");
    let content = "";

    if (story.type === "letra") {
      content = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <strong>${story.name}</strong>
          <span style="font-size:0.8rem; color:#aaa;">📝 Letra</span>
        </div>
        <pre style="white-space:pre-wrap; background:#3333; padding:10px; border-radius:6px; margin:10px 0;">${story.lyrics}</pre>
        <p style="font-size:0.8rem; color:#888;">Guardado em: ${story.timestamp}</p>
        <button onclick="deleteItem(${story.id})">🗑️ Apagar</button>
        <button onclick="exportAsZip(${story.id})">📦 Exportar ZIP</button>
        <button onclick="shareItem(${story.id})">📤 Compartilhar</button>
      `;
    } else {
      const typeLabel = story.type === "voz" ? "🎤 Voz" : "🎶 Voz + Instrumental";
      content = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <strong>${story.name}</strong>
          <span style="font-size:0.8rem; color:#aaa;">${typeLabel}</span>
        </div>
        <p style="font-size:0.8rem; color:#888;">Gravado em: ${story.timestamp}</p>

        <div style="margin:10px 0;">
          <p>Voz gravada:</p>
          <audio controls style="width:100%;" src="${story.audioUrl}"></audio>
        </div>

        ${story.instrumentalUrl ? `
          <div style="margin:10px 0;">
            <p>Instrumental original:</p>
            <audio controls style="width:100%;" src="${story.instrumentalUrl}"></audio>
          </div>
        ` : ""}

        <button onclick="deleteItem(${story.id})">🗑️ Apagar</button>
        <button onclick="downloadAudio('${story.audioUrl}', 'voz_${story.id}.wav')">⬇️ Baixar Voz</button>
        ${story.instrumentalUrl ? `<button onclick="downloadAudio('${story.instrumentalUrl}', 'instrumental_${story.id}.mp3')">⬇️ Baixar Instrumental</button>` : ""}
        <button onclick="exportAsZip(${story.id})">📦 Exportar ZIP</button>
        <button onclick="shareItem(${story.id})">📤 Compartilhar</button>
      `;
    }

    li.innerHTML = content;
    storyList.appendChild(li);
  });
}

function deleteItem(id) {
  let stories = JSON.parse(localStorage.getItem("stories") || "[]");
  stories = stories.filter(story => story.id !== id);
  localStorage.setItem("stories", JSON.stringify(stories));
  renderStories();
}

function downloadAudio(url, filename) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
}

async function exportAsZip(id) {
  const stories = JSON.parse(localStorage.getItem("stories") || "[]");
  const story = stories.find(s => s.id === id);
  if (!story) return;

  const zip = new JSZip();

  if (story.type === "letra") {
    zip.file("letra.txt", story.lyrics);
  } else {
    const voiceBlob = await fetch(story.audioUrl).then(r => r.blob());
    zip.file("voz.wav", voiceBlob);
    if (story.instrumentalUrl) {
      const instBlob = await fetch(story.instrumentalUrl).then(r => r.blob());
      zip.file("instrumental.mp3", instBlob);
    }
  }

  const content = await zip.generateAsync({ type: "blob" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(content);
  link.download = `kizomba_${id}.zip`;
  link.click();
}

function shareItem(id) {
  const stories = JSON.parse(localStorage.getItem("stories") || "[]");
  const story = stories.find(s => s.id === id);
  if (!story) return;

  const text = story.type === "letra" 
    ? `Letra: ${story.lyrics.substring(0, 100)}...`
    : `Gravação de Kizomba Archive por Manuel Luciano`;

  if (navigator.share) {
    navigator.share({
      title: "Kizomba Archive",
      text: text,
      url: window.location.href
    }).catch(console.error);
  } else {
    alert("Compartilhamento nativo não suportado. Copie o link: " + window.location.href);
  }
}