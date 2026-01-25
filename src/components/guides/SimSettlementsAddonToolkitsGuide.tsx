import React, { useState } from 'react';
import styles from './GuideStyles.module.css';
import { ExternalLink, Download } from 'lucide-react';

export default function SimSettlementsAddonToolkitsGuide() {
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({});

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const SectionHeader = ({ id, title, subtitle }: { id: string; title: string; subtitle?: string }) => (
    <div
      className={styles.sectionHeader}
      onClick={() => toggleSection(id)}
      style={{ cursor: 'pointer' }}
    >
      <div className={styles.headerTitle}>
        <span className={styles.expandIcon}>{expandedSections[id] ? '▼' : '▶'}</span>
        <h2 className={styles.h2}>{title}</h2>
      </div>
      {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
    </div>
  );

  const ExternalLink_ = ({ url, text }: { url: string; text: string }) => (
    <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: '#00ff00', textDecoration: 'underline', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
      {text}
      <ExternalLink size={14} />
    </a>
  );

  return (
    <div className={styles.guideContainer}>
      <div className={styles.header}>
        <h1 className={styles.mainTitle}>Sim Settlements 2: Add-On Toolkits & Tutorials</h1>
        <p className={styles.versionInfo}>Complete Resource Guide v1.0</p>
        <p className={styles.scopeInfo}>
          Essential resources, toolkits, and tutorials for creating Sim Settlements 2 add-on content
        </p>
      </div>

      {/* Introduction */}
      <SectionHeader id="intro" title="Introduction" subtitle="Getting started with add-on creation" />
      {expandedSections['intro'] && (
        <div className={styles.sectionContent}>
          <div className={styles.contentBlock}>
            <h3>What You Can Create</h3>
            <ul>
              <li><strong>Building Plans</strong> - Custom structures and automation</li>
              <li><strong>City Plans</strong> - Complete settlement designs with progression</li>
              <li><strong>Character Cards</strong> - NPC personalities and preferences</li>
              <li><strong>Worldspaces</strong> - Custom locations for settlements</li>
              <li><strong>Advanced Systems</strong> - Discoveries, flags, holidays, leaders, newspapers, pets, supplies, world repopulation</li>
              <li><strong>Traits & Leaders</strong> - Settlement leadership with unique effects</li>
              <li><strong>Industrial Systems</strong> - Resource conversion and production</li>
            </ul>

            <h3>Prerequisites</h3>
            <div className={styles.checklistBox}>
              <label>✓ Creation Kit installed (free)</label>
              <label>✓ Fallout 4 + DLC installed</label>
              <label>✓ Basic modding knowledge</label>
              <label>✓ SS2 mod installed for testing</label>
              <label>✓ 20-100 hours commitment (depending on complexity)</label>
            </div>

            <h3>Quick Stats</h3>
            <table className={styles.statsTable}>
              <tr>
                <td><strong>Simple Addon Time</strong></td>
                <td>25-40 hours</td>
              </tr>
              <tr>
                <td><strong>Medium Addon Pack</strong></td>
                <td>45-75 hours</td>
              </tr>
              <tr>
                <td><strong>Complex with Systems</strong></td>
                <td>80-140 hours</td>
              </tr>
            </table>
          </div>
        </div>
      )}

      {/* Add-On Maker's Toolkit */}
      <SectionHeader id="toolkit" title="Add-On Maker's Toolkit" subtitle="Official development resources and templates" />
      {expandedSections['toolkit'] && (
        <div className={styles.sectionContent}>
          <div className={styles.contentBlock}>
            <h3>What's Included</h3>
            <div className={styles.toolkitFeatures}>
              <div className={styles.featureBox}>
                <h4>📚 Documentation</h4>
                <ul>
                  <li>Complete system guides</li>
                  <li>Property-by-property breakdowns</li>
                  <li>Best practices</li>
                  <li>Troubleshooting references</li>
                </ul>
              </div>
              <div className={styles.featureBox}>
                <h4>📦 Template Files</h4>
                <ul>
                  <li>Building plan templates</li>
                  <li>City plan structures</li>
                  <li>Character card setup</li>
                  <li>Worldspace forms</li>
                </ul>
              </div>
              <div className={styles.featureBox}>
                <h4>🔍 Example Plugins</h4>
                <ul>
                  <li>Complete add-ons</li>
                  <li>Best practices shown</li>
                  <li>File structure examples</li>
                  <li>Integration patterns</li>
                </ul>
              </div>
              <div className={styles.featureBox}>
                <h4>🛠️ Tools & Utilities</h4>
                <ul>
                  <li>City Plan Maker (web-based)</li>
                  <li>Building plan helpers</li>
                  <li>Data calculation sheets</li>
                  <li>Resource assistants</li>
                </ul>
              </div>
            </div>

            <h3>How to Get the Toolkit</h3>
            <div className={styles.downloadBox}>
              <p><strong>Official Sources:</strong></p>
              <ul>
                <li>Nexus Mods - Sim Settlements 2 main page</li>
                <li>Discord Server - #downloads or #resources channel</li>
                <li>GitHub - If applicable to your build</li>
              </ul>
              <p style={{ marginTop: '1rem' }}>
                <strong>File Size:</strong> Typically 50-200MB  
                <br />
                <strong>What to Look For:</strong> "Add-On Maker's Toolkit" or "Toolkit" in filename
              </p>
            </div>

            <h3>Toolkit File Structure</h3>
            <pre className={styles.codeBlock}>
SS2 Add-On Maker's Toolkit/
├── Documentation/
│   ├── Guides/          (System walkthroughs)
│   ├── Quick-Starts/    (Fast introductions)
│   └── References/      (Property lookup)
├── Templates/
│   ├── BuildingPlans/   (Building plan bases)
│   ├── CityPlans/       (City plan structures)
│   └── Worldspaces/     (Worldspace forms)
├── Examples/
│   ├── ExampleAddon1/   (Complete addon example)
│   ├── ExampleAddon2/   (Alternative approach)
│   └── ExampleAddon3/   (Advanced example)
├── Tools/
│   ├── CityPlanMaker/   (Web tool)
│   └── DataSheets/      (Calculation helpers)
└── Resources/
    ├── Scripts/         (Papyrus examples)
    └── Assets/          (Shared resources)
            </pre>

            <h3>Key Toolkit Features</h3>

            <div className={styles.propertyGroup}>
              <h4>Example Plugins</h4>
              <p>Pre-built complete add-ons demonstrating:</p>
              <ul>
                <li>Proper folder organization</li>
                <li>File naming conventions</li>
                <li>Best practices in action</li>
                <li>Complete workflows</li>
                <li>Testing procedures</li>
              </ul>
              <p className={styles.note}>
                <strong>Tip:</strong> Study these before creating your own. Copy-modify rather than building from scratch.
              </p>
            </div>

            <div className={styles.propertyGroup}>
              <h4>Template Files</h4>
              <p>Ready-to-modify starting points:</p>
              <ul>
                <li>Don't create from scratch</li>
                <li>Already follow best practices</li>
                <li>Compatible structures</li>
                <li>Reduced setup time</li>
              </ul>
            </div>

            <div className={styles.propertyGroup}>
              <h4>Web Tools</h4>
              <p><strong>City Plan Maker</strong></p>
              <p>Browser-based plugin generation without Creation Kit:</p>
              <ul>
                <li>Multi-level support</li>
                <li>Automatic packaging</li>
                <li>No CK required for basic setup</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Bethesda Mod School */}
      <SectionHeader id="modschool" title="Bethesda Mod School Resources" subtitle="YouTube tutorials by kinggath" />
      {expandedSections['modschool'] && (
        <div className={styles.sectionContent}>
          <div className={styles.contentBlock}>
            <h3>About Bethesda Mod School</h3>
            <div className={styles.infoBox}>
              <p>
                <strong>Creator:</strong> kinggath (Sim Settlements 2 Lead Developer)
              </p>
              <p>
                <strong>Platform:</strong> YouTube (free)
              </p>
              <p>
                <strong>Content:</strong> Modding tutorials from beginner to advanced
              </p>
              <p>
                <strong>Focus:</strong> Creation Kit, SS2 add-on creation, scripting
              </p>
            </div>

            <h3>Key Video Series</h3>

            <div className={styles.tutorialSeries}>
              <h4>🟩 Beginner Series</h4>
              <p>Start here if you're new to modding</p>
              <ul>
                <li><strong>Creation Kit Fundamentals</strong> - UI, basics, plugin management</li>
                <li><strong>Your First Addon</strong> - Complete walkthrough (ESSENTIAL)</li>
                <li><strong>Basic Form Creation</strong> - Creating and editing records</li>
              </ul>
            </div>

            <div className={styles.tutorialSeries}>
              <h4>🟦 Sim Settlements 2 Series</h4>
              <p>SS2-specific addon creation</p>
              <ul>
                <li><strong>SS2 Architecture Overview</strong> - How systems fit together</li>
                <li><strong>Building Plan Creation</strong> - Complete walkthrough</li>
                <li><strong>City Plan Design</strong> - Multi-level design and testing</li>
                <li><strong>Character Cards</strong> - NPC customization</li>
                <li><strong>Worldspace Integration</strong> - Custom locations</li>
              </ul>
            </div>

            <div className={styles.tutorialSeries}>
              <h4>🟧 Advanced Systems</h4>
              <p>Complex features and scripting</p>
              <ul>
                <li><strong>Conversion and Production</strong> - Industrial systems</li>
                <li><strong>Traits and Leaders</strong> - Settlement bonuses</li>
                <li><strong>Unlock System</strong> - Conditional availability</li>
                <li><strong>Papyrus Scripting</strong> - Custom behavior</li>
              </ul>
            </div>

            <h3>How to Access</h3>
            <ol>
              <li>Go to YouTube</li>
              <li>Search: "Bethesda Mod School" or "kinggath"</li>
              <li>Subscribe for notifications</li>
              <li>Check SS2 Discord for organized playlists</li>
              <li>Sort by newest to see recent tutorials</li>
            </ol>

            <h3>Recommended Viewing Order</h3>
            <div className={styles.timelineBox}>
              <div className={styles.timelineItem}>
                <strong>Week 1-2: Foundations</strong>
                <ul>
                  <li>CK Installation & Setup</li>
                  <li>UI Overview</li>
                  <li>"Your First Addon" Part 1-3</li>
                </ul>
                <p className={styles.timeInfo}>~5-10 hours</p>
              </div>

              <div className={styles.timelineItem}>
                <strong>Week 3-4: SS2 Basics</strong>
                <ul>
                  <li>SS2 Overview</li>
                  <li>Building Plans Fundamentals</li>
                  <li>Your first addon walkthrough</li>
                </ul>
                <p className={styles.timeInfo}>~8-12 hours</p>
              </div>

              <div className={styles.timelineItem}>
                <strong>Week 5-6: First Project</strong>
                <ul>
                  <li>Choose your content type</li>
                  <li>Follow relevant series</li>
                  <li>Create working addon</li>
                </ul>
                <p className={styles.timeInfo}>~10-15 hours</p>
              </div>

              <div className={styles.timelineItem}>
                <strong>Week 7+: Refinement & Release</strong>
                <ul>
                  <li>Polish addon</li>
                  <li>Comprehensive testing</li>
                  <li>Package for distribution</li>
                </ul>
                <p className={styles.timeInfo}>~8-10 hours</p>
              </div>
            </div>

            <h3>Learning Tips</h3>
            <ul>
              <li><strong>Don't just watch</strong> - Pause and replicate each step</li>
              <li><strong>Follow along</strong> - Use your own CK instance</li>
              <li><strong>Take notes</strong> - Write down key concepts</li>
              <li><strong>Reference back</strong> - Rewatch sections as needed</li>
              <li><strong>Test as you go</strong> - Don't wait until "finished" to test</li>
            </ul>
          </div>
        </div>
      )}

      {/* Getting Started */}
      <SectionHeader id="gettingstarted" title="Getting Started with Add-Ons" subtitle="Step-by-step approach to your first addon" />
      {expandedSections['gettingstarted'] && (
        <div className={styles.sectionContent}>
          <div className={styles.contentBlock}>
            <h3>Step 1: Preparation</h3>
            <div className={styles.checklist}>
              <label>☐ Creation Kit installed and working</label>
              <label>☐ Fallout 4 + DLC fully installed</label>
              <label>☐ Add-On Maker's Toolkit downloaded</label>
              <label>☐ Bethesda Mod School YouTube bookmarked</label>
              <label>☐ SS2 installed in test game</label>
              <label>☐ Text editor (Notepad++, VS Code)</label>
              <label>☐ GitHub account (optional)</label>
            </div>

            <h3>Step 2: Learning Phase</h3>
            <p><strong>Minimum commitment: 20-30 hours before creating original content</strong></p>
            <ol>
              <li>Watch "Your First Addon" series (1-2 hours)</li>
              <li>Read system documentation (3-5 hours)</li>
              <li>Study example plugins (3-5 hours)</li>
              <li>Watch specific tutorials for your focus (2-4 hours)</li>
              <li>Modify example addon (2-3 hours)</li>
            </ol>

            <h3>Step 3: Choose Your First Project</h3>
            <div className={styles.adviceBox}>
              <h4>✓ Good Starting Points</h4>
              <ul>
                <li>Simple building plan (single purpose)</li>
                <li>Character card additions</li>
                <li>Small worldspace addon</li>
                <li>Building plan with 2-3 levels</li>
              </ul>

              <h4>✗ Avoid for First Project</h4>
              <ul>
                <li>Complex multi-system addons</li>
                <li>Extensive Papyrus scripts</li>
                <li>Advanced trait effects</li>
                <li>Full-featured city plans</li>
              </ul>

              <h4>⭐ Ideal First Project</h4>
              <ul>
                <li>Single building plan</li>
                <li>Produces one resource type</li>
                <li>Uses existing cost structure</li>
                <li>No custom scripts</li>
                <li>Includes 2-3 levels</li>
              </ul>
            </div>

            <h3>Step 4: Development</h3>
            <ol>
              <li>Create plugin in Creation Kit</li>
              <li>Reference example addon as template</li>
              <li>Follow tutorial for your content type</li>
              <li>Frequently refer to documentation</li>
              <li>Test in-game after each major change</li>
            </ol>

            <h3>Step 5: Testing Checklist</h3>
            <div className={styles.checklist}>
              <label>☐ Loads without errors</label>
              <label>☐ All forms in expected location</label>
              <label>☐ No conflicts with SS2</label>
              <label>☐ Costs display correctly</label>
              <label>☐ No missing references</label>
              <label>☐ Visually appears intended</label>
              <label>☐ Documentation accurate</label>
              <label>☐ Tested in multiple save states</label>
            </div>

            <h3>Step 6: Package & Release</h3>
            <ol>
              <li>Create proper folder structure</li>
              <li>Write clear README with requirements</li>
              <li>List compatibility and dependencies</li>
              <li>Package as .zip or .7z</li>
              <li>Upload to Nexus Mods or GitHub</li>
              <li>Share in Discord #releases channel</li>
            </ol>
          </div>
        </div>
      )}

      {/* Tutorial Organization */}
      <SectionHeader id="organized" title="Tutorial Organization" subtitle="Organized by skill level and content type" />
      {expandedSections['organized'] && (
        <div className={styles.sectionContent}>
          <div className={styles.contentBlock}>
            <h3>By Skill Level</h3>

            <div className={styles.skillLevel}>
              <h4>🟩 Beginner</h4>
              <ul>
                <li>Installation and setup</li>
                <li>Basic plugin creation</li>
                <li>Your first addon</li>
                <li>Simple building plans</li>
                <li>Understanding resources</li>
              </ul>
            </div>

            <div className={styles.skillLevel}>
              <h4>🟨 Intermediate</h4>
              <ul>
                <li>Multi-level designs</li>
                <li>Complex resources</li>
                <li>Character cards</li>
                <li>Worldspace basics</li>
                <li>Trait creation</li>
              </ul>
            </div>

            <div className={styles.skillLevel}>
              <h4>🟥 Advanced</h4>
              <ul>
                <li>Papyrus scripting</li>
                <li>Custom effects</li>
                <li>Advanced worldspaces</li>
                <li>Full addon packs</li>
                <li>Performance optimization</li>
              </ul>
            </div>

            <h3>By Content Type Learning Path</h3>

            <div className={styles.contentPath}>
              <h4>Building Plans</h4>
              <ol>
                <li>Watch: "Building Plan Creation Fundamentals"</li>
                <li>Read: Building Plans guide from documentation</li>
                <li>Study: Example building plans in toolkit</li>
                <li>Create: Your first simple building plan</li>
                <li>Enhance: Add multiple levels and progression</li>
              </ol>
            </div>

            <div className={styles.contentPath}>
              <h4>City Plans</h4>
              <ol>
                <li>Read: City Plans overview</li>
                <li>Use: City Plan Maker web tool</li>
                <li>Watch: "City Plan Design and Testing"</li>
                <li>Study: Example city plans</li>
                <li>Create: Your custom city plan</li>
              </ol>
            </div>

            <div className={styles.contentPath}>
              <h4>Character Cards</h4>
              <ol>
                <li>Watch: "Character Card Setup"</li>
                <li>Read: Character Cards guide</li>
                <li>Study: Example character cards</li>
                <li>Create: Simple character card addon</li>
                <li>Expand: Create diverse character pool</li>
              </ol>
            </div>

            <div className={styles.contentPath}>
              <h4>Worldspaces</h4>
              <ol>
                <li>Watch: "Worldspace Integration"</li>
                <li>Read: Worldspace guidelines</li>
                <li>Study: Example worldspace addon</li>
                <li>Create: Small custom worldspace</li>
                <li>Refine: Add caravans and connections</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* Community Resources */}
      <SectionHeader id="community" title="Community Resources" subtitle="Support and learning from the community" />
      {expandedSections['community'] && (
        <div className={styles.sectionContent}>
          <div className={styles.contentBlock}>
            <h3>Official Channels</h3>

            <div className={styles.communityResource}>
              <h4>Discord Server</h4>
              <ul>
                <li>Real-time help and questions</li>
                <li>#modding-help channel</li>
                <li>#resources and #downloads</li>
                <li>Community showcase</li>
                <li>Developers available for questions</li>
              </ul>
              <p>
                <em>Find link:</em> Check Nexus Mods SS2 page description
              </p>
            </div>

            <div className={styles.communityResource}>
              <h4>Forums & Discussion</h4>
              <ul>
                <li><strong>Nexus Mods:</strong> Comments and discussion</li>
                <li><strong>GitHub:</strong> Issue tracking and pull requests</li>
                <li><strong>Documentation:</strong> Feedback and suggestions</li>
              </ul>
            </div>

            <h3>When You Get Stuck</h3>
            <ol>
              <li>Check toolkit documentation for your topic</li>
              <li>Search YouTube for tutorial on problem</li>
              <li>Review example addon handling same issue</li>
              <li>Ask in Discord #modding-help with context</li>
            </ol>

            <h3>Help Request Template</h3>
            <pre className={styles.codeBlock}>
What I'm trying to do:
[Brief description]

What I've already tried:
[What you attempted]

What I'm seeing:
[Error message or behavior]

My plugin/file:
[Name of addon]

Creation Kit version:
[Your CK version]
            </pre>

            <h3>Featured Addon Creators</h3>
            <p>Study successful addons for best practices:</p>
            <ul>
              <li>Analyze file structure and organization</li>
              <li>Review release notes for lessons learned</li>
              <li>Contribute improvements where possible</li>
              <li>Ask questions via Discord about their process</li>
            </ul>

            <h3>Contributing Back</h3>
            <ul>
              <li>Share your creations when ready</li>
              <li>Help others with problems you've solved</li>
              <li>Report bugs and suggest improvements</li>
              <li>Contribute to documentation</li>
            </ul>

            <h3>Worth Bookmarking</h3>
            <ul>
              <li>Official SS2 Discord server</li>
              <li>Nexus Mods SS2 mod page</li>
              <li>Bethesda Mod School YouTube channel</li>
              <li>Creation Kit official documentation</li>
              <li>Workshop Framework guide</li>
            </ul>
          </div>
        </div>
      )}

      {/* Quick Start */}
      <SectionHeader id="quickstart" title="Quick Start Checklist" subtitle="Everything you need before you begin" />
      {expandedSections['quickstart'] && (
        <div className={styles.sectionContent}>
          <div className={styles.contentBlock}>
            <h3>Before You Begin</h3>
            <div className={styles.checklist}>
              <label>☐ Creation Kit installed and launched</label>
              <label>☐ Fallout 4 with DLC installed</label>
              <label>☐ Add-On Maker's Toolkit downloaded</label>
              <label>☐ Watched "Your First Addon" series</label>
              <label>☐ Discord account and server joined</label>
              <label>☐ Test mod installed in Fallout 4</label>
              <label>☐ Text editor (Notepad++, VS Code)</label>
              <label>☐ Project folder created</label>
            </div>

            <h3>First Day Goals</h3>
            <div className={styles.checklist}>
              <label>☐ Watch "Your First Addon" Part 1</label>
              <label>☐ Create new .esp plugin in CK</label>
              <label>☐ Duplicate example addon form</label>
              <label>☐ Modify form properties</label>
              <label>☐ Save without errors</label>
              <label>☐ Join Discord and introduce yourself</label>
            </div>

            <h3>First Week Goals</h3>
            <div className={styles.checklist}>
              <label>☐ Complete "Your First Addon" series</label>
              <label>☐ Read building plans documentation</label>
              <label>☐ Examine 3 example building plans</label>
              <label>☐ Create first simple building plan</label>
              <label>☐ Test in-game and verify</label>
              <label>☐ Ask one question in Discord</label>
            </div>

            <h3>First Month Goals</h3>
            <div className={styles.checklist}>
              <label>☐ Create 3-5 working addon pieces</label>
              <label>☐ Add progression levels (L1, L2, L3)</label>
              <label>☐ Implement proper cost structure</label>
              <label>☐ Write comprehensive documentation</label>
              <label>☐ Package addon for distribution</label>
              <label>☐ Get community feedback</label>
            </div>
          </div>
        </div>
      )}

      {/* Time Investment Reality */}
      <SectionHeader id="timeline" title="Time Investment Reality" subtitle="What to expect at each project scope" />
      {expandedSections['timeline'] && (
        <div className={styles.sectionContent}>
          <div className={styles.contentBlock}>
            <h3>Simple Addon (1 Building Plan)</h3>
            <table className={styles.timeTable}>
              <tr>
                <td><strong>Learning Phase</strong></td>
                <td>15-20 hours</td>
              </tr>
              <tr>
                <td><strong>Development</strong></td>
                <td>5-10 hours</td>
              </tr>
              <tr>
                <td><strong>Testing & Polish</strong></td>
                <td>5-10 hours</td>
              </tr>
              <tr style={{ backgroundColor: 'rgba(0,255,0,0.1)' }}>
                <td><strong>TOTAL</strong></td>
                <td><strong>25-40 hours</strong></td>
              </tr>
            </table>

            <h3>Medium Addon Pack (5-10 Plans)</h3>
            <table className={styles.timeTable}>
              <tr>
                <td><strong>Learning Phase</strong></td>
                <td>20-30 hours (reuses knowledge)</td>
              </tr>
              <tr>
                <td><strong>Development</strong></td>
                <td>15-30 hours</td>
              </tr>
              <tr>
                <td><strong>Testing & Polish</strong></td>
                <td>10-15 hours</td>
              </tr>
              <tr style={{ backgroundColor: 'rgba(0,255,0,0.1)' }}>
                <td><strong>TOTAL</strong></td>
                <td><strong>45-75 hours</strong></td>
              </tr>
            </table>

            <h3>Complex Addon (With Systems)</h3>
            <table className={styles.timeTable}>
              <tr>
                <td><strong>Learning Phase</strong></td>
                <td>30-50 hours</td>
              </tr>
              <tr>
                <td><strong>Development</strong></td>
                <td>30-60 hours</td>
              </tr>
              <tr>
                <td><strong>Testing & Polish</strong></td>
                <td>20-30 hours</td>
              </tr>
              <tr style={{ backgroundColor: 'rgba(0,255,0,0.1)' }}>
                <td><strong>TOTAL</strong></td>
                <td><strong>80-140 hours</strong></td>
              </tr>
            </table>

            <p style={{ marginTop: '1.5rem', fontSize: '0.9rem' }}>
              <em>Note: Times are estimates and vary by individual experience level, project complexity, and time commitment per week.</em>
            </p>
          </div>
        </div>
      )}

      <div className={styles.footer}>
        <p>
          <strong>Document Version:</strong> 1.0 | <strong>Last Updated:</strong> January 24, 2026
        </p>
        <p>
          <strong>Source:</strong> Sim Settlements 2 Development Team, kinggath, Community Resources
        </p>
        <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #008000' }}>
          <p><strong>Essential Links:</strong></p>
          <ul style={{ listStyleType: 'none', padding: 0 }}>
            <li>• <ExternalLink_ url="https://www.nexusmods.com" text="Nexus Mods - Sim Settlements 2" /></li>
            <li>• <ExternalLink_ url="https://www.simsettlements.com/tools/cpV2maker.php" text="City Plan Maker Tool" /></li>
            <li>• <ExternalLink_ url="https://www.youtube.com" text="YouTube - Search 'Bethesda Mod School'" /></li>
          </ul>
        </div>
      </div>
    </div>
  );
}
