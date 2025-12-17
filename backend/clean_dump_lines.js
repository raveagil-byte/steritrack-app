const fs = require('fs');
const path = require('path');

const INPUT_FILE = path.join(__dirname, 'ready_for_cloud_pk_v2.sql');
const OUTPUT_FILE = path.join(__dirname, 'final_clean_cloud.sql');

try {
    console.log("🧹 Cleaning SQL Dump for Cloud Compatibility (Error 1227 Fix)...");

    let sql = fs.readFileSync(INPUT_FILE, 'utf8');

    // 1. Remove DEFINER clause (e.g., DEFINER=`root`@`localhost`)
    // Regex matches DEFINER = `user`@`host`
    sql = sql.replace(/DEFINER=`[^`]+`@`[^`]+`/g, '');
    sql = sql.replace(/DEFINER=[^\s]+/g, '');

    // 2. Remove GTID_PURGED and other restricted session variables
    // Matches "SET @@SESSION.SQL_LOG_BIN= 0;" and similar
    sql = sql.replace(/SET @@SESSION\.SQL_LOG_BIN\s*=\s*0;/g, '');
    sql = sql.replace(/SET @@GLOBAL\.GTID_PURGED\s*=\s*[^;]+;/g, '');
    sql = sql.replace(/SET @@SESSION\.GTID_NEXT\s*=\s*[^;]+;/g, '');

    // 3. Remove "SQL SECURITY DEFINER" which often accompanies views
    sql = sql.replace(/SQL SECURITY DEFINER/g, 'SQL SECURITY INVOKER');

    // 4. Remove Tablespace definitions usually found in CREATE TABLE
    // "TABLESPACE `xxx`"
    sql = sql.replace(/TABLESPACE `[^`]+`/g, '');

    fs.writeFileSync(OUTPUT_FILE, sql, 'utf8');

    console.log(`✅ Cleaned SQL saved to: ${OUTPUT_FILE}`);
    console.log("👉 Please import THIS file to your Cloud Database.");

} catch (err) {
    console.error("Error processing file:", err.message);
}
