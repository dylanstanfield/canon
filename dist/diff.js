import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
export function diffSnapshots(prev, curr) {
    const added = [];
    const modified = [];
    const removed = [];
    const prevKeys = new Set(Object.keys(prev.requirements));
    const currKeys = new Set(Object.keys(curr.requirements));
    // Added files
    for (const key of currKeys) {
        if (!prevKeys.has(key)) {
            const file = curr.requirements[key];
            for (const [section, items] of Object.entries(file.sections)) {
                added.push({ file: key, section, items });
            }
        }
    }
    // Removed files
    for (const key of prevKeys) {
        if (!currKeys.has(key)) {
            const file = prev.requirements[key];
            for (const [section, items] of Object.entries(file.sections)) {
                removed.push({ file: key, section, items });
            }
        }
    }
    // Modified files (present in both)
    for (const key of currKeys) {
        if (!prevKeys.has(key))
            continue;
        const prevFile = prev.requirements[key];
        const currFile = curr.requirements[key];
        diffFile(key, prevFile, currFile, added, modified, removed);
    }
    if (added.length === 0 && modified.length === 0 && removed.length === 0) {
        return null;
    }
    return { added, modified, removed };
}
function diffFile(fileKey, prev, curr, added, modified, removed) {
    const prevSections = new Set(Object.keys(prev.sections));
    const currSections = new Set(Object.keys(curr.sections));
    // Added sections
    for (const section of currSections) {
        if (!prevSections.has(section)) {
            added.push({ file: fileKey, section, items: curr.sections[section] });
        }
    }
    // Removed sections
    for (const section of prevSections) {
        if (!currSections.has(section)) {
            removed.push({ file: fileKey, section, items: prev.sections[section] });
        }
    }
    // Modified sections (present in both)
    for (const section of currSections) {
        if (!prevSections.has(section))
            continue;
        const prevItems = prev.sections[section];
        const currItems = curr.sections[section];
        if (JSON.stringify(prevItems) !== JSON.stringify(currItems)) {
            modified.push({ file: fileKey, section, old: prevItems, new: currItems });
        }
    }
}
export function formatChangeFile(ticket, name, diff) {
    const lines = [`# ${ticket}: ${name}`, ''];
    // Added
    lines.push('<added>');
    if (diff.added.length === 0) {
        lines.push('(none)');
    }
    else {
        for (const entry of diff.added) {
            lines.push(`- **${entry.file}** § ${entry.section}`);
            for (const item of entry.items) {
                lines.push(`  - ${item}`);
            }
        }
    }
    lines.push('</added>', '');
    // Modified
    lines.push('<modified>');
    if (diff.modified.length === 0) {
        lines.push('(none)');
    }
    else {
        for (const entry of diff.modified) {
            lines.push(`- **${entry.file}** § ${entry.section}`);
            for (const item of entry.old) {
                lines.push(`  - ~~${item}~~`);
            }
            lines.push('    →');
            for (const item of entry.new) {
                lines.push(`  - ${item}`);
            }
        }
    }
    lines.push('</modified>', '');
    // Removed
    lines.push('<removed>');
    if (diff.removed.length === 0) {
        lines.push('(none)');
    }
    else {
        for (const entry of diff.removed) {
            lines.push(`- **${entry.file}** § ${entry.section}`);
            for (const item of entry.items) {
                lines.push(`  - ${item}`);
            }
        }
    }
    lines.push('</removed>', '');
    return lines.join('\n');
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const [prevPath, currPath, ticket, name] = process.argv.slice(2);
    if (!prevPath || !currPath || !ticket || !name) {
        console.error('Usage: diff <prev-snapshot> <curr-snapshot> <ticket> <name>');
        process.exit(1);
    }
    const prev = JSON.parse(readFileSync(prevPath, 'utf-8'));
    const curr = JSON.parse(readFileSync(currPath, 'utf-8'));
    const diff = diffSnapshots(prev, curr);
    if (!diff) {
        console.log('No changes detected.');
    }
    else {
        console.log(formatChangeFile(ticket, name, diff));
    }
}
