import { describe, it, expect } from 'vitest';
import { learningHub } from '../learningHub';

describe('LearningHubEngine (stubs)', () => {
  it('creates and retrieves a tutorial', async () => {
    const data = {
      title: 'Intro to Modding',
      description: 'Starter guide',
      category: 'beginner',
      difficulty: 2,
      duration: 10,
      steps: [{ id: 's1', title: 'Step 1', content: 'Do X', type: 'reading', estimatedTime: 3 }],
      prerequisites: [],
      tags: ['modding'],
    } as any;

    const t = await learningHub.createTutorial(data);
    expect(t.title).toBe('Intro to Modding');
    const fetched = await learningHub.getTutorial(t.id);
    expect(fetched?.title).toBe('Intro to Modding');
  });

  it('tracks progress and completes steps', async () => {
    const uid = 'user_test';
    const all = Object.keys((learningHub as any).tutorials);
    const tutId = all[0];
    const stepId = (learningHub as any).tutorials[tutId].steps[0].id;
    await learningHub.trackProgress(uid, tutId, stepId);
    const prog = await learningHub.getUserProgress(uid);
    expect(prog.userId).toBe(uid);
    expect(prog.currentTutorials.length).toBeGreaterThan(0);
    const c = await learningHub.completeStep(uid, stepId);
    expect(c.success).toBe(true);
  });

  it('validates exercise submissions and provides hints', async () => {
    const valid = await learningHub.validateExercise('ex1', { correct: true });
    expect(valid.success).toBe(true);
    const hint = await learningHub.provideHint('ex1', { attempts: 1 });
    expect(hint.text).toContain('Hint');
  });

  it('unlocks achievements', async () => {
    const ach = await learningHub.unlockAchievement('user_x', 'first-step');
    expect(ach.name).toBeDefined();
    const list = await learningHub.listAchievements();
    expect(list.some(a => a.id === 'first-step')).toBe(true);
  });
});