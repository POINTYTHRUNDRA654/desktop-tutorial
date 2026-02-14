import { describe, it, expect } from 'vitest';
import { readmeTemplate, readmeVariables } from '../../shared/templates';
import { templateEngine } from '../templateEngine';

describe('TemplateEngine', () => {
  it('renders string and array variables into template', () => {
    const out = templateEngine.render(readmeTemplate, { ...readmeVariables });
    expect(out).toContain('My Awesome Mod');
    expect(out).toContain('Feature 1');
    expect(out).toContain('- Feature 1');
  });

  it('validate rejects unknown variable and wrong types', () => {
    const invalidVars = { UNKNOWN_VAR: 'x', FEATURES: 'not-an-array' } as any;
    const res = templateEngine.validate(readmeTemplate as any, invalidVars);
    expect(res.valid).toBe(false);
    expect(res.errors.length).toBeGreaterThan(0);
  });

  it('renderWithValidation returns RenderedTemplate on valid input', () => {
    const rendered = templateEngine.renderWithValidation(readmeTemplate, readmeVariables as any);
    expect(rendered.templateId).toBe(readmeTemplate.id);
    expect(rendered.output).toContain('My Awesome Mod');
    expect(typeof rendered.renderedAt).toBe('number');
  });
});