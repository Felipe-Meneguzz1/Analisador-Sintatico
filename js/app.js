'use strict';

let parsingTable = null;
let parseResult = null;
let visibleSteps = 0;

function formatProduction(prod) {
  return prod.join(' ');
}

function renderGrammarInfo() {
  const firstSets = computeFirst();
  const followSets = computeFollow(firstSets);
  parsingTable = buildParsingTable(firstSets, followSets);

  const grammarEl = document.getElementById('grammarContent');
  grammarEl.innerHTML = [...grammar.nonTerminals]
    .map((nt) => {
      const prods = grammar.productions[nt]
        .map((p) => formatProduction(p))
        .join(' | ');
      return `<p>${nt} := ${prods}</p>`;
    })
    .join('');

  const firstEl = document.getElementById('firstContent');
  firstEl.innerHTML = [...grammar.nonTerminals]
    .map((nt) => `<p>${nt} = {${[...firstSets[nt]].join(', ')}}</p>`)
    .join('');

  const followEl = document.getElementById('followContent');
  followEl.innerHTML = [...grammar.nonTerminals]
    .map((nt) => `<p>${nt} = {${[...followSets[nt]].join(', ')}}</p>`)
    .join('');

  renderParsingTable(parsingTable);
}

function renderParsingTable(table) {
  const cols = [...grammar.terminals, EOF];
  const thead = document.getElementById('parsingTableHead');
  const tbody = document.getElementById('parsingTableBody');

  thead.innerHTML = `
    <tr>
      <th class="px-4 py-3 border border-gray-200 text-gray-700"></th>
      ${cols.map((c) => `<th class="px-4 py-3 border border-gray-200 text-gray-700">${c}</th>`).join('')}
    </tr>`;

  tbody.innerHTML = [...grammar.nonTerminals]
    .map((nt) => {
      const cells = cols
        .map((t) => {
          const entry = table[nt] && table[nt][t];
          const text = entry ? `${nt} → ${formatProduction(entry.production)}` : '';
          return `<td class="border border-gray-200 p-3 text-gray-700">${text}</td>`;
        })
        .join('');
      return `<tr class="hover:bg-gray-50 transition">
        <td class="border border-gray-200 font-bold text-gray-900">${nt}</td>
        ${cells}
      </tr>`;
    })
    .join('');
}

function resetParseState() {
  parseResult = null;
  visibleSteps = 0;
  renderResolutionTable([], null);
  updateStepCounter(0, 0, null);
}

function updateStepCounter(visible, total, result) {
  const counterEl = document.getElementById('stepCounter');
  if (!counterEl) return;

  if (!total) {
    counterEl.textContent = '';
    return;
  }

  if (result) {
    const label = total === 1 ? 'passo' : 'passos';
    const outcome = result.success ? 'aceita' : 'rejeitada';
    counterEl.textContent = `${total} ${label} até a sentença ser ${outcome}`;
    return;
  }

  counterEl.textContent = `Passo ${visible} de ${total}`;
}

function getInputTokens() {
  const raw = document.getElementById('tokenInput').value;
  return tokenize(raw);
}

function runParse() {
  if (!parsingTable) renderGrammarInfo();
  const tokens = getInputTokens();
  parseResult = parse(tokens, parsingTable);
  return parseResult;
}

function renderResolutionTable(steps, result, totalSteps = null) {
  const table = document.getElementById('resolutionTable');
  const statusEl = document.getElementById('parseStatus');
  const total = totalSteps ?? steps.length;

  if (!steps.length) {
    table.innerHTML = '';
    if (statusEl) statusEl.textContent = '';
    updateStepCounter(0, 0, null);
    return;
  }

  updateStepCounter(steps.length, total, result);

  const rows = steps
    .map((step, i) => {
      const isCurrent = i === steps.length - 1;
      const rowClass = isCurrent ? 'bg-gray-100' : 'hover:bg-gray-50';
      const isError = step.action.startsWith('ERRO');
      const actionClass = isError ? 'text-gray-500' : step.action.includes('ACEITAR') ? 'text-gray-900 font-semibold' : 'text-gray-700';
      return `<tr class="${rowClass} transition">
        <td class="border border-gray-200 px-4 py-3 text-center text-gray-500 w-16">${i + 1}</td>
        <td class="border border-gray-200 px-4 py-3 font-mono text-left text-gray-700">${step.stack}</td>
        <td class="border border-gray-200 px-4 py-3 font-mono text-left text-gray-700">${step.input}</td>
        <td class="border border-gray-200 px-4 py-3 font-mono text-left ${actionClass}">${step.action}</td>
      </tr>`;
    })
    .join('');

  table.innerHTML = `
    <thead class="bg-gray-100">
      <tr>
        <th class="px-4 py-3 border border-gray-200 text-center text-gray-700 w-16">#</th>
        <th class="px-4 py-3 border border-gray-200 text-left text-gray-700">Pilha</th>
        <th class="px-4 py-3 border border-gray-200 text-left text-gray-700">Entrada</th>
        <th class="px-4 py-3 border border-gray-200 text-left text-gray-700">Ação</th>
      </tr>
    </thead>
    <tbody class="text-center">${rows}</tbody>`;

  if (statusEl && result) {
    const label = total === 1 ? 'passo' : 'passos';
    if (result.success) {
      statusEl.textContent = `Sentença ACEITA! (${total} ${label})`;
      statusEl.className = 'mt-4 text-lg font-semibold text-gray-900';
    } else {
      statusEl.textContent = `Sentença REJEITADA em ${total} ${label} — ${result.error || ''}`;
      statusEl.className = 'mt-4 text-lg font-semibold text-gray-500';
    }
  } else if (statusEl) {
    statusEl.textContent = '';
  }
}

function scrollToLastStep() {
  const anchor = document.getElementById('anchor');
  if (anchor) anchor.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function initAutomaton() {
  resetParseState();
}

function initSentence() {
  const sentence = generateSentence().join(' ');
  document.getElementById('tokenInput').value = sentence;
  resetParseState();
}

function nextPass() {
  const tokens = getInputTokens();
  if (!tokens.length) return;

  if (!parseResult) {
    parseResult = runParse();
    visibleSteps = 1;
  } else if (visibleSteps < parseResult.steps.length) {
    visibleSteps++;
  }

  const partial = parseResult.steps.slice(0, visibleSteps);
  const isComplete = visibleSteps >= parseResult.steps.length;
  renderResolutionTable(partial, isComplete ? parseResult : null, parseResult.steps.length);
  scrollToLastStep();
}

function checkEnd() {
  const tokens = getInputTokens();
  if (!tokens.length) return;

  parseResult = runParse();
  visibleSteps = parseResult.steps.length;
  renderResolutionTable(parseResult.steps, parseResult);
  scrollToLastStep();
}

function toggleDropdown() {
  const infos = document.querySelector('.infos');
  infos.classList.toggle('hidden');
}

document.addEventListener('DOMContentLoaded', () => {
  renderGrammarInfo();
  resetParseState();
});
