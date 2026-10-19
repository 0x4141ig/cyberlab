#!/bin/bash

CONFIG_DIR="$HOME/.config/shell_gpt"
CONFIG_FILE="$CONFIG_DIR/.sgptrc"
ACTIVATION_KEY=""
DEFAULT_MODEL="azure/gpt-4o"
USE_LITELLM="true"
API_BASE_URL="https://apiservice5lh2czy2mmcta.azure-api.net/ecc-sqmp-v1/"
AZURE_API_VERSION="2024-09-01-preview"

prompt_for_key() {
    printf "Enter your AI Activation Key: "
    read -r ACTIVATION_KEY
    if [[ -z "$ACTIVATION_KEY" ]]; then
        printf "Error: Activation Key cannot be empty.\n" >&2
        return 1
    fi
}

configure_sgpt() {
    mkdir -p "$CONFIG_DIR" || { printf "Error: Failed to create config directory.\n" >&2; return 1; }

    if [[ ! -f "$CONFIG_FILE" ]]; then
        touch "$CONFIG_FILE" || { printf "Error: Failed to create config file.\n" >&2; return 1; }
    fi

    printf "DEFAULT_MODEL=%s\n" "$DEFAULT_MODEL" > "$CONFIG_FILE"
    printf "USE_LITELLM=%s\n" "$USE_LITELLM" >> "$CONFIG_FILE"
    printf "OPENAI_API_KEY=%s\n" "$ACTIVATION_KEY" >> "$CONFIG_FILE"
    printf "API_BASE_URL=%s\n" "$API_BASE_URL" >> "$CONFIG_FILE"

    printf "ShellGPT configuration updated successfully.\n"
}

export_env_variables() {
    export AZURE_API_BASE="$API_BASE_URL"
    export AZURE_API_VERSION="$AZURE_API_VERSION"

    printf "Environment variables set:\n"
    printf "AZURE_API_BASE=%s\n" "$AZURE_API_BASE"
    printf "AZURE_API_VERSION=%s\n" "$AZURE_API_VERSION"
}

verify_env_variables() {
    printf "Verifying environment variables...\n"
    printf "AZURE_API_BASE: %s\n" "${AZURE_API_BASE:-"Not set"}"
    printf "AZURE_API_VERSION: %s\n" "${AZURE_API_VERSION:-"Not set"}"
}

execute_sgpt() {
    if ! command -v sgpt >/dev/null 2>&1; then
        printf "Error: sgpt command not found. Please install ShellGPT first.\n" >&2
        return 1
    fi

    printf "Executing sgpt command...\n"
    sgpt "Hi" || printf "sgpt command failed.\n" >&2
}

main() {
    if ! prompt_for_key; then
        printf "Failed to get AI Activation Key. Exiting.\n" >&2
        return 1
    fi

    if ! configure_sgpt; then
        printf "Configuration failed. Exiting.\n" >&2
        return 1
    fi

    export_env_variables
    verify_env_variables
    execute_sgpt
}

main