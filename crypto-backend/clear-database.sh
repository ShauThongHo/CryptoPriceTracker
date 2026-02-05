#!/bin/bash

# =============================================================================
# Clear Database Script
# 清空整個數據庫（創建備份）
# =============================================================================

set -e  # Exit on error

DB_FILE="database.json"
BACKUP_DIR="backups"

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║          清空數據庫腳本 - Clear Database Script               ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Check if database file exists
if [ ! -f "$DB_FILE" ]; then
    echo "❌ 數據庫文件不存在: $DB_FILE"
    exit 1
fi

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Generate backup filename with timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/database_backup_${TIMESTAMP}.json"

echo "📦 當前數據庫內容:"
if command -v jq &> /dev/null; then
    # If jq is installed, show pretty stats
    WALLETS=$(jq '.wallets | length' "$DB_FILE")
    ASSETS=$(jq '.assets | length' "$DB_FILE")
    API_KEYS=$(jq '.api_keys | length' "$DB_FILE")
    HISTORY=$(jq '.portfolio_history | length' "$DB_FILE")
    echo "   - 錢包數量: $WALLETS"
    echo "   - 資產數量: $ASSETS"
    echo "   - API 密鑰: $API_KEYS"
    echo "   - 歷史記錄: $HISTORY"
else
    # Fallback: just show file size
    FILE_SIZE=$(du -h "$DB_FILE" | cut -f1)
    echo "   - 文件大小: $FILE_SIZE"
fi
echo ""

# Ask for confirmation
echo "⚠️  警告: 此操作將刪除所有數據！"
echo "   - 錢包 (wallets)"
echo "   - 資產 (assets)"
echo "   - API 密鑰 (api_keys)"
echo "   - 投資組合歷史 (portfolio_history)"
echo "   - 價格歷史 (price_history)"
echo "   - 自定義幣種 (custom_coins)"
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

# Clear database
echo ""
echo "🗑️  清空數據庫..."
cat > "$DB_FILE" << 'EOF'
{
  "wallets": [],
  "assets": [],
  "api_keys": [],
  "custom_coins": [],
  "price_history": [],
  "portfolio_history": []
}
EOF

echo "✅ 數據庫已清空"
echo ""
echo "📋 結果:"
echo "   - 新數據庫: 所有數據已清空"
echo "   - 備份位置: $BACKUP_FILE"
echo ""
echo "💡 提示: 重啟服務器以重新加載數據庫"
echo "   命令: pkill -f node && nohup node server.js > server.log 2>&1 &"
echo ""
echo "✅ 完成！"
