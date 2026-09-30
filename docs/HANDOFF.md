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
