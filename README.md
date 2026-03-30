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

## Known Limitations

- **SAPUI5 only**: This library depends on `sap.m.plugins.UploadSetwithTable`, which is available in SAPUI5 but not in OpenUI5.
- **OData V4 only**: Both controls are designed for OData V4 services. OData V2 is not supported.
- **CAP backend assumed**: The upload/download logic targets CAP's media stream endpoints (`$value`). Compatibility with non-CAP OData services is not guaranteed.

---

## Installation

```bash
npm install --save-dev ui5-upload-controls
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

`@cap-js/attachments` sets `@Core.ContentDisposition.Type: 'inline'` by default on the `content` property, which causes the browser to display the file inline instead of downloading it. Override this with `'attachment'` in your CDS model:

```cds
annotate Attachments with {
    content @Core.ContentDisposition: {
        Filename: filename,
        Type    : 'attachment'
    };
}
```

> Without this annotation, clicking a file name link opens a blank page in a new tab instead of downloading the file.

---

## Integrating into a Consuming App

### 1. Install the library

```bash
npm install --save-dev ui5-upload-controls
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

### 3. Local development

The default `ui5.yaml` typically routes `/resources` to the SAPUI5 CDN via `fiori-tools-proxy`, which prevents node_modules libraries from being served. Use one of the following approaches:

**Option A: Use a separate `ui5-local.yaml` (recommended)**

If `ui5-local.yaml` does not already exist, create one. The key is to configure `fiori-tools-proxy` **without** the `ui5` section (which routes `/resources` to the SAPUI5 CDN). Without that routing, UI5 tooling automatically serves library resources from `node_modules/` instead.

If `ui5-local.yaml` already exists and includes a mock server configuration, either comment out the mock server section or create a separate file (e.g. `ui5-nock.yaml`) without it.

```yaml
specVersion: "4.0"
metadata:
  name: your-app
type: application
framework:
  name: SAPUI5
  version: "1.124.0"
  libraries:
    - name: sap.m
    - name: sap.ui.core
    - name: sap.fe.templates
    - name: sap.ushell
    - name: themelib_sap_horizon
server:
  customMiddleware:
    - name: fiori-tools-appreload
      afterMiddleware: compression
      configuration:
        port: 35729
        path: webapp
        delay: 300
    - name: fiori-tools-preview
      afterMiddleware: fiori-tools-appreload
      configuration:
        flp:
          theme: sap_horizon
          path: test/flpSandbox.html
          intent:
            object: your-app
            action: tile
    - name: fiori-tools-proxy
      afterMiddleware: compression
      configuration:
        backend:
          - path: /odata
            url: http://localhost:4004
    # - name: sap-fe-mockserver   # comment out if not using mock server
    #   beforeMiddleware: csp
    #   configuration:
    #     ...
```

Run with:

```bash
fiori run --config ./ui5-local.yaml
```

**Option B: Add `fiori-tools-servestatic` to your existing `ui5.yaml`**

List `fiori-tools-proxy` first in the YAML so it is registered before `fiori-tools-servestatic` references it. The `beforeMiddleware` directive inserts `fiori-tools-servestatic` before the proxy in the actual request chain, so the library is served before the CDN proxy can intercept the request.

```yaml
server:
  customMiddleware:
    - name: fiori-tools-proxy       # must be listed first
      afterMiddleware: compression
      configuration:
        # ... your existing proxy config
    - name: fiori-tools-servestatic
      beforeMiddleware: fiori-tools-proxy   # inserted before proxy in request chain
      configuration:
        paths:
          - path: /resources/miyasuta/ui5uploadcontrols
            src: node_modules/ui5-upload-controls/dist/resources/miyasuta/ui5uploadcontrols
            fallthrough: false
```

### 5. Cloud Foundry deployment

#### `ui5-deploy.yaml`

Configure the builder to include the library in the build output and deployment archive:

```yaml
builder:
  settings:
    includeDependency:
      - miyasuta.ui5uploadcontrols
  customTasks:
    - name: ui5-task-zipper
      afterTask: generateCachebusterInfo
      configuration:
        archiveName: your-app
        relativePaths: true
        additionalFiles:
          - xs-app.json
        includeDependencies:
          - miyasuta.ui5uploadcontrols
```

#### `xs-app.json`

Add a route so library resources are served from the HTML5 Application Repository instead of the UI5 CDN:

```json
{
  "source": "^/resources/miyasuta/ui5uploadcontrols/(.*)$",
  "target": "/resources/miyasuta/ui5uploadcontrols/$1",
  "service": "html5-apps-repo-rt",
  "authenticationType": "xsuaa"
}
```

Place this route **before** the generic `/resources` route.

#### `manifest.json` — `resourceRoots`

Required for resolving the library when launched from SAP Build Work Zone:

```json
"sap.ui5": {
  "resourceRoots": {
    "miyasuta.ui5uploadcontrols": "./resources/miyasuta/ui5uploadcontrols"
  }
}
```

#### `index.html` — `data-sap-ui-resource-roots`

Required for resolving the library when running from the HTML5 Application Repository:

```html
<script
    id="sap-ui-bootstrap"
    src="resources/sap-ui-core.js"
    data-sap-ui-resource-roots='{
        "your-app": "./",
        "miyasuta.ui5uploadcontrols": "./resources/miyasuta/ui5uploadcontrols"
    }'
></script>
```
