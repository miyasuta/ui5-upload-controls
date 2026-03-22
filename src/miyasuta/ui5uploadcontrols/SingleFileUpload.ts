/*!
 * ${copyright}
 */

// Provides control miyasuta.ui5uploadcontrols.SingleFileUpload.
import Control from "sap/ui/core/Control";
import FileUploader from "sap/ui/unified/FileUploader";
import { FileUploader$ChangeEvent } from "sap/ui/unified/FileUploader";
import Link from "sap/m/Link";
import Button from "sap/m/Button";
import ODataV4Context from "sap/ui/model/odata/v4/Context";
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
			},
			/**
			 * Width of the control wrapper.
			 */
			width: {
				type: "sap.ui.core.CSSSize",
				group: "Appearance",
				defaultValue: "auto"
			}
		},
		aggregations: {
			_fileUploader: { type: "sap.ui.unified.FileUploader", multiple: false, visibility: "hidden" },
			_filenameLink: { type: "sap.m.Link", multiple: false, visibility: "hidden" },
			_deleteButton: { type: "sap.m.Button", multiple: false, visibility: "hidden" }
		},
		events: {}
	};

	static renderer = SingleFileUploadRenderer;

	override init(): void {
		const oFileUploader = new FileUploader({
			width: "auto",
			change: this._onFileChange.bind(this)
		});
		this.setAggregation("_fileUploader", oFileUploader);

		const oLink = new Link({ visible: false, target: "_blank" });
		this.setAggregation("_filenameLink", oLink);

		const oDeleteButton = new Button({
			icon: "sap-icon://decline",
			visible: false,
			press: this._onDeletePress.bind(this)
		});
		this.setAggregation("_deleteButton", oDeleteButton);
	}

	override onBeforeRendering(): void {
		const modelName = this.getModelName() || undefined;
		const context = this.getBindingContext(modelName);
		const fileUploader = this.getAggregation("_fileUploader") as FileUploader;
		const filenameLink = this.getAggregation("_filenameLink") as Link;

		if (!context) {
			fileUploader.setEnabled(true);
			filenameLink.setVisible(false);
			return;
		}

		const obj = context.getObject() as Record<string, unknown>;
		const isActive = obj?.IsActiveEntity;

		// Draft detection: disable upload in active (display) mode when draftOnly=true
		if (isActive === true && this.getDraftOnly()) {
			fileUploader.setEnabled(false);
		} else {
			fileUploader.setEnabled(true);
		}

		// Filename display: show download link and delete button when a file name exists
		const fileNameProp = this.getFileNameProperty();
		const fileName = fileNameProp ? (obj?.[fileNameProp] as string) : undefined;
		const deleteButton = this.getAggregation("_deleteButton") as Button;
		if (fileName) {
			const model = context.getModel() as unknown as { getServiceUrl(): string };
			const serviceUrl = model.getServiceUrl().replace(/\/$/, "");
			const entityPath = context.getPath();
			const contentUrl = `${serviceUrl}${entityPath}/${this.getContentProperty()}`;
			filenameLink.setText(fileName);
			filenameLink.setHref(contentUrl);
			filenameLink.setVisible(true);
			deleteButton.setVisible(true);
			deleteButton.setEnabled(fileUploader.getEnabled());
		} else {
			filenameLink.setVisible(false);
			deleteButton.setVisible(false);

			// If context object data hasn't loaded yet, request fileName specifically.
			// requestObject(path) triggers a server fetch if the property isn't cached,
			// unlike requestObject() which only returns whatever is currently in cache.
			if ((obj === undefined || obj === null) && fileNameProp) {
				(context as unknown as ODataV4Context).requestObject(fileNameProp).then((value: unknown) => {
					if (value) {
						this.invalidate();
					}
				}).catch(() => {/* ignore load errors */});
			}
		}
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

		const model = context.getModel() as unknown as { getServiceUrl(): string };
		const serviceUrl = model.getServiceUrl().replace(/\/$/, "");
		const entityPath = context.getPath();

		try {
			const csrfToken = await this._fetchCsrfToken(serviceUrl);

			const obj = context.getObject() as Record<string, unknown>;
			const isActive = obj?.IsActiveEntity;

			if (isActive === true && !this.getDraftOnly()) {
				// draftOnly=false: create draft, upload, then activate
				await this._uploadWithDraftLifecycle(serviceUrl, entityPath, file, csrfToken);
			} else {
				// Direct upload (draft mode or non-draft entity)
				await this._uploadDirect(serviceUrl, entityPath, file, csrfToken);
			}

			console.info("SingleFileUpload: upload completed", file.name);

			// Update the filename link and delete button directly — we already know the file name,
			// so there's no need to wait for a model refresh to update the UI.
			const filenameLink = this.getAggregation("_filenameLink") as Link;
			const contentUrl = `${serviceUrl}${entityPath}/${this.getContentProperty()}`;
			filenameLink.setText(file.name);
			filenameLink.setHref(contentUrl);
			filenameLink.setVisible(true);

			const deleteButton = this.getAggregation("_deleteButton") as Button;
			deleteButton.setVisible(true);
			deleteButton.setEnabled(true);

			(context as unknown as ODataV4Context).refresh();
		} catch (error) {
			console.error("SingleFileUpload: upload failed", error);
		}
	}

	private async _uploadDirect(serviceUrl: string, entityPath: string, file: File, csrfToken: string): Promise<void> {
		const entityUrl = serviceUrl + entityPath;
		const contentUrl = `${entityUrl}/${this.getContentProperty()}`;

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
	}

	private async _uploadWithDraftLifecycle(serviceUrl: string, entityPath: string, file: File, csrfToken: string): Promise<void> {
		// Step 1: call draftEdit to create a draft
		const draftEditUrl = `${serviceUrl}${entityPath}/draftEdit`;
		const draftEditResponse = await fetch(draftEditUrl, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-csrf-token": csrfToken
			},
			body: JSON.stringify({ PreserveChanges: true })
		});
		if (!draftEditResponse.ok) {
			throw new Error(`draftEdit failed: ${draftEditResponse.status} ${draftEditResponse.statusText}`);
		}

		// Step 2: derive draft entity URL from @odata.id in the response
		const draftEntity = await draftEditResponse.json() as { "@odata.id": string };
		const draftId = draftEntity["@odata.id"];
		const draftUrl = `${serviceUrl}/${draftId}`;

		// Step 3: upload to the draft entity
		await this._uploadDirect(serviceUrl, `/${draftId}`, file, csrfToken);

		// Step 4: activate the draft
		const activateUrl = `${draftUrl}/draftActivate`;
		const activateResponse = await fetch(activateUrl, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-csrf-token": csrfToken
			},
			body: JSON.stringify({})
		});
		if (!activateResponse.ok) {
			throw new Error(`draftActivate failed: ${activateResponse.status} ${activateResponse.statusText}`);
		}
	}

	async _onDeletePress(): Promise<void> {
		const modelName = this.getModelName() || undefined;
		const context = this.getBindingContext(modelName);
		if (!context) {
			return;
		}

		const model = context.getModel() as unknown as { getServiceUrl(): string };
		const serviceUrl = model.getServiceUrl().replace(/\/$/, "");
		const entityPath = context.getPath();
		const entityUrl = serviceUrl + entityPath;

		try {
			const csrfToken = await this._fetchCsrfToken(serviceUrl);

			const patchResponse = await fetch(entityUrl, {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
					"x-csrf-token": csrfToken
				},
				body: JSON.stringify({ [this.getContentProperty()]: null })
			});
			if (!patchResponse.ok) {
				throw new Error(`PATCH failed: ${patchResponse.status} ${patchResponse.statusText}`);
			}

			const filenameLink = this.getAggregation("_filenameLink") as Link;
			const deleteButton = this.getAggregation("_deleteButton") as Button;
			filenameLink.setVisible(false);
			deleteButton.setVisible(false);

			(context as unknown as ODataV4Context).refresh();
		} catch (error) {
			console.error("SingleFileUpload: delete failed", error);
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
