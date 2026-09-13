# 📬 Caixa de Entrada do Agente

**https://lucasgabrieldevgg.github.io/caixa-agente**

> Envie mensagens e instruções para o seu agente de IA **enquanto ele executa a tarefa** — sem interromper, sem pausar, sem refazer prompt. Ele lê no próximo checkpoint, incorpora e te confirma marcando como **visto**.

[![site](https://img.shields.io/badge/site-github.io-4f6df5)](https://lucasgabrieldevgg.github.io/caixa-agente) [![banco](https://img.shields.io/badge/banco-firebase%20gr%C3%A1tis-ffca28)](https://firebase.google.com) [![segredo](https://img.shields.io/badge/segredos-zero-16a34a)](#-arquitetura) [![custo](https://img.shields.io/badge/custo-R%24%200-success)](#)

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
- **✏️ Editar / 🗑 excluir bloco** — só enquanto o agente não viu; depois vira imutável 🔒;
- **🗑 Excluir caixa** — só enquanto nada foi processado (visto = 0); exclusões com **transação atômica** no servidor (sem corrida com o visto);
- **🖥️ Terminal da IA** — `?c=SEU-CODIGO#terminal`: versão texto do painel com blocos ao vivo + protocolo completo (pro agente que tem navegador);
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
4. **Anti-travamento:** consultar a caixa nunca é desculpa para esperar em loop;
5. **Resiliência:** caixa fora do ar nunca derruba a tarefa.

## 🕒 Retenção de dados (as caixas não ficam para sempre)

- **TTL: 7 dias após a última mensagem** — caixa ativa nunca expira; abandonada é apagada;
- Duas camadas: (1) abrir caixa vencida apaga-a na hora; (2) GitHub Action `Limpeza de caixas antigas` varre o banco **todo dia** e remove as vencidas;
- **Privacidade por design**: instruções executadas são lixo — aqui elas se autodestroem;
- Para mudar o prazo: `TTL_DIAS` no `index.html` + variável no workflow.

## 🔒 Segurança e isolamento

- **Nenhum segredo no site** — a proteção vem das regras do banco, não de tokens (nada pra vazar);
- **Quem tem o código, acessa a caixa** — códigos são de 8 caracteres sem letras ambíguas (praticamente impossível adivinhar); trate o link como chave da sua caixa;
- **Caixas não se misturam** — cada código é um nó isolado; blocos, visto e memória nunca cruzam;
- Não escreva segredos (senhas, chaves de API) nos blocos — use referências ("use a chave do meu arquivo X").

## 📄 Arquivos

| Arquivo | O que é |
|---|---|
| `index.html` | O site inteiro (home, painel visual, terminal, lógica Firebase) |
| `.nojekyll` | Acelera o Pages |

---

Feito para a tarefa **"Comunicação com agentes sem interrompê-los"** — para dúvidas ou ajustes, abra uma issue. 📬
