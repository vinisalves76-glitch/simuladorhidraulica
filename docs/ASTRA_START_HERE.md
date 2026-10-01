# ASTRA / NOVA IA - LEIA ANTES DE DESENVOLVER

Este arquivo existe para permitir que outra IA continue o HidroLab sem reconstruir contexto do zero.

## Objetivo do projeto

Transformar o diagrama hidráulico real da SANY SY750H PRO em um **clone digital interativo praticamente 1:1**, capaz de:

1. manter o desenho visual igual ao PDF original;
2. tornar linhas, componentes, portas, textos e junções elementos identificáveis;
3. associar os elementos visuais a um grafo hidráulico real;
4. permitir selecionar uma função da máquina;
5. destacar/anima somente as linhas originais envolvidas naquela função;
6. futuramente permitir falhas, diagnóstico e treinamento interativo.

**O alvo NÃO é redesenhar o circuito com símbolos genéricos.**

O PDF original deve continuar sendo a referência visual.

## Leia nesta ordem

1. `AGENTS.md`
2. `README.md`
3. `docs/PLANO_CLONE_1A1.md`
4. `docs/HANDOFF.md`

## Estado do repositório

- Repositório: `vinisalves76-glitch/simuladorhidraulica`
- Branch de desenvolvimento atual: `feature/mapeamento-funcional`
- Não trabalhar diretamente na `main`.
- Projeto Vercel usado para testes: `simulador`.
- A Vercel cria Preview automaticamente para a branch.
- Variável já esperada na Vercel: `GEMINI_API_KEY`.
- Modelo padrão no backend: `gemini-2.5-flash`.

## Arquivos principais

- `dist/index.html`: interface atual.
- `dist/app.js`: PDF.js, clone, editor, grafo, Gemini e simulador.
- `dist/style.css`: interface.
- `dist/sy750h.pdf`: PDF hidráulico original usado no protótipo.
- `api/analisar-diagrama.js`: análise Gemini em fases.
- `vercel.json`: publicação Vercel.
- `docs/HANDOFF.md`: histórico técnico.
- `docs/PLANO_CLONE_1A1.md`: arquitetura alvo.

## Problema atual

A versão atual consegue:
- renderizar o PDF;
- detectar cores/pixels;
- chamar Gemini;
- pedir inventário, topologia e funções;
- gerar um grafo por cima do PDF;
- animar conexões associadas a uma função.

Porém, **o resultado visual ainda é genérico**.

A IA está gerando componentes abstratos e conexões novas. Isso NÃO é o resultado final desejado.

## Direção correta

Não pedir ao Gemini para redesenhar o diagrama.

O pipeline desejado é:

```
PDF original
  -> extração dos objetos vetoriais/textos
  -> clone SVG/DOM 1:1
  -> cada elemento recebe um ID estável
  -> Gemini interpreta os IDs
  -> grafo hidráulico referencia os próprios IDs visuais
  -> simulação altera apenas o estilo dos elementos originais
```

Exemplo:

```
pdf_path_01842
pdf_path_01843
pdf_text_BOOM_1
pdf_symbol_0038
```

Depois da interpretação:

```
component_boom_1.symbolIds = ["pdf_symbol_0038"]
component_boom_1.port.P.visualAnchor = ...
connection_008.visualPathIds = ["pdf_path_01842", "pdf_path_01843"]
```

Na simulação, NÃO desenhar uma nova linha.

Animar:

```
#pdf_path_01842
#pdf_path_01843
```

## Regra de engenharia

IA = interpretação.

Motor HidroLab = topologia + estado + simulação.

Nunca usar resposta livre de IA para decidir em tempo real por onde o óleo passa.

Depois da validação, o grafo deve funcionar sem depender da IA.

## Regra de precisão

Nunca inventar:
- pressão;
- vazão;
- portas;
- conexão de linhas;
- junção;
- passagem interna de carretel;
- função de válvula.

Itens incertos devem ficar explicitamente como:
- `confidence`;
- `needsValidation: true`;
- evidência visual/textual.

## Rótulos já visíveis no PDF

O PDF fornecido possui, entre outros:

- MANUAL PILOT VALVE (LEFT)
- MANUAL PILOT VALVE (RIGHT)
- FOOT-OPERATED PILOT VALVE
- ARM 1
- ARM 2
- BUCKET OPTION
- BOOM 1
- BOOM 2
- TRAVEL LEFT
- TRAVEL RIGHT
- TRAVEL STRAIGHT
- SWING
- YV2
- YV3
- YV7
- PPC
- Boom Lifting has Priority over Bucket
- Boom Lifting Confluence
- Boom Lowering Throttle
- Arm has Priority over Swing
- High/Low Speed PPC Pilot Switch

Use esses nomes como âncoras semânticas quando realmente correspondem ao elemento detectado.

## Primeira meta para a próxima IA

Não tente resolver todo o circuito funcional de uma vez.

Primeiro entregar um **clone visual interativo 1:1**.

Critério mínimo da primeira etapa:
- abrir o PDF;
- reconstruir a página mantendo aparência;
- cada linha/texto/objeto relevante possuir ID;
- clicar em um elemento deve destacar exatamente aquele elemento original;
- zoom não pode perder alinhamento;
- exportar um JSON com ID, tipo visual e coordenadas.

Depois seguir o plano de `docs/PLANO_CLONE_1A1.md`.

## Não fazer

- Não apagar o PDF original.
- Não substituir o diagrama por símbolos genéricos.
- Não declarar que um caminho é validado só porque a IA sugeriu.
- Não expor `GEMINI_API_KEY` no frontend ou no GitHub.
- Não fazer force push.
- Não alterar `main` diretamente.
- Não remover funcionalidades antigas antes que a nova abordagem esteja validada.
- Não introduzir dependência externa desnecessária sem documentar.

## Ao terminar qualquer etapa

Atualizar `docs/HANDOFF.md` com:

- o que foi alterado;
- arquivos modificados;
- como foi testado;
- o que ainda não funciona;
- limitações conhecidas;
- próximo passo;
- URL do Preview, se disponível.

