
//         Gramatica
//
//    S  → aBc | dAb | bCd
//    A  → aCb | ε
//    B  → bAc | c
//    C  → aB  | ε

'use strict';

const EPSILON = 'ε';
const EOF = '$'; 

const grammar = {
  startSymbol: 'S',
 
  terminals: new Set(['a', 'b', 'c', 'd']),
 
  nonTerminals: new Set(['S', 'A', 'B', 'C']),
 
  productions: {
    'S': [ ['a', 'B', 'c'], ['d', 'A', 'b'], ['b', 'C', 'd'] ],
    'A': [ ['a', 'C', 'b'], [EPSILON] ],
    'B': [ ['b', 'A', 'c'], ['c'] ],
    'C': [ ['a', 'B', 'c'], [EPSILON] ],
  },
};

function isNonTerminal(symbol) {
  return grammar.nonTerminals.has(symbol);
}

function isTerminal(symbol) {
  return !isNonTerminal(symbol) && symbol !== EPSILON;
}

function computeFirst() {
  const first = {};
  for (const nt of grammar.nonTerminals) first[nt] = new Set();

  let changed = true;
  while (changed) {
    changed = false;

    for (const [nt, prods] of Object.entries(grammar.productions)) {
      for (const prod of prods) {

        if (prod[0] === EPSILON) {
          if (!first[nt].has(EPSILON)) { first[nt].add(EPSILON); changed = true; }
          continue;
        }

        let allDeriveEpsilon = true;

        for (const sym of prod) {
          if (isTerminal(sym)) {
            if (!first[nt].has(sym)) { first[nt].add(sym); changed = true; }
            allDeriveEpsilon = false;
            break;
          } else {
            for (const f of first[sym]) {
              if (f !== EPSILON && !first[nt].has(f)) { first[nt].add(f); changed = true; }
            }
            if (!first[sym].has(EPSILON)) { allDeriveEpsilon = false; break; }
          }
        }

        if (allDeriveEpsilon && !first[nt].has(EPSILON)) {
          first[nt].add(EPSILON);
          changed = true;
        }
      }
    }
  }

  return first;
}

function firstOfSequence(symbols, firstSets) {
  const result = new Set();

  if (symbols[0] === EPSILON) { result.add(EPSILON); return result; }

  let allEpsilon = true;

  for (const sym of symbols) {
    if (isTerminal(sym)) {
      result.add(sym);
      allEpsilon = false;
      break;
    } else {
      for (const f of firstSets[sym]) {
        if (f !== EPSILON) result.add(f);
      }
      if (!firstSets[sym].has(EPSILON)) { allEpsilon = false; break; }
    }
  }

  if (allEpsilon) result.add(EPSILON);
  return result;
}

function computeFollow(firstSets) {
  const follow = {};
  for (const nt of grammar.nonTerminals) follow[nt] = new Set();

  follow[grammar.startSymbol].add(EOF);

  let changed = true;
  while (changed) {
    changed = false;

    for (const [nt, prods] of Object.entries(grammar.productions)) {
      for (const prod of prods) {
        if (prod[0] === EPSILON) continue;

        for (let i = 0; i < prod.length; i++) {
          const B = prod[i];
          if (!isNonTerminal(B)) continue;

          const beta = prod.slice(i + 1);                               
          const firstBeta = beta.length > 0
            ? firstOfSequence(beta, firstSets)
            : new Set([EPSILON]);

          for (const f of firstBeta) {
            if (f !== EPSILON && !follow[B].has(f)) { follow[B].add(f); changed = true; }
          }

          if (firstBeta.has(EPSILON)) {
            for (const f of follow[nt]) {
              if (!follow[B].has(f)) { follow[B].add(f); changed = true; }
            }
          }
        }
      }
    }
  }

  return follow;
}

function buildParsingTable(firstSets, followSets) {
  const table = {};
  for (const nt of grammar.nonTerminals) table[nt] = {};

  for (const [nt, prods] of Object.entries(grammar.productions)) {
    for (let idx = 0; idx < prods.length; idx++) {
      const prod = prods[idx];
      const firstAlpha = firstOfSequence(prod, firstSets);

      for (const a of firstAlpha) {
        if (a !== EPSILON) {
          if (table[nt][a]) console.warn(`Conflito LL(1) em [${nt}, ${a}]`);
          table[nt][a] = { production: prod, index: idx };
        }
      }

      if (firstAlpha.has(EPSILON)) {
        for (const b of followSets[nt]) {
          if (table[nt][b]) console.warn(`Conflito LL(1) em [${nt}, ${b}]`);
          table[nt][b] = { production: [EPSILON], index: idx };
        }
      }
    }
  }

  return table;
}

function parse(tokens, table) {
  const input = [...tokens.filter(t => t !== EOF), EOF]; 
  const stack = [EOF, grammar.startSymbol];              
  let ip = 0;
  const steps = [];
  let success = false;
  let error = null;

  while (stack.length > 0) {
    const top = stack[stack.length - 1];
    const current = input[ip];

    const step = {
      stack : [...stack].reverse().join(' '),
      input : input.slice(ip).join(' '),
      action: '',
    };

    if (top === EOF && current === EOF) {
      step.action = 'ACEITAR ';
      steps.push(step);
      success = true;
      break;
    }

    if (isTerminal(top) || top === EOF) {
      if (top === current) {
        step.action = `Consumir '${top}'`;
        stack.pop();
        ip++;
      } else {
        step.action = `ERRO: esperado '${top}', encontrado '${current}'`;
        steps.push(step);
        error = step.action;
        break;
      }
    } else {
      const entry = table[top] && table[top][current];

      if (!entry) {
        step.action = `ERRO: nenhuma regra em M[${top}, ${current}]`;
        steps.push(step);
        error = step.action;
        break;
      }

      const { production } = entry;
      step.action = `${top} → ${production.join(' ')}`;

      stack.pop();
      if (production[0] !== EPSILON) {
        for (let i = production.length - 1; i >= 0; i--) {
          stack.push(production[i]);
        }
      }
    }

    steps.push(step);
  }

  return { steps, success, error };
}

function generateSentence(symbol = grammar.startSymbol, depth = 0) {
  if (depth > 20) return ['a'];

  if (isTerminal(symbol)) return [symbol]; 

  const allProds = grammar.productions[symbol];
  const nonEpsilonProds = allProds.filter(p => p[0] !== EPSILON);

  const candidates = (depth < 3 && nonEpsilonProds.length > 0) ? nonEpsilonProds : allProds;
  const prod = candidates[Math.floor(Math.random() * candidates.length)];

  if (prod[0] === EPSILON) return [];

  const result = [];
  for (const sym of prod) {
    result.push(...generateSentence(sym, depth + 1));
  }
  return result;
}

function tokenize(input) {
  const tokens = [];
  for (const ch of input.replace(/\s+/g, '')) {
    if (['a', 'b', 'c', 'd'].includes(ch)) {
      tokens.push(ch);
    } else {
      console.warn(`Token desconhecido ignorado: '${ch}'`);
    }
  }
  return tokens;
}


function displayGrammar() {
  console.log('\n Gramatica ');
  for (const [nt, prods] of Object.entries(grammar.productions)) {
    const prodsStr = prods.map(p => p.join(' ')).join('  |  ');
    console.log(`  ${nt.padEnd(4)} →  ${prodsStr}`);
  }
}

function displayFirstFollow(firstSets, followSets) {
  console.log('\n First ');
  for (const nt of grammar.nonTerminals) {
    console.log(`  FIRST(${nt.padEnd(3)}) = { ${[...firstSets[nt]].join(', ')} }`);
  }
  console.log('\n Follow ');
  for (const nt of grammar.nonTerminals) {
    console.log(`  FOLLOW(${nt.padEnd(3)}) = { ${[...followSets[nt]].join(', ')} }`);
  }
}

function displayParsingTable(table) {
  const cols = [...grammar.terminals, EOF];
  const W    = 14;

  console.log('\n Tabela de Parsing');
  const header = 'NT  '.padEnd(6) + cols.map(c => c.padEnd(W)).join('');
  console.log(header);
  console.log('─'.repeat(header.length));

  for (const nt of grammar.nonTerminals) {
    let row = nt.padEnd(6);
    for (const t of cols) {
      const entry = table[nt] && table[nt][t];
      row += (entry ? `${nt}→${entry.production.join('')}` : '').padEnd(W);
    }
    console.log(row);
  }
}

function displayParseSteps({ steps, success, error }) {
  const W1 = 38, W2 = 30;
  console.log('\n Analise');
  console.log('PILHA'.padEnd(W1) + 'ENTRADA'.padEnd(W2) + 'AÇÃO');
  console.log('─'.repeat(W1 + W2 + 30));
  for (const s of steps) {
    console.log(s.stack.padEnd(W1) + s.input.padEnd(W2) + s.action);
  }
  if (success) {
    console.log('\n Sentença ACEITA!');
  } else {
    console.log('\n Sentença REJEITADA!');
    if (error) console.log('    Motivo:', error);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    grammar,
    computeFirst,
    computeFollow,
    buildParsingTable,
    parse,
    generateSentence,
    tokenize,
    displayGrammar,
    displayFirstFollow,
    displayParsingTable,
    displayParseSteps,
  };
}

function main() {
  const firstSets = computeFirst();
  const followSets = computeFollow(firstSets);
  const table = buildParsingTable(firstSets, followSets);

  displayGrammar();
  displayFirstFollow(firstSets, followSets);
  displayParsingTable(table);

  console.log('\n Geração de sentença');
  const gerada = generateSentence();
  console.log('Sentença gerada:', gerada.join(' '));
  displayParseSteps(parse(gerada, table));

  console.log('\n Teste Manual');

  const casos = [
    // Válidas
    { desc: 'Válida: S→aBc, B→c', entrada: 'a c c'},
    { desc: 'Válida: S→aBc, B→bAc, A→ε', entrada: 'a b c c'},
    { desc: 'Válida: S→aBc, B→bAc, A→aCb, C→ε', entrada: 'a b a b c c'},
    { desc: 'Válida: S→dAb, A→ε', entrada: 'd b'},
    { desc: 'Válida: S→dAb, A→aCb, C→ε', entrada: 'd a b b'},
    { desc: 'Válida: S→bCd, C→ε', entrada: 'b d'},
    { desc: 'Válida: S→bCd, C→aBc, B→c', entrada: 'b a c c d'},
    // Inválidas
    { desc: 'Inválida: B inválido em aBc', entrada: 'a d c'},
    { desc: 'Inválida: S não começa com c', entrada: 'c a'},
    { desc: 'Inválida: falta fechamento c em aBc', entrada: 'a b c'},
  ];
 
  for (const { desc, entrada } of casos) {
    const tokens = tokenize(entrada);
    console.log(`\n[${desc}]  →  tokens: [${tokens.join(', ')}]`);
    displayParseSteps(parse(tokens, table));
  }
}

main();