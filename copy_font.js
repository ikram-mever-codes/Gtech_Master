const fs = require('fs');
const path = require('path');

const source = 'C:\\Windows\\Fonts\\simsun.ttc';
const destination = path.join(process.cwd(), 'server', 'assets', 'chfont.ttf');

try {
    if (fs.existsSync(source)) {
        fs.copyFileSync(source, destination);
        console.log(`Successfully copied font from ${source} to ${destination}`);
    } else {
        console.error(`Source font not found at ${source}`);
        // Try fallback
        const fallback = 'C:\\Windows\\Fonts\\msyh.ttc';
        if (fs.existsSync(fallback)) {
            fs.copyFileSync(fallback, destination);
            console.log(`Successfully copied fallback font from ${fallback} to ${destination}`);
        } else {
             console.error(`Fallback font not found at ${fallback}`);
        }
    }
} catch (err) {
    console.error('Error copying font:', err);
}
