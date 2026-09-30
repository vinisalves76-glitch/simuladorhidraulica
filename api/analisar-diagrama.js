const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

const schema = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    machine: { type: 'string' },
    summary: { type: 'string' },
    components: {
      type: 'array',
      items: {
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
              'filter','cooler','accumulator','sensor','junction','unknown'
            ]
          },
          page: { type: 'integer' },
          bbox: { type: 'array', items: { type: 'number' }, minItems: 4, maxItems: 4 },
          confidence: { type: 'number' },
          ports: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                x: { type: 'number' },
                y: { type: 'number' },
                confidence: { type: 'number' }
              },
              required: ['name','x','y','confidence']
            }
          },
          evidence: { type: 'string' },
          needsValidation: { type: 'boolean' }
        },
        required: ['id','label','type','page','bbox','confidence','ports','evidence','needsValidation']
      }
    },
    connections: {
      type: 'array',
      items: {
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
          confidence: { type: 'number' },
          evidence: { type: 'string' },
          needsValidation: { type: 'boolean' }
        },
        required: ['id','fromComponentId','fromPort','toComponentId','toPort','lineType','confidence','evidence','needsValidation']
      }
    },
    functions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          componentIds: { type: 'array', items: { type: 'string' } },
          confidence: { type: 'number' },
          notes: { type: 'string' }
        },
        required: ['name','componentIds','confidence','notes']
      }
    },
    warnings: { type: 'array', items: { type: 'string' } }
  },
  required: ['title','machine','summary','components','connections','functions','warnings']
};

const PROMPT = `
Você é um engenheiro especialista em hidráulica de máquinas pesadas e leitura de esquemas hidráulicos.
Analise o PDF fornecido e converta o diagrama em uma proposta de grafo hidráulico estruturado.

REGRAS CRÍTICAS:
1. Não invente conexões ocultas, portas ou componentes.
2. Se uma conexão não puder ser confirmada visualmente, marque needsValidation=true e reduza confidence.
3. Cruzamento de linhas sem ponto de junção não significa conexão.
4. Use textos/identificações visíveis no desenho como evidência.
5. Preserve a nomenclatura visível do documento (BOOM 1, BOOM 2, ARM 1, ARM 2, BUCKET, SWING, TRAVEL etc.).
6. bbox deve ser [ymin, xmin, ymax, xmax] normalizado de 0 a 1000.
7. Coordenadas x/y das portas também devem ser normalizadas de 0 a 1000.
8. Conexões devem referenciar IDs de componentes existentes.
9. Priorize precisão sobre quantidade. É melhor retornar unknown ou exigir validação do que alucinar.
10. A saída será usada para montar um simulador técnico, então qualquer incerteza deve ser explícita.

OBJETIVO:
Gerar componentes, portas, conexões externas visíveis e funções hidráulicas identificáveis no diagrama.
Não simule física; reconstrua somente a topologia documentada.
`;

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

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'GET') {
    return res.status(200).json({
      configured: Boolean(process.env.GEMINI_API_KEY),
      model: MODEL
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

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
    const payload = {
      contents: [{
        role: 'user',
        parts: [
          { text: PROMPT },
          { inlineData: { mimeType: 'application/pdf', data: pdf.toString('base64') } }
        ]
      }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: schema,
        temperature: 0.1
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
      return res.status(aiResponse.status).json({
        error: 'GEMINI_REQUEST_FAILED',
        message: raw?.error?.message || 'Falha na análise do Gemini.'
      });
    }

    const text = raw?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || '';
    if (!text) return res.status(502).json({ error: 'EMPTY_GEMINI_RESPONSE' });

    let analysis;
    try { analysis = JSON.parse(text); }
    catch { return res.status(502).json({ error: 'INVALID_GEMINI_JSON', preview: text.slice(0, 500) }); }

    return res.status(200).json({ ok: true, model: MODEL, analysis });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: 'ANALYSIS_FAILED',
      message: error?.message || 'Falha inesperada.'
    });
  }
}
