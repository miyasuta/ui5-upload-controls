import { PropertyBindingInfo } from "sap/ui/base/ManagedObject";
import { $ControlSettings } from "sap/ui/core/Control";

declare module "./MultiFileUpload" {

    /**
     * Interface defining the settings object used in constructor calls
     */
    interface $MultiFileUploadSettings extends $ControlSettings {

        /**
         * Bound to the navigation property segment for the attachments composition
        (e.g. attachments="{model>files}").
        The binding path is used as the OData navigation segment in POST/DELETE requests
        and in requestSideEffects; the model name is used to resolve the binding context.
        Omit the model prefix for the default (unnamed) model: attachments="{files}".
         */
        attachments?: object | PropertyBindingInfo | `{${string}}`;

        /**
         * When true, upload/delete is enabled only when the entity is in draft mode (IsActiveEntity = false).
        When false, draft lifecycle is managed automatically.
         */
        draftOnly?: boolean | PropertyBindingInfo | `{${string}}`;

        /**
         * Controls whether upload and delete are enabled.
        When false, both are disabled regardless of draft state.
         */
        enabled?: boolean | PropertyBindingInfo | `{${string}}`;

        /**
         * Ordered list of attachment property names to display as columns between
        the fixed File Name column (first) and the Delete button column (last).
        Available names: any property of the Attachments entity, e.g. "createdAt", "createdBy", "mimeType".
         */
        displayProperties?: string[] | PropertyBindingInfo | `{${string}}`;
    }

    export default interface MultiFileUpload {

        // property: attachments

        /**
         * Bound to the navigation property segment for the attachments composition
        (e.g. attachments="{model>files}").
        The binding path is used as the OData navigation segment in POST/DELETE requests
        and in requestSideEffects; the model name is used to resolve the binding context.
        Omit the model prefix for the default (unnamed) model: attachments="{files}".
         */
        getAttachments(): object;

        /**
         * Bound to the navigation property segment for the attachments composition
        (e.g. attachments="{model>files}").
        The binding path is used as the OData navigation segment in POST/DELETE requests
        and in requestSideEffects; the model name is used to resolve the binding context.
        Omit the model prefix for the default (unnamed) model: attachments="{files}".
         */
        setAttachments(attachments: object): this;

        // property: draftOnly

        /**
         * When true, upload/delete is enabled only when the entity is in draft mode (IsActiveEntity = false).
        When false, draft lifecycle is managed automatically.
         */
        getDraftOnly(): boolean;

        /**
         * When true, upload/delete is enabled only when the entity is in draft mode (IsActiveEntity = false).
        When false, draft lifecycle is managed automatically.
         */
        setDraftOnly(draftOnly: boolean): this;

        // property: enabled

        /**
         * Controls whether upload and delete are enabled.
        When false, both are disabled regardless of draft state.
         */
        getEnabled(): boolean;

        /**
         * Controls whether upload and delete are enabled.
        When false, both are disabled regardless of draft state.
         */
        setEnabled(enabled: boolean): this;

        // property: displayProperties

        /**
         * Ordered list of attachment property names to display as columns between
        the fixed File Name column (first) and the Delete button column (last).
        Available names: any property of the Attachments entity, e.g. "createdAt", "createdBy", "mimeType".
         */
        getDisplayProperties(): string[];

        /**
         * Ordered list of attachment property names to display as columns between
        the fixed File Name column (first) and the Delete button column (last).
        Available names: any property of the Attachments entity, e.g. "createdAt", "createdBy", "mimeType".
         */
        setDisplayProperties(displayProperties: string[]): this;
    }
}
