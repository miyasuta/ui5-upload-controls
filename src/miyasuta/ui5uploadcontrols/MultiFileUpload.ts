/*!
 * ${copyright}
 */

// Provides control miyasuta.ui5uploadcontrols.MultiFileUpload.
import Control from "sap/ui/core/Control";
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
import Event from "sap/ui/base/Event";
import MessageBox from "sap/m/MessageBox";
import ODataV4Context from "sap/ui/model/odata/v4/Context";
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
			 * Navigation property segment name for the attachments composition (e.g. "attachments").
			 */
			attachmentsSegment: {
				type: "string",
				group: "Data",
				defaultValue: "attachments"
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
			 * Name of the OData model as registered in manifest.json.
			 * Omit for the default (unnamed) model.
			 */
			modelName: {
				type: "string",
				group: "Data",
				defaultValue: null
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
			actions: [sPlaceholderId]
		});

		const oPlaceholder = new ActionsPlaceholder(sPlaceholderId, {
			placeholderFor: UploadSetwithTableActionPlaceHolder.UploadButtonPlaceholder
		});

		const oTable = new Table({
			headerToolbar: new Toolbar({ content: [new ToolbarSpacer(), oPlaceholder] }),
			columns: [
				new Column({ header: new Text({ text: "File Name" }) }),
				new Column({ header: new Text({ text: "Created At" }) }),
				new Column({ header: new Text({ text: "Created By" }) }),
				new Column({ hAlign: "End", width: "4rem" })
			]
		});

		oTable.addDependent(this._uploadPlugin);
		this.setAggregation("_table", oTable);

		// React to binding context propagated from parent containers (e.g. Fiori Elements Object Page).
		// setBindingContext is not called directly by FE; context arrives via propagateProperties → updateBindingContext,
		// which fires the modelContextChange event.
		this.attachModelContextChange(this._onModelContextChange.bind(this));
	}

	override onBeforeRendering(): void {
		if (!this._lastBoundPath) {
			const context = this.getBindingContext(this.getModelName() || undefined);
			if (context) {
				this._bindTableItems(context as ODataV4Context);
				this._lastBoundPath = (context as ODataV4Context).getPath();
			}
		}
	}

	private _onModelContextChange(): void {
		const context = this.getBindingContext(this.getModelName() || undefined);
		if (context) {
			const currentPath = (context as ODataV4Context).getPath();
			if (this._lastBoundPath !== currentPath) {
				this._bindTableItems(context as ODataV4Context);
				this._lastBoundPath = currentPath;
			}
			return;
		}
	}

	setEnabled(value: boolean): this {
		this.setProperty("enabled", value, true);
		// Update delete buttons in all bound rows
		const table = this.getAggregation("_table") as Table;
		const canOperate = this._computeCanOperate(value);
		this._uploadPlugin.setUploadEnabled(canOperate);
		table.getItems().forEach((item) => {
			const cells = (item as ColumnListItem).getCells();
			const deleteButton = cells[3] as Button;
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
		const context = this.getBindingContext(this.getModelName() || undefined);
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

	private _bindTableItems(parentContext: ODataV4Context): void {
		const mn = this.getModelName() || undefined;
		const table = this.getAggregation("_table") as Table;
		table.setBindingContext(parentContext, mn);
		const model = parentContext.getModel() as unknown as { getServiceUrl(): string };
		const serviceUrl = model.getServiceUrl().replace(/\/$/, "");
		const canOperate = this._computeCanOperate();
		this._uploadPlugin.setUploadEnabled(canOperate);

		table.bindItems({
			model: mn,
			path: this.getAttachmentsSegment(),
			template: new ColumnListItem({
				cells: [
					new Link({
						text: { model: mn, path: "filename" },
						target: "_blank",
						href: {
							parts: [{ model: mn, path: "ID" }],
							formatter: (id: string): string => {
								if (!id) return "";
								const pContext = this.getBindingContext(this.getModelName() || undefined);
								if (!pContext) return "";
								const parentPath = (pContext as ODataV4Context).getPath();
								return `${serviceUrl}${parentPath}/${this.getAttachmentsSegment()}(ID=${id})/content`;
							}
						}
					}),
					new Text({
						text: {
							model: mn,
							path: "createdAt",
							formatter: (value: Date | string | null) => {
								if (!value) return "";
								const d = typeof value === "string" ? new Date(value) : value;
								return isNaN(d.getTime()) ? String(value) : d.toLocaleString();
							}
						}
					}),
					new Text({ text: { model: mn, path: "createdBy" } }),
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
		const context = this.getBindingContext(this.getModelName() || undefined);
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

			console.info("MultiFileUpload: upload completed", file.name);
			await (context as ODataV4Context).requestSideEffects([{ $NavigationPropertyPath: this.getAttachmentsSegment() }]);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			console.error("MultiFileUpload: upload failed", error);
			MessageBox.error(message);
		}
	}

	private async _uploadDirect(serviceUrl: string, entityPath: string, file: File, csrfToken: string): Promise<void> {
		const attachmentsUrl = `${serviceUrl}${entityPath}/${this.getAttachmentsSegment()}`;

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
			throw new Error(await this._parseErrorMessage(postResponse));
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
			throw new Error(await this._parseErrorMessage(putResponse));
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
			throw new Error(await this._parseErrorMessage(draftEditResponse));
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
			throw new Error(await this._parseErrorMessage(activateResponse));
		}
	}

	private async _onRowDeletePress(event: Event): Promise<void> {
		if (!this._computeCanOperate()) return;

		// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
		const button = event.getSource() as Button;
		const rowContext = button.getBindingContext(this.getModelName() || undefined) as ODataV4Context;
		if (!rowContext) return;

		const model = rowContext.getModel() as unknown as { getServiceUrl(): string };
		const serviceUrl = model.getServiceUrl().replace(/\/$/, "");
		const attachmentPath = rowContext.getPath();

		const parentContext = this.getBindingContext(this.getModelName() || undefined) as ODataV4Context;
		if (!parentContext) return;

		try {
			const csrfToken = await this._fetchCsrfToken(serviceUrl);
			await this._deleteDirect(serviceUrl, attachmentPath, csrfToken);

			console.info("MultiFileUpload: delete completed");
			await parentContext.requestSideEffects([{ $NavigationPropertyPath: this.getAttachmentsSegment() }]);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			console.error("MultiFileUpload: delete failed", error);
			MessageBox.error(message);
		}
	}

	private async _deleteDirect(serviceUrl: string, attachmentPath: string, csrfToken: string): Promise<void> {
		const deleteResponse = await fetch(`${serviceUrl}${attachmentPath}`, {
			method: "DELETE",
			headers: { "x-csrf-token": csrfToken }
		});
		if (!deleteResponse.ok) {
			throw new Error(await this._parseErrorMessage(deleteResponse));
		}
	}

	private async _parseErrorMessage(response: Response): Promise<string> {
		try {
			const body = await response.json() as { error?: { message?: string } };
			return body?.error?.message ?? `${response.status} ${response.statusText}`;
		} catch {
			return `${response.status} ${response.statusText}`;
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
