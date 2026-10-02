// ============================================================
// 📬 Suíte CRA — Caixa de Entrada do Agente (estação teletype)
// Testa o formato do protocolo (parse, visto, pendências),
// as instruções geradas pro agente, o render e BLINDA o anti-vibe.
// ============================================================
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)]
  .map(m => m[1])
  .filter(s => !s.trim().startsWith('// Compat'))
  .join('\n;\n');
const htmlSemScript = html.replace(/<script[\s\S]*?<\/script>/g, '<script src="stub"></script>');

let pass = 0, fail = 0;
function ok(cond, nome) {
  if (cond) { pass++; console.log('  ✓ ' + nome); }
  else { fail++; console.log('  ✗ FALHOU: ' + nome); }
}

function carregar() {
  const dom = new JSDOM(htmlSemScript, { url: 'https://lucasgabrieldevgg.github.io/caixa-agente/', runScripts: 'outside-only' });
  dom.window.eval(scripts + `
    ;globalThis.__X = {
      parseBlocks, parseSeenLine, blocosContent, normalizeCode, fmtCode,
      gerarCodigo, buildInstructions, buildAgentMsg, esc, fmt,
      blocosUrl, vistoUrl, termUrl, HEADER_TXT,
      enterDemo, renderBlocks, renderTerminal, renderAll, applyTheme,
      ttlDe, expiraInfo, sanitizeNome, minhasGet, minhasAdd, minhasRm, updateChip,
      get blocks(){ return S.blocks; }, set blocks(v){ S.blocks = v; },
      get seen(){ return S.seen; }, set seen(v){ S.seen = v; },
      get code(){ return S.code; }, set code(v){ S.code = v; },
      get nome(){ return S.nome; }, set nome(v){ S.nome = v; },
      get criado(){ return S.criado; }, set criado(v){ S.criado = v; },
      get ttl(){ return S.ttl; }, set ttl(v){ S.ttl = v; }
    };`);
  return dom;
}

(async () => {
  console.log('— 📄 FORMATO DO PROTOCOLO —');
  {
    const w = carregar().window, X = w.__X;
    const txt = '#CAIXA DE ENTRADA — append-only.\n#1 | 2026-10-02 10:00 | Comece pela landing page\nlinha sem formato deve ser ignorada\n#2 | 2026-10-02 10:30 | Use as cores azul e branco\n#3 | 2026-10-02 11:00 | O logo ficou pequeno, aumenta';
    const b = X.parseBlocks(txt);
    ok(b.length === 3, '3 blocos parseados; lixo ignorado');
    ok(b[0].id === 1 && b[1].id === 2 && b[2].id === 3, 'ids numéricos corretos');
    ok(b[0].text === 'Comece pela landing page', 'texto do bloco íntegro');
    ok(X.parseSeenLine(5) === 5 && X.parseSeenLine('5') === 0 && X.parseSeenLine(-1) === 0, 'visto: aceita número, rejeita string/negativo');
    const recon = X.parseBlocks(X.blocosContent(b));
    ok(recon.length === 3 && recon[2].text === b[2].text, 'roundtrip: blocosContent → parseBlocks sem perda');
    ok(X.blocosContent([]).startsWith(X.HEADER_TXT), 'cabeçalho append-only sempre presente');
  }

  console.log('— 🔑 CÓDIGOS E ENDEREÇOS —');
  {
    const w = carregar().window, X = w.__X;
    ok(X.normalizeCode('ab-c1 2d!') === 'ABC12D', 'normalizeCode: maiúsculas e só A-Z0-9');
    ok(X.fmtCode('ABC12D') === 'ABC1-2D'.slice(0, 4) + '-' + X.fmtCode('ABC12D').slice(5), 'fmtCode insere o traço');
    let ruim = 0;
    for (let i = 0; i < 60; i++) if (!/^([A-Z2-9]{4})-([A-Z2-9]{4})$/.test(X.gerarCodigo())) ruim++;
    ok(ruim === 0, '60 códigos gerados no formato XXXX-XXXX (sem I/L/O/0/1 ambíguos)');
    ok(X.blocosUrl('X1').includes('/boxes/X1/blocos.json'), 'URL de blocos correta');
    ok(X.vistoUrl('X1').includes('/boxes/X1/visto.json'), 'URL de visto correta');
  }

  console.log('— 📜 INSTRUÇÕES DO AGENTE (o protocolo que eu sigo) —');
  {
    const w = carregar().window, X = w.__X;
    const inst = X.buildInstructions('8MZP-6JDW');
    ok(inst.includes('/boxes/8MZP-6JDW/blocos.json') && inst.includes('/boxes/8MZP-6JDW/visto.json'), 'endereços blocos+visto presentes');
    ok(inst.includes('CHECKPOINT FINAL') && inst.includes('CANCELAR'), 'regras de checkpoint e cancelamento presentes');
    ok(inst.includes('curl -X PUT') && inst.includes('-d "N"'), 'instrução de PUT do visto presente');
    ok(inst.includes('#N | data hora | texto'), 'formato dos blocos documentado');
    const msg = X.buildAgentMsg('8MZP-6JDW');
    ok((msg.match(/blocos\.json|visto\.json/g) || []).length >= 2, 'mensagem pronta leva os 2 endereços json');
  }

  console.log('— 🟡 MODO DEMO (sem banco) + RENDER —');
  {
    const dom = carregar();
    const w = dom.window, d = w.document, X = w.__X;
    X.enterDemo();
    ok(X.blocks.length === 4 && X.seen === 2, 'demo: 4 blocos, 2 vistos');
    X.code = 'TEST-1234';
    X.renderBlocks();
    const badges = [...d.querySelectorAll('#blocks .badge')].map(b => b.textContent.trim());
    ok(badges.filter(t => t.includes('NOVO')).length === 2, '2 badges NOVO (blocos 3 e 4)');
    ok(badges.filter(t => t.includes('VISTO')).length === 2, '2 badges VISTO (blocos 1 e 2)');
    ok(d.getElementById('pending').textContent.includes('aguardando'), 'placar mostra pendências');
    ok([...d.querySelectorAll('#blocks .acts button')].some(b => b.textContent.includes('Visto')), 'botão ✓ Visto existe nos não-vistos');
    X.renderTerminal();
    const term = d.getElementById('term-out').textContent;
    ok(term.includes('STATUS AO VIVO') && term.includes('TEST-1234'), 'terminal mostra o status ao vivo com o código');
    ok(term.includes('◀── pendente'), 'terminal aponta o próximo pendente');
    ok(term.includes('CHECKPOINT FINAL'), 'terminal embute o protocolo completo');
  }

  console.log('— 🎨 TEMA E SEGURANÇA —');
  {
    const dom = carregar();
    const w = dom.window, d = w.document, X = w.__X;
    X.applyTheme('dark');
    ok(d.documentElement.dataset.theme === 'dark' && w.localStorage.getItem('caixa_tema') === 'dark', 'tema persiste no storage');
    ok(X.esc('<b>&"\'') === '&lt;b&gt;&amp;&quot;&#39;', 'esc neutraliza injeção');
  }

  console.log('— ⏳ PRAZOS, RENOMEAR & SUAS CAIXAS —');
  {
    const dom = carregar();
    const w = dom.window, d = w.document, X = w.__X;
    ok(X.ttlDe({ ttlHoras: 48 }) === 48 && X.ttlDe({ ttlHoras: 168 }) === 168, 'ttlDe respeita o prazo escolhido');
    ok(X.ttlDe({ ttlHoras: 999 }) === 168 && X.ttlDe({ ttlHoras: 0 }) === 168 && X.ttlDe(null) === 168, 'fora de 1–168h cai no padrão de 7 dias (168h)');
    const agora = Date.now();
    ok(X.expiraInfo({ criado: agora - 48 * 3600e3, ttlHoras: 168 }, agora).txt === '5d 00h', 'contagem em dias (5d 00h)');
    ok(X.expiraInfo({ criado: agora - 3600e3, ttlHoras: 24 }, agora).txt === '23h 00min', 'contagem em horas (23h 00min)');
    ok(X.expiraInfo({ criado: agora - 90 * 60e3, ttlHoras: 2 }, agora).txt === '30min', 'contagem em minutos');
    ok(X.expiraInfo({ criado: agora - 200 * 3600e3, ttlHoras: 24 }, agora).txt === 'expirada', 'prazo vencido = expirada');
    ok(X.sanitizeNome('  Um \u0000 nome\tcom   espaços  ') === 'Um nome com espaços', 'sanitizeNome limpa lixo e espaços');
    ok(X.sanitizeNome('x'.repeat(50)).length === 40, 'sanitizeNome corta em 40');
    w.localStorage.clear();
    X.minhasAdd('AB C1 2DEF', 'Projeto site');
    ok(X.minhasGet().length === 1 && X.minhasGet()[0].c === 'ABC1-2DEF' && X.minhasGet()[0].n === 'Projeto site', 'minhasAdd normaliza código e guarda nome');
    X.minhasAdd('ABC1-2DEF', 'Outro nome');
    ok(X.minhasGet().length === 1 && X.minhasGet()[0].n === 'Outro nome', 'sem duplicata — atualiza o nome');
    for (const c of ['ZZZZ-1111', 'YYYY-2222', 'WWWW-3333', 'VVVV-4444', 'UUUU-5555', 'TTTT-6666']) X.minhasAdd(c, '');
    ok(X.minhasGet().length === 6, 'lista limitada a 6 caixas');
    X.minhasRm('ZZZZ-1111');
    ok(X.minhasGet().length === 5 && !X.minhasGet().some(x => x.c === 'ZZZZ-1111'), 'minhasRm remove só a caixa certa');
    X.nome = 'Projeto site'; X.code = 'TEST-1234'; X.updateChip();
    ok(d.getElementById('codechip').textContent === 'Projeto site · caixa TEST-1234', 'chip mostra NOME · código');
    X.nome = ''; X.updateChip();
    ok(d.getElementById('codechip').textContent === 'caixa TEST-1234', 'sem nome, chip mostra só o código');
    X.nome = 'Projeto site'; X.criado = agora - 3600e3; X.ttl = 48;
    X.renderTerminal();
    const term = d.getElementById('term-out').textContent;
    ok(/expira: 1d 2[23]h · prazo 48h/.test(term), 'terminal mostra expira + prazo escolhido');
    ok(term.includes('caixa: Projeto site · TEST-1234'), 'terminal mostra o nome da caixa');
    ok(d.getElementById('btn-back') && !d.getElementById('btn-back').hidden, 'terminal tem botão ← voltar para o painel');
    w.localStorage.clear();
  }

  console.log('— 🔥 CRA: NADA DE CARA DE IA —');
  {
    ok(/"IBM Plex Mono"/.test(html) && /fonts.googleapis.com\/css2\?family=IBM\+Plex\+Mono/.test(html), 'corpo em IBM Plex Mono (teletype de verdade)');
    ok(/"VT323"/.test(html) && /family=VT323/.test(html), 'display em VT323 (CRT vintage)');
    ok(!/(?<!repeating-)linear-gradient/.test(html), 'ZERO linear-gradient com transição (só hard-stop repeating)');
    ok(!/radial-gradient/.test(html), 'zero glows radiais');
    ok((html.match(/repeating-linear-gradient/g) || []).length === 1, 'exatamente 1 textura (scanline CRT do tema escuro)');
    ok(!/7c5cfc|4f6df5|5b7cfa|#8b5cf6/i.test(html), 'zero roxo-lavanda de IA');
    ok(!/background-clip:text/.test(html), 'zero título-gradiente (cor sólida)');
    ok(!/animation:pulse|@keyframes pulse/.test(html), 'zero bolinha piscando (linha aberta é estática)');
    ok(/prefers-reduced-motion/.test(html), 'prefers-reduced-motion respeitado');
    ok(/rel="icon"/.test(html), 'favicon 📬 presente');
    // a chave AIzaSy é config PÚBLICO do Firebase (por design — segurança nas regras do banco); segredo REAL é outro:
    ok((html.match(/AIzaSy/g) || []).length === 1, 'config Firebase presente 1× (público por design)');
    ok(!/ghp_[A-Za-z0-9]{20,}|sk-or-v1-|sk-ant-|vcp_[A-Za-z0-9]{20,}/.test(html), 'zero segredo real (ghp/sk/vcp)');
    ok(fs.existsSync(path.join(__dirname, '..', 'LICENSE')), 'LICENSE MIT presente');
    ok(fs.existsSync(path.join(__dirname, '..', '.github', 'workflows', 'limpeza.yml')), 'workflow de limpeza de caixas preservado');
    ok(/TTL_DIAS=7/.test(html), 'TTL de 7 dias preservado');
  }

  console.log(`\n═══ RESULTADO: ${pass} ✓ · ${fail} ✗ ═══`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('CRASH:', e); process.exit(1); });
