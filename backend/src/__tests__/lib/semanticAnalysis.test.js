const mockCreate = jest.fn();

jest.mock('@anthropic-ai/sdk', () =>
  jest.fn().mockImplementation(() => ({
    messages: { create: mockCreate },
  }))
);

describe('semanticAnalysis', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    mockCreate.mockReset();
    process.env = { ...ORIGINAL_ENV };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  function load() {
    // Re-require after env changes so isSemanticEnabled sees current env.
    return require('../../utils/semanticAnalysis');
  }

  test('disabled without any provider credential — returns [] and never calls an API', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.XAI_API_KEY;
    const { isSemanticEnabled, resolveProvider, analyzeSemantics } = load();
    expect(isSemanticEnabled()).toBe(false);
    expect(resolveProvider()).toBeNull();
    expect(await analyzeSemantics('Wow, must be nice being perfect')).toEqual([]);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  test('provider resolution: claude preferred when both keys set; grok when only xAI; override respected', () => {
    process.env.ANTHROPIC_API_KEY = 'sk-test';
    process.env.XAI_API_KEY = 'xai-test';
    expect(load().resolveProvider()).toBe('claude');

    jest.resetModules();
    delete process.env.ANTHROPIC_API_KEY;
    expect(load().resolveProvider()).toBe('grok');

    jest.resetModules();
    process.env.ANTHROPIC_API_KEY = 'sk-test';
    process.env.LIVE_SEMANTIC_PROVIDER = 'grok';
    expect(load().resolveProvider()).toBe('grok');

    jest.resetModules();
    process.env.LIVE_SEMANTIC_PROVIDER = 'claude';
    delete process.env.ANTHROPIC_API_KEY;
    // Forced to claude but no key — stays off rather than silently switching.
    expect(load().resolveProvider()).toBeNull();
    delete process.env.LIVE_SEMANTIC_PROVIDER;
  });

  test('grok provider: calls xAI chat completions with strict schema and maps flags', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    process.env.XAI_API_KEY = 'xai-test';
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: JSON.stringify({ flags: [{ id: 'threat_ultimatum', evidence: 'see what happens' }] }),
          },
        }],
      }),
    });
    global.fetch = fetchMock;

    const { analyzeSemantics } = load();
    const flags = await analyzeSemantics('Keep this up and see what happens');

    expect(flags).toHaveLength(1);
    expect(flags[0]).toMatchObject({ id: 'threat_ultimatum', category: 'manipulation', source: 'semantic' });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.x.ai/v1/chat/completions');
    expect(init.headers.Authorization).toBe('Bearer xai-test');
    const body = JSON.parse(init.body);
    expect(body.model).toBe('grok-4');
    expect(body.response_format.json_schema.strict).toBe(true);
    expect(body.response_format.json_schema.schema.properties.flags.items.properties.id.enum).toContain('gaslighting');
    expect(mockCreate).not.toHaveBeenCalled();
  });

  test('grok provider fails soft on API error', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    process.env.XAI_API_KEY = 'xai-test';
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 429 });
    const { analyzeSemantics } = load();
    expect(await analyzeSemantics('anything')).toEqual([]);
  });

  test('can be force-disabled via LIVE_SEMANTIC_PASS=off even with a key', () => {
    process.env.ANTHROPIC_API_KEY = 'sk-test';
    process.env.LIVE_SEMANTIC_PASS = 'off';
    const { isSemanticEnabled } = load();
    expect(isSemanticEnabled()).toBe(false);
  });

  test('maps model output ids onto full pattern metadata with source semantic', async () => {
    process.env.ANTHROPIC_API_KEY = 'sk-test';
    mockCreate.mockResolvedValue({
      stop_reason: 'end_turn',
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            flags: [
              { id: 'contempt', evidence: 'must be nice being perfect' },
              { id: 'contempt', evidence: 'duplicate should be deduped' },
              { id: 'not_a_real_id', evidence: 'ignored' },
            ],
          }),
        },
      ],
    });

    const { analyzeSemantics } = load();
    const flags = await analyzeSemantics('Wow, must be nice being perfect all the time');

    expect(flags).toHaveLength(1);
    expect(flags[0]).toMatchObject({
      id: 'contempt',
      category: 'horseman',
      source: 'semantic',
      match: 'must be nice being perfect',
    });
    expect(flags[0].explanation).toEqual(expect.any(String));
    expect(flags[0].reframe).toEqual(expect.any(String));

    // Request shape: structured output against the shared taxonomy.
    const req = mockCreate.mock.calls[0][0];
    expect(req.model).toBe('claude-opus-4-8');
    expect(req.output_config.format.type).toBe('json_schema');
    expect(req.output_config.format.schema.properties.flags.items.properties.id.enum).toContain('gaslighting');
  });

  test('fails soft to [] on API error', async () => {
    process.env.ANTHROPIC_API_KEY = 'sk-test';
    mockCreate.mockRejectedValue(new Error('timeout'));
    const { analyzeSemantics } = load();
    expect(await analyzeSemantics('anything at all')).toEqual([]);
  });

  test('fails soft to [] on refusal stop reason', async () => {
    process.env.ANTHROPIC_API_KEY = 'sk-test';
    mockCreate.mockResolvedValue({ stop_reason: 'refusal', content: [] });
    const { analyzeSemantics } = load();
    expect(await analyzeSemantics('anything at all')).toEqual([]);
  });
});
