import { CSSSize } from "sap/ui/core/library";
import { PropertyBindingInfo } from "sap/ui/base/ManagedObject";
import { $ControlSettings } from "sap/ui/core/Control";

declare module "./SingleFileUpload" {

    /**
     * Interface defining the settings object used in constructor calls
     */
    interface $SingleFileUploadSettings extends $ControlSettings {

        /**
         * Bound to the entity property that stores the file name (e.g. fileName="{model>fileName}").
        The binding path is used as the OData property name in PATCH requests;
        the model name is used to resolve the binding context.
        Omit the model prefix for the default (unnamed) model: fileName="{fileName}".
         */
        fileName?: string | PropertyBindingInfo;

        /**
         * Property name of the LargeBinary field.
         */
        contentProperty?: string | PropertyBindingInfo;

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

        // property: fileName

        /**
         * Bound to the entity property that stores the file name (e.g. fileName="{model>fileName}").
        The binding path is used as the OData property name in PATCH requests;
        the model name is used to resolve the binding context.
        Omit the model prefix for the default (unnamed) model: fileName="{fileName}".
         */
        getFileName(): string;

        /**
         * Bound to the entity property that stores the file name (e.g. fileName="{model>fileName}").
        The binding path is used as the OData property name in PATCH requests;
        the model name is used to resolve the binding context.
        Omit the model prefix for the default (unnamed) model: fileName="{fileName}".
         */
        setFileName(fileName: string): this;

        // property: contentProperty

        /**
         * Property name of the LargeBinary field.
         */
        getContentProperty(): string;

        /**
         * Property name of the LargeBinary field.
         */
        setContentProperty(contentProperty: string): this;

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
