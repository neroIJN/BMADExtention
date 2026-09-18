import {
  BmadLifecyclePhase,
  BmadProjectStatus,
  BmadSkillNode,
  BmadSkillRecommendation
} from './types';

/**
 * Maps phase identifiers to concise, human-readable display names for the status bar.
 */
const PHASE_SHORT_NAMES: Record<string, string> = {
  '0-learning': 'Learning',
  '1-analysis': 'Analysis',
  '2-plan': 'Planning',
  '3-solutioning': 'Solutioning',
  '4-implementation': 'Implementing',
  ship: 'Ship',
  anytime: 'General'
};

/**
 * Evaluates the active lifecycle state of a BMAD project based on parsed phases
 * and completed artifacts, and generates prioritized next-skill recommendations.
 *
 * @param phases Array of parsed lifecycle phases with artifact completion statuses
 * @returns Evaluated BmadProjectStatus with status bar text and recommended actions
 */
export function evaluateProjectStatus(phases: BmadLifecyclePhase[]): BmadProjectStatus {
  if (!phases || phases.length === 0) {
    return {
      activePhaseId: '2-plan',
      activePhaseLabel: 'Phase 2: Planning & Architecture',
      phaseStatus: 'not-started',
      statusBarText: '$(sparkle) BMAD: Initializing',
      statusBarTooltip: 'BMAD workspace is initializing...',
      recommendations: []
    };
  }

  // Filter sequential workflow phases (excluding cross-cutting 'anytime')
  const workflowPhases = phases.filter((p) => p.id !== 'anytime');
  const allSkills = phases.flatMap((p) => p.skills);

  let activePhase = workflowPhases[0] || phases[0];
  let phaseStatus: 'not-started' | 'in-progress' | 'completed' = 'in-progress';

  // Walk phases sequentially to find current progression point
  for (const phase of workflowPhases) {
    const requiredSkills = phase.skills.filter((s) => s.required);
    const hasInProgress = phase.skills.some((s) => s.status === 'in-progress');
    const allRequiredDone =
      requiredSkills.length > 0 && requiredSkills.every((s) => s.status === 'completed');
    const allSkillsDone = phase.skills.every((s) => s.status === 'completed');

    if (hasInProgress) {
      activePhase = phase;
      phaseStatus = 'in-progress';
      break;
    }

    if (!allRequiredDone && requiredSkills.length > 0) {
      activePhase = phase;
      const anyDone = phase.skills.some((s) => s.status === 'completed');
      phaseStatus = anyDone ? 'in-progress' : 'not-started';
      break;
    }

    // If this is the last workflow phase (ship)
    if (phase === workflowPhases[workflowPhases.length - 1]) {
      activePhase = phase;
      phaseStatus = allSkillsDone ? 'completed' : 'in-progress';
      break;
    }
  }

  // Generate recommendations
  const recommendations: BmadSkillRecommendation[] = [];

  // 1. High priority: Any incomplete required skills in the active phase
  const incompleteRequired = activePhase.skills.filter(
    (s) => s.required && s.status !== 'completed'
  );
  for (const skill of incompleteRequired) {
    recommendations.push({
      skill,
      reason: `Required gate for ${activePhase.label}`,
      priority: 'high'
    });
  }

  // 2. Normal priority: Other incomplete skills in the active phase
  const incompleteOptional = activePhase.skills.filter(
    (s) => !s.required && s.status !== 'completed'
  );
  for (const skill of incompleteOptional.slice(0, 3)) {
    recommendations.push({
      skill,
      reason: `Recommended next step in ${activePhase.label}`,
      priority: 'normal'
    });
  }

  // 3. If in Ship phase and Build is complete or active, suggest Code Review and Walkthrough
  if (activePhase.id === 'ship') {
    const buildSkill = allSkills.find((s) => s.skill === 'bmad-build');
    const reviewSkill = allSkills.find((s) => s.skill === 'bmad-code-review');
    const walkthroughSkill = allSkills.find((s) => s.skill === 'bmad-walkthrough');

    if (buildSkill && buildSkill.status === 'completed' && reviewSkill) {
      recommendations.unshift({
        skill: reviewSkill,
        reason: 'Review implemented changes before shipping',
        priority: 'high'
      });
    }

    if (walkthroughSkill && !recommendations.some((r) => r.skill.skill === 'bmad-walkthrough')) {
      recommendations.push({
        skill: walkthroughSkill,
        reason: 'Guided human review and verification of implemented changes',
        priority: 'normal'
      });
    }
  }

  // 4. Always suggest Sprint Status if sprint planning exists
  const sprintStatusSkill = allSkills.find(
    (s) => s.skill === 'bmad-sprint-planning' && s.action === 'status'
  );
  if (sprintStatusSkill && !recommendations.some((r) => r.skill.skill === 'bmad-sprint-planning')) {
    recommendations.push({
      skill: sprintStatusSkill,
      reason: 'Check sprint progress, risks, and next actions',
      priority: 'normal'
    });
  }

  const shortPhaseName = PHASE_SHORT_NAMES[activePhase.id] || activePhase.id;
  const statusLabel =
    phaseStatus === 'completed'
      ? 'Done'
      : phaseStatus === 'in-progress'
      ? 'In Progress'
      : 'Ready';

  const statusBarText = `$(sparkle) BMAD: ${shortPhaseName} (${statusLabel})`;
  const statusBarTooltip = `BMAD Method: ${activePhase.label}\nStatus: ${statusLabel}\nClick to view recommended next skills.`;

  return {
    activePhaseId: activePhase.id,
    activePhaseLabel: activePhase.label,
    phaseStatus,
    statusBarText,
    statusBarTooltip,
    recommendations
  };
}
