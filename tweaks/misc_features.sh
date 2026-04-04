#!/system/bin/sh
# Misc runtime features backend

DATA_DIR="/data/adb/floppy_companion"
CONFIG_FILE="$DATA_DIR/config/misc_features.conf"

BLOCK_CPUSET_NODE="/sys/kernel/block_cpuset"
BLOCK_SCHED_SETAFFINITY_NODE="/sys/kernel/block_sched_setaffinity"

is_available() {
    if [ -f "$BLOCK_CPUSET_NODE" ] || [ -f "$BLOCK_SCHED_SETAFFINITY_NODE" ]; then
        echo "available=1"
    else
        echo "available=0"
    fi
}

get_capabilities() {
    [ -f "$BLOCK_CPUSET_NODE" ] && echo "block_cpuset=1" || echo "block_cpuset=0"
    [ -f "$BLOCK_SCHED_SETAFFINITY_NODE" ] && echo "block_sched_setaffinity=1" || echo "block_sched_setaffinity=0"
}

get_current() {
    local block_cpuset=""
    local block_sched_setaffinity=""

    if [ -f "$BLOCK_CPUSET_NODE" ]; then
        block_cpuset=$(cat "$BLOCK_CPUSET_NODE" 2>/dev/null || echo "")
    fi

    if [ -f "$BLOCK_SCHED_SETAFFINITY_NODE" ]; then
        block_sched_setaffinity=$(cat "$BLOCK_SCHED_SETAFFINITY_NODE" 2>/dev/null || echo "")
    fi

    echo "block_cpuset=$block_cpuset"
    echo "block_sched_setaffinity=$block_sched_setaffinity"
}

get_saved() {
    if [ -f "$CONFIG_FILE" ]; then
        cat "$CONFIG_FILE"
    else
        echo "block_cpuset="
        echo "block_sched_setaffinity="
    fi
}

save() {
    local key="$1"
    local value="$2"

    mkdir -p "$(dirname "$CONFIG_FILE")"

    if [ ! -f "$CONFIG_FILE" ]; then
        touch "$CONFIG_FILE"
    fi

    if grep -q "^${key}=" "$CONFIG_FILE" 2>/dev/null; then
        sed -i "s/^${key}=.*/${key}=${value}/" "$CONFIG_FILE"
    else
        echo "${key}=${value}" >> "$CONFIG_FILE"
    fi

    echo "saved"
}

apply() {
    local key="$1"
    local value="$2"

    case "$key" in
        block_cpuset)
            if [ -f "$BLOCK_CPUSET_NODE" ]; then
                echo "$value" > "$BLOCK_CPUSET_NODE" 2>/dev/null
                echo "applied"
            else
                echo "error: Node not available"
            fi
            ;;
        block_sched_setaffinity)
            if [ -f "$BLOCK_SCHED_SETAFFINITY_NODE" ]; then
                echo "$value" > "$BLOCK_SCHED_SETAFFINITY_NODE" 2>/dev/null
                echo "applied"
            else
                echo "error: Node not available"
            fi
            ;;
        *)
            echo "error: Unknown key $key"
            ;;
    esac
}

apply_saved() {
    if [ ! -f "$CONFIG_FILE" ]; then
        return 0
    fi

    local block_cpuset=$(grep '^block_cpuset=' "$CONFIG_FILE" | cut -d= -f2)
    local block_sched_setaffinity=$(grep '^block_sched_setaffinity=' "$CONFIG_FILE" | cut -d= -f2)

    if [ -n "$block_cpuset" ] && [ -f "$BLOCK_CPUSET_NODE" ]; then
        echo "$block_cpuset" > "$BLOCK_CPUSET_NODE" 2>/dev/null
    fi

    if [ -n "$block_sched_setaffinity" ] && [ -f "$BLOCK_SCHED_SETAFFINITY_NODE" ]; then
        echo "$block_sched_setaffinity" > "$BLOCK_SCHED_SETAFFINITY_NODE" 2>/dev/null
    fi

    echo "applied_saved"
}

case "$1" in
    is_available)
        is_available
        ;;
    get_capabilities)
        get_capabilities
        ;;
    get_current)
        get_current
        ;;
    get_saved)
        get_saved
        ;;
    save)
        save "$2" "$3"
        ;;
    apply)
        apply "$2" "$3"
        ;;
    apply_saved)
        apply_saved
        ;;
    *)
        echo "usage: $0 {is_available|get_capabilities|get_current|get_saved|save|apply|apply_saved}"
        exit 1
        ;;
esac
