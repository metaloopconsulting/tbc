// renderer.js

const { ipcRenderer } = require('electron');

document.getElementById('startBtn').addEventListener('click', () => {
    ipcRenderer.send('start-script');
});

document.getElementById('stopBtn').addEventListener('click', () => {
    ipcRenderer.send('stop-script');
});

ipcRenderer.on('console-output', (event, data) => {
    const outputDiv = document.getElementById('output');
    outputDiv.innerHTML += `<pre>${data}</pre>`;
    outputDiv.scrollTop = outputDiv.scrollHeight;
});
