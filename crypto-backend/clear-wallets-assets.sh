#!/bin/bash

# =============================================================================
# Clear Wallets & Assets Script
# 僅清空錢包和資產（保留 API 密鑰、自定義幣種和價格歷史）
# =============================================================================

set -e  # Exit on error

DB_FILE="database.json"
BACKUP_DIR="backups"

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║     清空錢包資產腳本 - Clear Wallets & Assets Script         ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Check if database file exists
if [ ! -f "$DB_FILE" ]; then
    echo "❌ 數據庫文件不存在: $DB_FILE"
    exit 1
fi

# Check if jq is installed (required for this script)
if ! command -v jq &> /dev/null; then
    echo "❌ 此腳本需要 jq 工具"
    echo "   安裝命令:"
    echo "   - Ubuntu/Debian: sudo apt install jq"
    echo "   - Termux: pkg install jq"
    echo "   - macOS: brew install jq"
    exit 1
fi

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Generate backup filename with timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/database_partial_backup_${TIMESTAMP}.json"

echo "📦 當前數據庫內容:"
WALLETS=$(jq '.wallets | length' "$DB_FILE")
ASSETS=$(jq '.assets | length' "$DB_FILE")
API_KEYS=$(jq '.api_keys | length' "$DB_FILE")
CUSTOM_COINS=$(jq '.custom_coins | length' "$DB_FILE")
HISTORY=$(jq '.portfolio_history | length' "$DB_FILE")
PRICES=$(jq '.price_history | length' "$DB_FILE")

echo "   - 錢包數量: $WALLETS"
echo "   - 資產數量: $ASSETS"
echo "   - API 密鑰: $API_KEYS (保留)"
echo "   - 自定義幣種: $CUSTOM_COINS (保留)"
echo "   - 投資組合歷史: $HISTORY"
echo "   - 價格歷史: $PRICES (保留)"
echo ""

# Ask for confirmation
echo "⚠️  警告: 此操作將刪除以下數據："
echo "   ✓ 錢包 (wallets)"
echo "   ✓ 資產 (assets)"
echo "   ✓ 投資組合歷史 (portfolio_history)"
echo ""
echo "保留以下數據："
echo "   ✓ API 密鑰 (api_keys)"
echo "   ✓ 自定義幣種 (custom_coins)"
echo "   ✓ 價格歷史 (price_history)"
echo ""
read -p "是否繼續? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ] && [ "$CONFIRM" != "YES" ] && [ "$CONFIRM" != "y" ]; then
    echo "❌ 操作已取消"
    exit 0
fi

# Create backup
echo ""
echo "💾 創建備份: $BACKUP_FILE"
cp "$DB_FILE" "$BACKUP_FILE"
echo "✅ 備份已創建"

# Clear wallets, assets, and portfolio history while preserving other data
echo ""
echo "🗑️  清空錢包和資產..."

jq '.wallets = [] | .assets = [] | .portfolio_history = []' "$DB_FILE" > "${DB_FILE}.tmp"
mv "${DB_FILE}.tmp" "$DB_FILE"

echo "✅ 數據已清空"
echo ""
echo "📋 結果:"
REMAINING_API_KEYS=$(jq '.api_keys | length' "$DB_FILE")
REMAINING_CUSTOM_COINS=$(jq '.custom_coins | length' "$DB_FILE")
REMAINING_PRICES=$(jq '.price_history | length' "$DB_FILE")

echo "   - 已刪除: $WALLETS 個錢包, $ASSETS 個資產, $HISTORY 條歷史記錄"
echo "   - 已保留: $REMAINING_API_KEYS 個 API 密鑰"
echo "   - 已保留: $REMAINING_CUSTOM_COINS 個自定義幣種"
echo "   - 已保留: $REMAINING_PRICES 條價格歷史"
echo "   - 備份位置: $BACKUP_FILE"
echo ""
echo "💡 提示: 重啟服務器以重新加載數據庫"
echo "   命令: pkill -f node && nohup node server.js > server.log 2>&1 &"
echo ""
echo "✅ 完成！"
