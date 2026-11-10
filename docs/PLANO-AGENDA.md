# Agenda de pacientes — pesquisa e plano

> Documento de decisão. Escrito em 06/11/2026 para o site da Bárbara Martini (Itajaí/SC).
> Nada aqui foi implementado ainda.

## 1. Objetivo

Dar à Bárbara uma agenda que:

1. **Mostra disponibilidade real** — respeitando o que já está na agenda dela no Google.
2. **Deixa o paciente marcar sozinho** o primeiro atendimento (sem trocar 15 mensagens).
3. **Gerencia sessões** — confirmar, remarcar, cancelar, marcar falta, criar série semanal.
4. **Escreve no Google Calendar** — o compromisso aparece para ela no celular como qualquer outro.
5. **Guarda o mínimo de dado sensível** — só o necessário para agendar e contatar.

Fora do escopo desta fase: prontuário/evolução clínica, pagamento online, videoconferência própria
(usamos o Meet do Google), aplicativo.

## 2. O que a pesquisa mostrou

### 2.1 Integração com Google Calendar — três caminhos, e só um serve

| Caminho | Como funciona | Problema |
|---|---|---|
| **Service account + compartilhar a agenda** | Cria um "robô" no Google Cloud, ela compartilha o calendário com o e-mail do robô, o sistema escreve com a chave JSON. Sem login, sem expiração. | O Google **bloqueia convidar participantes** com service account: `403 forbiddenForServiceAccounts — "Service accounts cannot invite attendees without Domain-Wide Delegation of Authority"`. Isso só existe em Google Workspace. Resultado: o evento é criado, mas o paciente não recebe convite do Google. |
| **OAuth com a conta dela, app em "Testing"** | Fluxo normal de autorização, guarda o `refresh_token`. | Em "Testing" o Google **expira o refresh token em 7 dias** — ela teria que reconectar toda semana, para sempre. Inviável. |
| **OAuth com a conta dela, app "In production" não verificado** ✅ | Mesmo fluxo, mas publicado. O Google mostra uma tela de aviso ("app não verificado") **uma vez**, e o token vale por tempo indeterminado. Limite de 100 usuários — usamos 1. | A tela de aviso assusta na primeira vez. Se um dia o Google exigir verificação, dá para migrar. |

**Decisão: OAuth publicado e não verificado**, escopo mínimo `calendar.events` (+ `calendar.freebusy`).
Se a Bárbara tiver **Google Workspace** (e-mail @psibarbaramartini.com.br no Google), o caminho vira
"Internal" e nem a tela de aviso aparece.

### 2.2 Não espelhar a agenda, consultar na hora

Duas abordagens possíveis:

- **Espelhar** os eventos do Google no banco, sincronizando por *push notifications* (`watch`).
  Problema: canais expiram a cada 7 dias (precisa renovar), chegam fora de ordem, e qualquer
  divergência gera horário fantasma — o pior erro possível numa agenda médica.
- **Consultar na hora** (`freeBusy.query`) toda vez que alguém abre a grade de horários ou confirma.

**Decisão: consultar na hora.** O Google é a fonte da verdade da disponibilidade; o banco guarda só
os agendamentos feitos pelo site (para status, histórico, lembretes e dinheiro). A grade é calculada:
`regras de disponibilidade − freebusy − agendamentos pendentes no banco`.

Risco de dupla reserva (duas pessoas clicando no mesmo horário) é resolvido no banco, não no Google:
índice único em `(starts_at)` para eventos ativos + transação. Quem chega segundo recebe `409` e a
grade recarrega.

### 2.3 Criar sala de vídeo

`events.insert` com `conferenceDataVersion=1` e `conferenceData.createRequest.requestId` gera um link
do **Google Meet** automaticamente, devolvido em `hangoutLink`. Sem Zoom, sem Jitsi, sem custo extra.

### 2.4 LGPD e sigilo profissional

- Dado de saúde é **dado pessoal sensível** (LGPD art. 5º, II). A base legal para tratá-lo no
  atendimento é a **tutela da saúde por profissional de saúde** (art. 11, II, "f") — não depende de
  consentimento para o ato clínico, mas continua exigindo finalidade, segurança e transparência.
- Agenda, nome, telefone e e-mail já são dados pessoais comuns; o **motivo da consulta** é o ponto
  sensível. Regra: campo livre, criptografado, **nunca** em e-mail, notificação ou log.
- **Prontuário**: Resolução CFP 001/2009 exige registro documental com guarda mínima de **5 anos**
  (prontuário em papel ou informatizado). Consequência para o sistema: agendamentos e histórico não
  podem ser apagados de verdade a pedido do paciente enquanto o prazo legal de guarda valer —
  a exclusão vira anonimização, e isso precisa estar escrito no aviso de privacidade.
- **Transferência internacional** (LGPD art. 33): a VPS atual fica na **França**. Guardar nome,
  telefone e relato de paciente brasileiro em servidor estrangeiro é transferência internacional de
  dado sensível — juridicamente possível, mas exige justificativa e cláusulas. É o ponto mais frágil
  de rodar a agenda no servidor que já temos. Ver §11.

### 2.5 Alternativas prontas (e por que não)

- **Calendly / Cal.com na nuvem**: resolve em 1 dia, mas joga o agendamento para fora do site, cobra
  por assento, o paciente vê marca de terceiro, e os dados saem do controle dela. Bom plano B.
- **Cal.com auto-hospedado**: completo (remarcação, pagamento, lembretes, Google), mas é uma aplicação
  Next.js + Postgres + Prisma inteira para manter, exige 4 GB de RAM, o OAuth do Google é configurado
  do mesmo jeito, e a UI não acompanha o site. Manutenção desproporcional para 1 profissional.

**Decisão: módulo próprio**, pequeno, dentro do stack que já sabemos manter (Node + Postgres + HTML).

## 3. Arquitetura proposta

```
site estático (nginx /psi)          API (Node fastify)              Postgres
  ├ index.html                        ├ /api/slots      → freebusy + regras
  ├ agendar.html  ───────────────▶    ├ /api/bookings   → cria evento
  └ /agenda/ (painel da Bárbara)      ├ /api/appointments (admin)
                                      ├ /api/intake     → pedido de 1º atendimento
                                      └ cron 15min      → lembretes 24h
                                            │
                                            ▼
                                    Google Calendar API (OAuth dela)
```

- **Serviço separado do site**, em `127.0.0.1:3030`, atrás do mesmo nginx (`/api/` e `/agenda/`).
- **Postgres** em Docker (o mesmo padrão do `saas-anonimo`), base `psi_agenda`.
- **Sem framework pesado**: Fastify + `pg` + `googleapis`. Sem ORM (SQL direto é menor e auditável).
- **Painel** em HTML/CSS/JS puro, reaproveitando `base.css` (mesma paleta marinho).

## 4. Modelo de dados

```sql
-- pacientes
create table patients (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  email citext unique,
  telefone text,
  nascimento date,
  modalidade_pref text check (modalidade_pref in ('presencial','online')),
  consent_versao text,            -- versão do aviso aceito
  consent_at timestamptz,
  observacoes_enc bytea,          -- AES-256-GCM, opcional
  criado_em timestamptz default now(),
  anonimizado_em timestamptz
);

-- pedidos de primeiro atendimento (antes de virar paciente)
create table intake_requests (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (length(nome) between 2 and 120),
  email citext not null,
  telefone text,
  modalidade text check (modalidade in ('presencial','online')),
  motivo_enc bytea,               -- sensível: criptografado, nunca em e-mail/log
  disponibilidade text,           -- "terças à tarde", texto curto
  status text default 'novo' check (status in ('novo','aprovado','recusado','expirado')),
  criado_em timestamptz default now(),
  expira_em timestamptz default now() + interval '90 days'
);

-- sessões
create table appointments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references patients(id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  modalidade text not null check (modalidade in ('presencial','online')),
  status text not null default 'pendente' check (status in
    ('pendente','confirmado','realizado','faltou','cancelado_paciente','cancelado_clinica')),
  origem text not null default 'site' check (origem in ('site','painel')),
  google_event_id text,
  meet_link text,
  serie_id uuid,                  -- agrupa sessões semanais
  observacao_enc bytea,
  criado_em timestamptz default now(),
  atualizado_em timestamptz default now()
);
-- impede duas sessões ativas no mesmo horário (o banco decide, não o Google)
create unique index appointments_slot_ativo
  on appointments (starts_at)
  where status in ('pendente','confirmado','realizado');

-- janela semanal de atendimento
create table availability_rules (
  id serial primary key,
  weekday smallint not null check (weekday between 0 and 6),  -- 0=domingo
  hora_inicio time not null,
  hora_fim time not null,
  duracao_min int not null default 50,
  buffer_min int not null default 10,
  modalidade text check (modalidade in ('presencial','online')),
  vigente_de date, vigente_ate date
);

-- bloqueios (férias, congresso, almoço)
create table blocks (
  id serial primary key,
  inicio timestamptz not null, fim timestamptz not null, motivo text
);

-- e-mails/lembretes enviados (idempotência e auditoria)
create table messages (
  id uuid primary key default gen_random_uuid(),
  tipo text not null, destinatario citext not null,
  appointment_id uuid references appointments(id) on delete set null,
  status text default 'fila', provider_id text, erro text,
  criado_em timestamptz default now(), enviado_em timestamptz
);

-- auditoria (sem PII no payload)
create table audit_log (
  id bigserial primary key, ator text, acao text, entidade text, entidade_id uuid,
  ip_hash text, criado_em timestamptz default now()
);
```

## 5. Fluxos

### 5.1 Primeiro atendimento (paciente novo)

1. No site, botão **"Agendar primeira conversa"** → `/agendar` (já existe, vira formulário de 3 passos).
2. Passo 1: modalidade (presencial/online) e turno preferido.
3. Passo 2: grade de horários reais (calculada na hora) — 50 min, antecedência mínima de 12 h,
   janela de 60 dias.
4. Passo 3: nome, e-mail, telefone, "o que te traz aqui" (opcional, criptografado), aceite do aviso.
5. `POST /api/bookings` → cria `appointment` com status **`pendente`** e o `intake_request`.
6. A Bárbara **aprova no painel** (1 clique) → aí sim cria o evento no Google, manda e-mail com `.ics`
   e (se online) o link do Meet.
   *Por que pendente e não automático:* corta 90% das reservas falsas e dá a ela controle do primeiro
   contato — que é decisão clínica, não logística.

### 5.2 Sessão recorrente (paciente em acompanhamento)

- No painel: paciente → "criar série" (dia, hora, N semanas) → cria N eventos no Google de uma vez
  (`events.insert` em loop com `serie_id`).
- Cada evento futuro pode ser cancelado individualmente sem quebrar a série.

### 5.3 Remarcar / cancelar (paciente)

- Link assinado no e-mail (sem login): `?t=token` válido por 72 h, gerado por sessão.
- Regra: até **24 h antes** pode remarcar sozinho; depois disso, só pelo WhatsApp (a página mostra a
  política e o botão).
- Remarcar = `events.patch` no mesmo evento (mantém o ID, o paciente não perde a referência).

### 5.4 Painel da Bárbara (`/agenda/`)

- **Hoje**: lista do dia com botões *Compareceu / Faltou / Cancelar*.
- **Semana**: grade com os blocos livres e ocupados (vindos do freebusy).
- **Pedidos**: fila de primeiros atendimentos (aprovar / recusar / propor outro horário).
- **Disponibilidade**: editor da janela semanal + bloqueios (férias).
- **Pacientes**: lista, histórico de sessões, exportar dados (LGPD), anonimizar.
- Login: e-mail + senha (argon2) + código TOTP opcional; sessão em cookie `HttpOnly; Secure; SameSite=Lax`.

### 5.5 Falta de energia / Google fora do ar

Se o `freeBusy` falhar, a grade pública **não** mostra horários e exibe "agendamento indisponível no
momento, fale no WhatsApp" — nunca chutar disponibilidade.

## 6. Regras de negócio (valores iniciais, todos configuráveis)

| Regra | Valor |
|---|---|
| Duração da sessão | 50 min |
| Intervalo entre sessões | 10 min |
| Antecedência mínima | 12 h |
| Janela de agendamento | 60 dias |
| Limite por paciente | 1 sessão ativa por dia |
| Cancelamento sem custo | até 24 h antes |
| Lembrete | e-mail 24 h antes |
| Fuso | America/Sao_Paulo |
| Primeiro atendimento | sempre passa por aprovação |
| Modalidade | presencial ou online, escolhida pelo paciente |

## 7. Notificações

- **E-mail** é o canal principal (o paciente já usa e-mail para tudo, e o `.ics` cai no calendário dele).
  - Provedor: SMTP da própria conta (app password) no início; se o volume/entregabilidade incomodar,
    migrar para Resend/SES com o domínio `psibarbaramartini.com.br` autenticado (SPF/DKIM/DMARC).
  - Templates: confirmação (com `.ics`), lembrete 24 h, cancelamento, remarcação.
- **Nunca** incluir motivo da consulta em qualquer mensagem — só data, hora, modalidade e link.

### 7.1 WhatsApp — três caminhos (pesquisa de 06/11/2026)

| Caminho | Como funciona | Custo | Risco | Prazo |
|---|---|---|---|---|
| **A. Cloud API oficial, número dedicado** ✅ | Um chip novo vira o número da clínica; o sistema envia templates aprovados (confirmação, lembrete) e recebe respostas. O número antigo dela continua no app, para conversa pessoal. | R$ 0,035 por mensagem utility/serviço (Brasil, tarifa Meta desde 01/10/2026) | nenhum risco de ban | 3–10 dias de aprovação |
| **B. Coexistence (mesmo número no app + API)** | Meta permite o mesmo número rodar no WhatsApp Business app e na Cloud API ao mesmo tempo. Exige **BSP** (não dá para fazer direto), app ≥ 2.24.17, número com histórico real, e **desliga** etiquetas/respostas rápidas/catálogo. O app precisa ser aberto a cada 14 dias. | mesmo preço por mensagem + fee do BSP | médio (depende de parceiro) | 1–3 semanas |
| **C. Sem API: "clique para enviar"** | O painel monta a mensagem e abre o `wa.me` com texto pronto; ela toca em enviar. Usa o WhatsApp Business app com respostas rápidas. | R$ 0 | nenhum | 1 dia |

**Nunca**: Baileys / whatsapp-web.js / Evolution API auto-hospedada. O protocolo Web é bloqueado em IP
de datacenter (já testamos isso no `saas-anonimo`: handshake barrado nesta VPS), e o risco de banir o
número principal da clínica não se paga.

**Recomendação**: **C agora, A quando a agenda estiver rodando.** O "clique para enviar" cobre os
primeiros meses sem custo nem aprovação; a Cloud API entra quando houver volume que justifique
automatizar (a partir de ~20 sessões/semana).

### 7.2 O que a Cloud API exige (caminho A)

1. **Meta Business Portfolio** + verificação do negócio (CNPJ ou CPF com comprovante; nome de exibição
   tipo "Bárbara Martini · Psicóloga").
2. **Número dedicado** que receba SMS ou chamada (chip pré-pago serve). Não pode estar em uso no
   WhatsApp comum.
3. **2–3 templates utility aprovados** (leva de horas a 2 dias):
   - `confirmacao_sessao` — "Olá {{1}}, sua sessão de {{2}} às {{3}} está confirmada. Qualquer mudança, responda esta mensagem."
   - `lembrete_sessao` — "Lembrete: sessão amanhã, {{1}} às {{2}}. Responda 1 para confirmar ou 2 para remarcar."
   - `cancelamento_sessao` — "Sua sessão de {{1}} às {{2}} foi cancelada. Para remarcar, acesse {{3}}."
4. **Opt-in** registrado no formulário do site: "aceito receber confirmações e lembretes por WhatsApp".
5. **Webhook** público em HTTPS (`/api/whatsapp/webhook`), com verificação de assinatura.

### 7.3 Custo real

| Volume | Mensagens/mês | Custo Meta |
|---|---|---|
| 20 sessões/semana | ~170 (confirmação + lembrete + eventuais) | **~R$ 6** |
| 40 sessões/semana | ~340 | **~R$ 12** |

Respostas de serviço têm franquia de 1.000/mês por número; acima disso, mesma tarifa.

### 7.4 Automação de atendimento (o "robô" de triagem)

Com a Cloud API ligada, o webhook vira uma máquina de estados simples:

```
paciente escreve
   ├─ 1 → quero agendar        → link do site com modalidade pré-marcada
   ├─ 2 → já sou paciente      → link assinado de remarcar/cancelar
   ├─ 3 → valores/endereço     → resposta fixa aprovada
   └─ 4 → falar com a Bárbara  → marca como humano, notifica ela no painel
```

Guardrails obrigatórios:

- o robô **nunca** pergunta sintoma, diagnóstico ou "o que você está sentindo" — isso é dado sensível
  e não deve trafegar por plataforma de terceiro;
- depois de 2 tentativas sem entender, **passa para humano** (não insiste);
- fora da janela de 24 h, só template aprovado; dentro dela, texto livre;
- toda mensagem enviada fica registrada em `messages` (tipo, template, status, id da Meta) para
  auditoria e reenvio.

Esforço: 3–4 dias de código depois da agenda pronta + o tempo de aprovação da Meta.

## 8. LGPD / sigilo — o que o sistema precisa cumprir

1. **Aviso de privacidade** curto na etapa 3, com versão e timestamp gravados em `patients.consent_*`.
2. **Minimização**: nome, e-mail, telefone e (opcional) motivo. Sem CPF, sem endereço, sem convênio.
3. **Criptografia**: motivo/observações em AES-256-GCM com chave em `.env` (fora do banco);
   Postgres com volume cifrado (LUKS) já é o padrão da VPS.
4. **Retenção**: agendamentos por 5 anos (CFP 001/2009); `intake_requests` não convertidos expiram em
   90 dias; exclusão a pedido vira anonimização, com registro.
5. **Direitos do titular**: botão "exportar meus dados" (JSON) e "solicitar exclusão" no painel.
6. **Logs**: sem nome, sem e-mail, sem motivo. IP só como hash.
7. **Acesso**: uma única conta (a dela) + registro de auditoria de tudo que é alterado.
8. **Transferência internacional**: declarar no aviso de privacidade, ou mover a API para VPS no Brasil
   (§11).

## 9. Segurança

- TLS obrigatório (já temos cert), HSTS.
- Rate limit por IP nas rotas públicas (`/api/slots`, `/api/bookings`, `/api/intake`): 30 req/min.
- Honeypot + tempo mínimo de preenchimento no formulário (anti-bot sem captcha).
- ID de agendamento em link é UUID + token HMAC (não sequencial, não adivinhável).
- `POST /api/bookings` idempotente por `Idempotency-Key` (evita duplicar em duplo clique).
- Sem PII em query string (o token do link é opaco).
- Backup diário `age` (o mesmo timer que já roda) incluindo o dump do Postgres.
- Segredos só em `.env` na VPS; nunca no repositório.

## 10. Fases

### Fase 0 — Spike (meio dia)
Provar o caminho crítico antes de escrever o produto:
1. Criar projeto no Google Cloud, OAuth client, publicar (não verificado).
2. Conectar a conta de teste, criar 1 evento com Meet e 1 convite.
3. Rodar `freeBusy` e confirmar que respeita evento criado à mão.
Saída: `docs/spike-google.md` com o passo a passo de tela (vira o manual dela).

### Fase 1 — MVP (≈2 semanas)
- `api/` (Fastify + pg), migrações SQL, rotas `/slots`, `/bookings`, `/intake`.
- Fluxo de primeiro atendimento no site + aprovação no painel.
- Criação/cancelamento de evento no Google, e-mail de confirmação com `.ics`.
- Painel mínimo: hoje, pedidos, disponibilidade.

### Fase 2 — Operação (≈1 semana)
- Remarcação por link, lembretes 24 h (cron), série semanal, bloqueios, exportar/anonimizar.
- Métricas simples: sessões realizadas, faltas, taxa de conversão de pedidos.

### Fase 3 — Extras (depois de usar)
- WhatsApp Cloud API, pagamento (PIX), lista de espera, relatório mensal, NPS pós-sessão.

## 11. Decisão pendente mais importante: onde os dados moram

O site é estático, não guarda nada — pode continuar na VPS na França sem problema.

A **agenda** guarda nome, telefone e relato de paciente. Rodar isso fora do Brasil é transferência
internacional de dado sensível (LGPD art. 33): permitido, mas exige base legal, cláusulas e
transparência no aviso. Três caminhos:

| Opção | Custo | Esforço | Risco |
|---|---|---|---|
| **A. Manter na VPS atual (França)** | R$ 0 | nenhum | exposição regulatória; exige justificar no aviso |
| **B. API em VPS no Brasil, site fica onde está** | ~R$ 40–70/mês | médio (novo host, mesmo deploy) | menor risco, arquitetura dividida |
| **C. Cloud BR (Magalu/Neon São Paulo)** | ~R$ 50–120/mês | médio | Postgres gerenciado com backup, mais simples de operar |

Recomendação: **B** — a API e o Postgres no Brasil, o site estático continua onde está (é só HTML).
Mantém o custo baixo, resolve o art. 33 e não mexe no que já funciona.

## 12. Custos mensais estimados

| Item | Custo |
|---|---|
| Google Calendar API | R$ 0 (quota gratuita: 1M consultas/dia) |
| E-mail (SMTP da conta) | R$ 0 até ~500/dia |
| Domínio | já pago |
| VPS Brasil (opção B) | R$ 40–70 |
| WhatsApp (fase 3) | ~R$ 0,05–0,35 por mensagem |
| **Total fase 1–2** | **R$ 0–70/mês** |

## 13. Riscos

| Risco | Impacto | Mitigação |
|---|---|---|
| Google exigir verificação do app | agendamento para | plano B: service account sem convites (e-mail próprio) |
| Refresh token revogado (ela troca a senha) | para de criar evento | alerta no painel + botão "reconectar Google" |
| Dupla reserva | constrangimento | índice único + `409` |
| E-mail caindo em spam | paciente não recebe | domínio próprio + SPF/DKIM; `.ics` como plano B |
| No-show alto | prejuízo | aprovação do 1º contato + lembrete 24 h + política escrita |
| Dado sensível vazar | dano grave | criptografia de campo, logs limpos, backup cifrado, 2FA no painel |
| Ela não adotar o painel | volta pro WhatsApp | painel de 1 tela, mobile-first, e o Google Calendar continua sendo a verdade |

## 14. Critérios de aceite (testes que provam que funciona)

1. Dois `POST /api/bookings` simultâneos no mesmo horário → **1×201 e 1×409**.
2. Evento criado aparece no Google em < 2 s, com `hangoutLink` quando online.
3. Cancelar no site remove do Google (`events.delete`) e o paciente recebe e-mail.
4. Bloqueio criado no painel some da grade pública em < 1 s.
5. Evento criado à mão no Google (ex.: dentista) **desaparece** da grade pública.
6. E-mail de confirmação abre o `.ics` no Gmail e no Outlook.
7. Remarcação com < 24 h é recusada com mensagem clara.
8. Nenhum log contém nome, e-mail ou motivo (grep no arquivo de log).
9. Exportar dados de um paciente devolve JSON completo; anonimizar remove PII e mantém os registros
   contábeis.
10. Painel recusa login sem TOTP quando ativado.

## 15. Decisões — status em 06/11/2026

| # | Decisão | Status |
|---|---|---|
| 1 | Modalidade | ✅ **Presencial e online** — o paciente escolhe; online gera Meet |
| 2 | Duração | ✅ **50 min** como regra; primeira sessão igual |
| 3 | Dias e janelas | ⏳ **a definir** — o sistema começa em modo derivado (§5.6), sem precisar configurar |
| 4 | Cancelamento | ⏳ a definir (padrão proposto: 24 h) |
| 5 | Conta Google | ⏳ não vincular agora — só planejamento |
| 6 | E-mail de saída | ⏳ a definir |
| 7 | Onde moram os dados | ⏳ decidir antes do deploy (recomendação: opção B do §11) |
| 8 | Primeiro atendimento | ⏳ recomendação: aprovação manual

### 5.6 Modo derivado (para quando não há janela definida)

Enquanto ela não definir os dias/horas, a disponibilidade é **derivada do próprio calendário**:

1. Janela padrão de busca: seg–sex, 08h–19h, próximos 60 dias.
2. `freeBusy` diz o que está ocupado; o resto vira candidato.
3. Descarta slots que não cabem (50 min + 10 de intervalo), os com menos de 12 h de antecedência,
   e os que já têm agendamento ativo no banco.
4. Só publica um horário se ele aparecer livre **duas vezes** em dias diferentes na mesma semana
   (evita oferecer um buraco isolado que ela não quer usar).

Quando ela definir a janela real, o modo derivado é desligado com um interruptor no painel — sem
mexer em código. Isso permite lançar antes de ela decidir os horários.

## 16. Fontes

- Google Calendar API — `events.insert` (parâmetros `conferenceDataVersion`, `sendUpdates`):
  https://developers.google.com/workspace/calendar/api/v3/reference/events/insert
- Google Calendar API — `freebusy.query`: https://developers.google.com/workspace/calendar/api/v3/reference/freebusy/query
- Escopos do Calendar: https://developers.google.com/workspace/calendar/api/auth
- Bloqueio de convite por service account (`forbiddenForServiceAccounts`):
  https://stackoverflow.com/questions/60760959/google-calendar-api-service-account-error
- Expiração de 7 dias do refresh token em "Testing":
  https://support.google.com/cloud/answer/10311615/setting-up-your-oauth-consent-screen
- Comportamento de app "In production" não verificado (aviso + limite de 100 usuários):
  https://developers.google.com/identity/protocols/oauth2/production-readiness/overview
- Resolução CFP 001/2009 (registro documental, guarda mínima de 5 anos):
  https://site.cfp.org.br/wp-content/uploads/2009/04/resolucao2009_01.pdf
- Orientações CFP sobre prontuário (papel e informatizado):
  https://transparencia.cfp.org.br/wp-content/uploads/sites/12/2021/06/162223291760b14f55c5181.pdf
- LGPD, dados sensíveis e tutela da saúde (art. 11, II, "f"):
  https://somapsico.com/guias/lgpd-para-psicologos
- Cal.com self-hosted + OAuth próprio (alternativa descartada):
  https://cal.com/docs/self-hosting/apps/install-apps/google

## 17. Como funciona, na prática (para planejar)

### O que acontece uma única vez (≈20 min, precisa da conta Google dela)

1. Criar um projeto no **Google Cloud** (grátis, sem cartão).
2. Ativar a **Calendar API** nesse projeto.
3. Criar um **cliente OAuth** (tipo "Web") apontando para `https://psibarbaramartini.com.br/api/google/callback`.
4. **Publicar** o app (fica "não verificado" — é o que evita o token de 7 dias).
5. Ela clica em **"Conectar agenda"** no painel, faz login no Google e autoriza ver/editar eventos.
6. O sistema guarda um **refresh token** criptografado. A partir daí age em nome dela sem novo login.

Nada disso precisa acontecer agora: o sistema pode ser construído inteiro com um calendário falso
(mock) e o Google entra só no fim, em 20 minutos. E é reversível — ela pode revogar o acesso em
`myaccount.google.com/permissions` a qualquer momento.

### O ciclo de um agendamento

```
Paciente                         Sistema                          Google
   │                               │                               │
   ├─ abre /agendar ──────────────▶│                               │
   │                               ├─ freeBusy (60 dias) ─────────▶│  (só "ocupado", sem título)
   │                               │◀──── intervalos ocupados ─────┤
   │◀── grade: 50 min, 10 de pausa ┤                               │
   ├─ escolhe horário + dados ────▶│  grava appointment (pendente)  │
   │◀── "recebido, aguarde confirmação"                             │
   │                               │                               │
   │            (Bárbara aprova no painel)                         │
   │                               ├─ events.insert ──────────────▶│  evento + Meet + convite
   │◀── e-mail com .ics ───────────┤                               │
   │                               │                               │
   │        24 h antes: cron envia lembrete                        │
   │                               │                               │
   │  (depois da sessão) ela marca compareceu/faltou no painel     │
```

### O que a Bárbara vê

- **No celular, no Google Calendar**: a sessão como qualquer compromisso — "Sessão · Ana P.",
  com o link do Meet quando online. Ela pode arrastar, editar, colocar cor.
- **No painel do site**: o dia de hoje com botões *compareceu / faltou / cancelar*; a fila de pedidos
  de primeiro atendimento; o editor de disponibilidade.
- Se ela **arrastar** um evento no Google, o painel se corrige ao abrir (o sistema relê o evento pelo
  ID e atualiza o horário no banco). O Google manda no horário; o sistema manda no status.

### O que o paciente vê

- Grade de horários reais (não uma lista fixa), confirmação por e-mail com arquivo de calendário,
  lembrete 24 h antes, e um link para remarcar/cancelar até 24 h antes.
- Online: link do Meet no e-mail e no evento. Presencial: endereço do Espaço Singular.

### O que o Google **não** entrega ao sistema

- `freeBusy` devolve só os **intervalos ocupados** — nunca o título, o convidado ou a descrição dos
  compromissos pessoais dela. O sistema sabe "14h–15h ocupado", não "dentista".
- Nenhum dado de paciente vai para o Google além do que já é necessário: primeiro nome no título,
  e-mail do paciente como convidado (opcional — pode ser desligado, e aí o convite sai só por e-mail
  nosso).

### Limites conhecidos

| Limite | Efeito | Contorno |
|---|---|---|
| Paciente sem e-mail | não recebe confirmação automática | confirmar por WhatsApp manual |
| Ela revoga o acesso / troca a senha do Google | para de criar evento | aviso no painel + botão "reconectar" |
| Google fora do ar | grade não aparece | mostra "agende pelo WhatsApp" — nunca chuta horário |
| App não verificado | tela de aviso uma vez | documentar com print no manual dela |
| VPS na França | transferência internacional (LGPD art. 33) | opção B do §11 |

### Ordem de construção (o que dá para fazer sem o Google)

1. Modelo de dados + rotas com **calendário mock** (lista fixa de horários).
2. Fluxo do paciente + painel + e-mails.
3. Troca do mock pelo Google (20 min de configuração + ~1 dia de código).
