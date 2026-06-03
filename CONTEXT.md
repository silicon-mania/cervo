# Cervo

Cervo organizes a workspace's notes into boxes so they can be browsed by placement and hierarchy.

## Language

**Box**:
A named container that can hold notes and child boxes.
_Avoid_: Folder

**Child Box**:
A box whose parent is another box. In user-facing language, this is still called a box.
_Avoid_: Subfolder, nested folder, subtree

**Direct Contents**:
The notes and child boxes placed immediately inside a box, excluding anything nested inside child boxes.
_Avoid_: Recursive contents, total contents

**Note**:
A document that can be placed in a box or left unsorted.
_Avoid_: File

**Box Placement**:
The relationship that places one note inside one box without duplicating the note.
_Avoid_: Copy, link, membership

**Daily Note**:
A note for one calendar day that appears by default in the editor when the user has not chosen another note. There can be only one daily note per day, and it can be replaced by a new blank daily note if the editor needs a default note after deletion.
_Avoid_: Journal entry, separate document type

**Unsorted**:
The collection of notes that are not placed in any box.
_Avoid_: Inbox, unboxed
