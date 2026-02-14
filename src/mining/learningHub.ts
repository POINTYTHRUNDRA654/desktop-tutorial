import type { Tutorial, TutorialData, UserProgress, CurrentTutorial, StepCompletion, ValidationResult, Hint, Achievement } from '../shared/types';

function now() { return Date.now(); }
function makeId(prefix = 'tut') { return `${prefix}_${Math.floor(Math.random() * 90000) + 10000}`; }

export class LearningHubEngine {
  private tutorials: Record<string, Tutorial> = {};
  private progress: Record<string, UserProgress> = {}; // keyed by userId
  private achievements: Record<string, Achievement> = {};

  // Tutorial management
  async getTutorial(tutorialId: string): Promise<Tutorial | null> {
    return this.tutorials[tutorialId] ?? null;
  }

  async listTutorials(category?: string): Promise<Tutorial[]> {
    const all = Object.values(this.tutorials);
    if (!category) return all;
    return all.filter(t => t.category === category || t.tags?.includes(category));
  }

  async createTutorial(tutorial: TutorialData): Promise<Tutorial> {
    const id = tutorial.id || makeId();
    const normalized: Tutorial = {
      id,
      title: tutorial.title || 'Untitled',
      description: tutorial.description || '',
      category: (tutorial as any).category || 'beginner',
      difficulty: (tutorial as any).difficulty || 1,
      duration: (tutorial as any).duration ?? (tutorial.steps ? tutorial.steps.reduce((s, st) => s + (st.estimatedTime || 3), 0) : 0),
      steps: tutorial.steps || [],
      prerequisites: tutorial.prerequisites || [],
      tags: tutorial.tags || [],
      videoUrl: tutorial.videoUrl,
    };
    this.tutorials[id] = normalized;
    return normalized;
  }

  // Progress tracking
  async trackProgress(userId: string, tutorialId: string, stepId: string): Promise<void> {
    const prog = this.progress[userId] ?? { userId, completedTutorials: [], currentTutorials: [], achievements: [], totalPoints: 0, level: 1 };

    let current = prog.currentTutorials.find(c => c.tutorialId === tutorialId);
    const tutorial = this.tutorials[tutorialId];
    const stepIndex = tutorial ? Math.max(0, tutorial.steps.findIndex(s => s.id === stepId)) : 0;

    if (!current) {
      current = { tutorialId, currentStep: stepIndex, startedAt: now(), lastAccessed: now() };
      prog.currentTutorials.push(current);
    } else {
      current.currentStep = stepIndex;
      current.lastAccessed = now();
    }

    // mark completed step if not already implied by completedTutorials
    if (tutorial && stepIndex === tutorial.steps.length - 1 && !prog.completedTutorials.includes(tutorialId)) {
      prog.completedTutorials.push(tutorialId);
      prog.totalPoints += 10; // award some points
    }

    this.progress[userId] = prog;
  }

  async getUserProgress(userId: string): Promise<UserProgress> {
    return this.progress[userId] ?? { userId, completedTutorials: [], currentTutorials: [], achievements: [], totalPoints: 0, level: 1 };
  }

  async completeStep(userId: string, stepId: string): Promise<StepCompletion> {
    // Find tutorial that contains the step
    const tEntry = Object.values(this.tutorials).find(t => t.steps.some(s => s.id === stepId));
    const tutorialId = tEntry ? tEntry.id : 'unknown';
    await this.trackProgress(userId, tutorialId, stepId);
    const completion: StepCompletion = { userId, stepId, completedAt: now(), success: true, xpEarned: 10 };
    return completion;
  }

  // Interactive exercises
  async validateExercise(exerciseId: string, submission: any): Promise<ValidationResult> {
    const ok = submission && (submission.correct === true || submission.answer === 'correct');
    return { success: !!ok, score: ok ? 1 : 0, feedback: ok ? 'Well done' : 'Try again — check the example in step notes' };
  }

  async provideHint(exerciseId: string, currentAttempt: any): Promise<Hint> {
    const attempts = (currentAttempt && currentAttempt.attempts) || 0;
    const level = Math.min(3, attempts + 1);
    const text = `Hint (level ${level}) for ${exerciseId}: focus on the core API call and required parameters.`;
    return { text, hintLevel: level };
  }

  // Achievement system (per-user unlocks recorded in UserProgress)
  async unlockAchievement(userId: string, achievementId: string): Promise<Achievement> {
    let ach = this.achievements[achievementId];
    if (!ach) {
      ach = { id: achievementId, name: achievementId.replace(/[-_]/g, ' '), description: 'Unlocked via LearningHub', icon: '', points: 10, unlockedAt: Date.now() };
      this.achievements[achievementId] = ach;
    } else {
      ach.unlockedAt = Date.now();
    }

    const prog = await this.getUserProgress(userId);
    if (!prog.achievements.includes(achievementId)) {
      prog.achievements.push(achievementId);
      prog.totalPoints += (ach.points || 0);
    }
    this.progress[userId] = prog;
    return ach;
  }

  async listAchievements(): Promise<Achievement[]> {
    return Object.values(this.achievements);
  }
}

export const learningHub = new LearningHubEngine();
export default learningHub;
