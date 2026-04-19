const state = {
  notes: [],
  links: new Set(),
  selectedNoteId: null,
  viewMode: 'thread',
};

const noteList = document.getElementById('noteList');
const notesDisplay = document.getElementById('notesDisplay');
const newNoteBtn = document.getElementById('newNoteBtn');
const linkFromSelect = document.getElementById('linkFromSelect');
const linkToSelect = document.getElementById('linkToSelect');
const linkNotesBtn = document.getElementById('linkNotesBtn');
const threadViewBtn = document.getElementById('threadViewBtn');
const singleViewBtn = document.getElementById('singleViewBtn');
const viewDescription = document.getElementById('viewDescription');
const noteTemplate = document.getElementById('noteTemplate');
const fontFamily = document.getElementById('fontFamily');
const fontSize = document.getElementById('fontSize');

function createNote() {
  const id = crypto.randomUUID();
  const note = {
    id,
    title: `Note ${state.notes.length + 1}`,
    content: '',
  };
  state.notes.unshift(note);
  state.selectedNoteId = id;
  render();
}

function updateNote(id, updates) {
  const note = state.notes.find((item) => item.id === id);
  if (!note) {
    return;
  }
  Object.assign(note, updates);
  updateNoteList();
}

function serializeLink(a, b) {
  return [a, b].sort().join('|');
}

function createLink(fromId, toId) {
  if (!fromId || !toId || fromId === toId) {
    return;
  }
  state.links.add(serializeLink(fromId, toId));
  render();
}

function linkedIdsFor(noteId) {
  const linked = new Set([noteId]);
  const stack = [noteId];

  while (stack.length > 0) {
    const current = stack.pop();
    state.links.forEach((pair) => {
      const [a, b] = pair.split('|');
      if (a === current && !linked.has(b)) {
        linked.add(b);
        stack.push(b);
      }
      if (b === current && !linked.has(a)) {
        linked.add(a);
        stack.push(a);
      }
    });
  }

  return linked;
}

function getVisibleNotes() {
  if (state.notes.length === 0) {
    return [];
  }

  if (state.viewMode === 'single') {
    return state.notes.filter((note) => note.id === state.selectedNoteId).slice(0, 1);
  }

  const selectedId = state.selectedNoteId || state.notes[0].id;
  const threadIds = linkedIdsFor(selectedId);
  return state.notes.filter((note) => threadIds.has(note.id));
}

function renderNoteCard(note) {
  const fragment = noteTemplate.content.cloneNode(true);
  const card = fragment.querySelector('.post-it');
  const titleInput = fragment.querySelector('.note-title');
  const editor = fragment.querySelector('.editor');
  const linkedCount = fragment.querySelector('.linked-count');

  card.dataset.noteId = note.id;
  titleInput.value = note.title;
  editor.innerHTML = note.content;

  const linkedTotal = [...state.links].filter((pair) => {
    const [a, b] = pair.split('|');
    return a === note.id || b === note.id;
  }).length;
  linkedCount.textContent = linkedTotal > 0 ? `Linked notes: ${linkedTotal}` : 'No links yet';

  titleInput.addEventListener('input', (event) => {
    updateNote(note.id, { title: event.target.value || 'Untitled note' });
    populateLinkSelectors();
  });

  editor.addEventListener('focus', () => {
    state.selectedNoteId = note.id;
    updateNoteList();
  });

  editor.addEventListener('input', () => {
    updateNote(note.id, { content: editor.innerHTML });
  });

  return fragment;
}

function updateNoteList() {
  noteList.innerHTML = '';
  state.notes.forEach((note) => {
    const listItem = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = note.title || 'Untitled note';
    if (note.id === state.selectedNoteId) {
      button.classList.add('active');
    }

    button.addEventListener('click', () => {
      state.selectedNoteId = note.id;
      render();
    });

    listItem.appendChild(button);
    noteList.appendChild(listItem);
  });
}

function populateLinkSelectors() {
  const options = state.notes
    .map((note) => `<option value="${note.id}">${escapeHtml(note.title || 'Untitled note')}</option>`)
    .join('');

  linkFromSelect.innerHTML = options;
  linkToSelect.innerHTML = options;

  if (state.selectedNoteId) {
    linkFromSelect.value = state.selectedNoteId;
  }
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function setViewMode(mode) {
  state.viewMode = mode;
  threadViewBtn.classList.toggle('is-active', mode === 'thread');
  singleViewBtn.classList.toggle('is-active', mode === 'single');
  render();
}

function render() {
  if (!state.selectedNoteId && state.notes.length > 0) {
    state.selectedNoteId = state.notes[0].id;
  }

  updateNoteList();
  populateLinkSelectors();

  notesDisplay.innerHTML = '';
  const visibleNotes = getVisibleNotes();

  viewDescription.textContent =
    state.viewMode === 'thread'
      ? 'Showing selected note and all linked notes.'
      : 'Showing only the selected note.';

  if (visibleNotes.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'hint';
    empty.textContent = 'Create your first note to start your Zettelkasten.';
    notesDisplay.appendChild(empty);
    return;
  }

  visibleNotes.forEach((note) => {
    notesDisplay.appendChild(renderNoteCard(note));
  });
}

function applyFormatting(command, value = null) {
  document.execCommand(command, false, value);
}

function attachFormattingEvents() {
  document.querySelectorAll('[data-command]').forEach((button) => {
    button.addEventListener('click', () => {
      applyFormatting(button.dataset.command);
    });
  });

  fontFamily.addEventListener('change', (event) => {
    applyFormatting('fontName', event.target.value);
  });

  fontSize.addEventListener('change', (event) => {
    applyFormatting('fontSize', event.target.value);
  });
}

newNoteBtn.addEventListener('click', createNote);

linkNotesBtn.addEventListener('click', () => {
  createLink(linkFromSelect.value, linkToSelect.value);
});

threadViewBtn.addEventListener('click', () => setViewMode('thread'));
singleViewBtn.addEventListener('click', () => setViewMode('single'));

attachFormattingEvents();
createNote();
render();
