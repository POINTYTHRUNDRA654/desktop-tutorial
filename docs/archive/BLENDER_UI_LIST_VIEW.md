# Blender UI List View

The List View control is useful for managing lists of items. It provides a flexible interface for displaying, filtering, sorting, and modifying collections of data such as materials, modifiers, constraints, vertex groups, and more.

## List View Components

A typical List View includes:
- **Main list area**: Displays the items in the collection
- **Filtering panel**: Optional controls for searching and sorting (hidden by default)
- **Modification buttons**: Quick access to add, remove, and reorder items

## Selection

### Selecting Items

**LMB click** on an item to select it. The selected item is highlighted with a colored background.

**Multiple Selection** (if supported):
- **Shift-LMB**: Extend selection to include additional items
- **Ctrl-LMB**: Toggle selection of individual items
- Selection behavior may vary depending on the list type and context

## Renaming Items

### Rename Methods

**Double-click** on an item to edit its name via an inline text field.

**Alternative method**: Click an item with **Ctrl-LMB** to enter rename mode.

**Confirming the Rename**:
- Press **Return** to confirm the new name
- Press **Esc** to cancel and keep the original name

**Example Use Cases**:
- Renaming materials, textures, or custom properties
- Editing vertex group names
- Renaming bone constraints or modifiers

## Resizing

### Resize Handle

The list view can be resized to show more or fewer items.

**How to Resize**:
1. Hover the mouse over the handle (::::) at the bottom of the list
2. The cursor changes to indicate the resize direction
3. Click and drag to expand or shrink the list
4. Release to set the new size

This is useful for:
- Getting a better view of many items in a large list
- Reducing list size to focus on other properties
- Viewing more items at once without scrolling

## Filtering

### Filter Options Panel

Click the **Show filtering options button** (small triangle on bottom left) to show or hide the filter option panel. The panel expands to reveal search, sorting, and filtering controls.

### Search

**Shortcut**: **Ctrl-F** (when the list is focused)

Filters the list to only show items containing a certain search term.

**How It Works**:
1. Click in the search field or press **Ctrl-F**
2. Type the search term
3. The list updates in real-time to show only matching items
4. Press **Return** to confirm or **Esc** to exit search
5. Clear the search field to show all items again

**Search Examples**:
- Search "material" to find items with "material" in the name
- Search ".*" to show all items (useful with other filters)
- Partial matches are supported (e.g., "mat" finds "material", "ceramic", etc.)

### Invert Search

Toggle button to invert the search filter.

**Normal behavior**: Shows items that **match** the search term

**Inverted behavior**: Shows items that **do not contain** the search term

**Use Cases**:
- Finding items that don't have a certain keyword
- Excluding items from view temporarily
- Viewing all items except those matching a pattern

### Sort by Name

This button switches between **alphabetical** and **non-alphabetical** ordering.

**Alphabetical (A-Z)**: Items sorted by name in alphabetical order

**Non-alphabetical**: Items displayed in their original/creation order, or custom order (if supported)

**When to Use**:
- Enable alphabetical sort for easy name-based lookup
- Disable for custom ordering (e.g., material layers, constraint stacks where order matters)

### Reverse

Controls the sort direction for alphabetical or other sorting methods.

**Ascending Order** (A-Z): Items appear in normal order (a, b, c, ...)

**Descending Order** (Z-A): Items appear in reversed order (z, y, x, ...)

**Note**: The Reverse button applies to alphabetical sorting if enabled, and to other sorting methods as well.

## List Modification Buttons

On the right side of the list view are quick-access buttons for managing the list:

### Add Button

Icon: **Plus (+)** or **plus icon**

**Function**: Adds a new item to the list.

**Behavior**:
- Creates a new item with default settings or properties
- The new item appears at the bottom of the list (or in sorted position if sorting is enabled)
- The new item becomes selected automatically

**Common Uses**:
- Adding new materials to an object
- Creating new modifiers or constraints
- Adding vertex groups or bone groups
- Adding custom properties

### Remove Button

Icon: **Minus (-)** or **trash icon**

**Function**: Removes the currently selected item from the list.

**Behavior**:
- Deletes the selected item
- The next item (if any) becomes selected
- Cannot be undone if you click away (use Ctrl-Z immediately if needed)

**Note**: Some items cannot be removed if they're required or locked (button may be greyed out)

**Use Cases**:
- Removing unused materials
- Deleting unwanted modifiers or constraints
- Clearing vertex groups

### Specials Menu Button

Icon: **Menu icon** (three dots or similar)

**Function**: Opens a context menu with additional operators to edit list entries.

**Common Options** (varies by list type):
- Duplicate item
- Move to top/bottom
- Copy/paste item properties
- Toggle visibility/lock
- Expand/collapse (for hierarchical lists)
- Clear all
- Reset to defaults
- Batch operations

**How to Use**:
1. Click the Specials button (or right-click the list)
2. Select desired operation from the menu
3. The operation is applied to the selected item

### Move Up/Down Buttons

Icons: **Up arrow (↑)** and **Down arrow (↓)** or **move icons**

**Function**: Moves the selected item up or down one position in the list.

**Move Up**: Shifts the item higher in the list (towards the beginning)

**Move Down**: Shifts the item lower in the list (towards the end)

**Use Cases**:
- Reordering modifiers (order affects result)
- Changing constraint evaluation order
- Organizing material slots
- Setting render or evaluation priority

**Note**: Some lists have a fixed order and these buttons may be disabled. Others (like modifier stacks) have order-dependent behavior.

## Example: Filtering and Sorting Materials

1. Open the Material Properties panel
2. Look at the materials list
3. Click the **triangle** (Show filtering options) to expand the filter panel
4. Type a search term (e.g., "metal") in the search field
5. Enable **Sort by Name** to sort alphabetically
6. Toggle **Reverse** to change sort direction
7. The list updates to show only matching materials in sorted order
8. Use **Move Up/Down** buttons to reorder as needed
9. Click **Remove** to delete unwanted materials

## List View in Different Contexts

The List View is used throughout Blender for various purposes:

- **Materials**: Managing materials assigned to objects
- **Textures**: Texture list in material properties
- **Modifiers**: Modifier stack with order-dependent evaluation
- **Constraints**: Constraint stack for objects or bones
- **Vertex Groups**: Mesh vertex groups for deformations
- **Shape Keys**: Shape key list for morph targets
- **Drivers**: List of drivers on a property
- **Custom Properties**: User-defined properties on objects
- **Render Passes**: AOV (Arbitrary Output Variable) list
- **Scenes/Collections**: Organizational hierarchies (some contexts)

## Related Documentation

- [Blender UI Buttons](BLENDER_UI_BUTTONS.md) - Add/Remove/Modify buttons
- [Blender UI Input Fields](BLENDER_UI_INPUT_FIELDS.md) - Search and text fields in lists
- [Blender UI Menus](BLENDER_UI_MENUS.md) - Specials menu operations
- [Blender Keymap](BLENDER_KEYMAP.md) - Keyboard shortcuts for list operations
