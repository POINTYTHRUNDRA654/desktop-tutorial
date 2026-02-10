import React, { useState } from 'react';
import styles from './GuideStyles.module.css';
import { useNavigate } from 'react-router-dom';

type SimSettlementsUnitsLoadoutsGuideProps = {
  embedded?: boolean;
};

export default function SimSettlementsUnitsLoadoutsGuide({ embedded = false }: SimSettlementsUnitsLoadoutsGuideProps) {
  const navigate = useNavigate();
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({});

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const openUrl = (url: string) => {
    try {
      const anyWindow = window as any;
      if (anyWindow?.electron?.openExternal) {
        anyWindow.electron.openExternal(url);
        return;
      }
    } catch {
      // ignore
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const openNexusSearch = (query: string) => {
    const url = `https://www.nexusmods.com/fallout4/search/?gsearch=${encodeURIComponent(query)}&gsearchtype=mods`;
    openUrl(url);
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

  const containerClassName = styles.guideContainer || styles.container;
  const containerStyle: React.CSSProperties = {
    maxWidth: embedded ? '100%' : undefined,
    padding: embedded ? '1.25rem' : undefined,
    minHeight: embedded ? 'auto' : undefined
  };

  return (
    <div className={containerClassName} style={containerStyle}>
      {!embedded && (
        <div className={styles.header}>
          <h1 className={styles.mainTitle}>Sim Settlements 2: Units and Loadouts</h1>
          <p className={styles.versionInfo}>Complete Reference Guide v1.0</p>
          <p className={styles.scopeInfo}>
            Comprehensive guide to creating military units, loadouts, and soldier progression systems
          </p>
        </div>
      )}

      <div className={styles.contentBlock}>
        <h3>Tools / Install / Verify (No Guesswork)</h3>
        <p>
          You can read this guide without modding tools, but you can’t <em>ship</em> a Units/Loadouts addon without a working CK pipeline.
        </p>
        <ul>
          <li><strong>Creation Kit:</strong> edit SS2 UnitType/Loadout records and compile scripts.</li>
          <li><strong>FO4Edit:</strong> sanity-check records, dependencies, FormLists, and conflicts.</li>
          <li><strong>SS2 installed for testing:</strong> you’ll validate that units appear and can be assigned.</li>
        </ul>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.75rem' }}>
          <button style={{ background: 'rgba(0, 255, 0, 0.08)', border: '1px solid #00d000', color: '#00ff00', padding: '0.35rem 0.6rem', borderRadius: 4, cursor: 'pointer', fontFamily: 'Courier New, monospace', fontSize: '0.85rem' }} onClick={() => openUrl('https://store.steampowered.com/search/?term=Creation%20Kit%20Fallout%204')}>Steam search: Creation Kit</button>
          <button style={{ background: 'rgba(0, 255, 0, 0.08)', border: '1px solid #00d000', color: '#00ff00', padding: '0.35rem 0.6rem', borderRadius: 4, cursor: 'pointer', fontFamily: 'Courier New, monospace', fontSize: '0.85rem' }} onClick={() => openNexusSearch('Sim Settlements 2')}>Nexus search: SS2</button>
          <button style={{ background: 'rgba(0, 255, 0, 0.08)', border: '1px solid #00d000', color: '#00ff00', padding: '0.35rem 0.6rem', borderRadius: 4, cursor: 'pointer', fontFamily: 'Courier New, monospace', fontSize: '0.85rem' }} onClick={() => openNexusSearch("Add-On Maker's Toolkit")}>Nexus search: Toolkit</button>
          <button style={{ background: 'rgba(0, 255, 0, 0.08)', border: '1px solid #00d000', color: '#00ff00', padding: '0.35rem 0.6rem', borderRadius: 4, cursor: 'pointer', fontFamily: 'Courier New, monospace', fontSize: '0.85rem' }} onClick={() => openNexusSearch('FO4Edit')}>Nexus search: FO4Edit</button>
        </div>

        {!embedded && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.75rem' }}>
            <button style={{ background: 'rgba(0, 255, 0, 0.08)', border: '1px solid #00d000', color: '#00ff00', padding: '0.35rem 0.6rem', borderRadius: 4, cursor: 'pointer', fontFamily: 'Courier New, monospace', fontSize: '0.85rem' }} onClick={() => navigate('/install-wizard')}>In-app: Install Wizard</button>
            <button style={{ background: 'rgba(0, 255, 0, 0.08)', border: '1px solid #00d000', color: '#00ff00', padding: '0.35rem 0.6rem', borderRadius: 4, cursor: 'pointer', fontFamily: 'Courier New, monospace', fontSize: '0.85rem' }} onClick={() => navigate('/ck-quest-dialogue')}>In-app: CK Wizard</button>
            <button style={{ background: 'rgba(0, 255, 0, 0.08)', border: '1px solid #00d000', color: '#00ff00', padding: '0.35rem 0.6rem', borderRadius: 4, cursor: 'pointer', fontFamily: 'Courier New, monospace', fontSize: '0.85rem' }} onClick={() => navigate('/packaging-release')}>In-app: Packaging</button>
            <button style={{ background: 'rgba(0, 255, 0, 0.08)', border: '1px solid #00d000', color: '#00ff00', padding: '0.35rem 0.6rem', borderRadius: 4, cursor: 'pointer', fontFamily: 'Courier New, monospace', fontSize: '0.85rem' }} onClick={() => navigate('/vault')}>In-app: The Vault</button>
          </div>
        )}

        <p style={{ marginTop: '0.75rem' }}>
          <strong>First test loop:</strong> duplicate a template UnitType + one Loadout → register in the correct FormList → load in-game and confirm the unit shows up and can be assigned.
        </p>
      </div>

      {/* Introduction */}
      <SectionHeader id="intro" title="Introduction" subtitle="Core concepts and terminology" />
      {expandedSections['intro'] && (
        <div className={styles.sectionContent}>
          <div className={styles.contentBlock}>
            <h3>What You'll Learn</h3>
            <ul>
              <li>Relationship between UnitTypes and Loadouts</li>
              <li>Creating fully-featured military units</li>
              <li>Implementing rank progression systems</li>
              <li>Unlocking units through gameplay</li>
              <li>Balancing costs and power</li>
            </ul>

            <h3>Key Terminology</h3>
            <div className={styles.terminologyBox}>
              <div className={styles.term}>
                <strong>UnitType:</strong> The primary soldier definition—an Armor record combining actor, equipment, recruitment info, roles, and availability.
              </div>
              <div className={styles.term}>
                <strong>Loadout:</strong> An equipment set applied to a UnitType, often linked to rank progression. Contains armor, weapons, abilities, and costs.
              </div>
              <div className={styles.term}>
                <strong>UnitForm:</strong> The actual Actor record that is spawned as a soldier in the game.
              </div>
              <div className={styles.term}>
                <strong>Rank Loadout:</strong> A unique loadout applied when a soldier achieves a specific rank (1-5).
              </div>
            </div>

            <h3>Critical Relationship</h3>
            <p>
              <em>When players "assign a Loadout," they're actually changing the Soldier's UnitType.</em> The soldier then gains access to that UnitType's loadouts. Loadouts are never used independently.
            </p>
          </div>
        </div>
      )}

      {/* UnitTypes vs Loadouts */}
      <SectionHeader id="comparison" title="UnitTypes vs Loadouts" subtitle="Understanding the distinction" />
      {expandedSections['comparison'] && (
        <div className={styles.sectionContent}>
          <div className={styles.contentBlock}>
            <h3>UnitType: The Foundation</h3>
            <p>A UnitType is an Armor record that defines:</p>
            <ul>
              <li><strong>Combat Role:</strong> Sniper, Rifleman, Tank, Medic, etc.</li>
              <li><strong>Actor Form:</strong> The NPC model and base stats</li>
              <li><strong>Equipment Base:</strong> Default outfit and fallback gear</li>
              <li><strong>Recruitment Info:</strong> Cost, requirements, availability</li>
              <li><strong>Rank Support:</strong> Multiple loadouts for progression</li>
              <li><strong>Requirements:</strong> When unit can be used (quest stages, DLC, etc.)</li>
              <li><strong>Settings:</strong> Settlement integration, role eligibility</li>
            </ul>

            <h3>Loadout: Equipment Progression</h3>
            <p>A Loadout is an Armor record defining equipment variations:</p>
            <ul>
              <li><strong>Equipment Set:</strong> Armor, weapons, accessories</li>
              <li><strong>Abilities:</strong> Combat spells, perks, AI packages</li>
              <li><strong>Costs:</strong> Equip, assault, and upkeep costs</li>
              <li><strong>Rank Association:</strong> Each rank can have unique loadout</li>
              <li><strong>Descriptions:</strong> Information shown to players</li>
            </ul>

            <h3>Relationship Summary</h3>
            <table className={styles.comparisonTable}>
              <thead>
                <tr>
                  <th>Aspect</th>
                  <th>UnitType</th>
                  <th>Loadout</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Usage</td>
                  <td>Defines entire soldier</td>
                  <td>Modifies equipment of UnitType</td>
                </tr>
                <tr>
                  <td>Quantity</td>
                  <td>Single per soldier</td>
                  <td>Up to 5 per UnitType (one per rank)</td>
                </tr>
                <tr>
                  <td>Recruitment</td>
                  <td>Creates new soldier</td>
                  <td>Modifies existing soldier</td>
                </tr>
                <tr>
                  <td>Progression</td>
                  <td>Changes rank</td>
                  <td>Changes equipment at each rank</td>
                </tr>
                <tr>
                  <td>Costs</td>
                  <td>Recruitment, assault, upkeep</td>
                  <td>Equip, assault override, upkeep override</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* UnitTypes In-Depth */}
      <SectionHeader id="unittypes" title="UnitTypes In-Depth" subtitle="Complete property reference" />
      {expandedSections['unittypes'] && (
        <div className={styles.sectionContent}>
          <div className={styles.contentBlock}>
            <h3>Creation Steps</h3>
            <ol>
              <li>Duplicate <code>SS2_UnitType_Template</code> Armor record</li>
              <li>Configure all script properties (grouped by function)</li>
              <li>Set critical fields: UnitForm, UnitKeyword, iStrengthRating</li>
              <li>Create associated Loadouts</li>
              <li>Register in appropriate FormLists</li>
            </ol>

            <h3>Essential Property Groups</h3>

            <div className={styles.propertyGroup}>
              <h4>Assigned Group</h4>
              <p>Controls assigning existing soldiers to this UnitType</p>
              <table className={styles.propertyTable}>
                <tr>
                  <td><strong>iRankRequirement</strong></td>
                  <td>Minimum rank to assign (1-5)</td>
                </tr>
                <tr>
                  <td><strong>LimitToRaces</strong></td>
                  <td>Eligible races (default: Human, Ghoul, Synth)</td>
                </tr>
              </table>
            </div>

            <div className={styles.propertyGroup}>
              <h4>Cost Overrides Group</h4>
              <p>
                <em>Leave blank to use defaults (Recruitment default = 250 caps)</em>
              </p>
              <p>
                <strong>Cost Types:</strong> Use ActorValue → SS2_VirtualResource* (non-daily)
              </p>
              <p>
                <strong>Cost Categories (iIndex):</strong> 0=Caps, 1=Rations, 2=Scrap, 3=Supplies
              </p>
              <table className={styles.propertyTable}>
                <tr>
                  <td><strong>AssaultCostOverride</strong></td>
                  <td>Cost per assault (typically Ammo)</td>
                </tr>
                <tr>
                  <td><strong>RecruitmentCostOverride</strong></td>
                  <td>New unit cost (typically Armor, WeaponParts)</td>
                </tr>
                <tr>
                  <td><strong>UpkeepCostOverride</strong></td>
                  <td>Daily cost (if Upkeep enabled)</td>
                </tr>
              </table>
              <p className={styles.note}>
                <strong>Note:</strong> RecruitmentCosts combine with RankLoadout costs when RankLoadouts defined
              </p>
            </div>

            <div className={styles.propertyGroup}>
              <h4>RankSupport Group</h4>
              <p>Define progression through ranks</p>
              <table className={styles.propertyTable}>
                <tr>
                  <td><strong>RankLoadouts</strong></td>
                  <td>Up to 5 Loadouts (1 per rank). Soldier gets highest available for their rank</td>
                </tr>
                <tr>
                  <td><strong>RankPerkOverrides</strong></td>
                  <td>Custom rank-up perks (replaces default health buff)</td>
                </tr>
                <tr>
                  <td><strong>Ranks</strong></td>
                  <td>Custom rank names for this unit type</td>
                </tr>
              </table>
              <p className={styles.note}>
                <strong>Loadout Strategy:</strong> Don't need all 5 ranks. Example: provide Loadouts at ranks 1, 3, and 5 only
              </p>
            </div>

            <div className={styles.propertyGroup}>
              <h4>Recruited Group</h4>
              <p>Controls recruitment and spawning</p>
              <table className={styles.propertyTable}>
                <tr>
                  <td><strong>bAllowDeskRecruitment</strong></td>
                  <td>Player can queue from War Planner's Desk</td>
                </tr>
                <tr>
                  <td><strong>bRecruitedOnly</strong></td>
                  <td>Player cannot assign to existing soldiers</td>
                </tr>
                <tr>
                  <td><strong>bVirtualUnit</strong></td>
                  <td>Unit spawns at battle (not in outpost)</td>
                </tr>
                <tr>
                  <td><strong>iDefaultClassIndex</strong></td>
                  <td>Soldier role when spawned (Guard, Patrol, Warrior, Support)</td>
                </tr>
                <tr>
                  <td><strong>UnitForm</strong></td>
                  <td><strong>CRITICAL:</strong> Actor record spawned</td>
                </tr>
              </table>
            </div>

            <div className={styles.propertyGroup}>
              <h4>Requirements Group</h4>
              <p>Control when unit can be used</p>
              <table className={styles.propertyTable}>
                <tr>
                  <td><strong>bNPCArmyUseOnly</strong></td>
                  <td>Only enemy armies use</td>
                </tr>
                <tr>
                  <td><strong>bPlayerOnly</strong></td>
                  <td>Only player uses</td>
                </tr>
                <tr>
                  <td><strong>iMaxPerGame</strong></td>
                  <td>Max total in player army</td>
                </tr>
                <tr>
                  <td><strong>iMaxPerOutpost</strong></td>
                  <td>Max at single outpost</td>
                </tr>
                <tr>
                  <td><strong>PlayerArmyUseRequirements</strong></td>
                  <td>Condition for player (DLC check, off-condition)</td>
                </tr>
              </table>
            </div>

            <div className={styles.propertyGroup}>
              <h4>Settings Group</h4>
              <p>Settlement integration and role assignments</p>
              <table className={styles.propertyTable}>
                <tr>
                  <td><strong>bCanBeGuard</strong></td>
                  <td>Eligible for Guard role</td>
                </tr>
                <tr>
                  <td><strong>bCanBePatrol</strong></td>
                  <td>Eligible for Patrol role</td>
                </tr>
                <tr>
                  <td><strong>bCanBeWarrior</strong></td>
                  <td>Eligible for Warrior role</td>
                </tr>
                <tr>
                  <td><strong>bCanBeSupport</strong></td>
                  <td>Eligible for Support role</td>
                </tr>
                <tr>
                  <td><strong>iDefenseModifier</strong></td>
                  <td>Settlement defense provided (-1 = SPECIAL-based calculation)</td>
                </tr>
              </table>
            </div>

            <div className={styles.propertyGroup}>
              <h4>UnitData Group (REQUIRED)</h4>
              <p>Core information used throughout systems</p>
              <table className={styles.propertyTable}>
                <tr>
                  <td><strong>DefaultOutfit</strong></td>
                  <td>Fallback gear if loadout fails</td>
                </tr>
                <tr>
                  <td><strong>iStrengthRating</strong></td>
                  <td>Power level 1-20 (1=weak, 20=Behemoth)</td>
                </tr>
                <tr>
                  <td><strong>UnitKeyword</strong></td>
                  <td>Unique keyword for tracking</td>
                </tr>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Loadouts In-Depth */}
      <SectionHeader id="loadouts" title="Loadouts In-Depth" subtitle="Equipment and progression" />
      {expandedSections['loadouts'] && (
        <div className={styles.sectionContent}>
          <div className={styles.contentBlock}>
            <h3>Creation Steps</h3>
            <ol>
              <li>Duplicate <code>SS2_Template_NPCLoadout</code> Armor record</li>
              <li>Name to pair with UnitType (e.g., SS2_Loadout_Sniper_Rank2)</li>
              <li>Configure equipment and costs</li>
              <li>Set iRankRequirement to match rank level</li>
              <li>Add to UnitType's RankLoadouts array</li>
            </ol>

            <h3>Equipment Group (Critical)</h3>

            <div className={styles.propertyGroup}>
              <h4>Armor Configuration</h4>
              <table className={styles.propertyTable}>
                <tr>
                  <td><strong>ArmorToEquip</strong></td>
                  <td>Outfit record with armor pieces (required)</td>
                </tr>
                <tr>
                  <td><strong>bIgnoreUniform</strong></td>
                  <td>Prevent military uniform from applying</td>
                </tr>
              </table>
              <p className={styles.note}>
                <strong>Military Uniform Support:</strong> Avoid filling Body and [U] slots in Outfit. Reserve these for uniforms.
              </p>
            </div>

            <div className={styles.propertyGroup}>
              <h4>Weapon Configuration</h4>
              <p>Three methods depending on complexity:</p>

              <p className={styles.subheading}>Simple - Single Weapon</p>
              <pre className={styles.codeBlock}>
                PrimaryWeapon: Specific weapon record
              </pre>

              <p className={styles.subheading}>Moderate - Weapon FormList</p>
              <pre className={styles.codeBlock}>
                PrimaryWeapon: FormList of weapons
                PrimaryWeaponNameHolder: MiscObject with name
              </pre>

              <p className={styles.subheading}>Heavy - Leveled List</p>
              <pre className={styles.codeBlock}>
                PrimaryWeaponLL: Leveled item
                PrimaryWeapon: FormList of all possible weapons
                PrimaryWeaponNameHolder: MiscObject with name
              </pre>
            </div>

            <div className={styles.propertyGroup}>
              <h4>Armory Bonus Items</h4>
              <table className={styles.propertyTable}>
                <tr>
                  <td><strong>ArmoryBonusItems_OneTime</strong></td>
                  <td>Items given first time loadout applied (3 entries for 3 armory levels)</td>
                </tr>
                <tr>
                  <td><strong>ArmoryBonusItems_Restock</strong></td>
                  <td>Items given each restock/assault (3 entries)</td>
                </tr>
                <tr>
                  <td><strong>ArmoryBonusItems_RestockIsOverride</strong></td>
                  <td>Replace default items (grenades, stimpaks)</td>
                </tr>
              </table>
            </div>

            <h3>Costs Group</h3>
            <p>
              <strong>Cost Resources:</strong> Use ActorValue → SS2_VirtualResource* (non-daily)
            </p>
            <table className={styles.propertyTable}>
              <tr>
                <td><strong>EquipCost</strong></td>
                <td>Cost to apply loadout (free if blank)</td>
              </tr>
              <tr>
                <td><strong>AssaultCostOverride</strong></td>
                <td>Overrides UnitType assault cost</td>
              </tr>
              <tr>
                <td><strong>UpkeepCostOverride</strong></td>
                <td>Overrides UnitType upkeep cost</td>
              </tr>
            </table>

            <h3>Abilities Group</h3>
            <table className={styles.propertyTable}>
              <tr>
                <td><strong>CombatBuffs</strong></td>
                <td>Spell(s) applied before combat encounters</td>
              </tr>
              <tr>
                <td><strong>SpecialAbilities</strong></td>
                <td>Perk(s) applied when loadout equipped</td>
              </tr>
              <tr>
                <td><strong>AIOverrideStampAlias</strong></td>
                <td>Custom AI package stack (advanced, use priority 43)</td>
              </tr>
            </table>

            <h3>Settings Group</h3>
            <table className={styles.propertyTable}>
              <tr>
                <td><strong>iRankRequirement</strong></td>
                <td><strong>CRITICAL:</strong> Which rank uses this loadout (determines order in RankLoadouts)</td>
              </tr>
              <tr>
                <td><strong>iStrengthModifier</strong></td>
                <td>Power adjustment applied to UnitType rating</td>
              </tr>
            </table>
            <p className={styles.note}>
              <strong>Important:</strong> RankLoadouts array order does NOT determine rank usage. iRankRequirement property determines which rank gets this loadout.
            </p>
          </div>
        </div>
      )}

      {/* UnitForm Actors */}
      <SectionHeader id="actors" title="UnitForm Actors" subtitle="Creating NPC soldier bases" />
      {expandedSections['actors'] && (
        <div className={styles.sectionContent}>
          <div className={styles.contentBlock}>
            <h3>Starting Point</h3>
            <p>Duplicate or reference <code>SS2_C3_UnitActor_Template</code></p>

            <h3>Critical Checkboxes (Base Data)</h3>
            <table className={styles.propertyTable}>
              <tr>
                <td><strong>Respawn</strong></td>
                <td>❌ Do not check</td>
              </tr>
              <tr>
                <td><strong>Unique</strong></td>
                <td>❌ Do not check</td>
              </tr>
              <tr>
                <td><strong>Is Ghost</strong></td>
                <td>❌ Do not check</td>
              </tr>
              <tr>
                <td><strong>Invulnerable</strong></td>
                <td>❌ Do not check</td>
              </tr>
              <tr>
                <td><strong>No Activation/Hellos</strong></td>
                <td>❌ Do not check</td>
              </tr>
              <tr>
                <td><strong>Forced Loc Ref Type</strong></td>
                <td>⚠️ Do not set</td>
              </tr>
            </table>

            <h3>Scripts Tab (Recommended)</h3>
            <p>Add WorkshopNPCScript with these properties:</p>
            <table className={styles.propertyTable}>
              <tr>
                <td><strong>WorkshopParent</strong></td>
                <td>Mandatory - connects to settlement</td>
              </tr>
              <tr>
                <td><strong>bAllowCaravan</strong></td>
                <td>Can be provisioner/caravan member</td>
              </tr>
              <tr>
                <td><strong>bAllowMove</strong></td>
                <td>Can move between outposts (false for virtual units)</td>
              </tr>
              <tr>
                <td><strong>bCommandable</strong></td>
                <td>Player can issue commands</td>
              </tr>
            </table>

            <h3>Keywords Tab (Always Include)</h3>
            <pre className={styles.codeBlock}>
SS2_C3_Tag_ArmyUnit
SS2_Tag_UnitType_[YourUniqueKeyword]
AO_Type_WorkshopAlarm
            </pre>

            <p className={styles.note}>
              <strong>Important:</strong> Remove template placeholder keyword <code>SS2_Tag_UnitType_Raider</code>
            </p>

            <h3>AI Data Tab</h3>
            <table className={styles.propertyTable}>
              <tr>
                <td><strong>Aggression</strong></td>
                <td>Aggressive</td>
              </tr>
              <tr>
                <td><strong>Confidence</strong></td>
                <td>Foolhardy</td>
              </tr>
              <tr>
                <td><strong>Assistance</strong></td>
                <td>Helps Allies</td>
              </tr>
              <tr>
                <td><strong>Morality</strong></td>
                <td>No Crime</td>
              </tr>
            </table>

            <h3>Stats Tab</h3>
            <table className={styles.propertyTable}>
              <tr>
                <td><strong>PC Level Mult</strong></td>
                <td>Scale with player (1.0 = same level, 1.5 = 150%)</td>
              </tr>
              <tr>
                <td><strong>Auto calc stats</strong></td>
                <td>Automatically boost stats with level</td>
              </tr>
              <tr>
                <td><strong>Class</strong></td>
                <td>Provides baseline stats; use ZeroSPECIALclass for full control</td>
              </tr>
            </table>

            <h3>Inventory Tab</h3>
            <table className={styles.propertyTable}>
              <tr>
                <td><strong>Default Outfit</strong></td>
                <td>Fallback gear if loadout fails</td>
              </tr>
              <tr>
                <td><strong>Power Armor Furniture</strong></td>
                <td>For units that should always be in PA</td>
              </tr>
            </table>

            <h3>Templates (For Humanoids)</h3>
            <p>Use templates to create varied faces/voices:</p>
            <ul>
              <li><strong>Recommended:</strong> LCharWorkshopNPC - Large variety of human faces</li>
              <li>Apply to Traits tab using Templates tab</li>
              <li>Prevents all soldiers having same appearance</li>
            </ul>
          </div>
        </div>
      )}

      {/* Uniforms */}
      <SectionHeader id="uniforms" title="Uniforms" subtitle="Military uniform system" />
      {expandedSections['uniforms'] && (
        <div className={styles.sectionContent}>
          <div className={styles.contentBlock}>
            <h3>Purpose</h3>
            <p>
              Uniforms allow players to apply a base underarmor to all soldiers, giving them a unified appearance. Players select uniforms from an interface, and the system dynamically applies the appropriate armor piece based on the soldier's race.
            </p>

            <h3>Creation Steps</h3>
            <ol>
              <li>Duplicate <code>SS2_UniformSelector_Template</code> Armor record</li>
              <li>Set Name (player-facing display)</li>
              <li>Set World Model (preview)</li>
              <li>Configure BaseRaceUnderarmorMaps</li>
              <li>Register in <code>SS2_FLID_Uniforms</code></li>
            </ol>

            <h3>Armor Slot Requirements</h3>
            <p>
              Uniforms should ONLY use these slots to avoid conflicts with loadout armor:
            </p>
            <table className={styles.propertyTable}>
              <tr>
                <td><strong>Body (33)</strong></td>
                <td>Should be filled</td>
              </tr>
              <tr>
                <td><strong>[U] Slots (36-40)</strong></td>
                <td>Underarmor slots</td>
              </tr>
              <tr>
                <td><strong>All Others</strong></td>
                <td>Should be empty</td>
              </tr>
            </table>

            <h3>BaseRaceUnderarmorMaps Entries</h3>
            <table className={styles.propertyTable}>
              <tr>
                <td><strong>RaceForm</strong></td>
                <td>Race for this underarmor (blank = Human/Ghoul/SynthGen1/2)</td>
              </tr>
              <tr>
                <td><strong>Underarmor</strong></td>
                <td>Armor record to equip</td>
              </tr>
            </table>

            <h3>Ranked Uniforms (Optional)</h3>
            <p>
              Create unique uniforms for each rank (e.g., rank insignia):
            </p>
            <ol>
              <li>Create 5 uniform records without RankedVersions</li>
              <li>On Rank 1 uniform only, set RankedVersions to point at Ranks 2-5 sequentially</li>
            </ol>
          </div>
        </div>
      )}

      {/* Registration */}
      <SectionHeader id="registration" title="Registration and Integration" subtitle="Making content available to SS2" />
      {expandedSections['registration'] && (
        <div className={styles.sectionContent}>
          <div className={styles.contentBlock}>
            <h3>Registration Pattern</h3>
            <p>
              Use FLID (FormList ID) injection pattern. See "Your First Addon" tutorial for detailed injection methodology.
            </p>

            <h3>Required Registrations</h3>

            <div className={styles.registrationBox}>
              <h4>UnitTypes</h4>
              <pre className={styles.codeBlock}>
Register ALL UnitTypes → SS2_FLID_NPCUnitTypes
Register PLAYER UnitTypes → SS2_FLID_NPCUnitTypes_PlayerUnlocked
              </pre>
              <p>
                <strong>Unlock System:</strong> If using Unlock System for gameplay triggers, use RegisterForms field pointing to SS2_C3_AllUnitTypes and SS2_C3_PlayerUnlockedUnitTypes
              </p>
            </div>

            <div className={styles.registrationBox}>
              <h4>Rank Names</h4>
              <pre className={styles.codeBlock}>
Register Custom Ranks → SS2_FLID_SoldierRanks
Register Player Ranks → SS2_FLID_SoldierRanks_PlayerUnlocked
              </pre>
            </div>

            <div className={styles.registrationBox}>
              <h4>Uniforms</h4>
              <pre className={styles.codeBlock}>
Register All Uniforms → SS2_FLID_Uniforms
              </pre>
            </div>

            <h3>Naming Conventions</h3>
            <table className={styles.propertyTable}>
              <tr>
                <td><strong>UnitType</strong></td>
                <td>SS2_UnitType_[Name]</td>
              </tr>
              <tr>
                <td><strong>Loadout</strong></td>
                <td>SS2_Loadout_[UnitName]_Rank[X]</td>
              </tr>
              <tr>
                <td><strong>Rank Name</strong></td>
                <td>SS2_Rank_[ArmyName]_[RankName]</td>
              </tr>
              <tr>
                <td><strong>Uniform</strong></td>
                <td>SS2_Uniform_[Description]</td>
              </tr>
              <tr>
                <td><strong>Unit Actor</strong></td>
                <td>SS2_Actor_[UnitName]_[Variant]</td>
              </tr>
            </table>
          </div>
        </div>
      )}

      {/* Quick Reference */}
      <SectionHeader id="quickref" title="Quick Reference" subtitle="Essential checklists and tables" />
      {expandedSections['quickref'] && (
        <div className={styles.sectionContent}>
          <div className={styles.contentBlock}>
            <h3>UnitType Essentials Checklist</h3>
            <div className={styles.checklist}>
              <label>☐ UnitForm (Actor record)</label>
              <label>☐ UnitKeyword (unique identifier)</label>
              <label>☐ iStrengthRating (1-20 power level)</label>
              <label>☐ DefaultOutfit (fallback gear)</label>
              <label>☐ RankLoadouts (if multi-rank)</label>
              <label>☐ Registered in FormLists</label>
            </div>

            <h3>Loadout Essentials Checklist</h3>
            <div className={styles.checklist}>
              <label>☐ ArmorToEquip (outfit record)</label>
              <label>☐ PrimaryWeapon or PrimaryWeaponLL</label>
              <label>☐ PrimaryWeaponNameHolder (if using FormList/LL)</label>
              <label>☐ iRankRequirement (if multi-loadout)</label>
              <label>☐ Added to UnitType RankLoadouts</label>
            </div>

            <h3>Actor Essentials Checklist</h3>
            <div className={styles.checklist}>
              <label>☐ Name</label>
              <label>☐ UnitType keyword</label>
              <label>☐ SS2_C3_Tag_ArmyUnit keyword</label>
              <label>☐ AO_Type_WorkshopAlarm keyword</label>
              <label>☐ Race (matches equipment)</label>
              <label>☐ Default Outfit</label>
              <label>☐ Stats configured</label>
              <label>☐ AI Data set (Aggressive, Foolhardy, Helps Allies)</label>
            </div>

            <h3>Common Issues & Solutions</h3>
            <table className={styles.issueTable}>
              <thead>
                <tr>
                  <th>Issue</th>
                  <th>Cause</th>
                  <th>Solution</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Unit won't appear</td>
                  <td>Not registered</td>
                  <td>Check SS2_FLID_NPCUnitTypes registration</td>
                </tr>
                <tr>
                  <td>Player can't recruit</td>
                  <td>bAllowDeskRecruitment false</td>
                  <td>Set to true or use Unlock System</td>
                </tr>
                <tr>
                  <td>Equipment doesn't apply</td>
                  <td>ArmorToEquip not set</td>
                  <td>Define outfit in Loadout</td>
                </tr>
                <tr>
                  <td>Wrong weapon equipped</td>
                  <td>FormList incomplete</td>
                  <td>Add all weapons to FormList or set specific weapon</td>
                </tr>
                <tr>
                  <td>Uniform conflicts</td>
                  <td>Wrong armor slots used</td>
                  <td>Use only Body (33) and [U] (36-40)</td>
                </tr>
                <tr>
                  <td>All soldiers identical</td>
                  <td>No face template</td>
                  <td>Apply face template to Traits tab</td>
                </tr>
              </tbody>
            </table>

            <h3>Cost Structure Example</h3>
            <div className={styles.exampleBox}>
              <p><strong>Typical Unit Progression:</strong></p>
              <pre className={styles.codeBlock}>
Recruitment Cost:  250 caps + 5 Armor Parts + 3 Weapon Parts
Rank 1 Loadout:    50 caps to equip
Assault Cost:      20 Ammo per assault
Rank 5 Loadout:    200 caps to equip (upgrade progression)
Daily Upkeep:      10 Rations (if enabled)
              </pre>
            </div>

            <h3>Virtual Resources by Category</h3>
            <table className={styles.propertyTable}>
              <tr>
                <td><strong>0 - Caps</strong></td>
                <td>SS2_VirtualResource_Caps</td>
              </tr>
              <tr>
                <td><strong>1 - Rations</strong></td>
                <td>Food/Water components</td>
              </tr>
              <tr>
                <td><strong>2 - Scrap</strong></td>
                <td>Building materials, metals</td>
              </tr>
              <tr>
                <td><strong>3 - Supplies</strong></td>
                <td>Industrial supplies</td>
              </tr>
            </table>
          </div>
        </div>
      )}

      <div className={styles.footer}>
        <p>
          <strong>Document Version:</strong> 1.0 | <strong>Last Updated:</strong> January 24, 2026
        </p>
        <p>
          <strong>Source:</strong> Kinggath and Sim Settlements 2 Development Team
        </p>
      </div>
    </div>
  );
}
