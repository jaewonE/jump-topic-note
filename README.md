# Jump Topic Note

![Obsidian Version](https://img.shields.io/badge/Obsidian-1.0%2B-blue.svg)  
![Release Date](https://img.shields.io/badge/Released-May%2028%2C%202025-green.svg)  
![License](https://img.shields.io/badge/License-GPL--3.0-blue.svg)

Jump Topic Note is an Obsidian community plugin that streamlines your note navigation by letting you jump to parent or “superior” topic notes directly from any note’s frontmatter. If your notes use a `parents` (or custom) YAML list to represent their hierarchical relationships, this plugin will save you countless clicks and keystrokes when traversing your knowledge graph.

---

## Why Jump Topic Note?

-   **Eliminate Manual Searches**  
    Instead of opening the file explorer or using the global search to find your parent note, one keystroke instantly transports you there.

-   **Maintain Focus**  
    Keep your hands on the keyboard and your train of thought uninterrupted by GUI navigation.

-   **Flexible Hierarchies**  
    Supports notes with zero, one, or multiple parent topics; automatically adapts to your frontmatter schema.

-   **Configurability**  
    You decide which YAML property holds the parent-list, and you can override it on a per-vault basis.

---

## Core Features

| Scenario                    | Behavior                                                                   |
| --------------------------- | -------------------------------------------------------------------------- |
| **No parent entries**       | Does nothing (no notifications or errors).                                 |
| **Single parent entry**     | Immediately opens the linked parent note.                                  |
| **Multiple parent entries** | Pops up a searchable modal where you can select which parent note to open. |

-   **Modal Selection**

    -   **Keyboard-friendly**: Arrow keys navigate, Enter confirms.
    -   **Mouse-aware**: Hover highlights, click selects.
    -   **Auto-focus**: First item is pre-selected when the modal opens.

-   **Error Handling**
    -   Non-list YAML → shows a Notice and logs details.
    -   Non-wikilink entries in the list → warns you and logs the offending items.
    -   Missing target file → warns you and logs the lookup failure.

---

## Example Frontmatter

Place a list of wikilinks under your chosen property (default: `parents`):

```yaml
---
title: “Advanced Topic Note”
created: 2025-05-28
tags: [knowledge-hierarchy, obsidian-plugin]
parents:
    - "[[Topic A]]"
    - "[[Folder/Topic B|Custom Alias]]"
---
```
