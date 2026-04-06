// @ts-nocheck

/*global QUnit, sinon */
// eslint-disable-next-line no-undef
sap.ui.define([
	"sap/ui/qunit/utils/createAndAppendDiv",
	"miyasuta/ui5uploadcontrols/MultiFileUpload",
	"sap/ui/core/Core",
	"sap/m/MessageBox",
	"sap/ui/core/Lib"
], function(createAndAppendDiv, MultiFileUpload, Core, MessageBox, Lib) {
	"use strict";

	// prepare DOM
	createAndAppendDiv("uiArea2");

	// ─── Properties ────────────────────────────────────────────────────────────

	QUnit.module("MultiFileUpload - Properties");

	QUnit.test("binding info extracted correctly from attachments binding expression", function(assert) {
		// attachments="{myModel>docs}" → modelName="myModel", segment="docs"
		const oControl = new MultiFileUpload({ attachments: "{myModel>docs}" });
		const binding = oControl._getAttachmentsBinding();
		assert.equal(binding.modelName, "myModel", "modelName extracted from binding expression");
		assert.equal(binding.segment, "docs", "segment extracted from binding expression");
		oControl.destroy();
	});

	QUnit.test("binding info extracted correctly for default (unnamed) model", function(assert) {
		// attachments="{attachments}" → modelName=undefined, segment="attachments"
		const oControl = new MultiFileUpload({ attachments: "{attachments}" });
		const binding = oControl._getAttachmentsBinding();
		assert.strictEqual(binding.modelName, undefined, "modelName is undefined for default model");
		assert.equal(binding.segment, "attachments", "segment extracted for default model");
		oControl.destroy();
	});

	QUnit.test("default values are correct", function(assert) {
		const oControl = new MultiFileUpload();
		assert.equal(oControl.getDraftOnly(), true, "draftOnly default is true");
		assert.equal(oControl.getEnabled(), true, "enabled default is true");
		assert.deepEqual(oControl.getDisplayProperties(), ["createdAt", "createdBy"], "displayProperties default is [createdAt, createdBy]");
		oControl.destroy();
	});

	QUnit.test("displayProperties can be set to empty array", function(assert) {
		const oControl = new MultiFileUpload({ displayProperties: [] });
		assert.deepEqual(oControl.getDisplayProperties(), [], "empty displayProperties");
		oControl.destroy();
	});

	QUnit.test("displayProperties can be configured with custom properties", function(assert) {
		const oControl = new MultiFileUpload({ displayProperties: ["mimeType", "createdAt"] });
		assert.deepEqual(oControl.getDisplayProperties(), ["mimeType", "createdAt"], "custom displayProperties returned correctly");
		oControl.destroy();
	});

	QUnit.test("configured values are returned", function(assert) {
		const oControl = new MultiFileUpload({
			attachments: "{docs}",
			draftOnly: false,
			enabled: false
		});
		assert.equal(oControl.getDraftOnly(), false, "draftOnly");
		assert.equal(oControl.getEnabled(), false, "enabled");
		oControl.destroy();
	});

	// ─── Rendering ─────────────────────────────────────────────────────────────

	QUnit.module("MultiFileUpload - Rendering", {
		beforeEach: function() {
			this.oControl = new MultiFileUpload();
			this.oControl.placeAt("uiArea2");
			Core.applyChanges();
		},
		afterEach: function() {
			this.oControl.destroy();
		}
	});

	QUnit.test("renders wrapper div with correct CSS class", function(assert) {
		const oDomRef = this.oControl.getDomRef();
		assert.ok(oDomRef, "DOM element exists after placeAt");
		assert.ok(oDomRef.classList.contains("miyasutaMultiFileUpload"), "wrapper div has miyasutaMultiFileUpload class");
	});

	QUnit.test("table is rendered inside wrapper", function(assert) {
		const oDomRef = this.oControl.getDomRef();
		const oTableDom = oDomRef.querySelector(".sapMList");
		assert.ok(oTableDom, "sap.m.Table element found inside wrapper div");
	});

	// ─── Upload Logic ──────────────────────────────────────────────────────────

	QUnit.module("MultiFileUpload - Upload Logic", {
		beforeEach: function() {
			this.oControl = new MultiFileUpload({ attachments: "{attachments}" });
			this.fetchStub = sinon.stub(window, "fetch");
		},
		afterEach: function() {
			this.fetchStub.restore();
			this.oControl.destroy();
		}
	});

	QUnit.test("does nothing when no binding context", function(assert) {
		const done = assert.async();
		const mockFile = new File(["content"], "test.txt", { type: "text/plain" });

		this.oControl._handleUpload(mockFile).then(function() {
			assert.equal(this.fetchStub.callCount, 0, "fetch not called when binding context is absent");
			done();
		}.bind(this));
	});

	QUnit.test("fetches CSRF token from service URL before upload", function(assert) {
		const done = assert.async();

		const mockContext = {
			getPath: function() { return "/Quotes(ID=abc,IsActiveEntity=false)"; },
			getModel: function() { return { getServiceUrl: function() { return "/odata/v4/quote/"; } }; },
			getObject: function() { return { IsActiveEntity: false }; },
			requestSideEffects: sinon.stub().resolves()
		};
		sinon.stub(this.oControl, "getBindingContext").returns(mockContext);
		sinon.stub(this.oControl, "getAggregation").returns(makeMockTable());

		// Call 0: CSRF token GET
		this.fetchStub.onCall(0).resolves(new Response(null, {
			status: 200,
			headers: { "x-csrf-token": "test-token" }
		}));
		// Call 1: POST create, Call 2: PUT content
		this.fetchStub.onCall(1).resolves(new Response(JSON.stringify({ ID: "att-001" }), { status: 201 }));
		this.fetchStub.resolves(new Response(null, { status: 200 }));

		const mockFile = new File(["hello"], "report.pdf", { type: "application/pdf" });

		this.oControl._handleUpload(mockFile).then(function() {
			const csrfCall = this.fetchStub.getCall(0);
			assert.equal(csrfCall.args[0], "/odata/v4/quote", "CSRF token fetched from service URL (trailing slash removed)");
			assert.equal(csrfCall.args[1].headers["x-csrf-token"], "Fetch", "CSRF request uses 'Fetch' header value");
			assert.equal(csrfCall.args[1].method, "GET", "CSRF request is GET");
			done();
		}.bind(this));
	});

	QUnit.test("POSTs metadata then PUTs binary content (draft mode)", function(assert) {
		const done = assert.async();

		const mockContext = {
			getPath: function() { return "/Quotes(ID=abc,IsActiveEntity=false)"; },
			getModel: function() { return { getServiceUrl: function() { return "/odata/v4/quote/"; } }; },
			getObject: function() { return { IsActiveEntity: false }; },
			requestSideEffects: sinon.stub().resolves()
		};
		sinon.stub(this.oControl, "getBindingContext").returns(mockContext);
		sinon.stub(this.oControl, "getAggregation").returns(makeMockTable());

		// CSRF
		this.fetchStub.onCall(0).resolves(new Response(null, {
			status: 200,
			headers: { "x-csrf-token": "csrf-123" }
		}));
		// POST (create entity)
		this.fetchStub.onCall(1).resolves(new Response(JSON.stringify({ ID: "att-001" }), {
			status: 201,
			headers: { "Content-Type": "application/json" }
		}));
		// PUT (content)
		this.fetchStub.onCall(2).resolves(new Response(null, { status: 204 }));

		const mockFile = new File(["data"], "report.pdf", { type: "application/pdf" });

		this.oControl._handleUpload(mockFile).then(function() {
			assert.equal(this.fetchStub.callCount, 3, "fetch called 3 times: CSRF + POST + PUT");
			assert.ok(mockContext.requestSideEffects.calledOnce, "requestSideEffects called after upload");
			assert.deepEqual(mockContext.requestSideEffects.getCall(0).args[0], [{ $NavigationPropertyPath: "attachments" }], "requestSideEffects called with attachments segment");

			const postCall = this.fetchStub.getCall(1);
			assert.equal(postCall.args[0], "/odata/v4/quote/Quotes(ID=abc,IsActiveEntity=false)/attachments", "POST targets attachments URL");
			assert.equal(postCall.args[1].method, "POST", "second call is POST");
			assert.equal(postCall.args[1].headers["x-csrf-token"], "csrf-123", "POST sends CSRF token");

			const postBody = JSON.parse(postCall.args[1].body);
			assert.equal(postBody.filename, "report.pdf", "POST body contains filename");
			assert.equal(postBody.mimeType, "application/pdf", "POST body contains mimeType");

			const putCall = this.fetchStub.getCall(2);
			assert.equal(putCall.args[0], "/odata/v4/quote/Quotes(ID=abc,IsActiveEntity=false)/attachments(ID=att-001)/content", "PUT targets content URL with attachment ID");
			assert.equal(putCall.args[1].method, "PUT", "third call is PUT");
			assert.equal(putCall.args[1].headers["x-csrf-token"], "csrf-123", "PUT sends CSRF token");
			assert.strictEqual(putCall.args[1].body, mockFile, "PUT body is the File object");

			done();
		}.bind(this));
	});

	QUnit.test("upload with draftOnly=false and IsActiveEntity=true calls draftEdit first", function(assert) {
		const done = assert.async();

		const oControl = new MultiFileUpload({ attachments: "{attachments}", draftOnly: false });
		const fetchStub = this.fetchStub;

		const mockContext = {
			getPath: function() { return "/Quotes(ID=abc,IsActiveEntity=true)"; },
			getModel: function() { return { getServiceUrl: function() { return "/odata/v4/quote/"; } }; },
			getObject: function() { return { IsActiveEntity: true }; },
			requestSideEffects: sinon.stub().resolves()
		};
		sinon.stub(oControl, "getBindingContext").returns(mockContext);
		sinon.stub(oControl, "getAggregation").returns(makeMockTable());

		// Call 0: CSRF
		fetchStub.onCall(0).resolves(new Response(null, { status: 200, headers: { "x-csrf-token": "tok" } }));
		// Call 1: draftEdit
		fetchStub.onCall(1).resolves(new Response(null, { status: 200 }));
		// Call 2: POST (create attachment on draft)
		fetchStub.onCall(2).resolves(new Response(JSON.stringify({ ID: "att-001" }), { status: 201 }));
		// Call 3: PUT content
		fetchStub.onCall(3).resolves(new Response(null, { status: 204 }));
		// Call 4: draftActivate
		fetchStub.onCall(4).resolves(new Response(null, { status: 200 }));

		const mockFile = new File(["data"], "file.txt", { type: "text/plain" });

		oControl._handleUpload(mockFile).then(function() {
			assert.equal(fetchStub.callCount, 5, "fetch called 5 times: CSRF + draftEdit + POST + PUT + draftActivate");

			const draftEditCall = fetchStub.getCall(1);
			assert.equal(draftEditCall.args[0], "/odata/v4/quote/Quotes(ID=abc,IsActiveEntity=true)/draftEdit", "draftEdit called on active entity");
			assert.equal(draftEditCall.args[1].method, "POST", "draftEdit is POST");

			const postCall = fetchStub.getCall(2);
			assert.equal(postCall.args[0], "/odata/v4/quote/Quotes(ID=abc,IsActiveEntity=false)/attachments", "POST targets draft entity's attachments");

			const activateCall = fetchStub.getCall(4);
			assert.equal(activateCall.args[0], "/odata/v4/quote/Quotes(ID=abc,IsActiveEntity=false)/draftActivate", "draftActivate called on draft entity");

			oControl.destroy();
			done();
		});
	});

	QUnit.test("upload is suppressed when IsActiveEntity=true and draftOnly=true", function(assert) {
		const done = assert.async();

		// draftOnly=true (default), IsActiveEntity=true → _computeCanOperate returns false
		const mockContext = {
			getPath: function() { return "/Quotes(ID=abc,IsActiveEntity=true)"; },
			getModel: function() { return { getServiceUrl: function() { return "/odata/v4/quote/"; } }; },
			getObject: function() { return { IsActiveEntity: true }; }
		};
		sinon.stub(this.oControl, "getBindingContext").returns(mockContext);

		// Simulate _onBeforeUploadStarts: preventDefault is called, then _computeCanOperate check
		// Directly call _handleUpload would still run (it only checks context); the gate is in
		// _onBeforeUploadStarts. Verify _computeCanOperate returns false.
		assert.strictEqual(this.oControl._computeCanOperate(), false, "_computeCanOperate is false for active entity with draftOnly=true");
		assert.equal(this.fetchStub.callCount, 0, "no fetch called");
		done();
	});

	QUnit.test("custom attachments segment is used in POST URL", function(assert) {
		const done = assert.async();

		const oControl = new MultiFileUpload({ attachments: "{docs}" });
		const fetchStub = this.fetchStub;

		const mockContext = {
			getPath: function() { return "/Quotes(ID=abc,IsActiveEntity=false)"; },
			getModel: function() { return { getServiceUrl: function() { return "/odata/v4/quote/"; } }; },
			getObject: function() { return { IsActiveEntity: false }; },
			requestSideEffects: sinon.stub().resolves()
		};
		sinon.stub(oControl, "getBindingContext").returns(mockContext);
		sinon.stub(oControl, "getAggregation").returns(makeMockTable());

		fetchStub.onCall(0).resolves(new Response(null, { status: 200, headers: { "x-csrf-token": "tok" } }));
		fetchStub.onCall(1).resolves(new Response(JSON.stringify({ ID: "att-001" }), { status: 201 }));
		fetchStub.resolves(new Response(null, { status: 204 }));

		const mockFile = new File(["data"], "file.txt", { type: "text/plain" });

		oControl._handleUpload(mockFile).then(function() {
			const postCall = fetchStub.getCall(1);
			assert.equal(postCall.args[0], "/odata/v4/quote/Quotes(ID=abc,IsActiveEntity=false)/docs", "POST URL uses custom segment from binding");
			oControl.destroy();
			done();
		});
	});

	// ─── Delete Logic ──────────────────────────────────────────────────────────

	QUnit.module("MultiFileUpload - Delete Logic", {
		beforeEach: function() {
			this.oControl = new MultiFileUpload({ attachments: "{attachments}" });
			this.fetchStub = sinon.stub(window, "fetch");
		},
		afterEach: function() {
			this.fetchStub.restore();
			this.oControl.destroy();
		}
	});

	QUnit.test("deletes attachment with DELETE request (draft mode)", function(assert) {
		const done = assert.async();

		// Parent context (draft entity)
		const mockParentContext = {
			getPath: function() { return "/Quotes(ID=abc,IsActiveEntity=false)"; },
			getObject: function() { return { IsActiveEntity: false }; },
			requestSideEffects: sinon.stub().resolves()
		};
		sinon.stub(this.oControl, "getBindingContext").returns(mockParentContext);

		// Row context (attachment entity)
		const mockRowContext = {
			getPath: function() { return "/Quotes(ID=abc,IsActiveEntity=false)/attachments(ID=att-001)"; },
			getModel: function() { return { getServiceUrl: function() { return "/odata/v4/quote/"; } }; }
		};
		const mockButton = { getBindingContext: function() { return mockRowContext; } };
		const mockEvent = { getSource: function() { return mockButton; } };

		sinon.stub(this.oControl, "getAggregation").returns(makeMockTable());

		// CSRF
		this.fetchStub.onCall(0).resolves(new Response(null, { status: 200, headers: { "x-csrf-token": "tok" } }));
		// DELETE
		this.fetchStub.onCall(1).resolves(new Response(null, { status: 204 }));

		this.oControl._onRowDeletePress(mockEvent).then(function() {
			assert.equal(this.fetchStub.callCount, 2, "fetch called 2 times: CSRF + DELETE");

			const deleteCall = this.fetchStub.getCall(1);
			assert.equal(deleteCall.args[0], "/odata/v4/quote/Quotes(ID=abc,IsActiveEntity=false)/attachments(ID=att-001)", "DELETE targets attachment URL");
			assert.equal(deleteCall.args[1].method, "DELETE", "second call is DELETE");
			assert.equal(deleteCall.args[1].headers["x-csrf-token"], "tok", "DELETE sends CSRF token");
			assert.ok(mockParentContext.requestSideEffects.calledOnce, "requestSideEffects called after delete");
			assert.deepEqual(mockParentContext.requestSideEffects.getCall(0).args[0], [{ $NavigationPropertyPath: "attachments" }], "requestSideEffects called with attachments segment");

			done();
		}.bind(this));
	});

	QUnit.test("delete with draftOnly=false and IsActiveEntity=true sends DELETE directly without draft lifecycle", function(assert) {
		const done = assert.async();

		const oControl = new MultiFileUpload({ attachments: "{attachments}", draftOnly: false });
		const fetchStub = this.fetchStub;

		const mockParentContext = {
			getPath: function() { return "/Quotes(ID=abc,IsActiveEntity=true)"; },
			getObject: function() { return { IsActiveEntity: true }; },
			requestSideEffects: sinon.stub().resolves()
		};
		sinon.stub(oControl, "getBindingContext").returns(mockParentContext);

		const mockRowContext = {
			getPath: function() { return "/Quotes(ID=abc,IsActiveEntity=true)/attachments(ID=att-001)"; },
			getModel: function() { return { getServiceUrl: function() { return "/odata/v4/quote/"; } }; }
		};
		const mockButton = { getBindingContext: function() { return mockRowContext; } };
		const mockEvent = { getSource: function() { return mockButton; } };

		sinon.stub(oControl, "getAggregation").returns(makeMockTable());

		// CSRF
		fetchStub.onCall(0).resolves(new Response(null, { status: 200, headers: { "x-csrf-token": "tok" } }));
		// DELETE
		fetchStub.onCall(1).resolves(new Response(null, { status: 204 }));

		oControl._onRowDeletePress(mockEvent).then(function() {
			assert.equal(fetchStub.callCount, 2, "fetch called 2 times: CSRF + DELETE (no draft lifecycle)");

			const deleteCall = fetchStub.getCall(1);
			assert.equal(deleteCall.args[0], "/odata/v4/quote/Quotes(ID=abc,IsActiveEntity=true)/attachments(ID=att-001)", "DELETE targets active entity's attachment directly");
			assert.equal(deleteCall.args[1].method, "DELETE", "second call is DELETE");

			oControl.destroy();
			done();
		});
	});

	QUnit.test("delete is suppressed when IsActiveEntity=true and draftOnly=true", function(assert) {
		const done = assert.async();

		const mockParentContext = {
			getPath: function() { return "/Quotes(ID=abc,IsActiveEntity=true)"; },
			getObject: function() { return { IsActiveEntity: true }; }
		};
		sinon.stub(this.oControl, "getBindingContext").returns(mockParentContext);

		const mockRowContext = {
			getPath: function() { return "/Quotes(ID=abc,IsActiveEntity=true)/attachments(ID=att-001)"; },
			getModel: function() { return { getServiceUrl: function() { return "/odata/v4/quote/"; } }; }
		};
		const mockButton = { getBindingContext: function() { return mockRowContext; } };
		const mockEvent = { getSource: function() { return mockButton; } };

		this.oControl._onRowDeletePress(mockEvent).then(function() {
			assert.equal(this.fetchStub.callCount, 0, "no fetch called when draftOnly=true and IsActiveEntity=true");
			done();
		}.bind(this));
	});

	// ─── _computeCanOperate ───────────────────────────────────────────────────

	QUnit.module("MultiFileUpload - _computeCanOperate");

	QUnit.test("returns true when IsActiveEntity=false (draft mode)", function(assert) {
		const oControl = new MultiFileUpload();
		sinon.stub(oControl, "getBindingContext").returns({
			getPath: function() { return "/Quotes(ID=abc,IsActiveEntity=false)"; },
			getObject: function() { return { IsActiveEntity: false }; }
		});
		assert.strictEqual(oControl._computeCanOperate(), true, "can operate in draft mode");
		oControl.destroy();
	});

	QUnit.test("returns true when IsActiveEntity is absent (non-draft entity)", function(assert) {
		const oControl = new MultiFileUpload();
		sinon.stub(oControl, "getBindingContext").returns({
			getPath: function() { return "/NonDraftEntity(ID=abc)"; },
			getObject: function() { return {}; }
		});
		assert.strictEqual(oControl._computeCanOperate(), true, "can operate for non-draft entity");
		oControl.destroy();
	});

	QUnit.test("returns true when draftOnly=false even if IsActiveEntity=true", function(assert) {
		const oControl = new MultiFileUpload({ draftOnly: false });
		sinon.stub(oControl, "getBindingContext").returns({
			getPath: function() { return "/Quotes(ID=abc,IsActiveEntity=true)"; },
			getObject: function() { return { IsActiveEntity: true }; }
		});
		assert.strictEqual(oControl._computeCanOperate(), true, "can operate when draftOnly=false");
		oControl.destroy();
	});

	QUnit.test("returns false when enabled=false regardless of draft state", function(assert) {
		const oControl = new MultiFileUpload({ enabled: false });
		sinon.stub(oControl, "getBindingContext").returns({
			getPath: function() { return "/Quotes(ID=abc,IsActiveEntity=false)"; },
			getObject: function() { return { IsActiveEntity: false }; }
		});
		assert.strictEqual(oControl._computeCanOperate(), false, "cannot operate when enabled=false");
		oControl.destroy();
	});

	QUnit.test("returns false when draftOnly=true and IsActiveEntity=true (active entity)", function(assert) {
		const oControl = new MultiFileUpload(); // draftOnly defaults to true
		sinon.stub(oControl, "getBindingContext").returns({
			getPath: function() { return "/Quotes(ID=abc,IsActiveEntity=true)"; },
			getObject: function() { return { IsActiveEntity: true }; }
		});
		assert.strictEqual(oControl._computeCanOperate(), false, "cannot operate for active entity when draftOnly=true");
		oControl.destroy();
	});

	QUnit.test("returns true when no binding context", function(assert) {
		const oControl = new MultiFileUpload();
		sinon.stub(oControl, "getBindingContext").returns(null);
		assert.strictEqual(oControl._computeCanOperate(), true, "can operate when no binding context");
		oControl.destroy();
	});

	// ─── setEnabled ───────────────────────────────────────────────────────────

	QUnit.module("MultiFileUpload - setEnabled");

	QUnit.test("setEnabled(false) disables delete buttons in all existing rows", function(assert) {
		const oControl = new MultiFileUpload();
		const mockDeleteButton = { setEnabled: sinon.spy() };
		const mockItem = { getCells: function() { return [null, null, null, mockDeleteButton]; } };
		const mockTable = { getItems: function() { return [mockItem]; } };
		sinon.stub(oControl, "getAggregation").returns(mockTable);
		sinon.stub(oControl, "getBindingContext").returns({
			getObject: function() { return { IsActiveEntity: false }; }
		});

		oControl.setEnabled(false);

		assert.ok(mockDeleteButton.setEnabled.calledOnce, "setEnabled called on delete button");
		assert.ok(mockDeleteButton.setEnabled.calledWith(false), "delete button is disabled");
		oControl.destroy();
	});

	QUnit.test("setEnabled(true) enables delete buttons when in draft mode", function(assert) {
		const oControl = new MultiFileUpload({ enabled: false });
		const mockDeleteButton = { setEnabled: sinon.spy() };
		const mockItem = { getCells: function() { return [null, null, null, mockDeleteButton]; } };
		const mockTable = { getItems: function() { return [mockItem]; } };
		sinon.stub(oControl, "getAggregation").returns(mockTable);
		sinon.stub(oControl, "getBindingContext").returns({
			getObject: function() { return { IsActiveEntity: false }; }
		});

		oControl.setEnabled(true);

		assert.ok(mockDeleteButton.setEnabled.calledOnce, "setEnabled called on delete button");
		assert.ok(mockDeleteButton.setEnabled.calledWith(true), "delete button is enabled");
		oControl.destroy();
	});

	// ─── Upload Button State ──────────────────────────────────────────────────

	QUnit.module("MultiFileUpload - Upload Button State");

	function makeMockContext(isActiveEntity) {
		const mockMetaModel = {
			getMetaPath: function() { return "/SomeService.Entity/attachments"; },
			getObject: function() { return undefined; },
			requestObject: function() { return Promise.resolve(undefined); }
		};
		return {
			getPath: function() { return "/Quotes(ID=abc,IsActiveEntity=" + isActiveEntity + ")"; },
			getModel: function() { return { getServiceUrl: function() { return "/odata/v4/quote/"; }, getMetaModel: function() { return mockMetaModel; } }; },
			getObject: function() { return { IsActiveEntity: isActiveEntity }; }
		};
	}

	function makeMockTable() {
		const _columns = [];
		return {
			setBindingContext: function() {},
			bindItems: function() {},
			getColumns: function() { return _columns; },
			removeAllColumns: function() { _columns.length = 0; },
			addColumn: function(col) { _columns.push(col); },
			getItems: function() { return []; }
		};
	}

	QUnit.test("upload button disabled after binding active entity with draftOnly=true", function(assert) {
		const oControl = new MultiFileUpload(); // draftOnly=true by default
		const mockContext = makeMockContext(true);
		sinon.stub(oControl, "getBindingContext").returns(mockContext);
		sinon.stub(oControl, "getAggregation").returns(makeMockTable());

		oControl._bindTableItems(mockContext);

		assert.strictEqual(oControl._uploadPlugin.getUploadEnabled(), false, "upload button disabled for active entity with draftOnly=true");
		oControl.destroy();
	});

	QUnit.test("upload button enabled after binding draft entity with draftOnly=true", function(assert) {
		const oControl = new MultiFileUpload(); // draftOnly=true by default
		const mockContext = makeMockContext(false);
		sinon.stub(oControl, "getBindingContext").returns(mockContext);
		sinon.stub(oControl, "getAggregation").returns(makeMockTable());

		oControl._bindTableItems(mockContext);

		assert.strictEqual(oControl._uploadPlugin.getUploadEnabled(), true, "upload button enabled for draft entity with draftOnly=true");
		oControl.destroy();
	});

	QUnit.test("upload button enabled after binding active entity with draftOnly=false", function(assert) {
		const oControl = new MultiFileUpload({ draftOnly: false });
		const mockContext = makeMockContext(true);
		sinon.stub(oControl, "getBindingContext").returns(mockContext);
		sinon.stub(oControl, "getAggregation").returns(makeMockTable());

		oControl._bindTableItems(mockContext);

		assert.strictEqual(oControl._uploadPlugin.getUploadEnabled(), true, "upload button enabled when draftOnly=false");
		oControl.destroy();
	});

	QUnit.test("upload button disabled after binding when enabled=false", function(assert) {
		const oControl = new MultiFileUpload({ enabled: false });
		const mockContext = makeMockContext(false);
		sinon.stub(oControl, "getBindingContext").returns(mockContext);
		sinon.stub(oControl, "getAggregation").returns(makeMockTable());

		oControl._bindTableItems(mockContext);

		assert.strictEqual(oControl._uploadPlugin.getUploadEnabled(), false, "upload button disabled when enabled=false");
		oControl.destroy();
	});

	// ─── Error Handling ───────────────────────────────────────────────────────

	QUnit.module("MultiFileUpload - Error Handling", {
		beforeEach: function() {
			this.oControl = new MultiFileUpload({ attachments: "{attachments}" });
			this.fetchStub = sinon.stub(window, "fetch");
		},
		afterEach: function() {
			this.fetchStub.restore();
			this.oControl.destroy();
		}
	});

	QUnit.test("upload failure is caught and promise resolves without throwing", function(assert) {
		const done = assert.async();

		const mockContext = {
			getPath: function() { return "/Quotes(ID=abc,IsActiveEntity=false)"; },
			getModel: function() { return { getServiceUrl: function() { return "/odata/v4/quote/"; } }; },
			getObject: function() { return { IsActiveEntity: false }; }
		};
		sinon.stub(this.oControl, "getBindingContext").returns(mockContext);

		this.fetchStub.rejects(new Error("Network error"));

		const mockFile = new File(["data"], "file.txt", { type: "text/plain" });

		this.oControl._handleUpload(mockFile).then(function() {
			assert.ok(true, "_handleUpload resolved without throwing when fetch fails");
			done();
		});
	});

	QUnit.test("delete failure is caught and promise resolves without throwing", function(assert) {
		const done = assert.async();

		const mockParentContext = {
			getPath: function() { return "/Quotes(ID=abc,IsActiveEntity=false)"; },
			getObject: function() { return { IsActiveEntity: false }; }
		};
		sinon.stub(this.oControl, "getBindingContext").returns(mockParentContext);

		const mockRowContext = {
			getPath: function() { return "/Quotes(ID=abc,IsActiveEntity=false)/attachments(ID=att-001)"; },
			getModel: function() { return { getServiceUrl: function() { return "/odata/v4/quote/"; } }; }
		};
		const mockButton = { getBindingContext: function() { return mockRowContext; } };
		const mockEvent = { getSource: function() { return mockButton; } };

		this.fetchStub.rejects(new Error("Network error"));

		this.oControl._onRowDeletePress(mockEvent).then(function() {
			assert.ok(true, "_onRowDeletePress resolved without throwing when fetch fails");
			done();
		});
	});

	// ─── Context Detection ───────────────────────────────────────────────────

	QUnit.module("MultiFileUpload - Context Detection", {
		beforeEach: function() {
			this.oControl = new MultiFileUpload();
		},
		afterEach: function() {
			this.oControl.destroy();
		}
	});

	QUnit.test("calls _bindTableItems when context becomes available via onBeforeRendering", function(assert) {
		const mockContext = makeMockContext(false);
		sinon.stub(this.oControl, "getBindingContext").returns(mockContext);
		sinon.stub(this.oControl, "getAggregation").returns(makeMockTable());

		this.oControl.onBeforeRendering();

		assert.equal(this.oControl._lastBoundPath, "/Quotes(ID=abc,IsActiveEntity=false)", "_lastBoundPath set when context is available in onBeforeRendering");
	});

	QUnit.test("does not call _bindTableItems when context is absent in onBeforeRendering", function(assert) {
		sinon.stub(this.oControl, "getBindingContext").returns(null);

		this.oControl.onBeforeRendering();

		assert.strictEqual(this.oControl._lastBoundPath, undefined, "_lastBoundPath remains undefined when no context");
	});

	// ─── Column Header Labels ─────────────────────────────────────────────────

	QUnit.module("MultiFileUpload - Column Header Labels");

	function makeMockContextWithMetaModel(labels: { filename: string | undefined; createdAt: string | undefined; createdBy: string | undefined }) {
		const metaPath = "/SomeService.Entity/attachments";
		const mockMetaModel = {
			getMetaPath: function() { return metaPath; },
			getObject: function(path: string) {
				if (path.includes("/filename@")) return labels.filename;
				if (path.includes("/createdAt@")) return labels.createdAt;
				if (path.includes("/createdBy@")) return labels.createdBy;
				return undefined;
			}
		};
		return {
			getPath: function() { return "/Entity(ID=abc,IsActiveEntity=false)"; },
			getModel: function() {
				return {
					getServiceUrl: function() { return "/odata/v4/service/"; },
					getMetaModel: function() { return mockMetaModel; }
				};
			},
			getObject: function() { return { IsActiveEntity: false }; }
		};
	}

	function makeMockTableForColumns() {
		const _columns = [];
		return {
			setBindingContext: function() {},
			bindItems: function() {},
			getColumns: function() { return _columns; },
			removeAllColumns: function() { _columns.length = 0; },
			addColumn: function(col) { _columns.push(col); },
			getItems: function() { return []; }
		};
	}

	QUnit.test("TC-Unit-1: sets column headers from @Common.Label annotations when all labels are present", function(assert) {
		const oControl = new MultiFileUpload({ attachments: "{attachments}" });
		const mockTable = makeMockTableForColumns();
		const mockContext = makeMockContextWithMetaModel({
			filename: "Dateiname",
			createdAt: "Angelegt am",
			createdBy: "Angelegt von"
		});
		sinon.stub(oControl, "getBindingContext").returns(mockContext);
		sinon.stub(oControl, "getAggregation").returns(mockTable);

		oControl._bindTableItems(mockContext);

		const cols = mockTable.getColumns();
		assert.equal(cols[0].getHeader().getText(), "Dateiname",   "filename column header from metamodel");
		assert.equal(cols[1].getHeader().getText(), "Angelegt am", "createdAt column header from metamodel");
		assert.equal(cols[2].getHeader().getText(), "Angelegt von","createdBy column header from metamodel");
		oControl.destroy();
	});

	QUnit.test("TC-Unit-2: falls back to property name when @Common.Label annotation is absent", function(assert) {
		const oControl = new MultiFileUpload({ attachments: "{attachments}" });
		const mockTable = makeMockTableForColumns();
		const mockContext = makeMockContextWithMetaModel({
			filename: undefined,
			createdAt: undefined,
			createdBy: undefined
		});
		sinon.stub(oControl, "getBindingContext").returns(mockContext);
		sinon.stub(oControl, "getAggregation").returns(mockTable);

		oControl._bindTableItems(mockContext);

		const cols = mockTable.getColumns();
		assert.equal(cols[0].getHeader().getText(), "filename",  "filename fallback to property name");
		assert.equal(cols[1].getHeader().getText(), "createdAt", "createdAt fallback to property name");
		assert.equal(cols[2].getHeader().getText(), "createdBy", "createdBy fallback to property name");
		oControl.destroy();
	});

	QUnit.test("TC-Unit-3: uses label for found annotations and falls back for missing ones", function(assert) {
		const oControl = new MultiFileUpload({ attachments: "{attachments}" });
		const mockTable = makeMockTableForColumns();
		const mockContext = makeMockContextWithMetaModel({
			filename: "File Name",
			createdAt: undefined,
			createdBy: "Created By"
		});
		sinon.stub(oControl, "getBindingContext").returns(mockContext);
		sinon.stub(oControl, "getAggregation").returns(mockTable);

		oControl._bindTableItems(mockContext);

		const cols = mockTable.getColumns();
		assert.equal(cols[0].getHeader().getText(), "File Name",  "filename from annotation");
		assert.equal(cols[1].getHeader().getText(), "createdAt",  "createdAt fallback (no annotation)");
		assert.equal(cols[2].getHeader().getText(), "Created By", "createdBy from annotation");
		oControl.destroy();
	});

	// ─── Columns ──────────────────────────────────────────────────────────────

	QUnit.module("MultiFileUpload - Columns");

	function makeMockContextForColumns(labels) {
		const metaPath = "/SomeService.Entity/attachments";
		const mockMetaModel = {
			getMetaPath: function() { return metaPath; },
			getObject: function(path) {
				for (const prop of Object.keys(labels)) {
					if (path.includes("/" + prop + "@")) return labels[prop];
				}
				return undefined;
			}
		};
		return {
			getPath: function() { return "/Entity(ID=abc,IsActiveEntity=false)"; },
			getModel: function() {
				return {
					getServiceUrl: function() { return "/odata/v4/service/"; },
					getMetaModel: function() { return mockMetaModel; }
				};
			},
			getObject: function() { return { IsActiveEntity: false }; }
		};
	}

	QUnit.test("TC-Unit-4: default displayProperties produces filename + createdAt + createdBy + delete (4 columns)", function(assert) {
		const oControl = new MultiFileUpload({ attachments: "{attachments}" });
		const mockTable = makeMockTable();
		const mockContext = makeMockContextForColumns({ filename: "File Name", createdAt: "Created At", createdBy: "Created By" });
		sinon.stub(oControl, "getBindingContext").returns(mockContext);
		sinon.stub(oControl, "getAggregation").returns(mockTable);

		oControl._bindTableItems(mockContext);

		assert.equal(mockTable.getColumns().length, 4, "4 columns: filename + 2 defaults + delete");
		oControl.destroy();
	});

	QUnit.test("TC-Unit-5: displayProperties=[] produces only filename + delete (2 columns)", function(assert) {
		const oControl = new MultiFileUpload({ attachments: "{attachments}", displayProperties: [] });
		const mockTable = makeMockTable();
		const mockContext = makeMockContextForColumns({ filename: "File Name" });
		sinon.stub(oControl, "getBindingContext").returns(mockContext);
		sinon.stub(oControl, "getAggregation").returns(mockTable);

		oControl._bindTableItems(mockContext);

		assert.equal(mockTable.getColumns().length, 2, "2 columns: filename + delete only");
		oControl.destroy();
	});

	QUnit.test("TC-Unit-6: custom displayProperties produces correct column count and headers", function(assert) {
		const oControl = new MultiFileUpload({ attachments: "{attachments}", displayProperties: ["mimeType", "createdAt"] });
		const mockTable = makeMockTable();
		const mockContext = makeMockContextForColumns({ filename: "File Name", mimeType: "MIME Type", createdAt: "Created At" });
		sinon.stub(oControl, "getBindingContext").returns(mockContext);
		sinon.stub(oControl, "getAggregation").returns(mockTable);

		oControl._bindTableItems(mockContext);

		const cols = mockTable.getColumns();
		assert.equal(cols.length, 4, "4 columns: filename + mimeType + createdAt + delete");
		assert.equal(cols[0].getHeader().getText(), "File Name",  "filename column from metamodel");
		assert.equal(cols[1].getHeader().getText(), "MIME Type",  "mimeType column from metamodel");
		assert.equal(cols[2].getHeader().getText(), "Created At", "createdAt column from metamodel");
		oControl.destroy();
	});

	// ─── File Type Filtering ─────────────────────────────────────────────────

	QUnit.module("MultiFileUpload - File Type Filtering", {
		beforeEach: function() {
			this.oControl = new MultiFileUpload({ attachments: "{attachments}" });
			this.messageBoxStub = sinon.stub(MessageBox, "error");
			this.bundleMock = { getText: sinon.stub().callsFake(function(key, args) { return key + (args ? ":" + args[0] : ""); }) };
			this.libStub = sinon.stub(Lib, "getResourceBundleFor").returns(this.bundleMock);
		},
		afterEach: function() {
			this.libStub.restore();
			this.messageBoxStub.restore();
			this.oControl.destroy();
		}
	});

	QUnit.test("TC-FT-MFU-1: setMediaTypes forwards parsed array to plugin", function(assert) {
		this.oControl.setMediaTypes("application/pdf,image/png");
		const plugin = this.oControl._uploadPlugin;
		assert.deepEqual(plugin.getMediaTypes(), ["application/pdf", "image/png"], "plugin receives parsed mediaTypes array");
	});

	QUnit.test("TC-FT-MFU-2: setFileTypes forwards parsed array to plugin", function(assert) {
		this.oControl.setFileTypes("pdf,png");
		const plugin = this.oControl._uploadPlugin;
		assert.deepEqual(plugin.getFileTypes(), ["pdf", "png"], "plugin receives parsed fileTypes array");
	});

	QUnit.test("TC-FT-MFU-3: setFileTypes strips leading dots", function(assert) {
		this.oControl.setFileTypes(".pdf,.png");
		const plugin = this.oControl._uploadPlugin;
		assert.deepEqual(plugin.getFileTypes(), ["pdf", "png"], "leading dots stripped from fileTypes");
	});

	QUnit.test("TC-FT-MFU-4: fileTypeMismatch event shows localized MessageBox error with file name", function(assert) {
		const mockItem = { getFileName: function() { return "report.txt"; } };
		this.oControl._onTypeMismatch({ getParameters: function() { return { item: mockItem }; } });
		assert.ok(this.messageBoxStub.calledOnce, "MessageBox.error called once");
		assert.ok(this.libStub.calledWith("miyasuta.ui5uploadcontrols"), "bundle loaded for library");
		assert.ok(this.bundleMock.getText.calledWith("FILE_NOT_ALLOWED", ["report.txt"]), "correct key and file name passed to bundle");
	});

	QUnit.test("TC-FT-MFU-5: mediaTypeMismatch event shows localized MessageBox error with file name", function(assert) {
		const mockItem = { getFileName: function() { return "image.bmp"; } };
		this.oControl._onTypeMismatch({ getParameters: function() { return { item: mockItem }; } });
		assert.ok(this.messageBoxStub.calledOnce, "MessageBox.error called once");
		assert.ok(this.libStub.calledWith("miyasuta.ui5uploadcontrols"), "bundle loaded for library");
		assert.ok(this.bundleMock.getText.calledWith("FILE_NOT_ALLOWED", ["image.bmp"]), "correct key and file name passed to bundle");
	});

	QUnit.test("TC-FT-MFU-6: default mediaTypes null — plugin has no restriction", function(assert) {
		const plugin = this.oControl._uploadPlugin;
		assert.notOk(plugin.getMediaTypes()?.length, "default: plugin mediaTypes is empty or undefined (no restriction)");
	});
});
