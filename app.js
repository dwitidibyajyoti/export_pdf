import express from 'express';
const app = express ();
const PORT = 3000;
// const fs = require ('fs');
import cheerio from 'cheerio';
import path from 'path';
import crypto from 'crypto';
import https from 'https';
import fs from 'fs';
import cors from 'cors';
import {WebSocketServer} from 'ws';
import axios from 'axios';

app.use (express.json ());

const API_KEY =
  'vizyda@hexi.pics_ccf076a02228b4b6e6055abd0456c0b1502c2b4b1822c1b2ed118fd1eca3739070e42099';

// Source PDF file
const DestinationFile = 'htmlFIle/inputFile/June2023.html';

app.use (cors ({origin: 'http://127.0.0.1:5500'}));

const wss = new WebSocketServer ({port: 3001});

wss.onerror = function (error) {
  console.log (error);
};
const client = [];
let outPutFileName = '';
app.use (express.static ('public'));
wss.on ('headers', (headers, request) => {
  headers.push ('Access-Control-Allow-Origin: http://localhost:3000/');
});


async function addContentEditableToSpans (htmlFile, outputFolder) {
  const htmlContent = await fs.readFileSync (htmlFile, 'utf8');
  const $ = cheerio.load (htmlContent);
  let uuid = crypto.randomUUID ();
  // Find all <span> elements and add contenteditable="true" attribute
  $ ('span').attr ('contenteditable', 'false');

  const allSpans = $ ('span');

  allSpans.each (function () {
    const spanElement = $ (this);
    const uniqueId = `span_${crypto.randomBytes (16).toString ('hex')}`;
    spanElement.attr ('id', uniqueId);
  });

  // Find the target element based on its class
  const AllImage = $ ('img');

  AllImage.each (function () {
    const imageElement = $ (this);

    const parentElement = imageElement.parent ().attr ('class');
    if (parentElement === 'image') {
      const uuid = `${crypto.randomBytes (16).toString ('hex')}`;

      const inputId = `input_${uuid}`;
      const imageId = `image_${uuid}`;

      imageElement.attr ('id', imageId);
      imageElement.attr ('style', 'cursor: pointer;');
      imageElement.attr ('onclick', `chooseImage('${inputId}')`);
      const newElement = `<input type="file" id=${inputId} name="img" accept="image/*" onchange="handleImageSelect(event,${imageId})" style="display: none;">`;

      imageElement.after (newElement);
    }
  });

  // Add the new element after the target element

  const scriptContent = `
    <script>
    function saveChanges() {
      const myButton = document.getElementById ('action_button');

      if (myButton.textContent == 'Edit' && getItem("is_editable")=="1") {
        setItem ('is_editable', '0');
        console.log(getItem("is_editable"));
      }


      if(getItem("is_editable")=="1"){
        const allSpans = document.querySelectorAll('span');
        const allImage = document.querySelectorAll('img');
        const spanData = [];
    
        allSpans.forEach((span) => {
          const spanId = span.id;
          const spanContent = span.textContent;
          spanData.push({ id: spanId, content: spanContent });
        });
    
        allImage.forEach((span) => {
          const imageId = span.id;
          const imageContent = span.src;
          spanData.push({ id: imageId, content: imageContent });
        });
        const jsonContent = JSON.stringify(spanData, null, 2);
    
        // Create a Blob from the JSON content
        const blob = new Blob([jsonContent], { type: 'application/json' });
    
        // Create a download link for the JSON file
        const downloadLink = document.createElement('a');
        downloadLink.href = URL.createObjectURL(blob);
        downloadLink.download = 'span_data.json';
        downloadLink.click();
      }else{
        setItem("is_editable", "1");
        const myButton = document.getElementById('action_button');
        myButton.textContent = 'Save';
        
        // Get all span elements and set their contenteditable attribute to true
        const spanElements = document.querySelectorAll('span');
        spanElements.forEach(span => {
          span.contentEditable = true;
        });
      }
     
    }

    function getItem(key){
      if (!hasLocalStorage || !key) return;
      return localStorage.getItem(key);
    }
  
      function setItem(key, val){
          if (!hasLocalStorage || !key) return;
          localStorage.setItem(key, val);
      }
      
      function hasLocalStorage () {
          return typeof window.localStorage !== 'undefined';
      }
      
      // //to store an item
      // setItem("is_editable", "1");
      
      // //to retrieve an (the above, in this case) item
      // var fetchItem = getItem("itemKey");
      function chooseImage(id) {

        const myButton = document.getElementById ('action_button');

      if (myButton.textContent == 'Edit' && getItem("is_editable")=="1") {
        setItem ('is_editable', '0');
        console.log(getItem("is_editable"));
      }
        if(getItem("is_editable")=="1"){
          const inputElement = document.getElementById(id);
          console.log(inputElement)
          // Trigger the file selection dialog
          inputElement.click();
        }
      }

      function handleImageSelect(event, imageId) {
        const file = event.target.files[0];
        if (file) {
          // Create a FileReader to read the selected image as a data URL
          const reader = new FileReader();
          reader.onload = function (e) {
            imageId.src=e.target.result;
          };
          reader.readAsDataURL(file);
        }
      }
    </script>
  `;
  $ ('head').append (scriptContent);

  const buttonElement = $ (
    '<button style="position: fixed;top: 4px;right: 4px;" onclick="saveChanges()" id="action_button">Edit</button>'
  );

  $ ('body').append (buttonElement);

  // Generate the new HTML content
  const newHtmlContent = $.html ();

  // Create the output folder if it doesn't exist
  if (!fs.existsSync (outputFolder)) {
    fs.mkdirSync (outputFolder);
  }

  // Determine the new HTML file path
  const outPutFile =
    'modified-' +
    Math.floor (new Date ().getTime () / 1000) +
    '-' +
    path.basename (htmlFile);
  const outputHtmlFile = path.join (outputFolder, outPutFile);

  await fs.writeFileSync (outputHtmlFile, newHtmlContent, 'utf8');
  console.log (
    `New HTML file with contenteditable <span> elements created: ${outputHtmlFile}`
  );

  if (!client.length == 0) {
    client[client.length - 1].send (outPutFile);
    setTimeout (() => {
      client[client.length - 1].close ();
    }, 200);
  }
}

// app.get ('/', async (req, res) => {
//   const inputHtmlFile = './htmlFIle/test_new_test.html';
//   const outputFolder = './htmlFIle/outPut';
//   const prompt = `completed`;
//   await addContentEditableToSpans (inputHtmlFile, outputFolder);
//   return res.send ('completed');
// });

// chokidar.watch('./htmlFIle/inputFile').on('add', (path, event) => {
//   console.log(path);
// });

app.post ('/createFile', async (req, res) => {
  console.log (req.body);
  let config = {
    method: 'post',
    url: 'https://api.pdf.co/v1/pdf/convert/to/html',
    headers: {
      'x-api-key': API_KEY,
      'Content-Type': 'application/json',
    },
    data: JSON.stringify ({url: req.body.url, async: true}),
  };
  websocket ();

  axios
    .request (config)
    .then (res => {
      let data = res.data;
      console.log (`Job #${data.jobId} has been created!`);
      checkIfJobIsCompleted (data.jobId, data.url);
    })
    .catch (err => {
      return console.error ('Error: ', err);
    });

  return res.status (200).json ({
    success: true,
    message: 'PDF is processing  please wait.',
  });
});

function websocket () {
  wss.on ('connection', function connection (ws) {
    ws.on ('error', console.error);
    client.length = 0;
    client.push (ws);
    // ws.send ('something');
  });
}

function checkIfJobIsCompleted (jobId, resultFileUrl) {
  let queryPath = `/v1/job/check`;

  // JSON payload for api request
  let jsonPayload = JSON.stringify ({
    jobid: jobId,
  });

  let reqOptions = {
    host: 'api.pdf.co',
    path: queryPath,
    method: 'POST',
    headers: {
      'x-api-key': API_KEY,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength (jsonPayload, 'utf8'),
    },
  };

  // Send request
  var postRequest = https.request (reqOptions, response => {
    response.on ('data', d => {
      response.setEncoding ('utf8');

      // Parse JSON response
      let data = JSON.parse (d);
      console.log (
        `Checking Job #${jobId}, Status: ${data.status}, Time: ${new Date ().toLocaleString ()}`
      );

      if (data.status == 'working') {
        // Check again after 3 seconds
        setTimeout (function () {
          checkIfJobIsCompleted (jobId, resultFileUrl);
        }, 3000);
      } else if (data.status == 'success') {
        // Download XML file
        var file = fs.createWriteStream (DestinationFile);
        https.get (resultFileUrl, response2 => {
          response2.pipe (file).on ('close', async () => {
            const inputHtmlFile = DestinationFile;
            const outputFolder = './public/output';
            const prompt = `completed`;
            const fileName = await addContentEditableToSpans (
              inputHtmlFile,
              outputFolder
            );
            console.log (
              `Generated XML file saved as "${DestinationFile}" file.`
            );
          });
        });
      } else {
        console.log (`Operation ended with status: "${data.status}".`);
      }
    });
  });

  // Write request data
  postRequest.write (jsonPayload);
  postRequest.end ();
}

// Replace 'path/to/your/output/folder' with the desired folder path

app.listen (PORT, () => {
  console.log (`Server is running on http://localhost:${PORT}`);
});
