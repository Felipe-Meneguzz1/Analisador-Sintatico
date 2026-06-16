# Analisador Sintático
Trabalho da disciplina de **Compiladores** — URI Campus Erechim  
Professor: Fabio Zanin  
Feito por:  
Anderson Antonio Cagnini - 101508@aluno.uricer.edu.br  
Felipe Meneguzzi - 103418@aluno.uricer.edu.br
 
---
 
## Linguagem utilizada
 
- **HTML**
- **CSS**
- **JavaScript**
---
 
## Como executar
 
1. Clone o repositório:
```bash
   git clone https://github.com/Felipe-Meneguzz1/Analisador-Sintatico.git
```
2. Abra a pasta do projeto
3. Abra o arquivo `index.html` no navegador
---
 
## Gramática utilizada (GLC LL(1))
 
```
S  →  a B c  |  d A b  |  b C d
A  →  a C b  |  ε
B  →  b A c  |  c
C  →  a B c  |  ε
```
 
- **4 regras** no total (S, A, B, C)
- **S, A, B e C** possuem duas ou mais produções
- **A** e **C** possuem produção com **ε**
- Gramática **fatorada**, sem **recursão à esquerda** e **não ambígua**
### Terminais
`a`, `b`, `c`, `d`
 
### Não-terminais
`S`, `A`, `B`, `C`
 
### Símbolo inicial
`S`
 
---
 
## Conjuntos FIRST
 
| Não-terminal | FIRST       |
|-------------|-------------|
| S           | { a, b, d } |
| A           | { a, ε }    |
| B           | { b, c }    |
| C           | { a, ε }    |
 
---
 
## Conjuntos FOLLOW
 
| Não-terminal | FOLLOW   |
|-------------|----------|
| S           | { $ }    |
| A           | { b, c } |
| B           | { c }    |
| C           | { b, d } |
 
---
 
## Tabela de Parsing
 
|   | a     | b     | c   | d     | $ |
|---|-------|-------|-----|-------|---|
| S | S→aBc | S→bCd |     | S→dAb |   |
| A | A→aCb | A→ε   | A→ε |       |   |
| B |       | B→bAc | B→c |       |   |
| C | C→aBc | C→ε   |     | C→ε   |   |
 
---
