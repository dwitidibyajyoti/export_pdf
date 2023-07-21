import express from 'express';
const app = express ();
const PORT = 3000;
// const fs = require ('fs');
import fs from 'fs';
import PDFParser from 'pdf2json';
import cheerio from 'cheerio';
import path from 'path';
import crypto from 'crypto';

app.use (express.json ());



async function addContentEditableToSpans (htmlFile, outputFolder) {
  const htmlContent = await fs.readFileSync (htmlFile, 'utf8');
  const $ = cheerio.load (htmlContent);
  let uuid = crypto.randomUUID();

  // Find all <span> elements and add contenteditable="true" attribute
  $('span').attr('contenteditable', 'true');

  const allSpans = $('span');

  allSpans.each(function () {
    const spanElement = $(this);
    const uniqueId = `span_${crypto.randomBytes(16).toString("hex")}`;
    spanElement.attr('id', uniqueId);
  });
  

  // Find the target element based on its class
  const AllImage = $('img');

  AllImage.each(function () {
    const imageElement = $(this);
    const uniqueId = `image_${crypto.randomBytes(16).toString("hex")}`;
    imageElement.attr('id', uniqueId);
    imageElement.attr('onclick', `chooseImage('${uniqueId}')`);
    const newElement = `<input type="file" id=${uniqueId} name="img" accept="image/*" style="display: none;">`;
    
    imageElement.after(newElement);
  });
  
  // Add the new element after the target element
 

  const scriptContent = `
    <script>
      function saveChanges() {
        const allSpans = document.querySelectorAll('span');
        const spanData = [];
  
        allSpans.forEach((span) => {
          const spanId = span.id;
          const spanContent = span.textContent;
  
          spanData.push({ id: spanId, content: spanContent });
        });
  
        const jsonContent = JSON.stringify(spanData, null, 2);
  
        // Create a Blob from the JSON content
        const blob = new Blob([jsonContent], { type: 'application/json' });
  
        // Create a download link for the JSON file
        const downloadLink = document.createElement('a');
        downloadLink.href = URL.createObjectURL(blob);
        downloadLink.download = 'span_data.json';
        downloadLink.click();
      }
      function chooseImage(id) {

        const inputElement = document.querySelector("img."+id);
        console.log(inputElement)
        // Trigger the file selection dialog
        inputElement.click();
        
      }

    </script>
  `;
  $ ('head').append (scriptContent);

  const buttonElement = $ (
    '<button style="position: fixed;top: 4px;right: 4px;" onclick="saveChanges()">Save</button>',
  );
  
  $ ('body').append (buttonElement);

  // Generate the new HTML content
  const newHtmlContent = $.html ();

  // Create the output folder if it doesn't exist
  if (!fs.existsSync (outputFolder)) {
    fs.mkdirSync (outputFolder);
  }

  // Determine the new HTML file path
 const outputHtmlFile = path.join (
  outputFolder,
  'modified-' + Math.floor(new Date().getTime() / 1000) +'-'+ path.basename (htmlFile)
);

  // Save the modified HTML content to the new file
  await fs.writeFileSync (outputHtmlFile, newHtmlContent, 'utf8');

  console.log (
    `New HTML file with contenteditable <span> elements created: ${outputHtmlFile}`
  );
}

app.get ('/', async (req, res) => {
  const inputHtmlFile = './htmlFIle/test_new_test.html';
  const outputFolder = './htmlFIle/outPut';
  const prompt = `completed`;
  await addContentEditableToSpans (inputHtmlFile, outputFolder);
  return res.send ('completed');
});

// Replace 'path/to/your/output/folder' with the desired folder path

app.listen (PORT, () => {
  console.log (`Server is running on http://localhost:${PORT}`);
});
