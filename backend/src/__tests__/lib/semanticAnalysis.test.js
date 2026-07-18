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

  test('disabled without ANTHROPIC_API_KEY — returns [] and never calls the API', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const { isSemanticEnabled, analyzeSemantics } = load();
    expect(isSemanticEnabled()).toBe(false);
    expect(await analyzeSemantics('Wow, must be nice being perfect')).toEqual([]);
    expect(mockCreate).not.toHaveBeenCalled();
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
