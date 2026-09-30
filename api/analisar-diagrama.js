const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

const VISIBLE_LABEL_HINTS = [
  'MANUAL PILOT VALVE (LEFT)',
  'MANUAL PILOT VALVE (RIGHT)',
  'FOOT-OPERATED PILOT VALVE',
  'ARM 1',
  'ARM 2',
  'BUCKET OPTION',
  'BOOM 1',
  'BOOM 2',
  'TRAVEL LEFT',
  'TRAVEL RIGHT',
  'TRAVEL STRAIGHT',
  'SWING',
  'YV2',
  'YV3',
  'YV7',
  'PPC',
  'Boom Lifting has Priority over Bucket',
  'Boom Lifting Confluence',
  'Boom Lowering Throttle',
  'Arm has Priority over Swing',
  'High/Low Speed PPC Pilot Switch'
];

const pointSchema = {
  type: 'object',
  properties: {
    x: { type: 'number' },
    y: { type: 'number' }
  },
  required: ['x','y']
};

const portSchema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    x: { type: 'number' },
    y: { type: 'number' },
    confidence: { type: 'number' },
    evidence: { type: 'string' }
  },
  required: ['name','x','y','confidence','evidence']
};

const componentSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    label: { type: 'string' },
    type: {
      type: 'string',
      enum: [
        'pump','tank','main_control_valve_section','directional_valve','cylinder',
        'motor','relief_valve','check_valve','counterbalance_valve','flow_control',
        'pressure_reducing_valve','shuttle_valve','pilot_valve','solenoid',
        'filter','cooler','accumulator','sensor','junction','orifice','selector',
        'pilot_manifold','travel_straight_valve','unknown'
      ]
    },
    page: { type: 'integer' },
    bbox: { type: 'array', items: { type: 'number' }, minItems: 4, maxItems: 4 },
    confidence: { type: 'number' },
    ports: { type: 'array', items: portSchema },
    evidence: { type: 'string' },
    needsValidation: { type: 'boolean' }
  },
  required: ['id','label','type','page','bbox','confidence','ports','evidence','needsValidation']
};

const inventorySchema = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    machine: { type: 'string' },
    summary: { type: 'string' },
    components: { type: 'array', items: componentSchema },
    warnings: { type: 'array', items: { type: 'string' } }
  },
  required: ['title','machine','summary','components','warnings']
};

const connectionSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    fromComponentId: { type: 'string' },
    fromPort: { type: 'string' },
    toComponentId: { type: 'string' },
    toPort: { type: 'string' },
    lineType: {
      type: 'string',
      enum: ['pressure','work','return','suction','pilot','drain','signal','unknown']
    },
    path: { type: 'array', items: pointSchema },
    confidence: { type: 'number' },
    evidence: { type: 'string' },
    needsValidation: { type: 'boolean' }
  },
  required: ['id','fromComponentId','fromPort','toComponentId','toPort','lineType','path','confidence','evidence','needsValidation']
};

const topologySchema = {
  type: 'object',
  properties: {
    connections: { type: 'array', items: connectionSchema },
    junctions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          x: { type: 'number' },
          y: { type: 'number' },
          connectedConnectionIds: { type: 'array', items: { type: 'string' } },
          confidence: { type: 'number' },
          needsValidation: { type: 'boolean' }
        },
        required: ['id','x','y','connectedConnectionIds','confidence','needsValidation']
      }
    },
    warnings: { type: 'array', items: { type: 'string' } }
  },
  required: ['connections','junctions','warnings']
};

const functionSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    category: {
      type: 'string',
      enum: ['boom','arm','bucket','swing','travel','pilot','auxiliary','priority','other']
    },
    direction: { type: 'string' },
    description: { type: 'string' },
    pilotConnectionIds: { type: 'array', items: { type: 'string' } },
    pressureConnectionIds: { type: 'array', items: { type: 'string' } },
    workConnectionIds: { type: 'array', items: { type: 'string' } },
    returnConnectionIds: { type: 'array', items: { type: 'string' } },
    drainConnectionIds: { type: 'array', items: { type: 'string' } },
    componentIds: { type: 'array', items: { type: 'string' } },
    internalTransitions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          componentId: { type: 'string' },
          fromPort: { type: 'string' },
          toPort: { type: 'string' },
          state: { type: 'string' },
          confidence: { type: 'number' },
          needsValidation: { type: 'boolean' }
        },
        required: ['componentId','fromPort','toPort','state','confidence','needsValidation']
      }
    },
    confidence: { type: 'number' },
    needsValidation: { type: 'boolean' },
    notes: { type: 'string' }
  },
  required: [
    'id','name','category','direction','description','pilotConnectionIds','pressureConnectionIds',
    'workConnectionIds','returnConnectionIds','drainConnectionIds','componentIds',
    'internalTransitions','confidence','needsValidation','notes'
  ]
};

const functionsSchema = {
  type: 'object',
  properties: {
    functions: { type: 'array', items: functionSchema },
    warnings: { type: 'array', items: { type: 'string' } }
  },
  required: ['functions','warnings']
};

async function getPdfBuffer(req) {
  const body = req.body || {};
  if (body.pdfBase64) return Buffer.from(body.pdfBase64, 'base64');

  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const proto = req.headers['x-forwarded-proto'] || 'https';
  if (!host) throw new Error('HOST_NOT_AVAILABLE');

  const response = await fetch(`${proto}://${host}/sy750h.pdf`);
  if (!response.ok) throw new Error('PDF_FETCH_FAILED');
  return Buffer.from(await response.arrayBuffer());
}

function compactInventory(inventory) {
  return {
    machine: inventory?.machine || '',
    components: (inventory?.components || []).map(c => ({
      id: c.id,
      label: c.label,
      type: c.type,
      bbox: c.bbox,
      ports: (c.ports || []).map(p => ({ name: p.name, x: p.x, y: p.y }))
    }))
  };
}

function compactTopology(topology) {
  return {
    connections: (topology?.connections || []).map(c => ({
      id: c.id,
      fromComponentId: c.fromComponentId,
      fromPort: c.fromPort,
      toComponentId: c.toComponentId,
      toPort: c.toPort,
      lineType: c.lineType,
      path: c.path
    }))
  };
}

async function askGemini(pdf, prompt, responseSchema) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
  const payload = {
    contents: [{
      role: 'user',
      parts: [
        { text: prompt },
        { inlineData: { mimeType: 'application/pdf', data: pdf.toString('base64') } }
      ]
    }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema,
      temperature: 0.05
    }
  };

  const aiResponse = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': process.env.GEMINI_API_KEY
    },
    body: JSON.stringify(payload)
  });

  const raw = await aiResponse.json();
  if (!aiResponse.ok) {
    console.error('Gemini error', raw);
    const err = new Error(raw?.error?.message || 'Falha na análise do Gemini.');
    err.status = aiResponse.status;
    throw err;
  }

  const text = raw?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || '';
  if (!text) throw new Error('EMPTY_GEMINI_RESPONSE');

  try {
    return JSON.parse(text);
  } catch {
    const err = new Error('INVALID_GEMINI_JSON');
    err.preview = text.slice(0, 500);
    throw err;
  }
}

function baseRules() {
  return `
Você é um engenheiro especialista em hidráulica de escavadeiras e leitura de diagramas hidráulicos de máquinas pesadas.
O documento é um diagrama hidráulico da SY750H PRO.

Regras obrigatórias:
- NÃO invente conexões, portas, componentes ou estados internos que não estejam visíveis ou fortemente suportados pelo desenho.
- Cruzamento de linhas sem ponto de junção NÃO significa conexão.
- Preserve exatamente os nomes/identificações visíveis quando existirem.
- Use coordenadas normalizadas de 0 a 1000, com origem no canto superior esquerdo.
- Qualquer item duvidoso deve usar needsValidation=true e confidence menor.
- Priorize precisão sobre quantidade.
- A saída será usada em treinamento técnico; uma falsa conexão é pior que uma conexão ausente.
- O objetivo é reconstruir a topologia documentada, não calcular pressão, vazão ou força.
- O PDF pode conter rótulos como: ${VISIBLE_LABEL_HINTS.join(', ')}. Use-os apenas se realmente aparecerem no desenho.
`;
}

function inventoryPrompt() {
  return `${baseRules()}

FASE 1 — INVENTÁRIO COMPLETO.
Varra a página inteira e identifique todos os componentes hidráulicos relevantes, incluindo seções do bloco principal, bombas, motores, cilindros, válvulas piloto, solenóides, válvulas de alívio/redução/check/contrabalanço, orifícios e junções importantes.

Para cada componente:
1. dê um id estável e curto;
2. informe label e type;
3. delimite bbox=[ymin,xmin,ymax,xmax];
4. liste as portas visíveis com coordenadas x/y;
5. registre evidência textual/visual;
6. marque incertezas.

Não gere conexões ainda. Foque em inventariar o diagrama inteiro.
`;
}

function topologyPrompt(inventory) {
  return `${baseRules()}

FASE 2 — TOPOLOGIA EXTERNA.
Abaixo está o inventário já detectado. Use SOMENTE estes IDs de componentes.
${JSON.stringify(compactInventory(inventory))}

Agora siga as linhas do diagrama e gere as conexões externas entre portas.
Para cada conexão:
- use IDs existentes;
- identifique porta de origem e destino;
- classifique lineType;
- gere path como uma sequência de pontos [x,y] normalizados seguindo as curvas/dobras da própria linha desenhada;
- NÃO atravesse componentes arbitrariamente;
- se a linha terminar em uma referência ou destino incerto, marque needsValidation=true;
- diferencie cruzamento sem conexão de junção real.

Também liste junções explícitas relevantes.
`;
}

function functionsPrompt(inventory, topology) {
  return `${baseRules()}

FASE 3 — FUNÇÕES HIDRÁULICAS.
Inventário:
${JSON.stringify(compactInventory(inventory))}

Topologia:
${JSON.stringify(compactTopology(topology))}

Identifique as funções operacionais que o diagrama permite reconhecer, por exemplo lança, braço, caçamba, giro, translação esquerda/direita, travel straight, pilotagem e prioridades/confluências.

Para cada função:
- dê id, nome, categoria e direção;
- associe SOMENTE connectionIds existentes;
- separe pilot, pressure, work, return e drain;
- liste componentIds envolvidos;
- descreva transições internas de válvulas apenas quando o símbolo/estado puder ser inferido com segurança;
- marque needsValidation quando houver qualquer ambiguidade;
- não inclua uma conexão só para completar um caminho visualmente bonito.

A finalidade é permitir que o HidroLab anime somente os caminhos associados a cada função reconhecida.
`;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'GET') {
    return res.status(200).json({
      configured: Boolean(process.env.GEMINI_API_KEY),
      model: MODEL,
      phases: ['inventory','topology','functions']
    });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });

  if (!process.env.GEMINI_API_KEY) {
    return res.status(503).json({
      error: 'GEMINI_API_KEY_NOT_CONFIGURED',
      message: 'Configure GEMINI_API_KEY nas variáveis de ambiente da Vercel.'
    });
  }

  try {
    const pdf = await getPdfBuffer(req);
    if (pdf.length > 50 * 1024 * 1024) {
      return res.status(413).json({ error: 'PDF_TOO_LARGE', message: 'O PDF ultrapassa 50 MB.' });
    }

    const phase = String(req.body?.phase || 'inventory');

    if (phase === 'inventory') {
      const inventory = await askGemini(pdf, inventoryPrompt(), inventorySchema);
      return res.status(200).json({ ok: true, phase, model: MODEL, inventory });
    }

    if (phase === 'topology') {
      const inventory = req.body?.inventory;
      if (!inventory?.components?.length) {
        return res.status(400).json({ error: 'INVENTORY_REQUIRED' });
      }
      const topology = await askGemini(pdf, topologyPrompt(inventory), topologySchema);
      return res.status(200).json({ ok: true, phase, model: MODEL, topology });
    }

    if (phase === 'functions') {
      const inventory = req.body?.inventory;
      const topology = req.body?.topology;
      if (!inventory?.components?.length || !topology?.connections) {
        return res.status(400).json({ error: 'INVENTORY_AND_TOPOLOGY_REQUIRED' });
      }
      const functionMap = await askGemini(pdf, functionsPrompt(inventory, topology), functionsSchema);
      return res.status(200).json({ ok: true, phase, model: MODEL, functionMap });
    }

    return res.status(400).json({ error: 'UNKNOWN_PHASE' });
  } catch (error) {
    console.error(error);
    return res.status(error?.status || 500).json({
      error: error?.message || 'ANALYSIS_FAILED',
      message: error?.message || 'Falha inesperada.',
      preview: error?.preview
    });
  }
}
