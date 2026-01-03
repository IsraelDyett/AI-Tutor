import fs from 'fs';
import path from 'path';

export interface SubjectContextFile {
    name: string;
    mimeType: string;
    data: string; // base64
}

export async function getSubjectContext(subject: string): Promise<SubjectContextFile[]> {
    const contextDir = path.join(process.cwd(), 'lib', 'ai', 'context', subject.toLowerCase());

    if (!fs.existsSync(contextDir)) {
        console.log(`No context directory found for subject: ${subject}`);
        return [];
    }

    try {
        const files = fs.readdirSync(contextDir);
        const contextFiles: SubjectContextFile[] = [];

        for (const fileName of files) {
            const filePath = path.join(contextDir, fileName);
            const stats = fs.statSync(filePath);

            if (stats.isFile()) {
                const buffer = fs.readFileSync(filePath);
                const base64Data = buffer.toString('base64');
                const ext = path.extname(fileName).toLowerCase();

                let mimeType = 'application/octet-stream';
                if (ext === '.pdf') mimeType = 'application/pdf';
                else if (ext === '.docx') mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
                else if (ext === '.txt') mimeType = 'text/plain';
                else if (['.png', '.jpg', '.jpeg', '.webp'].includes(ext)) {
                    mimeType = `image/${ext.replace('.', '')}`;
                    if (mimeType === 'image/jpg') mimeType = 'image/jpeg';
                }

                contextFiles.push({
                    name: fileName,
                    mimeType,
                    data: base64Data
                });
            }
        }

        return contextFiles;
    } catch (error) {
        console.error(`Error reading context for subject ${subject}:`, error);
        return [];
    }
}
