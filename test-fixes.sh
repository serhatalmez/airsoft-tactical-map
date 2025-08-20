#!/bin/bash

echo "🚀 Testing Room Fixes"
echo "===================="

# Build the project to check for errors
echo "Building project..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    echo ""
    echo "🔧 Key fixes applied:"
    echo "- Enhanced room membership checking"
    echo "- Auto-add room owners as members if missing"
    echo "- Better error handling and logging"
    echo "- Fixed TypeScript types"
    echo ""
    echo "📋 To test:"
    echo "1. Deploy these changes to production"
    echo "2. Create a new room from the dashboard"
    echo "3. The room should now work properly"
    echo ""
    echo "🐛 If still having issues:"
    echo "- Check browser console for detailed logs"
    echo "- Use the /test page to debug API calls"
    echo "- Verify Supabase database has proper tables"
else
    echo "❌ Build failed! Check errors above."
fi
