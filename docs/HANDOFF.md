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


## Correção - PDF como base visual do editor (30/09/2026)
Foi identificado que o Editor V2 ainda podia mostrar apenas o circuito genérico, sem manter o PDF real visível durante a montagem/simulação.

### Correções aplicadas
- O PDF agora é renderizado também como plano de fundo da aba **Montar circuito**.
- O mesmo PDF é renderizado como plano de fundo da aba **Simular circuito**.
- Componentes e conexões ficam em camadas sobre o PDF, permitindo reconstruir o circuito exatamente sobre o diagrama.
- Foi removido o carregamento automático da demo genérica na inicialização.
- A demo permanece apenas como ação manual para teste.
- Editor e simulador passaram a usar a mesma escala e coordenadas, corrigindo a distorção em que os componentes apareciam comprimidos no canto superior esquerdo.
- Foram adicionados controles para ocultar/mostrar o PDF no editor e na simulação.

### Regra técnica
O PDF funciona como gabarito visual, não como fonte automática de topologia. O usuário posiciona componentes sobre os símbolos correspondentes e conecta porta a porta conforme a documentação validada.


## Clone V3 - teste de clonagem automática do PDF (30/09/2026)
Foi adicionada uma terceira abordagem para validar a ideia de transformar o próprio diagrama em interface interativa.

### O que esta versão faz
- Mantém a renderização visual integral do PDF SY750H como base do clone.
- Usa a estrutura do PDF.js para contar operações vetoriais e textos detectados.
- Analisa os pixels renderizados para detectar as redes coloridas presentes no esquema.
- Adiciona uma camada interativa exatamente sobre o desenho original.
- Permite clicar diretamente em uma linha colorida do PDF.
- A partir do ponto clicado, rastreia pixels geometricamente conectados da mesma rede/cor.
- Destaca a conexão detectada sem redesenhar o circuito manualmente.
- Possui animação de propagação do destaque a partir do ponto selecionado, servindo como prova de conceito para fluxo nas próprias linhas do diagrama.
- Mostra as cores/redes detectadas automaticamente e métricas de objetos/textos do PDF.

### Importante
Este protótipo ainda não afirma que uma rede geometricamente conectada corresponde a uma função hidráulica validada. Cruzamentos, pontos de junção, referências de continuidade e caminhos internos de válvulas exigem tratamento topológico e validação técnica. O objetivo do Clone V3 é provar que é possível manter o desenho idêntico ao PDF e interagir diretamente com as linhas originais, evitando reconstrução visual manual.

### Próxima evolução
Substituir o rastreamento puramente geométrico por um grafo vetorial do PDF:
`segmento -> nó/junção -> porta -> componente`.
Depois associar estados internos de válvulas e comandos para que o fluxo siga automaticamente somente caminhos hidraulicamente válidos.


## Integração Gemini - análise automática de diagrama (30/09/2026)
Foi criada integração server-side com a Gemini API para interpretar o PDF hidráulico e gerar uma proposta de grafo.

### Segurança
- A chave não fica no JavaScript do navegador nem no GitHub.
- O endpoint usa a variável de ambiente `GEMINI_API_KEY` na Vercel.
- Modelo padrão: `gemini-2.5-flash`; pode ser sobrescrito por `GEMINI_MODEL`.

### Endpoint
- `/api/analisar-diagrama`
- GET informa se a chave está configurada.
- POST envia o PDF padrão `sy750h.pdf` ao Gemini e solicita JSON estruturado.

### Saída solicitada ao Gemini
- componentes;
- tipo de componente;
- bbox normalizado;
- portas;
- conexões;
- tipo de linha;
- funções hidráulicas;
- confidence;
- needsValidation;
- evidências e warnings.

### Interface
A aba Clone digital ganhou:
- botão **Analisar PDF com Gemini**;
- status da análise;
- contadores de componentes/conexões/funções;
- avisos;
- botão **Gerar circuito proposto**.

O circuito proposto é montado no editor a partir do JSON da IA. Componentes não suportados pela biblioteca visual entram como componente genérico, preservando nome/portas detectadas. Nada retornado pela IA é tratado como validado automaticamente.

### Verificação
O endpoint foi publicado e testado via GET. Antes da configuração da chave retorna:
`{"configured":false,"model":"gemini-2.5-flash"}`.


### Redeploy preview após configuração do Gemini
- Novo deploy de Preview disparado após configuração da variável `GEMINI_API_KEY` na Vercel, para que a função server-side passe a ler a chave no ambiente.


## Reconstrução funcional em 3 fases com Gemini (30/09/2026)

A integração Gemini foi evoluída para reconstruir o diagrama em etapas, reduzindo o risco de uma única resposta ampla e imprecisa.

### Fluxo atual
1. **Inventário**: Gemini identifica componentes, rótulos, posições (bbox), portas e confiança.
2. **Topologia**: usando somente os IDs do inventário, Gemini segue as linhas externas do PDF e cria conexões porta-a-porta com path normalizado de 0 a 1000.
3. **Funções**: Gemini associa as conexões existentes às funções hidráulicas reconhecidas (boom, arm, bucket, swing, travel, pilot, prioridades etc.) e separa pilotagem, pressão, trabalho, retorno e dreno.

### Regras técnicas
- Não criar conexão apenas para completar um circuito visual.
- Cruzamentos sem ponto de junção não são tratados como conexão.
- Itens incertos usam needsValidation=true.
- Rótulos visíveis no PDF são usados como evidência, incluindo MANUAL PILOT VALVE, ARM 1/2, BUCKET, BOOM 1/2, TRAVEL LEFT/RIGHT, SWING, TRAVEL STRAIGHT, YV2/YV3/YV7 e PPC.
- O sistema não calcula pressão, vazão ou força nesta etapa.

### Interface
- O painel Gemini mostra 3 fases de processamento.
- A análise completa é salva em localStorage e pode ser reutilizada.
- O botão **Gerar circuito funcional** transforma inventário + topologia + funções em grafo.
- Conexões retornadas pela IA podem carregar um path; quando presente, o editor desenha a rota aproximando a própria linha do PDF em vez de criar apenas uma linha ortogonal genérica.
- Linhas e componentes que exigem validação aparecem tracejados.
- A simulação reconhece funções do mapa gerado e permite selecionar uma função hidráulica; ao ligar o fluxo, somente as connectionIds associadas à função são animadas.
- Para grafos manuais/demonstração, a simulação 4/3 antiga continua disponível como fallback.

### Deploy
Último preview funcional: commit afb8a41987f7e6a29349337ea77c2a8074e5f406.
A função api/analisar-diagrama.js recebeu maxDuration: 60 no vercel.json para permitir as chamadas de interpretação do PDF.

### Validação pendente
O preview mais recente está protegido por Vercel Authentication. A publicação foi concluída com status READY, mas o teste automatizado do POST completo das 3 fases não pôde ser executado pelo verificador externo nesta sessão por causa da proteção de Preview. O GET do endpoint em versão anterior já confirmou configured:true para a chave Gemini.
