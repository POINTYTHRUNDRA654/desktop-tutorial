import { describe, it, expect } from 'vitest';
import { AIModAssistantEngine } from '../aiModAssistant';

const engine = new AIModAssistantEngine();

describe('AIModAssistantEngine (stub)', () => {
  it('chat echoes message and creates conversation id', async () => {
    const res = await engine.chat('hello', {} as any);
    expect(res.conversationId).toBeTruthy();
    expect(res.message).toContain('Echo: hello');
  });

  it('generateScript returns code for papyrus', async () => {
    const gen = await engine.generateScript('make a script', 'papyrus');
    expect(gen.language).toBe('papyrus');
    expect(gen.code).toContain('Scriptname');
  });

  it('explainCode returns a summary and steps', async () => {
    const exp = await engine.explainCode('function foo() {}');
    expect(exp.summary).toBeTruthy();
    expect(exp.steps.length).toBeGreaterThan(0);
  });

  it('parseIntent recognizes generate_code', async () => {
    const intent = await engine.parseIntent('please generate a papyrus script for me');
    expect(intent.name).toBe('generate_code');
    expect(intent.confidence).toBeGreaterThan(0.5);
  });

  it('analyzeImage returns tags and objects', async () => {
    const a = await engine.analyzeImage('/tmp/img.png', 'What is this?');
    expect(a.tags.length).toBeGreaterThan(0);
    expect(a.objects && a.objects[0].name).toBe('button');
  });
});