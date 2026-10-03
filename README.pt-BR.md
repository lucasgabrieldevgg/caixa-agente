[🇺🇸 English](README.md)

# 📬 Caixa de Entrada do Agente

**https://lucasgabrieldevgg.github.io/caixa-agente**

> Envie mensagens e instruções para o seu agente de IA **enquanto ele executa a tarefa** — sem interromper, sem pausar, sem refazer prompt. Ele lê no próximo checkpoint, incorpora e te confirma marcando como **visto**.

[![ci](https://github.com/lucasgabrieldevgg/caixa-agente/actions/workflows/ci.yml/badge.svg)](https://github.com/lucasgabrieldevgg/caixa-agente/actions/workflows/ci.yml) [![site](https://img.shields.io/badge/site-github.io-186b3d)](https://lucasgabrieldevgg.github.io/caixa-agente) [![banco](https://img.shields.io/badge/banco-firebase%20gr%C3%A1tis-ffca28)](https://firebase.google.com) [![segredo](https://img.shields.io/badge/segredos-zero-16a34a)](#-arquitetura) [![custo](https://img.shields.io/badge/custo-R%24%200-success)](#)

---

## 🤔 O problema que isso resolve

Agentes autônomos (Claude Code, GPT agents, etc.) executam tarefas longas. Se você teve uma ideia nova no meio do caminho — uma correção, um ajuste, um "esquece o que eu disse" — as opções eram: interromper o agente (perde o ritmo) ou esperar ele terminar (perde a ideia).

**A caixa resolve:** você escreve um bloco a qualquer momento; o agente consulta a caixa a cada checkpoint, executa o que houver de novo e **só encerra quando a caixa está esvaziada**. Mensagem nunca fica sem resposta.

## 🚀 Como usar (3 passos, sem cadastro)

1. **Crie sua caixa** na [home](https://lucasgabrieldevgg.github.io/caixa-agente) → você recebe um código `XXXX-XXXX` e seu link exclusivo;
2. **Envie a mensagem pronta pro agente** (o site gera pra você no botão 🔗) — uma única vez, vale pra sempre;
3. **Escreva blocos** quando quiser. O agente lê, executa e marca **✓ VISTO** — você acompanha em tempo real.

### Mensagem que o agente recebe (modelo)

```
Você tem uma CAIXA DE ENTRADA por onde eu envio instruções a qualquer momento, sem interromper seu trabalho.
1) Leia agora o protocolo completo (vale para sempre): https://lucasgabrieldevgg.github.io/caixa-agente/?c=SEU-CODIGO#terminal
2) Se você só lê texto puro: seus blocos estão em https://caixa-agente-default-rtdb.firebaseio.com/boxes/SEU-CODIGO/blocos.json e sua memória em https://caixa-agente-default-rtdb.firebaseio.com/boxes/SEU-CODIGO/visto.json
Siga o protocolo: consulte a caixa a cada checkpoint e nunca encerre sem esvaziá-la.
```

## ✨ Funcionalidades

- **Multiusuário** — cada pessoa cria a própria caixa (1 clique, sem conta); caixas 100% isoladas por código de 8 caracteres (sem letras ambíguas 0/O/1/L/I);
- **⏱️ Tempo real** — painel atualiza via WebSocket do Firebase: bloco escrito aparece na hora; visto do agente também;
- **✓ VISTO = memória do agente** — `visto` guarda até onde ele processou; nunca reprocessa, nunca ignora nada novo; memória sobrevive entre sessões;
- **✏️ Renomear caixa** — dá um nome à caixa (aparece no painel, no terminal e na lista); código e link não mudam;
- **📬 Suas caixas na home** — o navegador guarda até 6 caixas (só na sua máquina, `localStorage`) com **pendências e contagem regressiva** ao vivo;
- **✏️ Editar / 🗑 excluir bloco** — só enquanto o agente não viu; depois vira imutável 🔒;
- **🗑 Excluir caixa** — só enquanto nada foi processado (visto = 0); exclusões com **transação atômica** no servidor (sem corrida com o visto);
- **♻️ Resetar caixa** — zera mensagens e memória do agente **mantendo o mesmo código/link** (a mensagem já enviada ao agente continua valendo); uso ilimitado enquanto a caixa estiver no prazo;
- **💬 Comentário do agente** — extra opcional: ao concluir um bloco, o agente deixa o comentário dele (dúvida, decisão, resultado) colado na instrução;
- **📈 Acompanhamento** — aba própria onde o agente posta o que está fazendo e o que conseguiu a cada checkpoint;
- **⚙️ Configurações** — cada extra tem nível próprio **desativado / simples / médio / completo**, mudável a qualquer momento (o agente relê a configuração a cada checkpoint e obedece no próximo). Avisos honestos: com os extras ligados o agente escreve mais — **pode gastar tokens adicionais da sua IA** — e se o seu agente **já comenta/reporta por conta própria** no ambiente dele, deixe em *desativado* (os extras existem pra quem não tem esse retorno);
- **🖥️ Terminal da IA** — `?c=SEU-CODIGO#terminal`: versão texto do painel com blocos ao vivo, prazo e protocolo completo (pro agente que tem navegador) — com botão ← voltar para o painel;
- **REST puro** — agentes sem navegador usam `GET`/`PUT` simples, **sem token, sem login**;
- **🌙 Tema claro/escuro**, mobile-first, zero configuração pra qualquer pessoa.

## 🏗️ Arquitetura

```
                 ┌─────────────── Firebase RTDB (grátis, sem pausa) ────────┐
 site (Pages) ───▶  boxes/2EJ5-NR8Q/{blocos:"…", visto:1, criado:…}        │
 agente (REST) ──▶  boxes/P3MD-7WV2/{…}   boxes/XXXX-XXXX/{…}              │
                 └──────────── regras públicas, ZERO segredos ─────────────┘
```

| Peça | O que é |
|---|---|
| **Site** | `index.html` único neste repo → GitHub Pages (eterno, grátis) |
| **Banco** | Firebase Realtime Database — 1 nó por caixa, isolados |
| **Segurança** | **Regras do banco** (raiz bloqueada; só `boxes/$code` público) — nenhum token/chave/segredo em lugar nenhum |
| **Escrita** | Transações (append concorrente seguro) |
| **Custo** | R$ 0 |

### Formato dos dados

`blocos` é uma string append-only, uma instrução por linha:

```
#CAIXA DE ENTRADA — append-only. Nao apague linhas antigas.
#1 | 2026-09-13 19:40 | Comece montando a landing page
#2 | 2026-09-13 19:52 | Troca o botão pra azul
```

`visto` é um número: **tudo com id ≤ visto já foi processado**. É a memória do agente.

A caixa também carrega `nome` (opcional), `ttlHoras` (prazo escolhido na criação, 24–168), `criado` (carimbo da última atividade — é o que renova o prazo), `cfg` `{coment, comentNivel, prog, progNivel}` (extras com nível independente; caixas antigas com `nivel` único continuam funcionando), `coment/{id}` (comentários do agente por bloco) e `progresso` (fita do acompanhamento, mesmo formato `#N | data | nivel | texto`).

### API que o agente usa (REST, sem credencial)

```bash
# ler as mensagens (string inteira)
curl https://caixa-agente-default-rtdb.firebaseio.com/boxes/CODIGO/blocos.json

# ler a memória (número)
curl https://caixa-agente-default-rtdb.firebaseio.com/boxes/CODIGO/visto.json

# marcar visto (após concluir até o bloco #N)
curl -X PUT "https://caixa-agente-default-rtdb.firebaseio.com/boxes/CODIGO/visto.json" \
     -H "Content-Type: application/json" -d "N"
```

## 🧠 Protocolo do agente (resumo)

O protocolo completo vive no terminal (`#terminal`) — este é o resumo:

1. **Início:** lê `visto` + `blocos`, monta os pendentes (id > visto);
2. **Checkpoint periódico:** a cada ~5 passos (~10 min), relê; com novidade, incorpora com o mínimo de replanejamento (nunca recomeça do zero); sem novidade, segue;
3. **Checkpoint final obrigatório:** executa pendentes → marca visto → relê → repete até uma leitura completa não trazer nada novo. **Só então encerra**;
4. **Extras (se ligados nas configurações):** lê `cfg/{código}/cfg.json`; com comentário, faz PUT em `coment/N.json` ao concluir cada bloco; com acompanhamento, acrescenta linha em `progresso.json` e renova o carimbo de atividade;
5. **Anti-travamento:** consultar a caixa nunca é desculpa para esperar em loop;
6. **Resiliência:** caixa fora do ar nunca derruba a tarefa.

## 🕒 Retenção de dados (você escolhe o prazo)

- **Na criação você escolhe quando a caixa apaga sozinha**: 24h, 48h, 3 dias ou **7 dias (máximo)** — fica gravado no nó da caixa (`ttlHoras`);
- **O prazo renova a cada mensagem** (e a cada reset): é contado da **última atividade**, não da criação — caixa ativa nunca expira;
- Duas camadas de limpeza, as duas respeitam o prazo de cada caixa: (1) abrir caixa vencida apaga-a na hora; (2) GitHub Action `Limpeza de caixas antigas` varre o banco **todo dia** e remove as vencidas;
- **Privacidade por design**: instruções executadas são lixo — aqui elas se autodestroem;
- Para mudar o teto global: `TTL_DIAS` no `index.html`, no `scripts/limpeza.mjs` e no workflow.

## 🔒 Segurança e isolamento

- **Nenhum segredo no site** — a proteção vem das regras do banco, não de tokens (nada pra vazar);
- **Quem tem o código, acessa a caixa** — códigos são de 8 caracteres sem letras ambíguas (praticamente impossível adivinhar); trate o link como chave da sua caixa;
- **Caixas não se misturam** — cada código é um nó isolado; blocos, visto e memória nunca cruzam;
- Não escreva segredos (senhas, chaves de API) nos blocos — use referências ("use a chave do meu arquivo X").

## 🎨 Identidade — ESTAÇÃO TELETYPE

Zero cara-de-IA: nada de gradiente roxo-lavanda, glow radial, vidro fosco ou Inter. Aqui a estação tem cara do que ela é:

- **Claro = papel de telégrafo** (creme `#ece6d6`, tinta `#211d12`, sombras duras deslocadas — recibo de teletipo);
- **Escuro = CRT de fósforo verde** (`#12140f` + verde `#3ee07a`, scanlines sutis de textura hard-stop);
- **VT323** no display (títulos tipo terminal vintage) · **IBM Plex Mono** no corpo (monoespaçada de verdade, já que o produto vive de `#N | data | texto`);
- Tarja âmbar = bloco **NOVO** · tarja verde = **VISTO** (a fita anda, a linha fica aberta);
- Índice da paleta e componentes no topo do `index.html` (comentário `ESTAÇÃO TELETYPE`).

## 🧪 Testes

```
npm install && npm test
```

**97 checks** rodam em jsdom **sem rede e sem Firebase** (o app cai no modo demonstração sozinho): formato do protocolo (`#N | data | texto`, visto, pendências), códigos `XXXX-XXXX` sem caracteres ambíguos, endereços REST, protocolo gerado pro agente, render de blocos/terminal, tema persistente, escape de HTML — e a **guarda anti-vibe**: se alguém reintroduzir gradiente com transição, glow radial, roxo de IA, título-gradiente, bolinha piscando ou segredo real, a suíte quebra no CI.

## 📄 Arquivos

| Arquivo | O que é |
|---|---|
| `index.html` | O site inteiro (home, painel visual, terminal, lógica Firebase) |
| `tests/suite.cjs` | Suíte de consistência (41 checks, jsdom, sem rede) |
| `.github/workflows/ci.yml` | CI: `npm test` + higiene anti-vibe a cada push |
| `.github/workflows/limpeza.yml` | Action diária que apaga caixas vencidas (TTL 7 dias) |
| `scripts/limpeza.mjs` | Script da limpeza diária |
| `LICENSE` | MIT |
| `.nojekyll` | Acelera o Pages |

---

Feito para a tarefa **"Comunicação com agentes sem interrompê-los"** — para dúvidas ou ajustes, abra uma issue. 📬
