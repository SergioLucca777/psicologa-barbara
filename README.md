# Bárbara Martini — site

Landing page e página de agendamento da psicóloga **Bárbara Martini** (CRP-SC 12/22106), Itajaí – SC.

Site estático: HTML, CSS e JavaScript puro. **Sem build, sem dependências, sem framework.**
Abrir `index.html` num servidor HTTP local já funciona.

## Estrutura

```
index.html               página principal
agendar.html             página de agendamento (WhatsApp)
assets/css/base.css      tokens, layout, tipografia, componentes
assets/css/motion.css    camada de animação (revelações, arco, progresso)
assets/css/variants.css  variantes A/B/C do hero — só experimento, não é produção
assets/css/fonts.css     @font-face das fontes self-hosted
assets/js/site.js        tema por query string, menu mobile
assets/js/motion.js      IntersectionObserver, revelações, derivas (2 KB, sem lib)
assets/fonts/            Cormorant Garamond, Newsreader itálico, Instrument Sans
assets/img/              fotos, ícones, cartões de preview (og-*.jpg)
brand/                   identidade: SVGs, pranchas, gerador de logo
docs/                    plano de agenda e paleta
deploy.sh                rsync para o servidor (produção, /psi/)
publish-motion.sh        rsync para /psi-motion/
```

## Branches

- `master` — versão atual, com camada de movimento.
- `v1-estatica` — versão anterior, congelada, sem animação. Serve de referência.

## Rodar localmente

```bash
python3 -m http.server 8080
# http://localhost:8080
```

Abrir como `file://` não carrega as webfonts — precisa de HTTP.

No Windows: duplo clique em `abrir-local.bat` (detecta `py` ou `python`).
No VS Code, a extensão **Live Server** também resolve.

## Tipografia

| Papel | Fonte | Licença |
|---|---|---|
| Display, títulos | Cormorant Garamond | SIL OFL — redistribuível |
| Itálico da headline | Newsreader itálico (subconjunto) | SIL OFL — redistribuível |
| Interface | Instrument Sans | SIL OFL — redistribuível |

**Acumin Variable Concept não está no repositório.** É licença Adobe: o CSS pede
`'Acumin Variable Concept'` primeiro e cai para Instrument Sans. Para servir a Acumin de
verdade, é preciso o kit do Adobe Fonts na conta de quem publica.

## Cores

A paleta inteira vive em custom properties no topo de `assets/css/base.css`
(`--creme`, `--creme-2`, `--creme-3`, `--marinho`, `--accent`, `--ink`, `--muted`…).
Nenhuma cor é escrita solta — trocar o tema é trocar o bloco `html[data-theme="..."]`.

| Token | Valor | Uso |
|---|---|---|
| `--creme` | `#F7F1E6` | fundo claro, texto sobre escuro |
| `--creme-2` | `#EFE4D2` | seções alternadas |
| `--marinho` | `#2F3B5D` | hero, CTA, bandas escuras |
| `--marinho-deep` | `#232C47` | hover, banda escura |
| `--marinho-ink` | `#141A2B` | rodapé, texto sobre creme |
| `--muted` | `#565D6E` | parágrafos e legendas |

Contrastes medidos: creme sobre marinho **9,81:1** · tinta sobre creme **15,47:1** ·
apoio sobre creme **4,89:1** (mínimo do arquivo, ainda acima de AA).

## Movimento

`motion.js` faz quatro coisas: revelação linha por linha da headline, revelação de seções
ao entrar na tela, barra de progresso de leitura e deriva da marca d'água. Tudo desliga em
`prefers-reduced-motion`.

**Watchdog:** se o `motion.js` não carregar em 2,5 s, o `<html>` recebe `motion-off` e a
página mostra todo o conteúdo. Sem isso, uma falha de rede deixaria o site em branco —
o CSS esconde as seções até o JS revelá-las.

## Acessibilidade

- axe-core (WCAG 2.1 AA): **zero violações** nas duas páginas.
- Foco de teclado visível em todos os fundos, inclusive o hero escuro (`.on-dark`).
- Alvos de toque ≥ 24 px (WCAG 2.5.8); os principais ≥ 44 px.
- Zero overflow horizontal de 320 px a 1920 px.
- Imagens com `width`/`height` e `loading="lazy"` fora da primeira dobra.

## Publicação

```bash
./publish-motion.sh   # envia para /srv/psi-motion/ (versão com movimento)
./deploy.sh           # envia para /srv/psi/ (produção)
```

O site é servido pelo nginx do servidor, sem Node.

## Conteúdo

O texto é da própria Bárbara. Dados factuais (endereço, CRP, telefone, formação) não são
placeholders — alterar exige confirmação dela.

## Contribuindo

1. Crie a branch a partir de `master`: `git checkout -b feat/nome-curto`
2. Rode `python3 -m http.server 8080` e teste em 390 px e 1440 px.
3. Antes de abrir PR: sem overflow horizontal, foco visível, e `prefers-reduced-motion` funcionando.
4. PR descreve o antes/depois com print nas duas larguras.
