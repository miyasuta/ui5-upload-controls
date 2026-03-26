# ui5-upload-controls

Reusable UI5 control library for file upload and download, designed to work with SAP CAP backends.

**Namespace:** `miyasuta.ui5uploadcontrols`

---

## Controls

### SingleFileUpload

A control for uploading and downloading a **single file** stored as a `LargeBinary` property on an OData entity.

- Displays a file picker. After upload, shows a download link and a delete button.
- Automatically derives the OData service URL and entity path from the binding context — no URL configuration needed.
- Supports both draft-enabled and non-draft entities.

### MultiFileUpload

A control for managing **multiple file attachments** on an OData entity, backed by the `@cap-js/attachments` composition pattern.

- Displays a table of attached files (file name, created date, created by) with per-row delete buttons and an upload button in the toolbar.
- Automatically binds to the attachments navigation property from the parent entity's binding context.
- Supports both draft-enabled and non-draft entities.

---

## Prerequisites

- SAPUI5 1.124+ (required for `sap.m.plugins.UploadSetwithTable`)
- OData V4 service (CAP Node.js or compatible backend)
- For `MultiFileUpload`: backend entity must expose an `attachments` composition compatible with `@cap-js/attachments`

---

## Installation

```bash
npm install ui5-upload-controls
```

---

## Usage

### SingleFileUpload

Place the control in an XML View or Fragment that is bound to an OData entity. The control reads the binding context from its parent automatically.

```xml
<mvc:View
    xmlns:mvc="sap.ui.core.mvc"
    xmlns:upload="miyasuta.ui5uploadcontrols">

    <!-- Draft-enabled entity embedded in Fiori Elements Object Page -->
    <upload:SingleFileUpload
        fileNameProperty="fileName"
        contentProperty="content" />

</mvc:View>
```

With a named model and automatic draft management:

```xml
<upload:SingleFileUpload
    modelName="myModel"
    fileNameProperty="fileName"
    contentProperty="content"
    draftOnly="false" />
```

#### Properties

| Property | Type | Default | Description |
|---|---|---|---|
| `fileNameProperty` | `string` | `null` | Property name on the entity that stores the file name |
| `contentProperty` | `string` | `"content"` | Property name of the `LargeBinary` field |
| `modelName` | `string` | `null` | Name of the OData model as registered in `manifest.json`. Omit for the default (unnamed) model |
| `draftOnly` | `boolean` | `true` | When `true`, upload is enabled only while the entity is in draft mode. When `false`, the control manages the draft lifecycle automatically (see [Draft Handling](#draft-handling)) |
| `width` | `sap.ui.core.CSSSize` | `"auto"` | Width of the control |
| `enabled` | `boolean` | `true` | Master switch. When `false`, upload and delete are disabled regardless of draft state |

---

### MultiFileUpload

Place the control in an XML View or Fragment bound to the parent entity. The control binds to the attachments navigation property automatically.

```xml
<mvc:View
    xmlns:mvc="sap.ui.core.mvc"
    xmlns:upload="miyasuta.ui5uploadcontrols">

    <!-- Fiori Elements Object Page — attachments navigation property is "attachments" -->
    <upload:MultiFileUpload />

</mvc:View>
```

With a custom navigation property name:

```xml
<upload:MultiFileUpload
    attachmentsSegment="files"
    draftOnly="false" />
```

#### Properties

| Property | Type | Default | Description |
|---|---|---|---|
| `attachmentsSegment` | `string` | `"attachments"` | Navigation property segment name for the attachments composition |
| `draftOnly` | `boolean` | `true` | When `true`, upload and delete are enabled only while the entity is in draft mode. When `false`, the control manages the draft lifecycle automatically (see [Draft Handling](#draft-handling)) |
| `enabled` | `boolean` | `true` | Master switch. When `false`, upload and delete are disabled regardless of draft state |

---

## Draft Handling

Both controls automatically detect draft capability by checking for the `IsActiveEntity` property on the binding context.

| `IsActiveEntity` | `draftOnly` | Behavior |
|---|---|---|
| not present | any | Non-draft entity — upload proceeds directly |
| `false` | any | Entity is in draft (edit) mode — upload proceeds directly |
| `true` | `true` | Entity is active (display mode) — **upload and delete are disabled** |
| `true` | `false` | Entity is active — the control calls `draftEdit`, performs the operation, then calls `draftActivate` automatically |

> **Fiori Elements Object Page**: use the default `draftOnly="true"`. The Object Page manages the Edit/Save/Cancel lifecycle; the control must not create or activate drafts independently.

---

## Backend Requirements

### SingleFileUpload

The entity must have a `LargeBinary` property for file content and a `String` property for the file name:

```cds
entity YourEntity : managed {
  content  : LargeBinary @Core.MediaType: 'application/octet-stream'
                          @Core.ContentDisposition.Filename: fileName;
  fileName : String;
}
```

> The `@Core.ContentDisposition.Filename` annotation is required for the browser to use the stored file name when downloading. Without it the downloaded file may be saved with a generic name (e.g. `content`).

### MultiFileUpload

The entity must expose an `attachments` composition that follows the `@cap-js/attachments` pattern:

```cds
using { Attachments } from '@cap-js/attachments';

entity YourEntity : managed, cuid {
  // ...your properties
  attachments : Composition of many Attachments;
}
```

---

## Integrating into a Consuming App

### 1. Install the library

```bash
npm install ui5-upload-controls
```

### 2. Declare the library dependency in `manifest.json`

```json
"sap.ui5": {
  "dependencies": {
    "libs": {
      "miyasuta.ui5uploadcontrols": { "lazy": false }
    }
  }
}
```

UI5 tooling automatically discovers the library from `node_modules/` via its `ui5.yaml`. No additional `ui5.yaml` configuration is required in the consuming app.
