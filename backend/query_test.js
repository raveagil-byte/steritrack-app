const db = require('./db');

async function queryData() {
    try {
        console.log("Querying...");
        const [insts] = await db.query("SELECT name, category FROM instruments WHERE name LIKE '%puit%'");
        console.log("Instruments:");
        insts.forEach(i => console.log(`  '${i.name}' [${i.category}]`));

        const [sets] = await db.query("SELECT name FROM instrument_sets WHERE name LIKE '%puit%'");
        console.log("Sets:");
        sets.forEach(s => console.log(`  '${s.name}'`));
    } catch (err) {
        console.error(err);
    }
}

queryData();
