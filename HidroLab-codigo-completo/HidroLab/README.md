# HidroLab — protótipo 01

Aplicativo estático de treinamento em português. `dist/index.html` é a entrada.

## O que funciona
- Esquema original SY750H PRO, fornecido pelo usuário, com zoom, arraste, tela cheia e cinco marcadores de regiões.
- Abertura de PDF local no leitor do navegador. O arquivo permanece local, não é enviado nem salvo no servidor; a exibição depende do suporte do navegador a PDF.
- Bancada genérica independente com bomba, seleção de avanço/neutro/recuo, posição animada, ajuste de velocidade e dois sintomas ilustrativos.

## Limites que devem ser preservados
- O circuito didático não corresponde à topologia específica da SY750H. Não declarar que a caçamba da máquina foi mapeada.
- Não calcula pressão/vazão/carga; regulação da bomba e proteção não representadas.
- Os marcadores identificam regiões, não conexões validadas ou componentes individualizados.
- Novo PDF não ganha simulação automática. Seu mapeamento permanece trabalho futuro.
- Nenhum recurso de persistência, OCR, API de IA ou backend foi implementado.

## Próxima etapa
Validar com o instrutor as portas e conexões de uma função da máquina; criar um modelo topológico separado da imagem e vincular estados e trajetos verificados.

## Verificação desta versão
JavaScript verificado com node --check; IDs HTML e referências a ativos conferidos. Ambiente de preview gerenciado não suporta site estático, sem ensaio visual em navegador nesta entrega.

## Publicar na Vercel
Importe `vinisalves76-glitch/simuladorhidraulica`. Use a branch `main`, diretório raiz do repositório e preset **Other**. O arquivo `vercel.json` define a saída `dist` e dispensa instalação e build. Esta versão não precisa de variáveis de ambiente, banco de dados ou chave de API.

## Executar localmente
Na raiz: `python3 -m http.server 8080 --directory dist`. Abra `http://localhost:8080`.

## Arquivos
- `dist/index.html`: interface.
- `dist/style.css`: estilos responsivos.
- `dist/app.js`: interação e animação.
- `dist/schema.png`: imagem do esquema para marcadores e navegação.
- `dist/sy750h.pdf`: PDF original fornecido pelo usuário.
- `AGENTS.md`: regras de continuidade.
- `docs/HANDOFF.md`: estado atual e próximos passos.

Os arquivos PDF e PNG incluídos ficam acessíveis aos visitantes da hospedagem e do repositório público. PDFs abertos pelo botão da interface ficam somente na sessão local do navegador.
