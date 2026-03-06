import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import { saveAs } from "file-saver";

export async function generateDocx(templateUrl, data, outputName) {
    try {
        // Fetch the template document
        const response = await fetch(templateUrl);
        if (!response.ok) {
            throw new Error(`Failed to load template at ${templateUrl}`);
        }
        const blob = await response.blob();
        const arrayBuffer = await blob.arrayBuffer();

        // Load the document via PizZip
        const zip = new PizZip(arrayBuffer);

        // Initialize Docxtemplater
        const doc = new Docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
        });

        // Set the data and render the document
        doc.render(data);

        // Generate a blob and save it
        const out = doc.getZip().generate({
            type: "blob",
            mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        });

        saveAs(out, outputName);
    } catch (error) {
        console.error("Error generating docx:", error);
        throw error;
    }
}
