# ui5-upload-controls

Reusable UI5 control library for file upload/download, designed to work with SAP CAP (LargeBinary properties and `@cap-js/attachments`).

**Namespace:** `miyasuta.ui5uploadcontrols`

---

## Controls

### SingleFileUpload

A control for single-file upload and download. Wraps `sap.ui.unified.FileUploader` and handles OData PATCH + streaming PUT internally.

Designed for entities that store file content as a `LargeBinary` property.

The service URL is derived automatically from the binding context's OData V4 model, so no explicit URL configuration is required.

#### Properties

| Property | Type | Default | Description |
|---|---|---|---|
| `fileNameProperty` | string | `null` | Property name on the entity used to store the file name |
| `contentProperty` | string | `"content"` | Property name of the LargeBinary field |
| `modelName` | string | `null` | Name of the OData model as registered in manifest.json. Omit for the default (unnamed) model |
| `draftOnly` | boolean | `true` | When `true`, upload is enabled only when the entity is in draft mode (`IsActiveEntity = false`). When `false`, upload is always enabled and draft is managed automatically (see Draft Handling) |

#### UI

```
[ File name display / Download link       ]
[ FileUploader (file picker + upload btn) ]
```

- If a file already exists, the file name is shown as a download link.
- The FileUploader is disabled when upload is not permitted (see Draft Handling).

#### Upload Flow

```
1. User selects a file via FileUploader
2. Resolve binding context → get OData V4 model → derive service URL and entity path
3. Apply draft handling logic (see below)
4. PATCH {serviceUrl}{entityPath}
        Body: { [fileNameProperty]: selectedFileName }
5. PUT  {serviceUrl}{entityPath}/{contentProperty}
        Body: file binary content
```

#### Download Flow

```
1. Resolve binding context → derive service URL and entity path
2. Construct URL: {serviceUrl}{entityPath}/{contentProperty}
3. Render as <a href="{url}" download>
```

#### Draft Handling

The control automatically detects whether the entity supports draft by checking for the `IsActiveEntity` property on the binding context.

| `IsActiveEntity` | `draftOnly` | Behavior |
|---|---|---|
| not present | any | Non-draft entity. Upload proceeds directly (PATCH → PUT). |
| `false` | any | Entity is in draft (edit) mode. Upload proceeds directly (PATCH → PUT). |
| `true` | `true` | Entity is active (display mode). **Upload is disabled.** The consuming app (e.g. Object Page) is expected to manage the Edit/Save/Cancel lifecycle. |
| `true` | `false` | Entity is active. The control calls EditAction to create a draft, performs the upload (PATCH → PUT), then calls draftActivate to activate the draft automatically. |

> **Note:** When embedding in a Fiori Elements Object Page, use the default `draftOnly="true"`.
> The Object Page manages the Edit/Save/Cancel lifecycle, so the control must not create or activate drafts independently.

#### Usage Example

```xml
<mvc:View
    xmlns:mvc="sap.ui.core.mvc"
    xmlns:upload="miyasuta.ui5uploadcontrols">

    <!-- Default model, draft-enabled entity embedded in Object Page -->
    <upload:SingleFileUpload
        fileNameProperty="fileName"
        contentProperty="content"
        draftOnly="true" />

</mvc:View>
```

Named model, upload always allowed (auto draft management):

```xml
<upload:SingleFileUpload
    modelName="myModel"
    fileNameProperty="fileName"
    contentProperty="content"
    draftOnly="false" />
```

---

## Prerequisites

- SAPUI5 1.124+
- SAP CAP backend with OData V4 service

## Integrating into a Consuming App

### 1. Build the library

```bash
cd ui5-upload-controls
npm install
npm run build
```

The output is placed in `dist/`.

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

### 3. Configure `ui5.yaml` to serve the library

When using `fiori run` (which proxies `/resources` to the UI5 CDN), the library must be served locally **before** the proxy intercepts the request.
Add `fiori-tools-servestatic` pointing to the library's `dist` folder:

```yaml
- name: fiori-tools-servestatic
  beforeMiddleware: fiori-tools-proxy
  configuration:
    paths:
      - path: /resources/miyasuta/ui5uploadcontrols
        src: <relative-path-to>/ui5-upload-controls/dist/resources/miyasuta/ui5uploadcontrols
        fallthrough: false
```

> **Why not npm workspaces alone?**
> `fiori-tools-proxy` intercepts all `/resources` requests and forwards them to the UI5 CDN.
> npm workspace symlinks alone cannot override this — the static middleware must run first.
> When the library is eventually published to npm and `ui5-local.yaml` (local SAPUI5) is used,
> the workspace-based approach will work without `fiori-tools-servestatic`.

### 4. Rebuild after library changes

The consuming app always loads from `dist/`. After modifying the library, run:

```bash
npm run build   # in ui5-upload-controls/
```

---

## Build

```bash
npm install
npm run build
```

## Development (standalone)

```bash
npm start          # launches test page (SingleFileUpload.html)
npm test           # runs QUnit tests headless (Karma)
npm run testsuite  # opens QUnit test suite in browser
```
