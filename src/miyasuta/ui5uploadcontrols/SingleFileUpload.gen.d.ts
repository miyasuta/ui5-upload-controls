import { CSSSize } from "sap/ui/core/library";
import { PropertyBindingInfo } from "sap/ui/base/ManagedObject";
import { $ControlSettings } from "sap/ui/core/Control";

declare module "./SingleFileUpload" {

    /**
     * Interface defining the settings object used in constructor calls
     */
    interface $SingleFileUploadSettings extends $ControlSettings {

        /**
         * Property name on the entity used to store the file name.
         */
        fileNameProperty?: string | PropertyBindingInfo;

        /**
         * Property name of the LargeBinary field.
         */
        contentProperty?: string | PropertyBindingInfo;

        /**
         * Name of the OData model as registered in manifest.json.
        Omit for the default (unnamed) model.
         */
        modelName?: string | PropertyBindingInfo;

        /**
         * When true, upload is enabled only when the entity is in draft mode (IsActiveEntity = false).
        When false, upload is always enabled and draft lifecycle is managed automatically.
         */
        draftOnly?: boolean | PropertyBindingInfo | `{${string}}`;

        /**
         * Width of the control wrapper.
         */
        width?: CSSSize | PropertyBindingInfo | `{${string}}`;

        /**
         * Controls whether upload and delete are enabled.
        When false, both FileUploader and delete button are disabled regardless of draft state.
         */
        enabled?: boolean | PropertyBindingInfo | `{${string}}`;
    }

    export default interface SingleFileUpload {

        // property: fileNameProperty

        /**
         * Gets current value of property "fileNameProperty".
         *
         * Property name on the entity used to store the file name.
         *
         * @returns Value of property "fileNameProperty"
         */
        getFileNameProperty(): string;

        /**
         * Sets a new value for property "fileNameProperty".
         *
         * Property name on the entity used to store the file name.
         *
         * When called with a value of "null" or "undefined", the default value of the property will be restored.
         *
         * @param fileNameProperty New value for property "fileNameProperty"
         * @returns Reference to "this" in order to allow method chaining
         */
        setFileNameProperty(fileNameProperty: string): this;

        // property: contentProperty

        /**
         * Gets current value of property "contentProperty".
         *
         * Property name of the LargeBinary field.
         *
         * Default value is: "content"
         * @returns Value of property "contentProperty"
         */
        getContentProperty(): string;

        /**
         * Sets a new value for property "contentProperty".
         *
         * Property name of the LargeBinary field.
         *
         * When called with a value of "null" or "undefined", the default value of the property will be restored.
         *
         * Default value is: "content"
         * @param [contentProperty="content"] New value for property "contentProperty"
         * @returns Reference to "this" in order to allow method chaining
         */
        setContentProperty(contentProperty: string): this;

        // property: modelName

        /**
         * Gets current value of property "modelName".
         *
         * Name of the OData model as registered in manifest.json.
        Omit for the default (unnamed) model.
         *
         * @returns Value of property "modelName"
         */
        getModelName(): string;

        /**
         * Sets a new value for property "modelName".
         *
         * Name of the OData model as registered in manifest.json.
        Omit for the default (unnamed) model.
         *
         * When called with a value of "null" or "undefined", the default value of the property will be restored.
         *
         * @param modelName New value for property "modelName"
         * @returns Reference to "this" in order to allow method chaining
         */
        setModelName(modelName: string): this;

        // property: draftOnly

        /**
         * Gets current value of property "draftOnly".
         *
         * When true, upload is enabled only when the entity is in draft mode (IsActiveEntity = false).
        When false, upload is always enabled and draft lifecycle is managed automatically.
         *
         * Default value is: true
         * @returns Value of property "draftOnly"
         */
        getDraftOnly(): boolean;

        /**
         * Sets a new value for property "draftOnly".
         *
         * When true, upload is enabled only when the entity is in draft mode (IsActiveEntity = false).
        When false, upload is always enabled and draft lifecycle is managed automatically.
         *
         * When called with a value of "null" or "undefined", the default value of the property will be restored.
         *
         * Default value is: true
         * @param [draftOnly=true] New value for property "draftOnly"
         * @returns Reference to "this" in order to allow method chaining
         */
        setDraftOnly(draftOnly: boolean): this;

        // property: width

        /**
         * Gets current value of property "width".
         *
         * Width of the control wrapper.
         *
         * Default value is: "auto"
         * @returns Value of property "width"
         */
        getWidth(): CSSSize;

        /**
         * Sets a new value for property "width".
         *
         * Width of the control wrapper.
         *
         * When called with a value of "null" or "undefined", the default value of the property will be restored.
         *
         * Default value is: "auto"
         * @param [width="auto"] New value for property "width"
         * @returns Reference to "this" in order to allow method chaining
         */
        setWidth(width: CSSSize): this;

        // property: enabled

        /**
         * Gets current value of property "enabled".
         *
         * Controls whether upload and delete are enabled.
        When false, both FileUploader and delete button are disabled regardless of draft state.
         *
         * Default value is: true
         * @returns Value of property "enabled"
         */
        getEnabled(): boolean;

        /**
         * Sets a new value for property "enabled".
         *
         * Controls whether upload and delete are enabled.
        When false, both FileUploader and delete button are disabled regardless of draft state.
         *
         * When called with a value of "null" or "undefined", the default value of the property will be restored.
         *
         * Default value is: true
         * @param [enabled=true] New value for property "enabled"
         * @returns Reference to "this" in order to allow method chaining
         */
        setEnabled(enabled: boolean): this;
    }
}
