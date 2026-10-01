# PLANO TÉCNICO - CLONE HIDRÁULICO 1:1 DO PDF

## 1. Resultado final desejado

O HidroLab deve exibir um diagrama que, visualmente, seja praticamente indistinguível do PDF hidráulico original da SY750H PRO.

A diferença é que o clone digital terá objetos identificáveis e controláveis.

Parado:

```
visual do HidroLab ~= visual do PDF original
```

Em operação:

```
Selecionar "Elevação da lança"
  -> HidroLab ativa o caminho piloto validado
  -> ativa alimentação principal validada
  -> ativa linhas de trabalho
  -> mostra retorno
  -> usa as próprias linhas originais do clone
```

Não deve existir uma segunda representação genérica obrigatória para estudar a máquina.

---

## 2. Arquitetura alvo

Separar completamente 4 camadas.

### Camada A - Visual original

Responsável por representar o PDF.

Objetos típicos:

```
visual.paths
visual.texts
visual.images
visual.groups
visual.annotations
```

Cada item recebe ID estável.

Exemplo:

```json
{
  "id": "pdf_path_1842",
  "page": 1,
  "kind": "path",
  "bbox": [412, 198, 603, 198],
  "stroke": "#ff0000",
  "strokeWidth": 0.8
}
```

### Camada B - Semântica hidráulica

Relaciona os elementos visuais a componentes hidráulicos.

Exemplo:

```json
{
  "id": "boom_1",
  "label": "BOOM 1",
  "type": "main_control_valve_section",
  "visualIds": ["pdf_path_712", "pdf_path_713", "pdf_text_88"],
  "ports": [
    {
      "name": "P",
      "anchor": {"x": 488, "y": 322},
      "visualIds": ["pdf_path_901"]
    }
  ],
  "confidence": 0.94,
  "needsValidation": false
}
```

### Camada C - Topologia

Define conexões reais.

```json
{
  "id": "connection_204",
  "from": {"componentId": "boom_1", "port": "A"},
  "to": {"componentId": "boom_cylinder", "port": "cap"},
  "visualPathIds": [
    "pdf_path_1842",
    "pdf_path_1843",
    "pdf_path_1844"
  ],
  "lineType": "work",
  "confidence": 0.91,
  "needsValidation": false
}
```

### Camada D - Funções / estados

Define quais conexões ficam ativas em cada operação.

```json
{
  "id": "boom_raise",
  "name": "Elevação da lança",
  "pilotConnectionIds": ["connection_18"],
  "pressureConnectionIds": ["connection_55"],
  "workConnectionIds": ["connection_204"],
  "returnConnectionIds": ["connection_219"],
  "internalTransitions": [
    {
      "componentId": "boom_1",
      "state": "RAISE",
      "fromPort": "P",
      "toPort": "A"
    }
  ]
}
```

---

## 3. Etapa 1 - Extrair o PDF sem redesenhar

### Objetivo

Converter os objetos gráficos do PDF em uma representação manipulável no navegador.

### Investigar primeiro

O PDF deve ser inspecionado para descobrir se o circuito está majoritariamente em:
- operadores vetoriais PDF;
- paths;
- imagens raster;
- XObjects/forms reutilizados;
- fontes com símbolos;
- combinações desses itens.

### Estratégia preferida

Preservar os vetores originais.

Possíveis caminhos:
- usar PDF.js para acessar operator list e matrizes;
- gerar SVG/DOM equivalente;
- ou converter previamente o PDF para SVG mantendo grupos/paths.

Não rasterizar o circuito como solução principal.

Raster pode continuar como fallback/reference, mas não é suficiente para um clone funcional.

### Entregável

Um JSON de cena, por exemplo:

```json
{
  "page": {"width": 1684, "height": 1191},
  "elements": [
    {
      "id": "pdf_path_000001",
      "kind": "path",
      "d": "...",
      "stroke": "#ff0000",
      "transform": [...]
    },
    {
      "id": "pdf_text_000144",
      "kind": "text",
      "text": "BOOM 1",
      "x": 822,
      "y": 301
    }
  ]
}
```

### Critérios de aceite

- Visual clone alinhado com PDF.
- Nenhuma perda grande de geometria.
- IDs determinísticos ou reproduzíveis.
- Texto identificável quando possível.
- Clique em uma linha destaca somente essa linha.
- Recarregar a página mantém os mesmos IDs para o mesmo arquivo.

---

## 4. Etapa 2 - Reconstruir conectividade geométrica

### Objetivo

Transformar segmentos visuais em redes geométricas.

### Identificar

- extremidades;
- segmentos;
- cotovelos;
- continuidade;
- pontos de junção explícitos;
- cruzamentos sem junção;
- linhas que entram em símbolos;
- referências/terminais.

### Regra essencial

```
cruzou != conectou
```

Só criar junção quando houver evidência gráfica.

### Estrutura

```
segment -> endpoint -> junction -> segment
```

Gerar IDs como:

```
geom_segment_...
geom_node_...
geom_network_...
```

### Critério de aceite

Clicar em uma linha deve poder realçar toda a rede geometricamente contínua SEM pular para outra linha apenas porque cruzou.

---

## 5. Etapa 3 - Reconhecimento de componentes

### IA entra aqui

Não pedir para Gemini redesenhar.

Enviar:
- imagem ou PDF;
- inventário de objetos/IDs;
- textos próximos;
- bbox;
- grupos vetoriais candidatos.

Pedir resposta estruturada associando semântica a IDs existentes.

Exemplo:

```json
{
  "componentId": "boom_1",
  "label": "BOOM 1",
  "visualIds": ["pdf_path_0712", "pdf_text_0088"],
  "type": "main_control_valve_section",
  "confidence": 0.92
}
```

### Processamento em regiões

O diagrama é grande.

Evitar depender de uma única chamada para entender tudo.

Processar por regiões:
- comandos piloto;
- bloco principal;
- bombas;
- giro;
- translação;
- atuadores;
- circuitos auxiliares.

Depois fazer uma etapa de reconciliação.

---

## 6. Etapa 4 - Portas e conexões

### Objetivo

Relacionar rede geométrica a porta hidráulica.

Exemplo:

```
geom_network_022
  -> boom_1.port_A
  -> boom_cylinder.port_cap
```

A IA pode sugerir.

O motor geométrico deve confirmar que existe continuidade visual.

A interface deve permitir:
- confirmar;
- rejeitar;
- corrigir componente;
- corrigir porta;
- dividir rede;
- unir rede;
- marcar "não sei".

---

## 7. Etapa 5 - Biblioteca lógica de componentes

Cada tipo de componente precisa de comportamento próprio.

Exemplos iniciais:

- bomba;
- reservatório;
- válvula check;
- válvula de alívio;
- válvula redutora;
- válvula de contrabalanço;
- shuttle;
- orifício;
- válvula direcional;
- seção do MCV;
- cilindro;
- motor;
- comando piloto;
- solenóide.

### Importante

A lógica não pode ser simplesmente "P->A/B->T para toda válvula".

Cada componente do esquema deve ter estados coerentes com o símbolo validado.

---

## 8. Etapa 6 - Funções da máquina

Criar funções usando conexões validadas.

Começar por uma função pequena.

Sugestão de sequência:

1. BOOM - elevação;
2. BOOM - descida;
3. BUCKET;
4. ARM;
5. SWING;
6. TRAVEL LEFT/RIGHT;
7. TRAVEL STRAIGHT;
8. prioridades/confluências;
9. pilotagem e auxiliares.

Não tentar validar tudo simultaneamente.

---

## 9. Etapa 7 - Simulação visual

Na simulação, não desenhar linha adicional.

Alterar apenas classes/estilos dos elementos visuais existentes.

Exemplo:

```js
visualPathIds.forEach(id => {
  document.getElementById(id)?.classList.add("flow-pressure");
});
```

Possíveis estados:

```
flow-pressure
flow-work
flow-return
flow-pilot
flow-drain
flow-blocked
flow-fault
```

Animação:

- stroke-dasharray;
- stroke-dashoffset;
- glow leve;
- opção de desligar animação;
- preservar a cor técnica original quando necessário.

---

## 10. Interface de validação técnica

Adicionar um modo "Revisão".

Painel sugerido:

```
Elemento detectado
Nome:
Tipo:
Portas:
Conexões:
Confiança:
Evidência:

[Confirmar]
[Corrigir]
[Rejeitar]
```

Status:

- não revisado;
- IA sugeriu;
- validado por instrutor;
- rejeitado.

Somente itens validados devem poder receber status "modelo técnico validado".

---

## 11. Persistência

O protótipo pode começar com JSON local/repositório.

Estrutura sugerida:

```
models/
  sy750h-pro/
    source.json
    visual-scene.json
    components.json
    topology.json
    functions.json
    validation.json
```

Não salvar chave de API.

Mais tarde, persistência pode migrar para banco.

---

## 12. Papel do Gemini

Gemini pode:

- reconhecer componente;
- associar label;
- propor porta;
- interpretar símbolo;
- propor função;
- explicar evidência;
- classificar incerteza.

Gemini NÃO deve:

- redesenhar o circuito;
- criar vetor visual novo como fonte principal;
- decidir fluxo em tempo real;
- sobrescrever validação humana;
- completar ligação ausente por "bom senso".

---

## 13. Migração da versão atual

Preservar enquanto a nova arquitetura não estiver pronta:

- renderização PDF;
- upload PDF;
- editor genérico;
- simulador genérico;
- endpoint Gemini atual.

Mas retirar gradualmente o editor genérico do fluxo principal.

O fluxo principal deve se tornar:

```
Importar PDF
  -> Clonar 1:1
  -> Analisar
  -> Revisar
  -> Validar
  -> Simular
```

O editor manual passa a ser ferramenta de correção, não representação principal.

---

## 14. Testes obrigatórios

### Visual

- clone sobreposto ao PDF com baixa diferença;
- zoom 100%, 200%, 400%;
- sem deslocamento de coordenadas;
- textos próximos da posição original.

### Geometria

- linhas contínuas;
- crossing sem junção;
- junction real;
- line-to-port.

### IA

- IDs retornados devem existir;
- nenhum connectionId órfão;
- nenhuma porta ligada a componente inexistente;
- confidence normalizada;
- needsValidation obrigatório em dúvida.

### Simulação

- função ativa somente seus visualPathIds;
- desligar função restaura aparência;
- múltiplas classes não corrompem o clone;
- item não validado é claramente sinalizado.

---

## 15. Primeira entrega recomendada para Astra

### Sprint 1

Entregar somente:

**PDF -> cena vetorial interativa 1:1**

Sem tentar resolver hidráulica completa ainda.

Checklist:

- [ ] extrair vetores/textos;
- [ ] gerar IDs estáveis;
- [ ] renderizar clone;
- [ ] clique/hover;
- [ ] highlight;
- [ ] exportar visual-scene.json;
- [ ] comparar visualmente com PDF;
- [ ] manter upload de PDF;
- [ ] documentar limitações.

### Sprint 2

- [ ] redes geométricas;
- [ ] junções;
- [ ] crossing;
- [ ] exportar topology-geometry.json.

### Sprint 3

- [ ] Gemini associa componentes aos visualIds;
- [ ] painel de revisão;
- [ ] salvar validação.

### Sprint 4

- [ ] portas;
- [ ] conexões hidráulicas;
- [ ] primeira função real validada.

### Sprint 5

- [ ] simulação sobre as linhas originais.

---

## 16. Definição de "pronto"

Não considerar o projeto pronto quando "parece funcionar".

Uma função específica só é considerada pronta quando:

1. seus componentes foram identificados;
2. suas portas foram validadas;
3. suas conexões correspondem ao diagrama;
4. a função possui transições internas definidas;
5. o fluxo é mostrado nas linhas originais;
6. o instrutor consegue revisar;
7. nenhum valor técnico foi inventado;
8. o resultado pode ser reproduzido após recarregar a aplicação.

