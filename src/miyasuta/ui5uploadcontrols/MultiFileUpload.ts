/*!
 * ${copyright}
 */

// Provides control miyasuta.ui5uploadcontrols.MultiFileUpload.
import Control from "sap/ui/core/Control";
import { PropertyBindingInfo } from "sap/ui/base/ManagedObject";
import Table from "sap/m/Table";
import Column from "sap/m/Column";
import ColumnListItem from "sap/m/ColumnListItem";
import Text from "sap/m/Text";
import Link from "sap/m/Link";
import Button from "sap/m/Button";
import Toolbar from "sap/m/Toolbar";
import ToolbarSpacer from "sap/m/ToolbarSpacer";
import UploadSetwithTable from "sap/m/plugins/UploadSetwithTable";
import ActionsPlaceholder from "sap/m/upload/ActionsPlaceholder";
import { UploadSetwithTableActionPlaceHolder } from "sap/m/library";
import MessageBox from "sap/m/MessageBox";
import Event from "sap/ui/base/Event";
import ODataV4Context from "sap/ui/model/odata/v4/Context";
import ODataModel from "sap/ui/model/odata/v4/ODataModel";
import MultiFileUploadRenderer from "./MultiFileUploadRenderer";

/**
 * Constructor for a new <code>miyasuta.ui5uploadcontrols.MultiFileUpload</code> control.
 *
 * A control for multi-file upload/download using sap.m.plugins.UploadSetwithTable,
 * backed by the @cap-js/attachments composition pattern.
 * Resolves the OData service URL and entity path from the parent binding context automatically.
 *
 * @extends Control
 *
 * @constructor
 * @public
 * @name miyasuta.ui5uploadcontrols.MultiFileUpload
 */
export default class MultiFileUpload extends Control {

	// The following three lines were generated and should remain as-is to make TypeScript aware of the constructor signatures
	constructor(id?: string | $MultiFileUploadSettings);
	constructor(id?: string, settings?: $MultiFileUploadSettings);
	constructor(id?: string, settings?: $MultiFileUploadSettings) { super(id, settings); }

	static readonly metadata = {
		library: "miyasuta.ui5uploadcontrols",
		properties: {
			/**
			 * Bound to the navigation property segment for the attachments composition
			 * (e.g. attachments="{model>files}").
			 * The binding path is used as the OData navigation segment in POST/DELETE requests
			 * and in requestSideEffects; the model name is used to resolve the binding context.
			 * Omit the model prefix for the default (unnamed) model: attachments="{files}".
			 */
			attachments: {
				type: "object",
				group: "Data",
				defaultValue: null
			},
			/**
			 * When true, upload/delete is enabled only when the entity is in draft mode (IsActiveEntity = false).
			 * When false, draft lifecycle is managed automatically.
			 */
			draftOnly: {
				type: "boolean",
				group: "Behavior",
				defaultValue: true
			},
			/**
			 * Controls whether upload and delete are enabled.
			 * When false, both are disabled regardless of draft state.
			 */
			enabled: {
				type: "boolean",
				group: "Behavior",
				defaultValue: true
			},
			/**
			 * Comma-separated list of allowed MIME types (e.g. "application/pdf,image/png").
			 * Files whose MIME type does not match are rejected before upload.
			 * Null means no MIME type restriction.
			 */
			mediaTypes: {
				type: "string",
				group: "Behavior",
				defaultValue: null
			},
			/**
			 * Comma-separated list of allowed file extensions (e.g. "pdf,png").
			 * Leading dots are stripped automatically (e.g. ".pdf" is treated as "pdf").
			 * Files whose extension does not match are rejected before upload.
			 * Null means no file extension restriction.
			 */
			fileTypes: {
				type: "string",
				group: "Behavior",
				defaultValue: null
			},
			/**
			 * Ordered list of attachment property names to display as columns between
			 * the fixed File Name column (first) and the Delete button column (last).
			 * Available names: any property of the Attachments entity, e.g. "createdAt", "createdBy", "mimeType".
			 */
			displayProperties: {
				type: "string[]",
				group: "Behavior",
				defaultValue: ["createdAt", "createdBy"]
			}
		},
		aggregations: {
			_table: { type: "sap.m.Table", multiple: false, visibility: "hidden" }
		},
		events: {}
	};

	static renderer = MultiFileUploadRenderer;

	private _uploadPlugin!: UploadSetwithTable;
	private _lastBoundPath: string | undefined;

	override init(): void {
		const sPluginId = this.getId() + "--uploadPlugin";
		const sPlaceholderId = this.getId() + "--uploadButton";

		this._uploadPlugin = new UploadSetwithTable(sPluginId, {
			beforeUploadStarts: this._onBeforeUploadStarts.bind(this),
			fileTypeMismatch: this._onTypeMismatch.bind(this),
			mediaTypeMismatch: this._onTypeMismatch.bind(this),
			actions: [sPlaceholderId]
		});

		const oPlaceholder = new ActionsPlaceholder(sPlaceholderId, {
			placeholderFor: UploadSetwithTableActionPlaceHolder.UploadButtonPlaceholder
		});

		const oTable = new Table({
			headerToolbar: new Toolbar({ content: [new ToolbarSpacer(), oPlaceholder] })
			// columns are built dynamically in _bindTableItems()
		});

		oTable.addDependent(this._uploadPlugin);
		this.setAggregation("_table", oTable);

		// React to binding context propagated from parent containers (e.g. Fiori Elements Object Page).
		// setBindingContext is not called directly by FE; context arrives via propagateProperties → updateBindingContext,
		// which fires the modelContextChange event.
		this.attachModelContextChange(this._onModelContextChange.bind(this));
	}

	/**
	 * Extracts the OData model name and navigation segment from the attachments binding info.
	 * e.g. attachments="{myModel>files}" → { modelName: "myModel", segment: "files" }
	 * e.g. attachments="{files}"         → { modelName: undefined, segment: "files" }
	 */
	private _getAttachmentsBinding(): { modelName: string | undefined; segment: string | undefined } {
		// UI5 stores binding info in parts[0] for property bindings like "{model>path}".
		const info = this.getBindingInfo("attachments") as PropertyBindingInfo | undefined;
		const part0 = info?.parts?.[0];
		const part = typeof part0 !== "string" ? part0 : undefined;
		return {
			modelName: part?.model ?? undefined,
			segment: part?.path ?? undefined
		};
	}

	override onBeforeRendering(): void {
		if (!this._lastBoundPath) {
			const { modelName } = this._getAttachmentsBinding();
			const context = this.getBindingContext(modelName);
			if (context) {
				this._scheduleBindTableItems(context as ODataV4Context);
			}
		}
	}

	private _onModelContextChange(): void {
		const { modelName } = this._getAttachmentsBinding();
		const context = this.getBindingContext(modelName);
		if (context) {
			this._scheduleBindTableItems(context as ODataV4Context);
		}
	}

	/**
	 * Waits for OData metadata to be loaded before building columns and binding items.
	 * Using getObject() synchronously fails in freestyle apps where metadata is not yet
	 * fetched at render time — requestObject("/") ensures labels resolve correctly.
	 */
	private _scheduleBindTableItems(context: ODataV4Context): void {
		const targetPath = context.getPath();
		if (this._lastBoundPath === targetPath) return;
		this._lastBoundPath = targetPath;
		const model = context.getModel() as ODataModel;
		void model.getMetaModel().requestObject("/").then(() => {
			// Re-check: path may have changed while metadata was loading
			if (this._lastBoundPath === targetPath) {
				this._bindTableItems(context);
			}
		});
	}

	setEnabled(value: boolean): this {
		this.setProperty("enabled", value, true);
		// Update delete buttons in all bound rows
		const table = this.getAggregation("_table") as Table;
		const canOperate = this._computeCanOperate(value);
		this._uploadPlugin.setUploadEnabled(canOperate);
		// Delete button is always the last cell: filename link + N display-property cells + delete button
		const deleteIndex = 1 + (this.getDisplayProperties() as string[]).length;
		table.getItems().forEach((item) => {
			const cells = (item as ColumnListItem).getCells();
			const deleteButton = cells[deleteIndex] as Button;
			if (deleteButton) {
				deleteButton.setEnabled(canOperate);
			}
		});
		return this;
	}

	private _computeCanOperate(enabled?: boolean): boolean {
		const isEnabled = enabled ?? this.getEnabled();
		if (!isEnabled) return false;
		if (!this.getDraftOnly()) return true;
		// IsActiveEntity is part of the OData key, so it is always available in
		// the binding context path — no need to wait for getObject() to load. (#10)
		const { modelName } = this._getAttachmentsBinding();
		const context = this.getBindingContext(modelName);
		// Primary: IsActiveEntity is part of the OData key, so it is always in the
		// binding context path — works before getObject() resolves. (#10)
		const path = (context as unknown as { getPath?(): string } | null)?.getPath?.() ?? "";
		const match = path.match(/IsActiveEntity=(true|false)/i);
		if (match) {
			return match[1].toLowerCase() !== "true";
		}
		// Fallback: getObject() for non-draft entities or when path is unavailable
		const obj = context?.getObject() as Record<string, unknown> | undefined;
		return !(obj?.IsActiveEntity === true);
	}

	private _parseTypes(value: string | null, stripDots = false): string[] {
		if (!value) return [];
		return value.split(",")
			.map((s) => {
				const t = s.trim();
				return stripDots ? t.replace(/^\./, "") : t;
			})
			.filter(Boolean);
	}

	setMediaTypes(value: string): this {
		this.setProperty("mediaTypes", value, true);
		this._uploadPlugin.setMediaTypes(this._parseTypes(value));
		return this;
	}

	setFileTypes(value: string): this {
		this.setProperty("fileTypes", value, true);
		this._uploadPlugin.setFileTypes(this._parseTypes(value, true));
		return this;
	}

	private _onTypeMismatch(event: Event): void {
		const item = (event.getParameters() as { item: { getFileName(): string } }).item;
		MessageBox.error(`The file "${item.getFileName()}" is not allowed.`);
	}

	private _bindTableItems(parentContext: ODataV4Context): void {
		const { modelName, segment } = this._getAttachmentsBinding();
		const mn = modelName;
		const table = this.getAggregation("_table") as Table;
		table.setBindingContext(parentContext, mn);
		const model = parentContext.getModel() as ODataModel;
		const serviceUrl = model.getServiceUrl().replace(/\/$/, "");

		// Resolve column labels from OData V4 metamodel (@Common.Label)
		const metaModel = model.getMetaModel();
		const metaPath = metaModel.getMetaPath(`${parentContext.getPath()}/${segment}`);
		const LABEL = "@com.sap.vocabularies.Common.v1.Label";
		const filenameLabel = (metaModel.getObject(`${metaPath}/filename${LABEL}`) as string | undefined) ?? "filename";

		const displayProps = this.getDisplayProperties() as string[];
		const displayLabels = displayProps.map(
			(prop) => (metaModel.getObject(`${metaPath}/${prop}${LABEL}`) as string | undefined) ?? prop
		);

		// Rebuild columns: filename (always first) + displayProperties + delete (always last)
		table.removeAllColumns();
		table.addColumn(new Column({ header: new Text({ text: filenameLabel }) }));
		displayLabels.forEach((label) => {
			table.addColumn(new Column({ header: new Text({ text: label }) }));
		});
		table.addColumn(new Column({ hAlign: "End", width: "4rem" }));

		const canOperate = this._computeCanOperate();
		this._uploadPlugin.setUploadEnabled(canOperate);

		table.bindItems({
			model: mn,
			path: segment!,
			template: new ColumnListItem({
				cells: [
					new Link({
						text: { model: mn, path: "filename" },
						target: "_blank",
						href: {
							parts: [{ model: mn, path: "ID" }],
							formatter: (id: string): string => {
								if (!id) return "";
								const { modelName: mn2, segment: seg } = this._getAttachmentsBinding();
								const pContext = this.getBindingContext(mn2);
								if (!pContext) return "";
								const parentPath = (pContext as ODataV4Context).getPath();
								return `${serviceUrl}${parentPath}/${seg}(ID=${id})/content`;
							}
						}
					}),
					...displayProps.map((prop) => this._createCellForProp(prop, mn)),
					new Button({
						icon: "sap-icon://decline",
						type: "Transparent",
						enabled: canOperate,
						press: (event: Event) => { void this._onRowDeletePress(event); }
					})
				]
			}),
			templateShareable: false
		});
	}

	/**
	 * Creates the appropriate table cell control for a given attachment property.
	 * "createdAt" gets a date formatter; all other properties use plain text binding.
	 */
	private _createCellForProp(prop: string, mn: string | undefined): Text {
		if (prop === "createdAt") {
			return new Text({
				text: {
					model: mn,
					path: "createdAt",
					formatter: (value: Date | string | null) => {
						if (!value) return "";
						const d = typeof value === "string" ? new Date(value) : value;
						return isNaN(d.getTime()) ? String(value) : d.toLocaleString();
					}
				}
			});
		}
		return new Text({ text: { model: mn, path: prop } });
	}

	private _onBeforeUploadStarts(event: Event): void {
		event.preventDefault();
		if (!this._computeCanOperate()) return;
		const item = (event.getParameters() as { item: { getFileObject(): File | Blob } }).item;
		const fileOrBlob = item.getFileObject();
		const file = fileOrBlob instanceof File
			? fileOrBlob
			: new File([fileOrBlob], "upload", { type: fileOrBlob.type });
		void this._handleUpload(file);
	}

	private async _handleUpload(file: File): Promise<void> {
		const { modelName } = this._getAttachmentsBinding();
		const context = this.getBindingContext(modelName);
		if (!context) {
			console.error("MultiFileUpload: no binding context found");
			return;
		}

		const model = context.getModel() as unknown as { getServiceUrl(): string };
		const serviceUrl = model.getServiceUrl().replace(/\/$/, "");
		const entityPath = (context as ODataV4Context).getPath();

		try {
			const csrfToken = await this._fetchCsrfToken(serviceUrl);
			const obj = context.getObject() as Record<string, unknown>;

			if (obj?.IsActiveEntity === true && !this.getDraftOnly()) {
				await this._uploadWithDraftLifecycle(serviceUrl, entityPath, file, csrfToken);
			} else {
				await this._uploadDirect(serviceUrl, entityPath, file, csrfToken);
			}

			const { segment } = this._getAttachmentsBinding();
			console.info("MultiFileUpload: upload completed", file.name);
			await (context as ODataV4Context).requestSideEffects([{ $NavigationPropertyPath: segment! }]);
		} catch (error) {
			console.error("MultiFileUpload: upload failed", error);
		}
	}

	private async _uploadDirect(serviceUrl: string, entityPath: string, file: File, csrfToken: string): Promise<void> {
		const { segment } = this._getAttachmentsBinding();
		const attachmentsUrl = `${serviceUrl}${entityPath}/${segment}`;

		// Step 1: POST to create the attachment entity record
		const postResponse = await fetch(attachmentsUrl, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-csrf-token": csrfToken
			},
			body: JSON.stringify({
				filename: file.name,
				mimeType: file.type || "application/octet-stream"
			})
		});
		if (!postResponse.ok) {
			throw new Error(`POST failed: ${postResponse.status} ${postResponse.statusText}`);
		}
		const attachmentData = await postResponse.json() as { ID: string };
		const attachmentId = attachmentData.ID;

		// Step 2: PUT binary content to the content property
		const contentUrl = `${attachmentsUrl}(ID=${attachmentId})/content`;
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
		const draftEditResponse = await fetch(`${serviceUrl}${entityPath}/draftEdit`, {
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

		// Step 2: derive draft entity path
		const draftEntityPath = entityPath.replace(/IsActiveEntity=true/i, "IsActiveEntity=false");

		// Step 3: upload to the draft entity's attachments
		await this._uploadDirect(serviceUrl, draftEntityPath, file, csrfToken);

		// Step 4: activate the draft
		const activateResponse = await fetch(`${serviceUrl}${draftEntityPath}/draftActivate`, {
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

	private async _onRowDeletePress(event: Event): Promise<void> {
		if (!this._computeCanOperate()) return;

		// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
		const button = event.getSource() as Button;
		const { modelName, segment } = this._getAttachmentsBinding();
		const rowContext = button.getBindingContext(modelName) as ODataV4Context;
		if (!rowContext) return;

		const model = rowContext.getModel() as unknown as { getServiceUrl(): string };
		const serviceUrl = model.getServiceUrl().replace(/\/$/, "");
		const attachmentPath = rowContext.getPath();

		const parentContext = this.getBindingContext(modelName) as ODataV4Context;
		if (!parentContext) return;

		try {
			const csrfToken = await this._fetchCsrfToken(serviceUrl);
			await this._deleteDirect(serviceUrl, attachmentPath, csrfToken);

			console.info("MultiFileUpload: delete completed");
			await parentContext.requestSideEffects([{ $NavigationPropertyPath: segment! }]);
		} catch (error) {
			console.error("MultiFileUpload: delete failed", error);
		}
	}

	private async _deleteDirect(serviceUrl: string, attachmentPath: string, csrfToken: string): Promise<void> {
		const deleteResponse = await fetch(`${serviceUrl}${attachmentPath}`, {
			method: "DELETE",
			headers: { "x-csrf-token": csrfToken }
		});
		if (!deleteResponse.ok) {
			throw new Error(`DELETE failed: ${deleteResponse.status} ${deleteResponse.statusText}`);
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
