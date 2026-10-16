// Groq API client for generating English educational activities

const GROQ_CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODELS_URL = 'https://api.groq.com/openai/v1/models';

export const DEFAULT_MODEL = 'openai/gpt-oss-120b';

export const GROQ_MODELS = [
  { id: 'openai/gpt-oss-120b', name: 'OpenAI GPT OSS 120B (Recomendado - Alta Inteligencia)' },
  { id: 'openai/gpt-oss-20b', name: 'OpenAI GPT OSS 20B (Ultra Rápido - Ideal Turnos)' },
  { id: 'qwen/qwen3.8-27b', name: 'Qwen 3.8 27B (Alta Precisión)' },
  { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B' },
  { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B' }
];

export const CHALLENGE_TYPES = [
  { id: 'random', name: '🎲 Aleatorio / Mixto (Recomendado)', description: 'Alterna entre Concepto, Opción Múltiple y Dar un Ejemplo' },
  { id: 'multiple_choice', name: '📝 Respuesta Única (Opción Múltiple)', description: 'Preguntas con 4 opciones A, B, C, D y una única respuesta correcta' },
  { id: 'concept', name: '📖 Concepto (Pregunta Abierta)', description: 'El estudiante explica la regla o significado conceptual al docente' },
  { id: 'example', name: '✍️ Dar un Ejemplo', description: 'El estudiante formula una oración de ejemplo aplicando la estructura' },
  { id: 'fill_blank', name: '✏️ Completar Espacios (Fill in the blanks)', description: 'Oraciones con espacios faltantes para completar' },
  { id: 'sentence_affirmative', name: '➕ Crear Frases en Afirmativo', description: 'El alumno crea una oración afirmativa según claves' },
  { id: 'sentence_negative', name: '➖ Crear Frases en Negativo', description: 'El alumno crea una oración negativa según claves' },
  { id: 'sentence_question', name: '❓ Formular Preguntas (Interrogativo)', description: 'El alumno formula una pregunta correcta en inglés' }
];

// Query active chat models directly from the user's account
export async function getActiveGroqModels(apiKey) {
  try {
    const response = await fetch(GROQ_MODELS_URL, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey.trim()}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data?.data)) {
        // Filter out audio, whisper, safeguard, and prompt guard models
        const chatModels = data.data
          .map(m => m.id)
          .filter(id => 
            !id.includes('whisper') && 
            !id.includes('guard') && 
            !id.includes('orpheus') && 
            !id.includes('safeguard')
          );

        const priority = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'qwen/qwen3.8-27b'];
        chatModels.sort((a, b) => {
          const aPri = priority.indexOf(a);
          const bPri = priority.indexOf(b);
          if (aPri !== -1 && bPri !== -1) return aPri - bPri;
          if (aPri !== -1) return -1;
          if (bPri !== -1) return 1;
          return 0;
        });

        if (chatModels.length > 0) {
          return chatModels;
        }
      }
    }
  } catch (err) {
    console.warn('Could not query dynamic Groq models list:', err);
  }

  return ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'qwen/qwen3.8-27b'];
}

export async function testGroqConnection(apiKey) {
  if (!apiKey || apiKey.trim() === '') {
    throw new Error('Please enter a valid Groq API Key.');
  }

  const response = await fetch(GROQ_MODELS_URL, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey.trim()}`
    }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Groq API returned HTTP ${response.status}. Please check your key.`);
  }

  const data = await response.json().catch(() => ({}));
  const availableModels = Array.isArray(data?.data) ? data.data.map(m => m.id) : [];

  return { success: true, availableModels };
}

// Generate an entire multi-question quiz activity
export async function generateEnglishQuiz({
  apiKey,
  topic,
  level = 'B1',
  questionCount = 6,
  gameType = 'all',
  challengeType = 'random',
  model = DEFAULT_MODEL,
  customInstructions = ''
}) {
  if (!apiKey || apiKey.trim() === '') {
    throw new Error('Groq API Key is missing. Please add it in settings.');
  }

  const liveModels = await getActiveGroqModels(apiKey);
  const candidateModels = [
    model,
    ...liveModels,
    'openai/gpt-oss-120b',
    'openai/gpt-oss-20b',
    'qwen/qwen3.8-27b'
  ].filter((v, i, a) => v && a.indexOf(v) === i);

  let normalizedTopic = topic;
  if (Array.isArray(topic)) {
    normalizedTopic = topic.filter(Boolean).join(', ');
  }

  let typeGuidance = '';
  switch (challengeType) {
    case 'multiple_choice':
      typeGuidance = `All questions MUST be multiple choice format ("type": "multiple_choice") with 4 distinct options ("options": ["A", "B", "C", "D"]) and 1 exact correctAnswer. Only one option can be correct.`;
      break;
    case 'concept':
      typeGuidance = `All questions MUST be concept / open explanation format ("type": "concept"). Ask the student to explain a grammar rule, distinction, or language concept. Leave "options": []. Provide "modelAnswer" and "promptInstructions": "Explica la regla o concepto en voz alta al docente."`;
      break;
    case 'example':
      typeGuidance = `All questions MUST be example production format ("type": "example"). Ask the student to provide/produce a complete example sentence applying the target grammar rule. Leave "options": []. Provide "modelAnswer" with a clear example and "promptInstructions": "Di o escribe una oración de ejemplo aplicando la estructura."`;
      break;
    case 'fill_blank':
      typeGuidance = `All questions MUST be fill-in-the-blank format ("type": "fill_blank"). The sentence must contain a blank represented by "____". Provide 4 candidate options and the exact correctAnswer.`;
      break;
    case 'sentence_affirmative':
      typeGuidance = `All questions MUST require creating an affirmative sentence ("type": "sentence_affirmative"). Give prompt keywords. Leave options empty or provide choices. Provide a modelAnswer.`;
      break;
    case 'sentence_negative':
      typeGuidance = `All questions MUST require creating a negative sentence ("type": "sentence_negative"). Give prompt cues. Provide a modelAnswer.`;
      break;
    case 'sentence_question':
      typeGuidance = `All questions MUST require creating an interrogative question ("type": "sentence_question"). Give prompt cues. Provide a modelAnswer.`;
      break;
    case 'random':
    default:
      typeGuidance = `Include a balanced, diverse mix across the set representing the three main pedagogical pillars:
- "multiple_choice" (4 options A, B, C, D with 1 single correct answer)
- "concept" (open concept / rule explanation with modelAnswer and empty options)
- "example" (sentence production prompt where the student creates an example with modelAnswer)
Mark each item's "type" field accordingly.`;
      break;
  }

  const systemPrompt = `You are an elite ESL / English Language Teacher and educational game designer.
Your task is to generate high-quality, engaging English learning challenges tailored for a Casino-themed classroom projection game where a student tests their luck and, if unlucky, answers a challenge or speaks aloud to the teacher.

Target CEFR Level: ${level}
Topic(s): ${normalizedTopic}
Number of Questions: ${questionCount}
Target Machine: ${gameType}
Challenge Format Requirement: ${typeGuidance}
${customInstructions ? `Teacher Custom Notes: ${customInstructions}` : ''}

Rules:
1. Provide realistic, natural, level-appropriate English.
2. For multiple_choice and fill_blank with options: provide 4 distinct options, with one strictly correct.
3. For sentence creation (affirmative, negative, question): provide clear cues/prompts, an exact "modelAnswer" for the teacher to verify, and clear "promptInstructions" in Spanish explaining to the student what to say aloud (e.g. "Di en voz alta una frase negativa usando: [she / drink / coffee]").
4. Include an insightful, friendly educational "explanation" for why the answer is right or the grammar rule.
5. Categorize each challenge into one of: "Grammar", "Vocabulary", "Pronunciation", "Speaking", or "Expressions".
6. Assign a casino coin payout value "points" between 150 and 400.

You MUST respond strictly with a valid JSON object matching this schema:
{
  "title": "Short catchy title in English (e.g. 'Las Vegas Past Tense Showdown')",
  "description": "Engaging description explaining what the students will practice",
  "level": "${level}",
  "category": "Main topic",
  "questions": [
    {
      "id": "q1",
      "type": "multiple_choice | fill_blank | sentence_affirmative | sentence_negative | sentence_question",
      "question": "The question or prompt in English",
      "promptInstructions": "Instrucción clara en español para el estudiante/docente",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "Exact string of correct answer or model response",
      "modelAnswer": "Ideal model sentence in English for oral verification",
      "explanation": "Clear explanation of grammar rule or vocabulary",
      "category": "Grammar",
      "points": 200
    }
  ]
}`;

  let lastError = null;

  for (const currentModel of candidateModels) {
    try {
      let requestBody = {
        model: currentModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Generate the ${questionCount} English challenges for topic: "${topic}" at level ${level}. Challenge format: ${challengeType}. Output only the JSON object.` }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: 3500
      };

      let response = await fetch(GROQ_CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey.trim()}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const msg = errorData.error?.message || `HTTP ${response.status}`;

        if (msg.toLowerCase().includes('response_format') || msg.toLowerCase().includes('json')) {
          delete requestBody.response_format;
          response = await fetch(GROQ_CHAT_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey.trim()}`
            },
            body: JSON.stringify(requestBody)
          });
        } else {
          if (msg.includes('decommissioned') || msg.includes('does not exist') || msg.includes('access') || response.status === 404 || response.status === 400) {
            console.warn(`Model ${currentModel} unavailable (${msg}), trying next...`);
            lastError = new Error(msg);
            continue;
          }
          throw new Error(msg);
        }
      }

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        const errMsg = errJson.error?.message || `HTTP ${response.status}`;
        lastError = new Error(errMsg);
        continue;
      }

      const data = await response.json();
      const rawContent = data.choices?.[0]?.message?.content;

      if (!rawContent) {
        throw new Error('Groq returned an empty response.');
      }

      let parsed;
      try {
        parsed = JSON.parse(rawContent);
      } catch {
        const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('Could not parse JSON from model output.');
        }
      }

      if (!parsed.questions || !Array.isArray(parsed.questions) || parsed.questions.length === 0) {
        throw new Error('Generated response does not contain a valid questions list.');
      }

      parsed.questions = parsed.questions.map((q, idx) => {
        const qType = q.type || (challengeType === 'random' ? (q.type || 'multiple_choice') : challengeType);
        const opts = Array.isArray(q.options) && q.options.length >= 2 ? q.options : [];
        const ans = q.correctAnswer || q.modelAnswer || (opts.length > 0 ? opts[0] : 'Correct answer');
        const modelAns = q.modelAnswer || ans;

        let defaultInstruction = 'Responde la pregunta en el juego.';
        if (qType === 'sentence_affirmative') defaultInstruction = '🗣️ Di una oración afirmativa en voz alta usando las palabras dadas.';
        else if (qType === 'sentence_negative') defaultInstruction = '🗣️ Di una oración negativa en voz alta usando las palabras dadas.';
        else if (qType === 'sentence_question') defaultInstruction = '🗣️ Formula una pregunta en voz alta usando las palabras dadas.';
        else if (qType === 'fill_blank') defaultInstruction = '✏️ Completa el espacio en blanco con la palabra adecuada.';
        else if (qType === 'multiple_choice') defaultInstruction = '📝 Selecciona la opción correcta.';

        return {
          id: q.id || `q_${Date.now()}_${idx}`,
          type: qType,
          question: q.question || 'Missing challenge prompt',
          promptInstructions: q.promptInstructions || defaultInstruction,
          options: opts,
          correctAnswer: ans,
          modelAnswer: modelAns,
          explanation: q.explanation || 'Educational rule.',
          category: q.category || 'General',
          points: Number(q.points) || 200
        };
      });

      return parsed;
    } catch (err) {
      lastError = err;
      if (err.message && (err.message.includes('decommissioned') || err.message.includes('model') || err.message.includes('access'))) {
        continue;
      }
      throw err;
    }
  }

  throw lastError || new Error('No se pudo generar la actividad con los modelos activos de Groq.');
}

// Generate EXACTLY ONE challenge for a single classroom student turn in real-time
export async function generateSingleTurnQuestion({
  apiKey,
  topic = 'General English',
  level = 'B1',
  challengeType = 'random',
  studentName = 'Estudiante',
  model = DEFAULT_MODEL,
  customInstructions = ''
}) {
  if (!apiKey || apiKey.trim() === '') {
    throw new Error('Groq API Key is missing. Please add it in settings.');
  }

  const liveModels = await getActiveGroqModels(apiKey);
  // Prefer 20B or 120B for ultra-fast single turn generation
  const candidateModels = [
    model,
    'openai/gpt-oss-20b',
    ...liveModels,
    'openai/gpt-oss-120b',
    'qwen/qwen3.8-27b'
  ].filter((v, i, a) => v && a.indexOf(v) === i);

  // Pick an active topic if multiple topics were specified
  let activeTopic = topic;
  if (Array.isArray(topic) && topic.length > 0) {
    activeTopic = topic[Math.floor(Math.random() * topic.length)];
  } else if (typeof topic === 'string' && topic.includes(',')) {
    const list = topic.split(',').map(t => t.trim()).filter(Boolean);
    if (list.length > 0) {
      activeTopic = list[Math.floor(Math.random() * list.length)];
    }
  }

  let chosenType = challengeType;
  if (challengeType === 'random') {
    const types = ['concept', 'multiple_choice', 'example'];
    chosenType = types[Math.floor(Math.random() * types.length)];
  }

  let formatInstruction = '';
  if (chosenType === 'multiple_choice') {
    formatInstruction = 'Format: Multiple choice with 4 distinct options ("options": ["Option A", "Option B", "Option C", "Option D"]) and 1 exact correctAnswer. Only ONE option is correct. "category": "Opción Múltiple".';
  } else if (chosenType === 'concept') {
    formatInstruction = 'Format: Concept / Open question (Pregunta abierta). Ask the student to explain a grammar rule, distinction, or language concept. "options": []. Provide "modelAnswer" with the expected explanation for teacher oral verification, and "promptInstructions": "Explica la regla o concepto en voz alta al docente." "category": "Concepto (Abierta)".';
  } else if (chosenType === 'example') {
    formatInstruction = 'Format: Example production (Dar un ejemplo). Ask the student to produce a complete example sentence applying the rule. "options": []. Provide "modelAnswer" with a clear model sentence, and "promptInstructions": "Di o escribe una oración de ejemplo aplicando la estructura." "category": "Dar un Ejemplo".';
  } else if (chosenType === 'fill_blank') {
    formatInstruction = 'Format: Sentence with a blank "____" to complete. Provide 4 options or leave options empty if oral. Provide correctAnswer.';
  } else if (chosenType === 'sentence_affirmative') {
    formatInstruction = 'Format: Provide cues [subject / verb / complement] for the student to say an AFFIRMATIVE sentence aloud. "options": []. Provide "modelAnswer".';
  } else if (chosenType === 'sentence_negative') {
    formatInstruction = 'Format: Provide cues for the student to say a NEGATIVE sentence aloud. "options": []. Provide "modelAnswer".';
  } else if (chosenType === 'sentence_question') {
    formatInstruction = 'Format: Provide cues for the student to ask a QUESTION aloud. "options": []. Provide "modelAnswer".';
  }

  const prompt = `Generate ONE engaging, unique English educational challenge for student "${studentName}" playing a Las Vegas casino classroom game.
Topic: "${activeTopic}"
Target Level: ${level}
Challenge Type: ${chosenType}
${formatInstruction}
${customInstructions ? `Teacher Notes: ${customInstructions}` : ''}

Output strictly a single JSON object:
{
  "id": "turn_q_${Date.now()}",
  "type": "${chosenType}",
  "question": "The question prompt or cues in English",
  "promptInstructions": "Instrucción corta en español para el estudiante/docente",
  "options": ["Opt1", "Opt2", "Opt3", "Opt4"],
  "correctAnswer": "Exact correct answer or model sentence",
  "modelAnswer": "Model sentence for teacher oral verification",
  "explanation": "Clear educational tip or grammar rule in Spanish or English",
  "category": "Grammar",
  "points": 200
}`;

  for (const currentModel of candidateModels) {
    try {
      const response = await fetch(GROQ_CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey.trim()}`
        },
        body: JSON.stringify({
          model: currentModel,
          messages: [
            { role: 'system', content: 'You are an elite ESL teacher creating a quick casino turn challenge.' },
            { role: 'user', content: prompt }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.8,
          max_tokens: 1000
        })
      });

      if (!response.ok) {
        continue;
      }

      const data = await response.json();
      const rawContent = data.choices?.[0]?.message?.content;
      if (!rawContent) continue;

      let parsed;
      try {
        parsed = JSON.parse(rawContent);
      } catch {
        const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
      }

      if (!parsed || !parsed.question) continue;

      const opts = Array.isArray(parsed.options) && parsed.options.length >= 2 ? parsed.options : [];
      const ans = parsed.correctAnswer || parsed.modelAnswer || (opts.length > 0 ? opts[0] : 'Yes');

      return {
        id: parsed.id || `turn_q_${Date.now()}`,
        type: parsed.type || chosenType,
        question: parsed.question,
        promptInstructions: parsed.promptInstructions || 'Responde el reto en voz alta o selecciona la opción.',
        options: opts,
        correctAnswer: ans,
        modelAnswer: parsed.modelAnswer || ans,
        explanation: parsed.explanation || 'Regla pedagógica.',
        category: parsed.category || 'English',
        points: Number(parsed.points) || 200
      };
    } catch {
      continue;
    }
  }

  throw new Error('No se pudo generar la pregunta de turno con Groq. Por favor verifica tu conexión y clave API.');
}
