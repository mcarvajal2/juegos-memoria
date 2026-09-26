(() => {
  'use strict';

  const stories = [
    {
      title: 'El paseo a la feria', icon: '🥕', place: 'la feria del barrio',
      people: [{ name: 'Elena', emoji: '👩‍🦳' }, { name: 'su nieto Tomás', emoji: '🧒' }],
      scenes: [
        { emoji: '👩‍🦳🧒🧺', bg: '#f5e8cc', text: 'Elena y su nieto Tomás prepararon una bolsa de género para ir a la feria del barrio.' },
        { emoji: '🍎🥕🍅', bg: '#e4f2dc', text: 'En un puesto eligieron manzanas, zanahorias y tomates bien maduros.' },
        { emoji: '🤝🥬', bg: '#f8eadc', text: 'La feriante saludó a Elena por su nombre y le regaló un ramito de cilantro.' },
        { emoji: '🏠🍲👵', bg: '#e9e8f5', text: 'De vuelta en casa, Elena y Tomás prepararon juntos una rica cazuela.' }
      ]
    },
    {
      title: 'Un día en la playa', icon: '🏖️', place: 'la playa de la costa',
      people: [{ name: 'Rosa', emoji: '👩' }, { name: 'su hermana Marta', emoji: '👩‍🦱' }],
      scenes: [
        { emoji: '👩👩🧺🧢', bg: '#e7f3ef', text: 'Rosa y su hermana Marta prepararon un bolso con sombreros y una colación.' },
        { emoji: '🏖️🌊☀️', bg: '#dff3fa', text: 'Al llegar a la playa, encontraron un lugar tranquilo cerca del agua.' },
        { emoji: '🪨🐚🔎', bg: '#f5ead5', text: 'Caminaron por la orilla y recogieron conchas de distintos colores.' },
        { emoji: '🧉🥪😄', bg: '#f9e9d8', text: 'Antes de volver, compartieron un sándwich y un mate mirando el mar.' }
      ]
    },
    {
      title: 'La once de cumpleaños', icon: '🎂', place: 'la casa de la tía Inés',
      people: [{ name: 'la tía Inés', emoji: '👩‍🦳' }, { name: 'su amiga Julia', emoji: '👩' }],
      scenes: [
        { emoji: '🎈👩‍🦳🍰', bg: '#fae5e6', text: 'La tía Inés ordenó la mesa para celebrar su cumpleaños con una once.' },
        { emoji: '👩💐🚪', bg: '#e8effa', text: 'Su amiga Julia llegó con un ramo de flores y un abrazo cariñoso.' },
        { emoji: '☕🍞🧀', bg: '#f6eedb', text: 'Juntas sirvieron té, pan amasado y queso para compartir.' },
        { emoji: '🕯️🎂🎶', bg: '#f5e6d8', text: 'Al final cantaron cumpleaños y la tía Inés apagó las velas de su torta.' }
      ]
    }
  ];

  const $ = (selector) => document.querySelector(selector);
  const shuffle = (items) => {
    const shuffled = items.slice();
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };
  const screens = [...document.querySelectorAll('.screen')];
  const phaseEls = [...document.querySelectorAll('[data-phase]')];
  let story = null;
  let sceneIndex = 0;
  let questionIndex = 0;
  let activeQuestions = [];
  let orderItems = [];
  let chosen = new Set();
  let answers = [];
  let startedAt = 0;
  let timer = null;

  const questionsFor = (item) => [
    { title: '¿Quiénes participaron?', hint: 'Elige las dos personas de la historia.', multiple: true,
      options: [...item.people.map((p) => ({ label: p.name, emoji: p.emoji, correct: true })), { label: 'Don Luis', emoji: '👨‍🦳' }, { label: 'Una vecina', emoji: '👩‍🦰' }, { label: 'El cartero', emoji: '📮' }] },
    { title: '¿Dónde ocurrió?', hint: 'Elige el lugar donde pasó la historia.', options: [{ label: `En ${item.place}`, emoji: '📍', correct: true }, { label: 'En la biblioteca', emoji: '📚' }, { label: 'En el consultorio', emoji: '🏥' }, { label: 'En una plaza lejana', emoji: '🌳' }] },
    { title: '¿Qué pasó primero?', hint: 'Recuerda el comienzo de la historia.', options: [{ label: item.scenes[0].text.replace(/[.!]$/, ''), emoji: item.scenes[0].emoji, correct: true }, ...item.scenes.slice(1).map((s) => ({ label: s.text.replace(/[.!]$/, ''), emoji: s.emoji }))] },
    { title: '¿Qué pasó al final?', hint: 'Recuerda la última escena.', options: [{ label: item.scenes[3].text.replace(/[.!]$/, ''), emoji: item.scenes[3].emoji, correct: true }, ...item.scenes.slice(0, 3).map((s) => ({ label: s.text.replace(/[.!]$/, ''), emoji: s.emoji }))] }
  ];

  function showScreen(id, phase) {
    screens.forEach((screen) => screen.classList.toggle('hidden', screen.id !== id));
    phaseEls.forEach((el) => {
      const active = el.dataset.phase === phase;
      el.classList.toggle('active', active);
      el.classList.toggle('done', phaseEls.indexOf(el) < phaseEls.findIndex((x) => x.dataset.phase === phase));
      if (active) el.setAttribute('aria-current', 'step'); else el.removeAttribute('aria-current');
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function sceneMarkup(scene, index, numbered = true) {
    return `<div class="scene-card" style="--scene-bg:${scene.bg}" aria-label="${numbered ? `Escena ${index + 1}` : 'Viñeta'}"><span class="scene-emoji" aria-hidden="true">${scene.emoji}</span>${numbered ? `<span class="scene-number" aria-hidden="true">${index + 1}</span>` : ''}</div>`;
  }

  function renderChoices() {
    $('#story-choices').innerHTML = stories.map((item, index) => `<button class="story-choice" type="button" data-story="${index}"><span class="choice-emoji" aria-hidden="true">${item.icon}</span><span>${item.title}</span></button>`).join('');
    $('#story-choices').addEventListener('click', (event) => {
      const button = event.target.closest('[data-story]');
      if (!button) return;
      story = stories[Number(button.dataset.story)];
      $('#look-title').textContent = story.title;
      $('#look-grid').innerHTML = story.scenes.map((scene, i) => sceneMarkup(scene, i)).join('');
      showScreen('screen-look', 'inicio');
    });
  }

  function beginStory() {
    sceneIndex = 0;
    startedAt = Date.now();
    $('#story-title').textContent = story.title;
    $('#story-grid').innerHTML = story.scenes.map((scene, i) => sceneMarkup(scene, i)).join('');
    renderScene();
    showScreen('screen-story', 'desarrollo');
  }

  function renderScene() {
    const cards = [...$('#story-grid').children];
    cards.forEach((card, index) => {
      card.classList.toggle('current', index === sceneIndex);
      card.classList.toggle('dimmed', index !== sceneIndex);
    });
    $('#scene-count').textContent = `Escena ${sceneIndex + 1} de ${story.scenes.length}`;
    $('#narration-text').textContent = story.scenes[sceneIndex].text;
    $('#next-scene').textContent = sceneIndex === story.scenes.length - 1 ? 'Guardar las imágenes' : 'Siguiente';
    $('#announcer').textContent = `Escena ${sceneIndex + 1}: ${story.scenes[sceneIndex].text}`;
  }

  function saveScenes() {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    $('#save-grid').innerHTML = story.scenes.map((scene, i) => sceneMarkup(scene, i)).join('');
    $('#save-grid').classList.remove('saving');
    $('#save-message').textContent = '';
    $('#begin-questions').classList.add('hidden');
    showScreen('screen-save', 'desarrollo');
    window.setTimeout(() => $('#save-grid').classList.add('saving'), 400);
    window.setTimeout(() => {
      $('#save-grid').classList.add('hidden');
      $('.envelope').classList.add('visible');
      $('#save-message').textContent = 'Las imágenes quedaron guardadas. ¡Muy bien!';
      $('#begin-questions').classList.remove('hidden');
    }, 1250);
  }

  function renderQuestion() {
    const question = activeQuestions[questionIndex];
    chosen = new Set();
    $('#question-title').textContent = question.title;
    $('#question-hint').textContent = question.hint;
    $('#question-progress').style.width = `${((questionIndex + 1) / 4) * 100}%`;
    $('.progress').setAttribute('aria-valuenow', String(questionIndex + 1));
    $('#answer-feedback').textContent = '';
    $('#answer-feedback').className = 'feedback';
    $('#confirm-answer').classList.remove('hidden');
    $('#next-question').classList.add('hidden');
    $('#confirm-answer').disabled = false;
    $('#answer-options').innerHTML = question.options.map((option, index) => `<button type="button" class="answer-option" data-option="${index}" aria-pressed="false"><span class="option-emoji" aria-hidden="true">${option.emoji}</span>${option.label}</button>`).join('');
  }

  function confirmAnswer() {
    if (!chosen.size) { $('#answer-feedback').textContent = 'Elige una respuesta cuando quieras.'; $('#answer-feedback').className = 'feedback'; return; }
    const question = activeQuestions[questionIndex];
    const correctIndexes = question.options.map((option, index) => option.correct ? index : -1).filter((index) => index >= 0);
    const selected = [...chosen];
    const correct = selected.length === correctIndexes.length && correctIndexes.every((index) => chosen.has(index));
    const given = selected.map((index) => question.options[index].label).join(' y ');
    const expected = correctIndexes.map((index) => question.options[index].label).join(' y ');
    answers.push({ question: question.title, given, expected, correct });
    $('#answer-feedback').textContent = correct ? '¡Sí, muy bien! ✨' : `Gracias por intentarlo. La respuesta era: ${expected}.`;
    $('#answer-feedback').className = `feedback ${correct ? 'ok' : 'bad'}`;
    $('#answer-options').querySelectorAll('button').forEach((button) => {
      const index = Number(button.dataset.option);
      button.disabled = true;
      if (question.options[index].correct) button.classList.add('right');
      else if (chosen.has(index)) button.classList.add('wrong');
    });
    $('#confirm-answer').classList.add('hidden');
    $('#next-question').textContent = questionIndex === 3 ? 'Continuar' : 'Siguiente pregunta';
    $('#next-question').classList.remove('hidden');
  }

  function finish() {
    if (timer) window.clearInterval(timer);
    const seconds = Math.max(0, Math.round((Date.now() - startedAt) / 1000));
    const minutes = Math.floor(seconds / 60);
    const rest = seconds % 60;
    $('#results-summary').textContent = `Terminaste “${story.title}”. Recordaste ${answers.filter((answer) => answer.question !== 'Ordena la historia' && answer.correct).length} de 4 respuestas. Cada recuerdo y conversación tiene valor.`;
    $('#total-time').textContent = `Tiempo total: ${minutes ? `${minutes} min ` : ''}${rest} s.`;
    $('#results-rows').innerHTML = answers.map((answer) => `<tr><td>${answer.question}</td><td>${answer.given}</td><td>${answer.expected}</td><td>${answer.status || (answer.correct ? '✓' : '✗')}</td></tr>`).join('');
    showScreen('screen-results', 'cierre');
  }

  function renderOrder() {
    $('#order-list').innerHTML = orderItems.map((sceneIndex, position) => {
      const text = story.scenes[sceneIndex].text;
      return `<li class="order-item"><span>${text}</span><span class="order-controls"><button type="button" class="order-move" data-position="${position}" data-direction="-1" aria-label="Subir: ${text}" ${position === 0 ? 'disabled' : ''}>▲</button><button type="button" class="order-move" data-position="${position}" data-direction="1" aria-label="Bajar: ${text}" ${position === orderItems.length - 1 ? 'disabled' : ''}>▼</button></span></li>`;
    }).join('');
  }

  function beginOrder() {
    orderItems = shuffle([0, 1, 2, 3]);
    $('#order-feedback').textContent = '';
    $('#check-order').classList.remove('hidden');
    $('#skip-order').classList.remove('hidden');
    $('#finish-order').classList.add('hidden');
    renderOrder();
    showScreen('screen-order', 'cierre');
  }

  function recordOrder(skipped) {
    const expected = story.scenes.map((scene) => scene.text).join(' → ');
    const given = skipped ? 'Omitida' : orderItems.map((index) => story.scenes[index].text).join(' → ');
    const correct = !skipped && orderItems.every((index, position) => index === position);
    answers.push({ question: 'Ordena la historia', given, expected, correct, status: skipped ? 'Saltada' : (correct ? '✓' : '✗') });
    $('#order-feedback').textContent = skipped ? 'Actividad opcional omitida.' : (correct ? '¡El orden está correcto! ✨' : 'Gracias por intentarlo. El orden correcto está indicado en la tabla de resultados.');
    $('#order-feedback').className = `feedback ${correct ? 'ok' : ''}`;
    $('#order-list').querySelectorAll('button').forEach((button) => { button.disabled = true; });
    $('#check-order').classList.add('hidden');
    $('#skip-order').classList.add('hidden');
    $('#finish-order').classList.remove('hidden');
  }

  function reset(rechoose = false) {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    if (timer) window.clearInterval(timer);
    answers = [];
    questionIndex = 0;
    sceneIndex = 0;
    $('.envelope').classList.remove('visible');
    $('#save-grid').classList.remove('hidden', 'saving');
    if (rechoose) { story = null; showScreen('screen-welcome', 'inicio'); }
    else { $('#look-title').textContent = story.title; $('#look-grid').innerHTML = story.scenes.map((scene, i) => sceneMarkup(scene, i)).join(''); showScreen('screen-look', 'inicio'); }
  }

  $('#start-story').addEventListener('click', beginStory);
  $('#next-scene').addEventListener('click', () => { if (sceneIndex < 3) { sceneIndex += 1; renderScene(); } else saveScenes(); });
  $('#speak').addEventListener('click', () => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(story.scenes[sceneIndex].text);
    utterance.lang = 'es-CL'; utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  });
  if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) $('#speak').classList.add('hidden');
  $('#begin-questions').addEventListener('click', () => {
    questionIndex = 0;
    answers = [];
    activeQuestions = questionsFor(story).map((question) => ({ ...question, options: shuffle(question.options) }));
    renderQuestion();
    showScreen('screen-question', 'cierre');
  });
  $('#answer-options').addEventListener('click', (event) => {
    const button = event.target.closest('[data-option]');
    if (!button || button.disabled) return;
    const question = activeQuestions[questionIndex];
    const index = Number(button.dataset.option);
    if (!question.multiple) chosen.clear();
    if (chosen.has(index)) chosen.delete(index); else chosen.add(index);
    button.setAttribute('aria-pressed', chosen.has(index) ? 'true' : 'false');
    if (!question.multiple) $('#answer-options').querySelectorAll('.answer-option').forEach((option) => { if (option !== button) option.setAttribute('aria-pressed', 'false'); });
  });
  $('#confirm-answer').addEventListener('click', confirmAnswer);
  $('#next-question').addEventListener('click', () => { if (questionIndex < 3) { questionIndex += 1; renderQuestion(); } else beginOrder(); });
  $('#order-list').addEventListener('click', (event) => {
    const button = event.target.closest('[data-position]');
    if (!button || button.disabled) return;
    const position = Number(button.dataset.position);
    const destination = position + Number(button.dataset.direction);
    [orderItems[position], orderItems[destination]] = [orderItems[destination], orderItems[position]];
    renderOrder();
    const focusPosition = Math.min(destination, orderItems.length - 1);
    const returnDirection = destination > position ? '-1' : '1';
    $(`#order-list [data-position="${focusPosition}"][data-direction="${returnDirection}"]`).focus();
  });
  $('#check-order').addEventListener('click', () => recordOrder(false));
  $('#skip-order').addEventListener('click', () => recordOrder(true));
  $('#finish-order').addEventListener('click', finish);
  $('#new-story').addEventListener('click', () => reset(true));
  $('#replay-story').addEventListener('click', () => reset(false));
  document.querySelectorAll('[data-action="choose"]').forEach((button) => button.addEventListener('click', () => reset(true)));
  renderChoices();
})();
