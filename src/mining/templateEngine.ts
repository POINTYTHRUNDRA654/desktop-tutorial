import type { Template, TemplateVariable, RenderedTemplate } from '../shared/types';

/**
 * Minimal in-memory template renderer used by the Documentation generator and tests.
 * - Replaces {{VARNAME}} with provided variables
 * - For arrays, joins with newlines (or bullet lists when `joinAsList=true`)
 * - Does basic validation against Template.variables when provided
 */
export class TemplateEngine {
  render(template: Template, vars: Record<string, any> = {}, joinAsList = true): string {
    const content = template.content || '';

    // Apply defaults from template variable definitions
    const resolved: Record<string, any> = {};
    if (Array.isArray(template.variables)) {
      for (const v of template.variables as TemplateVariable[]) {
        resolved[v.name] = v.default;
      }
    }

    // Override with provided vars
    for (const k of Object.keys(vars || {})) resolved[k] = vars[k];

    // Replacement function
    const out = content.replace(/{{\s*([A-Z0-9_]+)\s*}}/g, (_m, key) => {
      const val = resolved[key];
      if (val === undefined || val === null) return '';
      if (Array.isArray(val)) {
        return joinAsList ? val.map((s) => `- ${s}`).join('\n') : val.join('\n');
      }
      return String(val);
    });

    return out;
  }

  validate(template: Template, vars: Record<string, any> = {}): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const defs = (template.variables || []).reduce((acc: Record<string, TemplateVariable>, v: TemplateVariable) => { acc[v.name] = v; return acc; }, {} as any);
    for (const k of Object.keys(vars)) {
      if (!defs[k]) {
        errors.push(`Unknown variable: ${k}`);
        continue;
      }
      const def = defs[k];
      const val = vars[k];
      switch (def.type) {
        case 'string': if (typeof val !== 'string') errors.push(`${k} should be a string`); break;
        case 'number': if (typeof val !== 'number') errors.push(`${k} should be a number`); break;
        case 'boolean': if (typeof val !== 'boolean') errors.push(`${k} should be a boolean`); break;
        case 'array': if (!Array.isArray(val)) errors.push(`${k} should be an array`); break;
        default: break;
      }
    }
    return { valid: errors.length === 0, errors };
  }

  renderWithValidation(template: Template, vars: Record<string, any> = {}, joinAsList = true): RenderedTemplate {
    const v = this.validate(template, vars);
    if (!v.valid) throw new Error('Template validation failed: ' + v.errors.join('; '));
    const output = this.render(template, vars, joinAsList);
    return { templateId: template.id, output, renderedAt: Date.now() };
  }
}

export const templateEngine = new TemplateEngine();
export default templateEngine;
