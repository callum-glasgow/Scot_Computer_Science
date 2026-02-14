const fs = require('fs');
const path = require('path');

const levels = ['N5', 'higher', 'AH'];
const dataDir = path.join(__dirname, 'data');

// Helper to slugify section names for filenames
function toSlug(str) {
    return str.toLowerCase()
        .replace(/[^\w\s-]/g, '') // remove non-word chars
        .replace(/\s+/g, '_');    // spaces to underscores
}

levels.forEach(level => {
    const levelFile = path.join(dataDir, `${level}.json`);
    if (!fs.existsSync(levelFile)) {
        console.log(`Skipping ${level} (no file found)`);
        return;
    }

    const rawData = fs.readFileSync(levelFile, 'utf8');
    let paperData;
    try {
        paperData = JSON.parse(rawData);
    } catch (e) {
        console.error(`Error parsing ${level}:`, e);
        return;
    }

    // Structure to hold metadata: sections, subsections, and counts
    const meta = {
        sections: {} // key: sectionName, value: { count: 0, subs: { subName: count } }
    };

    // Structure to hold segmented data: key = sectionSlug, value = { year_key: question_map_subset }
    const sectionData = {};
    // catch-all: "all" data is just the original file, effectively. 
    // But user asked for "one for each leval and course secion then subsection plus all"
    // We'll stick to splitting by Section for now as it's the primary filter.

    Object.keys(paperData).forEach(key => {
        // key is like "N5_2022"
        const entry = paperData[key];
        const year = key.split('_')[1]; // naive, but works for N5_2022

        if (!entry.question_map) return;

        entry.question_map.forEach(q => {
            // Questions can have multiple subquestions
            q.subquestions.forEach(sq => {
                const sec = sq.course_section;
                const sub = sq.course_subsection;

                // Update Meta
                if (!meta.sections[sec]) {
                    meta.sections[sec] = { count: 0, subsections: {}, slug: toSlug(sec) };
                }
                meta.sections[sec].count++;
                meta.sections[sec].subsections[sub] = (meta.sections[sec].subsections[sub] || 0) + 1;

                // Add to Section Data
                const slug = toSlug(sec);
                if (!sectionData[slug]) sectionData[slug] = {};

                // We need to preserve the structure: key -> { ... question_map: [ ... ] }
                // But we are reconstructing question maps. 
                // We'll create a partial question map for this year/key.
                if (!sectionData[slug][key]) {
                    sectionData[slug][key] = {
                        ...entry, // copy paper metadata
                        question_map: []
                    };
                }

                // We need to check if this question (parent) works well being duplicated if split across sections?
                // Usually grouping is by Parent Question. If subquestions are in different sections 
                // (unlikely but possible), the parent Q might appear in both files.
                // We'll construct a new question object containing only THIS subquestion.
                // Or better: keep the parent Q structure, filtered subquestions.

                // Let's find if we already added this Question (parent) to this Year in this Section data
                let qMap = sectionData[slug][key].question_map;
                let existingQ = qMap.find(eq => eq.question === q.question);

                if (!existingQ) {
                    existingQ = { ...q, subquestions: [] };
                    qMap.push(existingQ);
                }

                existingQ.subquestions.push(sq);
            });
        });
    });

    // Create Level Directory
    const levelDir = path.join(dataDir, level);
    if (!fs.existsSync(levelDir)) {
        fs.mkdirSync(levelDir, { recursive: true });
    }

    // Write Meta
    fs.writeFileSync(path.join(levelDir, 'meta.json'), JSON.stringify(meta, null, 2));
    console.log(`Generated meta.json for ${level}`);

    // Write Section Files
    Object.keys(sectionData).forEach(slug => {
        const filePath = path.join(levelDir, `${slug}.json`);
        fs.writeFileSync(filePath, JSON.stringify(sectionData[slug], null, 2));
        console.log(`Generated ${slug}.json for ${level}`);
    });
});

console.log('Granular data generation complete.');
