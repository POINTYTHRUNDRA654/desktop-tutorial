# Companion AI, Leveled List Injection, and Projectile Shader Dataset

This dataset defines advanced Fallout 4 instruction content for companion AI package architecture, runtime leveled-list injection, and custom projectile lighting shaders.

## 1) JSON Dataset: Companion Follower AI Script Packages

```json
{
  "fallout4_modding_course": {
    "module_5_submodule_companion_ai": {
      "lesson_title": "Companion Follower Frameworks & AI Package Architecture",
      "learning_objectives": [
        "Construct multi-state AI packages for follower behavior control.",
        "Integrate custom actors into CompanionActorScript-compatible frameworks.",
        "Implement contextual transitions across follow, sandbox, and combat states."
      ],
      "technical_blueprint": {
        "companion_framework_integration": {
          "base_template": "Follower records should align with companion template scripts for recruitment system compatibility.",
          "aliases_requirement": "Companion actors must be linked through active quest aliases for command/event tracking."
        },
        "ai_package_types": {
          "package_follow": "Player-targeted follow behavior with distance tolerances and stealth-aware movement flags.",
          "package_sandbox": "Local interaction package with bounded radius and furniture/activity permissions.",
          "package_travel": "Script-driven travel package targeting explicit refs or alias destinations."
        },
        "conditional_flags": {
          "combat_override": "Combat style settings tune range preference, cover bias, and firing cadence.",
          "package_conditions": "Run-time conditions determine which package takes top priority."
        }
      }
    }
  }
}
```

## 2) Practical Blueprint: Script-Injected Leveled List Injection

1. Create a startup quest configured to run once.
2. Attach an injection script with custom `Form` and target `LeveledItem` properties.
3. Call `AddForm()` at runtime to append new items/ammo without hard overwrite conflicts.
4. Log success and stop the quest to minimize persistent script overhead.

## 3) Practical Blueprint: Custom Particle and Projectile Lighting Shaders

1. Start from a projectile reference NIF and attach effect/light shader properties.
2. Configure emissive behavior and shader flags for self-illuminated beam/plasma visuals.
3. Add float controllers for animated UV scrolling effects.
4. Register the projectile form in Creation Kit and tune type/speed/gravity behavior.

## Troubleshooting Focus

- If companions do not follow, validate package priority and recruitment alias initialization.
- If combat responses fail, verify package flags and actor assistance/aggression settings.
- If leveled list injection fails, verify properties bind to valid `LeveledItem` and `Form` records.
- If projectile glow/animation fails, validate shader property blocks and controller wiring.
