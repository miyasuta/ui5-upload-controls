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
         * Property name on the entity used to store the file name.
         */
        getFileNameProperty(): string;

        /**
         * Property name on the entity used to store the file name.
         */
        setFileNameProperty(fileNameProperty: string): this;

        // property: contentProperty

        /**
         * Property name of the LargeBinary field.
         */
        getContentProperty(): string;

        /**
         * Property name of the LargeBinary field.
         */
        setContentProperty(contentProperty: string): this;

        // property: modelName

        /**
         * Name of the OData model as registered in manifest.json.
        Omit for the default (unnamed) model.
         */
        getModelName(): string;

        /**
         * Name of the OData model as registered in manifest.json.
        Omit for the default (unnamed) model.
         */
        setModelName(modelName: string): this;

        // property: draftOnly

        /**
         * When true, upload is enabled only when the entity is in draft mode (IsActiveEntity = false).
        When false, upload is always enabled and draft lifecycle is managed automatically.
         */
        getDraftOnly(): boolean;

        /**
         * When true, upload is enabled only when the entity is in draft mode (IsActiveEntity = false).
        When false, upload is always enabled and draft lifecycle is managed automatically.
         */
        setDraftOnly(draftOnly: boolean): this;

        // property: width

        /**
         * Width of the control wrapper.
         */
        getWidth(): CSSSize;

        /**
         * Width of the control wrapper.
         */
        setWidth(width: CSSSize): this;

        // property: enabled

        /**
         * Controls whether upload and delete are enabled.
        When false, both FileUploader and delete button are disabled regardless of draft state.
         */
        getEnabled(): boolean;

        /**
         * Controls whether upload and delete are enabled.
        When false, both FileUploader and delete button are disabled regardless of draft state.
         */
        setEnabled(enabled: boolean): this;
    }
}
