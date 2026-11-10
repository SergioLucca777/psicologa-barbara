# psibarbaramartini — landing page

Landing page da psicóloga Bárbara Martini (CRP-SC 12/22106), Itajaí – SC.
Conteúdo extraído do site atual (psibarbaramartini.com.br) e reorganizado; nada de dado inventado.

## Estrutura

```
index.html            landing (3 direções de composição selecionáveis por ?v=a|b|c, padrão a)
agendar.html          página de agendamento — destino de TODOS os botões "Agende sua consulta"
assets/css/base.css   sistema: cor, tipografia, componentes, responsivo
assets/css/variants.css  composições A (tapeçaria), B (gravura), C (serena)
assets/css/fonts.css  @font-face self-hosted (Newsreader + Instrument Sans)
assets/fonts/         woff2 (sem CDN)
assets/img/           foto da Bárbara (jpg/webp), recorte da tapeçaria, favicon
assets/js/site.js     menu mobile, revelação das seções, seletor ?v=
shots/                prints de verificação
preview/              prints prontos para envio
```

## Pré-visualizar

```bash
cd /root/psicologa-barbara
python3 -m http.server 8811 --bind 127.0.0.1
# http://127.0.0.1:8811/index.html?v=a
```

Abrir como `file://` não carrega as webfonts — usar HTTP.

## Identidade visual

```
brand/
  identidade.png            prancha oficial: paleta + tipografia (sem logo)
  sheet.html                fonte da prancha
  logo-bm-creme.png         monograma BM em creme (fundo escuro) — usado no cabeçalho
  logo-bm-marinho.png       monograma BM em marinho (fundo claro)
  logo-completo-creme.png   BM + "BÁRBARA MARTINI" + "PSICOLOGIA" (creme)
  logo-completo-marinho.png mesma assinatura em marinho
  _arquivo-v1/              primeira proposta (arco + bm), descartada
```

Tipografia:

- **Cormorant Garamond** (display, títulos) — embutida em `assets/fonts/cormorant-*.woff2`, SIL OFL.
- **Acumin Variable Concept** (interface) — licenciada Adobe. O CSS pede Acumin primeiro e cai em
  Instrument Sans quando ela não está disponível. Para servir de verdade, usar kit do Adobe Fonts
  e trocar a `font-family` em `--sans`.
- **Newsreader Italic** — só na palavra em itálico da headline (`--serif-italic`).

O logo no cabeçalho é PNG (recortado da arte original, fundo removido). Em 29 px ele fica nítido em
telas 2x/3x; o favicon usa o monograma em 16/32 px com traço levemente engrossado.

## Paleta (contraste calculado)

- terracota `#A94E2B` — campo principal, creme `#F7F1E6` a 4.9:1
- terracota profundo `#8A3B1E` — bandas, creme a 6.9:1
- terracota tinta `#6E2E16` — rodapé, creme a 8.0:1
- oliva `#2C3527` — seção do consultório, creme a 11.3:1
- creme `#F7F1E6` / creme-2 `#EFE4D2`
- texto secundário `#615549` sobre creme a 6.3:1

## Conteúdo

Tudo extraído do site atual: textos, formação, CRP, telefone, Instagram, FAQ,
endereço completo (R. Antônio Manoel Moreira, 111 · Fazenda · Itajaí – SC ·
88301-640) e as fotos do consultório (sala de espera, sala de atendimento e
recepção). O site não publica valores nem grade de horários — informa apenas
"consulte horários e valores com a equipe", que é como está na página.

## Pendente de confirmação

- Valores e grade de horários (se quiserem publicar)
- Link do Instagram e número de WhatsApp conferidos na origem

## Verificação feita

- webfonts carregadas (10 faces, subset latin)
- overflow horizontal = 0 em 1440×900, 1280×800, 390×844
- dobra: hero 784 px em 1280×800 e 807 px em 1440×900
- prints em `preview/`

## Duas versões de cor

O mesmo HTML serve as duas paletas; a troca é um atributo no `<html>` (`data-theme="azul"`).

- Terracota (padrão): https://169.58.180.200/psi/
- Azul `#006F9A`: https://169.58.180.200/psi/?tema=azul
- Marinho `#2F3B5D`: https://169.58.180.200/psi/?tema=marinho

O parâmetro `?tema=azul` é aplicado antes do primeiro paint (script inline no `<head>`),
então não há flash de cor errada, e é propagado para os links internos pelo `site.js`.
Cores do tema em `assets/css/base.css`, bloco final `html[data-theme="azul"]`.

### Publicar

    /root/psicologa-barbara/deploy.sh

Copia para `/srv/psi`, servido pelo nginx em `/psi/` (mesmo server do SaaS, porta 443).

## Editar e ver localmente (Windows)

1. Baixe o `psicologa-barbara.bundle` e, na pasta onde quiser o projeto:

```
git clone psicologa-barbara-20261106.bundle psicologa-barbara
cd psicologa-barbara
```

2. Abra a pasta no editor (VS Code: *File → Open Folder*).
3. Duplo clique em **`abrir-local.bat`** → abre `http://localhost:8080` no navegador.
   Sem Python? No VS Code, instale a extensão **Live Server** e clique com o botão direito
   em `index.html` → *Open with Live Server* (recarrega sozinho ao salvar).
4. Edite, salve, aperte **F5** no navegador.

### Onde mexer

| O que | Arquivo |
|---|---|
| Textos, seções, títulos | `index.html` |
| Página do WhatsApp | `agendar.html` |
| Cores (paleta marinho `#2F3B5D`) | `assets/css/base.css` → bloco `html[data-theme="marinho"]` |
| Tamanhos, espaçamentos, grids | `assets/css/base.css` (`:root` no topo) |
| Foto do topo | `assets/img/hero-3.jpg` (trocar o arquivo mantendo o nome) |
| Fontes | `assets/fonts/` + `assets/css/fonts.css` |

O site é estático: nenhum build, nenhum `npm install`. Salvar o arquivo é o suficiente.

### Publicar de volta no servidor

`./publish.sh` (na VPS) copia para `/srv/psi`; `./unpublish.sh` tira do ar.
