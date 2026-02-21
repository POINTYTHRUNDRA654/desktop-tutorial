# Testing Guide

This document describes how to verify the key behaviours of the
**Fallout 4 Tutorial Helper** add-on, with particular focus on the
notification system that was fixed for Blender 4.5+ compatibility.

---

## Prerequisites

- Blender 4.5 or later installed (the bug only surfaced on 4.5+, but the
  tests apply to all modern versions).
- The add-on installed from a freshly-built zip (see [Packaging](#packaging)
  below or use the pre-built `fallout4_tutorial_helper-vX.Y.Z.zip` from the
  repository root).

---

## 1. Install Button / Self-Test — No Crash

**Goal:** Clicking any "Install …" button (e.g. *Install FFmpeg*) or the
environment self-test button must not produce a Python traceback.

### Steps

1. Open Blender and go to **Edit → Preferences → Add-ons**, then enable
   *Fallout 4 Tutorial Helper*.
2. Open the **Fallout 4** sidebar in the 3D Viewport (`N` key → *Fallout 4*
   tab).
3. Click **Install FFmpeg** (or any other install button).
4. Open Blender's **System Console** (Windows: *Window → Toggle System
   Console*; Linux/macOS: launch Blender from a terminal).

**Expected result:**

- No Python traceback appears in the System Console.
- The operation completes (or reports a meaningful error such as "download
  failed") without crashing.
- In particular, you must **not** see:

  ```
  AttributeError: 'Scene' object attribute 'fo4_notifications' is read-only
  ```

### Automated smoke-test (no Blender UI)

The core logic can be exercised outside Blender using the stub in
`/tmp` (if present) or by importing the module with a `bpy` stub.  A quick
manual check via the Blender Python console is sufficient for most purposes:

```python
# Paste into Blender's Python console (Scripting workspace)
from fallout4_tutorial_helper import notification_system as ns

# Should add an item without raising AttributeError
ns.FO4_NotificationSystem.notify("Test message", "INFO")

scene = __import__('bpy').context.scene
print(len(scene.fo4_notifications))          # should be >= 1
print(scene.fo4_notifications[-1].message)   # '[INFO] Test message'
```

---

## 2. Notification Trimming

**Goal:** Only the 10 most-recent notifications are stored; older ones are
discarded automatically.

### Steps (Blender Python console)

```python
import bpy
from fallout4_tutorial_helper import notification_system as ns

scene = bpy.context.scene
# Clear existing notifications
while scene.fo4_notifications:
    scene.fo4_notifications.remove(0)

# Add 15 notifications
for i in range(15):
    ns.FO4_NotificationSystem.notify(f"Message {i}", "INFO")

assert len(scene.fo4_notifications) == 10, (
    f"Expected 10 notifications, got {len(scene.fo4_notifications)}"
)
# The oldest (0-4) should be gone; newest (5-14) should remain
assert scene.fo4_notifications[0].message == "[INFO] Message 5", (
    scene.fo4_notifications[0].message
)
print("Trimming test passed ✓")
```

---

## 3. Graceful Fallback When Not Registered

If for some reason the `fo4_notifications` property is not registered (e.g.
a partial reload), `notify()` must log to the console and return without
crashing.

### Steps (Blender Python console)

```python
import bpy
from fallout4_tutorial_helper import notification_system as ns

# Temporarily remove the property
backup = bpy.types.Scene.fo4_notifications
del bpy.types.Scene.fo4_notifications

# Should print a console message, not raise
ns.FO4_NotificationSystem.notify("Fallback test", "WARNING")
print("Graceful fallback test passed ✓")

# Restore
bpy.types.Scene.fo4_notifications = backup
```

---

## Packaging

To build a fresh installable zip, run from the repository root:

```bash
python makezip.py
```

This produces `fallout4_tutorial_helper-vX.Y.Z.zip` in the repository root.
Install the zip via **Edit → Preferences → Add-ons → Install…** in Blender.
