/* Cortex Jailbreaks — the packs.

   Each pack lists its models. A model's files are always:
     packs/<pack id>/<model id>.md    the text the Copy button copies
     packs/<pack id>/<model id>.zip   what the Download button sends

   note:    the instruction line shown under the model name.
   updated: only a fallback. The real date is read from GitHub (see app.js) and
            only shown as this if that request fails.
   Models with no note simply show the date.
*/
window.PACKS = [
  {
    id: 'chatgpt', name: 'ChatGPT', provider: 'OpenAI', type: 'chat',
    symbol: '◉', logo: 'assets/logos/chatgpt.svg', file: 'AGENTS.md',
    blurb: 'Everyday writing, thinking and problem-solving.',
    models: [
      { id: 'md7dbcd87', name: '6.1 SOL — API', note: 'Unzip and select the unzipped folder as your workspace in your harness.', updated: '2026-10-29T21:02:35Z' },
      { id: 'm0b28343c', name: 'ASTRA 6 — soft', note: 'Paste as your first message into chat.', updated: '2026-10-29T20:58:40Z' }
    ]
  },
  {
    id: 'claude', name: 'Claude', provider: 'Anthropic', type: 'chat',
    symbol: '✳', logo: 'assets/logos/claude.svg', file: 'CLAUDE.md',
    blurb: 'Structured briefs and long-form projects.',
    models: [
      { id: 'm90be2b8f', name: 'Opus 4.7 — full', note: 'Unzip and select the unzipped folder as your workspace in Claude Code.', updated: '2026-10-29T21:04:18Z' },
      { id: 'mb59b01e7', name: 'Sonnet 4.6 — free', note: 'Paste into project instructions.', updated: '2026-10-29T20:52:11Z' }
    ]
  },
  {
    id: 'grok', name: 'Grok', provider: 'xAI', type: 'chat',
    symbol: '𝕏', logo: 'assets/logos/grok.svg', file: 'AGENTS.md',
    blurb: 'Direct answers and deliberate conversation.',
    models: [
      { id: 'm51548b3f', name: 'Grok Web — free', note: 'Paste the prompt into project instructions.', updated: '2026-10-29T19:54:02Z' }
    ]
  },
  {
    id: 'deepseek', name: 'DeepSeek', provider: 'DeepSeek', type: 'chat',
    symbol: '≈', logo: 'assets/logos/deepseek.svg', file: 'AGENTS.md',
    blurb: 'Technical briefs and step-by-step reasoning.',
    models: [
      { id: 'mf8e53157', name: 'V4.1 Flash 1017 — API', note: '', updated: '2026-10-29T19:31:15Z' },
      { id: 'm69cfb5f2', name: 'Web — paste as original', note: 'Deepthink on, Search on.', updated: '2026-10-29T19:26:11Z' }
    ]
  },
  {
    id: 'opencode', name: 'OpenCode', provider: 'Open source', type: 'coding',
    symbol: '▢', logo: 'assets/logos/opencode.svg', file: 'AGENTS.md',
    blurb: 'Terminal-first coding with an open-source agent.',
    models: [
      { id: 'm753d774f', name: 'Universal Prompt', note: 'Unzip and select the unzipped folder as your workspace in OpenCode.', updated: '2026-10-29T19:03:27Z' }
    ]
  },
  { id: 'gemini', name: 'Gemini', provider: 'Google', type: 'chat', symbol: '✦', logo: 'assets/logos/gemini.svg', file: 'GEMINI.md', blurb: 'Open-ended ideas into reusable instructions.', models: [] },
  { id: 'freebuff', name: 'Freebuff', provider: 'Codebuff', type: 'coding', symbol: 'F', logo: 'assets/logos/freebuff.svg', file: 'AGENTS.md', blurb: 'Building and fixing code with a free coding agent.', models: [] },
  { id: 'qoder', name: 'Qoder', provider: 'Alibaba', type: 'coding', symbol: 'Q', logo: 'assets/logos/qoder.svg', file: 'AGENTS.md', blurb: 'Larger specs and multi-step agent work.', models: [] },
  { id: 'zcode', name: 'ZCode', provider: 'Z.ai', type: 'coding', symbol: 'Z', logo: 'assets/logos/zcode.svg', file: 'AGENTS.md', blurb: 'Agent-driven builds in a desktop workspace.', models: [] }
];

/* Where a model's two files live, relative to the site root. */
window.packPath = (packId, modelId, ext) =>
  `${window.CORTEX.packsDir}/${packId}/${modelId}.${ext}`;
