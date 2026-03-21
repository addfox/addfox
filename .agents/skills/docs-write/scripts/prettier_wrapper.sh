#!/usr/bin/env bash
#
# Prettier Wrapper - Formats Markdown files consistently.
#
# A wrapper around Prettier that auto-detects installation,
# applies consistent markdown settings, and provides helpful
# error messages.
#
# Usage:
#     prettier_wrapper.sh [--check|--write] [--config FILE] FILE_OR_DIR
#
# Examples:
#     prettier_wrapper.sh README.md
#     prettier_wrapper.sh --check docs/
#     prettier_wrapper.sh --write --config .prettierrc docs/
#
set -euo pipefail

# Default settings
MODE="write"
CONFIG_FILE=""
TARGET=""

# Colors for output (if terminal supports it)
if [[ -t 1 ]]; then
    RED='\033[0;31m'
    GREEN='\033[0;32m'
    YELLOW='\033[0;33m'
    NC='\033[0m' # No Color
else
    RED=''
    GREEN=''
    YELLOW=''
    NC=''
fi

# Print usage information
usage() {
    cat << EOF
Usage: $(basename "$0") [OPTIONS] FILE_OR_DIR

Format Markdown files using Prettier.

Options:
    --check         Check if files are formatted (don't modify)
    --write         Format files in place (default)
    --config FILE   Use custom Prettier config file
    -h, --help      Show this help message

Examples:
    $(basename "$0") README.md
    $(basename "$0") --check docs/
    $(basename "$0") --write --config .prettierrc docs/

Default Markdown settings (when no config provided):
    - Print width: 80
    - Prose wrap: always
    - Tab width: 2
EOF
}

# Log info message
log_info() {
    echo -e "${GREEN}INFO:${NC} $*" >&2
}

# Log warning message
log_warning() {
    echo -e "${YELLOW}WARN:${NC} $*" >&2
}

# Log error message
log_error() {
    echo -e "${RED}ERROR:${NC} $*" >&2
}

# Check if Prettier is installed
check_prettier_installed() {
    # Check for local prettier first
    if [[ -f "node_modules/.bin/prettier" ]]; then
        echo "node_modules/.bin/prettier"
        return 0
    fi

    # Check for global prettier
    if command -v prettier &> /dev/null; then
        echo "prettier"
        return 0
    fi

    # Check if npx is available
    if command -v npx &> /dev/null; then
        echo "npx prettier"
        return 0
    fi

    return 1
}

# Get default config as JSON
get_default_config() {
    cat << 'EOF'
{
  "printWidth": 80,
  "proseWrap": "always",
  "tabWidth": 2,
  "useTabs": false,
  "singleQuote": false,
  "trailingComma": "none"
}
EOF
}

# Create temporary config file if no config provided
apply_default_config() {
    local temp_config
    temp_config=$(mktemp --suffix=.json)
    get_default_config > "$temp_config"
    echo "$temp_config"
}

# Format a single file
format_file() {
    local file="$1"
    local prettier_cmd="$2"
    local config="$3"
    local mode="$4"

    local config_args=""
    if [[ -n "$config" ]]; then
        config_args="--config $config"
    fi

    local mode_flag=""
    if [[ "$mode" == "check" ]]; then
        mode_flag="--check"
    else
        mode_flag="--write"
    fi

    # Run prettier
    # shellcheck disable=SC2086
    if $prettier_cmd $config_args $mode_flag "$file" 2>&1; then
        return 0
    else
        return 1
    fi
}

# Format a directory
format_directory() {
    local dir="$1"
    local prettier_cmd="$2"
    local config="$3"
    local mode="$4"

    local config_args=""
    if [[ -n "$config" ]]; then
        config_args="--config $config"
    fi

    local mode_flag=""
    if [[ "$mode" == "check" ]]; then
        mode_flag="--check"
    else
        mode_flag="--write"
    fi

    # Find and format all markdown files
    # shellcheck disable=SC2086
    if $prettier_cmd $config_args $mode_flag "${dir}/**/*.md" 2>&1; then
        return 0
    else
        return 1
    fi
}

# Check only mode - report what would change
check_only() {
    local target="$1"
    local prettier_cmd="$2"
    local config="$3"

    if [[ -f "$target" ]]; then
        if format_file "$target" "$prettier_cmd" "$config" "check"; then
            log_info "File is properly formatted: $target"
            return 0
        else
            log_warning "File needs formatting: $target"
            return 1
        fi
    elif [[ -d "$target" ]]; then
        if format_directory "$target" "$prettier_cmd" "$config" "check"; then
            log_info "All files in $target are properly formatted"
            return 0
        else
            log_warning "Some files in $target need formatting"
            return 1
        fi
    else
        log_error "Target not found: $target"
        return 1
    fi
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --check)
                MODE="check"
                shift
                ;;
            --write)
                MODE="write"
                shift
                ;;
            --config)
                if [[ -z "${2:-}" ]]; then
                    log_error "--config requires a file argument"
                    exit 1
                fi
                CONFIG_FILE="$2"
                shift 2
                ;;
            -h|--help)
                usage
                exit 0
                ;;
            -*)
                log_error "Unknown option: $1"
                usage
                exit 1
                ;;
            *)
                if [[ -z "$TARGET" ]]; then
                    TARGET="$1"
                else
                    log_error "Multiple targets not supported"
                    exit 1
                fi
                shift
                ;;
        esac
    done

    if [[ -z "$TARGET" ]]; then
        log_error "No target file or directory specified"
        usage
        exit 1
    fi
}

# Main function
main() {
    parse_args "$@"

    # Check if Prettier is available
    local prettier_cmd
    if ! prettier_cmd=$(check_prettier_installed); then
        log_error "Prettier is not installed"
        log_info "Install Prettier with one of:"
        log_info "  npm install --save-dev prettier"
        log_info "  npm install -g prettier"
        log_info "  Or ensure npx is available"
        exit 1
    fi

    log_info "Using Prettier: $prettier_cmd"

    # Validate target exists
    if [[ ! -e "$TARGET" ]]; then
        log_error "Target not found: $TARGET"
        exit 1
    fi

    # Handle config
    local config="$CONFIG_FILE"
    local temp_config=""

    if [[ -z "$config" ]]; then
        # Look for existing config files
        for cfg in .prettierrc .prettierrc.json .prettierrc.yaml .prettierrc.yml prettier.config.js; do
            if [[ -f "$cfg" ]]; then
                config="$cfg"
                log_info "Using existing config: $config"
                break
            fi
        done

        # No config found, use defaults
        if [[ -z "$config" ]]; then
            temp_config=$(apply_default_config)
            config="$temp_config"
            log_info "Using default Markdown config"
        fi
    else
        if [[ ! -f "$config" ]]; then
            log_error "Config file not found: $config"
            exit 1
        fi
        log_info "Using config: $config"
    fi

    # Run formatting
    local exit_code=0

    if [[ "$MODE" == "check" ]]; then
        if ! check_only "$TARGET" "$prettier_cmd" "$config"; then
            exit_code=1
        fi
    else
        if [[ -f "$TARGET" ]]; then
            if format_file "$TARGET" "$prettier_cmd" "$config" "write"; then
                log_info "Formatted: $TARGET"
            else
                log_error "Failed to format: $TARGET"
                exit_code=1
            fi
        elif [[ -d "$TARGET" ]]; then
            if format_directory "$TARGET" "$prettier_cmd" "$config" "write"; then
                log_info "Formatted all Markdown files in: $TARGET"
            else
                log_warning "Some files could not be formatted"
                exit_code=1
            fi
        fi
    fi

    # Cleanup temp config
    if [[ -n "$temp_config" && -f "$temp_config" ]]; then
        rm -f "$temp_config"
    fi

    exit $exit_code
}

# Run main
main "$@"
