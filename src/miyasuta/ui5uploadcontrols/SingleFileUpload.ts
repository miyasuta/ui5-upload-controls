/*!
 * ${copyright}
 */

// Provides control miyasuta.ui5uploadcontrols.SingleFileUpload.
import Control from "sap/ui/core/Control";
import FileUploader from "sap/ui/unified/FileUploader";
import { FileUploader$ChangeEvent } from "sap/ui/unified/FileUploader";
import SingleFileUploadRenderer from "./SingleFileUploadRenderer";

/**
 * Constructor for a new <code>miyasuta.ui5uploadcontrols.SingleFileUpload</code> control.
 *
 * A control for single file upload/download for entities with a LargeBinary property.
 * Resolves the OData service URL and entity path from the parent binding context automatically.
 *
 * @extends Control
 *
 * @constructor
 * @public
 * @name miyasuta.ui5uploadcontrols.SingleFileUpload
 */
export default class SingleFileUpload extends Control {

	// The following three lines were generated and should remain as-is to make TypeScript aware of the constructor signatures
	constructor(id?: string | $SingleFileUploadSettings);
	constructor(id?: string, settings?: $SingleFileUploadSettings);
	constructor(id?: string, settings?: $SingleFileUploadSettings) { super(id, settings); }

	static readonly metadata = {
		library: "miyasuta.ui5uploadcontrols",
		properties: {
			/**
			 * Property name on the entity used to store the file name.
			 */
			fileNameProperty: {
				type: "string",
				group: "Data",
				defaultValue: null
			},
			/**
			 * Property name of the LargeBinary field.
			 */
			contentProperty: {
				type: "string",
				group: "Data",
				defaultValue: "content"
			},
			/**
			 * Name of the OData model as registered in manifest.json.
			 * Omit for the default (unnamed) model.
			 */
			modelName: {
				type: "string",
				group: "Data",
				defaultValue: null
			},
			/**
			 * When true, upload is enabled only when the entity is in draft mode (IsActiveEntity = false).
			 * When false, upload is always enabled and draft lifecycle is managed automatically.
			 */
			draftOnly: {
				type: "boolean",
				group: "Behavior",
				defaultValue: true
			}
		},
		aggregations: {
			_fileUploader: { type: "sap.ui.unified.FileUploader", multiple: false, visibility: "hidden" }
		},
		events: {}
	};

	static renderer = SingleFileUploadRenderer;

	override init(): void {
		const oFileUploader = new FileUploader({
			change: this._onFileChange.bind(this)
		});
		this.setAggregation("_fileUploader", oFileUploader);
	}

	private async _onFileChange(event: FileUploader$ChangeEvent): Promise<void> {
		const files = event.getParameter("files") as unknown as FileList;
		if (!files || files.length === 0) {
			return;
		}
		const file = files[0];

		const modelName = this.getModelName() || undefined;
		const context = this.getBindingContext(modelName);
		if (!context) {
			console.error("SingleFileUpload: no binding context found");
			return;
		}

		// Derive service URL and entity path from the OData V4 model
		const model = context.getModel() as unknown as { getServiceUrl(): string };
		const serviceUrl = model.getServiceUrl().replace(/\/$/, "");
		const entityPath = context.getPath();
		const entityUrl = serviceUrl + entityPath;
		const contentUrl = `${entityUrl}/${this.getContentProperty()}`;

		try {
			// Step 1: fetch CSRF token
			const csrfToken = await this._fetchCsrfToken(serviceUrl);

			// Step 2: PATCH filename
			const patchResponse = await fetch(entityUrl, {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
					"x-csrf-token": csrfToken
				},
				body: JSON.stringify({ [this.getFileNameProperty()]: file.name })
			});
			if (!patchResponse.ok) {
				throw new Error(`PATCH failed: ${patchResponse.status} ${patchResponse.statusText}`);
			}

			// Step 3: PUT binary content
			const putResponse = await fetch(contentUrl, {
				method: "PUT",
				headers: {
					"Content-Type": file.type || "application/octet-stream",
					"x-csrf-token": csrfToken
				},
				body: file
			});
			if (!putResponse.ok) {
				throw new Error(`PUT failed: ${putResponse.status} ${putResponse.statusText}`);
			}

			console.info("SingleFileUpload: upload completed", file.name);
		} catch (error) {
			console.error("SingleFileUpload: upload failed", error);
		}
	}

	private async _fetchCsrfToken(serviceUrl: string): Promise<string> {
		const response = await fetch(serviceUrl, {
			method: "GET",
			headers: { "x-csrf-token": "Fetch" }
		});
		return response.headers.get("x-csrf-token") ?? "";
	}
}
