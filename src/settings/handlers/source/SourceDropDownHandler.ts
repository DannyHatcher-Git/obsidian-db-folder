import { SourceDataTypes } from "helpers/Constants";
import { t } from "lang/helpers";
import { AbstractSettingsHandler, SettingHandlerResponse } from "settings/handlers/AbstractSettingHandler";
import { add_dropdown } from "settings/SettingsComponents";

export class SourceDropDownHandler extends AbstractSettingsHandler {
    settingTitle: string = 'Select the source of database data';
    handle(settingHandlerResponse: SettingHandlerResponse): SettingHandlerResponse {
        const { settingsManager, containerEl, view } = settingHandlerResponse;
        const sourceOptions: Record<string, string> = {};
        Object.entries(SourceDataTypes).forEach(([key, value]) => {
            sourceOptions[value] = t(value);
        });
        const source_dropdown_promise = async (value: string): Promise<void> => {
            // update settings
            view.diskConfig.updateConfig({ source_data: value });
            // Force refresh of settings
            settingsManager.reset(settingHandlerResponse);
        };
        // render dropdown inside container
        add_dropdown(
            containerEl,
            this.settingTitle,
            'Select from which source you want to get the data to be displayed in the table.',
            view.diskConfig.yaml.config.source_data,
            sourceOptions,
            source_dropdown_promise
        );
        return this.goNext(settingHandlerResponse);
    }
}