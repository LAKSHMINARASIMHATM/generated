import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runPythonOCR(imageBase64: string): Promise<any> {
    return new Promise((resolve, reject) => {
        const pythonScriptPath = path.join(__dirname, './python/ocr_engine.py');
        const pythonProcess = spawn('python', [pythonScriptPath]);

        let stdoutData = '';
        let stderrData = '';

        pythonProcess.stdout.on('data', (data) => {
            stdoutData += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            stderrData += data.toString();
        });

        pythonProcess.on('close', (code) => {
            if (code !== 0) {
                console.error(`Python script exited with code ${code}`);
                console.error(`Stderr: ${stderrData}`);
                reject(new Error(`OCR process failed: ${stderrData || 'Unknown error'}`));
                return;
            }

            try {
                const result = JSON.parse(stdoutData);
                if (result.success) {
                    console.log(`Stderr: ${stderrData}`);
                    resolve(result);
                } else {
                    console.error(`Stderr: ${stderrData}`);
                    reject(new Error(result.error || 'Unknown OCR error'));
                }
            } catch (e) {
                console.error('Failed to parse Python output:', stdoutData);
                reject(new Error('Invalid response from OCR engine'));
            }
        });

        const input = JSON.stringify({ imageBase64 });
        pythonProcess.stdin.write(input);
        pythonProcess.stdin.end();
    });
}

async function test() {
    // Use the uploaded image
    const imagePath = 'C:/Users/T M lakshmi narasimh/.gemini/antigravity/brain/0c64704c-eaf9-41b2-8cdf-90a2f6c7f6e0/uploaded_image_1768470141222.jpg';
    if (!fs.existsSync(imagePath)) {
        console.error(`Image not found at ${imagePath}`);
        return;
    }
    const imageBuffer = fs.readFileSync(imagePath);
    const dummyImage = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;

    console.log("Testing Python OCR integration...");
    try {
        const result = await runPythonOCR(dummyImage);
        console.log("OCR Result:", JSON.stringify(result, null, 2));
        if (result.success) {
            console.log("Test PASSED");
        } else {
            console.log("Test FAILED");
        }
    } catch (error) {
        console.error("Test ERROR:", error);
    }
}

test();
