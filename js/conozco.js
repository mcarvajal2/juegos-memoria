// "Ya lo conozco": actividad de memoria implícita (priming) para niños.
(function () {
  "use strict";

  const ANIMALS = [
    { e: "🐶", n: "Perro" }, { e: "🐱", n: "Gato" }, { e: "🐰", n: "Conejo" },
    { e: "🦊", n: "Zorro" }, { e: "🐻", n: "Oso" }, { e: "🐼", n: "Panda" },
    { e: "🐨", n: "Koala" }, { e: "🐯", n: "Tigre" }, { e: "🦁", n: "León" },
    { e: "🐮", n: "Vaca" }, { e: "🐷", n: "Cerdo" }, { e: "🐸", n: "Rana" },
    { e: "🐵", n: "Mono" }, { e: "🐔", n: "Gallina" }, { e: "🐧", n: "Pingüino" },
    { e: "🦉", n: "Búho" }, { e: "🐢", n: "Tortuga" }, { e: "🐙", n: "Pulpo" },
    { e: "🦋", n: "Mariposa" }, { e: "🐘", n: "Elefante" }, { e: "🦒", n: "Jirafa" },
    { e: "🦓", n: "Cebra" }, { e: "🐴", n: "Caballo" }, { e: "🐑", n: "Oveja" },
    { e: "🐬", n: "Delfín" }, { e: "🐳", n: "Ballena" }, { e: "🦀", n: "Cangrejo" },
    { e: "🐌", n: "Caracol" }, { e: "🐝", n: "Abeja" }, { e: "🦆", n: "Pato" },
    { e: "🐊", n: "Cocodrilo" }, { e: "🦩", n: "Flamenco" },
  ];

  const TILE_COUNT = 16;
  const TILE_INTERVAL_MS = 700;
  const INITIAL_TILES_OFF = 2;

  const $ = (id) => document.getElementById(id);
  const screens = ["welcome", "study", "ready", "test", "results"];

  let voiceOn = true;
  let state = null;

  function shuffle(list) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function show(name) {
    screens.forEach((s) => $("screen-" + s).classList.toggle("hidden", s !== name));
    const phase = { welcome: null, study: "inicio", ready: "inicio", test: "desarrollo", results: "cierre" }[name];
    const order = ["inicio", "desarrollo", "cierre"];
    document.querySelectorAll(".phases li").forEach((li) => {
      const idx = order.indexOf(li.dataset.phase);
      const cur = order.indexOf(phase);
      li.classList.toggle("active", idx === cur);
      li.classList.toggle("done", cur > -1 && idx < cur);
      if (idx === cur) li.setAttribute("aria-current", "step");
      else li.removeAttribute("aria-current");
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function speak(text) {
    if (!voiceOn || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "es-CL";
    const voices = window.speechSynthesis.getVoices();
    const v = voices.find((x) => x.lang === "es-CL") || voices.find((x) => x.lang && x.lang.startsWith("es"));
    if (v) u.voice = v;
    u.rate = 0.9;
    window.speechSynthesis.speak(u);
  }

  function setAnimal(el, animal, silhouette) {
    el.textContent = animal.e;
    el.classList.toggle("silhouette", !!silhouette);
    el.setAttribute("aria-label", silhouette ? "Animal escondido" : animal.n);
  }

  function restartAnim(el, cls) {
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
  }

  // ---------- Inicio: mirar animales ----------
  function start() {
    const count = parseInt($("optCount").value, 10);
    const seconds = parseInt($("optTime").value, 10);
    const mode = $("optMode").value;

    const pool = shuffle(ANIMALS);
    const seen = pool.slice(0, count);
    const fresh = pool.slice(count, count * 2);

    const trials = shuffle(
      seen.map((a) => ({ animal: a, seen: true })).concat(fresh.map((a) => ({ animal: a, seen: false })))
    );
    // Alternar formas de esconder de manera balanceada entre vistos y nuevos
    let sCount = 0, nCount = 0;
    trials.forEach((t) => {
      if (mode === "mix") {
        const k = t.seen ? sCount++ : nCount++;
        t.form = k % 2 === 0 ? "silhouette" : "covered";
      } else {
        t.form = mode;
      }
    });

    state = { seen, trials, seconds, studyIndex: 0, testIndex: 0, results: [], timer: null, tileTimer: null };
    show("study");
    studyStep();
  }

  function studyStep() {
    const i = state.studyIndex;
    const total = state.seen.length;
    if (i >= total) {
      show("ready");
      speak("¡Muy bien! Ahora los animales se van a esconder.");
      return;
    }
    const a = state.seen[i];
    $("studyCounter").textContent = `Animal ${i + 1} de ${total}`;
    $("studyProgress").style.width = `${((i + 1) / total) * 100}%`;
    const el = $("studyAnimal");
    setAnimal(el, a, false);
    restartAnim(el, "pop");
    $("studyName").textContent = a.n;
    speak(a.n);
    state.studyIndex++;
    state.timer = setTimeout(studyStep, state.seconds * 1000);
  }

  // ---------- Desarrollo: adivinar ----------
  function buildTiles() {
    const box = $("tiles");
    box.innerHTML = "";
    for (let i = 0; i < TILE_COUNT; i++) {
      const t = document.createElement("div");
      t.className = "tile";
      box.appendChild(t);
    }
  }

  function tilesOff() {
    return $("tiles").querySelectorAll(".tile.off").length;
  }

  function removeTile() {
    const on = Array.from($("tiles").querySelectorAll(".tile:not(.off)"));
    if (!on.length) {
      clearInterval(state.tileTimer);
      return;
    }
    on[Math.floor(Math.random() * on.length)].classList.add("off");
  }

  function testStep() {
    const i = state.testIndex;
    const total = state.trials.length;
    if (i >= total) {
      finish();
      return;
    }
    const t = state.trials[i];
    $("testCounter").textContent = `Animal escondido ${i + 1} de ${total}`;
    $("testProgress").style.width = `${(i / total) * 100}%`;
    setAnimal($("testAnimal"), t.animal, t.form === "silhouette");
    $("testHint").textContent = t.form === "silhouette" ? "¿De quién es esta sombra?" : "¿Qué animal está escondido?";
    $("feedback").textContent = "";
    $("feedback").className = "feedback";
    $("options").classList.add("hidden");
    $("options").innerHTML = "";
    $("knowRow").classList.remove("hidden");
    $("btnNext").classList.add("hidden");

    buildTiles();
    for (let k = 0; k < INITIAL_TILES_OFF; k++) removeTile();
    state.trialStart = performance.now();
    clearInterval(state.tileTimer);
    state.tileTimer = setInterval(removeTile, TILE_INTERVAL_MS);
    $("btnKnow").focus({ preventScroll: true });
  }

  function onKnow() {
    clearInterval(state.tileTimer);
    const t = state.trials[state.testIndex];
    t.time = (performance.now() - state.trialStart) / 1000;
    t.revealed = tilesOff() / TILE_COUNT;
    $("knowRow").classList.add("hidden");
    $("testHint").textContent = "¿Cuál es? Tócalo";

    const distractors = shuffle(ANIMALS.filter((a) => a.e !== t.animal.e)).slice(0, 3);
    const opts = shuffle([t.animal].concat(distractors));
    const box = $("options");
    opts.forEach((a) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "option pop";
      b.innerHTML = `<span class="e" aria-hidden="true">${a.e}</span><span class="n">${a.n}</span>`;
      b.addEventListener("click", () => choose(a, b));
      box.appendChild(b);
    });
    box.classList.remove("hidden");
  }

  function choose(animal, button) {
    const t = state.trials[state.testIndex];
    const ok = animal.e === t.animal.e;
    t.answer = animal;
    t.correct = ok;

    document.querySelectorAll("#options .option").forEach((b) => {
      b.disabled = true;
      if (b.querySelector(".e").textContent === t.animal.e) b.classList.add("right");
    });
    if (!ok) button.classList.add("wrong");

    // Mostrar el animal completo
    document.querySelectorAll("#tiles .tile").forEach((x) => x.classList.add("off"));
    const el = $("testAnimal");
    el.classList.remove("silhouette");
    restartAnim(el, "wiggle");

    const fb = $("feedback");
    if (ok) {
      fb.textContent = ["¡Muy bien! 🎉", "¡Excelente! ⭐", "¡Lo adivinaste! 👏", "¡Súper! 🌟"][Math.floor(Math.random() * 4)];
      fb.className = "feedback ok";
      speak(`¡Muy bien! Es ${articulo(t.animal.n)} ${t.animal.n}`);
    } else {
      fb.textContent = `Era ${articulo(t.animal.n)} ${t.animal.n}. ¡Buen intento! 💪`;
      fb.className = "feedback bad";
      speak(`Era ${articulo(t.animal.n)} ${t.animal.n}. ¡Buen intento!`);
    }
    state.results.push(t);
    $("btnNext").classList.remove("hidden");
    $("btnNext").focus({ preventScroll: true });
  }

  function articulo(name) {
    const fem = ["Vaca", "Rana", "Gallina", "Tortuga", "Mariposa", "Jirafa", "Cebra", "Oveja", "Ballena", "Abeja"];
    return fem.includes(name) ? "una" : "un";
  }

  // ---------- Cierre: resultados ----------
  function avg(list, key) {
    if (!list.length) return 0;
    return list.reduce((s, x) => s + x[key], 0) / list.length;
  }

  function finish() {
    clearInterval(state.tileTimer);
    $("testProgress").style.width = "100%";
    const r = state.results;
    const seen = r.filter((x) => x.seen);
    const fresh = r.filter((x) => !x.seen);
    const correct = r.filter((x) => x.correct).length;

    const stars = Math.max(1, Math.round((correct / r.length) * 5));
    $("stars").textContent = "⭐".repeat(stars);
    $("resultTitle").textContent = correct / r.length >= 0.7 ? "¡Eres un gran detective de animales!" : "¡Muy buen trabajo!";
    $("resultText").textContent = `Reconociste ${correct} de ${r.length} animales escondidos.`;

    const tSeen = avg(seen, "time");
    const tNew = avg(fresh, "time");
    const okSeen = seen.filter((x) => x.correct).length;
    const okNew = fresh.filter((x) => x.correct).length;
    const pSeen = Math.round(avg(seen, "revealed") * 100);
    const pNew = Math.round(avg(fresh, "revealed") * 100);

    $("sumSeen").textContent = `${okSeen} de ${seen.length} correctos · ${tSeen.toFixed(1)} s promedio`;
    $("sumNew").textContent = `${okNew} de ${fresh.length} correctos · ${tNew.toFixed(1)} s promedio`;

    // Barra: más rápido = más larga (relativo al más lento)
    const maxT = Math.max(tSeen, tNew, 0.1);
    requestAnimationFrame(() => {
      $("barSeen").style.width = `${Math.max(12, (1 - tSeen / (maxT * 1.25)) * 100)}%`;
      $("barNew").style.width = `${Math.max(12, (1 - tNew / (maxT * 1.25)) * 100)}%`;
    });

    let conclusion;
    const diff = tNew - tSeen;
    if (diff > 0.3) {
      conclusion = `Los animales ya vistos se reconocieron en promedio ${diff.toFixed(1)} s más rápido y con ${pSeen}% descubierto (vs. ${pNew}% en los nuevos). Esto es coherente con un efecto de priming.`;
    } else if (diff < -0.3) {
      conclusion = `En esta ronda los animales nuevos se reconocieron más rápido (${(-diff).toFixed(1)} s de diferencia). Puede influir la atención, la familiaridad previa con ciertos animales o el azar; conviene repetir con otra ronda.`;
    } else {
      conclusion = `No hubo gran diferencia de tiempo entre animales vistos (${tSeen.toFixed(1)} s) y nuevos (${tNew.toFixed(1)} s). Descubierto promedio: ${pSeen}% vs. ${pNew}%.`;
    }
    $("guideSummary").textContent = conclusion;

    const body = $("resultsBody");
    body.innerHTML = "";
    r.forEach((x) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${x.animal.e} ${x.animal.n}</td>
        <td>${x.seen ? "Sí" : "No"}</td>
        <td>${x.form === "silhouette" ? "Silueta" : "Tapado"}</td>
        <td>${x.time.toFixed(1)} s</td>
        <td>${Math.round(x.revealed * 100)}%</td>
        <td>${x.correct ? "✓" : "✗ (" + x.answer.n + ")"}</td>`;
      body.appendChild(tr);
    });

    show("results");
    speak(`¡Terminaste! Reconociste ${correct} de ${r.length} animales.`);
  }

  // ---------- Eventos ----------
  $("btnStart").addEventListener("click", start);
  $("btnGo").addEventListener("click", () => {
    show("test");
    testStep();
  });
  $("btnKnow").addEventListener("click", onKnow);
  $("btnNext").addEventListener("click", () => {
    if ($("btnNext").classList.contains("hidden")) return;
    state.testIndex++;
    testStep();
  });
  $("btnAgain").addEventListener("click", () => {
    if (state) {
      clearTimeout(state.timer);
      clearInterval(state.tileTimer);
    }
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    show("welcome");
  });

  const soundBtn = $("soundToggle");
  if (!("speechSynthesis" in window)) {
    soundBtn.classList.add("hidden");
    voiceOn = false;
  } else {
    window.speechSynthesis.getVoices();
  }
  soundBtn.addEventListener("click", () => {
    voiceOn = !voiceOn;
    soundBtn.setAttribute("aria-pressed", String(voiceOn));
    soundBtn.textContent = voiceOn ? "🔊 Voz" : "🔇 Voz";
    if (!voiceOn) window.speechSynthesis.cancel();
  });

  show("welcome");
})();
