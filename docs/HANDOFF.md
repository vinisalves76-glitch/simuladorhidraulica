# Continuidade — HidroLab

Atualizado em 30/09/2026.

## Objetivo
Permitir ao instrutor abrir um esquema hidráulico em PDF, explorar os componentes e evoluir para simular funções reais sobre o desenho.

## Entrega atual
Protótipo estático em HTML/CSS/JavaScript, sem dependências externas. Esquema SY750H com cinco marcadores de regiões e simulador genérico independente. Importar outro PDF abre um leitor nativo, sem mapeamento ou simulação automática. O estado de operação não é persistido.

## Transferência ao GitHub
Código e ativos copiados do protótipo sem alterações funcionais. Acrescentados vercel.json, README ampliado e AGENTS.md. Este pacote contém o material necessário à continuidade; não depende da hospedagem inicial de ChatGPT Sites. A conexão e publicação na Vercel serão realizadas pelo usuário e ainda não estão verificadas.

## Verificações
Na criação, node --check validou JavaScript, IDs e referências locais foram conferidos. Na transferência, conferir novamente sintaxe e ativos. Não houve teste visual de navegador ou teste de implantação Vercel.

## Próxima etapa funcional
Escolher uma função (por exemplo, caçamba) e validar com o instrutor as portas, linhas e estados da válvula. Criar o modelo de conexões e vincular caminhos animados ao esquema original somente após a validação.

## Limitações conhecidas
Sem modelo físico, pressão, vazão, carga, OCR, IA, editor de conexões, autenticação ou backend. Condições de falha são sintomas ilustrativos. Exibição de PDFs depende do leitor nativo do navegador. Antes de usar em aula, testar navegação e comandos no equipamento do instrutor.

## Estado do envio ao GitHub
O README foi enviado. A transferência dos demais arquivos foi interrompida; não foi confirmado o upload completo. Este ZIP contém os arquivos para transferência manual.


## Atualização - 30/09/2026 - primeira evolução funcional
Foi criada a branch `feature/mapeamento-funcional` para começar a transformar o protótipo em ferramenta de trabalho real sem alterar diretamente a `main`.

### O que mudou
- Nova aba **Mapear função** sobre o diagrama SY750H.
- Editor de trajetos hidráulicos por pontos diretamente sobre a imagem do esquema.
- Classificação de linhas: pressão/alimentação, retorno, piloto/comando e dreno/sinal auxiliar.
- Nomeação das linhas e da função hidráulica.
- Reprodução visual do fluxo por animação do caminho traçado.
- Salvamento local no navegador com `localStorage`.
- Carregamento e exclusão de mapas salvos.
- Exportação e importação dos mapeamentos em JSON.
- Zoom e navegação próprios da área de mapeamento.

### Regra técnica preservada
O HidroLab não infere nem cria automaticamente portas, trajetos ou valores técnicos. O editor registra graficamente apenas o caminho confirmado pelo instrutor a partir do esquema/manual. O diagrama fornecido confirma identificações como MANUAL PILOT VALVE, FOOT-OPERATED PILOT VALVE, ARM 1/2, BUCKET, BOOM 1/2, TRAVEL LEFT/RIGHT, SWING e TRAVEL STRAIGHT, mas o encadeamento de uma função completa ainda precisa ser validado antes de virar mapa oficial do treinamento.

### Verificações
- Deploy de preview Vercel da branch criado com status READY.
- A ferramenta de verificação visual agent-browser não está instalada no runtime desta sessão, portanto o teste visual automatizado ainda não foi executado.
- O PDF original foi renderizado e inspecionado para orientar a próxima etapa de mapeamento.

### Próximo passo
Usar o editor junto com o instrutor para mapear uma função completa da SY750H, começando por uma função claramente identificada no diagrama (por exemplo BOOM, BUCKET ou ARM), registrando: comando piloto -> carretel correspondente -> alimentação principal -> atuador -> retorno.


### Ajuste de visualização e mapa de demonstração
- Corrigida a área de mapeamento para renderizar a página completa do PDF `sy750h.pdf` com PDF.js, evitando depender da imagem PNG recortada.
- Mantido `schema.png` apenas como fallback caso a renderização do PDF falhe.
- Adicionado um mapeamento DEMO, explicitamente marcado como **não validado**, para testar criação de linhas, animação de fluxo, salvamento e interface.
- Adicionado botão para recarregar a demonstração.
- O mapa demo é somente visual e não deve ser usado como referência técnica da SY750H.


## Evolução - abordagem tipo FluidSIM
Após comparar o comportamento desejado com o conceito do FluidSIM, o HidroLab deixou de tratar a "bancada didática genérica" como simulador principal da máquina.

### Nova arquitetura funcional
- O PDF continua sendo a referência visual original da SY750H.
- O editor cria uma camada vetorial por cima do diagrama.
- Os trajetos são polilinhas conectadas, e não linhas diagonais livres.
- Foi adicionado "ímã nas linhas do diagrama": o clique procura o traço impresso mais próximo no canvas renderizado do PDF.
- Foi adicionado modo ortogonal (90 graus), adequado ao padrão predominante de diagramas hidráulicos.
- A aba "Bancada didática" foi substituída por **Simular função**.
- A simulação usa exatamente o mesmo mapa vetorial criado sobre o diagrama; portanto, sem rota mapeada não existe fluxo animado.
- A animação pode mostrar fluxo completo ou filtrar pressão, retorno, piloto e dreno.

### Limite atual
O snap é assistência de traçado, não reconhecimento automático de topologia. Para reproduzir uma função real com fidelidade, cada conexão, porta e desvio deve ser validado e mapeado no esquema. O próximo avanço técnico é evoluir de polilinhas assistidas para um grafo de componentes/portas/conexões, aproximando a lógica interna de um simulador de circuitos.

### Demonstração
A demonstração anterior com diagonais atravessando o desenho foi removida. A demo atual é somente um pequeno traçado ortogonal para testar aderência, zoom e animação, marcado explicitamente como não funcional e não validado.


## Editor V2 - arquitetura tipo FluidSIM (30/09/2026)
O protótipo foi reestruturado para abandonar a ideia de uma bancada genérica independente do diagrama.

### Estrutura atual
1. **Referência PDF**: renderiza o diagrama original como fonte técnica.
2. **Montar circuito**: editor gráfico com biblioteca de componentes hidráulicos, portas explícitas e conexões ortogonais.
3. **Simular circuito**: reutiliza o mesmo grafo montado e anima apenas as conexões existentes.

### Modelo lógico
O circuito passou a ser armazenado como grafo:
`componente -> porta -> conexão -> porta -> componente`.

Componentes iniciais disponíveis:
- reservatório;
- bomba;
- válvula direcional 4/3;
- cilindro de dupla ação;
- motor hidráulico;
- válvula de alívio;
- comando piloto.

As conexões possuem classes de linha:
- pressão/alimentação;
- linha de trabalho;
- retorno;
- sucção;
- piloto/comando;
- dreno/auxiliar.

### Simulação atual
A válvula direcional 4/3 possui estados lógicos de demonstração:
- avanço: P->A e B->T;
- neutro;
- recuo: P->B e A->T.

Ao ligar a bomba, a animação percorre a topologia construída no editor. A demo incluída é genérica e didática, não representa o circuito validado da SY750H.

### Limites mantidos
Ainda não são calculados pressão, vazão, perdas, carga, dinâmica de carretel ou regulagem de bomba. O circuito real da SY750H deve ser reconstruído e validado a partir do PDF/manual antes de ser tratado como conteúdo técnico oficial.

### Deploy
A branch `feature/mapeamento-funcional` gera preview automática na Vercel. Último commit funcional do Editor V2: `738671d`.
